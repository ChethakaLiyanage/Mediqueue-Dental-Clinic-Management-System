// Routes/DentistQueueRoutes.js
const express = require("express");
const router = express.Router();
const DentistQueueCtrl = require("../Controllers/DentistQueueController");

// Get today's queue for logged-in dentist
router.get("/today", DentistQueueCtrl.getTodayQueueForDentist);

//  queue status for a dentist's patient
router.patch("/update/:id", DentistQueueCtrl.updateQueueStatus);

module.exports = router;
