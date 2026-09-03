import React from 'react';
import { ShieldCheck, UserCheck, PhoneCall, Globe } from 'lucide-react';
import OilLogo from './OilLogo';
import { TRANSLATIONS } from '../data/translations';

export default function Header({ currentUser, language, setLanguage, onLogout, onSwitchRole, visionOnline = false }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const isAdmin = currentUser.role === 'Admin';

  return (
    <header className="official-header">
      <div className="brand-section">
        <div style={{ background: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
          <OilLogo size={36} />
        </div>
        <div className="brand-titles">
          <div className="brand-main">{t.systemTitle}</div>
          <div className="brand-sub">{t.systemSub}</div>
        </div>
      </div>

      <div className="header-right">

        {/* Vision AI Status — Admin only */}
        {isAdmin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: visionOnline ? 'rgba(5,150,105,0.2)' : 'rgba(100,116,139,0.2)',
            padding: '0.35rem 0.75rem', borderRadius: '20px',
            border: `1px solid ${visionOnline ? 'rgba(5,150,105,0.5)' : 'rgba(100,116,139,0.4)'}`,
            fontSize: '0.75rem',
            color: visionOnline ? '#6EE7B7' : '#94A3B8',
            transition: 'all 0.4s ease',
            whiteSpace: 'nowrap'
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: visionOnline ? '#10B981' : '#64748B',
              boxShadow: visionOnline ? '0 0 6px #10B981' : 'none',
              display: 'inline-block', flexShrink: 0
            }} />
            <span style={{ fontWeight: 700 }}>
              {visionOnline ? '🤖 Vision AI: LIVE' : '🤖 Vision AI: Offline'}
            </span>
          </div>
        )}

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.3)' }}>
          <Globe size={16} color="var(--oil-gold-light)" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ background: 'transparent', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="en" style={{ color: '#000' }}>English</option>
            <option value="hi" style={{ color: '#000' }}>हिंदी (Hindi)</option>
            <option value="mr" style={{ color: '#000' }}>मराठी (Marathi)</option>
            <option value="bn" style={{ color: '#000' }}>বাংলা (Bengali)</option>
          </select>
        </div>

        {/* HSE Hotline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239,68,68,0.2)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.4)', fontSize: '0.78rem', color: '#FECACA' }}>
          <PhoneCall size={14} color="#EF4444" />
          <span>HSE Control: <strong>+91 374 280 2616</strong></span>
        </div>

        {/* User Badge & Quick Role Switcher */}
        <div className="user-badge-pill">
          {isAdmin ? (
            <ShieldCheck size={18} color="var(--oil-gold)" />
          ) : (
            <UserCheck size={18} color="#93C5FD" />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.1 }}>{currentUser.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>{currentUser.userId} • {currentUser.designation}</div>
          </div>
          <span className="user-role-tag">{currentUser.role}</span>

          {onSwitchRole && (
            <button
              type="button"
              onClick={onSwitchRole}
              title={isAdmin ? "Switch to Employee View" : "Switch to Admin View"}
              style={{
                background: isAdmin ? '#D97706' : '#003366',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: '12px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginLeft: '0.4rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              🔄 {isAdmin ? 'Switch to Employee' : 'Switch to Admin'}
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
