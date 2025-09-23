import React, { useState } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from 'react-router-dom';
import './create-inquiry.css';

const CreateInquiry = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    if (formData.subject.length > 200) {
      setError('Subject must be less than 200 characters');
      return;
    }

    if (formData.message.length > 2000) {
      setError('Message must be less than 2000 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/inquiries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          message: formData.message.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Inquiry submitted successfully! Reference: ${data.inquiry.inquiryCode}`);
        setFormData({ subject: '', message: '' });
        
        // Redirect to inquiries list after 2 seconds
        setTimeout(() => {
          navigate('/profile/inquiries');
        }, 2000);
      } else {
        setError(data.message || 'Failed to submit inquiry');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remainingSubjectChars = 200 - formData.subject.length;
  const remainingMessageChars = 2000 - formData.message.length;

  return (
    <div className="create-inquiry-container">
      <div className="create-inquiry-header">
        <Link to="/profile/inquiries" className="back-link">
          <i className="fas fa-arrow-left"></i> Back to Inquiries
        </Link>
        <h1>Submit New Inquiry</h1>
        <p>Need help or have a question? Submit an inquiry and our team will get back to you.</p>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="inquiry-form">
        <div className="form-group">
          <label htmlFor="subject">
            Subject <span className="required">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Brief description of your inquiry"
            maxLength={200}
            required
            disabled={loading}
          />
          <div className={`char-count ${remainingSubjectChars < 20 ? 'warning' : ''}`}>
            {remainingSubjectChars} characters remaining
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="message">
            Message <span className="required">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Please provide detailed information about your inquiry..."
            rows={8}
            maxLength={2000}
            required
            disabled={loading}
          />
          <div className={`char-count ${remainingMessageChars < 100 ? 'warning' : ''}`}>
            {remainingMessageChars} characters remaining
          </div>
        </div>

        <div className="form-actions">
          <Link to="/profile/inquiries" className="btn btn-outline">
            Cancel
          </Link>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !formData.subject.trim() || !formData.message.trim()}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Submit Inquiry
              </>
            )}
          </button>
        </div>
      </form>

      <div className="inquiry-tips">
        <h3><i className="fas fa-lightbulb"></i> Tips for Better Support</h3>
        <ul>
          <li>Be specific about your issue or question</li>
          <li>Include relevant details like appointment dates or treatment information</li>
          <li>Mention any error messages you encountered</li>
          <li>Provide your contact preferences if urgent</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateInquiry;
