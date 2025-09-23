import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./dentistnav.css";
import AdminDashboard from "../Dashboard/Admindashboard";
import StaffManagement from "../Admin/StaffManagement";
import ReceptionistActivities from "../Admin/ReceptionistActivities";
import PatientManagement from "../Admin/PatientManagement";
import AdminProfilePage from "../Profile/AdminProfilePage";
import AdminReports from "../Admin/AdminReports";
import AdminFeedbackPage from "../Feedback/AdminFeedbackPage";

export default function AdminNav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const auth = useMemo(() => {
    try { 
      return JSON.parse(localStorage.getItem('auth') || '{}'); 
    } catch { 
      return {}; 
    }
  }, []);
  
  const adminCode = auth?.adminCode || '';
  const loggedInName = auth?.user?.name || '';
  const displayAdminName = loggedInName ? `Admin ${loggedInName}` : '';
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [pageTitle, setPageTitle] = useState("Dashboard");

  // Set active page based on current route
  useEffect(() => {
    if (!location) return;
    
    const path = location.pathname || '';
    
    if (path.startsWith('/admin/staff')) {
      setActive('Staff Management');
      setPageTitle('Staff Management');
    } else if (path.startsWith('/admin/patients')) {
      setActive('Patient Management');
      setPageTitle('Patient Management');
    } else if (path.startsWith('/admin/receptionist-activities')) {
      setActive('Receptionist Activities');
      setPageTitle('Receptionist Activities');
    } else if (path.startsWith('/admin/reports')) {
      setActive('Reports');
      setPageTitle('Reports & Analytics');
    } else if (path.startsWith('/admin/feedback')) {
      setActive('Feedback');
      setPageTitle('Patient Feedback');
    } else if (path.startsWith('/admin/dashboard')) {
      setActive('Dashboard');
      setPageTitle('Admin Dashboard');
    } else {
      setActive('Dashboard');
      setPageTitle('Admin Dashboard');
    }
  }, [location?.pathname]);

  const isMobile = () => window.innerWidth <= 768;

  // Handle window resize
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) {
        setMobileOpen(false);
      }
    };
    
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile()) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleSelect = (label) => {
    setActive(label);
    
    // Close mobile menu
    if (isMobile()) {
      setMobileOpen(false);
    }
    
    // Navigate to appropriate route
    switch (label) {
      case "Dashboard":
        navigate("/admin/dashboard");
        setPageTitle('Admin Dashboard');
        break;
      case "Staff Management":
        navigate("/admin/staff");
        setPageTitle('Staff Management');
        break;
      case "Patient Management":
        navigate("/admin/patients");
        setPageTitle('Patient Management');
        break;
      case "Receptionist Activities":
        navigate("/admin/receptionist-activities");
        setPageTitle('Receptionist Activities');
        break;
      case "Reports":
        navigate("/admin/reports");
        setPageTitle('Reports & Analytics');
        break;
      case "Feedback":
        navigate("/admin/feedback");
        setPageTitle('Patient Feedback');
        break;
      case "Profile":
        navigate("/admin/profile");
        setPageTitle('Admin Profile');
        break;
      default:
        navigate("/admin/dashboard");
        setPageTitle('Admin Dashboard');
    }
  };

  // Dynamic CSS classes
  const sidebarClasses = useMemo(() => {
    const classes = ["sidebar"];
    if (collapsed) classes.push("collapsed");
    if (mobileOpen) classes.push("mobile-open");
    return classes.join(" ");
  }, [collapsed, mobileOpen]);

  const mainClasses = useMemo(() => {
    const classes = ["main-content"];
    if (collapsed) classes.push("expanded");
    return classes.join(" ");
  }, [collapsed]);

  // Navigation links configuration
  const navigationLinks = [
    {
      label: "Dashboard",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z"
          />
        </svg>
      ),
    },
    {
      label: "Staff Management",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Patient Management",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      label: "Receptionist Activities",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      label: "Reports",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      label: "Feedback",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
  ];

  // User profile link (conditionally rendered)
  const userProfileLink = displayAdminName ? {
    label: displayAdminName,
    icon: (
      <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  } : null;

  // Render content based on current route
  const renderContent = () => {
    const path = location?.pathname || '';
    
    if (path.startsWith('/admin/staff')) return <StaffManagement />;
    if (path.startsWith('/admin/patients')) return <PatientManagement />;
    if (path.startsWith('/admin/receptionist-activities')) return <ReceptionistActivities />;
    if (path.startsWith('/admin/reports')) return <AdminReports />;
    if (path.startsWith('/admin/feedback')) return <AdminFeedbackPage />;
    if (path.startsWith('/admin/profile')) return <AdminProfilePage />;
    
    // Default dashboard
    return <AdminDashboard />;
  };

  return (
    <>
      <div className="app-container">
        {/* Professional Sidebar Navigation */}
        <aside className={sidebarClasses}>
          {/* Brand Section */}
          <div className="logo-section">
            <div className="logo">🦷</div>
            <div className="brand-info">
              <div className="brand-title">Mediqueue Dental Clinic</div>
              <div className="brand-subtitle">Admin Portal</div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="nav-menu" aria-label="Primary Navigation">
            <ul>
              {navigationLinks.map(({ label, icon }) => (
                <li className="nav-item" key={label}>
                  <button
                    type="button"
                    className={`nav-link ${active === label ? "active" : ""}`}
                    onClick={() => handleSelect(label)}
                    aria-label={label}
                    aria-current={active === label ? "page" : undefined}
                  >
                    {icon}
                    <span className="nav-text">{label}</span>
                    <div className="nav-tooltip">{label}</div>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile Section */}
          {userProfileLink && (
            <div className="user-profile">
              <button
                type="button"
                className={`nav-link ${active === "Profile" ? "active" : ""}`}
                onClick={() => handleSelect("Profile")}
                aria-label={userProfileLink.label}
              >
                {userProfileLink.icon}
                <span className="nav-text">{userProfileLink.label}</span>
                <div className="nav-tooltip">{userProfileLink.label}</div>
              </button>
            </div>
          )}

        </aside>

        {/* Main Content Area */}
        <main className={mainClasses}>
          {/* Top Navigation Bar */}
          <div className="top-nav">
            <button 
              className="toggle-btn" 
              onClick={toggleSidebar} 
              aria-label="Toggle navigation sidebar"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="page-title">{pageTitle}</div>

            <div className="top-bar-right">
              <div className="admin-info">
                {displayAdminName && <span className="admin-name">{displayAdminName}</span>}
                {adminCode && <span className="admin-code">({adminCode})</span>}
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="content-area">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`overlay ${mobileOpen ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
    </>
  );
}
