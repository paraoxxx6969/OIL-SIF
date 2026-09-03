import React from 'react';
import { FilePlus, FileText, AlertCircle, Clock, CheckCircle2, Edit3, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';

const getTypeBadgeClass = (type = '') => {
  if (type.includes('Act')) return 'badge-ua';
  if (type.includes('Condition')) return 'badge-uc';
  if (type.includes('Near')) return 'badge-nm';
  if (type.includes('Incident')) return 'badge-inc';
  return 'badge-ns';
};

const getTypeCode = (type = '') => {
  if (type.includes('Act')) return 'UA';
  if (type.includes('Condition')) return 'UC';
  if (type.includes('Near')) return 'NM';
  if (type.includes('Incident')) return 'INC';
  if (type.includes('Not Sure')) return 'NS';
  // Legacy fallback
  if (type.includes('Event')) return 'UE';
  return 'NS';
};

export default function EmployeeDashboard({
  currentUser, language = 'en', reports, drafts = [],
  onNavigate, onViewDetail, onEditDraft
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const empReports = reports.filter(r => r.employeeId === currentUser.userId && !r.isDraft);

  const totalSubmitted = empReports.length;
  const underReview    = empReports.filter(r => ['Submitted', 'Under Review', 'Action Assigned', 'In Progress'].includes(r.status)).length;
  const resolved       = empReports.filter(r => ['Resolved', 'Closed'].includes(r.status)).length;

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #00223E 0%, #003366 100%)',
        color: 'white', borderRadius: '12px', padding: '1.75rem 2rem',
        marginBottom: '1.75rem', boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderLeft: '6px solid var(--oil-gold)'
      }}>
        <div>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {currentUser.site || currentUser.location}
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
          style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', flexShrink: 0 }}
          onClick={() => onNavigate('report-form')}
        >
          <FilePlus size={20} />
          {t.reportBtn}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info-group">
            <span className="kpi-label">{t.totalSubmitted}</span>
            <span className="kpi-value">{totalSubmitted}</span>
          </div>
          <div className="kpi-icon-wrap"><FileText size={24} /></div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-info-group">
            <span className="kpi-label">Under Review / Active</span>
            <span className="kpi-value">{underReview}</span>
          </div>
          <div className="kpi-icon-wrap"><Clock size={24} /></div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-info-group">
            <span className="kpi-label">{t.resolvedClosed}</span>
            <span className="kpi-value">{resolved}</span>
          </div>
          <div className="kpi-icon-wrap"><CheckCircle2 size={24} /></div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-info-group">
            <span className="kpi-label">Saved Drafts</span>
            <span className="kpi-value">{drafts.length}</span>
          </div>
          <div className="kpi-icon-wrap"><Edit3 size={24} /></div>
        </div>
      </div>

      {/* Saved Drafts section */}
      {drafts.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #FCD34D' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ margin: 0, color: '#92400E' }}>
              <Edit3 size={17} color="#D97706" /> Saved Drafts — Continue Where You Left Off
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {drafts.slice(0, 3).map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px',
                padding: '0.6rem 0.9rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className={`badge badge-draft`}>DRAFT</span>
                  <span className={`badge ${getTypeBadgeClass(d.reportType)}`}>{getTypeCode(d.reportType)}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {d.area || d.site || 'Location not set'}
                  </span>
                  {d.description && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      — {d.description}
                    </span>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => onEditDraft(d)}>
                  <Edit3 size={13} /> Continue Editing
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <Clock size={18} color="var(--oil-navy-main)" /> My Recent Safety Submissions
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('my-reports')}>
            View All ({empReports.length}) <ArrowRight size={14} />
          </button>
        </div>

        {empReports.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            You haven't submitted any safety reports yet.
            <br />
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => onNavigate('report-form')}>
              <FilePlus size={16} /> Report a Safety Issue
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {empReports.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td><span className="report-id-cell">{r.id}</span></td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(r.reportType || r.type)}`}>
                        {getTypeCode(r.reportType || r.type)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.area}</td>
                    <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {r.description || 'Photo attached'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {r.eventDate || r.date}
                    </td>
                    <td>
                      <span className={`badge badge-stat-${r.status?.replace(/\s+/g, '-')}`}>{r.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => onViewDetail(r)}>Details</button>
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
