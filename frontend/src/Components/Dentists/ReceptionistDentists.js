// src/Components/Dentists/ReceptionistDentists.js
import React, { useEffect, useMemo, useState } from "react";
import "../Dentists/receptionistdentists.css";
import ReceptionistNav from "../Nav/ReceptionistNav";

const API_BASE = process.env.REACT_APP_API || "http://localhost:5000";

function formatSchedule(sch) {
  if (!sch || typeof sch !== "object") return "–";
  try {
    return Object.entries(sch)
      .map(([day, hours]) => `${day}: ${hours}`)
      .join('\n'); // Changed from ' | ' to '\n' for line breaks
  } catch {
    return "–";
  }
}

export default function ReceptionistDentists() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // NEW: separate search fields
  const [codeQuery, setCodeQuery] = useState("");
  const [specialization, setSpecialization] = useState(""); // "" = All

  // NEW: dropdown options
  const [specOptions, setSpecOptions] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  // Use the same token scheme you used for Appoinment - message send (isuri)
  const token =
    localStorage.getItem("receptionistToken") ||
    localStorage.getItem("token") ||
    "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // Build URL with both filters
  function buildListUrl({ code = "", spec = "" } = {}) {
    const qs = new URLSearchParams();
    if (code) qs.set("q", code.trim());                 // code (back-end matches code/specialization)
    if (spec) qs.set("specialization", spec);           // explicit specialization filter
    return `${API_BASE}/receptionist/dentists${qs.toString() ? `?${qs}` : ""}`;
  }

  async function fetchDentists({ code = codeQuery, spec = specialization } = {}) {
    setLoading(true);
    try {
      const url = buildListUrl({ code, spec });
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        console.error("Failed to fetch dentists:", data?.message || res.status);
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // NEW: fetch specializations from backend; fallback to deriving from list
  async function fetchSpecializations() {
    setLoadingSpecs(true);
    try {
      // Preferred (tiny endpoint below)
      const res = await fetch(`${API_BASE}/receptionist/dentists/specializations`, { headers });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data.specializations) ? data.specializations : [];
        setSpecOptions(arr.filter(Boolean).sort());
        return;
      }
      // fallback → derive from a large list
      await fallbackLoadSpecs();
    } catch {
      await fallbackLoadSpecs();
    } finally {
      setLoadingSpecs(false);
    }
  }

  async function fallbackLoadSpecs() {
    try {
      const res2 = await fetch(`${API_BASE}/receptionist/dentists?limit=1000`, { headers });
      const data2 = await res2.json();
      const arr = (data2.items || [])
        .map(d => d.specialization)
        .filter(Boolean);
      const unique = Array.from(new Set(arr)).sort();
      setSpecOptions(unique);
    } catch (e) {
      console.error("Failed to derive specializations:", e);
      setSpecOptions([]);
    }
  }

  // initial load
  useEffect(() => {
    fetchDentists({ code: "", spec: "" }); // show all
    fetchSpecializations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e) {
    e.preventDefault();
    fetchDentists({ code: codeQuery, spec: specialization });
  }

  function onChangeSpec(e) {
    const value = e.target.value;
    setSpecialization(value);
    // Optional: live filter on specialization change
    fetchDentists({ code: codeQuery, spec: value });
  }

  function onReset() {
    setCodeQuery("");
    setSpecialization("");
    fetchDentists({ code: "", spec: "" });
  }

  return (
    <div className="rc-shell">
      {/* NAVBAR (read-only page, receptionist view) */}
      <ReceptionistNav />

      <main className="rc-main">
        <div className="rc-page">
          <div className="dentist-header">
            <h1>Dentists</h1>

            {/* SEARCH BAR */}
            <form onSubmit={onSearch} className="dentist-search">
              <input
                className="dentist-search-input"
                placeholder="Search by dentist code… (e.g., Dr-0001)"
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value)}
              />

              <select
                className="dentist-search-select"
                value={specialization}
                onChange={onChangeSpec}
                disabled={loadingSpecs}
                title="Filter by specialization"
              >
                <option value="">All specializations</option>
                {specOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <button type="submit" className="dentist-search-btn">Search</button>
              <button type="button" onClick={onReset} className="dentist-reset-btn">Reset</button>
            </form>
          </div>

          {loading ? (
            <div className="dentist-loading">Loading…</div>
          ) : items.length === 0 ? (
            <div className="dentist-empty">No dentists found.</div>
          ) : (
            <div className="dentist-grid">
              {items.map((d) => (
                <article key={d._id} className="dentist-card">
                  <div className="dentist-photo">
                    <img
                      src={
                        d.avatarUrl && String(d.avatarUrl).trim()
                          ? d.avatarUrl
                          : "https://ui-avatars.com/api/?name=" +
                            encodeURIComponent(d.name || d.dentistCode || "Dr")
                      }
                      alt={d.name || d.dentistCode}
                      loading="lazy"
                    />
                  </div>

                  <div className="dentist-body">
                    <h2 className="dentist-name">{d.name || "(No name)"}</h2>

                    <p className="dentist-meta">
                      {d.dentistCode ? (
                        <span className="badge">{d.dentistCode}</span>
                      ) : null}
                      {d.specialization ? (
                        <span className="spec">{d.specialization}</span>
                      ) : null}
                    </p>

                    <p className="dentist-schedule">
                      <strong>Schedule:</strong>{" "}
                      {formatSchedule(d.availability_schedule)}
                    </p>

                    <p className="dentist-contact">
                      <strong>Phone:</strong> {d.contact_no || "—"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
