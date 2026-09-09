import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  RefreshCw, 
  ShieldAlert, 
  Camera, 
  UserCheck, 
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { processUserQuery } from '../utils/copilotEngine';

const SUGGESTED_PROMPTS = [
  "Which area is currently highest risk?",
  "Show this month's SIF summary.",
  "What are the top recurring precursors?",
  "Show critical CCTV alerts.",
  "Which Life-Saving Rule is violated most?",
  "Show unresolved high-risk cases.",
  "Find incidents similar to report #REP-1847",
  "Show safety profile for EMP-1024",
  "Worker entered below suspended load during crane operation"
];

export default function SafetyCopilot({ 
  currentUser, 
  reports = [], 
  onViewDetail, 
  onCreateReportFromNLP,
  isOpen,
  onClose,
  onToggle
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'bot',
      type: 'text_explanation',
      markdown: `### Welcome to OIL Safety Copilot 👋\nI am your **AI-Powered HSSE Safety Intelligence Assistant**. I analyze live platform data across Monthly Reports, CCTV feeds, SIF precursors, and Life-Saving Rules to answer your questions in natural language.\n\nSelect a suggested prompt below or type your safety question:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const isEmployee = currentUser?.role === 'Employee';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Do not render floating trigger for employees
  if (isEmployee) return null;

  const handleSend = (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isProcessing) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    setTimeout(() => {
      const response = processUserQuery(q, messages, reports, currentUser);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...response
      };
      setMessages(prev => [...prev, botMsg]);
      setIsProcessing(false);
    }, 450);
  };

  const handlePromptClick = (promptText) => {
    handleSend(promptText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        type: 'text_explanation',
        markdown: `Conversation history cleared. Ask me any safety question grounded in live platform data!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Action Launcher Button */}
      {!isOpen && (
        <button
          className="copilot-launcher-btn"
          onClick={onToggle}
          title="Open OIL Safety Copilot"
        >
          <div className="copilot-btn-inner">
            <Bot size={24} color="#FFFFFF" />
            <span className="copilot-btn-label">Safety Copilot</span>
            <span className="copilot-pulse-dot"></span>
          </div>
        </button>
      )}

      {/* Slide-Out Chat Drawer Window */}
      {isOpen && (
        <div className="copilot-drawer-overlay">
          <div className="copilot-drawer-container">
            {/* Header */}
            <div className="copilot-header">
              <div className="copilot-header-title">
                <div className="copilot-avatar-icon">
                  <Bot size={22} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    OIL Safety Copilot
                    <span className="badge-copilot-tag">AI 2.0</span>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    AI Safety Intelligence Assistant • Grounded Platform RAG
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="copilot-icon-btn" 
                  onClick={handleClearChat}
                  title="Clear Chat History"
                >
                  <RefreshCw size={15} color="#FFFFFF" />
                </button>
                <button 
                  className="copilot-icon-btn" 
                  onClick={onClose}
                  title="Close Assistant"
                >
                  <X size={18} color="#FFFFFF" />
                </button>
              </div>
            </div>

            {/* Chat Body Messages */}
            <div className="copilot-messages-body">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`copilot-msg-row ${msg.sender === 'user' ? 'msg-user' : 'msg-bot'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="bot-avatar-tiny">
                      <Bot size={14} color="#FFFFFF" />
                    </div>
                  )}

                  <div className="copilot-bubble">
                    {/* User Text Message */}
                    {msg.sender === 'user' && (
                      <div className="msg-text">{msg.text}</div>
                    )}

                    {/* Bot Formatted Markdown Content */}
                    {msg.sender === 'bot' && (
                      <div className="bot-content-wrap">
                        {/* Text / Markdown Render */}
                        {msg.markdown && (
                          <div 
                            className="markdown-formatted"
                            dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(msg.markdown) }}
                          />
                        )}

                        {/* Interactive UI Card Renderers */}

                        {/* 1. Report List / Cards */}
                        {msg.type === 'report_list' && msg.reports && (
                          <div className="copilot-cards-grid">
                            {msg.reports.map(r => (
                              <div key={r.id} className="copilot-report-card">
                                <div className="report-card-header">
                                  <span className="card-rep-id">{r.id}</span>
                                  <span className={`badge badge-sev-${r.severity}`}>{r.severity}</span>
                                </div>
                                <div className="report-card-body">
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.area}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Rule: <strong>{r.lifeSavingRule || 'General'}</strong> | SIF: <strong>{r.sifClassification || 'SIF-Potential'}</strong>
                                  </div>
                                  <p className="card-desc-snippet">{r.description}</p>
                                </div>
                                <div className="report-card-footer">
                                  <span className="card-stat-pill">{r.status}</span>
                                  {onViewDetail && (
                                    <button className="btn btn-secondary btn-sm" onClick={() => onViewDetail(r)}>
                                      <ExternalLink size={12} /> View Report
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. CCTV Summary Card */}
                        {msg.type === 'cctv_summary' && msg.data && (
                          <div className="copilot-cctv-card">
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--oil-navy-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Camera size={16} color="var(--oil-navy-main)" />
                              CCTV Camera Feeds Live Telemetry
                            </div>
                            <div className="cctv-grid-mini">
                              {msg.data.cameras.slice(0, 4).map(c => (
                                <div key={c.cameraId} className="cctv-item-box">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                    <span>{c.cameraId}</span>
                                    <span style={{ color: c.status === 'Online' ? '#059669' : '#DC2626' }}>● {c.status}</span>
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{c.area}</div>
                                  <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                                    Detections: <strong>{c.todayDetections}</strong> | SIF: <strong style={{ color: '#DC2626' }}>{c.sifPotentialEvents}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. Employee Profile Card */}
                        {msg.type === 'employee_profile' && msg.data && !msg.data.unauthorized && (
                          <div className="copilot-employee-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <UserCheck size={18} color="var(--oil-navy-main)" />
                              <div>
                                <strong style={{ fontSize: '0.9rem' }}>{msg.data.employeeName}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>({msg.data.employeeId})</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', background: '#F8FAFC', padding: '8px', borderRadius: '6px', borderLeft: '3px solid var(--oil-gold)' }}>
                              <strong>HSE Guidance</strong>: {msg.data.suggestedHSEAction}
                            </div>
                          </div>
                        )}

                        {/* 4. Similar Reports Matrix */}
                        {msg.type === 'similar_reports' && msg.data && (
                          <div className="copilot-similar-grid">
                            {msg.data.similarReports.map(sim => (
                              <div key={sim.id} className="similar-item-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--oil-navy-dark)' }}>{sim.id}</span>
                                  <span className="similarity-badge">{sim.similarityScore}% Match</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{sim.area} — {sim.activity}</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Rule: {sim.lifeSavingRule}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 5. Direct NLP Observation Analysis Card */}
                        {msg.type === 'nlp_analysis' && msg.data && (
                          <div className="copilot-nlp-action-card">
                            <div style={{ fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <ShieldAlert size={16} /> Direct NLP Precursor Breakdown
                            </div>
                            <div style={{ fontSize: '0.8rem', marginBottom: '10px' }}>
                              Observation analyzed and classified into formal platform database structure.
                            </div>
                            {onCreateReportFromNLP && (
                              <button 
                                className="btn btn-gold btn-sm"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => onCreateReportFromNLP(msg.data.draftReport)}
                              >
                                <PlusCircle size={14} /> Create Official Safety Report
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    )}

                    <div className="copilot-msg-timestamp">{msg.timestamp}</div>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="copilot-msg-row msg-bot">
                  <div className="bot-avatar-tiny"><Bot size={14} color="#FFFFFF" /></div>
                  <div className="copilot-bubble processing-bubble">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      Retrieving grounded HSSE platform safety metrics...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Question Pills Bar */}
            <div className="copilot-suggested-pills-bar">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                SUGGESTED INTEL QUERIES
              </div>
              <div className="pills-scroll-wrapper">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="suggested-pill-btn"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer */}
            <div className="copilot-input-footer">
              <input
                type="text"
                className="copilot-input-field"
                placeholder="Ask about SIF risk, CCTV violations, LSR stats or paste safety observation..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                className="btn btn-primary copilot-send-btn"
                onClick={() => handleSend()}
                disabled={!inputQuery.trim() || isProcessing}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper to convert Markdown formatting to HTML strings cleanly
function formatSimpleMarkdown(str = '') {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px 0; font-size:0.94rem; color:var(--oil-navy-dark); font-weight:800;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px 0; font-size:1.0rem; color:var(--oil-navy-dark); font-weight:800;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="margin:12px 0 6px 0; font-size:1.08rem; color:var(--oil-navy-dark); font-weight:800;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9; color:#0F172A; padding:2px 5px; border-radius:4px; font-size:0.78rem; font-weight:600;">$1</code>')
    .replace(/^> (.*$)/gim, '<blockquote style="border-left:3px solid var(--oil-gold); margin:6px 0; padding-left:8px; color:var(--text-muted); font-size:0.8rem; font-style:italic;">$1</blockquote>')
    .replace(/^[\-\*]\s+(.*$)/gim, '<li style="margin-left:14px; list-style-type:disc; font-size:0.83rem; margin-bottom:3px;">$1</li>')
    .replace(/^\d+\.\s+(.*$)/gim, '<li style="margin-left:14px; list-style-type:decimal; font-size:0.83rem; margin-bottom:3px;">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

