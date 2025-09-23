const InquiryModel = require("../Model/InquiryModel");

// Create a new inquiry (Patient side)
const createInquiry = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const patientCode = req.user?.patientCode;

    if (!patientCode) {
      return res.status(400).json({ 
        message: "Patient code not found. Please ensure you have a complete profile." 
      });
    }

    if (!subject || !message) {
      return res.status(400).json({ 
        message: "Subject and message are required" 
      });
    }

    const inquiry = new InquiryModel({
      patientCode,
      subject: subject.trim(),
      message: message.trim()
    });

    await inquiry.save();

    res.status(201).json({
      message: "Inquiry submitted successfully",
      inquiry: {
        inquiryCode: inquiry.inquiryCode,
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt
      }
    });
  } catch (error) {
    console.error("Create inquiry error:", error);
    res.status(500).json({ 
      message: "Failed to create inquiry. Please try again." 
    });
  }
};

// Get patient's inquiries
const getPatientInquiries = async (req, res) => {
  try {
    const patientCode = req.user?.patientCode;

    if (!patientCode) {
      return res.status(400).json({ 
        message: "Patient code not found" 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const inquiries = await InquiryModel
      .find({ patientCode })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('inquiryCode subject message status responses createdAt updatedAt');

    const total = await InquiryModel.countDocuments({ patientCode });

    res.status(200).json({
      inquiries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get patient inquiries error:", error);
    res.status(500).json({ 
      message: "Failed to fetch inquiries" 
    });
  }
};

// Get single inquiry details
const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const patientCode = req.user?.patientCode;

    if (!patientCode) {
      return res.status(400).json({ 
        message: "Patient code not found" 
      });
    }

    const inquiry = await InquiryModel.findOne({ 
      _id: id, 
      patientCode 
    });

    if (!inquiry) {
      return res.status(404).json({ 
        message: "Inquiry not found" 
      });
    }

    res.status(200).json({ inquiry });
  } catch (error) {
    console.error("Get inquiry by ID error:", error);
    res.status(500).json({ 
      message: "Failed to fetch inquiry details" 
    });
  }
};

// Get inquiry by inquiry code
const getInquiryByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const patientCode = req.user?.patientCode;

    if (!patientCode) {
      return res.status(400).json({ 
        message: "Patient code not found" 
      });
    }

    const inquiry = await InquiryModel.findOne({ 
      inquiryCode: code, 
      patientCode 
    });

    if (!inquiry) {
      return res.status(404).json({ 
        message: "Inquiry not found" 
      });
    }

    res.status(200).json({ inquiry });
  } catch (error) {
    console.error("Get inquiry by code error:", error);
    res.status(500).json({ 
      message: "Failed to fetch inquiry details" 
    });
  }
};

// Get inquiry statistics for patient dashboard
const getInquiryStats = async (req, res) => {
  try {
    const patientCode = req.user?.patientCode;

    if (!patientCode) {
      return res.status(400).json({ 
        message: "Patient code not found" 
      });
    }

    const stats = await InquiryModel.aggregate([
      { $match: { patientCode } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await InquiryModel.countDocuments({ patientCode });

    const formattedStats = {
      total,
      open: 0,
      in_progress: 0,
      resolved: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.status(200).json({ stats: formattedStats });
  } catch (error) {
    console.error("Get inquiry stats error:", error);
    res.status(500).json({ 
      message: "Failed to fetch inquiry statistics" 
    });
  }
};

module.exports = {
  createInquiry,
  getPatientInquiries,
  getInquiryById,
  getInquiryByCode,
  getInquiryStats
};
