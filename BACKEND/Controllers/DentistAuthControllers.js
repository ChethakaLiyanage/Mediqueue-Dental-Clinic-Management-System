// Controllers/AuthControllers.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Model/User"); // <-- adjust if your folder is Model/ not Models/

function signToken(user) {
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "Dentist",
    ...(user.dentistCode ? { dentistCode: user.dentistCode } : {}),
    ...(user.adminCode ? { adminCode: user.adminCode } : {}),
  };
  return jwt.sign(payload, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });
}

// simple helpers for validation and redirect
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDashboardPath(role) {
  switch (role) {
    case "Dentist":
      return "/dentist/dashboard";
    case "Patient":
      return "/patientDashboard";
    case "Receptionist":
      return "/receptionistDashboard";
    case "Manager":
      return "/managerDashboard";
    case "Admin":
      return "/admin/dashboard";
    default:
      return "/"; // fallback
  }
}

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    // field presence
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // basic format validations
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    // include +password in case schema has select:false
    const user = await User.findOne({ email }).select("+password +role +isActive");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is disabled. Contact admin." });
    }

    // Compare with bcrypt hash; if legacy plaintext is found, migrate to hash
    let ok = false;
    const stored = String(user.password || "");
    if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = stored === password; // legacy plaintext
      if (ok) {
        try {
          user.password = await bcrypt.hash(password, 10);
          await user.save();
        } catch (_) {
          // non-fatal; continue
        }
      }
    }
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // If Dentist, attach dentistCode on the fly
    if (user.role === "Dentist") {
      try {
        const rec = await Dentist.findOne({ userId: user._id }).lean();
        if (rec?.dentistCode) {
          user.dentistCode = rec.dentistCode;
        }
      } catch (_) {}
    }

    // If Admin, attach adminCode on the fly
    if (user.role === "Admin") {
      try {
        const Admin = require("../Model/AdminModel");
        const rec = await Admin.findOne({ userId: user._id }).lean();
        if (rec?.adminCode) {
          user.adminCode = rec.adminCode;
        }
      } catch (_) {}
    }

    const token = signToken(user);

    // prepare safe user object
    const publicUser = user.toObject();
    delete publicUser.password;

    return res.status(200).json({
      status: "ok",
      message: "Login successful",
      token,
      user: publicUser,
      role: publicUser.role,
      dentistCode: user.dentistCode,
      adminCode: user.adminCode,
      redirectTo: getDashboardPath(publicUser.role),
      verified: true,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ status: "error", message: "Login failed" });
  }
};

// Optional JWT verification middleware to protect routes
exports.verifyToken = (req, res, next) => {
  try {
    const auth = req.headers["authorization"] || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = decoded; // {_id, name, email, role}
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};



// ===== Optional: keep your existing register, or use this minimal example =====
// If your current register works, you can delete this and keep your original.
const Dentist = require("../Model/DentistModel"); // optional if you auto-create patient on register
const Patient = require("../Model/PatientModel");
const crypto = require("crypto");

exports.registerDentistWithPhoto = async (req, res) => {
  try {
    const {
      name = "",
      email = "",
      password = "",
      contact_no = "",
      license_no = "",
      specialization = "",
      availability_schedule = null,
    } = req.body || {};

    if (!name || !email || !password || !license_no) {
      return res
        .status(400)
        .json({ message: "name, email, password, license_no are required." });
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.trim().toLowerCase(),
      password: hash,
      contact_no,
      role: "Dentist",
      isActive: true,
    });

    let photo;
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      photo = {
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `${baseUrl}/uploads/dentists/${req.file.filename}`,
      };
    }

    const dentist = await Dentist.create({
      userId: user._id,
      license_no,
      specialization,
      availability_schedule:
        typeof availability_schedule === "string"
          ? JSON.parse(availability_schedule) // allow JSON string from form
          : availability_schedule,
      photo,
    });

    const token = signToken(user);
    const u = user.toObject();
    delete u.password;

    return res.status(201).json({
      message: "Dentist registered successfully",
      token,
      user: u,
      dentist,
    });
  } catch (err) {
    console.error("registerDentistWithPhoto error:", err);
    return res.status(500).json({ message: "Register failed", error: err.message });
  }
};

// Register a Patient: combines User + PatientModel
exports.registerPatient = async (req, res) => {
  try {
    const {
      name = "",
      email = "",
      password = "",
      contact_no = "",
      nic = "",
      dob = "",
      gender = "",
      address = "",
      allergies = "",
    } = req.body || {};

    if (!name || !email || !password || !nic || !dob || !gender) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered." });

    const nicExists = await Patient.findOne({ nic: nic.trim() });
    if (nicExists) return res.status(409).json({ message: "NIC already registered." });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.trim().toLowerCase(),
      password: hash,
      contact_no,
      role: "Patient",
      isActive: true,
    });

    const patient = await Patient.create({
      userId: user._id,
      nic: nic.trim(),
      dob: new Date(dob),
      gender,
      address,
      allergies,
    });

    const token = signToken(user);
    const u = user.toObject();
    delete u.password;

    return res.status(201).json({
      status: "ok",
      message: "Patient registered successfully",
      token,
      user: u,
      patient,
      redirectTo: "/patientDashboard",
    });
  } catch (err) {
    console.error("registerPatient error:", err);
    return res.status(500).json({ status: "error", message: "Register failed", error: err.message });
  }
};

// Forgot password: create token and expiry
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) return res.status(400).json({ message: "Valid email required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ status: "ok", message: "If the email exists, reset instructions sent." });

    const token = crypto.randomBytes(24).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // In dev, return token so you can test without email service
    return res.status(200).json({ status: "ok", message: "Reset link generated", token });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ status: "error", message: "Unable to process request" });
  }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
  try {
    const { token = "", password = "" } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: "token and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ status: "ok", message: "Password reset successful" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ status: "error", message: "Unable to reset password" });
  }
};
