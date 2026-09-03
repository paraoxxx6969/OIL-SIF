import React, { useState, useEffect, useRef } from 'react';
import {
  INDUSTRIAL_AREAS, SITES, ACTIVITIES, PEOPLE_OPTIONS, IMMEDIATE_ACTIONS
} from '../data/initialData';
import {
  Upload, X, CheckCircle2, ShieldAlert, AlertTriangle,
  Mic, MicOff, Eye, Edit3, Save, Send, ChevronLeft, ChevronRight,
  MapPin, Calendar, Clock, Users, Zap, Camera, FileText, Info
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { key: 'Unsafe Act (UA)',       code: 'UA',  emoji: '⚠️',  label: 'Unsafe Act',       cardClass: '' },
  { key: 'Unsafe Condition (UC)', code: 'UC',  emoji: '🔧',  label: 'Unsafe Condition', cardClass: '' },
  { key: 'Near Miss',             code: 'NM',  emoji: '🚨',  label: 'Near Miss',        cardClass: '' },
  { key: 'Incident',              code: 'INC', emoji: '🏥',  label: 'Incident',         cardClass: 'selected-danger' },
  { key: 'Not Sure',              code: 'NS',  emoji: '❓',  label: 'Not Sure',         cardClass: '' },
];

const STEPS = [
  { id: 'A', label: 'Type' },
  { id: 'B', label: 'When' },
  { id: 'C', label: 'Where' },
  { id: 'D', label: 'Activity' },
  { id: 'E', label: 'Description' },
  { id: 'F', label: 'Danger' },
  { id: 'G', label: 'Evidence' },
  { id: 'H', label: 'People' },
  { id: 'I', label: 'Details' },
  { id: 'J', label: 'Actions' },
];

const getTypeBadgeClass = (type) => {
  if (!type) return 'badge-ns';
  if (type.includes('Act')) return 'badge-ua';
  if (type.includes('Condition')) return 'badge-uc';
  if (type.includes('Near')) return 'badge-nm';
  if (type.includes('Incident')) return 'badge-inc';
  return 'badge-ns';
};

const getTypeCode = (type) => {
  const found = REPORT_TYPES.find(t => t.key === type);
  return found ? found.code : 'NS';
};

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

// ── Initial form state ───────────────────────────────────────────────────────
const INITIAL_STATE = {
  reportType: '',
  eventDate: today(),
  eventTime: nowTime(),
  site: '',
  area: '',
  specificLocation: '',
  equipment: '',
  activity: '',
  description: '',
  immediateDanger: '',
  images: [],
  peopleInvolved: [],
  injuryOccurred: '',
  propertyDamage: '',
  environmentalRelease: '',
  narrowlyAvoided: '',
  immediateActionsTaken: [],
  actionNotes: '',
  confidential: false,
};

// ── RadioGroup helper ────────────────────────────────────────────────────────
function RadioGroup({ value, onChange, options }) {
  return (
    <div className="radio-option-group">
      {options.map(opt => {
        let cls = 'radio-option-btn';
        if (value === opt) {
          if (opt === 'Yes') cls += ' selected-yes';
          else if (opt === 'No') cls += ' selected-no';
          else cls += ' selected';
        }
        return (
          <button key={opt} type="button" className={cls} onClick={() => onChange(opt)}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── CheckboxGroup helper ─────────────────────────────────────────────────────
function CheckboxGroup({ options, selected, onChange }) {
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt];
    onChange(next);
  };
  return (
    <div className="checkbox-group">
      {options.map(opt => (
        <label key={opt} className={`checkbox-item ${selected.includes(opt) ? 'checked' : ''}`}>
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── Section Block wrapper ────────────────────────────────────────────────────
function SectionBlock({ stepId, title, children }) {
  return (
    <div className="form-section-block">
      <div className="form-section-header">
        <span className="section-tag">Section {stepId}</span>
        <h3 className="form-section-title">{title}</h3>
      </div>
      <div className="form-section-body">{children}</div>
    </div>
  );
}

// ── Review Screen ────────────────────────────────────────────────────────────
function ReviewScreen({ form, onEdit, onSubmit }) {
  const typeInfo = REPORT_TYPES.find(t => t.key === form.reportType) || {};
  return (
    <div className="review-container">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--oil-navy-dark)', fontSize: '1.4rem' }}>📋 Review Your Report</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Sabhi details ek baar check karo, phir submit karo.
        </p>
      </div>

      {/* Type */}
      <div className="review-section">
        <div className="review-section-header">⚠️ Report Type</div>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{typeInfo.emoji}</span>
          <div>
            <span className={`badge ${getTypeBadgeClass(form.reportType)}`}>{typeInfo.code}</span>
            <span style={{ marginLeft: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>{form.reportType}</span>
          </div>
        </div>
      </div>

      {/* When */}
      <div className="review-section">
        <div className="review-section-header">📅 Event Date & Time</div>
        <div className="review-field-grid">
          <div className="review-field">
            <div className="review-label">Event Date</div>
            <div className="review-value">{form.eventDate || '—'}</div>
          </div>
          <div className="review-field">
            <div className="review-label">Event Time</div>
            <div className="review-value">{form.eventTime || '—'}</div>
          </div>
        </div>
      </div>

      {/* Where */}
      <div className="review-section">
        <div className="review-section-header">📍 Location</div>
        <div className="review-field-grid">
          <div className="review-field">
            <div className="review-label">Site</div>
            <div className="review-value">{form.site || '—'}</div>
          </div>
          <div className="review-field">
            <div className="review-label">Area</div>
            <div className="review-value">{form.area || '—'}</div>
          </div>
          <div className="review-field">
            <div className="review-label">Specific Location</div>
            <div className={`review-value ${!form.specificLocation ? 'muted' : ''}`}>
              {form.specificLocation || 'Not specified'}
            </div>
          </div>
          <div className="review-field">
            <div className="review-label">Equipment / Asset</div>
            <div className={`review-value ${!form.equipment ? 'muted' : ''}`}>
              {form.equipment || 'Not specified'}
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="review-section">
        <div className="review-section-header">⚙️ Activity</div>
        <div style={{ padding: '0.75rem 1rem' }}>
          <span className="review-value">{form.activity || <em style={{ color: 'var(--text-muted)' }}>Not specified</em>}</span>
        </div>
      </div>

      {/* Description */}
      <div className="review-section">
        <div className="review-section-header">📝 Description</div>
        <div style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {form.description}
        </div>
      </div>

      {/* Danger + Flags */}
      <div className="review-section">
        <div className="review-section-header">🚨 Immediate Danger</div>
        <div className="review-field-grid">
          <div className="review-field">
            <div className="review-label">Is anyone in immediate danger?</div>
            <div className="review-value" style={{ color: form.immediateDanger === 'Yes' ? '#DC2626' : 'inherit' }}>
              {form.immediateDanger || <em style={{ color: 'var(--text-muted)' }}>Not answered</em>}
            </div>
          </div>
          <div className="review-field">
            <div className="review-label">Confidential Report</div>
            <div className="review-value">{form.confidential ? 'Yes — Confidential' : 'No'}</div>
          </div>
        </div>
      </div>

      {/* Evidence */}
      <div className="review-section">
        <div className="review-section-header">📷 Evidence</div>
        <div style={{ padding: '0.75rem 1rem' }}>
          {form.images.length === 0 ? (
            <em style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No photos attached</em>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {form.images.map((img, i) => (
                <img key={i} src={img} alt={`Evidence ${i+1}`}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
              ))}
              <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                {form.images.length} photo(s)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* People */}
      {form.peopleInvolved.length > 0 && (
        <div className="review-section">
          <div className="review-section-header">👥 People Involved</div>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {form.peopleInvolved.map(p => (
              <span key={p} className="badge badge-ns">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Conditional incident/near miss */}
      {(form.reportType === 'Incident' || form.reportType === 'Near Miss') && (
        <div className="review-section">
          <div className="review-section-header">🏥 Incident Details</div>
          <div className="review-field-grid">
            {form.reportType === 'Incident' && <>
              <div className="review-field">
                <div className="review-label">Injury Occurred?</div>
                <div className="review-value">{form.injuryOccurred || '—'}</div>
              </div>
              <div className="review-field">
                <div className="review-label">Property Damage?</div>
                <div className="review-value">{form.propertyDamage || '—'}</div>
              </div>
              <div className="review-field">
                <div className="review-label">Environmental Release?</div>
                <div className="review-value">{form.environmentalRelease || '—'}</div>
              </div>
            </>}
            {form.reportType === 'Near Miss' && (
              <div className="review-field">
                <div className="review-label">Injury/Damage Narrowly Avoided?</div>
                <div className="review-value">{form.narrowlyAvoided || '—'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {form.immediateActionsTaken.length > 0 && (
        <div className="review-section">
          <div className="review-section-header">✅ Immediate Actions Taken</div>
          <div style={{ padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: form.actionNotes ? '0.5rem' : 0 }}>
              {form.immediateActionsTaken.map(a => (
                <span key={a} className="badge badge-nm" style={{ fontSize: '0.75rem' }}>{a}</span>
              ))}
            </div>
            {form.actionNotes && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                "{form.actionNotes}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
        <button type="button" className="btn btn-secondary" onClick={onEdit} style={{ gap: '0.4rem' }}>
          <Edit3 size={16} /> Edit Report
        </button>
        <button type="button" className="btn btn-primary" onClick={onSubmit}
          style={{ padding: '0.75rem 2.5rem', fontSize: '0.95rem', gap: '0.5rem' }}>
          <Send size={16} /> Submit Report
        </button>
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ reportId, form, onViewReports, onNewReport }) {
  const typeCode = getTypeCode(form.reportType);
  return (
    <div style={{ maxWidth: '580px', margin: '2rem auto' }} className="card">
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{
          width: 72, height: 72, background: '#ECFDF5', color: '#10B981',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 1.25rem auto'
        }}>
          <CheckCircle2 size={44} />
        </div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--oil-navy-dark)', marginBottom: '0.5rem' }}>
          Report Submitted Successfully ✓
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Your observation has been registered in the HSSE Monitoring System and forwarded to the HSE Control Room.
        </p>

        <div style={{
          background: '#F8FAFC', border: '1px dashed var(--border-color)',
          padding: '1.25rem', borderRadius: '10px', marginBottom: '0.75rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Report ID
          </span>
          <div className="success-report-id">{reportId}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span className={`badge ${getTypeBadgeClass(form.reportType)}`}>{typeCode}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{form.area}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{form.eventDate}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onViewReports}>
            <Eye size={16} /> View My Reports
          </button>
          <button className="btn btn-primary" onClick={onNewReport}>
            <FileText size={16} /> Submit Another
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ReportForm({
  currentUser,
  language = 'en',
  onSubmitReport,
  onNavigate,
  draftToEdit = null,
  onSaveDraft,
  onDeleteDraft,
}) {
  const [form, setForm] = useState(draftToEdit ? { ...INITIAL_STATE, ...draftToEdit } : INITIAL_STATE);
  const [activeStep, setActiveStep] = useState(0); // 0-9
  const [showReview, setShowReview] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [validationErr, setValidationErr] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const recognitionRef = useRef(null);

  const isDraft = !!draftToEdit;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  const set = (field) => (val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setValidationErr('');
  };

  // ── Voice ────────────────────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      if (t) setForm(prev => ({ ...prev, description: prev.description ? prev.description + ' ' + t : t }));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
  };

  // ── Images ───────────────────────────────────────────────────────────────
  const handleImages = (files) => {
    if (form.images.length >= 5) return;
    Array.from(files).slice(0, 5 - form.images.length).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => setForm(prev => ({ ...prev, images: [...prev.images, e.target.result] }));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  // ── Validation per step ──────────────────────────────────────────────────
  const validateStep = (step) => {
    if (step === 0 && !form.reportType) return 'Please select a report type.';
    if (step === 1) {
      if (!form.eventDate) return 'Event date is required.';
      if (!form.eventTime) return 'Event time is required.';
    }
    if (step === 2) {
      if (!form.site) return 'Please select a Site.';
      if (!form.area) return 'Please select an Area.';
    }
    if (step === 4 && form.description.trim().length < 15)
      return 'Description must be at least 15 characters long.';
    return '';
  };

  const handleNext = () => {
    const err = validateStep(activeStep);
    if (err) { setValidationErr(err); return; }
    setValidationErr('');
    setActiveStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handlePrev = () => {
    setValidationErr('');
    setActiveStep(s => Math.max(s - 1, 0));
  };

  const handleGoToReview = () => {
    // Validate all required sections before review
    for (let s = 0; s < STEPS.length; s++) {
      const err = validateStep(s);
      if (err) {
        setActiveStep(s);
        setValidationErr(err);
        return;
      }
    }
    setValidationErr('');
    setShowReview(true);
  };

  // ── Save Draft ───────────────────────────────────────────────────────────
  const handleSaveDraft = () => {
    const draftId = draftToEdit?.id || `DRAFT-${Date.now()}`;
    const draft = { ...form, id: draftId, isDraft: true, employeeId: currentUser.userId, employeeName: currentUser.name };
    onSaveDraft?.(draft);
  };

  // ── Final Submit ─────────────────────────────────────────────────────────
  const handleFinalSubmit = () => {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(100000 + Math.random() * 900000));
    const reportId = `OIL-HSSE-${year}-${seq}`;
    const now = new Date().toISOString();

    const report = {
      ...form,
      id: reportId,
      isDraft: false,
      employeeId: currentUser.userId,
      employeeName: currentUser.name,
      status: 'Submitted',
      adminRemarks: '',
      assignedDepartment: '',
      assignedPerson: '',
      targetDate: '',
      reportedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    onSubmitReport(report, draftToEdit?.id);
    setSubmittedId(reportId);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (submittedId) {
    return (
      <SuccessScreen
        reportId={submittedId}
        form={form}
        onViewReports={() => onNavigate?.('my-reports')}
        onNewReport={() => { setSubmittedId(null); setForm(INITIAL_STATE); setActiveStep(0); setShowReview(false); }}
      />
    );
  }

  if (showReview) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <ReviewScreen form={form} onEdit={() => setShowReview(false)} onSubmit={handleFinalSubmit} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '1rem' }}>
        <div className="page-title-group">
          <h1 style={{ fontSize: '1.4rem' }}>
            <ShieldAlert size={22} color="var(--oil-navy-main)" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Report a Safety Issue
          </h1>
          <p>Fill in all required sections, then review and submit.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      {isDraft && (
        <div className="draft-info-banner">
          <Edit3 size={16} /> Editing saved draft — changes will be saved when you click "Save Draft".
        </div>
      )}

      {/* Stepper */}
      <div className="form-stepper">
        {STEPS.map((step, idx) => {
          const cls = idx < activeStep ? 'stepper-step completed' : idx === activeStep ? 'stepper-step active' : 'stepper-step';
          return (
            <div key={step.id} className={cls} onClick={() => { if (idx < activeStep) { setActiveStep(idx); setValidationErr(''); } }}>
              <div className="stepper-dot">
                {idx < activeStep ? '✓' : step.id}
              </div>
              <span className="stepper-label">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Validation Error */}
      {validationErr && (
        <div style={{
          background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem',
          borderRadius: '8px', border: '1px solid #FCA5A5', fontSize: '0.88rem',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <AlertTriangle size={16} /> {validationErr}
        </div>
      )}

      {/* ── SECTION A: Report Type ─────────────────────────────────────────── */}
      {activeStep === 0 && (
        <SectionBlock stepId="A" title="What are you reporting?">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Report type select karo. Agar confirm nahi hai toh "Not Sure" select karo — admin baad mein classify karega.
          </p>
          <div className="report-type-grid">
            {REPORT_TYPES.map(t => {
              const isSelected = form.reportType === t.key;
              const selectedClass = isSelected ? (t.cardClass || 'selected') : '';
              return (
                <div
                  key={t.key}
                  className={`report-type-card ${selectedClass}`}
                  onClick={() => set('reportType')(t.key)}
                >
                  <div className="type-card-icon">{t.emoji}</div>
                  <div className="type-card-label">{t.label}</div>
                  <div className="type-card-code">{t.code}</div>
                </div>
              );
            })}
          </div>
        </SectionBlock>
      )}

      {/* ── SECTION B: Event Date & Time ──────────────────────────────────── */}
      {activeStep === 1 && (
        <SectionBlock stepId="B" title="When did this happen?">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Event ki actual date aur time enter karo. Purana event bhi report kar sakte ho.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={15} color="var(--oil-navy-main)" />
                Event Date <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={form.eventDate}
                max={today()}
                onChange={e => set('eventDate')(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={15} color="var(--oil-navy-main)" />
                Event Time <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="time"
                className="form-control"
                value={form.eventTime}
                onChange={e => set('eventTime')(e.target.value)}
              />
            </div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Info size={14} />
            Reporting time automatically record hogi — aapko change nahi karna hai.
          </div>
        </SectionBlock>
      )}

      {/* ── SECTION C: Location ───────────────────────────────────────────── */}
      {activeStep === 2 && (
        <SectionBlock stepId="C" title="Where did this happen?">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Jitna specific location doge, utna better SIF hotspot analysis hoga.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <MapPin size={15} color="var(--oil-navy-main)" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Site <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select className="form-control" value={form.site} onChange={e => { set('site')(e.target.value); set('area')(''); }}>
                <option value="">— Select Site —</option>
                {SITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Area <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select className="form-control" value={form.area} onChange={e => set('area')(e.target.value)} disabled={!form.site}>
                <option value="">— Select Area —</option>
                {INDUSTRIAL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Specific Location <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(optional)</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Crane Bay 02, Gate No. 3"
                value={form.specificLocation}
                onChange={e => set('specificLocation')(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Equipment / Asset <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(optional)</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Crane CR-07, Pump P-12"
                value={form.equipment}
                onChange={e => set('equipment')(e.target.value)}
              />
            </div>
          </div>
        </SectionBlock>
      )}

      {/* ── SECTION D: Activity ───────────────────────────────────────────── */}
      {activeStep === 3 && (
        <SectionBlock stepId="D" title="What activity was being performed?">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Optional — "Not Sure" select kar sakte ho. NLP engine description se bhi activity extract kar sakta hai.
          </p>
          <select className="form-control" value={form.activity} onChange={e => set('activity')(e.target.value)}
            style={{ maxWidth: '480px' }}>
            <option value="">— Select Activity —</option>
            {ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </SectionBlock>
      )}

      {/* ── SECTION E: Description ────────────────────────────────────────── */}
      {activeStep === 4 && (
        <SectionBlock stepId="E" title="Describe what you observed">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Jo dekha wo apni language mein describe karo. Perfect spelling zaroori nahi. <span style={{ color: '#DC2626', fontWeight: 700 }}>Required *</span>
            </p>
            {speechSupported && (
              <button type="button" onClick={toggleVoice} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.8rem', borderRadius: '20px', flexShrink: 0,
                border: isListening ? '1px solid #DC2626' : '1px solid var(--oil-navy-main)',
                background: isListening ? '#FEF2F2' : '#EFF6FF',
                color: isListening ? '#DC2626' : 'var(--oil-navy-main)',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              }}>
                {isListening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> 🎤 Speak</>}
              </button>
            )}
          </div>
          {isListening && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ animation: 'pulse 1s infinite' }}>🔴</span> Listening… speak now
            </div>
          )}
          <textarea
            className="form-control"
            rows={6}
            placeholder="Describe what happened, where it happened, and what appeared unsafe. E.g. 'During crane lifting operation, a worker entered below the suspended load. The exclusion area was not properly barricaded.'"
            value={form.description}
            onChange={e => set('description')(e.target.value)}
            style={{ resize: 'vertical', lineHeight: '1.6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: form.description.length < 15 ? '#DC2626' : 'var(--text-muted)' }}>
              {form.description.length} chars {form.description.length < 15 ? `(minimum 15 required)` : '✓'}
            </span>
          </div>
        </SectionBlock>
      )}

      {/* ── SECTION F: Immediate Danger ───────────────────────────────────── */}
      {activeStep === 5 && (
        <SectionBlock stepId="F" title="Is anyone currently in immediate danger?">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Ye field SIF classification nahi hai — sirf current emergency status hai.
          </p>
          <RadioGroup value={form.immediateDanger} onChange={set('immediateDanger')} options={['Yes', 'No', 'Not Sure']} />

          {form.immediateDanger === 'Yes' && (
            <div className="danger-alert-banner">
              <div className="danger-banner-icon">🚨</div>
              <div>
                <div className="danger-banner-title">Immediate Danger Reported!</div>
                <div className="danger-banner-text">
                  Please immediately follow site emergency & safety procedures and notify your responsible
                  Supervisor / HSE Personnel. Do not leave the area unsafe.
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={form.confidential}
                onChange={e => set('confidential')(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: 'var(--oil-navy-main)' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Submit as Confidential Report
              </span>
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', marginLeft: '1.75rem' }}>
              Reporter identity system mein store hogi, but unauthorized users ko visible nahi hogi.
            </p>
          </div>
        </SectionBlock>
      )}

      {/* ── SECTION G: Evidence ───────────────────────────────────────────── */}
      {activeStep === 6 && (
        <SectionBlock stepId="G" title="Upload Evidence (Photos)">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Optional — up to 5 photos. JPG, PNG, JPEG supported.
          </p>
          <div
            className={`dropzone ${isDragOver ? 'active' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); handleImages(e.dataTransfer.files); }}
            onClick={() => document.getElementById('evidence-upload').click()}
          >
            <Camera size={32} color="var(--oil-navy-main)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--oil-navy-dark)', fontSize: '0.9rem' }}>
              Click to upload or drag & drop photos
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              JPG, PNG, JPEG · Max 5 photos · {5 - form.images.length} slots remaining
            </p>
            <input
              id="evidence-upload"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleImages(e.target.files)}
            />
          </div>

          {form.images.length > 0 && (
            <div className="preview-grid" style={{ marginTop: '1rem' }}>
              {form.images.map((img, idx) => (
                <div key={idx} className="preview-thumb-wrap">
                  <img src={img} alt={`Upload ${idx + 1}`} />
                  <button type="button" className="remove-thumb-btn"
                    onClick={e => { e.stopPropagation(); removeImage(idx); }} title="Remove">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionBlock>
      )}

      {/* ── SECTION H: People Involved ────────────────────────────────────── */}
      {activeStep === 7 && (
        <SectionBlock stepId="H" title="Who was involved?">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Optional — multiple select kar sakte ho.
          </p>
          <CheckboxGroup
            options={PEOPLE_OPTIONS}
            selected={form.peopleInvolved}
            onChange={set('peopleInvolved')}
          />
        </SectionBlock>
      )}

      {/* ── SECTION I: Incident / Near Miss Details ───────────────────────── */}
      {activeStep === 8 && (
        <SectionBlock stepId="I" title="Incident / Near Miss Details">
          {form.reportType === 'Incident' ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Incident ki additional details — conditional fields.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Was anyone injured?</label>
                  <RadioGroup value={form.injuryOccurred} onChange={set('injuryOccurred')} options={['Yes', 'No', 'Unknown']} />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Was equipment / property damaged?</label>
                  <RadioGroup value={form.propertyDamage} onChange={set('propertyDamage')} options={['Yes', 'No', 'Unknown']} />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Was there any environmental spill / release?</label>
                  <RadioGroup value={form.environmentalRelease} onChange={set('environmentalRelease')} options={['Yes', 'No', 'Unknown']} />
                </div>
              </div>
            </>
          ) : form.reportType === 'Near Miss' ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Near Miss ki additional details.
              </p>
              <div>
                <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Was injury / damage narrowly avoided?</label>
                <RadioGroup value={form.narrowlyAvoided} onChange={set('narrowlyAvoided')} options={['Yes', 'No', 'Unknown']} />
              </div>
            </>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Info size={20} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
              This section applies only to <strong>Incident</strong> or <strong>Near Miss</strong> report types.
              <br />
              <span style={{ fontSize: '0.82rem' }}>Current type: <strong>{form.reportType || 'Not selected'}</strong></span>
            </div>
          )}
        </SectionBlock>
      )}

      {/* ── SECTION J: Immediate Actions ──────────────────────────────────── */}
      {activeStep === 9 && (
        <SectionBlock stepId="J" title="Immediate Action Taken">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Optional — jo bhi action already liya ho wo check karo.
          </p>
          <CheckboxGroup
            options={IMMEDIATE_ACTIONS}
            selected={form.immediateActionsTaken}
            onChange={set('immediateActionsTaken')}
          />
          <div style={{ marginTop: '1rem' }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
              Action Notes <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Lifting operation was stopped and supervisor was informed immediately."
              value={form.actionNotes}
              onChange={e => set('actionNotes')(e.target.value)}
            />
          </div>
        </SectionBlock>
      )}

      {/* ── Navigation Buttons ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'
      }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePrev}
          disabled={activeStep === 0}
          style={{ gap: '0.35rem' }}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Step {activeStep + 1} of {STEPS.length}
        </span>

        {activeStep < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={handleNext} style={{ gap: '0.35rem' }}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleGoToReview}
            style={{ padding: '0.65rem 1.75rem', gap: '0.4rem' }}>
            <Eye size={16} /> Review & Submit
          </button>
        )}
      </div>
    </div>
  );
}
