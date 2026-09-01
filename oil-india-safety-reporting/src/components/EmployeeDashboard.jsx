import React from 'react';
import { FilePlus, FileText, AlertCircle, Clock, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';

export default function EmployeeDashboard({ currentUser, language = 'en', reports, onNavigate, onViewDetail }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const empReports = reports.filter((r) => r.employeeId === currentUser.userId);

  const totalSubmitted = empReports.length;
  const openReports = empReports.filter((r) => r.status === 'Submitted').length;
  const underReview = empReports.filter((r) => r.status === 'Under Review' || r.status === 'Action Assigned' || r.status === 'In Progress').length;
  const resolvedReports = empReports.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;

  return (
    <div>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #00223E 0%, #003366 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '1.75rem 2rem',
        marginBottom: '1.75rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: '6px solid var(--oil-gold)'
      }}>
        <div>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {currentUser.location}
          </span>
          <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '0.4rem', fontWeight: 800 }}>
            {t.welcome}, {currentUser.name}!
          </h2>
          <p style={{ color: '#E2E8F0', fontSize: '0.9rem', marginTop: '0.25rem', maxWidth: '600px' }}>
            {t.welcomeSub}
          </p>
        </div>

        <button
          className="btn btn-gold"
          style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
          onClick={() => onNavigate('report-form')}
        >
          <FilePlus size={20} />
          {t.reportBtn}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info-group">
            <span className="kpi-label">{t.totalSubmitted}</span>
            <span className="kpi-value">{totalSubmitted}</span>
          </div>
          <div className="kpi-icon-wrap">
            <FileText size={24} />
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-info-group">
            <span className="kpi-label">{t.submittedOpen}</span>
            <span className="kpi-value">{openReports}</span>
          </div>
          <div className="kpi-icon-wrap">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-info-group">
            <span className="kpi-label">{t.underReviewActive}</span>
            <span className="kpi-value">{underReview}</span>
          </div>
          <div className="kpi-icon-wrap">
            <Clock size={24} />
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-info-group">
            <span className="kpi-label">{t.resolvedClosed}</span>
            <span className="kpi-value">{resolvedReports}</span>
          </div>
          <div className="kpi-icon-wrap">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <Clock size={18} color="var(--oil-navy-main)" />
            My Recent Safety Submissions
          </h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('my-reports')}
          >
            View All My Reports ({empReports.length})
            <ArrowRight size={14} />
          </button>
        </div>

        {empReports.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            You haven't submitted any safety reports yet. Click "Report Unsafe Condition / Event" above to create one.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Type</th>
                  <th>Industrial Area</th>
                  <th>Description</th>
                  <th>Date & Time</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {empReports.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="report-id-cell">{r.id}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.type.includes('Condition') ? 'badge-uc' : 'badge-ue'}`}>
                        {r.type.includes('Condition') ? 'UC' : 'UE'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.area}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description || 'Photo attached'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.date}</td>
                    <td>
                      <span className={`badge badge-sev-${r.severity}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-stat-${r.status.replace(/\s+/g, '-')}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewDetail(r)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

