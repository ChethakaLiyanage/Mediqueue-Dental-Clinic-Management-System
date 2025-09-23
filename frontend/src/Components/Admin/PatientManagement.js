import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PatientManagement.css';

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    registered: 0,
    unregistered: 0,
    active: 0,
    temporary: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    patientType: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });


  // Fetch patients on component mount and filter changes
  useEffect(() => {
    fetchPatients();
  }, [filters]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      if (filters.patientType !== 'all') {
        queryParams.append('patientType', filters.patientType);
      }
      if (filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      queryParams.append('sortBy', filters.sortBy);
      queryParams.append('sortOrder', filters.sortOrder);

      const response = await axios.get(
        `http://localhost:5000/admin/patient-management/all?${queryParams.toString()}`
      );

      if (response.data.success) {
        setPatients(response.data.patients);
        setFilteredPatients(response.data.patients);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const searchValue = e.target.value;
    setFilters(prev => ({ ...prev, search: searchValue }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };


  const handlePromotePatient = async (patient) => {
    if (patient.patientType !== 'unregistered') {
      alert('Only unregistered patients can be promoted.');
      return;
    }

    try {
      // This would need a user selection modal in a real implementation
      const userId = prompt('Enter User ID to link this patient to:');
      if (!userId) return;

      await axios.put(
        `http://localhost:5000/admin/patient-management/promote/${patient.id}`,
        { userId }
      );
      
      // Refresh the patient list
      fetchPatients();
      alert('Patient promoted to registered status successfully!');
    } catch (error) {
      console.error('Error promoting patient:', error);
      alert('Failed to promote patient. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      patientType: 'all',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  if (loading) {
    return (
      <div className="patient-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-management">
      {/* Header */}
      <div className="page-header">
        <h1>Patient Management</h1>
        <p>Manage all registered and unregistered patients in the system</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Patients</p>
          </div>
        </div>
        <div className="stat-card registered">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.registered}</h3>
            <p>Registered</p>
          </div>
        </div>
        <div className="stat-card unregistered">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.unregistered}</h3>
            <p>Unregistered</p>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <h3>{stats.active}</h3>
            <p>Active</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-group">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={handleSearchChange}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Patient Type:</label>
            <select
              value={filters.patientType}
              onChange={(e) => handleFilterChange('patientType', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="registered">Registered</option>
              <option value="unregistered">Unregistered</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="createdAt">Date Added</option>
              <option value="name">Name</option>
              <option value="updatedAt">Last Updated</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order:</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          {(filters.search || filters.patientType !== 'all' || filters.status !== 'all') && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>


      {/* Patients Table */}
      <div className="table-container">
        <table className="patients-table">
          <thead>
            <tr>
              <th>Patient Code</th>
              <th>Name</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Status</th>
              <th>Age</th>
              <th>Registered By</th>
              <th>Date Added</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map(patient => (
                <tr key={patient.id}>
                  <td>
                    <span className="patient-code">{patient.patientCode}</span>
                  </td>
                  <td>
                    <div className="patient-name">
                      <span className="name">{patient.name}</span>
                      {patient.gender && (
                        <span className="gender">({patient.gender})</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {patient.email ? (
                      <a href={`mailto:${patient.email}`} className="email-link">
                        {patient.email}
                      </a>
                    ) : (
                      <span className="no-data">No email</span>
                    )}
                  </td>
                  <td>
                    {patient.phone ? (
                      <a href={`tel:${patient.phone}`} className="phone-link">
                        {patient.phone}
                      </a>
                    ) : (
                      <span className="no-data">No phone</span>
                    )}
                  </td>
                  <td>
                    <span className={`patient-type-badge ${patient.patientType}`}>
                      {patient.patientType === 'registered' ? 'Registered' : 'Unregistered'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${patient.status.toLowerCase()}`}>
                      {patient.status}
                    </span>
                  </td>
                  <td>
                    {patient.age ? (
                      <span className="age-info">{patient.age} years</span>
                    ) : (
                      <span className="no-data">Unknown</span>
                    )}
                  </td>
                  <td>
                    {patient.registeredBy ? (
                      <div className="registered-by">
                        <span className="name">{patient.registeredBy}</span>
                        {patient.registeredByCode && (
                          <span className="code">({patient.registeredByCode})</span>
                        )}
                      </div>
                    ) : (
                      <span className="no-data">System</span>
                    )}
                  </td>
                  <td>
                    <span className="date-info" title={formatDateTime(patient.createdAt)}>
                      {formatDate(patient.createdAt)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data-row">
                  {filters.search || filters.patientType !== 'all' || filters.status !== 'all' 
                    ? 'No patients found matching your filters' 
                    : 'No patients found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default PatientManagement;
