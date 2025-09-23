const express = require("express");
const treatmentplan_router =express.Router();
//insert model
const Treatmentplan = require("../Model/TreatmentplanModel");
const TreatmentplanHistory = require("../Model/TreatmentplanHistory");
//insert controller
const TreatmentplanController = require("../Controllers/DentistTreatmentplanControllers");

treatmentplan_router.get("/",TreatmentplanController.getAllTreatmentplans);
treatmentplan_router.post("/",TreatmentplanController.addTreatmentplans);
treatmentplan_router.get("/code/:planCode",TreatmentplanController.getByCode);  
treatmentplan_router.get("/:id",TreatmentplanController.getById);
treatmentplan_router.put("/code/:patientCode/:planCode",TreatmentplanController.updateTreatmentplanByCode);
treatmentplan_router.put("/:id",TreatmentplanController.updateTreatmentplanByCode);
treatmentplan_router.delete("/code/:patientCode/:planCode",TreatmentplanController .deleteTreatmentplanByCode); 
treatmentplan_router.post("/restore/:patientCode/:planCode", TreatmentplanController .restoreByCode);
treatmentplan_router.get("/counter/:patientCode", TreatmentplanController.getCounterForPatient);
treatmentplan_router.post("/counter/:patientCode/resync", TreatmentplanController.resyncCounterForPatient);

// history list (simple, no auth) -> GET /treatmentplans/history
treatmentplan_router.get("/history/list", async (req, res) => {
  try {
    const items = await TreatmentplanHistory.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ message: "Failed to read treatment plan history" });
  }
});

 // <-- use this
//exportdeleteTreatmentplanByCode
module.exports = treatmentplan_router;