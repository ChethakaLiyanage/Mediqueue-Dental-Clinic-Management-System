const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const {
  createInquiry,
  getPatientInquiries,
  getInquiryById,
  getInquiryByCode,
  getInquiryStats
} = require("../Controllers/InquiryControllers");

// All routes require authentication
router.use(requireAuth);

// Patient inquiry routes
router.post("/", createInquiry);                    // POST /inquiries - Create new inquiry
router.get("/", getPatientInquiries);               // GET /inquiries - Get patient's inquiries
router.get("/stats", getInquiryStats);              // GET /inquiries/stats - Get inquiry statistics
router.get("/code/:code", getInquiryByCode);        // GET /inquiries/code/INQ-0001 - Get by inquiry code
router.get("/:id", getInquiryById);                 // GET /inquiries/:id - Get inquiry by ID

module.exports = router;
