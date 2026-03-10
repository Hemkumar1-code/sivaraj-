import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Need to adjust URL path considering Vite dev server proxies or static serve,
      // Dev server runs on 5173, backend on 3000. So we need to put the full URL or proxy.
      // Easiest is to use the full URL of the node server for this demo, assume localhost:3000
      // since backend is running there, but we need to ensure it's accessible.
      const res = await fetch('https://location-2-okrw.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.email.split('@')[0]); // Use email prefix as ID or better the DB id
        if (data.role === 'admin') navigate('/admin');
        else navigate('/user');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };


  return (
    <div className="glass-panel login-container">
      <h1>Trackr</h1>
      <p>Sign in to your account</p>
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn">Sign In</button>
      </form>
      {error && (
        <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Login;
