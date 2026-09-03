import React, { useState } from 'react';
import { Search, Eye, Edit3, Trash2, Image as ImageIcon, FilePlus } from 'lucide-react';

const getTypeBadgeClass = (type = '') => {
  if (type.includes('Act')) return 'badge-ua';
  if (type.includes('Condition') || type === 'UC') return 'badge-uc';
  if (type.includes('Near')) return 'badge-nm';
  if (type.includes('Incident')) return 'badge-inc';
  if (type.includes('Event')) return 'badge-ue';  // legacy
  return 'badge-ns';
};

const getTypeCode = (type = '') => {
  if (type.includes('Act')) return 'UA';
  if (type.includes('Condition')) return 'UC';
  if (type.includes('Near')) return 'NM';
  if (type.includes('Incident')) return 'INC';
  if (type.includes('Not Sure')) return 'NS';
  if (type.includes('Event')) return 'UE';
  return 'NS';
};

export default function MyReports({
  currentUser, reports, drafts = [],
  onViewDetail, onEditDraft, onDeleteDraft, onNavigate
}) {
  const empReports = reports.filter(r => r.employeeId === currentUser.userId && !r.isDraft);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterArea, setFilterArea]   = useState('All');
  const [showDrafts, setShowDrafts]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Unique areas from submitted reports
  const areaOptions = ['All', ...Array.from(new Set(empReports.map(r => r.area).filter(Boolean)))];

  const filteredReports = empReports.filter(r => {
    if (filterType !== 'All') {
      const code = getTypeCode(r.reportType || r.type);
      if (code !== filterType) return false;
    }
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;
    if (filterArea !== 'All' && r.area !== filterArea) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId   = (r.id || '').toLowerCase().includes(q);
      const matchArea = (r.area || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchId && !matchArea && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>My Safety Reports</h1>
          <p>Track your submitted reports and manage saved drafts.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onNavigate?.('report-form')}>
          <FilePlus size={15} /> New Report
        </button>
      </div>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${!showDrafts ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setShowDrafts(false)}
        >
          Submitted Reports ({empReports.length})
        </button>
        <button
          className={`btn ${showDrafts ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setShowDrafts(true)}
        >
          Saved Drafts ({drafts.length})
        </button>
      </div>

      {/* ── DRAFTS VIEW ──────────────────────────────────────────────────── */}
      {showDrafts && (
        <>
          {drafts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No saved drafts. Start a report and click "Save Draft" to continue later.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {drafts.map(d => (
                <div key={d.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-draft">DRAFT</span>
                      {d.reportType && (
                        <span className={`badge ${getTypeBadgeClass(d.reportType)}`}>{getTypeCode(d.reportType)}</span>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {d.site || '—'} {d.area ? `· ${d.area}` : ''}
                        </div>
                        {d.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => onEditDraft?.(d)}>
                        <Edit3 size={13} /> Continue
                      </button>
                      {confirmDeleteId === d.id ? (
                        <>
                          <button className="btn btn-sm" style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
                            onClick={() => { onDeleteDraft?.(d.id); setConfirmDeleteId(null); }}>
                            Confirm Delete
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-secondary btn-sm" style={{ color: '#DC2626' }} onClick={() => setConfirmDeleteId(d.id)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SUBMITTED REPORTS VIEW ────────────────────────────────────────── */}
      {!showDrafts && (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search by Report ID, area, description…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type filter */}
              <select className="form-control" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                <option value="UA">Unsafe Act (UA)</option>
                <option value="UC">Unsafe Condition (UC)</option>
                <option value="NM">Near Miss (NM)</option>
                <option value="INC">Incident (INC)</option>
                <option value="NS">Not Sure (NS)</option>
                <option value="UE">Legacy UE</option>
              </select>

              {/* Status filter */}
              <select className="form-control" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Action Assigned">Action Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Area filter */}
              <select className="form-control" style={{ width: 'auto' }} value={filterArea} onChange={e => setFilterArea(e.target.value)}>
                {areaOptions.map(a => <option key={a} value={a}>{a === 'All' ? 'All Areas' : a}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Photo</th>
                  <th>Type</th>
                  <th>Site / Area</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Admin Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No safety reports found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map(r => (
                    <tr key={r.id}>
                      <td><span className="report-id-cell">{r.id}</span></td>
                      <td>
                        {r.images?.length > 0 ? (
                          <img src={r.images[0]} alt="Thumbnail" className="thumb-img" />
                        ) : (
                          <div className="no-img-placeholder"><ImageIcon size={15} /></div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getTypeBadgeClass(r.reportType || r.type)}`}>
                          {getTypeCode(r.reportType || r.type)}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.area}</div>
                        {r.site && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.site}</div>}
                      </td>
                      <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {r.description || <em style={{ color: 'var(--text-muted)' }}>Photo only</em>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {r.eventDate || r.date}
                      </td>
                      <td>
                        <span className={`badge badge-stat-${r.status?.replace(/\s+/g, '-')}`}>{r.status}</span>
                      </td>
                      <td style={{ maxWidth: '180px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {r.adminRemarks || <em style={{ color: 'var(--text-muted)' }}>Awaiting review…</em>}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onViewDetail(r)}>
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
