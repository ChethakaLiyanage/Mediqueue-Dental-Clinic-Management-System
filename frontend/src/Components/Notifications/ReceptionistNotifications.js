import React, { useEffect, useMemo, useState } from "react";
import ReceptionistNav from "../Nav/ReceptionistNav";
import { getJSON, postJSON } from "../../api";
import "./receptionistnotifications.css";

const REFRESH_MS = 60_000;

function fmtDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

function minutesLabel(mins) {
  if (mins == null) return "-";
  if (mins <= 0) return "Expired";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours}h ${rem}m`;
}

export default function ReceptionistNotifications() {
  const [activeTab, setActiveTab] = useState("appointments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState([]);
  const [autoCancelled, setAutoCancelled] = useState([]);

  const groupedPending = useMemo(() => {
    const byDentist = new Map();
    for (const item of pending) {
      const key = item.dentist_code || "Unknown";
      if (!byDentist.has(key)) byDentist.set(key, []);
      byDentist.get(key).push(item);
    }
    return Array.from(byDentist.entries()).map(([dentist, items]) => ({ dentist, items }));
  }, [pending]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getJSON("/receptionist/notifications/appointments");
      setPending(data?.pending || []);
      setAutoCancelled(data?.autoCancelled || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [activeTab]);

  async function accept(code) {
    try {
      const data = await postJSON(`/receptionist/appointments/${code}/confirm`, {});
      const who = data.receptionistCode ? ` by ${data.receptionistCode}` : "";
      setInfo(`Accepted ${code}${who}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancel(code) {
    const reason = window.prompt(`Cancel ${code}? Optional reason:`) || "";
    try {
      const data = await postJSON(`/receptionist/appointments/${code}/cancel`, { reason });
      const who = data.receptionistCode ? ` by ${data.receptionistCode}` : "";
      setInfo(`Canceled ${code}${who}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="notif-shell">
      <ReceptionistNav />
      <main className="notif-main">
        <header className="notif-header">
          <h1>Notifications</h1>
        </header>

        {error && <div className="notif-alert error">{error}</div>}
        {info && <div className="notif-alert ok">{info}</div>}

        {activeTab === "appointments" && (
          <section className="notif-section">
            <div className="notif-section-head">
              <h2>Pending Online Appointments</h2>
              <button className="notif-refresh" onClick={load} disabled={loading}>{loading ? "Refreshingâ€¦" : "Refresh"}</button>
            </div>
            {groupedPending.length === 0 && !loading && <div className="notif-empty">No pending online appointments.</div>}
            {groupedPending.map(group => (
              <div className="notif-group" key={group.dentist}>
                <div className="notif-group-title">{group.dentist}</div>
                {group.items.map(item => (
                  <div className={`notif-card ${item.expiresInMinutes != null && item.expiresInMinutes <= 30 ? "warn" : ""}`} key={item.appointmentCode}>
                    <div className="notif-card-main">
                      <div className="notif-card-title">{item.appointmentCode}</div>
                      <div className="notif-card-meta">
                        <span>Patient: {item.patient?.name || item.patient_code}</span>
                        <span>Contact: {item.patient?.contact || "-"}</span>
                      </div>
                      <div className="notif-card-meta">
                        <span>Requested for: {fmtDateTime(item.appointment_date)}</span>
                        <span>Requested at: {fmtDateTime(item.requestedAt)}</span>
                      </div>
                      <div className="notif-card-meta">
                        <span>Reason: {item.appointmentReason || "-"}</span>
                        <span>Time left: {minutesLabel(item.expiresInMinutes)}</span>
                      </div>
                    </div>
                    <div className="notif-actions">
                      <button className="notif-btn ok" onClick={() => accept(item.appointmentCode)}>Accept</button>
                      <button className="notif-btn danger" onClick={() => cancel(item.appointmentCode)}>Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="notif-section-head">
              <h2>Auto-cancelled (last 20)</h2>
            </div>
            {autoCancelled.length === 0 && <div className="notif-empty">No auto-cancelled appointments.</div>}
            {autoCancelled.map(item => (
              <div className="notif-card muted" key={`${item.appointmentCode}-${item.autoCanceledAt || item.canceledAt}`}>
                <div className="notif-card-main">
                  <div className="notif-card-title">{item.appointmentCode}</div>
                  <div className="notif-card-meta">
                    <span>Patient: {item.patient?.name || item.patient_code}</span>
                    <span>Dentist: {item.dentist?.name || item.dentist_code}</span>
                  </div>
                  <div className="notif-card-meta">
                    <span>Requested for: {fmtDateTime(item.appointment_date)}</span>
                    <span>Auto cancelled: {fmtDateTime(item.autoCanceledAt || item.canceledAt)}</span>
                  </div>
                  <div className="notif-card-meta">
                    <span>Cancelled by: {item.canceledByCode || "AUTO"}</span>
                    <span>Notes: {item.appointmentReason || "-"}</span>
                    <span>Cancel reason: {item.cancellationReason || 'Not confirmed in time'}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
