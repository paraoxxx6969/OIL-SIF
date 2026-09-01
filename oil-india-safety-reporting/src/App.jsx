import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_REPORTS } from './data/initialData';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import EmployeeDashboard from './components/EmployeeDashboard';
import ReportForm from './components/ReportForm';
import MyReports from './components/MyReports';
import AdminDashboard from './components/AdminDashboard';
import ReportsByArea from './components/ReportsByArea';
import AdminReportsTable from './components/AdminReportsTable';
import ReportDetailModal from './components/ReportDetailModal';
import './styles/main.css';

const VISION_API = 'http://localhost:5001/api/vision/reports';
const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('oil_safety_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [reports, setReports] = useState(() => {
    // Clear demo storage if present
    const demoCleared = localStorage.getItem('oil_demo_data_cleared_v1');
    if (!demoCleared) {
      localStorage.removeItem('oil_safety_reports');
      localStorage.setItem('oil_demo_data_cleared_v1', 'true');
      return [];
    }
    const saved = localStorage.getItem('oil_safety_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [visionOnline, setVisionOnline] = useState(false);
  const seenVisionIds = useRef(new Set());

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('oil_safety_reports', JSON.stringify(reports));
  }, [reports]);

  // ── Vision backend polling ──────────────────────────────────
  // Polls Flask API every 5 seconds for auto-filed vision violation reports
  // Only injects NEW reports (tracks seen IDs to avoid duplicates)
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(VISION_API, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) { setVisionOnline(false); return; }
        setVisionOnline(true);
        const visionReports = await res.json();
        const newOnes = visionReports.filter(r => !seenVisionIds.current.has(r.id));
        if (newOnes.length > 0) {
          newOnes.forEach(r => seenVisionIds.current.add(r.id));
          setReports(prev => {
            // Avoid duplicates if already added
            const existingIds = new Set(prev.map(p => p.id));
            const toAdd = newOnes.filter(r => !existingIds.has(r.id));
            return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
          });
          showToast(`🤖 Vision AI filed ${newOnes.length} new violation report(s) automatically.`);
        }
      } catch (_) {
        setVisionOnline(false);
      }
    };
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    poll(); // run immediately on mount
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('oil_safety_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('oil_safety_user');
    }
  }, [currentUser]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    showToast(`Welcome ${user.name}! Logged in as ${user.role}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedReportDetail(null);
    setSelectedAreaFilter(null);
  };

  const handleAddReport = (newReport) => {
    setReports((prev) => [newReport, ...prev]);
    showToast(`Safety Report ${newReport.id} submitted successfully!`);
  };

  const handleUpdateReport = (updatedReport) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
    showToast(`Report ${updatedReport.id} updated successfully.`);
  };

  const handleSelectAreaDrilldown = (areaName) => {
    setSelectedAreaFilter(areaName);
    setActiveTab('reports-by-area');
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const isEmployee = currentUser.role === 'Employee';

  return (
    <div className="app-container">
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: 'var(--oil-navy-dark)',
          color: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          borderLeft: '4px solid var(--oil-gold)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          {toastMessage}
        </div>
      )}

      {/* Official Header */}
      <Header
        currentUser={currentUser}
        language={language}
        setLanguage={setLanguage}
        onLogout={handleLogout}
        visionOnline={visionOnline}
      />

      <div className="main-wrapper">
        {/* Navigation Sidebar */}
        <Sidebar
          currentUser={currentUser}
          language={language}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab !== 'reports-by-area') setSelectedAreaFilter(null);
            setActiveTab(tab);
          }}
          reports={reports}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <main className="content-body">
          {/* EMPLOYEE VIEWS */}
          {isEmployee && (
            <>
              {activeTab === 'dashboard' && (
                <EmployeeDashboard
                  currentUser={currentUser}
                  language={language}
                  reports={reports}
                  onNavigate={setActiveTab}
                  onViewDetail={setSelectedReportDetail}
                />
              )}

              {activeTab === 'report-form' && (
                <ReportForm
                  currentUser={currentUser}
                  language={language}
                  onSubmitReport={handleAddReport}
                />
              )}

              {activeTab === 'my-reports' && (
                <MyReports
                  currentUser={currentUser}
                  reports={reports}
                  onViewDetail={setSelectedReportDetail}
                />
              )}

              {activeTab === 'notifications' && (
                <div className="card">
                  <h2 className="card-title">Employee Safety Alerts & Notifications</h2>
                  <p style={{ color: 'var(--text-muted)' }}>
                    No critical emergency directives currently broadcast for your operational zone.
                  </p>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                  <h2 className="card-title">Employee Profile</h2>
                  <div className="form-grid">
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NAME</span>
                      <div style={{ fontWeight: 700 }}>{currentUser.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EMPLOYEE ID</span>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{currentUser.userId}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DESIGNATION</span>
                      <div>{currentUser.designation}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEPARTMENT</span>
                      <div>{currentUser.department}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ADMIN VIEWS */}
          {!isEmployee && (
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  reports={reports}
                  language={language}
                  onNavigate={setActiveTab}
                  onSelectArea={handleSelectAreaDrilldown}
                />
              )}

              {(activeTab === 'all-reports' || activeTab === 'critical-reports') && (
                <AdminReportsTable
                  reports={activeTab === 'critical-reports' ? reports.filter(r => r.severity === 'Critical') : reports}
                  onViewDetail={setSelectedReportDetail}
                />
              )}

              {activeTab === 'reports-by-area' && (
                <ReportsByArea
                  reports={reports}
                  language={language}
                  selectedAreaFilter={selectedAreaFilter}
                  onViewDetail={setSelectedReportDetail}
                />
              )}



              {activeTab === 'employees' && (
                <div className="card">
                  <h2 className="card-title">Registered Personnel & HSE Coordinators</h2>
                  <p style={{ color: 'var(--text-muted)' }}>
                    Active personnel list for Duliajan Operational Facility.
                  </p>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="card">
                  <h2 className="card-title">Admin Broadcast & HSE Control Log</h2>
                  <p style={{ color: 'var(--text-muted)' }}>
                    System notifications generated from automatic area bifurcation alerts.
                  </p>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                  <h2 className="card-title">HSSE Management Settings</h2>
                  <p style={{ color: 'var(--text-muted)' }}>
                    Configure area risk severity thresholds, automatic email routing to department heads, and reporting templates.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Detailed Modal Popup */}
      {selectedReportDetail && (
        <ReportDetailModal
          report={selectedReportDetail}
          currentUser={currentUser}
          onClose={() => setSelectedReportDetail(null)}
          onUpdateReport={handleUpdateReport}
        />
      )}
    </div>
  );
}

