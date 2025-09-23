import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddStaffModal from './AddStaffModal';
import EditStaffModal from './EditStaffModal';
import './StaffManagement.css';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get auth token
  const getAuthToken = () => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      return auth.token;
    } catch {
      return null;
    }
  };

  // Fetch all staff
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const config = {};
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }
      
      const response = await axios.get(
        `http://localhost:5000/admin/staff${filterRole ? `?role=${filterRole}` : ''}`,
        config
      );
      setStaff(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch staff members';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [filterRole]);

  // Handle delete staff
  const handleDelete = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = getAuthToken();
      await axios.delete(`http://localhost:5000/admin/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Staff member deleted successfully');
      fetchStaff(); // Refresh the list
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    }
  };

  // Handle edit staff
  const handleEdit = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowEditModal(true);
  };

  // Filter staff based on search term
  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get role-specific info
  const getRoleInfo = (member) => {
    if (!member.roleData) return 'N/A';
    
    switch (member.role) {
      case 'Dentist':
        return `License: ${member.roleData.license_no || 'N/A'}, Specialization: ${member.roleData.specialization || 'General'}`;
      case 'Admin':
        return `Permission: ${member.roleData.permission || 'N/A'}, Code: ${member.roleData.adminCode || 'N/A'}`;
      case 'Manager':
        return `Department: ${member.roleData.department || 'N/A'}, Code: ${member.roleData.managerCode || 'N/A'}`;
      case 'Receptionist':
        return `Desk: ${member.roleData.deskNo || 'N/A'}, Code: ${member.roleData.receptionistCode || 'N/A'}`;
      default:
        return 'N/A';
    }
  };

  return (
    <div className="staff-management">
      <div className="staff-header">
        <h1>Staff Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Staff Member
        </button>
      </div>

      {/* Staff Statistics */}
      <div className="staff-stats-grid">
        <div className="stat-card total-staff">
          <div className="stat-label">TOTAL STAFF</div>
          <div className="stat-number">{staff.length}</div>
        </div>
        <div className="stat-card dentists">
          <div className="stat-label">DENTISTS</div>
          <div className="stat-number">{staff.filter(s => s.role === 'Dentist').length}</div>
        </div>
        <div className="stat-card admins">
          <div className="stat-label">ADMINS</div>
          <div className="stat-number">{staff.filter(s => s.role === 'Admin').length}</div>
        </div>
        <div className="stat-card managers">
          <div className="stat-label">MANAGERS</div>
          <div className="stat-number">{staff.filter(s => s.role === 'Manager').length}</div>
        </div>
        <div className="stat-card receptionists">
          <div className="stat-label">RECEPTIONISTS</div>
          <div className="stat-number">{staff.filter(s => s.role === 'Receptionist').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="staff-filters">
        <div className="filter-group">
          <label>Filter by Role:</label>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="Dentist">Dentist</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Receptionist">Receptionist</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="staff-table-container">
        {loading ? (
          <div className="loading-state">
            <p>Loading staff members...</p>
          </div>
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Role Details</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((member) => (
                  <tr key={member._id}>
                    <td>
                      {member.role === 'Dentist' && member.roleData?.photo?.url ? (
                        <img 
                          src={member.roleData.photo.url} 
                          alt={`${member.name}`}
                          className="staff-photo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="staff-photo-placeholder" 
                        style={{ display: member.role === 'Dentist' && member.roleData?.photo?.url ? 'none' : 'flex' }}
                      >
                        {member.role === 'Dentist' ? '👨‍⚕️' : '👤'}
                      </div>
                    </td>
                    <td className="staff-name">{member.name}</td>
                    <td>{member.email}</td>
                    <td>
                      <span className={`role-badge ${member.role.toLowerCase()}`}>
                        {member.role}
                      </span>
                    </td>
                    <td>{member.contact_no || 'N/A'}</td>
                    <td className="role-details">{getRoleInfo(member)}</td>
                    <td>
                      <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-edit"
                          onClick={() => handleEdit(member)}
                          title="Edit Staff Member"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-sm btn-delete"
                          onClick={() => handleDelete(member._id, member.name)}
                          title="Delete Staff Member"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    {searchTerm || filterRole ? 'No staff members match your criteria' : 'No staff members found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>


      {/* Modals */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            // Add a small delay to ensure database is updated
            setTimeout(() => {
              fetchStaff();
            }, 500);
          }}
        />
      )}

      {showEditModal && selectedStaff && (
        <EditStaffModal
          staff={selectedStaff}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedStaff(null);
            fetchStaff();
          }}
        />
      )}
    </div>
  );
};

export default StaffManagement;
