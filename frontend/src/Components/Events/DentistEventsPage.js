import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";
import "./dentisteventpage.css";

export default function EventsPage() {
  const auth = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("auth") || "{}"); } catch { return {}; }
  }, []);
  const token = auth?.token || "";

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const fetchEvents = async (q = "") => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      let url = `${API_BASE}/events?from=${today}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setEvents(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Error fetching events:", err);
      setEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(query); }, [token]);

  const fmt = (d) => d ? new Date(d).toLocaleString() : "-";

  const getEventTypeClass = (eventType) => {
    const type = eventType?.toLowerCase() || 'other';
    return `event-type ${type}`;
  };

  return (
    <div className="events-container">
      <div className="events-header">
        <h2 className="events-title">Clinic Events (Today & Upcoming)</h2>
        <div className="events-search-container">
          <input
            className="events-search-input"
            placeholder="Search by event name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') fetchEvents(query); }}
          />
          <button className="events-search-btn" onClick={() => fetchEvents(query)}>
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="events-loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="events-empty">No upcoming events found.</div>
      ) : (
        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev._id || ev.eventCode}>
                  <td>
                    <span className="event-code">{ev.eventCode}</span>
                  </td>
                  <td>
                    <span className="event-title">{ev.title}</span>
                  </td>
                  <td>
                    <span className={getEventTypeClass(ev.eventType)}>
                      {ev.eventType}
                    </span>
                  </td>
                  <td>
                    <span className="event-datetime">{fmt(ev.startDate)}</span>
                  </td>
                  <td>
                    <span className="event-datetime">{fmt(ev.endDate)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}