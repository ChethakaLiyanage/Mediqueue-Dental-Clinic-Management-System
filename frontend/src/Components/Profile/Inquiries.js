import React, { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { Link } from 'react-router-dom';
import './inquiries.css';

const Inquiries = () => {
  const { token } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInquiries = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/inquiries?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInquiries(data.inquiries);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.pages);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch inquiries');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inquiries/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInquiries();
      fetchStats();
    }
  }, [token]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'status-open';
      case 'in_progress': return 'status-progress';
      case 'resolved': return 'status-resolved';
      default: return 'status-open';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (page) => {
    fetchInquiries(page);
  };

  if (loading && inquiries.length === 0) {
    return (
      <div className="inquiries-container">
        <div className="loading">Loading your inquiries...</div>
      </div>
    );
  }

  return (
    <div className="inquiries-container">
      <div className="inquiries-header">
        <h1>My Inquiries</h1>
        <Link to="/profile/inquiries/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> New Inquiry
        </Link>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Inquiries</div>
        </div>
        <div className="stat-card open">
          <div className="stat-number">{stats.open}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card progress">
          <div className="stat-number">{stats.in_progress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-number">{stats.resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="inquiries-list">
        {inquiries.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-question-circle"></i>
            <h3>No inquiries yet</h3>
            <p>You haven't submitted any inquiries. Create your first inquiry to get help from our team.</p>
            <Link to="/profile/inquiries/new" className="btn btn-primary">
              Create First Inquiry
            </Link>
          </div>
        ) : (
          inquiries.map((inquiry) => (
            <div key={inquiry._id} className="inquiry-card">
              <div className="inquiry-header">
                <div className="inquiry-code">#{inquiry.inquiryCode}</div>
                <div className={`inquiry-status ${getStatusColor(inquiry.status)}`}>
                  {inquiry.status.replace('_', ' ')}
                </div>
              </div>
              
              <div className="inquiry-content">
                <h3 className="inquiry-subject">{inquiry.subject}</h3>
                <p className="inquiry-message">{inquiry.message}</p>
                
                <div className="inquiry-meta">
                  <div className="inquiry-date">
                    <i className="fas fa-clock"></i>
                    Created: {formatDate(inquiry.createdAt)}
                  </div>
                  {inquiry.responses && inquiry.responses.length > 0 && (
                    <div className="inquiry-responses">
                      <i className="fas fa-reply"></i>
                      {inquiry.responses.length} response{inquiry.responses.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="inquiry-actions">
                <Link 
                  to={`/profile/inquiries/${inquiry._id}`} 
                  className="btn btn-outline"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn btn-outline"
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="btn btn-outline"
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default Inquiries;
