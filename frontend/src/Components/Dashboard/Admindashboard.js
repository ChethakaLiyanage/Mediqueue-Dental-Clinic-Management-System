import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";

const URL = "http://localhost:5000/users";

const fetchUsers = async () => {
  try {
    const res = await axios.get(URL);
    return res.data;
  } catch (err) {
    console.error("Error fetching users:", err);
    return { users: [] };
  }
};

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  // Get admin info from localStorage auth
  const auth = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth') || '{}');
    } catch {
      return {};
    }
  }, []);
  
  const loggedInAdmin = auth?.user || null;
  const adminCode = auth?.adminCode || '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then((data) => {
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
      }
      setLoading(false);
    });
  }, []);

  const handleAddStaff = (staffType) => {
    // Navigate to staff management with add modal
    window.location.href = '/admin/staff';
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    navigate("/login");
  };

  return (
    <div className="admin-dashboard-content">
      {/* Admin Details Section */}
      <div className="admin-details-section">
        <h2>Administrator Information</h2>
        {loggedInAdmin ? (
          <div className="admin-card">
            <div className="admin-info-grid">
              <div className="admin-info-item">
                <div className="admin-info-label">Name</div>
                <div className="admin-info-value">{loggedInAdmin.name}</div>
              </div>
              <div className="admin-info-item">
                <div className="admin-info-label">Email</div>
                <div className="admin-info-value">{loggedInAdmin.email}</div>
              </div>
              <div className="admin-info-item">
                <div className="admin-info-label">Role</div>
                <div className="admin-info-value">
                  <span className="role-badge admin">{loggedInAdmin.role}</span>
                </div>
              </div>
              {adminCode && (
                <div className="admin-info-item">
                  <div className="admin-info-label">Admin Code</div>
                  <div className="admin-info-value">
                    <span className="admin-code">{adminCode}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p>No admin info available.</p>
        )}
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Staff</h3>
          <p className="stat-number">{users.filter(u => u.role !== 'Patient' && u.role !== 'patient').length}</p>
          <p className="stat-description">Active staff members</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Patients</h3>
          <p className="stat-number">{users.filter(u => u.role === 'Patient' || u.role === 'patient').length}</p>
          <p className="stat-description">Registered patients</p>
        </div>
        
        <div className="stat-card">
          <h3>Appointments Today</h3>
          <p className="stat-number">18</p>
          <p className="stat-description">Scheduled for today</p>
        </div>
        
        <div className="stat-card">
          <h3>New Messages</h3>
          <p className="stat-number">5</p>
          <p className="stat-description">Unread messages</p>
        </div>
      </div>

      {/* Add Staff Section */}
      <div className="add-staff-section">
        <h2>Add Staff Members</h2>
        <div className="staff-buttons">
          <button className="staff-btn dentist-btn" onClick={() => handleAddStaff("dentist")}>
            <div className="staff-btn-icon">🦷</div>
            <div className="staff-btn-text">Add Dentist</div>
          </button>
          <button className="staff-btn admin-btn" onClick={() => handleAddStaff("admin")}>
            <div className="staff-btn-icon">👨‍💼</div>
            <div className="staff-btn-text">Add Admin</div>
          </button>
          <button className="staff-btn receptionist-btn" onClick={() => handleAddStaff("receptionist")}>
            <div className="staff-btn-icon">📋</div>
            <div className="staff-btn-text">Add Receptionist</div>
          </button>
          <button className="staff-btn manager-btn" onClick={() => handleAddStaff("manager")}>
            <div className="staff-btn-icon">📊</div>
            <div className="staff-btn-text">Add Manager</div>
          </button>
        </div>
      </div>

      {/* Recent Users */}
      <div className="recent-users">
        <h2>Recent System Users</h2>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.slice(0, 10).map((user, idx) => (
                    <tr key={idx}>
                      <td>{user.name}</td>
                      <td>{user.gmail || user.email}</td>
                      <td>
                        <span className={`role-badge ${(user.role || 'user').toLowerCase()}`}>
                          {user.role || 'User'}
                        </span>
                      </td>
                      <td>
                        <span className={user.isActive !== false ? 'status-active' : 'status-inactive'}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-inline">
                          <button className="action-btn view-btn">View</button>
                          <button className="action-btn edit-btn">Edit</button>
                          <button className="action-btn delete-btn">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
