import React, { useState, useEffect, useRef } from 'react';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import EmployeeDashboard from './components/EmployeeDashboard';
import ReportForm from './components/ReportForm';
import MyReports from './components/MyReports';
import AdminDashboard from './components/AdminDashboard';
import ReportsByArea from './components/ReportsByArea';
import AdminReportsTable from './components/AdminReportsTable';
import AdminAiDashboard from './components/AdminAiDashboard';
import ReportDetailModal from './components/ReportDetailModal';
import { processReport } from './services/aiEngine';
import { MOCK_USERS } from './data/initialData';
import './styles/main.css';

const VISION_API = 'http://localhost:5001/api/vision/reports';
const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('oil_safety_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (_) {
      return null;
    }
  });

  // ── Submitted reports ────────────────────────────────────────────────────
  const [reports, setReports] = useState(() => {
    try {
      const demoCleared = localStorage.getItem('oil_demo_data_cleared_v5');
      if (!demoCleared) {
        localStorage.removeItem('oil_safety_reports');
        localStorage.setItem('oil_demo_data_cleared_v5', 'true');
        return [];
      }
      const saved = localStorage.getItem('oil_safety_reports');
      const parsed = saved ? JSON.parse(saved) : [];
      return (Array.isArray(parsed) ? parsed : []).map(r => {
        try {
          return r.aiAnalysis ? r : { ...r, aiAnalysis: processReport(r) };
        } catch (_) {
          return r;
        }
      });
    } catch (e) {
      console.error('Error initializing reports:', e);
      return [];
    }
  });

  // ── Draft reports ─────────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem('oil_safety_drafts');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  });

  // ── Draft being edited ────────────────────────────────────────────────────
  const [draftToEdit, setDraftToEdit] = useState(null);

  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [visionOnline, setVisionOnline] = useState(false);
  const seenVisionIds = useRef(new Set());

  // ── Sync reports to localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('oil_safety_reports', JSON.stringify(reports));
    } catch (e) {
      console.warn('localStorage quota exceeded, trimming old reports...', e);
      try {
        const trimmed = reports.slice(0, Math.max(10, Math.floor(reports.length * 0.8)));
        localStorage.setItem('oil_safety_reports', JSON.stringify(trimmed));
      } catch (_) {
        localStorage.removeItem('oil_safety_reports');
      }
    }
  }, [reports]);

  // ── Sync drafts to localStorage ───────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('oil_safety_drafts', JSON.stringify(drafts));
    } catch (_) {
      localStorage.removeItem('oil_safety_drafts');
    }
  }, [drafts]);

  // ── Vision backend polling ────────────────────────────────────────────────
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
            const existingIds = new Set(prev.map(p => p.id));
            const toAdd = newOnes.filter(r => !existingIds.has(r.id)).map(r => ({
              ...r,
              aiAnalysis: processReport(r)
            }));
            return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
          });
          showToast(`🤖 Vision AI filed ${newOnes.length} new violation report(s) automatically.`);
        }
      } catch (_) {
        setVisionOnline(false);
      }
    };
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => clearInterval(timer);
  }, []);

  // ── Sync user to localStorage ─────────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('oil_safety_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('oil_safety_user');
    }
  }, [currentUser]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    showToast(`Welcome, ${user.name}! Logged in as ${user.role}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedReportDetail(null);
    setSelectedAreaFilter(null);
    setDraftToEdit(null);
  };

  const handleSwitchRole = () => {
    const targetUser = currentUser.role === 'Admin' ? MOCK_USERS[0] : MOCK_USERS[1];
    setCurrentUser(targetUser);
    setActiveTab('dashboard');
    showToast(`Switched view to ${targetUser.name} (${targetUser.role})`);
  };

  // ── Report handlers ───────────────────────────────────────────────────────

  /** Called when employee submits a final report */
  const handleAddReport = (newReport, fromDraftId) => {
    // Run AI analysis on new report
    const aiResult = processReport(newReport);
    const reportWithAi = {
      ...newReport,
      aiAnalysis: aiResult,
    };

    setReports(prev => [reportWithAi, ...prev]);
    if (fromDraftId) {
      setDrafts(prev => prev.filter(d => d.id !== fromDraftId));
    }
    showToast(`✅ Report ${newReport.id} submitted! AI SIF Analysis: ${aiResult.sifPotential.toUpperCase()}`);
  };

  const handleUpdateReport = (updatedReport) => {
    // Re-run AI analysis if description or parameters updated
    const aiResult = processReport(updatedReport);
    const reportWithAi = {
      ...updatedReport,
      aiAnalysis: aiResult
    };
    setReports(prev => prev.map(r => r.id === updatedReport.id ? reportWithAi : r));
    showToast(`Report ${updatedReport.id} updated.`);
  };

  /** Save or update a draft */
  const handleSaveDraft = (draft) => {
    setDrafts(prev => {
      const exists = prev.find(d => d.id === draft.id);
      if (exists) return prev.map(d => d.id === draft.id ? draft : d);
      return [draft, ...prev];
    });
    showToast(`💾 Draft saved — you can continue later from My Reports.`);
  };

  /** Delete a draft */
  const handleDeleteDraft = (draftId) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    showToast('Draft deleted.');
  };

  /** Bulk delete submitted reports */
  const handleDeleteReports = (reportIds) => {
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    showToast(`🗑️ ${reportIds.length} report(s) permanently deleted.`);
  };

  /** Open a draft in the report form for editing */
  const handleEditDraft = (draft) => {
    setDraftToEdit(draft);
    setActiveTab('report-form');
  };

  /** Re-run AI Analysis on all reports */
  const handleReprocessAllAi = () => {
    setReports(prev => prev.map(r => ({ ...r, aiAnalysis: processReport(r) })));
    showToast('⚡ Re-run AI Analysis completed for all reports.');
  };

  const handleSelectAreaDrilldown = (areaName) => {
    setSelectedAreaFilter(areaName);
    setActiveTab('reports-by-area');
  };

  // ── Tab change ────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => {
    if (tab !== 'reports-by-area') setSelectedAreaFilter(null);
    if (tab !== 'report-form') setDraftToEdit(null);
    setActiveTab(tab);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const isEmployee = currentUser.role === 'Employee';
  const myDrafts = drafts.filter(d => d.employeeId === currentUser.userId);

  return (
    <div className="app-container">
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px',
          background: 'var(--oil-navy-dark)', color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: '8px',
          borderLeft: '4px solid var(--oil-gold)', boxShadow: 'var(--shadow-lg)',
          zIndex: 200, fontSize: '0.88rem', fontWeight: 600,
          maxWidth: '380px', lineHeight: '1.4',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <Header
        currentUser={currentUser}
        language={language}
        setLanguage={setLanguage}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        visionOnline={visionOnline}
      />

      <div className="main-wrapper">
        {/* Sidebar */}
        <Sidebar
          currentUser={currentUser}
          language={language}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          reports={reports}
          drafts={myDrafts}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <main className="content-body">

          {/* ── EMPLOYEE VIEWS ─────────────────────────────────────────── */}
          {isEmployee && (
            <>
              {activeTab === 'dashboard' && (
                <EmployeeDashboard
                  currentUser={currentUser}
                  language={language}
                  reports={reports}
                  drafts={myDrafts}
                  onNavigate={handleTabChange}
                  onViewDetail={setSelectedReportDetail}
                  onEditDraft={handleEditDraft}
                />
              )}

              {activeTab === 'report-form' && (
                <ReportForm
                  currentUser={currentUser}
                  language={language}
                  onSubmitReport={handleAddReport}
                  onNavigate={handleTabChange}
                  draftToEdit={draftToEdit}
                  onSaveDraft={handleSaveDraft}
                  onDeleteDraft={handleDeleteDraft}
                />
              )}

              {activeTab === 'my-reports' && (
                <MyReports
                  currentUser={currentUser}
                  reports={reports}
                  drafts={myDrafts}
                  onViewDetail={setSelectedReportDetail}
                  onEditDraft={handleEditDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onNavigate={handleTabChange}
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
                    {[
                      ['NAME', currentUser.name],
                      ['EMPLOYEE ID', currentUser.userId],
                      ['DESIGNATION', currentUser.designation],
                      ['DEPARTMENT', currentUser.department],
                      ['SITE', currentUser.site || currentUser.location],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</span>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ADMIN VIEWS ────────────────────────────────────────────── */}
          {!isEmployee && (
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  reports={reports}
                  language={language}
                  onNavigate={handleTabChange}
                  onSelectArea={handleSelectAreaDrilldown}
                />
              )}

              {activeTab === 'ai-dashboard' && (
                <AdminAiDashboard
                  reports={reports}
                  onViewDetail={setSelectedReportDetail}
                  onReprocessAll={handleReprocessAllAi}
                />
              )}

              {(activeTab === 'all-reports' || activeTab === 'critical-reports') && (
                <AdminReportsTable
                  reports={activeTab === 'critical-reports' ? reports.filter(r => r.severity === 'Critical' || r.aiAnalysis?.sifPotential === 'Yes') : reports}
                  onViewDetail={setSelectedReportDetail}
                  onDeleteReports={handleDeleteReports}
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
                  <p style={{ color: 'var(--text-muted)' }}>Active personnel list for Duliajan Operational Facility.</p>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="card">
                  <h2 className="card-title">Admin Broadcast & HSE Control Log</h2>
                  <p style={{ color: 'var(--text-muted)' }}>System notifications generated from automatic area bifurcation alerts.</p>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                  <h2 className="card-title">HSSE Management Settings</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Configure area risk severity thresholds, automatic email routing to department heads, and reporting templates.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Report Detail Modal */}
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
