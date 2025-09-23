import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

export default function PatientRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    contact_no: '',
    nic: '',
    dob: '',
    gender: '',
    address: '',
    allergies: '',
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.gender) return alert('Please select gender');
    const res = await axios.post('http://localhost:5000/register-patient', form);
    if (res.data?.status === 'ok') {
      alert('Registered successfully');
      navigate(res.data.redirectTo || '/login');
    } else {
      alert(res.data?.message || 'Register failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1220' }}>
      <div style={{ width: 520, background: '#121c2b', padding: 24, borderRadius: 8, color: '#fff' }}>
        <h2>Patient Registration</h2>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>Name</label>
              <input name="name" value={form.name} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} required />
            </div>
            <div>
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} required />
            </div>
            <div>
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} required />
            </div>
            <div>
              <label>Contact No</label>
              <input name="contact_no" value={form.contact_no} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} />
            </div>
            <div>
              <label>NIC</label>
              <input name="nic" value={form.nic} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} required />
            </div>
            <div>
              <label>Date of Birth</label>
              <input name="dob" type="date" value={form.dob} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} required />
            </div>
            <div>
              <label>Gender</label>
              <select name="gender" value={form.gender} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} required>
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label>Allergies</label>
              <input name="allergies" value={form.allergies} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Address</label>
            <textarea name="address" rows={3} value={form.address} onChange={onChange} style={{ width: '100%', padding: 10, marginTop: 6 }} />
          </div>
          <button style={{ marginTop: 16, width: '100%', background: '#1d4ed8', color: '#fff', padding: 10, border: 'none', borderRadius: 6 }}>Register</button>
        </form>
      </div>
    </div>
  );
}

