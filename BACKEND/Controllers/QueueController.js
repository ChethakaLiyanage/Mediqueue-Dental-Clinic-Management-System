// Controllers/QueueController.js
const Queue = require('../Model/QueueModel');
const QueueHistory = require('../Model/QueueHistoryModel');
const Appointment = require('../Model/AppointmentModel');

// GET /queue/today
async function getTodayQueue(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${today}T00:00:00Z`);
    const end = new Date(`${today}T23:59:59Z`);

    // ❌ REMOVED: All auto-status updates (dentist changes status manually)
    // No more auto-expiring, auto-completing, or auto-cancelling

    const items = await Queue.find({ date: { $gte: start, $lte: end } }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// GET /queue/ongoing
async function getOngoing(req, res) {
  try {
    const { dentistCode } = req.query;
    const filter = { status: 'in_treatment' }; // ✅ Updated status name
    if (dentistCode) filter.dentistCode = dentistCode;
    const items = await Queue.find(filter).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// GET /queue/next
async function getNext(req, res) {
  try {
    const { dentistCode } = req.query;
    const filter = { status: 'waiting' };
    if (dentistCode) filter.dentistCode = dentistCode;
    const items = await Queue.find(filter)
      .sort({ position: 1 })
      .limit(1)
      .lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// PATCH /queue/update/:id
async function updateQueue(req, res) {
  try {
    const { id } = req.params;
    const { newTime } = req.body;
    const q = await Queue.findById(id);
    if (!q) return res.status(404).json({ message: 'Not found' });

    const history = new QueueHistory({
      ...q.toObject(),
      switchedFrom: q.date,
      switchedTo: newTime,
    });
    await history.save();

    // ✅ Track time switch (per queue_part4.txt)
    q.previousTime = q.date;
    q.date = new Date(newTime);
    // Status remains 'waiting' - action shows "Time switched" in frontend
    await q.save();
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// DELETE /queue/delete-update/:id
async function deleteAndUpdate(req, res) {
  try {
    const { id } = req.params;
    const q = await Queue.findById(id);
    if (!q) return res.status(404).json({ message: 'Not found' });

    const history = new QueueHistory({
      ...q.toObject(),
      status: 'cancel_and_change',
    });
    await history.save();

    await q.deleteOne();
    res.json({ message: 'Removed and archived' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/* ---------------- Migrate Appointments to Queue ---------------- */
async function migrateToday(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${today}T00:00:00Z`);
    const end = new Date(`${today}T23:59:59Z`);

    // Remove existing today's queue (fresh rebuild)
    await Queue.deleteMany({ date: { $gte: start, $lte: end } });

    // Find today's appointments
    const todaysAppts = await Appointment.find({
      appointment_date: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed'] },
      isActive: true,
    }).lean();

    if (!todaysAppts.length) {
      return res.json({ message: 'No appointments to migrate', migrated: 0 });
    }

    let position = 1;
    for (const appt of todaysAppts) {
      await Queue.create({
        appointmentCode: appt.appointmentCode,
        patientCode: appt.patient_code,
        dentistCode: appt.dentist_code,
        date: appt.appointment_date, // ✅ Full datetime preserved
        position: position++,
        status: 'waiting', // ✅ All start as waiting
      });

      // Remove appointment after migration
      await Appointment.deleteOne({ _id: appt._id });
    }

    return res.json({
      message: `Migrated ${todaysAppts.length} appointments to queue`,
      migrated: todaysAppts.length,
    });
  } catch (e) {
    console.error('[QueueController:migrateToday]', e);
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getTodayQueue,
  getOngoing,
  getNext,
  updateQueue,
  deleteAndUpdate,
  migrateToday,
};