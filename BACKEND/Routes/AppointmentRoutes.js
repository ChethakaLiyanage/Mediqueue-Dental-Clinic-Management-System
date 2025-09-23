const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const {
  bookAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
  sendAppointmentOtp,
  verifyAppointmentOtp,
  getAvailableSlots,
} = require("../Controllers/AppointmentControllers");

router.post("/", bookAppointment);
router.get("/", listAppointments);
router.put("/:id", updateAppointment);
router.patch("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);

router.post("/send-otp", requireAuth, sendAppointmentOtp);
router.post("/verify-otp", requireAuth, verifyAppointmentOtp);

// Get available appointment slots
router.get("/available-slots", getAvailableSlots);

module.exports = router;