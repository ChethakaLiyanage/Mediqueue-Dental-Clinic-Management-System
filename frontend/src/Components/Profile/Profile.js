import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Edit3,
  Trash2,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Loader,
  CreditCard,
  FileText,
  Heart,
  MessageSquare,
  Pill,
  Activity,
  ChevronRight,
  Eye,
  HelpCircle,
} from "lucide-react";
import "./profile.css";

function ProfileField({ icon: Icon, label, value, highlight = false }) {
  const tone = highlight ? "highlight" : "standard";
  return (
    <div className={`profile-field ${tone}`}>
      <div className="profile-field-left">
        <span className={`profile-field-icon ${tone}`}>
          <Icon
            size={18}
            className={highlight ? "text-blue-600" : "text-gray-500"}
          />
        </span>
        <span className="profile-field-label">{label}</span>
      </div>
      <span className={`profile-field-value ${tone}`}>{value}</span>
    </div>
  );
}

function MedicalRecordCard({ icon: Icon, title, description, count, onClick, color = "blue" }) {
  return (
    <div className={`medical-record-card ${color}`} onClick={onClick}>
      <div className="medical-record-icon">
        <Icon size={24} className={`text-${color}-600`} />
      </div>
      <div className="medical-record-content">
        <h4>{title}</h4>
        <p>{description}</p>
        {count !== undefined && (
          <span className="record-count">{count} record{count !== 1 ? 's' : ''}</span>
        )}
      </div>
      <ChevronRight size={20} className="medical-record-arrow" />
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [medicalCounts, setMedicalCounts] = useState({
    prescriptions: 0,
    treatments: 0,
    appointments: 0,
    inquiries: 0
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("auth-change"));
          navigate("/login", { replace: true });
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Unable to load profile");
        }

        const data = await res.json();
        setUser(data.user || null);
        setPatient(data.patient || null);
        
        // Fetch medical record counts with user data
        await fetchMedicalCounts(token, data.patient);
      } catch (err) {
        setError(err.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const fetchMedicalCounts = async (token, patientData = null) => {
    try {
      // Get patient code for filtering
      let patientCode = patientData?.patientCode;
      
      // If we don't have patient data, fetch it
      if (!patientCode) {
        const userRes = await fetch("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          patientCode = userData.patient?.patientCode;
        }
      }

      console.log('Fetching medical counts for patient:', patientCode);

      // FIXED: Updated the treatments endpoint to match your backend
      const [prescriptionsRes, treatmentsRes, appointmentsRes, inquiriesRes] = await Promise.allSettled([
        fetch("http://localhost:5000/api/prescriptions/my-prescriptions", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // FIXED: Changed from /treatments/ to /treatmentplans/ to match your routes
        fetch("http://localhost:5000/api/treatmentplans/my-treatments", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // Try user-specific endpoint first, fallback to filtered approach
        fetch(`http://localhost:5000/appointments${patientCode ? `?patient_code=${patientCode}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // Fetch inquiry statistics
        fetch("http://localhost:5000/api/inquiries/stats", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const counts = { prescriptions: 0, treatments: 0, appointments: 0, inquiries: 0 };

      if (prescriptionsRes.status === 'fulfilled' && prescriptionsRes.value.ok) {
        const data = await prescriptionsRes.value.json();
        counts.prescriptions = data.prescriptions?.length || 0;
        console.log('Prescriptions count:', counts.prescriptions);
      } else if (prescriptionsRes.status === 'fulfilled') {
        console.warn('Prescriptions fetch failed:', prescriptionsRes.value.status, prescriptionsRes.value.statusText);
      }

      if (treatmentsRes.status === 'fulfilled' && treatmentsRes.value.ok) {
        const data = await treatmentsRes.value.json();
        // FIXED: Updated to match the response structure from your controller
        counts.treatments = data.treatments?.length || data.count || 0;
        console.log('Treatments count:', counts.treatments);
      } else if (treatmentsRes.status === 'fulfilled') {
        console.warn('Treatments fetch failed:', treatmentsRes.value.status, treatmentsRes.value.statusText);
      }

      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok) {
        const data = await appointmentsRes.value.json();
        let userAppointments = data.items || [];
        
        // CRITICAL FIX: Filter appointments by current user on frontend as safety measure
        if (patientCode && userAppointments.length > 0) {
          // Filter appointments to only show current user's appointments
          const originalCount = userAppointments.length;
          userAppointments = userAppointments.filter(apt => {
            const aptPatientCode = apt.patient_code || apt.patientCode;
            return aptPatientCode === patientCode;
          });
          
          console.log(`Filtered appointments: ${originalCount} -> ${userAppointments.length} for patient ${patientCode}`);
        }
        
        counts.appointments = userAppointments.length;
        console.log('Final appointments count:', counts.appointments);
      } else if (appointmentsRes.status === 'fulfilled') {
        console.warn('Appointments fetch failed:', appointmentsRes.value.status, appointmentsRes.value.statusText);
      }

      if (inquiriesRes.status === 'fulfilled' && inquiriesRes.value.ok) {
        const data = await inquiriesRes.value.json();
        counts.inquiries = data.stats?.total || 0;
        console.log('Inquiries count:', counts.inquiries);
      } else if (inquiriesRes.status === 'fulfilled') {
        console.warn('Inquiries fetch failed:', inquiriesRes.value.status, inquiriesRes.value.statusText);
      }

      setMedicalCounts(counts);
    } catch (error) {
      console.error("Failed to fetch medical record counts:", error);
      // Set to zero on error to avoid showing incorrect data
      setMedicalCounts({ prescriptions: 0, treatments: 0, appointments: 0, inquiries: 0 });
    }
  };

  const handleUpdateProfile = () => {
    navigate("/profile/update");
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirmation) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/auth/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        alert(
          "Account deletion endpoint is not available yet. Please contact the administrator."
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Unable to delete account");
      }

      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth-change"));
      navigate("/login", { replace: true });
    } catch (err) {
      alert(err.message || "Unable to delete account");
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
    navigate("/home", { replace: true });
  };

  if (loading) {
    return (
      <div className="profile-loading-container">
        <div className="profile-loading-card">
          <div className="profile-loading-spinner" />
          <p className="profile-loading-text">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error-container">
        <div className="profile-error-card">
          <AlertTriangle className="text-red-600" size={32} />
          <p className="profile-error-text">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error-container">
        <div className="profile-error-card">
          <User className="text-gray-500" size={32} />
          <p className="profile-error-text">No profile information available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <header className="profile-page-header">
          <h1 className="profile-page-title">My Profile</h1>
          <p className="profile-page-subtitle">
            Manage your account and medical information
          </p>
        </header>

        <div className="profile-grid">
          <aside className="profile-summary-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <User className="text-white" size={36} />
              </div>
              <h2 className="profile-name">{user.name}</h2>
              <p className="profile-email">{user.email}</p>
              <span className="profile-role-badge">
                <CheckCircle size={14} className="mr-1 text-green-600" />
                {user.role || "Patient"}
              </span>
            </div>

            <div className="profile-stats">
              <div className="profile-stat-item blue">
                <span className="profile-stat-label">Member Since</span>
                <span className="profile-stat-value blue">2024</span>
              </div>
              <div className="profile-stat-item green">
                <span className="profile-stat-label">Appointments</span>
                <span className="profile-stat-value green">{medicalCounts.appointments}</span>
              </div>
              <div className="profile-stat-item orange">
                <span className="profile-stat-label">Prescriptions</span>
                <span className="profile-stat-value orange">{medicalCounts.prescriptions}</span>
              </div>
            </div>
          </aside>

          <section className="profile-details">
            <div className="profile-info-card">
              <div className="profile-info-header">
                <h3 className="profile-info-title">
                  <Shield className="text-blue-600" size={20} />
                  Account Information
                </h3>
                <button
                  className="profile-edit-btn"
                  onClick={handleUpdateProfile}
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              </div>

              <div className="profile-fields">
                <ProfileField icon={User} label="Full Name" value={user.name} />
                <ProfileField
                  icon={Mail}
                  label="Email Address"
                  value={user.email}
                />
                {user.phone && (
                  <ProfileField
                    icon={Phone}
                    label="Phone Number"
                    value={user.phone}
                  />
                )}
                <ProfileField
                  icon={Shield}
                  label="Account Type"
                  value={user.role || "Patient"}
                  highlight
                />
              </div>
            </div>

            {patient && (
              <div className="profile-info-card">
                <div className="profile-info-header">
                  <h3 className="profile-info-title">
                    <FileText className="text-green-600" size={20} />
                    Medical Information
                  </h3>
                </div>
                <div className="profile-fields">
                  <ProfileField
                    icon={CreditCard}
                    label="Patient Code"
                    value={patient.patientCode}
                    highlight
                  />
                  <ProfileField
                    icon={CreditCard}
                    label="NIC Number"
                    value={patient.nic}
                  />
                  <ProfileField
                    icon={Calendar}
                    label="Date of Birth"
                    value={
                      patient.dob
                        ? new Date(patient.dob).toLocaleDateString()
                        : "N/A"
                    }
                  />
                  <ProfileField
                    icon={User}
                    label="Gender"
                    value={patient.gender}
                  />
                  <ProfileField
                    icon={MapPin}
                    label="Address"
                    value={patient.address}
                  />
                </div>

                {patient.allergies && (
                  <div className="profile-allergy-alert">
                    <div className="profile-allergy-content">
                      <span className="profile-allergy-icon">
                        <Heart size={16} className="text-red-600" />
                      </span>
                      <div className="profile-allergy-info">
                        <h4>Allergies</h4>
                        <p>{patient.allergies}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medical Records Section */}
            <div className="profile-info-card">
              <div className="profile-info-header">
                <h3 className="profile-info-title">
                  <Heart className="text-pink-600" size={20} />
                  Medical Records
                </h3>
              </div>

              <div className="medical-records-grid">
                <MedicalRecordCard
                  icon={Pill}
                  title="Prescriptions"
                  description="View your prescription history and medications"
                  count={medicalCounts.prescriptions}
                  onClick={() => navigate("/profile/prescriptions")}
                  color="blue"
                />
                <MedicalRecordCard
                  icon={Activity}
                  title="Treatment Plans"
                  description="Access your dental treatment plans and procedures"
                  count={medicalCounts.treatments}
                  onClick={() => navigate("/profile/treatments")}
                  color="green"
                />
                <MedicalRecordCard
                  icon={Calendar}
                  title="Appointments"
                  description="View and manage your appointment history"
                  count={medicalCounts.appointments}
                  onClick={() => navigate("/history")}
                  color="purple"
                />
                <MedicalRecordCard
                  icon={MessageSquare}
                  title="My Reviews"
                  description="Manage your feedback and reviews"
                  onClick={() => navigate("/profile/reviews")}
                  color="orange"
                />
                <MedicalRecordCard
                  icon={HelpCircle}
                  title="My Inquiries"
                  description="Submit and track your support inquiries"
                  count={medicalCounts.inquiries}
                  onClick={() => navigate("/profile/inquiries")}
                  color="teal"
                />
              </div>
            </div>

            <div className="profile-info-card">
              <div className="profile-info-header">
                <h3 className="profile-info-title">
                  <FileText className="text-blue-600" size={20} />
                  Account Actions
                </h3>
              </div>

              <div className="profile-actions">
                <button
                  className="profile-action-btn primary"
                  onClick={handleUpdateProfile}
                >
                  <Edit3 size={18} />
                  Update Profile Information
                </button>
                <button
                  className="profile-action-btn secondary"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Signing Out...
                    </>
                  ) : (
                    <>
                      <LogOut size={18} />
                      Sign Out
                    </>
                  )}
                </button>
                <button
                  className="profile-action-btn danger"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>

              <div className="profile-warning">
                <div className="profile-warning-content">
                  <AlertTriangle
                    size={18}
                    className="text-yellow-600 mt-0.5"
                  />
                  <div>
                    <p className="profile-warning-title">Important Notice</p>
                    <p className="profile-warning-text">
                      Account deletion is permanent and cannot be undone. All
                      your appointment history and medical records will be
                      removed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}