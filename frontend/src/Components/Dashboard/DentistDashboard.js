import React from 'react';
import DentistNav from "../Nav/DentistNav";
import DashboardMetrics from './DashboardMetrics';
import "./Dentistdashboard.css";

function DentistDashboard() {
  return (
    <div>
      <DentistNav />
      <DashboardMetrics />
    </div>
  );
}

export default DentistDashboard;