import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Search,
  Stethoscope,
  Star,
  Award,
  Users,
  AlertCircle,
} from "lucide-react";
import { validateOTP } from "../../utils/validation";

const apiBase = "http://localhost:5000";
const SLOT_INTERVAL_MINUTES = 30;
const WORK_START_MINUTES = 9 * 60;
const WORK_END_MINUTES = 18 * 60;

/* ---------------- helpers ---------------- */
function toMinutesFromHHMM(value) {
  if (!value || value === "all") return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function formatMinutesToHHMM(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
function addMinutesToDate(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}
function getSlotIso(slot) {
  if (!slot) return "";
  if (typeof slot === "string") return slot;
  if (typeof slot === "object" && slot.iso) return slot.iso;
  return "";
}
function buildSlotLabels(slot, fallbackDuration) {
  const iso = getSlotIso(slot);
  if (!iso) return { timeLabel: "Unavailable", dateLabel: "" };
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return { timeLabel: "Unavailable", dateLabel: "" };
  const end = addMinutesToDate(start, fallbackDuration);
  return {
    timeLabel: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    dateLabel: start.toLocaleDateString(),
  };
}
function dedupeSlots(slots) {
  const seen = new Set();
  return slots.filter((s) => {
    const key = `${s.doctorId || s.doctorCode}-${getSlotIso(s)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function getDoctorDisplayName(doc, index = 0) {
  if (!doc) return "Doctor";
  return (
    doc.displayName ||
    doc.name ||
    doc.fullName ||
    doc.user?.name ||
    doc.userId?.name ||
    (doc.specialization ? `Dr. ${doc.specialization}` : (doc.dentistCode || `Doctor ${index + 1}`))
  );
}
function normalizeDoctorList(list) {
  return list.map((doc, index) => ({
    ...doc,
    displayName: getDoctorDisplayName(doc, index),
  }));
}

/* ---- exact-minute key helper (for exact-time collision) ---- */
function minuteKey(d) {
  const dt = new Date(d);
  return [
    dt.getFullYear(),
    dt.getMonth(),
    dt.getDate(),
    dt.getHours(),
    dt.getMinutes(),
  ].join("-");
}

/* ---- ranges + "booked" helpers ---- */
function parseBlockToRange(block) {
  // Accepts various shapes and returns {start: Date, end: Date}
  if (!block) return null;

  const startIso =
    block.startIso ||
    block.start ||
    block.iso ||
    (typeof block === "string" ? block : null);

  const start = startIso ? new Date(startIso) : null;
  if (!start || Number.isNaN(start.getTime())) return null;

  let end = null;
  if (block.end) {
    end = new Date(block.end);
  } else {
    const dur = Number(block.durationMinutes || block.duration || 30);
    end = addMinutesToDate(start, dur);
  }

  if (Number.isNaN(end.getTime())) return null;
  return { start, end };
}
function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function isEntryBookedLike(entry) {
  const status = (entry.status || "").toLowerCase();
  return (
    entry.booked === true ||
    entry.isBooked === true ||
    entry.available === false ||
    status === "booked" ||
    status === "confirmed" ||
    status === "reserved"
  );
}

/* ---- doctor loader helpers (probe multiple endpoints) ---- */
const DOCTOR_ENDPOINTS = [
  "/receptionist/dentists?q=&limit=200",
  "/receptionist/dentists",
  "/dentists",
  "/api/dentists",
  "/users?role=doctor",
  "/staff?type=dentist",
];

function normalizeDoctorRecord(d, index = 0) {
  const _id =
    d._id || d.id || d.userId?._id || d.user?._id || d.code || d.dentistCode || d.dentist_code;
  const name =
    d.displayName ||
    d.name ||
    d.fullName ||
    d.user?.name ||
    d.userId?.name ||
    (d.firstName || d.firstname
      ? `${d.firstName || d.firstname} ${d.lastName || d.lastname || ""}`.trim()
      : undefined);

  const specialization = d.specialization || d.title || d.role || d.department;
  const dentistCode = d.dentistCode || d.dentist_code || d.code;

  return {
    ...d,
    _id,
    displayName:
      name ||
      (specialization ? `Dr. ${specialization}` : dentistCode || `Doctor ${index + 1}`),
    dentistCode,
    specialization,
  };
}
function extractDoctorsFromResponse(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.dentists)) return json.dentists;
  if (Array.isArray(json?.data)) return json.data;
  if (json?.results && Array.isArray(json.results)) return json.results;
  return [];
}

/* ---------------- component ---------------- */
export default function BookAppointment() {
  const navigate = useNavigate();
  const isAuthed = !!localStorage.getItem("token");

  // 🚫 No guest: redirect if not logged in
  useEffect(() => {
    if (!isAuthed) navigate("/login", { replace: true });
  }, [isAuthed, navigate]);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorError, setDoctorError] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("all");
  const [duration, setDuration] = useState(30);

  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMeta, setOtpMeta] = useState(null);
  const [otpStatus, setOtpStatus] = useState("");
  const [otpError, setOtpError] = useState("");
  const [reason, setReason] = useState("");
  const [otpFieldError, setOtpFieldError] = useState("");

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDoctorInfo, setSelectedDoctorInfo] = useState(null);
  const selectedDoctorDisplayName = selectedDoctorInfo ? getDoctorDisplayName(selectedDoctorInfo) : null;
  const selectedDoctorInitial = selectedDoctorDisplayName ? selectedDoctorDisplayName.charAt(0) : "D";

  /* ---- load doctors (probe multiple endpoints) ---- */
  const loadDoctors = async () => {
    setLoadingDoctors(true);
    setDoctorError("");
    try {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };

      let found = null;
      for (const path of DOCTOR_ENDPOINTS) {
        const url = `${apiBase}${path}`;
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const json = await res.json().catch(() => ({}));
          const raw = extractDoctorsFromResponse(json);
          if (raw.length) {
            found = raw.map((d, i) => normalizeDoctorRecord(d, i));
            break;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!found || !found.length) {
        throw new Error(
          "Could not find a working doctors endpoint. Tried: " + DOCTOR_ENDPOINTS.join(", ")
        );
      }

      setDoctors(found);
      const firstId = found[0]._id || found[0].dentistCode;
      setDoctorId(firstId || "");
    } catch (e) {
      setDoctors([]);
      setDoctorId("");
      setDoctorError(e.message || "Failed to load doctors");
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- step state ---- */
  useEffect(() => {
    if (selectedSlot) setCurrentStep(3);
    else if (slots.length > 0) setCurrentStep(2);
    else setCurrentStep(1);
  }, [selectedSlot, slots]);

  /* ---- selected doctor info ---- */
  useEffect(() => {
    if (!doctorId) {
      setSelectedDoctorInfo(null);
      return;
    }
    const doctor =
      doctors.find((d) => d._id === doctorId) ||
      doctors.find((d) => d.id === doctorId) ||
      doctors.find((d) => d.dentistCode === doctorId) ||
      null;
    setSelectedDoctorInfo(doctor);
  }, [doctorId, doctors]);

  /* ---- duration/time sanity ---- */
  const handleDurationChange = (value) => {
    const minutes = Number(value);
    setDuration(minutes);
    if (time !== "all") {
      const selectedMinutes = toMinutesFromHHMM(time);
      if (selectedMinutes === null || selectedMinutes + minutes > WORK_END_MINUTES) {
        setTime("all");
      }
    }
  };

  /* ---- generate slots ---- */
  const generateSlots = (dateStr, timeStr, doctor) => {
    const results = [];
    const doctorName = getDoctorDisplayName(doctor);
    const doctorIdentifier = doctor?._id || null;
    const doctorCode = doctor?.dentistCode || doctor?.dentist_code || doctorIdentifier;
    const durationMinutes = Number(duration) || SLOT_INTERVAL_MINUTES;
    const pushSlot = (startIso) => {
      results.push({ iso: startIso, duration: durationMinutes, doctorName, doctorId: doctorIdentifier, doctorCode });
    };
    if (timeStr === "all") {
      let startMinutes = WORK_START_MINUTES;
      while (startMinutes + durationMinutes <= WORK_END_MINUTES) {
        const hhmm = formatMinutesToHHMM(startMinutes);
        const start = new Date(`${dateStr}T${hhmm}:00`);
        pushSlot(start.toISOString());
        startMinutes += SLOT_INTERVAL_MINUTES;
      }
    } else {
      const selectedMinutes = toMinutesFromHHMM(timeStr);
      if (selectedMinutes !== null && selectedMinutes + durationMinutes <= WORK_END_MINUTES) {
        const start = new Date(`${dateStr}T${timeStr}:00`);
        pushSlot(start.toISOString());
      }
    }
    return results;
  };

  /* ---- fetch booked blocks (returns ranges + exact start minute keys) ---- */
  const fetchBookedBlocks = async (docId, day) => {
    const token = localStorage.getItem("token");
    const headers = token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };

    const urls = [
      `${apiBase}/appointments/booked?doctorId=${encodeURIComponent(docId)}&date=${encodeURIComponent(day)}`,
      `${apiBase}/appointments/occupied?doctorId=${encodeURIComponent(docId)}&date=${encodeURIComponent(day)}`,
      `${apiBase}/appointments?doctorId=${encodeURIComponent(docId)}&date=${encodeURIComponent(day)}&status=confirmed`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) continue;
        const raw = await res.json().catch(() => []);
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
        if (!arr.length) continue;

        const ranges = [];
        const exactStartKeys = new Set();

        arr.forEach((block) => {
          const r = parseBlockToRange(block);
          if (!r) return;
          ranges.push(r);
          exactStartKeys.add(minuteKey(r.start));
        });

        if (ranges.length || exactStartKeys.size) return { ranges, exactStartKeys };
      } catch {
        // try next
      }
    }
    return { ranges: [], exactStartKeys: new Set() };
  };

  /* ---- filter out past & booked (exact-time collisions too) ---- */
  const filterUnavailable = (slotsArr, booked) => {
    const now = new Date();
    const ranges = booked?.ranges || [];
    const exactStartKeys = booked?.exactStartKeys || new Set();

    return slotsArr.filter((s) => {
      const iso = getSlotIso(s);
      if (!iso) return false;

      const start = new Date(iso);
      if (Number.isNaN(start.getTime())) return false;

      // Hide past times on the same day
      if (
        start < now &&
        start.getFullYear() === now.getFullYear() &&
        start.getMonth() === now.getMonth() &&
        start.getDate() === now.getDate()
      ) return false;

      // Server says it's booked/unavailable
      if (isEntryBookedLike(s)) return false;

      // 🔒 exact start-time collision (your "This dentist is already booked for that exact time" case)
      if (exactStartKeys.has(minuteKey(start))) return false;

      // Range overlap backstop
      const dur = Number(s.duration) || Number(s.durationMinutes) || 30;
      const end = addMinutesToDate(start, dur);
      for (const br of ranges) {
        if (intervalsOverlap(start, end, br.start, br.end)) return false;
      }
      return true;
    });
  };

  /* ---- fetch or build slots ---- */
  const searchSlots = async () => {
    if (!date || !doctorId || !time) return;
    setLoading(true);
    setSelectedSlot(null);

    // Fetch booked once for this doctor+date
    const booked = await fetchBookedBlocks(doctorId, date).catch(() => ({ ranges: [], exactStartKeys: new Set() }));

    try {
      const url = new URL(`${apiBase}/appointments/availability`);
      url.searchParams.set("doctorId", doctorId);
      url.searchParams.set("date", date);
      url.searchParams.set("duration", String(duration));
      if (time !== "all") url.searchParams.set("time", time);

      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));
      const avRaw = Array.isArray(data) ? data : data?.slots || [];

      let normalized = avRaw.map((entry) => {
        if (typeof entry === "object") {
          let slotDoctorId = entry.doctorId || entry.dentistId || entry.doctor?._id || entry.dentist?._id;
          const slotDoctorCode = entry.dentistCode || entry.doctorCode || entry.dentist_code;

          const doctorMatch =
            (slotDoctorId && doctors.find((d) => d._id === slotDoctorId)) ||
            (slotDoctorCode && doctors.find((d) => d.dentistCode === slotDoctorCode));

          if (doctorMatch && !slotDoctorId) slotDoctorId = doctorMatch._id;

          const doctorName =
            entry.doctorName || doctorMatch?.displayName || getDoctorDisplayName(entry.doctor || doctorMatch);

          return {
            ...entry,
            duration,
            doctorId: slotDoctorId,
            doctorCode: slotDoctorCode || doctorMatch?.dentistCode,
            doctorName,
          };
        }
        return { iso: entry, duration, doctorId };
      });

      normalized = filterUnavailable(dedupeSlots(normalized), booked);

      if (!normalized.length) {
        const doc =
          doctors.find((d) => d._id === doctorId) ||
          doctors.find((d) => d.dentistCode === doctorId);
        const clientSlots = generateSlots(date, time, doc);
        setSlots(filterUnavailable(dedupeSlots(clientSlots), booked));
      } else {
        setSlots(normalized);
      }
    } catch (err) {
      const doc =
        doctors.find((d) => d._id === doctorId) ||
        doctors.find((d) => d.dentistCode === doctorId);
      const clientSlots = generateSlots(date, time, doc);
      setSlots(filterUnavailable(dedupeSlots(clientSlots), booked));
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when filters change (comment this block if you want manual-only via button)
  useEffect(() => {
    if (!doctorId || !date || !time) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    searchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date, time, duration]);

  useEffect(() => {
    setOtpSent(false);
    setOtpCode("");
    setOtpMeta(null);
    setOtpError("");
  }, [selectedSlot]);

  /* ---- choose slot ---- */
  const holdSlot = (slot) => {
    const doctorMatch =
      doctors.find((d) => d._id === slot.doctorId) ||
      doctors.find((d) => d.dentistCode === (slot.dentistCode || slot.doctorCode));
    setSelectedSlot({
      ...slot,
      doctorId: slot.doctorId || doctorMatch?._id,
      doctorCode: slot.dentistCode || slot.doctorCode || doctorMatch?.dentistCode,
      doctorName: slot.doctorName || doctorMatch?.displayName || getDoctorDisplayName(doctorMatch),
    });
    setCurrentStep(3);
    setSelectedDoctorInfo(doctorMatch || null);
  };

  /* ---- OTP ---- */
  const sendOtp = async () => {
    if (!selectedSlot) { setOtpError("Select a timeslot before requesting an OTP."); return; }
    try {
      setOtpError(""); setOtpStatus("");
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login", { replace: true }); return; }
      const slotIso = getSlotIso(selectedSlot);
      if (!slotIso) { setOtpError("Unable to determine the selected slot."); return; }

      const doctorForSlot =
        doctors.find((d) => d._id === selectedSlot.doctorId) ||
        doctors.find((d) => d.dentistCode === (selectedSlot.dentistCode || selectedSlot.doctorCode)) ||
        doctors.find((d) => d._id === doctorId);

      const body = {
        slotIso,
        durationMinutes: selectedSlot.duration || duration,
        dentistCode: selectedSlot.dentistCode || selectedSlot.doctorCode || doctorForSlot?.dentistCode,
        doctorId: selectedSlot.doctorId || doctorForSlot?._id,
        doctorName: selectedSlot.doctorName || doctorForSlot?.displayName || getDoctorDisplayName(doctorForSlot),
        reason,
      };

      const res = await fetch(`${apiBase}/appointments/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setOtpError(data.message || "Failed to send OTP. Please try again."); return; }

      setOtpSent(true);
      setOtpMeta({ id: data.otpId, expiresAt: data.expiresAt, sentPhone: data.sentPhone, slotIso });
      setOtpStatus(data.message || "OTP sent successfully");
    } catch (err) {
      setOtpError(err.message || "Failed to send OTP.");
    }
  };

  const verifyOtpAndConfirm = async () => {
    if (!otpMeta?.id) { setOtpError("Request an OTP before attempting to verify."); return; }
    
    // Validate OTP format
    const otpValidation = validateOTP(otpCode);
    if (!otpValidation.isValid) {
      setOtpFieldError(otpValidation.message);
      return;
    }
    
    setOtpFieldError("");
    setOtpError("");
    
    try {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login", { replace: true }); return; }

      const res = await fetch(`${apiBase}/appointments/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otpId: otpMeta.id, code: otpCode, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setOtpError(data.message || "OTP verification failed. Please try again."); return; }

      setOtpStatus(data.message || "Appointment confirmed");
      setOtpSent(false);
      setOtpCode("");
      setOtpMeta(null);
      setSelectedSlot(null);
      await searchSlots();
      setCurrentStep(1);
      navigate("/home", { replace: true });
    } catch (err) {
      setOtpError(err.message || "Unable to confirm appointment.");
    }
  };

  /* ---- UI options ---- */
  const timeOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Times (09:00 - 18:00)" }];
    let startMinutes = WORK_START_MINUTES;
    while (startMinutes + (Number(duration) || SLOT_INTERVAL_MINUTES) <= WORK_END_MINUTES) {
      const label = formatMinutesToHHMM(startMinutes);
      opts.push({ value: label, label });
      startMinutes += SLOT_INTERVAL_MINUTES;
    }
    return opts;
  }, [duration]);

  /* ---------------- render ---------------- */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #fff7ed 100%)',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: 'white', padding: '4rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>Book Your Dental Appointment</h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
            Choose your preferred dentist and time slot for professional dental care
          </p>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: '1200px', margin: '-2rem auto 2rem', padding: '0 2rem' }}>
        <div style={{ background: 'white', borderRadius: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.1)', padding: '2rem', border: '1px solid #e5e7eb' }}>
          {/* Filters */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.25rem' }}>
              <Search style={{ marginRight: '0.5rem', color: '#3b82f6' }} size={24} />
              Select Your Preferences
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {/* Doctor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Choose Doctor
                </label>
                <div style={{ position: 'relative' }}>
                  <Stethoscope style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    disabled={loadingDoctors || !!doctorError}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '2px solid #e5e7eb', borderRadius: '0.75rem', background: 'white', fontSize: '0.875rem' }}
                  >
                    {loadingDoctors && <option>Loading doctors...</option>}
                    {!loadingDoctors && doctorError && <option>Unable to load doctors</option>}
                    {!loadingDoctors && !doctorError && doctors.length === 0 && <option>No doctors found</option>}
                    {!loadingDoctors && !doctorError &&
                      doctors.map((doc, i) => {
                        const id = doc._id || doc.id || doc.dentistCode || `doc-${i}`;
                        return (
                          <option key={id} value={id}>
                            {doc.displayName || getDoctorDisplayName(doc, i)}
                          </option>
                        );
                      })}
                  </select>
                </div>
                {doctorError && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#b91c1c', fontSize: 12 }}>{doctorError}</span>
                    <button
                      onClick={loadDoctors}
                      style={{
                        border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8,
                        padding: '6px 10px', fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      Reload doctors
                    </button>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Preferred Date
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '2px solid #e5e7eb', borderRadius: '0.75rem', background: 'white', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Duration
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
                  <select
                    value={duration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '2px solid #e5e7eb', borderRadius: '0.75rem', background: 'white', fontSize: '0.875rem' }}
                  >
                    {[30, 45, 60, 90].map((m) => (
                      <option key={m} value={m}>{m} minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Preferred Time
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '2px solid #e5e7eb', borderRadius: '0.75rem', background: 'white', fontSize: '0.875rem' }}
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Search Slots button */}
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={searchSlots}
                disabled={loading || !doctorId || !date}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  borderRadius: '0.6rem',
                  fontWeight: 600,
                  cursor: loading || !doctorId || !date ? 'not-allowed' : 'pointer',
                  opacity: loading || !doctorId || !date ? 0.6 : 1
                }}
              >
                <Search size={18} />
                {loading ? "Searching..." : "Search Slots"}
              </button>
            </div>
          </div>

          {/* Slots */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.0rem' }}>
              <Clock style={{ marginRight: '0.5rem', color: '#f97316' }} size={24} />
              Available Time Slots
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{
                  width: '3rem', height: '3rem', border: '3px solid #e5e7eb',
                  borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <p style={{ fontWeight: '500' }}>Searching for available slots...</p>
              </div>
            ) : slots.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '3rem', color: '#6b7280',
                background: '#f9fafb', borderRadius: '1rem', border: '2px dashed #d1d5db'
              }}>
                <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
                <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>No slots available</p>
                <p style={{ fontSize: '0.875rem' }}>Try selecting a different doctor, date, or time range, then press <strong>Search Slots</strong>.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {slots.map((slot) => {
                  const { timeLabel, dateLabel } = buildSlotLabels(slot, Number(duration) || SLOT_INTERVAL_MINUTES);
                  const isSelected = selectedSlot && getSlotIso(selectedSlot) === getSlotIso(slot);
                  const key = `${slot.doctorId || slot.doctorCode}-${getSlotIso(slot)}`;
                  return (
                    <button
                      key={key}
                      onClick={() => holdSlot(slot)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        border: isSelected ? '2px solid #f97316' : '2px solid #e5e7eb',
                        background: isSelected ? '#fff7ed' : 'white',
                        color: isSelected ? '#9a3412' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem' }}>
                        {timeLabel}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        {dateLabel}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {slot.doctorName || "Available"}
                      </div>
                      {isSelected && (
                        <CheckCircle size={20} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: '#f97316' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirm & OTP */}
          {selectedSlot && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>
                <CheckCircle style={{ marginRight: '0.5rem', color: '#16a34a' }} size={24} />
                Confirm Your Appointment
              </h3>

              <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontWeight: '500' }}>
                      {new Date(getSlotIso(selectedSlot)).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontWeight: '500' }}>
                      {(() => {
                        const start = new Date(getSlotIso(selectedSlot));
                        const end = addMinutesToDate(start, Number(duration) || 30);
                        return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                      })()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Stethoscope size={18} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontWeight: '500' }}>
                      {doctors.find((d) => d._id === selectedSlot.doctorId)?.displayName ||
                        doctors.find((d) => d._id === selectedSlot.doctorId)?.name ||
                        selectedSlot.doctorName ||
                        "Selected Doctor"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Reason for Visit (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., consultation, cleaning, pain relief"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '0.75rem', background: 'white', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ border: '2px solid #e5e7eb', borderRadius: '1rem', background: 'white', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <Shield style={{ marginRight: '0.5rem', color: '#3b82f6' }} size={20} />
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                    Secure OTP Verification
                  </h4>
                </div>

                {otpStatus && (
                  <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <p style={{ color: '#166534', margin: 0, fontSize: '0.875rem' }}>
                      {otpStatus}
                      {otpMeta?.sentPhone ? ` (sent to ${otpMeta.sentPhone})` : ""}
                      {otpMeta?.expiresAt ? ` - expires at ${new Date(otpMeta.expiresAt).toLocaleTimeString()}` : ""}
                    </p>
                  </div>
                )}

                {otpError && (
                  <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>{otpError}</p>
                  </div>
                )}

                {!otpSent ? (
                  <button
                    onClick={sendOtp}
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '0.5rem', fontWeight: '600' }}
                  >
                    Send OTP Code
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value);
                          if (otpFieldError) setOtpFieldError("");
                        }}
                        onBlur={() => {
                          if (otpCode && !validateOTP(otpCode).isValid) {
                            setOtpFieldError(validateOTP(otpCode).message);
                          }
                        }}
                        maxLength={6}
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: otpFieldError ? '2px solid #dc2626' : '2px solid #e5e7eb', 
                          borderRadius: '0.5rem', 
                          fontSize: '0.875rem', 
                          textAlign: 'center', 
                          letterSpacing: '0.1em', 
                          fontWeight: '600' 
                        }}
                      />
                      {otpFieldError && (
                        <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {otpFieldError}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={verifyOtpAndConfirm}
                      disabled={!otpCode.trim() || !!otpFieldError}
                      style={{ 
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', 
                        color: 'white', 
                        padding: '0.75rem 1.5rem', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        fontWeight: '600', 
                        opacity: (!otpCode.trim() || !!otpFieldError) ? 0.5 : 1 
                      }}
                    >
                      Verify & Confirm
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
