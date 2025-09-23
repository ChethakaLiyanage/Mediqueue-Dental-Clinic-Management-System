import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./receptionistnav.css";

function useAuthUser() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  };
  const [user, setUser] = useState(read);

  useEffect(() => {
    const onChange = () => setUser(read());
    window.addEventListener("storage", onChange);
    window.addEventListener("auth:changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("auth:changed", onChange);
    };
  }, []);
  return user;
}

export default function ReceptionistNav() {
  const navigate = useNavigate();
  const u = useAuthUser();
  const initials = (u?.name || "Rc")
    .split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:changed")); // notify nav to clear
    navigate("/login", { replace: true });
  };

  return (
    <aside className="rc-aside">
      <div className="rc-brand">
        <div className="rc-logo" aria-hidden>DC</div>
        <div>
          <div className="rc-brand-title">DentalCare Pro</div>
          <div className="rc-brand-sub">Reception</div>
        </div>
      </div>

      <nav className="rc-nav">
        <NavLink to="/receptionist/dashboard" className="rc-link">
          <span className="rc-ico"></span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/receptionist/profile" className="rc-link">
          <span className="rc-ico"></span>
          <span>Profile</span>
        </NavLink>

        <NavLink to="/receptionist/events" className="rc-link">
          <span className="rc-ico"></span>
          <span>Events</span>
        </NavLink>
        
        <NavLink to="/receptionist/schedule" className="rc-link">
          <span className="rc-ico"></span>
          <span>Schedules</span>
        </NavLink>
        
        <NavLink to="/receptionist/appointments" className="rc-link">
          <span className="rc-ico"></span>
          <span>Appointments</span>
        </NavLink>
        
        <NavLink to="/receptionist/queue" className="rc-link">
          <span className="rc-ico"></span>
          <span>Queue</span>
        </NavLink>
        
        <NavLink to="/receptionist/inquiries" className="rc-link">
          <span className="rc-ico"></span>
          <span>Inquiries</span>
        </NavLink>
        
        <NavLink to="/receptionist/patients" className="rc-link">
          <span className="rc-ico"></span>
          <span>Patients</span>
        </NavLink>

        <NavLink to="/receptionist/dentists" className="rc-link">
          <span className="rc-ico"></span>
          <span>Dentists</span>
        </NavLink>

        <NavLink to="/receptionist/unregistered" className="rc-link">
          <span className="rc-ico"></span>
          <span>Unregistered</span>
        </NavLink>

        <NavLink to="/receptionist/leaves" className="rc-link">
          <span className="rc-ico"></span>
          <span>Leaves</span>
        </NavLink>

        <NavLink to="/receptionist/notifications" className="rc-link">
          <span className="rc-ico"></span>
          <span>Notifications</span>
        </NavLink>
      </nav>

      <div className="rc-profile">
        <div className="rc-avatar" aria-hidden>{initials}</div>
        <div className="rc-prof-text">
          <div className="rc-prof-name">{u?.name || "Receptionist"}</div>
          <div className="rc-prof-role">{u?.role || "Front Desk"}</div>
        </div>
        <button className="rc-logout" onClick={logout} title="Sign out">×</button>
      </div>
    </aside>
  );
}