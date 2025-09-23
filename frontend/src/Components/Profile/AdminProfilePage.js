import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";
import "./adminprofile.css";

export default function AdminProfilePage() {
  const auth = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("auth") || "{}"); } catch { return {}; }
  }, []);
  const adminCode = auth?.adminCode || "";
  const token = auth?.token || "";
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    contact_no: "", 
    permission: [],
    isActive: true 
  });

  const fetchProfile = async () => {
    if (!adminCode) return;
    setLoading(true);
    try {
      // Fetch admin profile by adminCode
      const adminRes = await fetch(`${API_BASE}/admin/code/${encodeURIComponent(adminCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const adminData = await adminRes.json();
      
      if (adminRes.ok && adminData.admin) {
        setProfile(adminData.admin);
        const userId = adminData.admin.userId;
        
        if (userId) {
          // Fetch user details
          const userRes = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = await userRes.json();
          if (userRes.ok) {
            setUser(userData.users || userData.user || null);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchProfile(); 
  }, [adminCode, token]);

  useEffect(() => {
    if (profile && user) {
      setForm({
        name: user?.name || "",
        email: user?.email || user?.gmail || "",
        contact_no: user?.contact_no || user?.phone || "",
        permission: profile?.permission || [],
        isActive: user?.isActive !== false
      });
    }
  }, [profile, user]);

  const onSave = async () => {
    // Basic client-side validations
    const email = String(form.email || '').trim();
    const emailOk = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      alert('Please enter a valid email address');
      return;
    }

    const contact = String(form.contact_no || '').replace(/\D/g, '');
    if (contact.length > 10) {
      alert('Mobile number cannot exceed 10 digits');
      return;
    }

    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      // Update user information
      if (user?._id) {
        await fetch(`${API_BASE}/users/${encodeURIComponent(user._id)}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            name: form.name,
            email: form.email,
            contact_no: form.contact_no,
            isActive: form.isActive
          }),
        });
      }

      // Update admin permissions if needed
      if (profile?._id) {
        await fetch(`${API_BASE}/admin/${encodeURIComponent(profile._id)}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            permission: form.permission 
          }),
        });
      }

      setEditing(false);
      fetchProfile();
      alert('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleLogout = () => {
    try { 
      localStorage.removeItem('auth'); 
    } catch (error) {
      console.error("Error during logout:", error);
    }
    navigate('/login', { replace: true });
  };

  const handlePermissionChange = (permission) => {
    setForm(prev => ({
      ...prev,
      permission: prev.permission.includes(permission)
        ? prev.permission.filter(p => p !== permission)
        : [...prev.permission, permission]
    }));
  };

  const availablePermissions = [
    'manage_users',
    'manage_staff', 
    'manage_appointments',
    'manage_patients',
    'view_reports',
    'system_settings',
    'audit_logs',
    'full_access'
  ];

  return (
    <div className="admin-profile-container">
      <div className="admin-profile-header">
        <div className="admin-profile-title-section">
          <h2 className="admin-profile-title">Admin Profile</h2>
          {!loading && profile && (
            <div className="admin-profile-info-card">
              <div className="admin-profile-avatar">
                <span className="admin-profile-avatar-icon">👤</span>
              </div>
              <div className="admin-profile-basic-info">
                <h3 className="admin-profile-name">
                  Admin {user?.name || 'Unknown'}
                </h3>
                <p className="admin-profile-code">Code: {adminCode}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="admin-profile-actions">
          <button
            className="admin-profile-btn admin-profile-btn-logout"
            onClick={handleLogout}
          >
            Log out
          </button>
          {!editing ? (
            <button 
              className="admin-profile-btn admin-profile-btn-primary" 
              onClick={() => setEditing(true)}
              disabled={loading || !profile}
            >
              Update
            </button>
          ) : (
            <>
              <button 
                className="admin-profile-btn admin-profile-btn-outline" 
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button 
                className="admin-profile-btn admin-profile-btn-success" 
                onClick={onSave}
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="admin-profile-loading">Loading profile...</div>
      ) : !profile ? (
        <div className="admin-profile-empty">No profile found.</div>
      ) : (
        <div className="admin-profile-content">
          <div className="admin-profile-grid">
            <div className="admin-profile-field">
              <label className="admin-profile-label">Full Name *</label>
              {editing ? (
                <input 
                  className="admin-profile-input" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Enter full name"
                  required
                />
              ) : (
                <div className="admin-profile-static">{user?.name || '-'}</div>
              )}
            </div>
            
            <div className="admin-profile-field">
              <label className="admin-profile-label">Email Address *</label>
              {editing ? (
                <input 
                  className="admin-profile-input" 
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="Enter email address"
                />
              ) : (
                <div className="admin-profile-static">{user?.email || user?.gmail || '-'}</div>
              )}
            </div>
            
            <div className="admin-profile-field">
              <label className="admin-profile-label">Contact Number</label>
              {editing ? (
                <input 
                  className="admin-profile-input" 
                  value={form.contact_no} 
                  onChange={(e) => setForm({...form, contact_no: e.target.value})}
                  placeholder="Enter contact number"
                  maxLength="10"
                />
              ) : (
                <div className="admin-profile-static">{user?.contact_no || user?.phone || '-'}</div>
              )}
            </div>

            <div className="admin-profile-field">
              <label className="admin-profile-label">Role</label>
              <div className="admin-profile-static">
                <span className="admin-role-badge">Admin</span>
              </div>
              <small className="admin-profile-note">Role cannot be changed after creation</small>
            </div>
          </div>

          <div className="admin-profile-section">
            <h3 className="admin-profile-section-title">Permission Level</h3>
            {editing ? (
              <div className="admin-permission-grid">
                {availablePermissions.map(permission => (
                  <label key={permission} className="admin-permission-item">
                    <input
                      type="checkbox"
                      checked={form.permission.includes(permission)}
                      onChange={() => handlePermissionChange(permission)}
                    />
                    <span className="admin-permission-label">
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="admin-permission-display">
                {profile?.permission && profile.permission.length > 0 ? (
                  <div className="admin-permission-tags">
                    {profile.permission.map(perm => (
                      <span key={perm} className="admin-permission-tag">
                        {perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="admin-profile-static">No specific permissions set</div>
                )}
              </div>
            )}
          </div>

          <div className="admin-profile-section">
            <h3 className="admin-profile-section-title">Active Status</h3>
            {editing ? (
              <label className="admin-status-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({...form, isActive: e.target.checked})}
                />
                <span className="admin-status-label">Active Status</span>
                <small className="admin-profile-note">Inactive users cannot log in to the system</small>
              </label>
            ) : (
              <div className="admin-status-display">
                <span className={`admin-status-badge ${user?.isActive !== false ? 'active' : 'inactive'}`}>
                  {user?.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            )}
          </div>

          <div className="admin-profile-section">
            <h3 className="admin-profile-section-title">Current Role Information</h3>
            <div className="admin-role-info">
              <div className="admin-role-item">
                <span className="admin-role-label">ROLE:</span>
                <span className="admin-role-value admin-role-badge-large">ADMIN</span>
              </div>
              <div className="admin-role-item">
                <span className="admin-role-label">ADMIN CODE:</span>
                <span className="admin-role-value admin-code-badge">{adminCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}