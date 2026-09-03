import React from 'react';
import { 
  LayoutDashboard, 
  FilePlus, 
  FileText, 
  Layers, 
  ShieldAlert, 
  BarChart3, 
  Users, 
  Bell, 
  Settings, 
  User, 
  LogOut,
  MapPin,
  Cpu
} from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';

export default function Sidebar({ currentUser, language = 'en', activeTab, setActiveTab, reports, drafts = [], onLogout }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const isEmployee = currentUser.role === 'Employee';

  const criticalCount = reports.filter((r) => (r.severity === 'Critical' || r.aiAnalysis?.sifPotential === 'Yes') && r.status !== 'Resolved' && r.status !== 'Closed').length;
  const openCount = reports.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;
  const sifYesCount = reports.filter((r) => r.aiAnalysis?.sifPotential === 'Yes').length;

  const empMenu = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'report-form', label: t.reportFormNav, icon: FilePlus, highlight: true },
    { id: 'my-reports', label: t.myReportsNav, icon: FileText, badge: drafts.length > 0 ? `${drafts.length} drafts` : null, badgeColor: '#D97706' },
    { id: 'notifications', label: t.notificationsNav, icon: Bell },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const adminMenu = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'ai-dashboard', label: 'AI Precursor Analytics', icon: Cpu, highlight: true, badge: sifYesCount > 0 ? `${sifYesCount} SIF` : null, badgeColor: '#DC2626' },
    { id: 'all-reports', label: t.allReportsNav, icon: FileText, badge: openCount > 0 ? openCount.toString() : null },
    { id: 'reports-by-area', label: t.reportsByAreaNav, icon: Layers },
    { id: 'critical-reports', label: t.criticalReportsNav, icon: ShieldAlert, badge: criticalCount > 0 ? criticalCount.toString() : null, badgeColor: '#DC2626' },
    { id: 'employees', label: t.employeesNav, icon: Users },
    { id: 'notifications', label: t.notificationsNav, icon: Bell },
    { id: 'settings', label: t.settingsNav, icon: Settings }
  ];

  const menuItems = isEmployee ? empMenu : adminMenu;

  return (
    <aside className="sidebar-nav">
      <div>
        <div className="nav-section-title">
          {isEmployee ? t.employeeMenuTitle : t.adminMenuTitle}
        </div>
        <ul className="nav-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`nav-item-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  style={item.highlight && !isActive ? { borderLeft: '3px solid var(--oil-gold)' } : {}}
                >
                  <Icon size={18} color={isActive ? '#FFFFFF' : item.highlight ? 'var(--oil-gold)' : 'var(--text-secondary)'} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span 
                      className="nav-badge-count" 
                      style={item.badgeColor ? { background: item.badgeColor } : {}}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button 
          className="nav-item-btn" 
          onClick={onLogout}
          style={{ color: '#DC2626', background: '#FEF2F2' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>

        <div className="sidebar-footer">
          <strong>HSSE Platform</strong>
          Oil India Limited • Operational Safety & Compliance Division
        </div>
      </div>
    </aside>
  );
}

