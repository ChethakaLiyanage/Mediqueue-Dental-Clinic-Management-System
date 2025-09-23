import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";
import "./dentistschedulepage.css";

export default function DentistSchedulesPage() {
  const auth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "{}");
    } catch {
      return {};
    }
  }, []);
  const token = auth?.token || "";
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // fetch schedules
  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/schedules/today`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setItems([]);
    }
    setLoading(false);
  };

  // fetch clinic events
  const fetchEvents = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/events?from=${today}&to=${today}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setEvents(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Error fetching events:", err);
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchEvents();
  }, [token]);

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const fmtTime = (d) =>
    d
      ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "-";

  // check if schedule is blocked by an event
  const getBlockedEvent = (date) => {
    const slotTime = new Date(date);
    return events.find((ev) => {
      const start = new Date(ev.startDate);
      const end = new Date(ev.endDate);
      return slotTime >= start && slotTime <= end;
    });
  };

  const hasSlots = (item) => {
    if (!item) return false;
    // treat non-empty string or positive number as available slots
    if (typeof item.slots === 'number') return item.slots > 0;
    if (typeof item.slots === 'string') return item.slots.trim() !== '' && item.slots.trim() !== '-';
    if (Array.isArray(item.slots)) return item.slots.length > 0;
    return false;
  };

  const getStatusClass = (item, blockedEvent) => {
    if (item.onLeave) return "status-on-leave";
    if (blockedEvent) return "status-event-blocked";
    if (!hasSlots(item)) return "status-non-available";
    return "status-available";
  };

  const getStatusText = (item, blockedEvent) => {
    if (item.onLeave) return "On leave";
    if (blockedEvent) return "Blocked";
    if (!hasSlots(item)) return "Non-available";
    return "Available";
  };

  return (
    <div className="schedules-container">
      <div className="schedules-header">
        <h2 className="schedules-title">Today's Schedules</h2>
        <div className="schedules-actions">
          <input
            className="schedules-search-input"
            placeholder="Search by dentist name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="schedules-refresh-btn" onClick={fetchToday}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="schedules-loading">Loading schedules...</div>
      ) : items.length === 0 ? (
        <div className="schedules-empty">No schedules available today</div>
      ) : (
        <div className="schedules-table-wrapper">
          <table className="schedules-table">
            <thead>
              <tr>
                <th>Dentist Code</th>
                <th>Dentist Name</th>
                <th>Available Slot</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(
                  (it) =>
                    !query ||
                    String(it.dentistName || "")
                      .toLowerCase()
                      .includes(query.toLowerCase())
                )
                .map((it, i) => {
                  const ev = getBlockedEvent(it.date);
                  return (
                    <tr key={i}>
                      <td>
                        <span className="dentist-code">{it.dentistCode}</span>
                      </td>
                      <td>
                        <span className="dentist-name">{it.dentistName || "-"}</span>
                      </td>
                      <td>
                        {ev ? (
                          <span className="blocked-slot">
                            Blocked ({fmtTime(ev.startDate)}–{fmtTime(ev.endDate)})
                          </span>
                        ) : (
                          <span className="available-slot">{hasSlots(it) ? it.slots : "-"}</span>
                        )}
                      </td>
                      <td>
                        <span className="schedule-date">{fmtDate(it.date)}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(it, ev)}`}>
                          {getStatusText(it, ev)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}