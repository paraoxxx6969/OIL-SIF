import React, { useState } from 'react';
import { Search, Filter, Image as ImageIcon, Eye } from 'lucide-react';

export default function MyReports({ currentUser, reports, onViewDetail }) {
  const empReports = reports.filter((r) => r.employeeId === currentUser.userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredReports = empReports.filter((r) => {
    if (filterType !== 'All') {
      if (filterType === 'UC' && !r.type.includes('Condition')) return false;
      if (filterType === 'UE' && !r.type.includes('Event')) return false;
    }
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchArea = r.area.toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchId && !matchArea && !matchDesc) return false;
    }

    return true;
  });

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>My Submitted Safety Reports</h1>
          <p>Track resolution progress and administrator remarks on your reported Unsafe Conditions & Events.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Report ID, Area, Description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types (UC & UE)</option>
              <option value="UC">Unsafe Condition (UC)</option>
              <option value="UE">Unsafe Event (UE)</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Action Assigned">Action Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Thumbnail</th>
              <th>Type</th>
              <th>Industrial Area</th>
              <th>Description</th>
              <th>Date</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Admin Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No safety reports found matching your selected filters.
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="report-id-cell">{r.id}</span>
                  </td>
                  <td>
                    {r.images && r.images.length > 0 ? (
                      <img src={r.images[0]} alt="Thumbnail" className="thumb-img" />
                    ) : (
                      <div className="no-img-placeholder">
                        <ImageIcon size={16} />
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.type.includes('Condition') ? 'badge-uc' : 'badge-ue'}`}>
                      {r.type.includes('Condition') ? 'UC' : 'UE'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.area}</td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description || 'Photo attached'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td>
                    <span className={`badge badge-sev-${r.severity}`}>{r.severity}</span>
                  </td>
                  <td>
                    <span className={`badge badge-stat-${r.status.replace(/\s+/g, '-')}`}>{r.status}</span>
                  </td>
                  <td style={{ maxWidth: '200px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {r.adminRemarks || <em style={{ color: 'var(--text-muted)' }}>Awaiting review...</em>}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewDetail(r)}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

