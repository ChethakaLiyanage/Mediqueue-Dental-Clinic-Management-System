const Admin = require("../Model/AdminModel");
const User = require("../Model/User");
const Dentist = require("../Model/DentistModel");
const Manager = require("../Model/ManagerModel");
const Receptionist = require("../Model/ReceptionistModel");
const bcrypt = require("bcryptjs");

const getAllAdmins = async(req , res , next) => {

    let admins ;

    //get all users
    try{
        admins = await Admin.find();
    }catch(err){
        console.log(err);
    }
    //not any users found
    if(!admins){
        return res.status(404).json({message :"User Not Found"})
    }

    //Display all users
    return res.status(200).json({admins});
};
const addAdmins = async(req,res,next)=>{

    const {userId,permission} = req.body;

    let admins;

    try{
        
        admins = new Admin({userId,permission});
        //to save in database
        await admins.save();

    return res.status(201).json({ admins });
    } catch (err) {
    console.error("addAdmins error:", err);

    // common duplicate key: nic or generated patientCode
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Duplicate key", detail: err.keyValue });
    }
    return res.status(422).json({ message: err.message || "Unable to add admins" });
  };
};


const getById = async(req , res , next) => {
    try {
    const { id } = req.admin; // assuming JWT auth
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }

};
const getByCode = async (req, res) => {
  try {
    const { adminCode } = req.params;
    const admin = await Admin.findOne({ adminCode }).lean();
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.status(200).json({ admin });
  } catch (err) {
    console.error("getByCode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Staff Management Functions

// Create Staff (Dentist, Admin, Manager, Receptionist)
exports.createStaff = async (req, res) => {
  try {
    console.log("createStaff called with body:", req.body);
    
    const { 
      name, 
      email, 
      password, 
      contact_no, 
      role, 
      // Role-specific fields
      license_no, // for dentist
      specialization, // for dentist
      department, // for manager
      deskNo, // for receptionist
      permission // for admin
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }

    // Validate role
    const allowedRoles = ["Dentist", "Admin", "Manager", "Receptionist"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be Dentist, Admin, Manager, or Receptionist" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Role-specific validation
    if (role === "Dentist" && !license_no) {
      return res.status(400).json({ message: "License number is required for dentists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const user = await User.create({
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      contact_no,
      role,
      isActive: true
    });

    console.log("User created:", user._id, user.role);

    let roleSpecificRecord = null;

    // Create role-specific record
    try {
      switch (role) {
        case "Dentist":
          // Handle photo upload for dentist
          let photoData = null;
          if (req.file) {
            photoData = {
              filename: req.file.filename,
              mimeType: req.file.mimetype,
              size: req.file.size,
              url: `${req.protocol}://${req.get('host')}/uploads/dentists/${req.file.filename}`
            };
          }

          roleSpecificRecord = await Dentist.create({
            userId: user._id,
            license_no,
            specialization: specialization || "",
            photo: photoData
          });
          break;
        
        case "Admin":
          roleSpecificRecord = await Admin.create({
            userId: user._id,
            permission: permission || "full"
          });
          break;
        
        case "Manager":
          roleSpecificRecord = await Manager.create({
            userId: user._id,
            department: department || ""
          });
          break;
        
        case "Receptionist":
          roleSpecificRecord = await Receptionist.create({
            userId: user._id,
            deskNo: deskNo || ""
          });
          break;
      }
      console.log("Role-specific record created:", roleSpecificRecord?._id);
    } catch (roleErr) {
      console.error("Error creating role-specific record:", roleErr);
      // Don't fail the entire operation, just log the error
    }


    return res.status(201).json({
      message: `${role} created successfully`,
      user: user,
      roleRecord: roleSpecificRecord
    });

  } catch (err) {
    console.error("createStaff error:", err);
    
    
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate key error", detail: err.keyValue });
    }
    return res.status(500).json({ message: "Failed to create staff", error: err.message });
  }
};

// Get All Staff
exports.getAllStaff = async (req, res) => {
  try {
    console.log("getAllStaff called with query:", req.query);
    
    const { role } = req.query; // Optional filter by role
    
    let filter = { role: { $in: ["Dentist", "Admin", "Manager", "Receptionist"] } };
    if (role && ["Dentist", "Admin", "Manager", "Receptionist"].includes(role)) {
      filter.role = role;
    }

    console.log("Filter being used:", filter);

    const staff = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    console.log("Found staff count:", staff.length);

    // Get role-specific data for each staff member
    const staffWithDetails = await Promise.all(
      staff.map(async (user) => {
        let roleData = null;
        
        try {
          switch (user.role) {
            case "Dentist":
              roleData = await Dentist.findOne({ userId: user._id }).lean();
              break;
            case "Admin":
              roleData = await Admin.findOne({ userId: user._id }).lean();
              break;
            case "Manager":
              roleData = await Manager.findOne({ userId: user._id }).lean();
              break;
            case "Receptionist":
              roleData = await Receptionist.findOne({ userId: user._id }).lean();
              break;
          }
        } catch (roleErr) {
          console.error(`Error fetching role data for ${user.role}:`, roleErr);
        }
        
        return {
          ...user.toObject(),
          roleData
        };
      })
    );


    console.log("Returning staff with details:", staffWithDetails.length);

    return res.status(200).json({ 
      staff: staffWithDetails,
      count: staffWithDetails.length 
    });

  } catch (err) {
    console.error("getAllStaff error:", err);
    return res.status(500).json({ message: "Failed to fetch staff", error: err.message });
  }
};

// Get Staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    let roleData = null;
    switch (user.role) {
      case "Dentist":
        roleData = await Dentist.findOne({ userId: user._id }).lean();
        break;
      case "Admin":
        roleData = await Admin.findOne({ userId: user._id }).lean();
        break;
      case "Manager":
        roleData = await Manager.findOne({ userId: user._id }).lean();
        break;
      case "Receptionist":
        roleData = await Receptionist.findOne({ userId: user._id }).lean();
        break;
    }

    return res.status(200).json({
      staff: {
        ...user.toObject(),
        roleData
      }
    });

  } catch (err) {
    console.error("getStaffById error:", err);
    return res.status(500).json({ message: "Failed to fetch staff member" });
  }
};

// Update Staff
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      contact_no, 
      isActive,
      // Role-specific fields
      license_no,
      specialization,
      department,
      deskNo,
      permission
    } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.trim().toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ 
        email: email.trim().toLowerCase(),
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(409).json({ message: "Email already taken" });
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email.trim().toLowerCase();
    if (contact_no !== undefined) user.contact_no = contact_no;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Update role-specific data
    let roleData = null;
    switch (user.role) {
      case "Dentist":
        roleData = await Dentist.findOne({ userId: user._id });
        if (roleData) {
          if (license_no !== undefined) roleData.license_no = license_no;
          if (specialization !== undefined) roleData.specialization = specialization;
          await roleData.save();
        }
        break;
      
      case "Admin":
        roleData = await Admin.findOne({ userId: user._id });
        if (roleData) {
          if (permission !== undefined) roleData.permission = permission;
          await roleData.save();
        }
        break;
      
      case "Manager":
        roleData = await Manager.findOne({ userId: user._id });
        if (roleData) {
          if (department !== undefined) roleData.department = department;
          await roleData.save();
        }
        break;
      
      case "Receptionist":
        roleData = await Receptionist.findOne({ userId: user._id });
        if (roleData) {
          if (deskNo !== undefined) roleData.deskNo = deskNo;
          await roleData.save();
        }
        break;
    }

    // Get updated user without password
    const updatedUser = await User.findById(id).select("-password");
    

    return res.status(200).json({
      message: "Staff member updated successfully",
      staff: {
        ...updatedUser.toObject(),
        roleData: roleData?.toObject()
      }
    });

  } catch (err) {
    console.error("updateStaff error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate key error", detail: err.keyValue });
    }
    return res.status(500).json({ message: "Failed to update staff member", error: err.message });
  }
};

// Delete Staff
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Delete role-specific record first
    switch (user.role) {
      case "Dentist":
        await Dentist.deleteOne({ userId: user._id });
        break;
      case "Admin":
        await Admin.deleteOne({ userId: user._id });
        break;
      case "Manager":
        await Manager.deleteOne({ userId: user._id });
        break;
      case "Receptionist":
        await Receptionist.deleteOne({ userId: user._id });
        break;
    }


    // Delete user
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: `${user.role} deleted successfully`
    });

  } catch (err) {
    console.error("deleteStaff error:", err);
    
    return res.status(500).json({ message: "Failed to delete staff member", error: err.message });
  }
};

// Original exports
exports.getAllAdmins = getAllAdmins;
exports.addAdmins = addAdmins;
exports.getById = getById;
exports.getByCode = getByCode;
