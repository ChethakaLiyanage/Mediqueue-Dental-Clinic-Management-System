import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import './adminfeedback.css';

// Base API URL
const API_URL = 'http://localhost:5000/feedbacks';

const AdminFeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await axios.get(API_URL);
      console.log('API Response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        // If the response is an array directly
        const formattedFeedbacks = response.data.map(fb => ({
          _id: fb._id,
          patientName: fb.user?.name || 'Anonymous',
          message: fb.comment || 'No comment provided',
          rating: fb.rating || 0,
          createdAt: fb.submitted_date || new Date().toISOString(),
          reply: fb.reply || '',
          repliedAt: fb.repliedAt || null
        }));
        setFeedbacks(formattedFeedbacks);
      } else if (response.data && response.data.feedbacks && Array.isArray(response.data.feedbacks)) {
        // If the response is { feedbacks: [...] }
        const formattedFeedbacks = response.data.feedbacks.map(fb => ({
          _id: fb._id,
          patientName: fb.user?.name || 'Anonymous',
          message: fb.comment || 'No comment provided',
          rating: fb.rating || 0,
          createdAt: fb.submitted_date || new Date().toISOString(),
          reply: fb.reply || '',
          repliedAt: fb.repliedAt || null
        }));
        setFeedbacks(formattedFeedbacks);
      } else {
        console.warn('Unexpected API response format:', response.data);
        setFeedbacks([]);
        setError('Unexpected data format received from server');
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load feedbacks. Please try again later.';
      setError(errorMessage);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (feedbackId) => {
    setReplyingTo(replyingTo === feedbackId ? null : feedbackId);
    setReplyText('');
  };

  const submitReply = async (feedbackId) => {
    if (!replyText.trim()) {
      setError('Please enter a reply message');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      // Update the UI optimistically
      const updatedFeedbacks = feedbacks.map(fb => 
        fb._id === feedbackId 
          ? { 
              ...fb, 
              reply: replyText, 
              repliedAt: new Date().toISOString() 
            } 
          : fb
      );
      setFeedbacks(updatedFeedbacks);
      
      // Reset the form
      setReplyingTo(null);
      setReplyText('');
      
      // Show success message
      setSuccess('Reply submitted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error submitting reply:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit reply. Please try again.';
      setError(errorMessage);
      
      // Re-fetch feedbacks to restore original state
      fetchFeedbacks();
    }
  };

  const formatDate = (dateString) => {
    try {
      return dateString ? format(new Date(dateString), 'MMM dd, yyyy hh:mm a') : 'N/A';
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="admin-feedback-container">
      <h2>Patient Feedback</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {loading ? (
        <div className="loading">Loading feedbacks...</div>
      ) : feedbacks.length === 0 ? (
        <div className="no-feedbacks">No feedbacks available</div>
      ) : (
        <div className="feedback-list">
          {feedbacks.map((feedback) => (
            <div key={feedback._id} className={`feedback-card ${feedback.reply ? 'replied' : ''}`}>
              <div className="feedback-header">
                <div className="patient-info">
                  <span className="patient-name">
                    {feedback.patientName || 'Anonymous'}
                  </span>
                  <span className="feedback-date">
                    {formatDate(feedback.createdAt)}
                  </span>
                </div>
                <div className="feedback-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={`star ${star <= (feedback.rating || 0) ? 'filled' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="feedback-message">
                {feedback.message}
              </div>
              
              {feedback.reply ? (
                <div className="admin-reply">
                  <div className="reply-header">
                    <span className="admin-label">Admin Reply</span>
                    <span className="reply-date">
                      {formatDate(feedback.repliedAt)}
                    </span>
                  </div>
                  <div className="reply-message">
                    {feedback.reply}
                  </div>
                </div>
              ) : (
                <div className="reply-section">
                  {replyingTo === feedback._id ? (
                    <div className="reply-form">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        rows="3"
                      />
                      <div className="reply-actions">
                        <button 
                          className="btn-cancel"
                          onClick={() => setReplyingTo(null)}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn-send"
                          onClick={() => submitReply(feedback._id)}
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn-reply"
                      onClick={() => handleReply(feedback._id)}
                    >
                      Reply to Feedback
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackPage;