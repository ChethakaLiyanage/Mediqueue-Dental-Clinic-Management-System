import React, { useEffect, useState } from "react";
import "./receptionistpatients.css";
import ReceptionistNav from "../Nav/ReceptionistNav";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:5000";

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ReceptionistPatients() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedCode, setSelectedCode] = useState(null);

  const debounced = useDebounced(search, 300);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(
          `${API_BASE}/receptionist/patients?search=${encodeURIComponent(debounced)}&limit=50`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setRows(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (!alive) return;
        setErr("Failed to load patients. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debounced]);

  return (
    <div className="rc-shell">
      <ReceptionistNav />
      <main className="rc-main">
        <div className="rp-wrap">
          <div className="rp-header">
            <h2>Patients</h2>
            <div className="rp-search">
              <input
                type="text"
                placeholder="Search by name, email, phone, or patient code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="rp-btn" onClick={() => setSearch((s) => s)}>
                Apply
              </button>
            </div>
          </div>

          <div className="rp-card">
            {err && <div className="rp-error">{err}</div>}
            {loading ? (
              <div className="rp-empty">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="rp-empty">No patients found</div>
            ) : (
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>PATIENT</th>
                    <th>NAME</th>
                    <th>CONTACT</th>
                    <th>EMAIL</th>
                    <th>GENDER</th>
                    <th>AGE</th>
                    <th>NIC</th>
                    <th>REGISTERED BY</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.patientCode}>
                      <td className="rp-mono">{r.patientCode || "-"}</td>
                      <td>{r.name || "-"}</td>
                      <td>{r.phone || "-"}</td>
                      <td className="rp-ellipsis" title={r.email || ""}>
                        {r.email || "-"}</td>
                      <td>{r.gender || "-"}</td>
                      <td>{(r.age ?? "") === "" ? "-" : r.age}</td>
                      <td className="rp-mono" title="Full NIC">
                        {r.nic || "-"}</td>
                      {/* ✅ FIXED: prefer registeredByCode */}
                      <td className="rp-mono">{r.registeredByCode || r.createdByCode || r.createdBy || "-"}</td>
                      <td>
                        <button
                          className="rp-pill rp-view"
                          onClick={() => setSelectedCode(r.patientCode)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedCode && (
            <PatientDrawer
              apiBase={API_BASE}
              patientCode={selectedCode}
              onClose={() => setSelectedCode(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function PatientDrawer({ apiBase, patientCode, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${apiBase}/receptionist/patients/${patientCode}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (!alive) return;
        setData(d);
      } catch (e) {
        if (!alive) return;
        setErr("Failed to load patient details.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiBase, patientCode]);

  const registeredBy = data?.registeredByCode || data?.patient?.registeredByCode || data?.createdByCode || data?.createdBy || null;

  return (
    <div className="rp-drawer">
      <div className="rp-drawer-panel">
        <div className="rp-drawer-head">
          <h3>Patient: {patientCode}</h3>
          <button className="rp-close" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="rp-empty">Loading...</div>
        ) : err ? (
          <div className="rp-error">{err}</div>
        ) : (
          <>
            <div className="rp-grid">
              {/* ... unchanged fields ... */}
              <div>
                <div className="rp-label">Registered By</div>
                <div className="rp-value rp-mono">{registeredBy || "-"}</div>
              </div>
              {/* ... unchanged fields ... */}
            </div>

            <div className="rp-subhead">Recent Appointments</div>
            {Array.isArray(data?.appointments) && data.appointments.length > 0 ? (
              <table className="rp-table rp-table-compact">
                <thead>
                  <tr>
                    <th>APPT</th>
                    <th>DENTIST</th>
                    <th>DATE &amp; TIME</th>
                    <th>STATUS</th>
                    <th>BOOKED BY</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.map((a) => (
                    <tr key={a.appointmentCode}>
                      <td className="rp-mono">{a.appointmentCode}</td>
                      <td className="rp-mono">{a.dentist_code}</td>
                      <td>{formatDate(a.date)}</td>
                      <td>
                        <span className={`rp-pill ${statusClass(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      {/* ✅ FIXED: createdByCode first */}
                      <td className="rp-mono">{a.createdByCode || a.createdBy || "-"}</td>
                      <td className="rp-ellipsis" title={a.reason || ""}>
                        {a.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rp-empty">No recent appointments</div>
            )}
          </>
        )}
      </div>
      <div className="rp-drawer-backdrop" onClick={onClose} />
    </div>
  );
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleString();
  } catch {
    return "-";
  }
}

function statusClass(s) {
  switch ((s || "").toLowerCase()) {
    case "pending":
      return "rp-badge-purple";
    case "confirmed":
      return "rp-badge-blue";
    case "completed":
      return "rp-badge-green";
    case "cancelled":
      return "rp-badge-gray";
    default:
      return "rp-badge-gray";
  }
}
