// routes/TreatmentplanRoutes.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const {
  getMyTreatments,
  getTreatmentById,
  getTreatmentByCode,
  getTreatmentStats,
  getTreatmentHistory,
  getTreatmentsByDentist,
  getTreatmentPrescriptions,
  exportTreatments,
  searchTreatments,
  getMyDentists,
} = require("../Controllers/PatientTreatmentplanControllers");

// ---------------- Patient-specific routes ----------------
router.get("/my-treatments", requireAuth, getMyTreatments);
router.get("/stats", requireAuth, getTreatmentStats);
router.get("/history/:planCode", requireAuth, getTreatmentHistory);
router.get("/dentists", requireAuth, getMyDentists);

// ---------------- Treatment detail routes ----------------
router.get("/:id", requireAuth, getTreatmentById);
router.get("/code/:planCode", requireAuth, getTreatmentByCode);
router.get("/:id/prescriptions", requireAuth, getTreatmentPrescriptions);
router.get("/dentist/:dentistCode", requireAuth, getTreatmentsByDentist);

// ---------------- Other utilities ----------------
router.get("/export/all", requireAuth, exportTreatments);
router.get("/search/query", requireAuth, searchTreatments);

module.exports = router;
