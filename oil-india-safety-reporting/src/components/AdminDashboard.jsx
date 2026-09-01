import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Layers, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard({ reports, language = 'en', onNavigate, onSelectArea }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const total = reports.length;
  const ucCount = reports.filter((r) => r.type.includes('Condition')).length;
  const ueCount = reports.filter((r) => r.type.includes('Event')).length;
  const criticalCount = reports.filter((r) => r.severity === 'Critical').length;
  const openCount = reports.filter((r) => r.status === 'Submitted').length;
  const underReviewCount = reports.filter((r) => r.status === 'Under Review' || r.status === 'Action Assigned' || r.status === 'In Progress').length;
  const resolvedCount = reports.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const reportsToday = reports.filter((r) => r.date.includes(todayStr)).length;

  // Chart 1: Reports by Area
  const areaCounts = {};
  reports.forEach((r) => {
    const mainArea = r.area.split('/')[0].trim();
    areaCounts[mainArea] = (areaCounts[mainArea] || 0) + 1;
  });

  const barLabels = Object.keys(areaCounts);
  const barValues = Object.values(areaCounts);

  const areaChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Safety Reports',
        data: barValues,
        backgroundColor: '#003366',
        borderRadius: 6
      }
    ]
  };

  // Chart 2: UC vs UE
  const ucUeData = {
    labels: ['Unsafe Conditions (UC)', 'Unsafe Events / Acts (UE)'],
    datasets: [
      {
        data: [ucCount, ueCount],
        backgroundColor: ['#1D4ED8', '#9D174D'],
        borderWidth: 2
      }
    ]
  };

  // Chart 3: Severity Breakdown
  const sevLow = reports.filter((r) => r.severity === 'Low').length;
  const sevMed = reports.filter((r) => r.severity === 'Medium').length;
  const sevHigh = reports.filter((r) => r.severity === 'High').length;
  const sevCrit = reports.filter((r) => r.severity === 'Critical').length;

  const severityChartData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        label: 'Reports',
        data: [sevCrit, sevHigh, sevMed, sevLow],
        backgroundColor: ['#DC2626', '#D97706', '#2563EB', '#059669'],
        borderRadius: 6
      }
    ]
  };

  // Chart 4: Monthly Trend Line Chart (dynamic calculation)
  const monthlyData = {
    labels: ['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'],
    datasets: [
      {
        label: 'Monthly Submissions',
        data: [0, 0, 0, 0, 0, reports.length],
        borderColor: '#D97706',
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5
      }
    ]
  };

  const chartOptionsCommon = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Safety Executive Dashboard</h1>
          <p>Real-time oversight of industrial safety observations, risk mitigation status, and area distribution across OIL India facilities.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-gold" onClick={() => onNavigate('reports-by-area')}>
            <Layers size={16} />
            Area-wise Bifurcation View
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('all-reports')}>
            Manage All Reports
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info-group">
            <span className="kpi-label">Total Reports</span>
            <span className="kpi-value">{total}</span>
          </div>
          <div className="kpi-icon-wrap"><FileText size={24} /></div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-info-group">
            <span className="kpi-label">Unsafe Conditions (UC)</span>
            <span className="kpi-value">{ucCount}</span>
          </div>
          <div className="kpi-icon-wrap"><AlertTriangle size={24} /></div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-info-group">
            <span className="kpi-label">Unsafe Events (UE)</span>
            <span className="kpi-value">{ueCount}</span>
          </div>
          <div className="kpi-icon-wrap"><ShieldAlert size={24} /></div>
        </div>

        <div className="kpi-card kpi-critical">
          <div className="kpi-info-group">
            <span className="kpi-label">Critical Reports</span>
            <span className="kpi-value">{criticalCount}</span>
          </div>
          <div className="kpi-icon-wrap"><AlertTriangle size={24} /></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info-group">
            <span className="kpi-label">Submitted (Open)</span>
            <span className="kpi-value">{openCount}</span>
          </div>
          <div className="kpi-icon-wrap"><Clock size={24} /></div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-info-group">
            <span className="kpi-label">Under Review</span>
            <span className="kpi-value">{underReviewCount}</span>
          </div>
          <div className="kpi-icon-wrap"><Clock size={24} /></div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-info-group">
            <span className="kpi-label">Resolved Reports</span>
            <span className="kpi-value">{resolvedCount}</span>
          </div>
          <div className="kpi-icon-wrap"><CheckCircle2 size={24} /></div>
        </div>

        <div className="kpi-card kpi-gold" style={{ borderLeftColor: '#D97706' }}>
          <div className="kpi-info-group">
            <span className="kpi-label">Reports Today</span>
            <span className="kpi-value">{reportsToday}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* 4 Dashboard Charts */}
      <div className="charts-grid">
        {/* Chart 1: Reports by Area */}
        <div className="card chart-card">
          <h3 className="card-title">
            <Layers size={18} color="var(--oil-navy-main)" />
            Chart 1 – Safety Reports by Area
          </h3>
          <div className="chart-container-box">
            <Bar data={areaChartData} options={chartOptionsCommon} />
          </div>
        </div>

        {/* Chart 2: UC vs UE */}
        <div className="card chart-card">
          <h3 className="card-title">
            <ShieldAlert size={18} color="var(--oil-navy-main)" />
            Chart 2 – Unsafe Condition (UC) vs Unsafe Event (UE)
          </h3>
          <div className="chart-container-box">
            <Doughnut data={ucUeData} options={chartOptionsCommon} />
          </div>
        </div>

        {/* Chart 3: Reports by Severity */}
        <div className="card chart-card">
          <h3 className="card-title">
            <AlertTriangle size={18} color="var(--oil-navy-main)" />
            Chart 3 – Reports by Perceived Severity
          </h3>
          <div className="chart-container-box">
            <Bar data={severityChartData} options={chartOptionsCommon} />
          </div>
        </div>

        {/* Chart 4: Monthly Safety Reports */}
        <div className="card chart-card">
          <h3 className="card-title">
            <TrendingUp size={18} color="var(--oil-navy-main)" />
            Chart 4 – Monthly Safety Reports Trend
          </h3>
          <div className="chart-container-box">
            <Line data={monthlyData} options={chartOptionsCommon} />
          </div>
        </div>
      </div>

      {/* Recent High / Critical Alert Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <ShieldAlert size={18} color="#DC2626" />
            Critical & High Priority Action Items
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('all-reports')}>
            View All Reports Table
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Employee</th>
                <th>UC / UE</th>
                <th>Area</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .filter((r) => r.severity === 'Critical' || r.severity === 'High')
                .slice(0, 5)
                .map((r) => (
                  <tr key={r.id}>
                    <td><span className="report-id-cell">{r.id}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                    <td>
                      <span className={`badge ${r.type.includes('Condition') ? 'badge-uc' : 'badge-ue'}`}>
                        {r.type.includes('Condition') ? 'UC' : 'UE'}
                      </span>
                    </td>
                    <td>{r.area}</td>
                    <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description}
                    </td>
                    <td><span className={`badge badge-sev-${r.severity}`}>{r.severity}</span></td>
                    <td><span className={`badge badge-stat-${r.status.replace(/\s+/g, '-')}`}>{r.status}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => onSelectArea(r.area)}>
                        Drilldown
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

