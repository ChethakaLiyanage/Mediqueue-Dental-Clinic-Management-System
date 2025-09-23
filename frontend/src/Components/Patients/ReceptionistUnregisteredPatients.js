import React, { useEffect, useState } from "react";
import ReceptionistNav from "../Nav/ReceptionistNav";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export default function ReceptionistUnregisteredPatients() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);

  const debounced = useDebounced(q, 300);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr("");
        const r = await fetch(`${API_BASE}/receptionist/unregistered-patients?search=${encodeURIComponent(debounced)}&limit=50`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        setRows(Array.isArray(j.items) ? j.items : (Array.isArray(j) ? j : []));
      } catch (e) {
        if (!alive) return;
        setErr("Failed to load unregistered patients.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [debounced]);

  return (
    <div className="rc-shell">
      <ReceptionistNav />
      <main className="rc-main">
        <div className="rp-wrap">
          <div className="rp-header">
            <h2>Unregistered Patients</h2>
            <div className="rp-search">
              <input
                placeholder="Search by name, phone, email, or UP code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="rp-btn" onClick={() => setQ((s) => s)}>Search</button>
            </div>
          </div>

          <div className="rp-card">
            {err && <div className="rp-error">{err}</div>}
            {loading ? (
              <div className="rp-empty">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="rp-empty">No unregistered patients</div>
            ) : (
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>UP CODE</th>
                    <th>NAME</th>
                    <th>CONTACT</th>
                    <th>EMAIL</th>
                    <th>AGE</th>
                    <th>ADDED BY</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.unregisteredPatientCode}>
                      <td className="rp-mono">{r.unregisteredPatientCode}</td>
                      <td>{r.name || "-"}</td>
                      <td>{r.phone || "-"}</td>
                      <td className="rp-ellipsis" title={r.email || ""}>{r.email || "-"}</td>
                      <td>{(r.age ?? "") === "" ? "-" : r.age}</td>
                      <td className="rp-mono">{r.addedByCode || "-"}</td>
                      <td>
                        <button className="rp-pill rp-view" onClick={() => setSelected(r.unregisteredPatientCode)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <UPDrawer apiBase={API_BASE} code={selected} onClose={() => setSelected(null)} />
          )}
        </div>
      </main>
    </div>
  );
}

function UPDrawer({ apiBase, code, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr("");
        const r = await fetch(`${apiBase}/receptionist/unregistered-patients/${code}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        setData(j);
      } catch (e) {
        if (!alive) return;
        setErr("Failed to load details.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apiBase, code]);

  return (
    <div className="rp-drawer">
      <div className="rp-drawer-panel">
        <div className="rp-drawer-head">
          <h3>Unregistered: {code}</h3>
          <button className="rp-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="rp-empty">Loading…</div>
        ) : err ? (
          <div className="rp-error">{err}</div>
        ) : (
          <>
            <div className="rp-grid">
              <div><div className="rp-label">Name</div><div className="rp-value">{data?.name || "-"}</div></div>
              <div><div className="rp-label">Phone</div><div className="rp-value">{data?.phone || "-"}</div></div>
              <div><div className="rp-label">Email</div><div className="rp-value">{data?.email || "-"}</div></div>
              <div><div className="rp-label">Age</div><div className="rp-value">{(data?.age ?? "") === "" ? "-" : data?.age}</div></div>
              <div><div className="rp-label">ID Number</div><div className="rp-value">{data?.identityNumber || "-"}</div></div>
              <div><div className="rp-label">Added By</div><div className="rp-value rp-mono">{data?.addedByCode || "-"}</div></div>
              <div className="rp-col-span-2"><div className="rp-label">Notes</div><div className="rp-value">{data?.notes || "-"}</div></div>
            </div>

            <div className="rp-subhead">Appointments</div>
            {Array.isArray(data?.appointments) && data.appointments.length > 0 ? (
              <table className="rp-table rp-table-compact">
                <thead>
                  <tr>
                    <th>APPT</th>
                    <th>DENTIST</th>
                    <th>DATE &amp; TIME</th>
                    <th>STATUS</th>
                    <th>BOOKED BY</th>
                    <th>ACCEPTED BY</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.map(a => (
                    <tr key={a.appointmentCode}>
                      <td className="rp-mono">{a.appointmentCode}</td>
                      <td className="rp-mono">{a.dentist_code}</td>
                      <td>{new Date(a.date).toLocaleString()}</td>
                      <td><span className="rp-pill rp-badge-blue">{a.status}</span></td>
                      <td className="rp-mono">{a.createdByCode || "-"}</td>
                      <td className="rp-mono">{a.acceptedByCode || "-"}</td>
                      <td className="rp-ellipsis" title={a.reason || ""}>{a.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="rp-empty">No appointments</div>}
          </>
        )}
      </div>
      <div className="rp-drawer-backdrop" onClick={onClose} />
    </div>
  );
}
