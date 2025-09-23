const Dentist = require("../Model/DentistModel");
const Leave = require("../Model/LeaveModel");
const ClinicEvent = require("../Model/ClinicEventModel");
const Appointment = require("../Model/AppointmentModel");
const Queue = require("../Model/QueueModel");

function generateSlots(date, from, to, slotMinutes) {
  const slots = [];
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);

  let start = new Date(`${date}T${String(fh).padStart(2, "0")}:${String(fm).padStart(2, "0")}:00`);
  const end = new Date(`${date}T${String(th).padStart(2, "0")}:${String(tm).padStart(2, "0")}:00`);

  while (start < end) {
    const slotEnd = new Date(start.getTime() + slotMinutes * 60000);
    if (slotEnd <= end) {
      slots.push({
        start: new Date(start).toISOString(),
        end: new Date(slotEnd).toISOString(),
        status: "bookable",
      });
    }
    start = slotEnd;
  }
  return slots;
}

async function getBookableSlots(req, res) {
  try {
    const { dentistCode } = req.params;
    const { date, slot } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Query 'date' is required (YYYY-MM-DD)" });
    }

    const dentist = await Dentist.findOne({ dentistCode })
      .populate("userId", "name")
      .lean();
    if (!dentist) {
      return res.status(404).json({ message: "Dentist not found" });
    }

    const schedKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(date).getDay()];
    const workingWindow = dentist.availability_schedule?.[schedKey];

    if (!workingWindow) {
      return res.status(200).json({
        dentist: {
          dentistCode: dentist.dentistCode,
          name: dentist.userId?.name,
          specialization: dentist.specialization,
        },
        date,
        workingWindow: null,
        slotMinutes: slot ? Number(slot) : 30,
        slots: [],
      });
    }

    const [from, to] = workingWindow.split("-");
    const slotMinutes = slot ? Number(slot) : 30;
    let slots = generateSlots(date, from, to, slotMinutes);

    const today = new Date();
    const selectedDate = new Date(date + "T00:00:00");

    if (selectedDate < new Date(today.toDateString())) {
      slots = slots.map((s) => ({ ...s, status: "date_passed" }));
    } else {
      // full day range
      const dayStart = new Date(date + "T00:00:00");
      const dayEnd = new Date(date + "T23:59:59");

      // events
      const events = await ClinicEvent.find({
        isPublished: true,
        isDeleted: { $ne: true },
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart },
      }).lean();

      if (events?.length) {
        slots = slots.map((s) => {
          const st = new Date(s.start);
          const et = new Date(s.end);
          const overlapping = events.some(
            (ev) => st < new Date(ev.endDate) && et > new Date(ev.startDate)
          );
          if (overlapping) return { ...s, status: "blocked_event" };
          return s;
        });
      }

      // time passed
      if (selectedDate.getTime() === new Date(today.toDateString()).getTime()) {
        slots = slots.map((s) => {
          const slotEnd = new Date(s.end);
          if (slotEnd <= today) return { ...s, status: "time_passed" };
          return s;
        });
      }

      // leaves
      const leaves = await Leave.find({
        dentistCode,
        dateFrom: { $lte: dayEnd },
        dateTo: { $gte: dayStart },
      }).lean();

      // booked appointments from Appointment table
      const bookedAppointments = await Appointment.find({
         dentist_code: dentistCode,
         appointment_date: { $gte: dayStart, $lte: dayEnd },
         isActive: true,
         status: { $in: ["pending", "confirmed"] },
      }).lean();

     //  ALSO check Queue table for today's bookings
      const queueBookings = await Queue.find({
         dentistCode: dentistCode,
         date: { $gte: dayStart, $lte: dayEnd },
         status: { $in: ['waiting', 'called', 'in_treatment'] }, // exclude completed/no_show
      }).lean();

      // apply leave first, then booked
      slots = slots.map((s) => {
        const st = new Date(s.start);
        const et = new Date(s.end);

        // ✅ FIXED: normalize leave range
        const leaveOverlap = leaves.some((lv) => {
          const lvStart = new Date(new Date(lv.dateFrom).setHours(0, 0, 0, 0));
          const lvEnd = new Date(new Date(lv.dateTo).setHours(23, 59, 59, 999));
          return st < lvEnd && et > lvStart;
        });
        if (leaveOverlap) return { ...s, status: "blocked_leave" };

        // Check appointments table
        const bookedOverlap = bookedAppointments.some(
          (a) =>
            new Date(a.appointment_date) >= st &&
            new Date(a.appointment_date) < et
        );
        if (bookedOverlap) return { ...s, status: "booked" };

       //  ALSO check queue table
        const queueOverlap = queueBookings.some(
          (q) =>
            new Date(q.date) >= st &&
            new Date(q.date) < et
        );
        if (queueOverlap) return { ...s, status: "booked" };

        return s;
      });
    }

    return res.status(200).json({
      dentist: {
        dentistCode: dentist.dentistCode,
        name: dentist.userId?.name,
        specialization: dentist.specialization,
      },
      date,
      workingWindow: { dayName: schedKey, from, to },
      slotMinutes,
      slots,
    });
  } catch (err) {
    console.error("[getBookableSlots]", err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Failed to get slots" });
  }
}

module.exports = { getBookableSlots };
