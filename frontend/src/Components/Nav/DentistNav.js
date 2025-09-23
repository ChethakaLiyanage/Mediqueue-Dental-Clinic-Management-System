import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./dentistnav.css";
import DashboardMetrics from "../Dashboard/DashboardMetrics";
import FeedbackPage from "../Feedback/DentistFeedbackPage";
import InventoryRequestForm from "../Inventory/InventoryRequestForm";
import TreatmentPlansList from "../TreatmentPlans/DentistTreatmentPlansList";
import DentistTreatmentPlanHistoryPage from "../TreatmentPlans/DentistTreatmentPlanHistoryPage";
import PrescriptionsView from "../Prescriptions/DentistPrescriptionsPage";
import PrescriptionHistoryPage from "../Prescriptions/DentistPrescriptionHistoryPage";
import DentistProfilePage from "../Profile/DentistProfilePage";
import EventsModulePage from "../Events/DentistEventsPage";
import LeavePage from "../Leave/DentistLeavePage";
import DentistSchedulesPage from "../Schedules/DentistSchedulesPage";
import InventoryNotification from "../Notification/InventoryNotification";
import { API_BASE } from "../api";

export default function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const auth = useMemo(() => {
    try { 
      return JSON.parse(localStorage.getItem('auth') || '{}'); 
    } catch { 
      return {}; 
    }
  }, []);
  
  const dentistCode = auth?.dentistCode || '';
  const loggedInName = auth?.user?.name || '';
  const displayDentistName = loggedInName ? `Dr. ${loggedInName}` : '';
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [notifCount, setNotifCount] = useState(0);

  // Fetch notification count (pending inventory requests for this dentist)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!dentistCode) return;
        const res = await fetch(`${API_BASE}/inventory/requests?dentistCode=${encodeURIComponent(dentistCode)}`);
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        const list = Array.isArray(data.items) ? data.items : (Array.isArray(data.requests) ? data.requests : []);
        const pending = list.filter(r => (String(r.status || 'pending').toLowerCase() === 'pending'));
        setNotifCount(pending.length);
      } catch {
        if (alive) setNotifCount(0);
      }
    })();
    return () => { alive = false; };
  }, [dentistCode]);

  // Set active page based on current route
  useEffect(() => {
    if (!location) return;
    
    const path = location.pathname || '';
    
    if (path.startsWith('/dentist/feedback')) {
      setActive('Feedback');
      setPageTitle('Patient Feedback');
    } else if (path.startsWith('/dentist/events')) {
      setActive('Events');
      setPageTitle('Clinic Events');
    } else if (path.startsWith('/dentist/treatmentplans')) {
      setActive('Treatment Plans');
      setPageTitle('Treatment Plans');
    } else if (path.startsWith('/dentist/inventory/notifications')) {
      setActive('Inventory');
      setPageTitle('Inventory Notifications');
    } else if (path.startsWith('/dentist/inventory')) {
      setActive('Inventory');
      setPageTitle('Inventory Management');
    } else if (path.startsWith('/dentist/prescriptions')) {
      setActive('Prescriptions');
      setPageTitle('Prescriptions');
    } else if (path.startsWith('/dentist/schedules')) {
      setActive('Schedules');
      setPageTitle('Schedules');
    } else if (path.startsWith('/dentist/leave')) {
      setActive('Leave');
      setPageTitle('Leave Management');
    } else if (path.startsWith('/dentist/profile')) {
      setActive('Profile');
      setPageTitle('Profile Settings');
    } else if (path.startsWith('/dentist/dashboard')) {
      setActive('Dashboard');
      setPageTitle('Dashboard');
    } else {
      setActive('Dashboard');
      setPageTitle('Dashboard');
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
        navigate("/dentist/dashboard");
        setPageTitle('Dashboard');
        break;
      case "Events":
        navigate("/dentist/events");
        setPageTitle('Clinic Events');
        break;
      case "Schedules":
        navigate("/dentist/schedules");
        setPageTitle('Schedules');
        break;
      case "Treatment Plans":
        navigate("/dentist/treatmentplans");
        setPageTitle('Treatment Plans');
        break;
      case "Prescriptions":
        navigate("/dentist/prescriptions");
        setPageTitle('Prescriptions');
        break;
      case "Feedback":
        navigate("/dentist/feedback");
        setPageTitle('Patient Feedback');
        break;
      case "Inventory":
        navigate("/dentist/inventory");
        setPageTitle('Inventory Management');
        break;
      case "Leave":
        navigate("/dentist/leave");
        setPageTitle('Leave Management');
        break;
      case "Profile":
        navigate("/dentist/profile");
        setPageTitle('Profile Settings');
        break;
      case "Login":
        navigate("/login");
        break;
      default:
        navigate("/dentist/dashboard");
        setPageTitle('Dashboard');
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
      label: "Events",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: "Schedules",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Treatment Plans",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: "Prescriptions",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
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
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      ),
    },
    {
      label: "Inventory",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: "Leave",
      icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      ),
    },
  ];

  // User profile link (conditionally rendered)
  const userProfileLink = displayDentistName ? {
    label: displayDentistName,
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
    
    if (path.startsWith('/dentist/feedback')) return <FeedbackPage />;
    if (path.startsWith('/dentist/inventory/notifications')) return <InventoryNotification />;
    if (path.startsWith('/dentist/inventory')) return <InventoryRequestForm />;
    if (path.startsWith('/dentist/schedules')) return <DentistSchedulesPage />;
    if (path.startsWith('/dentist/leave')) return <LeavePage />;
    if (path.startsWith('/dentist/events')) return <EventsModulePage />;
    if (path.startsWith('/dentist/treatmentplans/history')) return <DentistTreatmentPlanHistoryPage />;
    if (path.startsWith('/dentist/treatmentplans')) return <TreatmentPlansList />;
    if (path.startsWith('/dentist/prescriptions/history')) return <PrescriptionHistoryPage />;
    if (path.startsWith('/dentist/profile')) return <DentistProfilePage />;
    if (path.startsWith('/dentist/prescriptions')) return <PrescriptionsView />;
    
    // Default dashboard
    return (
      <div className="treatment-plans-page">
        <DashboardMetrics />
      </div>
    );
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
              <div className="brand-subtitle">Professional Healthcare</div>
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
          <div className="top-bar">
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
              <button 
                className="notification-btn" 
                aria-label="View notifications"
                title="Notifications"
                onClick={() => navigate('/dentist/inventory/notifications')}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M15 17h5l-5-5V9a6 6 0 10-12 0v3l-5 5h5a6 6 0 1012 0z"
                  />
                </svg>
                {notifCount > 0 && <div className="notification-badge">{notifCount}</div>}
              </button>
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