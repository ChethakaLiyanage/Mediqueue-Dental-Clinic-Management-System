import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./Dentistdashboard.css";

const API = "http://localhost:5000";

function formatDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardMetrics() {
  const auth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "{}");
    } catch {
      return {};
    }
  }, []);

  const dentistCode = auth?.dentistCode;
  const [todayCount, setTodayCount] = useState(0);
  const [plansCount, setPlansCount] = useState(0);
  const [rxCount, setRxCount] = useState(0);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const sameDay = (a, b) => {
    if (!a || !b) return false;
    const ad = new Date(a), bd = new Date(b);
    return ad.getFullYear() === bd.getFullYear() && ad.getMonth() === bd.getMonth() && ad.getDate() === bd.getDate();
  };

  // Load today's queue + other metrics
  useEffect(() => {
    if (!dentistCode) return;
    
    const loadData = async () => {
      setLoading(true);
      const today = formatDateOnly(new Date());
      console.log("Loading data for date:", today, "dentistCode:", dentistCode);

      try {
        // Get today's queue from dentist-queue API
        const queueRes = await axios.get(`${API}/api/dentist-queue/today`, { 
          params: { dentistCode, date: today } 
        });
        console.log("Queue response:", queueRes.data);
        
        const list = Array.isArray(queueRes.data) ? queueRes.data : [];
        const todayOnly = list.filter(row => {
          const d = row.appointment_date || row.date;
          return d ? sameDay(d, today) : false;
        });
        setTodayCount(todayOnly.length);
        setQueue(todayOnly);

        // Treatment plans
        const plansRes = await axios.get(`${API}/treatmentplans`);
        const items = (plansRes.data?.treatmentplans || []).filter(
          (p) => p.dentistCode === dentistCode && p.isDeleted !== true
        );
        setPlansCount(items.length);

        // Prescriptions
        const rxRes = await axios.get(`${API}/prescriptions`);
        const rxItems = (rxRes.data?.prescriptions || rxRes.data?.items || []).filter(
          (r) => r.dentistCode === dentistCode && r.isActive !== false
        );
        setRxCount(rxItems.length);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setQueue([]);
        setTodayCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dentistCode]);

  // Handle status change
  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/api/dentist-queue/update/${id}`, {
        status: newStatus,
        dentistCode,
      });
      setQueue((prev) =>
        prev.map((q) => (q._id === id ? { ...q, status: newStatus } : q))
      );
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update patient status");
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top metrics cards */}
      <div className="metrics-grid">
        <MetricCard title="Today's Patients" value={todayCount} type="patients" />
        <MetricCard title="Treatment Plans" value={plansCount} type="treatment-plans" />
        <MetricCard title="Prescriptions" value={rxCount} type="prescriptions" />
      </div>

      {/* Queue table */}
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">
            Patient Queue - {formatDateOnly(new Date())}
          </h3>
          {loading && <span className="loading-text">Loading...</span>}
        </div>
        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Queue No</th>
                <th>Patient Code</th>
                <th>Patient Name</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((a) => (
                <tr key={a._id}>
                  <td>{a.queueNo || a.queue_number || "-"}</td>
                  <td>{a.patientCode || a.patient_code || "-"}</td>
                  <td>{a.patientName || a.patient_name || "-"}</td>
                  <td>
                    {a.appointment_date || a.date ? 
                      new Date(a.appointment_date || a.date).toLocaleTimeString(
                        [], { hour: "2-digit", minute: "2-digit" }
                      ) : "-"
                    }
                  </td>
                  <td>{a.reason || "-"}</td>
                  <td>
                    <StatusPill value={a.status} />
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={a.status || "waiting"}
                      onChange={(e) =>
                        handleStatusChange(a._id, e.target.value)
                      }
                    >
                      <option value="waiting">Waiting</option>
                      <option value="called">Called</option>
                      <option value="in_treatment">In Treatment</option>
                      <option value="completed">Completed</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No patients in queue today ({formatDateOnly(new Date())})
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Metric card component
function MetricCard({ title, value, type }) {
  return (
    <div className={`metric-card ${type}`}>
      <div className="metric-indicator" />
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

// Colored pill for statuses
function StatusPill({ value }) {
  const statusClass = {
    waiting: "status-waiting",
    called: "status-called",
    in_treatment: "status-in-treatment",
    completed: "status-completed",
    no_show: "status-no-show",
  }[value] || "status-unknown";

  const statusText = {
    waiting: "Waiting",
    called: "Called",
    in_treatment: "In Treatment",
    completed: "Completed",
    no_show: "No Show",
  }[value] || value || "Unknown";

  return (
    <span className={`status-pill ${statusClass}`}>
      {statusText}
    </span>
  );
}