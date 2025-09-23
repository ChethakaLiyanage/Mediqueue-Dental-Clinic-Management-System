import React, { useState } from 'react';
import axios from 'axios';

const AddStaffModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contact_no: '',
    role: 'Dentist',
    // Role-specific fields
    license_no: '',
    specialization: '',
    department: '',
    deskNo: '',
    permission: 'full'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Get auth token
  const getAuthToken = () => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      return auth.token;
    } catch {
      return null;
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setSelectedPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove photo
  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.role) newErrors.role = 'Role is required';

    // Role-specific validation
    if (formData.role === 'Dentist' && !formData.license_no.trim()) {
      newErrors.license_no = 'License number is required for dentists';
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add photo if selected and role is Dentist
      if (selectedPhoto && formData.role === 'Dentist') {
        submitData.append('dentistPhoto', selectedPhoto);
      }
      
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' }
      };
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.post(
        'http://localhost:5000/admin/staff',
        submitData,
        config
      );

      if (response.status === 201) {
        alert(`${formData.role} created successfully!`);
        onSuccess(); // This will close modal and refresh the list
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create staff member';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Get role-specific fields
  const renderRoleSpecificFields = () => {
    switch (formData.role) {
      case 'Dentist':
        return (
          <>
            <div className="form-group">
              <label>License Number *</label>
              <input
                type="text"
                name="license_no"
                value={formData.license_no}
                onChange={handleChange}
                className={errors.license_no ? 'error' : ''}
                placeholder="Enter license number"
              />
              {errors.license_no && <span className="error-text">{errors.license_no}</span>}
            </div>
            <div className="form-group">
              <label>Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="e.g., Orthodontics, Oral Surgery"
              />
            </div>
            <div className="form-group">
              <label>Dentist Photo</label>
              <div className="photo-upload-section">
                {!photoPreview ? (
                  <div className="photo-upload-area">
                    <input
                      type="file"
                      id="dentistPhoto"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="dentistPhoto" className="photo-upload-label">
                      <div className="upload-icon">📷</div>
                      <div className="upload-text">
                        <p>Click to upload photo</p>
                        <small>JPG, PNG, GIF up to 5MB</small>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="photo-preview">
                    <img src={photoPreview} alt="Dentist preview" className="preview-image" />
                    <button type="button" className="remove-photo-btn" onClick={removePhoto}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      
      case 'Admin':
        return (
          <div className="form-group">
            <label>Permission Level</label>
            <select
              name="permission"
              value={formData.permission}
              onChange={handleChange}
            >
              <option value="full">Full Access</option>
              <option value="limited">Limited Access</option>
              <option value="read-only">Read Only</option>
            </select>
          </div>
        );
      
      case 'Manager':
        return (
          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g., Operations, HR, Finance"
            />
          </div>
        );
      
      case 'Receptionist':
        return (
          <div className="form-group">
            <label>Desk Number</label>
            <input
              type="text"
              name="deskNo"
              value={formData.deskNo}
              onChange={handleChange}
              placeholder="e.g., Desk 1, Front Desk"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content add-staff-modal">
        <div className="modal-header">
          <h2>Add New Staff Member</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="staff-form">
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Enter full name"
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter email address"
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter password (min 6 characters)"
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="tel"
                name="contact_no"
                value={formData.contact_no}
                onChange={handleChange}
                placeholder="Enter contact number"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? 'error' : ''}
            >
              <option value="Dentist">Dentist</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Receptionist">Receptionist</option>
            </select>
            {errors.role && <span className="error-text">{errors.role}</span>}
          </div>

          {/* Role-specific fields */}
          {renderRoleSpecificFields()}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
