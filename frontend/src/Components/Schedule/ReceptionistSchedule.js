// src/Components/Schedule/ReceptionistSchedule.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReceptionistNav from "../Nav/ReceptionistNav";
import "./receptionistschedule.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

function getYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function timeLocal(iso) {
  try {
    const dt = new Date(iso);
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

export default function ReceptionistSchedule() {
  const [date, setDate] = useState(getYYYYMMDD());
  const [dentistCode, setDentistCode] = useState("Dr-0001");
  const [slotMinutes, setSlotMinutes] = useState(30);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [patientCode, setPatientCode] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const canQuery = useMemo(
    () => Boolean(date && dentistCode && slotMinutes),
    [date, dentistCode, slotMinutes]
  );

  const load = useCallback(async () => {
    if (!canQuery) return;
    try {
      setBusy(true);
      setErr("");
      const url = `${API_BASE}/receptionist/schedule/dentists/${encodeURIComponent(
        dentistCode
      )}/slots?date=${encodeURIComponent(date)}&slot=${slotMinutes}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      setRefreshedAt(new Date());
    } catch (e) {
      setErr(String(e.message || e));
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [canQuery, date, dentistCode, slotMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  function statusPill(s) {
    const base = "rc-pill";
    if (s === "bookable") return `${base} ok`;
    if (s === "booked") return `${base} bad`;
    if (s === "blocked_event") return `${base} warn`;
    if (s === "blocked_leave") return `${base} warn`; // dentist leave
    if (s === "date_passed") return `${base} muted`;
    if (s === "time_passed") return `${base} muted`;
    return base;
  }

  async function createAppointment() {
    if (!selected) return;

    // prevent booking blocked slots
    if (selected.status !== "bookable") {
      setToast({ type: "bad", msg: "This slot cannot be booked" });
      setTimeout(() => setToast(null), 2200);
      return;
    }

    if (!patientCode.trim()) {
      setToast({ type: "bad", msg: "Enter a Patient Code (e.g., P-0001)" });
      setTimeout(() => setToast(null), 2200);
      return;
    }
    try {
      setSaving(true);

      const receptionistCode =
        JSON.parse(localStorage.getItem("user") || "{}")?.receptionistCode;

      const payload = {
        patient_code: patientCode.trim(),
        dentist_code: dentistCode,
        appointment_date: new Date(selected.start).toISOString(),
        reason: reason.trim() || undefined,
        createdByCode: receptionistCode,
      };

      const r = await fetch(`${API_BASE}/appointments/receptionist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || `Booking failed (HTTP ${r.status})`);
      }

      setOpen(false);
      setSelected(null);
      setPatientCode("");
      setReason("");
      setToast({ type: "ok", msg: "Appointment created" });
      setTimeout(() => setToast(null), 2200);
      await load();
    } catch (e) {
      setToast({ type: "bad", msg: String(e.message || e) });
      setTimeout(() => setToast(null), 2600);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rc-shell ${busy ? "rc-skel" : ""}`}>
      <ReceptionistNav />

      <main className="rc-main">
        <header className="rc-topbar">
          <div className="rc-top-title">Schedules</div>
          <div className="rc-top-actions">
            <input
              className="rc-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              className="rc-date rc-dentist-input"
              placeholder="Dentist code (e.g., Dr-0001)"
              value={dentistCode}
              onChange={(e) => setDentistCode(e.target.value)}
            />
            <select
              className="rc-date"
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
            >
              {[10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
            <button className="rc-btn" onClick={load} disabled={busy}>
              ⟳ Refresh
            </button>
            {toast && (
              <div
                className={`rc-pill ${
                  toast.type === "ok"
                    ? "ok"
                    : toast.type === "bad"
                    ? "bad"
                    : ""
                }`}
              >
                {toast.msg}
              </div>
            )}
          </div>
        </header>

        {err && <div className="rc-error">⚠️ {err}</div>}

        <div className="rc-grid">
          <div className="rc-card">
            <div className="rc-card-head">Dentist</div>
            <div className="rc-stat">
              {data?.dentist?.name || "–"} (
              {data?.dentist?.dentistCode || dentistCode})
            </div>
            <div className="rc-sub">
              {data?.dentist?.specialization ? (
                <span className="rc-pill info">
                  {data.dentist.specialization}
                </span>
              ) : (
                <span className="rc-pill muted">No specialization set</span>
              )}
            </div>
          </div>

          <div className="rc-card">
            <div className="rc-card-head">Working Window</div>
            <div className="rc-stat smaller">
              {data?.workingWindow
                ? `${data.workingWindow.dayName} • ${data.workingWindow.from}–${data.workingWindow.to}`
                : "Not available"}
            </div>
            <div className="rc-sub">
              <span className="rc-pill muted">{slotMinutes} min slots</span>
            </div>
          </div>

          <div className="rc-card">
            <div className="rc-card-head">Slots</div>
            <div className="rc-stat">{data?.slots?.length ?? 0}</div>
            <div className="rc-sub">
              <span className="rc-pill ok">
                {(data?.slots || []).filter((s) => s.status === "bookable")
                  .length}{" "}
                free
              </span>
              <span className="rc-pill bad">
                {(data?.slots || []).filter((s) => s.status === "booked").length}{" "}
                booked
              </span>
              <span className="rc-pill warn">
                {(data?.slots || []).filter(
                  (s) => s.status === "blocked_event"
                ).length}{" "}
                event blocked
              </span>
              <span className="rc-pill warn">
                {(data?.slots || []).filter(
                  (s) => s.status === "blocked_leave"
                ).length}{" "}
                leave blocked
              </span>
              <span className="rc-pill muted">
                {(data?.slots || []).filter(
                  (s) => s.status === "date_passed"
                ).length}{" "}
                date passed
              </span>
              <span className="rc-pill muted">
                {(data?.slots || []).filter(
                  (s) => s.status === "time_passed"
                ).length}{" "}
                time passed
              </span>
            </div>
          </div>
        </div>

        <section className="rc-section">
          <div className="rc-sec-head">
            <h3>Time Slots</h3>
            <div className="rc-hint">
              {refreshedAt
                ? `Last refresh: ${refreshedAt.toLocaleTimeString()}`
                : ""}
            </div>
          </div>

          <div className="rc-table">
            <div className="rc-thead">
              <div>Start</div>
              <div>End</div>
              <div>Status</div>
              <div>Action</div>
              <div>Note</div>
            </div>
            <div className="rc-tbody">
              {(data?.slots || []).map((s, i) => (
                <div className="rc-row" key={`${s.start}-${i}`}>
                  <div>⏱ {timeLocal(s.start)}</div>
                  <div>{timeLocal(s.end)}</div>
                  <div>
                    <span className={statusPill(s.status)}>
                      {s.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    {s.status === "bookable" ? (
                      <button
                        className="rc-btn"
                        onClick={() => {
                          setSelected(s);
                          setOpen(true);
                        }}
                      >
                        Book
                      </button>
                    ) : (
                      <span className="rc-pill muted">–</span>
                    )}
                  </div>
                  <div className="rc-dim">
                    {s.status === "blocked_event"
                      ? "Blocked by clinic event"
                      : s.status === "blocked_leave"
                      ? "Blocked by dentist leave"
                      : s.status === "date_passed"
                      ? "Date already passed"
                      : s.status === "time_passed"
                      ? "Time already passed"
                      : ""}
                  </div>
                </div>
              ))}
              {(!data?.slots || data.slots.length === 0) && (
                <div className="rc-row rc-empty">No slots for this day.</div>
              )}
            </div>
          </div>
        </section>

        {open && selected && (
          <div className="schedule-modal-overlay">
            <div className="schedule-modal">
              <div className="schedule-modal-header">
                <h3>Create Appointment</h3>
                <button className="rc-pill" onClick={() => setOpen(false)}>
                  × Close
                </button>
              </div>

              <div className="schedule-modal-content">
                <div className="schedule-appointment-info">
                  <div>
                    <b>Dentist:</b> {data?.dentist?.name || "–"} ({dentistCode})
                  </div>
                  <div>
                    <b>Date:</b> {date} &nbsp; <b>Time:</b>{" "}
                    {timeLocal(selected.start)}–{timeLocal(selected.end)}
                  </div>
                </div>

                <div className="schedule-form-group">
                  <label>Patient Code</label>
                  <input
                    className="rc-date"
                    placeholder="P-0001"
                    value={patientCode}
                    onChange={(e) => setPatientCode(e.target.value)}
                  />
                </div>

                <div className="schedule-form-group">
                  <label>Reason (optional)</label>
                  <input
                    className="rc-date"
                    placeholder="Cleaning / Toothache / Whitening…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="schedule-modal-actions">
                  <button className="rc-pill" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="rc-btn"
                    disabled={saving}
                    onClick={createAppointment}
                  >
                    {saving ? "Booking…" : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="rc-footer">© MediQueue Dental – Reception</footer>
      </main>
    </div>
  );
}