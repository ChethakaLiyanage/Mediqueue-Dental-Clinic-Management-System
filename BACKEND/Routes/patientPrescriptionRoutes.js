// routes/patientPrescriptionRoutes.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const {
  getMyPrescriptions,
  getPrescriptionById,
  getPrescriptionStats, // ✅ added
  // ... other functions
} = require("../Controllers/PatientPrescriptionControllers");

router.get("/my-prescriptions", requireAuth, getMyPrescriptions);
router.get("/:id", requireAuth, getPrescriptionById);
router.get("/stats", requireAuth, getPrescriptionStats);

// ... other routes

module.exports = router;
