import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'user') {
      navigate('/user');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('Attempting login to:', `${API_URL}/api/login`);
      
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok) {
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.email ? data.email.split('@')[0] : 'user'); 
        
        if (data.role === 'admin') navigate('/admin');
        else navigate('/user');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server. Please check if the backend is running.');
    } finally {
      setLoading(false);
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          className="btn" 
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, position: 'relative' }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      {error && (
        <div style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p>Default Admin: hemk3672@gmail.com</p>
        <p>Default User: sivaraj@gmail.com</p>
      </div>
    </div>
  );
};

export default Login;

