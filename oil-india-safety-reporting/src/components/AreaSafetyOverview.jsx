import React from 'react';
import { MapPin, ShieldAlert, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { INDUSTRIAL_AREAS } from '../data/initialData';
import { TRANSLATIONS } from '../data/translations';

export default function AreaSafetyOverview({ reports, language = 'en', onSelectArea }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  // Aggregate stats per area
  const areaStats = INDUSTRIAL_AREAS.slice(0, 14).map((areaName) => {
    const matched = reports.filter((r) => r.area.toLowerCase().includes(areaName.toLowerCase().split('/')[0].trim()));
    const total = matched.length;
    const open = matched.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;
    const critical = matched.filter((r) => r.severity === 'Critical').length;
    const resolved = matched.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;

    // Calculate Risk Level badge based on critical and open counts
    let riskLevel = 'LOW';
    if (critical >= 2 || total >= 15) {
      riskLevel = 'CRITICAL';
    } else if (critical === 1 || open >= 3) {
      riskLevel = 'HIGH';
    } else if (total > 0) {
      riskLevel = 'MODERATE';
    }

    return {
      areaName,
      total,
      open,
      critical,
      resolved,
      riskLevel
    };
  });

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Area Safety Overview & Plant Risk Matrix</h1>
          <p>Instant facility risk assessment derived from report frequency, severity thresholds, and open action items .</p>
        </div>
      </div>

      <div className="area-grid">
        {areaStats.map((item) => {
          let riskBadgeClass = 'badge-sev-Low';
          if (item.riskLevel === 'MODERATE') riskBadgeClass = 'badge-sev-Medium';
          if (item.riskLevel === 'HIGH') riskBadgeClass = 'badge-sev-High';
          if (item.riskLevel === 'CRITICAL') riskBadgeClass = 'badge-sev-Critical';

          return (
            <div
              key={item.areaName}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `5px solid ${
                  item.riskLevel === 'CRITICAL' ? '#DC2626' :
                  item.riskLevel === 'HIGH' ? '#D97706' :
                  item.riskLevel === 'MODERATE' ? '#2563EB' : '#059669'
                }`
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--oil-navy-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={16} color="var(--oil-navy-main)" />
                    {item.areaName}
                  </h3>
                  <span className={`badge ${riskBadgeClass}`} style={{ fontSize: '0.72rem' }}>
                    RISK: {item.riskLevel}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TOTAL REPORTS</span>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--oil-navy-dark)' }}>{item.total}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OPEN REPORTS</span>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: item.open > 0 ? '#D97706' : 'var(--text-primary)' }}>{item.open}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CRITICAL RISKS</span>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: item.critical > 0 ? '#DC2626' : 'var(--text-primary)' }}>{item.critical}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RESOLVED</span>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>{item.resolved}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSelectArea(item.areaName)}
                >
                  Area Reports Breakdown &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

