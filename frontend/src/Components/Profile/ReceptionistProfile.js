// src/Components/Profile/ReceptionistProfile.js
import React, { useEffect, useState } from "react";
import { API_BASE } from "../../api";
import "./receptionistprofile.css";

export default function ReceptionistProfile() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact_no: "",
    role: "Receptionist",
    receptionistCode: "",
    deskNo: "",
    password: "********", // display only
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("token") || "";

  async function fetchMe() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/receptionist/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);

      // Try to show receptionistCode if present in localStorage user
      let code = "";
      try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        code = u?.receptionistCode || "";
      } catch {}

      setForm((prev) => ({
        ...prev,
        name: j.user?.name || "",
        email: j.user?.email || "",
        contact_no: j.user?.contact_no || "",
        role: j.user?.role || "Receptionist",
        receptionistCode: code,
        deskNo: j.receptionist?.deskNo || "",
        password: j.user?.password || "********", // masked by backend
      }));
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMe(); }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
  e.preventDefault();
  
  // ADD THESE LINES
  if (form.contact_no && !/^\d{10}$/.test(form.contact_no)) {
    setMsg("❌ Contact number must be exactly 10 digits");
    return;
  }
  
  setSaving(true);
  setMsg("");
    try {
      const res = await fetch(`${API_BASE}/receptionist/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          contact_no: form.contact_no,
        }),
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);

      // update localStorage user (name/email in sidebar etc.)
      try {
        const u = JSON.parse(localStorage.getItem("user") || "null") || {};
        const updated = { ...u, name: j.user?.name, email: j.user?.email };
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("auth:changed"));
      } catch {}

      // keep masked password in state
      setForm((prev) => ({ ...prev, password: j.user?.password || "********" }));
      setMsg("✅ Profile updated");
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rc-prof-wrap"><div className="rc-prof-card">Loading…</div></div>;

  return (
    <div className="rc-prof-wrap">
      <form className="rc-prof-card" onSubmit={onSubmit}>
        <h2>My Profile</h2>

        {!!form.receptionistCode && (
  <div className="rc-prof-row">
    <label>Receptionist Code</label>
    <input type="text" value={form.receptionistCode} disabled />
  </div>
)}

{/* ADD THIS SECTION */}
{!!form.deskNo && (
  <div className="rc-prof-row">
    <label>Desk No</label>
    <input type="text" value={form.deskNo} disabled />
  </div>
)}

<div className="rc-prof-row">
  <label>Name</label>
          <input name="name" value={form.name} onChange={onChange} required />
        </div>

        <div className="rc-prof-row">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={onChange} required />
        </div>

        <div className="rc-prof-row">
          <label>Contact No</label>
          <input name="contact_no" value={form.contact_no} onChange={onChange} placeholder="+94…" />
        </div>

        <div className="rc-prof-row">
          <label>Role</label>
          <input value={form.role || "Receptionist"} disabled />
        </div>

        {/* NEW: read-only password field */}
        <div className="rc-prof-row">
          <label>Password</label>
          <input type="password" value={form.password || "********"} disabled />
        </div>

        {msg && <div className="rc-prof-msg">{msg}</div>}

        <div className="rc-prof-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
