import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";
import "./dentistprofile.css";

export default function DentistProfilePage() {
  const auth = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("auth") || "{}"); } catch { return {}; }
  }, []);
  const dentistCode = auth?.dentistCode || "";
  const token = auth?.token || "";
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ contact_no: "", email: "", availability: {} });

  const fetchProfile = async () => {
    if (!dentistCode) return;
    setLoading(true);
    try {
      const dRes = await fetch(`${API_BASE}/dentists/code/${encodeURIComponent(dentistCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dData = await dRes.json();
      if (dRes.ok) {
        setProfile(dData.dentist || null);
        const userId = dData?.dentist?.userId;
        if (userId) {
          const uRes = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const uData = await uRes.json();
          if (uRes.ok) setUser(uData.users || null);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [dentistCode, token]);

  useEffect(() => {
    if (profile || user) {
      setForm({
        contact_no: user?.contact_no || "",
        email: user?.email || "",
        availability: profile?.availability_schedule || {},
      });
    }
  }, [profile, user]);

  const onSave = async () => {
    // basic client-side validations
    // 1) email format
    const email = String(form.email || '').trim();
    const emailOk = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      alert('Please enter a valid email address');
      return;
    }
    // 2) contact number max 10 digits
    const contact = String(form.contact_no || '').replace(/\D/g, '');
    if (contact.length > 10) {
      alert('Mobile number cannot exceed 10 digits');
      return;
    }
    // 3) availability time ranges validation (when editing)
    // Each entry like "09:00-12:00" must have end >= start
    const avail = form.availability || {};
    const invalidRange = Object.values(avail).some((arr) =>
      (Array.isArray(arr) ? arr : []).some((slot) => {
        const m = /^\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*$/.exec(String(slot));
        if (!m) return false; // ignore unparsable; backend may reject later
        const [_, from, to] = m;
        return to < from; // lexical works for HH:MM 24h
      })
    );
    if (invalidRange) {
      alert('In Availability, each time range must have the end time not before the start time');
      return;
    }

    try {
      // update availability
      await fetch(`${API_BASE}/dentists/code/${encodeURIComponent(dentistCode)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability_schedule: form.availability }),
      });
      // update user fields
      if (user?._id) {
        await fetch(`${API_BASE}/users/${encodeURIComponent(user._id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: form.email, contact_no: form.contact_no }),
        });
      }
      setEditing(false);
      fetchProfile();
      alert('Profile updated');
    } catch (e) {
      alert(e.message || 'Failed to update');
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem('auth'); } catch {}
    navigate('/login', { replace: true });
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2 className="profile-title">Dentist Profile</h2>
        <div className="profile-actions">
          <button
            className="profile-btn profile-btn-logout"
            onClick={handleLogout}
          >
            Log out
          </button>
          {!editing ? (
            <button 
              className="profile-btn profile-btn-primary" 
              onClick={() => setEditing(true)}
            >
              Update
            </button>
          ) : (
            <>
              <button 
                className="profile-btn profile-btn-outline" 
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button 
                className="profile-btn profile-btn-success" 
                onClick={onSave}
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="profile-loading">Loading profile...</div>
      ) : !profile ? (
        <div className="profile-empty">No profile found.</div>
      ) : (
        <div className="profile-content">
          <div className="profile-header-info">
            <h3 className="profile-name">
              {user?.name || 'Unnamed'}
              <span className="profile-code">({dentistCode})</span>
            </h3>
          </div>
          
          <div className="profile-grid">
            <div className="profile-field">
              <label className="profile-label">Email</label>
              {editing ? (
                <input 
                  className="profile-input" 
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})} 
                />
              ) : (
                <div className="profile-static">{user?.email || '-'}</div>
              )}
            </div>
            
            <div className="profile-field">
              <label className="profile-label">Contact No</label>
              {editing ? (
                <input 
                  className="profile-input" 
                  value={form.contact_no} 
                  onChange={(e) => setForm({...form, contact_no: e.target.value})} 
                />
              ) : (
                <div className="profile-static">{user?.contact_no || '-'}</div>
              )}
            </div>
            
            <div className="profile-field">
              <label className="profile-label">License No</label>
              <div className="profile-static">{profile.license_no || '-'}</div>
            </div>
            
            <div className="profile-field">
              <label className="profile-label">Specialization</label>
              <div className="profile-static">{profile.specialization || '-'}</div>
            </div>
          </div>
          
          {profile.photo?.url && (
            <div className="profile-photo">
              <img src={profile.photo.url} alt="Dentist" />
            </div>
          )}
          
          <div className="availability-section">
            <div className="availability-title">Availability</div>
            {editing ? (
              (() => {
                const order = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; 
                const avail = form.availability || {}; 
                const rows = order.map((d) => ({ day: d, times: Array.isArray(avail[d]) ? avail[d] : [] }));
                const onChangeDay = (day, value) => {
                  const parts = String(value || "").split(",").map(s => s.trim()).filter(Boolean);
                  setForm(prev => ({ ...prev, availability: { ...(prev.availability || {}), [day]: parts } }));
                };
                return (
                  <div className="availability-table-wrapper">
                    <table className="availability-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Time (comma-separated, e.g., 09:00-12:00, 13:00-17:00)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td className="availability-day">{r.day}</td>
                            <td>
                              <input
                                className="availability-time-input"
                                value={r.times.join(", ")}
                                onChange={(e) => onChangeDay(r.day, e.target.value)}
                                placeholder="e.g., 09:00-12:00, 13:00-17:00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              (() => {
                const order = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; 
                const avail = profile?.availability_schedule || {}; 
                const rows = order
                  .filter((d) => typeof avail[d] !== 'undefined')
                  .map((d) => ({ day: d, times: Array.isArray(avail[d]) ? avail[d] : [] }));
                return (
                  <div className="availability-table-wrapper">
                    <table className="availability-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="availability-empty">
                              No availability defined.
                            </td>
                          </tr>
                        ) : rows.map((r, i) => (
                          <tr key={i}>
                            <td className="availability-day">{r.day}</td>
                            <td className="availability-time">
                              {r.times.length ? r.times.join(", ") : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}