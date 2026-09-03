import React, { useState } from 'react';
import { Lock, User, ShieldAlert, Info } from 'lucide-react';
import { MOCK_USERS } from '../data/initialData';
import OilLogo from './OilLogo';
import IndianFlagBackground3D from './IndianFlagBackground3D';

export default function LoginPage({ onLoginSuccess }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmedId = userId.trim().toLowerCase();
    const trimmedPass = password.trim();

    const userMatch = MOCK_USERS.find(
      (u) => u.userId.toLowerCase() === trimmedId && u.password === trimmedPass
    );

    if (userMatch) {
      onLoginSuccess(userMatch);
    } else {
      setErrorMsg('Invalid User ID or Password. Try quick fill buttons below.');
    }
  };

  const handleQuickLogin = (mockUser) => {
    setUserId(mockUser.userId);
    setPassword(mockUser.password);
    setErrorMsg('');
    onLoginSuccess(mockUser);
  };

  return (
    <div className="login-bg">
      <IndianFlagBackground3D />
      <div className="login-card" style={{ position: 'relative', zIndex: 10 }}>
        <div className="login-header-banner">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <div style={{ background: '#FFFFFF', padding: '0.4rem 0.75rem', borderRadius: '10px', display: 'inline-flex', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
              <OilLogo size={42} showText={true} />
            </div>
          </div>
          <p style={{ color: '#FEF3C7', fontSize: '0.78rem', marginTop: '0.4rem', fontWeight: 600 }}>
            Safety Reporting System –
          </p>
        </div>

        <div className="login-body">
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Enter your official safety credentials to access portal.
          </p>

          {errorMsg && (
            <div style={{
              background: '#FEF2F2',
              color: '#991B1B',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              fontSize: '0.78rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} color="var(--oil-navy-main)" />
                User ID / Employee ID
              </label>
              <input
                type="text"
                className="form-control"
                style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="e.g. OIL-EMP-1042 or OIL-HSE-9001"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.1rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lock size={14} color="var(--oil-navy-main)" />
                Password
              </label>
              <input
                type="password"
                className="form-control"
                style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem', fontSize: '0.9rem' }}>
              Sign In to Portal
            </button>
          </form>

          {/* Quick Demo Login Buttons */}
          <div className="demo-credentials-box" style={{ marginTop: '1rem', padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--oil-navy-dark)', fontWeight: 700, fontSize: '0.78rem', marginBottom: '0.35rem' }}>
              <Info size={14} color="var(--oil-navy-main)" />
              1-Click Demo Login:
            </div>
            <div className="demo-btn-group" style={{ gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.3rem' }}
                onClick={() => handleQuickLogin(MOCK_USERS[0])}
              >
                Employee Login &rarr;
              </button>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.3rem' }}
                onClick={() => handleQuickLogin(MOCK_USERS[1])}
              >
                Admin Login &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

