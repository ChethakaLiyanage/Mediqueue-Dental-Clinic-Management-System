// Routes/PrescriptionRoutes.js
const express = require("express");
const prescription_router = express.Router();
const Prescription = require("../Controllers/DentistPrescriptionControllers");
const { verifyToken } = require("../Controllers/DentistAuthControllers");

// list / filter
prescription_router.get("/", Prescription.getAllPrescriptions);

// dentist-owned list
prescription_router.get("/my", verifyToken, Prescription.getMyPrescriptions);

// create
prescription_router.post("/", Prescription.addPrescriptions);

// read
prescription_router.get("/:id", Prescription.getById);
prescription_router.get("/code/:patientCode/:planCode", Prescription.getActiveByPlan);

// update (no delete route by design)
prescription_router.put("/code/:patientCode/:planCode/:prescriptionCode",Prescription.updatePrescriptionByCode);
prescription_router.put("/:id", Prescription.updatePrescription);

// patient seen
prescription_router.patch("/:id/seen", Prescription.markSeenByPatient);




module.exports = prescription_router;
