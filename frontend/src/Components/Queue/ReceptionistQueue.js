// src/Components/Queue/ReceptionistQueue.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./ReceptionistQueue.css";

export default function ReceptionistQueue() {
  const [tab, setTab] = useState("details");
  const [items, setItems] = useState([]);
  const todayStr = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      // Silently backfill queue
      await fetch(`http://localhost:5000/receptionist/queue/migrate-today?date=${todayStr}`, {
        method: "POST",
      });
    } catch (e) {
      console.warn("migrate failed", e);
    }

    try {
      const r = await fetch(`http://localhost:5000/receptionist/queue?date=${todayStr}`);
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      console.error("queue fetch failed", e);
      setItems([]);
    }
  }, [todayStr]);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Group items by dentist
  const groupedByDentist = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      if (!groups[item.dentistCode]) {
        groups[item.dentistCode] = [];
      }
      groups[item.dentistCode].push(item);
    });
    return groups;
  }, [items]);

// Get next patient for each dentist (for Next tab)
const nextPatients = useMemo(() => {
  const next = {};
  Object.keys(groupedByDentist).forEach((dentistCode) => {
    const dentistItems = groupedByDentist[dentistCode];
    
    // First, check if there's a 'called' patient
    const called = dentistItems.find(q => q.status === 'called');
    if (called) {
      next[dentistCode] = called;
    } else {
      // If no called patient, check if there's an 'in_treatment' patient
      const inTreatment = dentistItems.find(q => q.status === 'in_treatment');
      if (inTreatment) {
        // If someone is in treatment, show the next waiting patient
        const waiting = dentistItems
          .filter(q => q.status === 'waiting')
          .sort((a, b) => a.position - b.position)[0];
        if (waiting) next[dentistCode] = waiting;
      }
    }
  });
  return next;
}, [groupedByDentist]);

  // Get ongoing (in_treatment) patients (for Ongoing tab)
  const ongoingPatients = useMemo(() => {
    return items.filter(q => q.status === 'in_treatment');
  }, [items]);

  // Handle status change (for dentist)
  async function handleStatusChange(queueCode, newStatus) {
    try {
      await fetch(`http://localhost:5000/receptionist/queue/${queueCode}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } catch (e) {
      console.error("Status update failed", e);
      alert("Failed to update status");
    }
  }

  // Handle Cancel button
  async function handleCancel(queueCode) {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await fetch(`http://localhost:5000/receptionist/queue/${queueCode}/cancel`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by receptionist" }),
      });
      alert("Appointment cancelled successfully");
      load();
    } catch (e) {
      console.error("Cancel failed", e);
      alert("Failed to cancel appointment");
    }
  }

  // Handle Update button (same day, same dentist, different time)
  async function handleUpdate(item) {
    // eslint-disable-next-line no-restricted-globals
    const newTime = prompt(
      "Enter new time for same day (HH:MM format):",
      new Date(item.date).toISOString().slice(11, 16)
    );
    if (!newTime) return;

    const newDateTimeISO = `${todayStr}T${newTime}:00`;
    try {
      await fetch(`http://localhost:5000/receptionist/queue/${item.queueCode}/switch-time`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newTime: newDateTimeISO }),
      });
      alert("Appointment time updated successfully");
      load();
    } catch (e) {
      console.error("Update failed", e);
      alert("Failed to update appointment");
    }
  }

  // Handle Delete & Update button (different day/dentist)
  async function handleDeleteAndUpdate(item) {
    // eslint-disable-next-line no-restricted-globals
    const newDate = prompt("Enter new date (YYYY-MM-DD):", todayStr);
    if (!newDate) return;
    // eslint-disable-next-line no-restricted-globals
    const newTime = prompt("Enter new time (HH:MM):", "09:00");
    if (!newTime) return;
    // eslint-disable-next-line no-restricted-globals
    const newDentistCode = prompt("Enter dentist code:", item.dentistCode);
    if (!newDentistCode) return;

    try {
      await fetch(`http://localhost:5000/receptionist/queue/${item.queueCode}/delete-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDate,
          newTime,
          newDentistCode,
          reason: "Rescheduled",
        }),
      });
      alert("Appointment rescheduled successfully");
      load();
    } catch (e) {
      console.error("Delete & Update failed", e);
      alert("Failed to reschedule appointment");
    }
  }

  // Check button availability based on status
  function getButtonAvailability(status) {
    switch (status) {
      case 'waiting':
      case 'called':
        return { cancel: true, update: true, deleteUpdate: true };
      case 'in_treatment':
        return { cancel: false, update: true, deleteUpdate: true };
      case 'completed':
        return { cancel: false, update: false, deleteUpdate: false };
      case 'no_show':
        return { cancel: false, update: true, deleteUpdate: true };
      default:
        return { cancel: true, update: true, deleteUpdate: true };
    }
  }

  // Calculate action display
  function getAction(item) {
    if (item.previousTime) return "Time switched";
    return "-";
  }

  return (
    <div className="queue-container">
      <div className="tabs">
        <button
          className={tab === "ongoing" ? "active" : ""}
          onClick={() => setTab("ongoing")}
        >
          Ongoing
        </button>
        <button
          className={tab === "next" ? "active" : ""}
          onClick={() => setTab("next")}
        >
          Next
        </button>
        <button
          className={tab === "details" ? "active" : ""}
          onClick={() => setTab("details")}
        >
          Queue Details
        </button>
        <button style={{ marginLeft: "auto" }} onClick={load}>
          Refresh
        </button>
      </div>

      <div className="tab-content">
        {/* ONGOING TAB */}
        {tab === "ongoing" && (
          <>
            {ongoingPatients.length === 0 && <p>No patients in treatment.</p>}
            {ongoingPatients.map((q) => (
              <div key={q.queueCode} className="queue-card" data-status={q.status}>
                <p><b>Patient Code:</b> {q.patientCode}</p>
                <p><b>Dentist:</b> {q.dentistCode}</p>
                <p><b>Date & Time:</b> {new Date(q.date).toLocaleString()}</p>
                <p><b>Status:</b> {q.status}</p>
                <div className="actions">
                  <button onClick={() => handleStatusChange(q.queueCode, 'completed')}>
                    Mark Completed
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* NEXT TAB */}
        {tab === "next" && (
          <>
            {Object.keys(nextPatients).length === 0 && <p>No next patients.</p>}
            {Object.entries(nextPatients).map(([dentistCode, q]) => (
              <div key={q.queueCode} className="queue-card" data-status={q.status}>
                <h3>Dentist: {dentistCode}</h3>
                <p><b>Patient Code:</b> {q.patientCode}</p>
                <p><b>Date & Time:</b> {new Date(q.date).toLocaleString()}</p>
                <p><b>Status:</b> {q.status}</p>
                <div className="actions">
                  {q.status === 'waiting' && (
                    <button onClick={() => handleStatusChange(q.queueCode, 'called')}>
                      Call Patient
                    </button>
                  )}
                  {q.status === 'called' && (
                    <>
                      <button onClick={() => handleStatusChange(q.queueCode, 'in_treatment')}>
                        Start Treatment
                      </button>
                      <button onClick={() => handleStatusChange(q.queueCode, 'no_show')}>
                        Mark No Show
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* QUEUE DETAILS TAB */}
        {tab === "details" && (
          <>
            {Object.keys(groupedByDentist).length === 0 && <p>No appointments today.</p>}
            {Object.entries(groupedByDentist).map(([dentistCode, dentistItems]) => (
              <div key={dentistCode} className="dentist-group">
                <h2 className="dentist-header">Dentist: {dentistCode}</h2>
                <div className="table-container">
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th>Patient Code</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Action</th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dentistItems.map((item) => {
                        const buttons = getButtonAvailability(item.status);
                        return (
                          <tr key={item.queueCode}>
                            <td>{item.patientCode}</td>
                            <td>{new Date(item.date).toLocaleString()}</td>
                            <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                            <td>{getAction(item)}</td>
                            <td className="options-cell">
                              <button
                                disabled={!buttons.cancel}
                                onClick={() => handleCancel(item.queueCode)}
                                className="btn-cancel"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={!buttons.update}
                                onClick={() => handleUpdate(item)}
                                className="btn-update"
                              >
                                Update
                              </button>
                              <button
                                disabled={!buttons.deleteUpdate}
                                onClick={() => handleDeleteAndUpdate(item)}
                                className="btn-delete-update"
                              >
                                Delete & Update
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}