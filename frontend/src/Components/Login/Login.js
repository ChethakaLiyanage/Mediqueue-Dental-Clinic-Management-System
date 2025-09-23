// frontend/src/Components/Login.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { validateEmail } from "../../utils/validation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateField = (fieldName, value) => {
    let validation = { isValid: true, message: '' };
    
    if (fieldName === 'email') {
      validation = validateEmail(value);
    } else if (fieldName === 'password') {
      validation = { isValid: value.length >= 6, message: value.length < 6 ? 'Password must be at least 6 characters' : '' };
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: validation.isValid ? '' : validation.message
    }));
    
    return validation.isValid;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setFieldErrors({});

    // Validate fields
    const emailValid = validateField('email', email);
    const passwordValid = validateField('password', password);

    if (!emailValid || !passwordValid) {
      return setErr("Please fix the validation errors above");
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        // Check user role and redirect accordingly
        const userRole = result.user?.role;
        if (userRole === 'manager') {
          navigate("/manager-dashboard", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      } else {
        setErr(result.error);
      }
    } catch (e) {
      setErr("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, border: "1px solid #eee", borderRadius: 12 }}>
      <h2 style={{ marginBottom: 16 }}>Login</h2>
      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input 
            style={{ 
              width: "100%", 
              padding: 10, 
              border: fieldErrors.email ? "2px solid #dc2626" : "1px solid #d1d5db",
              borderRadius: 6
            }} 
            type="email" 
            value={email} 
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) validateField('email', e.target.value);
            }}
            onBlur={() => validateField('email', email)}
            required 
          />
          {fieldErrors.email && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{fieldErrors.email}</div>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input 
            style={{ 
              width: "100%", 
              padding: 10, 
              border: fieldErrors.password ? "2px solid #dc2626" : "1px solid #d1d5db",
              borderRadius: 6
            }} 
            type="password" 
            value={password} 
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) validateField('password', e.target.value);
            }}
            onBlur={() => validateField('password', password)}
            required 
          />
          {fieldErrors.password && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{fieldErrors.password}</div>}
        </div>
        <button 
          style={{ 
            width: "100%", 
            padding: 12, 
            background: loading ? "#9ca3af" : "#2c5aa0", 
            color:"#fff", 
            border:0, 
            borderRadius:8,
            cursor: loading ? "not-allowed" : "pointer"
          }}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div style={{ marginTop: 12, fontSize: 14 }}>
        No account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}
