// src/Components/Leaves/ReceptionistLeave.js
import React, { useEffect, useState } from "react";
import "./receptionistleave.css";

export default function ReceptionistLeave() {
  const [dentists, setDentists] = useState([]);
  const [dentistCode, setDentistCode] = useState("");
  const [dentistName, setDentistName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [errorMessage, setErrorMessage] = useState(""); // ✅ new

  // ✅ Fetch dentists
  useEffect(() => {
    fetch("http://localhost:5000/receptionist/dentists", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setDentists(data.items || []))
      .catch((err) => console.error("Error fetching dentists", err));
  }, []);

  // ✅ Fetch leaves
  useEffect(() => {
    fetch("http://localhost:5000/receptionist/leaves", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) {
          setErrorMessage(data.message || "Failed to load leaves");
        } else {
          setLeaves(data.items || data || []);
        }
      })
      .catch((err) => console.error("Error fetching leaves", err));
  }, []);

  const handleAddLeave = () => {
    if (!dentistCode || !dateFrom || !dateTo) {
      setErrorMessage("Please fill all required fields");
      return;
    }

    fetch("http://localhost:5000/receptionist/leaves", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        dentistCode,
        dentistName,
        dateFrom,
        dateTo,
        reason,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) {
          setErrorMessage(data.message || "Failed to add leave"); // 🔴 show error inline
          return;
        }
        setLeaves([...leaves, data.leave || data]);
        setDentistCode("");
        setDentistName("");
        setDateFrom("");
        setDateTo("");
        setReason("");
        setErrorMessage(""); // ✅ clear error on success
      })
      .catch((err) => {
        console.error("Error adding leave", err);
        setErrorMessage("Something went wrong while adding leave");
      });
  };

  const handleDeleteLeave = (id) => {
    if (!window.confirm("Are you sure you want to delete this leave?")) return;

    fetch(`http://localhost:5000/receptionist/leaves/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) {
          setErrorMessage(data.message || "Failed to delete leave");
          return;
        }
        setLeaves(leaves.filter((l) => l._id !== id));
      })
      .catch((err) => console.error("Error deleting leave", err));
  };

  return (
    <div className="leave-page">
      <h2>Dentist Leaves</h2>

      <div className="leave-form">
        <select
          value={dentistCode}
          onChange={(e) => {
            setDentistCode(e.target.value);
            const selected = dentists.find(
              (d) => d.dentistCode === e.target.value
            );
            if (selected) setDentistName(selected.name || "");
          }}
        >
          <option value="">-- Select Dentist Code --</option>
          {dentists.map((d) => (
            <option key={d._id} value={d.dentistCode}>
              {d.dentistCode}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Dentist Name"
          value={dentistName}
          readOnly
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button onClick={handleAddLeave}>Add Leave</button>
      </div>

      {/* 🔴 Show inline error message */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <table className="leave-table">
        <thead>
          <tr>
            <th>Dentist Code</th>
            <th>Dentist Name</th>
            <th>Date From</th>
            <th>Date To</th>
            <th>Reason</th>
            <th>Created By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaves.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center" }}>
                No leaves found.
              </td>
            </tr>
          ) : (
            leaves.map((l) => (
              <tr key={l._id}>
                <td>{l.dentistCode}</td>
                <td>{l.dentistName}</td>
                <td>{new Date(l.dateFrom).toLocaleDateString()}</td>
                <td>{new Date(l.dateTo).toLocaleDateString()}</td>
                <td>{l.reason}</td>
                <td>{l.createdBy}</td>
                <td>
                  <button onClick={() => handleDeleteLeave(l._id)}>❌</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
