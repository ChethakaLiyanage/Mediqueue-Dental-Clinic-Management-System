import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ email: '', password: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const sendRequest = async () => {
    const res = await axios.post('http://localhost:5000/login', {
      email: user.email,
      password: user.password,
    });
    return res.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await sendRequest();
      if (response.status === 'ok') {
        // persist auth for dashboard/API usage
        localStorage.setItem('auth', JSON.stringify({
          token: response.token,
          role: response.role,
          user: response.user,
          dentistCode: response.dentistCode,
          adminCode: response.adminCode,
        }));
        // redirect to dashboard based on redirectTo from backend
        let dest = response.redirectTo || '/dentist/dashboard';
        // Map legacy paths to current routes
        if (dest === '/dentistDashboard') dest = '/dentist/dashboard';
        if (dest === '/adminDashboard') dest = '/admin/dashboard';
        navigate(dest);
      } else {
        alert('Login error');
      }
    } catch (err) {
      alert('error ' + err.message);
    }
  };

  const onForgotPassword = () => navigate('/forgot-password');
  const onSignUp = () => {
    if (window.confirm('Are you a patient?')) {
      navigate('/register-patient');
    }
  };

  return (
    <div className="login-page">
      <div className="top-nav">
        <div className="brand">MediQueue Dental</div>
        <div className="spacer" />
        <button className="nav-btn" onClick={() => navigate('/')}>Home</button>
        <button className="nav-btn" onClick={() => navigate('/login')}>Login</button>
      </div>

      <div className="login-wrap">
        <div className='login-container'>
          <h1>User Login</h1>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email Address</label><br />
            <input type="email" id="email" name="email" value={user.email} onChange={handleInputChange} required /><br />

            <label htmlFor="password">Password</label><br />
            <input type="password" id="password" name="password" value={user.password} onChange={handleInputChange} required /><br />

            <button type="submit">Login</button>
          </form>

          <div className="login-meta">
            <a onClick={onForgotPassword}>Forgot password?</a>
            <span>
              Do not have an account? <a onClick={onSignUp}>Sign up</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
