import React from 'react';
import { Cpu, ShieldAlert, AlertTriangle, CheckCircle, Zap, Activity, AlertOctagon, HelpCircle } from 'lucide-react';
import { getSIFColor, getConfidenceColor } from '../services/aiEngine';

export default function AiAnalysisPanel({ aiAnalysis, onOverride }) {
  if (!aiAnalysis || aiAnalysis.status === 'processing') {
    return (
      <div className="ai-processing-box">
        <div className="ai-pulse-dot" style={{ marginBottom: '0.75rem' }}></div>
        <div style={{ fontWeight: 700, color: 'var(--oil-navy-dark)', fontSize: '0.95rem' }}>
          🤖 NLP AI Engine Processing Report…
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Analyzing free-text description for SIF potential, Life-Saving Rules, and barrier failures.
        </div>
      </div>
    );
  }

  const {
    sifPotential,
    sifScore,
    confidence,
    lifeSavingRule,
    lsrCode,
    lsrColor,
    lsrDescription,
    hazard,
    activity,
    barrierFailure,
    potentialConsequence,
    keywordsMatched = [],
  } = aiAnalysis;

  const sifStyle = getSIFColor(sifPotential);
  const confColor = getConfidenceColor(confidence);

  return (
    <div className="ai-panel-card">
      {/* Header */}
      <div className="ai-badge-header">
        <div className="ai-engine-tag">
          <Cpu size={14} /> AI NLP Analysis Engine
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Confidence Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            <span>Confidence:</span>
            <span style={{ color: confColor, fontWeight: 800 }}>{confidence}</span>
            <div style={{ width: 36, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: confidence === 'High' ? '100%' : confidence === 'Medium' ? '60%' : '30%',
                height: '100%',
                background: confColor
              }}></div>
            </div>
          </div>

          {/* SIF Badge */}
          <div className={`badge-sif-${(sifPotential || 'no').toLowerCase()}`}>
            {sifPotential === 'Yes' && <AlertOctagon size={15} />}
            {sifPotential === 'Maybe' && <AlertTriangle size={15} />}
            {sifPotential === 'No' && <CheckCircle size={15} />}
            <span>SIF Potential: {sifPotential?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main Life-Saving Rule Banner */}
      <div className="lsr-card-banner" style={{ borderLeftColor: lsrColor || 'var(--oil-navy-main)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {lsrCode && <span className="lsr-code-chip" style={{ background: lsrColor || 'var(--oil-navy-main)' }}>{lsrCode}</span>}
            <strong style={{ fontSize: '1rem', color: 'var(--oil-navy-dark)' }}>
              {lifeSavingRule}
            </strong>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            LSR Mapping
          </span>
        </div>
        {lsrDescription && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', fontStyle: 'italic', margin: '0.35rem 0 0 0' }}>
            "{lsrDescription}"
          </p>
        )}
      </div>

      {/* Grid of AI Extracted Findings */}
      <div className="ai-field-grid">
        <div className="ai-field-box">
          <div className="ai-field-label">
            <Zap size={13} color="var(--oil-gold)" /> Identified Hazard Type
          </div>
          <div className="ai-field-value">{hazard || 'Unclassified'}</div>
        </div>

        <div className="ai-field-box">
          <div className="ai-field-label">
            <Activity size={13} color="var(--oil-navy-light)" /> Activity Extracted
          </div>
          <div className="ai-field-value">{activity || 'Not Identified'}</div>
        </div>

        <div className="ai-field-box">
          <div className="ai-field-label">
            <ShieldAlert size={13} color="#DC2626" /> Barrier Failure Detected
          </div>
          <div className="ai-field-value" style={{ color: barrierFailure !== 'Not Identified' ? '#B91C1C' : 'inherit' }}>
            {barrierFailure}
          </div>
        </div>

        <div className="ai-field-box">
          <div className="ai-field-label">
            <AlertTriangle size={13} color="#D97706" /> Potential Consequence
          </div>
          <div className="ai-field-value" style={{ fontSize: '0.82rem', lineHeight: '1.3' }}>
            {potentialConsequence}
          </div>
        </div>
      </div>

      {/* Matched Keywords */}
      {keywordsMatched.length > 0 && (
        <div style={{ marginTop: '0.85rem', paddingTop: '0.6rem', borderTop: '1px solid #DBEAFE' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.2rem' }}>
            Matched Trigger Keywords:
          </span>
          {keywordsMatched.map((kw, i) => (
            <span key={i} className="ai-keyword-chip">
              #{kw}
            </span>
          ))}
        </div>
      )}

      {/* Footer Disclaimer */}
      <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>ℹ️ AI-generated insights for precursor analysis & SIF prevention.</span>
        {onOverride && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            onClick={onOverride}
          >
            Override Classification
          </button>
        )}
      </div>
    </div>
  );
}
