import React, { useState, useEffect } from 'react';
import { INDUSTRIAL_AREAS } from '../data/initialData';
import { TRANSLATIONS } from '../data/translations';
import { Upload, X, CheckCircle2, ShieldAlert, Image, MapPin, Calendar, AlertTriangle, Mic, MicOff } from 'lucide-react';

export default function ReportForm({ currentUser, language = 'en', onSubmitReport }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [reportType, setReportType] = useState('Unsafe Condition');
  const [area, setArea] = useState(INDUSTRIAL_AREAS[0]);
  const [customArea, setCustomArea] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [dateTime, setDateTime] = useState(
    new Date().toISOString().slice(0, 16).replace('T', ' ')
  );

  const [images, setImages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [validationErr, setValidationErr] = useState('');

  // Speech to Text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Set language code based on current UI language selection
      const langCodes = {
        en: 'en-IN',
        hi: 'hi-IN',
        mr: 'mr-IN',
        bn: 'bn-IN'
      };
      recognition.lang = langCodes[language] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setDescription((prev) => (prev ? prev + ' ' + currentTranscript : currentTranscript));
        }
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleImageUpload = (files) => {
    const newImgs = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages((prev) => [...prev, e.target.result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationErr('');

    // Rule: Must provide either photo OR description OR both
    if (images.length === 0 && !description.trim()) {
      setValidationErr('Please provide either a description or upload an evidence photo (or both).');
      return;
    }

    if (area === 'Other' && !customArea.trim()) {
      setValidationErr('Please specify the custom Area Name.');
      return;
    }

    const typePrefix = reportType.includes('Condition') ? 'OIL-UC' : 'OIL-UE';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const generatedId = `${typePrefix}-${year}-${randomNum}`;

    const newReport = {
      id: generatedId,
      type: reportType,
      employeeId: currentUser.userId,
      employeeName: currentUser.name,
      area: area === 'Other' ? `Other: ${customArea.trim()}` : area,
      customArea: area === 'Other' ? customArea.trim() : '',
      exactLocation: exactLocation.trim(),
      description: description.trim(),
      date: dateTime || new Date().toLocaleString(),
      severity: severity,
      status: 'Submitted',
      images: images,
      adminRemarks: '',
      assignedDepartment: '',
      assignedPerson: '',
      targetDate: ''
    };

    onSubmitReport(newReport);
    setSubmittedId(generatedId);

    // Reset form after 4 seconds or allow submitting another
  };

  const handleResetForm = () => {
    setSubmittedId(null);
    setReportType('Unsafe Condition');
    setArea(INDUSTRIAL_AREAS[0]);
    setCustomArea('');
    setExactLocation('');
    setDescription('');
    setSeverity('Medium');
    setImages([]);
    setValidationErr('');
  };

  if (submittedId) {
    return (
      <div style={{ maxWidth: '650px', margin: '2rem auto' }} className="card">
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#ECFDF5',
            color: '#10B981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <CheckCircle2 size={40} />
          </div>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--oil-navy-dark)', marginBottom: '0.5rem' }}>
            Safety Report Submitted Successfully
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            Your observation has been registered in the HSSE Monitoring System and forwarded to the Safety Admin & HSE Control Room.
          </p>

          <div style={{
            background: '#F8FAFC',
            border: '1px dashed var(--border-color)',
            padding: '1rem',
            borderRadius: '8px',
            display: 'inline-block',
            marginBottom: '1.75rem'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>GENERATED REPORT ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: 'var(--oil-navy-main)' }}>
              {submittedId}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleResetForm}>
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.3rem', margin: 0 }}>
            <ShieldAlert size={22} color="var(--oil-navy-main)" />
            {t.reportFormTitle}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            {t.reportFormSub}
          </p>
        </div>

        {validationErr && (
          <div style={{
            background: '#FEF2F2',
            color: '#991B1B',
            padding: '0.85rem',
            borderRadius: '8px',
            border: '1px solid #FCA5A5',
            fontSize: '0.88rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={18} />
            <span>{validationErr}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Report Type */}
            <div className="form-group">
              <label className="form-label">
                {t.reportType} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className="form-control"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                required
              >
                <option value="Unsafe Condition">{t.unsafeCondition}</option>
                <option value="Unsafe Event / Unsafe Act">{t.unsafeEvent}</option>
              </select>
            </div>

            {/* Industrial Area Dropdown */}
            <div className="form-group">
              <label className="form-label">
                {t.facilityArea} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className="form-control"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              >
                {INDUSTRIAL_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Custom Area Name if "Other" is selected */}
            {area === 'Other' && (
              <div className="form-group full-width">
                <label className="form-label">
                  Enter Area Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Specify the industrial area name..."
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Exact Location / Landmark */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={15} color="var(--oil-navy-main)" />
                {t.exactLocation}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={t.exactLocationPlaceholder}
                value={exactLocation}
                onChange={(e) => setExactLocation(e.target.value)}
              />
            </div>

            {/* Date & Time */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={15} color="var(--oil-navy-main)" />
                {t.dateTime}
              </label>
              <input
                type="text"
                className="form-control"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>

            {/* Severity Perceived */}
            <div className="form-group full-width">
              <label className="form-label">
                {t.severity} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {[
                  { key: 'Low', label: t.low },
                  { key: 'Medium', label: t.medium },
                  { key: 'High', label: t.high },
                  { key: 'Critical', label: t.critical }
                ].map((item) => {
                  const isSelected = severity === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSeverity(item.key)}
                      style={{
                        padding: '0.65rem',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--oil-navy-main)' : '1px solid var(--border-color)',
                        background: isSelected ? 'white' : '#F8FAFC',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span className={`badge badge-sev-${item.key}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Evidence Section */}
            <div className="form-group full-width">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Image size={16} color="var(--oil-navy-main)" />
                {t.uploadEvidence}
              </label>

              <div
                className={`dropzone ${isDragOver ? 'active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                <Upload size={32} color="var(--oil-navy-main)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600, color: 'var(--oil-navy-dark)', fontSize: '0.9rem' }}>
                  {t.dragDropText}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {t.dragDropSubtext}
                </p>
                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
              </div>

              {/* Previews */}
              {images.length > 0 && (
                <div className="preview-grid">
                  {images.map((img, idx) => (
                    <div key={idx} className="preview-thumb-wrap">
                      <img src={img} alt={`Upload ${idx}`} />
                      <button
                        type="button"
                        className="remove-thumb-btn"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        title="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description with Voice Dictation */}
            <div className="form-group full-width">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {t.description}
                </label>
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    border: isListening ? '1px solid #DC2626' : '1px solid var(--oil-navy-main)',
                    background: isListening ? '#FEF2F2' : '#EFF6FF',
                    color: isListening ? '#DC2626' : 'var(--oil-navy-main)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isListening ? (
                    <>
                      <MicOff size={14} color="#DC2626" />
                      <span>{t.listeningNow}</span>
                    </>
                  ) : (
                    <>
                      <Mic size={14} color="var(--oil-navy-main)" />
                      <span>🎤 {t.speakDictate}</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                className="form-control"
                rows={4}
                placeholder={isListening ? t.listeningNow : t.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetForm}
            >
              {t.clearForm}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
            >
              {t.submitReport}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

