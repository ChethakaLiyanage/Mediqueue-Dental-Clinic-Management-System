// Controllers/DentistQueueController.js
const Queue = require("../Model/QueueModel");
const Appointment = require("../Model/AppointmentModel");
const Patient = require("../Model/PatientModel");
const User = require("../Model/User");

/**
 * GET today's queue for the logged-in dentist
 */
async function getTodayQueueForDentist(req, res) {
  try {
    const { dentistCode } = req.query;
    if (!dentistCode) {
      return res.status(400).json({ message: "dentistCode required" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${today}T00:00:00Z`);
    const end = new Date(`${today}T23:59:59Z`);

    // fetch queues
    const queues = await Queue.find({
      dentistCode,
      date: { $gte: start, $lte: end },
    }).lean();

    // join with appointment + patient + user details
    const withDetails = await Promise.all(
      queues.map(async (q) => {
        const appt = await Appointment.findOne({
          appointmentCode: q.appointmentCode,
        }).lean();

        const patient = await Patient.findOne({
          patientCode: appt?.patient_code || q.patientCode,
        }).lean();

        let user = null;
        if (patient?.userId) {
          user = await User.findById(patient.userId).lean();
        }

        return {
          ...q,
          queueNo: q.queueCode,
          reason: appt?.reason || "-",
          appointment_date: appt?.appointment_date || q.date,
          patientCode: appt?.patient_code || q.patientCode,
          patientName: user?.name || "-", // ✅ from user table
        };
      })
    );

    res.json(withDetails);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/**
 * PATCH – update queue status for a dentist's patient
 */
async function updateQueueStatus(req, res) {
  try {
    const { id } = req.params;
    const { dentistCode, status } = req.body;

    if (!dentistCode) {
      return res.status(400).json({ message: "dentistCode is required" });
    }

    const q = await Queue.findOne({ _id: id, dentistCode });
    if (!q) {
      return res
        .status(404)
        .json({ message: "Queue entry not found for this dentist" });
    }

    if (status) q.status = status;
    await q.save();

    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getTodayQueueForDentist,
  updateQueueStatus,
};
