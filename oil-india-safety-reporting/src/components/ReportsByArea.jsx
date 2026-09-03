import React, { useState } from 'react';
import { Layers, MapPin, ArrowLeft, AlertTriangle, ShieldAlert, CheckCircle2, FileText, Eye } from 'lucide-react';
import { INDUSTRIAL_AREAS } from '../data/initialData';
import { TRANSLATIONS } from '../data/translations';

export default function ReportsByArea({ reports, language = 'en', selectedAreaFilter, onViewDetail }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [activeAreaCard, setActiveAreaCard] = useState(selectedAreaFilter || null);
  const [areaSearch, setAreaSearch] = useState('');

  // ── Area groups for card grid ──────────────────────────────
  const majorAreas = [
    "Pipeline Area / Pipeline Corridor",
    "Production Area",
    "Oil Storage Tank Farm",
    "Loading Area",
    "Drilling Rig Area",
    "Workshop",
    "Electrical Substation",
    "Chemical Storage Area",
    "Work at Height Area",
    "Vehicle Movement Area",
    "Welding / Hot Work Area",
    "Process Plant / Processing Unit"
  ];

  const areaGroups = {};
  (reports || []).forEach((r) => {
    const areaKey = r.area || 'General Area';
    if (!areaGroups[areaKey]) areaGroups[areaKey] = [];
    areaGroups[areaKey].push(r);
  });
  majorAreas.forEach((k) => { if (!areaGroups[k]) areaGroups[k] = []; });

  const sortedAreaKeys = Object.keys(areaGroups).sort(
    (a, b) => areaGroups[b].length - areaGroups[a].length
  );

  const filteredAreaKeys = sortedAreaKeys.filter((key) =>
    key.toLowerCase().includes(areaSearch.toLowerCase())
  );

  // ── Risk matrix logic (from AreaSafetyOverview) ────────────
  const riskStats = INDUSTRIAL_AREAS.slice(0, 14).map((areaName) => {
    const matched = (reports || []).filter((r) =>
      (r.area || '').toLowerCase().includes(areaName.toLowerCase().split('/')[0].trim())
    );
    const total = matched.length;
    const open = matched.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;
    const critical = matched.filter((r) => r.severity === 'Critical' || r.aiAnalysis?.sifPotential === 'Yes').length;
    const resolved = matched.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;

    let riskLevel = 'LOW';
    if (critical >= 2 || total >= 15) riskLevel = 'CRITICAL';
    else if (critical === 1 || open >= 3) riskLevel = 'HIGH';
    else if (total > 0) riskLevel = 'MODERATE';

    return { areaName, total, open, critical, resolved, riskLevel };
  });

  // ── Drilldown view ─────────────────────────────────────────
  if (activeAreaCard) {
    const areaReports = areaGroups[activeAreaCard] || reports.filter((r) => r.area === activeAreaCard);
    const totalRep = areaReports.length;
    const ucRep    = areaReports.filter((r) => r.type.includes('Condition')).length;
    const ueRep    = areaReports.filter((r) => r.type.includes('Event')).length;
    const critRep  = areaReports.filter((r) => r.severity === 'Critical').length;
    const openRep  = areaReports.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;
    const resRep   = areaReports.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;

    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveAreaCard(null)}
            style={{ marginBottom: '0.75rem' }}
          >
            <ArrowLeft size={16} /> Back to All Areas
          </button>
          <h1 style={{ color: 'var(--oil-navy-dark)', fontSize: '1.6rem' }}>
            {activeAreaCard} — Safety Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Area-specific Safety Observation &amp; Risk Management
          </p>
        </div>

        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Reports', value: totalRep, icon: <FileText size={20} />, cls: '' },
            { label: 'Unsafe Conditions (UC)', value: ucRep, icon: <AlertTriangle size={20} />, cls: 'kpi-info' },
            { label: 'Unsafe Events (UE)', value: ueRep, icon: <ShieldAlert size={20} />, cls: 'kpi-warning' },
            { label: 'Critical Risks', value: critRep, icon: <ShieldAlert size={20} color="#DC2626" />, cls: 'kpi-critical' },
            { label: 'Open / In Review', value: openRep, icon: <FileText size={20} />, cls: '' },
            { label: 'Resolved', value: resRep, icon: <CheckCircle2 size={20} />, cls: 'kpi-success' },
          ].map(({ label, value, icon, cls }) => (
            <div key={label} className={`kpi-card ${cls}`}>
              <div className="kpi-info-group">
                <span className="kpi-label">{label}</span>
                <span className="kpi-value">{value}</span>
              </div>
              <div className="kpi-icon-wrap">{icon}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            <Layers size={18} color="var(--oil-navy-main)" />
            Reports Under &ldquo;{activeAreaCard}&rdquo;
          </h3>
          {areaReports.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No UC / UE reports currently logged for this area.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Reported By</th>
                    <th>UC / UE</th>
                    <th>Landmark</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {areaReports.map((r) => (
                    <tr key={r.id}>
                      <td><span className="report-id-cell">{r.id}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                      <td>
                        <span className={`badge ${(r.reportType || r.type || '').includes('Condition') ? 'badge-uc' : 'badge-ue'}`}>
                          {(r.reportType || r.type || '').includes('Condition') ? 'UC' : 'UE'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.exactLocation || r.area}</td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.description}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.date}</td>
                      <td><span className={`badge badge-sev-${r.severity}`}>{r.severity}</span></td>
                      <td><span className={`badge badge-stat-${r.status.replace(/\s+/g, '-')}`}>{r.status}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onViewDetail(r)}>
                          <Eye size={14} /> Review
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

  // ── Main combined view ─────────────────────────────────────
  return (
    <div>
      {/* Page header + area filter */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Area Reports &amp; Safety Risk Matrix</h1>
          <p>Bifurcated risk classification and plant risk assessment for all industrial facility zones.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--oil-navy-dark)', whiteSpace: 'nowrap' }}>
            {t.selectArea}
          </label>
          <select
            className="form-control"
            style={{ width: '280px', fontWeight: 600, cursor: 'pointer' }}
            value={areaSearch}
            onChange={(e) => setAreaSearch(e.target.value)}
          >
            <option value="">{t.allAreas}</option>
            {INDUSTRIAL_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── SECTION 1: Plant Risk Matrix ─────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid var(--border-color)'
        }}>
          <ShieldAlert size={20} color="var(--oil-navy-main)" />
          <h2 style={{ fontSize: '1.1rem', color: 'var(--oil-navy-dark)', margin: 0 }}>
            Plant Risk Matrix
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            Instant facility risk assessment derived from report frequency &amp; severity thresholds
          </span>
        </div>

        <div className="area-grid">
          {riskStats.map((item) => {
            let riskBadgeClass = 'badge-sev-Low';
            if (item.riskLevel === 'MODERATE') riskBadgeClass = 'badge-sev-Medium';
            if (item.riskLevel === 'HIGH')     riskBadgeClass = 'badge-sev-High';
            if (item.riskLevel === 'CRITICAL') riskBadgeClass = 'badge-sev-Critical';

            const borderColor =
              item.riskLevel === 'CRITICAL' ? '#DC2626' :
              item.riskLevel === 'HIGH'     ? '#D97706' :
              item.riskLevel === 'MODERATE' ? '#2563EB' : '#059669';

            return (
              <div
                key={item.areaName}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `5px solid ${borderColor}` }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--oil-navy-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <MapPin size={15} color="var(--oil-navy-main)" />
                      {item.areaName}
                    </h3>
                    <span className={`badge ${riskBadgeClass}`} style={{ fontSize: '0.7rem' }}>
                      RISK: {item.riskLevel}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', background: '#F8FAFC', padding: '0.65rem', borderRadius: '8px' }}>
                    {[
                      { lbl: 'TOTAL', val: item.total, color: 'var(--oil-navy-dark)' },
                      { lbl: 'OPEN', val: item.open, color: item.open > 0 ? '#D97706' : 'var(--text-primary)' },
                      { lbl: 'CRITICAL', val: item.critical, color: item.critical > 0 ? '#DC2626' : 'var(--text-primary)' },
                      { lbl: 'RESOLVED', val: item.resolved, color: '#059669' },
                    ].map(({ lbl, val, color }) => (
                      <div key={lbl}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lbl}</span>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveAreaCard(item.areaName)}
                  >
                    View Reports →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: Area Report Cards ─────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid var(--border-color)'
      }}>
        <Layers size={20} color="var(--oil-navy-main)" />
        <h2 style={{ fontSize: '1.1rem', color: 'var(--oil-navy-dark)', margin: 0 }}>
          Area-Wise Report Bifurcation
        </h2>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
          Click any area card to view its full report drilldown
        </span>
      </div>

      <div className="area-grid">
        {filteredAreaKeys.map((areaKey) => {
          const areaReps = areaGroups[areaKey] || [];
          const count = areaReps.length;
          const ucC   = areaReps.filter((r) => r.type.includes('Condition')).length;
          const ueC   = areaReps.filter((r) => r.type.includes('Event')).length;
          const critC = areaReps.filter((r) => r.severity === 'Critical').length;
          const openC = areaReps.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;

          return (
            <div key={areaKey} className="area-card" onClick={() => setActiveAreaCard(areaKey)}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span className="area-card-title">{areaKey}</span>
                  {critC > 0 && (
                    <span className="badge badge-sev-Critical" style={{ fontSize: '0.7rem' }}>{critC} Critical</span>
                  )}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--oil-navy-dark)' }}>
                  {count} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Reports</span>
                </div>
              </div>
              <div className="area-card-stats-row">
                <div className="area-mini-stat">
                  <span>UC / UE</span>
                  <strong>{ucC} UC / {ueC} UE</strong>
                </div>
                <div className="area-mini-stat">
                  <span>Open</span>
                  <strong style={{ color: openC > 0 ? '#D97706' : 'var(--text-primary)' }}>{openC} Open</strong>
                </div>
                <div className="area-mini-stat" style={{ marginLeft: 'auto' }}>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                    View →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
