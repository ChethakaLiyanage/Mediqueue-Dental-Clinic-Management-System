import React, { useEffect, useState, useMemo } from "react";
import { Edit, XCircle, Search } from "lucide-react";
import "./appointmenthistory.css";

const apiBase = "http://localhost:5000";

function Field({ label, children }) {
  return (
    <div className="field-container">
      <label className="field-label">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AppointmentHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Search filters
  const [patientCode, setPatientCode] = useState("");
  const [dentistCode, setDentistCode] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [doctorNameQuery, setDoctorNameQuery] = useState("");

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAppointment, setUpdateAppointment] = useState(null);
  const [formData, setFormData] = useState({ doctorId: "", date: "", time: "", duration: 30 });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dentists, setDentists] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  // dentists index for name lookup
  const dentistNameByCode = useMemo(() => {
    const map = new Map();
    dentists.forEach((d) => {
      const code = d.dentistCode || d.code;
      if (!code) return;
      const name =
        d.userId?.name || d.displayName || d.name || `Dentist ${code}`;
      map.set(code, name);
    });
    return map;
  }, [dentists]);

  // Prefill patientCode if logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const pc = data?.patient?.patientCode;
        if (pc) setPatientCode(pc);
      } catch {}
    })();
  }, []);

  /* ---- Load dentists ---- */
  useEffect(() => {
    fetch(`${apiBase}/dentists`)
      .then((r) => r.json())
      .then((data) => setDentists(Array.isArray(data?.dentists) ? data.dentists : []))
      .catch(() => setDentists([]));
  }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (patientCode) p.set("patient_code", patientCode.trim());
    if (dentistCode) p.set("dentist_code", dentistCode.trim());
    if (status) p.set("status", status);
    if (from) p.set("from", new Date(from).toISOString());
    if (to) p.set("to", new Date(to).toISOString());
    return p.toString();
  }, [patientCode, dentistCode, status, from, to]);

  /* ---- Load appointments with search ---- */
  const search = async () => {
    setLoading(true);
    setError("");
    try {
      const url = `${apiBase}/appointments${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load");
      let arr = Array.isArray(data.items) ? data.items : [];

      // filter by doctor name
      const q = doctorNameQuery.trim().toLowerCase();
      if (q) {
        arr = arr.filter((a) => {
          const code = a.dentist_code || "";
          const name = dentistNameByCode.get(code) || code;
          return String(name).toLowerCase().includes(q);
        });
      }

      setAppointments(arr);
    } catch (e) {
      setAppointments([]);
      setError(e.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientCode && !dentistCode) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientCode]);

  /* ---- Fetch Available Slots ---- */
  const fetchAvailableSlots = async () => {
    if (!formData.doctorId || !formData.date) {
      setSlotsError("Please select both doctor and date");
      return;
    }

    setSlotsLoading(true);
    setSlotsError("");
    setSlots([]);
    setSelectedSlot(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setSlotsError("Please log in to view available slots");
        return;
      }

      // First, get all existing appointments for the selected doctor and date
      const appointmentsUrl = `${apiBase}/appointments?dentist_code=${formData.doctorId}&from=${formData.date}T00:00:00.000Z&to=${formData.date}T23:59:59.999Z`;
      const appointmentsRes = await fetch(appointmentsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const appointmentsData = await appointmentsRes.json().catch(() => ({ items: [] }));
      const existingAppointments = Array.isArray(appointmentsData.items) ? appointmentsData.items : [];

      // Filter out cancelled appointments and the current appointment being updated
      const bookedSlots = existingAppointments
        .filter(apt => 
          apt.status !== 'cancelled' && 
          apt._id !== updateAppointment?._id // Exclude current appointment being updated
        )
        .map(apt => ({
          start: new Date(apt.appointment_date),
          end: new Date(new Date(apt.appointment_date).getTime() + (apt.duration || 30) * 60000)
        }));

      // Generate all possible time slots for the day (e.g., 9 AM to 5 PM, 30-minute intervals)
      const selectedDate = new Date(formData.date);
      const startHour = 9; // 9 AM
      const endHour = 17; // 5 PM
      const intervalMinutes = 30;
      
      const allSlots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
          const slotStart = new Date(selectedDate);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart.getTime() + formData.duration * 60000);
          
          // Check if this slot conflicts with any booked appointment
          const isBooked = bookedSlots.some(booked => {
            return (slotStart < booked.end && slotEnd > booked.start);
          });

          // Check if slot is in the past
          const now = new Date();
          const isPast = slotStart < now;

          if (!isBooked && !isPast) {
            allSlots.push({
              iso: slotStart.toISOString(),
              display: slotStart.toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit",
                hour12: true 
              })
            });
          }
        }
      }

      setSlots(allSlots);
      
      if (allSlots.length === 0) {
        setSlotsError("No available slots found for the selected date and duration");
      }

    } catch (error) {
      console.error("Error fetching slots:", error);
      setSlotsError("Failed to fetch available slots. Please try again.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  /* ---- Cancel appointment ---- */
  const cancelAppointment = async (appointment) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${apiBase}/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to cancel appointment");
        return;
      }

      alert("Appointment cancelled!");
      search(); // Refresh the list
    } catch (err) {
      alert("Error cancelling appointment: " + err.message);
    }
  };

  /* ---- Open update modal ---- */
  const openUpdateModal = (appointment) => {
    const apptDate = appointment.appointment_date
      ? new Date(appointment.appointment_date).toISOString().slice(0, 10)
      : "";
    const apptTime = appointment.appointment_date
      ? new Date(appointment.appointment_date).toTimeString().slice(0, 5)
      : "";
    setFormData({ 
      doctorId: appointment.dentist_code, 
      date: apptDate, 
      time: apptTime, 
      duration: appointment.duration || 30 
    });
    setSlots([]);
    setSelectedSlot(null);
    setSlotsError("");
    setUpdateAppointment(appointment);
    setShowUpdateModal(true);
  };

  /* ---- Confirm Update ---- */
  const confirmUpdate = async () => {
    if (!updateAppointment || !selectedSlot) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const body = {
        appointment_date: selectedSlot.iso,
        dentist_code: formData.doctorId,
        duration: formData.duration,
      };

      const res = await fetch(`${apiBase}/appointments/${updateAppointment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to update appointment");
        return;
      }

      alert("Appointment updated successfully!");
      setShowUpdateModal(false);
      setUpdateAppointment(null);
      search(); // Refresh the list
    } catch (err) {
      alert("Error updating appointment: " + err.message);
    }
  };

  return (
    <div className="appointment-history-container">
      <div className="page-header">
        <h1 className="page-title">Appointment History</h1>
        <p className="page-subtitle">
          
        </p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div style={{ display: "none" }}>
            <Field label="Patient Code">
              <input value={patientCode} readOnly />
            </Field>
          </div>
          <Field label="Doctor Name">
            <input
              className="form-input"
              value={doctorNameQuery}
              onChange={(e) => setDoctorNameQuery(e.target.value)}
              placeholder="Type name to search"
            />
          </Field>
          <Field label="Dentist Code (e.g., Dr-0001)">
            <input
              className="form-input"
              value={dentistCode}
              onChange={(e) => setDentistCode(e.target.value)}
              placeholder="Dr-0001"
            />
          </Field>
          <Field label="Status">
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="From (date)">
            <input
              className="form-input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To (date)">
            <input
              className="form-input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>

        <div className="button-group">
          <button
            className="btn-primary"
            onClick={search}
            disabled={loading}
          >
            {loading ? "Loading…" : "Search"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setDentistCode("");
              setDoctorNameQuery("");
              setStatus("");
              setFrom("");
              setTo("");
              setAppointments([]);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="table-container">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Dentist Code</th>
              <th>Dentist Name</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  {loading ? "Loading…" : "No appointments found"}
                </td>
              </tr>
            ) : (
              appointments.map((a) => (
                <tr key={a._id}>
                  <td>
                    {a.appointment_date 
                      ? new Date(a.appointment_date).toLocaleString() 
                      : "-"}
                  </td>
                  <td>{a.dentist_code || "-"}</td>
                  <td>{dentistNameByCode.get(a.dentist_code || "") || "-"}</td>
                  <td>{a.reason || "-"}</td>
                  <td>
                    <span className={`status-badge status-${a.status || 'unknown'}`}>
                      {a.status || "-"}
                    </span>
                  </td>
                  <td>{a.appointmentCode || "-"}</td>
                  <td>
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <>
                        <button className="btn-update" onClick={() => openUpdateModal(a)}>
                          <Edit size={14} /> Update
                        </button>
                        <button className="btn-cancel" onClick={() => cancelAppointment(a)}>
                          <XCircle size={14} /> Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Update Appointment</h2>
            
            <div className="form-group">
              <label>Date:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  setSlots([]); // Clear slots when date changes
                  setSelectedSlot(null);
                }}
              />
            </div>

            <div className="form-group">
              <label>Doctor:</label>
              <select
                value={formData.doctorId}
                onChange={(e) => {
                  setFormData({ ...formData, doctorId: e.target.value });
                  setSlots([]); // Clear slots when doctor changes
                  setSelectedSlot(null);
                }}
              >
                <option value="">Select Doctor</option>
                {dentists.map((d) => (
                  <option key={d.dentistCode} value={d.dentistCode}>
                    {d.userId?.name || d.name} ({d.dentistCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Duration:</label>
              <select
                value={formData.duration}
                onChange={(e) => {
                  setFormData({ ...formData, duration: Number(e.target.value) });
                  setSlots([]); // Clear slots when duration changes
                  setSelectedSlot(null);
                }}
              >
                {[30, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <button 
                className="btn-search-slots"
                onClick={fetchAvailableSlots}
                disabled={!formData.doctorId || !formData.date || slotsLoading}
              >
                <Search size={16} />
                {slotsLoading ? "Searching..." : "Search Available Slots"}
              </button>
            </div>

            {slotsError && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                {slotsError}
              </div>
            )}

            <div className="slots-section">
              <label>Available Time Slots:</label>
              <div className="slots-grid">
                {slots.length === 0 ? (
                  <p className="no-slots">
                    {slotsLoading ? "Loading slots..." : "Click 'Search Available Slots' to view options"}
                  </p>
                ) : (
                  slots.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setSelectedSlot(s)}
                      className={selectedSlot?.iso === s.iso ? "slot selected" : "slot"}
                    >
                      {s.display}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowUpdateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={confirmUpdate} 
                disabled={!selectedSlot}
              >
                Update Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}