const express = require("express");
const router =express.Router();
//insert model
const Dentist = require("../Model/DentistModel");
//insert controller
const DentistController = require("../Controllers/DentistControllers");
const DentistAuth = require("../Controllers/DentistAuthControllers");

router.get("/",DentistController.getAllDentists);
router.post("/",DentistController.addDentists);
router.get("/:id",DentistController.getById);
router.get("/code/:dentistCode", DentistController.getByCode);
router.put("/code/:dentistCode", DentistAuth.verifyToken, DentistController.updateAvailabilityByCode);
router.post("/counter/:Code/resync", DentistController.resyncCounterForDentist);


//export
module.exports = router;