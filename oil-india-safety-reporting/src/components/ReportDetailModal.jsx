import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Save, FileText, Cpu, AlertTriangle } from 'lucide-react';
import { DEPARTMENTS } from '../data/initialData';
import AiAnalysisPanel from './AiAnalysisPanel';

export default function ReportDetailModal({ report, currentUser, onClose, onUpdateReport }) {
  const isAdmin = currentUser.role === 'Admin';

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'details'
  const [severity, setSeverity] = useState(report.severity || 'Medium');
  const [status, setStatus] = useState(report.status || 'Submitted');
  const [remarks, setRemarks] = useState(report.adminRemarks || '');
  const [assignedDepartment, setAssignedDepartment] = useState(report.assignedDepartment || DEPARTMENTS[0]);
  const [assignedPerson, setAssignedPerson] = useState(report.assignedPerson || '');
  const [targetDate, setTargetDate] = useState(report.targetDate || '');
  const [activeEnlargedImage, setActiveEnlargedImage] = useState(null);

  const handleSave = (forcedStatus = null) => {
    const finalStatus = forcedStatus || status;

    const updated = {
      ...report,
      severity,
      status: finalStatus,
      adminRemarks: remarks.trim(),
      assignedDepartment,
      assignedPerson: assignedPerson.trim(),
      targetDate
    };

    onUpdateReport(updated);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="report-id-cell" style={{ fontSize: '1rem', padding: '0.3rem 0.6rem' }}>
              {report.id}
            </span>
            <span className="badge badge-uc">
              {report.reportType || report.type}
            </span>
            {report.aiAnalysis?.sifPotential && (
              <span className={`badge-sif-${(report.aiAnalysis.sifPotential || 'no').toLowerCase()}`}>
                SIF: {report.aiAnalysis.sifPotential}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#F8FAFC', padding: '0 1.25rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', marginTop: '0.5rem', marginRight: '0.5rem', gap: '0.35rem' }}
            onClick={() => setActiveTab('ai')}
          >
            <Cpu size={15} /> AI NLP Analysis
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'details' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', marginTop: '0.5rem', gap: '0.35rem' }}
            onClick={() => setActiveTab('details')}
          >
            <FileText size={15} /> Report Details & Workflow
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* TAB 1: AI NLP Analysis */}
          {activeTab === 'ai' && (
            <div>
              <AiAnalysisPanel aiAnalysis={report.aiAnalysis} />
            </div>
          )}

          {/* TAB 2: Report Details & Workflow */}
          {activeTab === 'details' && (
            <>
              {/* Report Information */}
              <div style={{ marginBottom: '1.5rem', background: '#F8FAFC', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--oil-navy-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={18} color="var(--oil-navy-main)" />
                  Observation Details
                </h3>

                <div className="form-grid" style={{ gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>REPORTED BY</span>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--oil-navy-dark)' }}>{report.employeeName}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {report.employeeId}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>DATE & TIME</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{report.eventDate || report.date} {report.eventTime || ''}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>INDUSTRIAL AREA & SITE</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{report.area}</div>
                    {report.site && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Site: {report.site}</div>}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>EXACT LANDMARK & EQUIPMENT</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{report.specificLocation || 'N/A'}</div>
                    {report.equipment && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Asset: {report.equipment}</div>}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>EMPLOYEE DESCRIPTION</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {report.description || <em style={{ color: 'var(--text-muted)' }}>No written description provided. Evidence photo attached below.</em>}
                  </p>
                </div>

                {/* Photos */}
                {report.images && report.images.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>UPLOADED EVIDENCE PHOTOS</span>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {report.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Evidence ${i}`}
                          style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-color)', cursor: 'pointer' }}
                          onClick={() => setActiveEnlargedImage(img)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Review Section */}
              {isAdmin ? (
                <div style={{ background: '#FFFFFF', border: '2px solid var(--oil-navy-main)', padding: '1.25rem', borderRadius: '10px' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--oil-navy-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldAlert size={18} color="var(--oil-gold)" />
                    Safety Admin Audit & Corrective Action Review
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Resolution Status</label>
                      <select
                        className="form-control"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Action Assigned">Action Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Assign Responsible Department</label>
                      <select
                        className="form-control"
                        value={assignedDepartment}
                        onChange={(e) => setAssignedDepartment(e.target.value)}
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Responsible Person / Team Lead</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Subhash Mech (Lead Engg)"
                        value={assignedPerson}
                        onChange={(e) => setAssignedPerson(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Resolution Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Admin Directives / HSE Action Remarks</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Enter instructions, corrective action findings, or closure notes..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Employee View of Admin Review */
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '1.25rem', borderRadius: '10px' }}>
                  <h4 style={{ color: '#B45309', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    HSE Admin Directives & Status
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#78350F' }}>
                    <strong>Remarks: </strong> {report.adminRemarks || 'Report is currently under initial review by safety officers.'}
                  </p>
                  {report.assignedDepartment && (
                    <div style={{ fontSize: '0.82rem', marginTop: '0.5rem', color: '#92400E' }}>
                      Assigned Dept: <strong>{report.assignedDepartment}</strong> • Lead: <strong>{report.assignedPerson || 'N/A'}</strong>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Window
          </button>

          {isAdmin && activeTab === 'details' && (
            <>
              <button className="btn btn-primary" onClick={() => handleSave()}>
                <Save size={16} /> Save Review
              </button>
              <button className="btn btn-gold" onClick={() => handleSave('Action Assigned')}>
                Assign Action
              </button>
              <button className="btn btn-success" onClick={() => handleSave('Resolved')}>
                <CheckCircle2 size={16} /> Mark Resolved
              </button>
            </>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {activeEnlargedImage && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setActiveEnlargedImage(null)}
        >
          <img src={activeEnlargedImage} alt="Enlarged" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}
    </div>
  );
}
