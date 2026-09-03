import React, { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Cpu, AlertOctagon, ShieldAlert, Zap, Layers, Eye, RefreshCw, Filter
} from 'lucide-react';
import { LIFE_SAVING_RULES, getSIFColor } from '../services/aiEngine';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function AdminAiDashboard({ reports, onViewDetail, onReprocessAll }) {
  const [sifFilter, setSifFilter] = useState('All');
  const [lsrFilter, setLsrFilter] = useState('All');

  // Compute metrics
  const processedReports = reports.filter(r => r.aiAnalysis && r.aiAnalysis.status === 'analyzed');
  const totalProcessed = processedReports.length;

  const sifYes = processedReports.filter(r => r.aiAnalysis.sifPotential === 'Yes');
  const sifMaybe = processedReports.filter(r => r.aiAnalysis.sifPotential === 'Maybe');
  const sifNo = processedReports.filter(r => r.aiAnalysis.sifPotential === 'No');

  // LSR breakdown
  const lsrCounts = {};
  LIFE_SAVING_RULES.forEach(l => { lsrCounts[l.code] = 0; });

  processedReports.forEach(r => {
    const code = r.aiAnalysis?.lsrCode;
    if (code && lsrCounts[code] !== undefined) {
      lsrCounts[code]++;
    }
  });

  const lsrLabels = LIFE_SAVING_RULES.map(l => l.code);
  const lsrDataValues = LIFE_SAVING_RULES.map(l => lsrCounts[l.code]);
  const lsrColors = LIFE_SAVING_RULES.map(l => l.color);

  const lsrChartData = {
    labels: LIFE_SAVING_RULES.map(l => `${l.code}: ${l.name}`),
    datasets: [{
      label: 'Violations / Incidents Matched',
      data: lsrDataValues,
      backgroundColor: lsrColors,
      borderRadius: 6
    }]
  };

  // Hazard breakdown
  const hazardCounts = {};
  processedReports.forEach(r => {
    const h = r.aiAnalysis?.hazard || 'Unclassified';
    hazardCounts[h] = (hazardCounts[h] || 0) + 1;
  });

  const hazardLabels = Object.keys(hazardCounts);
  const hazardDataValues = Object.values(hazardCounts);

  const hazardChartData = {
    labels: hazardLabels,
    datasets: [{
      data: hazardDataValues,
      backgroundColor: [
        '#003366', '#D97706', '#DC2626', '#10B981', '#0284C7',
        '#9333EA', '#7C3AED', '#78350F', '#047857', '#BE185D'
      ]
    }]
  };

  // SIF Hotspots by Area
  const areaSifCounts = {};
  processedReports.forEach(r => {
    if (r.aiAnalysis?.sifPotential === 'Yes' || r.aiAnalysis?.sifPotential === 'Maybe') {
      const area = r.area || 'Unknown';
      if (!areaSifCounts[area]) {
        areaSifCounts[area] = { total: 0, yes: 0, maybe: 0, topLsr: {} };
      }
      areaSifCounts[area].total++;
      if (r.aiAnalysis.sifPotential === 'Yes') areaSifCounts[area].yes++;
      else areaSifCounts[area].maybe++;

      const lsr = r.aiAnalysis.lifeSavingRule;
      if (lsr) {
        areaSifCounts[area].topLsr[lsr] = (areaSifCounts[area].topLsr[lsr] || 0) + 1;
      }
    }
  });

  const hotspotAreas = Object.keys(areaSifCounts).map(area => {
    const data = areaSifCounts[area];
    let topLsrName = 'None';
    let maxLsrCount = 0;
    Object.keys(data.topLsr).forEach(l => {
      if (data.topLsr[l] > maxLsrCount) {
        maxLsrCount = data.topLsr[l];
        topLsrName = l;
      }
    });
    return { area, ...data, topLsrName };
  }).sort((a, b) => b.total - a.total);

  // Filtered table
  const filteredReportsList = processedReports.filter(r => {
    if (sifFilter !== 'All' && r.aiAnalysis?.sifPotential !== sifFilter) return false;
    if (lsrFilter !== 'All' && r.aiAnalysis?.lsrCode !== lsrFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header Row */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu color="var(--oil-navy-main)" size={26} />
            AI Safety Precursor & SIF Analytics
          </h1>
          <p>
            NLP-driven Serious Injury & Fatality (SIF) potential analysis and Life-Saving Rule violation tracking.
          </p>
        </div>
        {onReprocessAll && (
          <button className="btn btn-secondary btn-sm" onClick={onReprocessAll}>
            <RefreshCw size={14} /> Re-run AI Analysis
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-critical">
          <div className="kpi-info-group">
            <span className="kpi-label">SIF Potential — YES</span>
            <span className="kpi-value">{sifYes.length}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            <AlertOctagon size={24} />
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-info-group">
            <span className="kpi-label">SIF Potential — MAYBE</span>
            <span className="kpi-value">{sifMaybe.length}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <ShieldAlert size={24} />
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-info-group">
            <span className="kpi-label">Low / Non-SIF Reports</span>
            <span className="kpi-value">{sifNo.length}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <Zap size={24} />
          </div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-info-group">
            <span className="kpi-label">Total AI Processed</span>
            <span className="kpi-value">{totalProcessed}</span>
          </div>
          <div className="kpi-icon-wrap">
            <Cpu size={24} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Chart 1: Life-Saving Rules */}
        <div className="card chart-card" style={{ height: '360px' }}>
          <h3 className="card-title">
            <ShieldAlert size={18} color="var(--oil-navy-main)" />
            Life-Saving Rule (LSR) Precursor Breakdown
          </h3>
          <div className="chart-container-box">
            <Bar data={lsrChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Chart 2: Hazard Types */}
        <div className="card chart-card" style={{ height: '360px' }}>
          <h3 className="card-title">
            <Layers size={18} color="var(--oil-navy-main)" />
            AI Extracted Hazard Taxonomy
          </h3>
          <div className="chart-container-box">
            <Doughnut data={hazardChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
          </div>
        </div>
      </div>

      {/* SIF Hotspots Table */}
      <div className="card" style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>
          <AlertOctagon size={18} color="#DC2626" />
          Area-wise SIF Hotspots & High-Risk Zones
        </h3>
        {hotspotAreas.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No SIF potential reports registered across facilities.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Facility Area</th>
                  <th>SIF Potential (Yes)</th>
                  <th>SIF Potential (Maybe)</th>
                  <th>Total High-Risk Precursors</th>
                  <th>Top Violated LSR</th>
                  <th>Risk Action Required</th>
                </tr>
              </thead>
              <tbody>
                {hotspotAreas.map(h => (
                  <tr key={h.area}>
                    <td style={{ fontWeight: 700 }}>{h.area}</td>
                    <td>
                      <span className="badge badge-sif-yes">{h.yes}</span>
                    </td>
                    <td>
                      <span className="badge badge-sif-maybe">{h.maybe}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--oil-navy-dark)' }}>{h.total}</td>
                    <td>
                      <span className="badge badge-ns">{h.topLsrName}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: h.yes > 0 ? '#DC2626' : '#D97706', fontWeight: 600 }}>
                        {h.yes > 0 ? '⚠️ Immediate Barrier Audit Needed' : '⚡ Enhanced Precursor Inspection'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Analyzed Reports Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <Cpu size={18} color="var(--oil-navy-main)" />
            AI Classified Reports List
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.8rem' }}
              value={sifFilter}
              onChange={e => setSifFilter(e.target.value)}
            >
              <option value="All">All SIF Levels</option>
              <option value="Yes">SIF: Yes Only</option>
              <option value="Maybe">SIF: Maybe Only</option>
              <option value="No">SIF: No Only</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.8rem' }}
              value={lsrFilter}
              onChange={e => setLsrFilter(e.target.value)}
            >
              <option value="All">All LSR Rules</option>
              {LIFE_SAVING_RULES.map(l => (
                <option key={l.code} value={l.code}>{l.code}: {l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>SIF Potential</th>
                <th>Life-Saving Rule</th>
                <th>Hazard Extracted</th>
                <th>Barrier Failure</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReportsList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No reports match the selected AI filters.
                  </td>
                </tr>
              ) : (
                filteredReportsList.map(r => {
                  const ai = r.aiAnalysis;
                  return (
                    <tr key={r.id}>
                      <td><span className="report-id-cell">{r.id}</span></td>
                      <td>
                        <span className={`badge-sif-${(ai.sifPotential || 'no').toLowerCase()}`}>
                          {ai.sifPotential}
                        </span>
                      </td>
                      <td>
                        {ai.lsrCode ? (
                          <span className="badge badge-ns" style={{ borderLeft: `3px solid ${ai.lsrColor || '#003366'}` }}>
                            {ai.lsrCode}: {ai.lifeSavingRule}
                          </span>
                        ) : (
                          <span className="badge badge-ns">{ai.lifeSavingRule}</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{ai.hazard}</td>
                      <td style={{ fontSize: '0.8rem', color: ai.barrierFailure !== 'Not Identified' ? '#B91C1C' : 'var(--text-muted)' }}>
                        {ai.barrierFailure}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{ai.confidence}</span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onViewDetail(r)}>
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
