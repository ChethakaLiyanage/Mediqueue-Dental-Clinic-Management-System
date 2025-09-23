// Controllers/ReceptionistDashboardController.js
const Appointment = require("../Model/AppointmentModel");
const Queue = require("../Model/QueueModel");
const ClinicEvent = require("../Model/ClinicEventModel");
const Inquiry = require("../Model/InquiryModel");
const Dentist = require("../Model/DentistModel");
const Notification = require("../Model/NotificationLogModel");
// const Notification = require("../Model/NotificationModel"); // optional if you log reminders

// ---- Config you can tweak ----
const DEFAULT_TZ_OFFSET_MIN = 330; // Asia/Colombo = +05:30
const AVG_SERVICE_MINUTES = 15;    // used for ETA calculation
const BOOKING_STATUSES = ["pending", "confirmed"]; // adjust to your statuses
const DONE_STATUSES = ["completed"];               // adjust to your statuses
const CANCEL_STATUSES = ["cancelled"];             // adjust to your statuses

// ---- date helpers (no external libs) ----
function toLocalDateString(d = new Date(), tzOffsetMin = DEFAULT_TZ_OFFSET_MIN) {
  // returns YYYY-MM-DD of *local* date in given offset
  const utc = new Date(d.getTime() + tzOffsetMin * 60 * 1000);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLocalDayRange(localDateStr, tzOffsetMin = DEFAULT_TZ_OFFSET_MIN) {
  // local 00:00 -> UTC, local 23:59:59.999 -> UTC
  // build a Date from local midnight, then subtract tzOffset
  const msLocalStart = Date.parse(`${localDateStr}T00:00:00.000Z`);
  const msLocalEnd = Date.parse(`${localDateStr}T23:59:59.999Z`);
  const start = new Date(msLocalStart - tzOffsetMin * 60 * 1000);
  const end = new Date(msLocalEnd - tzOffsetMin * 60 * 1000);
  return { start, end };
}

function weekdayName(date, tzOffsetMin = DEFAULT_TZ_OFFSET_MIN) {
  const utc = new Date(date.getTime() + tzOffsetMin * 60 * 1000);
  const day = utc.getUTCDay(); // 0=Sun
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
}

// "09:00-17:00" -> [{start:"09:00", end:"17:00"}]
function parseWindows(windowStr) {
  if (!windowStr) return [];
  // support "09:00-12:00,13:00-17:00"
  return windowStr.split(",").map(s => {
    const [start, end] = s.trim().split("-");
    return { start, end };
  });
}

// generate 30-min slots from "HH:mm-HH:mm"
function generateSlots(windows, stepMin = 30) {
  const result = [];
  for (const w of windows) {
    if (!w.start || !w.end) continue;
    const [sh, sm] = w.start.split(":").map(Number);
    const [eh, em] = w.end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    for (let t = startMin; t + stepMin <= endMin; t += stepMin) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      result.push(`${hh}:${mm}`);
    }
  }
  return result;
}

// convert Date -> "HH:mm" local
function toLocalHHmm(d, tzOffsetMin = DEFAULT_TZ_OFFSET_MIN) {
  const t = new Date(d.getTime() + tzOffsetMin * 60 * 1000);
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function estimateWaitMinutes(waitingCount) {
  return waitingCount * AVG_SERVICE_MINUTES;
}

function dateAt(dateStr, minutesFromMidnight) {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  return new Date(base.getTime() + minutesFromMidnight * 60 * 1000);
}

exports.getReceptionistDashboard = async (req, res) => {
  try {
    const tzOffsetMin = Number(req.query.tzOffsetMin ?? DEFAULT_TZ_OFFSET_MIN);
    const localDateStr = req.query.date || toLocalDateString(new Date(), tzOffsetMin);
    const { start, end } = getLocalDayRange(localDateStr, tzOffsetMin);
    const now = new Date();

    // ---------- Parallel queries ----------
    const [
      apptAgg,
      nextAppts,
      queueAgg,
      queueToday,
      openInquiryCount,
      latestInquiries,
      publishedEvents,
      dentists,
      unreadNotifications
    ] = await Promise.all([
      // Appointments aggregation by status for today
      Appointment.aggregate([
        { $match: { appointment_date: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Next upcoming appointments (today) for quick view
      Appointment.find({
        appointment_date: { $gte: now, $lte: end },
        status: { $in: BOOKING_STATUSES }
      })
        .sort({ appointment_date: 1 })
        .limit(5)
        .lean(),

      // Queue aggregation by dentist & status for today
      Queue.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: { dentist_code: "$dentist_code", status: "$status" }, count: { $sum: 1 } } }
      ]),

      // Raw queue items (to compute ETAs and “called” item etc.)
      Queue.find({ date: { $gte: start, $lte: end } })
        .sort({ position: 1, updatedAt: -1 })
        .lean(),

      // Inquiries
      Inquiry.countDocuments({ status: "open" }),
      Inquiry.find({}) // latest updates, any status (or filter to open if you prefer)
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),

      // Events: all published events (not just today)
      ClinicEvent.find({
        isPublished: true,
        isDeleted: { $ne: true }
      })
       .sort({ startDate: 1 })  // Sort by start date
       .limit(10)  // Show more events
       .lean(),

      // Dentists (with availability)
      Dentist.find({})
        .populate({ path: "userId", select: "name email" })
        .lean(),

        // Unread notifications count 
      Notification.countDocuments({ 
        isRead: false
       })
    ]);

    // ---------- Appointments metrics ----------
    const byStatus = Object.fromEntries(apptAgg.map(x => [x._id || "unknown", x.count]));
    const totalAppts = apptAgg.reduce((s, x) => s + x.count, 0);
    const pending = BOOKING_STATUSES.reduce((s, st) => s + (byStatus[st] || 0), 0);
    const completed = DONE_STATUSES.reduce((s, st) => s + (byStatus[st] || 0), 0);
    const cancelled = CANCEL_STATUSES.reduce((s, st) => s + (byStatus[st] || 0), 0);

    // ---------- Queue by dentist ----------
    const queuesByDentist = {};
    for (const g of queueAgg) {
      const d = g._id.dentist_code;
      const st = g._id.status;
      queuesByDentist[d] = queuesByDentist[d] || { dentist_code: d, waiting: 0, called: 0, no_show: 0, completed: 0, cancelled: 0 };
      // normalize your statuses if they differ
      if (st === "waiting") queuesByDentist[d].waiting += g.count;
      else if (st === "called") queuesByDentist[d].called += g.count;
      else if (st === "no-show" || st === "no_show") queuesByDentist[d].no_show += g.count;
      else if (st === "completed") queuesByDentist[d].completed += g.count;
      else if (st === "cancelled" || st === "canceled") queuesByDentist[d].cancelled += g.count;
    }
    const queuesArray = Object.values(queuesByDentist);

    // ---------- Compute ETA per dentist based on waiting count ----------
    const etaByDentist = {};
    for (const d of queuesArray) {
      const wait = d.waiting;
      etaByDentist[d.dentist_code] = estimateWaitMinutes(wait);
    }

    // ---------- Dentist availability snapshot (today) ----------
    const todayWeekday = weekdayName(new Date(`${localDateStr}T12:00:00.000Z`), tzOffsetMin); // e.g., "Mon"
    // build booked slot map { dentist_code: Set("HH:mm") }
// Check BOTH Appointment table AND Queue table (like the schedule controller does)
const [todaysBooked, queueBookings] = await Promise.all([
  Appointment.find({
    appointment_date: { $gte: start, $lte: end },
    status: { $in: [...BOOKING_STATUSES, ...DONE_STATUSES] }
  }, { dentist_code: 1, appointment_date: 1, status: 1 }).lean(),
  
  Queue.find({
    date: { $gte: start, $lte: end },
    status: { $in: ['waiting', 'called', 'in_treatment'] }
  }, { dentistCode: 1, date: 1, status: 1 }).lean()  // ← FIXED: dentistCode not dentist_code
]);

const bookedMap = new Map(); // dentist_code -> Set<HH:mm>

// Add appointments from Appointment table
for (const a of todaysBooked) {
  const t = toLocalHHmm(a.appointment_date, tzOffsetMin);
  const key = a.dentist_code;
  if (!bookedMap.has(key)) bookedMap.set(key, new Set());
  bookedMap.get(key).add(t);
}

// Add appointments from Queue table
for (const q of queueBookings) {
  const t = toLocalHHmm(q.date, tzOffsetMin);
  const key = q.dentistCode;  // ← FIXED: dentistCode not dentist_code
  if (!bookedMap.has(key)) bookedMap.set(key, new Set());
  bookedMap.get(key).add(t);
}

const dentistAvailabilityToday = dentists.map(d => {
  const code = d.dentistCode || d.dentist_code;
  const sched = (d.availability_schedule && (d.availability_schedule[todayWeekday] || d.availability_schedule[todayWeekday.substring(0,3)])) || "";
  const windows = parseWindows(sched);
  const allSlots = generateSlots(windows, 30);
  const booked = Array.from(bookedMap.get(code) || []);
  
  const available = allSlots.filter(s => {
    // Skip booked slots
    if (booked.includes(s)) return false;
    
    // Skip time-passed slots (only for today)
    if (localDateStr === toLocalDateString(now, tzOffsetMin)) {
      const [slotH, slotM] = s.split(':').map(Number);
      const nowLocal = new Date(now.getTime() + tzOffsetMin * 60 * 1000);
      const nowH = nowLocal.getUTCHours();
      const nowM = nowLocal.getUTCMinutes();
      const slotMinutes = slotH * 60 + slotM;
      const currentMinutes = nowH * 60 + nowM;
      
      if (slotMinutes <= currentMinutes) return false;
    }
    
    // Check if slot overlaps with any published event
    const [slotH, slotM] = s.split(':').map(Number);
    const slotStartMs = Date.parse(`${localDateStr}T${String(slotH).padStart(2,'0')}:${String(slotM).padStart(2,'0')}:00.000Z`);
    const slotStart = new Date(slotStartMs - tzOffsetMin * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
    
    // ↓↓↓ CHANGE THIS LINE ↓↓↓
    const eventBlocked = publishedEvents.some(ev => {        // ← CHANGED
  const evStart = new Date(ev.startDate);
  const evEnd = new Date(ev.endDate);
  return slotStart < evEnd && slotEnd > evStart;
});
    
    if (eventBlocked) return false;
    
    return true;
  });
  
  return {
    dentist_code: code,
    dentist_name: d?.userId?.name || null,
    schedule_window: sched,
    slots_total: allSlots.length,
    slots_booked: booked.length,
    slots_available: available.length,
    next_free_slot: available[0] || null
  };
});

    // ---------- Queue live view ----------
    // group raw queue rows by dentist for the "current called" & "list view"
    const queueLive = {};
    for (const q of queueToday) {
      const d = q.dentist_code;
      queueLive[d] = queueLive[d] || { dentist_code: d, waiting: [], called: [], no_show: [], completed: [], cancelled: [] };
      queueLive[d][(q.status || "waiting").replace("-", "_")]?.push({
        _id: q._id,
        appointmentCode: q.appointmentCode,
        position: q.position,
        status: q.status,
        updatedAt: q.updatedAt
      });
    }

    // ---------- Assemble response ----------
    const response = {
      context: {
        tzOffsetMin,
        localDate: localDateStr,
        rangeUTC: { start, end }
      },
      cards: {
        appointmentsToday: {
          total: totalAppts,
          pendingOrConfirmed: pending,
          completed,
          cancelled
        },
        queueToday: {
          totalWaiting: queuesArray.reduce((s, d) => s + d.waiting, 0),
          totalCalled: queuesArray.reduce((s, d) => s + d.called, 0),
          totalNoShow: queuesArray.reduce((s, d) => s + d.no_show, 0),
          totalCompleted: queuesArray.reduce((s, d) => s + d.completed, 0)
        },
        inquiries: {
          openCount: openInquiryCount,
          latest: latestInquiries.map(x => ({
            inquiryCode: x.inquiryCode,
            subject: x.subject,
            status: x.status,
            updatedAt: x.updatedAt
          }))
        },
        events: {
  publishedTodayCount: publishedEvents.filter(e => {   // ← CHANGED
    const evStart = new Date(e.startDate);
    const evEnd = new Date(e.endDate);
    return evStart < end && evEnd > start;
  }).length,
  totalPublished: publishedEvents.length,              // ← ADD THIS
  items: publishedEvents.map(e => ({                   // ← CHANGED
    eventCode: e.eventCode,
    title: e.title,
    start: e.startDate,
    end: e.endDate,
    imageUrl: e.imageUrl
  }))
}
      },
      nextAppointments: nextAppts.map(a => ({
        appointmentCode: a.appointmentCode,
        patient_code: a.patient_code,
        dentist_code: a.dentist_code,
        timeLocal: toLocalHHmm(a.appointment_date, tzOffsetMin),
        status: a.status,
        reason: a.reason
      })),
      queuesByDentist: queuesArray.map(d => {
  const dentist = dentists.find(doc => doc.dentistCode === d.dentist_code);
  return {
    ...d,
    dentist_name: dentist?.userId?.name || d.dentist_code,
    etaMinutes: etaByDentist[d.dentist_code] || 0
  };
}),
      queueLiveByDentist: queueLive,
      dentistAvailabilityToday,
      unreadNotificationCount: unreadNotifications
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("getReceptionistDashboard error:", err);
    return res.status(500).json({ message: "Failed to load dashboard", error: String(err?.message || err) });
  }
};
