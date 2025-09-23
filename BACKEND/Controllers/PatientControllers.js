const mongoose = require("mongoose");
const Patient = require("../Model/PatientModel");

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const optional = (value) => {
  const trimmed = normalize(value);
  return trimmed === "" ? undefined : trimmed;
};

// display part
const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find().populate("userId", "name email role");
    if (!patients || patients.length === 0) {
      return res.status(200).json({ patients: [] });
    }
    return res.status(200).json({ patients });
  } catch (err) {
    console.error("getAllPatients error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// data insert
const addPatients = async (req, res) => {
  try {
    const userId = req.body.userId;
    const nic = normalize(req.body.nic).toUpperCase();
    const dob = req.body.dob ? new Date(req.body.dob) : null;
    const gender = normalize(req.body.gender).toLowerCase();
    const address = normalize(req.body.address);
    const phone = optional(req.body.phone);
    const allergies = optional(req.body.allergies);

    const errors = [];
    if (!mongoose.Types.ObjectId.isValid(userId)) errors.push("Valid userId is required");
    if (!nic) errors.push("NIC is required");
    if (!dob || Number.isNaN(dob.getTime())) errors.push("Valid date of birth is required");
    if (!address) errors.push("Address is required");
    if (!["male", "female", "other"].includes(gender)) errors.push("Gender must be male, female or other");

    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const existing = await Patient.findOne({ nic });
    if (existing) {
      return res.status(409).json({ message: "NIC already exists" });
    }

    const patient = await Patient.create({
      userId,
      nic,
      dob,
      gender,
      address,
      phone,
      allergies,
    });

    const populated = await Patient.findById(patient._id).populate("userId", "name email role");
    return res.status(201).json({ patients: populated });
  } catch (err) {
    console.error("addPatients error:", err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Duplicate key", detail: err.keyValue });
    }
    return res.status(422).json({ message: err.message || "Unable to add patient" });
  }
};

// retrieve by id (supports Mongo _id or patientCode like P-0001)
const getById = async (req, res) => {
  const id = req.params.id;
  try {
    let patients;
    if (mongoose.Types.ObjectId.isValid(id)) {
      patients = await Patient.findById(id).populate("userId", "name email role");
    } else {
      patients = await Patient.findOne({ patientCode: id }).populate("userId", "name email role");
    }
    if (!patients) return res.status(404).json({ message: "Patient not found" });
    return res.status(200).json({ patients });
  } catch (err) {
    console.error("getById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getByCode = async (req, res) => {
  try {
    const { patientCode } = req.params;
    const patient = await Patient.findOne({ patientCode }).populate("userId", "name email role");
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    return res.status(200).json({ patient });
  } catch (err) {
    console.error("getByCode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAllPatients = getAllPatients;
exports.addPatients = addPatients;
exports.getById = getById;
exports.getByCode = getByCode;
