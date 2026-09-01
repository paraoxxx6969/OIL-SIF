import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown, Image as ImageIcon, Eye, Download } from 'lucide-react';
import { INDUSTRIAL_AREAS } from '../data/initialData';

export default function AdminReportsTable({ reports, onViewDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');
  const [sortBy, setSortBy] = useState('Newest First');

  const filteredReports = reports.filter((r) => {
    // Area Filter
    if (filterArea !== 'All') {
      if (!r.area.toLowerCase().includes(filterArea.toLowerCase())) return false;
    }
    // Type Filter
    if (filterType !== 'All') {
      if (filterType === 'UC' && !r.type.includes('Condition')) return false;
      if (filterType === 'UE' && !r.type.includes('Event')) return false;
    }
    // Severity Filter
    if (filterSeverity !== 'All' && r.severity !== filterSeverity) return false;
    // Status Filter
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;

    // Date Filter (mock evaluation)
    if (filterDateRange === 'Today') {
      if (!r.date.includes('2026-08-30') && !r.date.includes('2026-08-31')) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchEmp = (r.employeeName || '').toLowerCase().includes(q) || (r.employeeId || '').toLowerCase().includes(q);
      const matchArea = r.area.toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchId && !matchEmp && !matchArea && !matchDesc) return false;
    }

    return true;
  });

  // Sorting
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === 'Newest First') {
      return b.id.localeCompare(a.id);
    }
    if (sortBy === 'Oldest First') {
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'Highest Severity') {
      const sevMap = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return sevMap[b.severity] - sevMap[a.severity];
    }
    if (sortBy === 'Area') {
      return a.area.localeCompare(b.area);
    }
    if (sortBy === 'Status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>All Industrial Safety Reports</h1>
          <p>Comprehensive report audit table with multi-parameter filtering, sorting, and administrative status management.</p>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Report ID, employee, location or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter by Area */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              AREA / LOCATION
            </label>
            <select
              className="form-control"
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
            >
              <option value="All">All Areas</option>
              <option value="Pipeline">Pipeline Area</option>
              <option value="Production">Production Area</option>
              <option value="Storage">Storage Tank Farm</option>
              <option value="Loading">Loading Area</option>
              <option value="Workshop">Workshop</option>
              <option value="Electrical">Electrical Substation</option>
              <option value="Chemical">Chemical Storage</option>
              <option value="Drilling">Drilling Rig Area</option>
              <option value="Vehicle">Vehicle Movement Area</option>
            </select>
          </div>

          {/* Filter by Type */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              REPORT TYPE
            </label>
            <select
              className="form-control"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types (UC & UE)</option>
              <option value="UC">Unsafe Condition (UC)</option>
              <option value="UE">Unsafe Event (UE)</option>
            </select>
          </div>

          {/* Filter by Severity */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              SEVERITY LEVEL
            </label>
            <select
              className="form-control"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              RESOLUTION STATUS
            </label>
            <select
              className="form-control"
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

          {/* Filter by Date */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              DATE RANGE
            </label>
            <select
              className="form-control"
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              SORT BY
            </label>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Highest Severity">Highest Severity</option>
              <option value="Area">Area Name</option>
              <option value="Status">Status</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <div>
            Showing <strong>{sortedReports.length}</strong> of {reports.length} total safety reports
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchQuery('');
              setFilterArea('All');
              setFilterType('All');
              setFilterSeverity('All');
              setFilterStatus('All');
              setFilterDateRange('All');
              setSortBy('Newest First');
            }}
          >
            Reset All Filters
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Evidence</th>
              <th>Reporter / Employee</th>
              <th>Type</th>
              <th>Industrial Area</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedReports.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No safety reports found matching your specified filter criteria.
                </td>
              </tr>
            ) : (
              sortedReports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="report-id-cell">{r.id}</span>
                    {r.autoFiled && (
                      <span style={{
                        display: 'inline-block', marginLeft: '5px',
                        background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                        color: '#fff', fontSize: '0.62rem', fontWeight: 800,
                        padding: '1px 5px', borderRadius: '4px',
                        letterSpacing: '0.3px', verticalAlign: 'middle'
                      }}>🤖 AUTO</span>
                    )}
                  </td>
                  <td>
                    {r.images && r.images.length > 0 ? (
                      <img src={r.images[0]} alt="Evidence" className="thumb-img" />
                    ) : (
                      <div className="no-img-placeholder"><ImageIcon size={16} /></div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.employeeName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.employeeId}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.type.includes('Condition') ? 'badge-uc' : 'badge-ue'}`}>
                      {r.type.includes('Condition') ? 'UC' : 'UE'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.area}
                  </td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description}
                  </td>
                  <td><span className={`badge badge-sev-${r.severity}`}>{r.severity}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td><span className={`badge badge-stat-${r.status.replace(/\s+/g, '-')}`}>{r.status}</span></td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => onViewDetail(r)}>
                      Review
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

