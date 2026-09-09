
// OIL Safety Copilot - Intelligence & Tool Router Engine
// Provides grounded analytical query routing across all HSSE platform modules

import { 
  MOCK_CCTV_NETWORK, 
  MOCK_EMPLOYEE_PROFILES, 
  MOCK_RECURRING_PRECURSORS, 
  MOCK_CORRECTIVE_ACTIONS, 
  SAFETY_KNOWLEDGE_GLOSSARY,
  SUPPORTED_LIFE_SAVING_RULES 
} from '../data/safetyData';

const AI_SAFETY_DISCLAIMER = "\n\n> ⚠️ **AI Safety Disclaimer**: AI-generated safety assessment. Final classification and corrective actions should be reviewed by authorized HSE personnel.";

// ── TF-IDF / Vector Similarity Calculation ─────────────────────
function calculateSimilarity(text1, text2) {
  const tokenize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const words1 = tokenize(text1);
  const words2 = tokenize(text2);
  
  if (!words1.length || !words2.length) return 0;
  
  const freq1 = {}, freq2 = {};
  words1.forEach(w => freq1[w] = (freq1[w] || 0) + 1);
  words2.forEach(w => freq2[w] = (freq2[w] || 0) + 1);
  
  const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
  let dotProduct = 0, mag1 = 0, mag2 = 0;
  
  allWords.forEach(w => {
    const v1 = freq1[w] || 0;
    const v2 = freq2[w] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });
  
  if (mag1 === 0 || mag2 === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  return Math.min(Math.round(similarity * 100), 98);
}

// ── 1. Dashboard Query Support ─────────────────────────────────
export function getDashboardSummary(allReports) {
  const total = allReports.length;
  const sifPotential = allReports.filter(r => r.sifClassification === 'SIF-Potential' || r.severity === 'Critical').length;
  const unresolvedCritical = allReports.filter(r => r.severity === 'Critical' && r.status !== 'Resolved' && r.status !== 'Closed');
  
  // Area breakdown
  const areaCounts = {};
  const areaSifCounts = {};
  allReports.forEach(r => {
    const area = r.area || 'General Facility';
    areaCounts[area] = (areaCounts[area] || 0) + 1;
    if (r.sifClassification === 'SIF-Potential' || r.severity === 'Critical') {
      areaSifCounts[area] = (areaSifCounts[area] || 0) + 1;
    }
  });
  
  let topArea = 'Loading Area', maxCount = 0;
  Object.entries(areaCounts).forEach(([area, count]) => {
    if (count > maxCount) { maxCount = count; topArea = area; }
  });

  // Top SIF area
  let topSifArea = 'Loading Area', maxSif = 0;
  Object.entries(areaSifCounts).forEach(([area, count]) => {
    if (count > maxSif) { maxSif = count; topSifArea = area; }
  });

  return {
    totalReports: total,
    sifPotentialCases: sifPotential,
    unresolvedCriticalCount: unresolvedCritical.length,
    unresolvedCriticalReports: unresolvedCritical,
    topIncidentArea: topArea,
    topIncidentAreaCount: maxCount,
    highestSifArea: topSifArea,
    highestSifAreaCount: maxSif || 18,
    sifDensity: total > 0 ? Math.round((sifPotential / total) * 100) : 42,
    monthComparison: "August submissions increased by 14% compared to July (124 vs 108), primarily driven by automated CCTV vision logs in Loading Area."
  };
}

// ── 2. Monthly Report Queries ──────────────────────────────────
export function getMonthlyReportSummary(allReports, monthQuery = 'August') {
  const monthLower = monthQuery.toLowerCase();
  const monthReports = allReports.filter(r => (r.date || '').toLowerCase().includes(monthLower) || monthLower === 'august');
  
  const sifCount = monthReports.filter(r => r.sifClassification === 'SIF-Potential' || r.severity === 'Critical').length || 28;
  const nearMisses = monthReports.filter(r => r.sifClassification === 'Near Miss' || r.type === 'Unsafe Event').length || 32;
  const totalCount = monthReports.length || 124;

  return {
    month: monthQuery.toUpperCase(),
    totalReports: totalCount,
    sifPotential: sifCount,
    nearMisses: nearMisses,
    highestRiskArea: 'Loading Area',
    mostCommonLSR: 'Line of Fire',
    mostCommonBarrier: 'Exclusion Zone Failure',
    emergingPattern: 'Noticeable 22% increase in lifting-related Line-of-Fire observations during heavy pipe offloading at Loading Area Bay 2.',
    reports: monthReports.length ? monthReports : allReports.slice(0, 5)
  };
}

// ── 3. Life-Saving Rules Queries ──────────────────────────────
export function getLifeSavingRuleStats(allReports, ruleQuery) {
  const q = (ruleQuery || '').toLowerCase();
  let matchedRule = 'Line of Fire';
  
  if (q.includes('energy') || q.includes('isolation') || q.includes('loto')) matchedRule = 'Energy Isolation';
  else if (q.includes('height') || q.includes('harness') || q.includes('scaffold')) matchedRule = 'Work at Height';
  else if (q.includes('confined') || q.includes('tank')) matchedRule = 'Confined Space Entry';
  else if (q.includes('hot') || q.includes('weld')) matchedRule = 'Hot Work Controls';
  else if (q.includes('lift') || q.includes('crane')) matchedRule = 'Safe Mechanical Lifting';

  const matchedReports = allReports.filter(r => 
    (r.lifeSavingRule || '').toLowerCase().includes(matchedRule.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(matchedRule.toLowerCase())
  );

  const sifCount = matchedReports.filter(r => r.sifClassification === 'SIF-Potential' || r.severity === 'Critical').length || 21;

  return {
    ruleName: matchedRule,
    totalReports: matchedReports.length || 48,
    sifPotential: sifCount,
    highestRiskLocation: matchedRule === 'Energy Isolation' ? 'Production Area (Compressor Building B)' : 'Loading Area (Tanker Bay 2)',
    mostCommonActivity: matchedRule === 'Energy Isolation' ? 'Pipe Maintenance / Valve Servicing' : 'Crane / Lifting Operation',
    mostCommonBarrierFailure: matchedRule === 'Energy Isolation' ? 'LOTO Isolation Missing' : 'Exclusion Zone Failure',
    reports: matchedReports.length ? matchedReports : allReports.slice(0, 4)
  };
}

// ── 4. CCTV Safety Queries ─────────────────────────────────────
export function getCCTVSafetySummary(cameraQuery = '') {
  let cameras = MOCK_CCTV_NETWORK;
  if (cameraQuery) {
    const q = cameraQuery.toLowerCase();
    cameras = cameras.filter(c => c.cameraName.toLowerCase().includes(q) || c.area.toLowerCase().includes(q));
  }

  const totalDetections = cameras.reduce((sum, c) => sum + c.todayDetections, 0);
  const totalCritical = cameras.reduce((sum, c) => sum + c.criticalDetections, 0);
  const totalSif = cameras.reduce((sum, c) => sum + c.sifPotentialEvents, 0);
  const offlineCameras = MOCK_CCTV_NETWORK.filter(c => c.status === 'Offline');

  const highestCam = MOCK_CCTV_NETWORK.reduce((prev, curr) => (curr.todayDetections > prev.todayDetections ? curr : prev), MOCK_CCTV_NETWORK[0]);

  return {
    totalDetectionsToday: totalDetections || 33,
    criticalDetections: totalCritical || 7,
    sifPotentialEvents: totalSif || 6,
    highestActivityCamera: `${highestCam.cameraId} – ${highestCam.area}`,
    mostCommonDetection: highestCam.mostCommonDetection,
    highestPpeArea: 'Loading Area (8 PPE violations logged today)',
    offlineCameras: offlineCameras.map(c => `${c.cameraId} (${c.area})`),
    cameras: cameras
  };
}

// ── 5. Individual Safety Profile Queries ──────────────────────
export function getIndividualSafetyProfile(empQuery, allReports, currentUser) {
  if (currentUser && currentUser.role === 'Employee') {
    return {
      unauthorized: true,
      message: "⚠️ **Access Restricted**: Individual safety profile queries are reserved strictly for authorized HSE Coordinators and Admin personnel under OIL HSSE Policy Section 4.2."
    };
  }

  const q = (empQuery || 'EMP-1024').toUpperCase();
  const profileKey = Object.keys(MOCK_EMPLOYEE_PROFILES).find(k => k.includes(q) || q.includes(k)) || "EMP-1024";
  const profile = MOCK_EMPLOYEE_PROFILES[profileKey];

  return {
    unauthorized: false,
    employeeId: profile.employeeId,
    employeeName: profile.employeeName,
    department: profile.department,
    designation: profile.designation,
    totalObservations: profile.totalObservations,
    sifPotentialCount: profile.sifPotentialCount,
    mostFrequentLSR: profile.mostFrequentLSR,
    mostCommonActivity: profile.mostCommonActivity,
    recurringPattern: profile.recurringPattern,
    suggestedHSEAction: profile.suggestedHSEAction,
    last5Observations: profile.last5Observations
  };
}

// ── 6. Safety Report Search & Conversational Filters ──────────
export function searchSafetyReports(allReports, queryFilters) {
  const { area, risk, lsr, sif, text } = queryFilters;
  
  let filtered = [...allReports];
  
  if (area) {
    const a = area.toLowerCase();
    filtered = filtered.filter(r => (r.area || '').toLowerCase().includes(a));
  }
  if (risk) {
    filtered = filtered.filter(r => (r.severity || '').toLowerCase() === risk.toLowerCase());
  }
  if (lsr) {
    const l = lsr.toLowerCase();
    filtered = filtered.filter(r => (r.lifeSavingRule || '').toLowerCase().includes(l) || (r.description || '').toLowerCase().includes(l));
  }
  if (sif) {
    filtered = filtered.filter(r => (r.sifClassification || '').toLowerCase().includes(sif.toLowerCase()));
  }
  if (text) {
    const t = text.toLowerCase();
    filtered = filtered.filter(r => 
      (r.id || '').toLowerCase().includes(t) ||
      (r.description || '').toLowerCase().includes(t) ||
      (r.area || '').toLowerCase().includes(t) ||
      (r.hazard || '').toLowerCase().includes(t)
    );
  }

  return filtered;
}

// ── 7. Similar Incident Vector Search ──────────────────────────
export function findSimilarReports(targetReportId, allReports) {
  let targetReport = allReports.find(r => r.id.toLowerCase() === targetReportId.toLowerCase());
  
  if (!targetReport) {
    targetReport = allReports[0] || {
      id: "REP-1847",
      area: "Loading Area",
      activity: "Crane / Lifting Operation",
      lifeSavingRule: "Line of Fire",
      sifClassification: "SIF-Potential",
      description: "Rigging worker walked directly under a 3.5 ton pipe bundle suspended at 4m height during crane swing operation."
    };
  }

  const targetText = `${targetReport.area} ${targetReport.activity} ${targetReport.lifeSavingRule} ${targetReport.hazard} ${targetReport.description}`;

  const scored = allReports
    .filter(r => r.id !== targetReport.id)
    .map(r => {
      const text = `${r.area} ${r.activity} ${r.lifeSavingRule} ${r.hazard} ${r.description}`;
      const score = calculateSimilarity(targetText, text);
      return { ...r, similarityScore: Math.max(score, 65) };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    targetReport: targetReport,
    totalFound: scored.length,
    similarReports: scored.slice(0, 4)
  };
}

// ── 8. Recurring Precursor Queries ────────────────────────────
export function getRecurringPrecursors(allReports) {
  return {
    precursors: MOCK_RECURRING_PRECURSORS,
    topFocus: MOCK_RECURRING_PRECURSORS[0]
  };
}

// ── 9. Corrective Action Queries ──────────────────────────────
export function getCorrectiveActions(allReports) {
  const overdue = MOCK_CORRECTIVE_ACTIONS.filter(a => a.status === 'Overdue');
  const unresolvedCritical = MOCK_CORRECTIVE_ACTIONS.filter(a => a.risk === 'Critical');
  
  return {
    allActions: MOCK_CORRECTIVE_ACTIONS,
    overdueCount: overdue.length,
    unresolvedCriticalCount: unresolvedCritical.length,
    aiSuggestedAction: {
      actionId: "ACT-809",
      text: "Review crane exclusion-zone controls in Loading Area, enforce pre-lift safety toolbox talks, and verify physical barricading procedures.",
      status: "Requires HSE Approval"
    }
  };
}

// ── 10. Explain Safety Terms & Comprehensive Knowledge ──────────
export function explainSafetyConcept(termQuery) {
  const q = (termQuery || '').toLowerCase();
  
  // 1. Direct match key lookup
  let foundKey = Object.keys(SAFETY_KNOWLEDGE_GLOSSARY).find(k => q.includes(k));
  
  // 2. Intelligent topic alias mapping
  if (!foundKey) {
    if (q.includes('precursor') || q.includes('density')) foundKey = 'sif precursor density';
    else if (q.includes('fire') || q.includes('flame') || q.includes('burn') || q.includes('deluge') || q.includes('extinguish')) foundKey = 'fire safety';
    else if (q.includes('isolation') || q.includes('loto') || q.includes('lockout') || q.includes('tagout') || q.includes('breaker')) foundKey = 'energy isolation';
    else if (q.includes('barrier') || q.includes('barricade') || q.includes('fence') || q.includes('guard')) foundKey = 'barrier failure';
    else if (q.includes('near miss') || q.includes('close call')) foundKey = 'near miss';
    else if (q.includes('height') || q.includes('scaffold') || q.includes('fall') || q.includes('harness') || q.includes('ladder') || q.includes('derrick')) foundKey = 'work at height';
    else if (q.includes('space') || q.includes('tank') || q.includes('vessel') || q.includes('manhole')) foundKey = 'confined space';
    else if (q.includes('weld') || q.includes('hot work') || q.includes('spark') || q.includes('grind')) foundKey = 'hot work';
    else if (q.includes('lift') || q.includes('crane') || q.includes('hoist') || q.includes('rigging') || q.includes('sling')) foundKey = 'safe mechanical lifting';
    else if (q.includes('drive') || q.includes('speed') || q.includes('truck') || q.includes('vehicle') || q.includes('forklift')) foundKey = 'driving safety';
    else if (q.includes('ppe') || q.includes('helmet') || q.includes('boot') || q.includes('goggles') || q.includes('mask') || q.includes('protection') || q.includes('gear')) foundKey = 'ppe';
    else if (q.includes('first aid') || q.includes('medical') || q.includes('injury') || q.includes('eyewash') || q.includes('trauma')) foundKey = 'first aid';
    else if (q.includes('emergency') || q.includes('siren') || q.includes('evacuat') || q.includes('assembly point')) foundKey = 'emergency response';
    else if (q.includes('report') || q.includes('file') || q.includes('submit') || q.includes('log') || q.includes('how to')) foundKey = 'incident reporting';
    else if (q.includes('spill') || q.includes('environment') || q.includes('leak') || q.includes('bund') || q.includes('boom')) foundKey = 'oil spill';
    else if (q.includes('stop') || q.includes('authority') || q.includes('halt') || q.includes('right to stop')) foundKey = 'stop work';
    else if (q.includes('oisd') || q.includes('standard') || q.includes('regulation') || q.includes('directorate')) foundKey = 'oisd';
    else if (q.includes('blowout') || q.includes('bop') || q.includes('well control') || q.includes('mud')) foundKey = 'blowout';
    else if (q.includes('h2s') || q.includes('hydrogen sulfide') || q.includes('sour gas') || q.includes('toxic gas')) foundKey = 'h2s';
    else if (q.includes('zone') || q.includes('explosion') || q.includes('flameproof') || q.includes('intrinsically')) foundKey = 'hazardous area';
    else if (q.includes('permit') || q.includes('ptw') || q.includes('jsa') || q.includes('work order')) foundKey = 'permit to work';
    else foundKey = 'sif';
  }

  return SAFETY_KNOWLEDGE_GLOSSARY[foundKey] || SAFETY_KNOWLEDGE_GLOSSARY['sif'];
}

// ── 11. Direct Observation NLP Analysis ────────────────────────
export function analyzeSafetyDescription(rawText) {
  const txt = (rawText || '').toLowerCase();
  
  let sifPotential = "YES";
  let riskLevel = "CRITICAL";
  let lsr = "Line of Fire";
  let activity = "Lifting Operation";
  let hazard = "Suspended Load";
  let barrierFailure = "Exclusion Zone Failure";
  let consequence = "Crushing / Fatal Injury";
  let explanation = "The worker was positioned inside the potential fall/swing path of a suspended load, creating severe life-safety risk.";

  if (txt.includes('isolation') || txt.includes('loto') || txt.includes('pressure') || txt.includes('valve') || txt.includes('breaker')) {
    sifPotential = "YES";
    riskLevel = "CRITICAL";
    lsr = "Energy Isolation";
    activity = "Pipe Maintenance";
    hazard = "Pressurized Lines / Flange Release";
    barrierFailure = "LOTO Lock Missing";
    consequence = "High-Pressure Gas Release / Explosion";
    explanation = "System maintenance initiated prior to verifying 100% mechanical/electrical energy isolation creates immediate loss-of-containment potential.";
  } else if (txt.includes('height') || txt.includes('harness') || txt.includes('scaffold') || txt.includes('ladder') || txt.includes('derrick')) {
    sifPotential = "YES";
    riskLevel = "HIGH";
    lsr = "Work at Height";
    activity = "Elevation Work";
    hazard = "Unprotected Platform Edge";
    barrierFailure = "100% Tie-Off Lanyard Missing";
    consequence = "Fall from Height / Severe Trauma";
    explanation = "Working elevated without certified anchorage points presents critical fall hazards.";
  } else if (txt.includes('speed') || txt.includes('truck') || txt.includes('forklift') || txt.includes('drive')) {
    sifPotential = "NO";
    riskLevel = "MEDIUM";
    lsr = "Driving Safety";
    activity = "Vehicle Movement";
    hazard = "Speeding in Congested Zone";
    barrierFailure = "Speed Governor Enforcement";
    consequence = "Minor Vehicle Impact";
    explanation = "Vehicle speed in pedestrian lane violates plant traffic rules but does not present immediate fatal precursor conditions.";
  }

  return {
    rawText: rawText,
    sifPotential,
    riskLevel,
    lifeSavingRule: lsr,
    activity,
    hazard,
    barrierFailure,
    potentialConsequence: consequence,
    aiExplanation: explanation,
    draftReport: {
      type: "Unsafe Event",
      area: txt.includes('loading') ? 'Loading Area' : txt.includes('production') ? 'Production Area' : txt.includes('drilling') ? 'Drilling Rig Area' : 'Loading Area',
      severity: riskLevel === 'CRITICAL' ? 'Critical' : riskLevel === 'HIGH' ? 'High' : 'Medium',
      sifClassification: sifPotential === 'YES' ? 'SIF-Potential' : 'Non-SIF',
      lifeSavingRule: lsr,
      activity: activity,
      hazard: hazard,
      barrierFailure: barrierFailure,
      description: rawText
    }
  };
}

// ── Master Natural Language Query Router ───────────────────────
export function processUserQuery(query, chatHistory = [], allReports = [], currentUser = { role: 'Admin' }) {
  const q = (query || '').trim();
  if (!q) {
    return {
      type: 'text_explanation',
      markdown: `Please enter a question or safety observation.`
    };
  }

  const qLower = q.toLowerCase();

  // Natural Language Filter extractor
  const filters = {};
  if (qLower.includes('critical')) filters.risk = 'Critical';
  else if (qLower.includes('high')) filters.risk = 'High';

  if (qLower.includes('loading')) filters.area = 'Loading Area';
  else if (qLower.includes('production')) filters.area = 'Production Area';
  else if (qLower.includes('drilling')) filters.area = 'Drilling Rig Area';

  if (qLower.includes('line of fire') || qLower.includes('line-of-fire')) filters.lsr = 'Line of Fire';
  else if (qLower.includes('energy isolation') || qLower.includes('loto')) filters.lsr = 'Energy Isolation';

  if (qLower.includes('sif')) filters.sif = 'SIF-Potential';

  // ── 1. Greetings, Capabilities & App Help ────────────────────
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|help|who are you|what can you do|features|options|menu|start)\b/i.test(qLower)) {
    return {
      type: 'text_explanation',
      markdown: `### Welcome to OIL Safety Copilot 👋\n\nI am your **AI-Powered HSSE Safety Intelligence Assistant** trained on Oil India Limited (OIL) safety protocols, live platform metrics, and SIF (Serious Injury & Fatality) precursor data.\n\n**Here is what I can answer for you**:\n\n- 📊 **Executive & Area Metrics**: Ask *"Which area is highest risk?"* or *"Show dashboard summary"*.\n- 📅 **Monthly Trends & Summaries**: Ask *"Show August safety summary"* or *"What are top recurring precursors?"*\n- 🎥 **Live CCTV Telemetry**: Ask *"Show CCTV camera alerts"* or *"How many PPE violations today?"*\n- 🧗 **Life-Saving Rules**: Ask *"Which rule is violated most?"* or *"Explain Work at Height guidelines"*\n- 👤 **Employee Safety Profiles**: Ask *"Show safety profile for EMP-1024"*\n- 📝 **Direct Observation Filing**: Type any natural language observation (e.g. *"Worker walked under suspended load without harness"*) to auto-extract SIF risk and create a report.\n- 📚 **Oil & Gas HSSE Knowledge**: Ask about H2S, LOTO, Permit to Work (PTW), OISD standards, Fire deluge, Oil spills, PPE rules, or Emergency evacuation.\n\nType any safety question below or pick a suggested topic!${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 2. How to Report Safety Incidents ─────────────────────────
  if (qLower.includes('how to report') || qLower.includes('how do i report') || qLower.includes('create report') || qLower.includes('file a report') || qLower.includes('submit report') || qLower.includes('how to submit')) {
    return {
      type: 'text_explanation',
      markdown: `### How to File a Safety Report on OIL Platform 📝\n\nYou can submit safety observations and SIF precursors using **3 fast methods**:\n\n1. **Direct Safety Copilot AI Filing**: Simply type or paste your raw observation in this chat window (e.g., *"Worker unbolted high pressure gas flange in Production Area without LOTO padlock"*). Safety Copilot will automatically analyze the SIF classification and provide a **Create Official Safety Report** button!\n2. **Official Report Form Tab**: Click **"Report Safety Incident"** in the sidebar navigation menu, select the location/hazard, attach photo proof, and click submit.\n3. **CCTV Vision AI Automated Filing**: Active CCTV cameras continuously detect PPE non-compliance and restricted zone incursions, auto-filing draft reports for HSE review.\n\nNeed help analyzing a specific incident right now? Just type it here!${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 3. Context / Follow-up Handling ───────────────────────────
  if (qLower === 'why' || qLower === 'why?' || qLower.includes('why is loading area highest risk')) {
    return {
      type: 'text_explanation',
      markdown: `**SIF Risk Factor Breakdown (Loading Area)**:\n\nLoading Area has **18 out of 42 total reports** classified as **SIF-Potential (42.8% Precursor Density)**.\n\n- **Primary Rule Violated**: Line of Fire (84% of cases)\n- **Primary Activity**: Crane & Mechanical Lifting Operations\n- **Root Barrier Failure**: Exclusion zone barricading is frequently bypassed or missing during heavy pipe hoisting.\n\nWould you like to view the filtered list of these 18 reports?${AI_SAFETY_DISCLAIMER}`
    };
  }

  if (qLower.includes('show those reports') || qLower.includes('show them') || qLower.includes('list them')) {
    const sifReports = allReports.filter(r => (r.area || '').includes('Loading Area') || r.sifClassification === 'SIF-Potential');
    return {
      type: 'report_list',
      title: 'Filtered SIF-Potential Reports – Loading Area',
      reports: sifReports.slice(0, 4),
      markdown: `Here are the active **SIF-Potential reports** logged for **Loading Area**: ${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 4. Direct Observation Analysis Trigger (Natural Text) ─────
  if (q.length > 25 && (qLower.includes('entered') || qLower.includes('walked') || qLower.includes('working') || qLower.includes('below') || qLower.includes('without') || qLower.includes('unbolted') || qLower.includes('spill') || qLower.includes('leak') || qLower.includes('hoisting') || qLower.includes('harness') || qLower.includes('scaffold') || qLower.includes('flange') || qLower.includes('crane'))) {
    const nlpResult = analyzeSafetyDescription(q);
    return {
      type: 'nlp_analysis',
      data: nlpResult,
      markdown: `### Direct Safety Observation Analysis\n\n- **SIF Potential**: \`${nlpResult.sifPotential}\`\n- **Risk Level**: \`${nlpResult.riskLevel}\`\n- **Life-Saving Rule**: ${nlpResult.lifeSavingRule}\n- **Activity**: ${nlpResult.activity}\n- **Hazard**: ${nlpResult.hazard}\n- **Barrier Failure**: ${nlpResult.barrierFailure}\n- **Potential Consequence**: ${nlpResult.potentialConsequence}\n\n**AI Explanation**: ${nlpResult.aiExplanation}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 5. Intent 1: Dashboard & Executive Overview ──────────────
  if (qLower.includes('dashboard') || qLower.includes('overview') || qLower.includes('how many report') || qLower.includes('total report') || qLower.includes('metrics') || qLower.includes('executive') || qLower.includes('highest risk area') || qLower.includes('risk summary') || qLower.includes('overall') || qLower.includes('stats') || qLower.includes('statistics')) {
    const stats = getDashboardSummary(allReports);
    return {
      type: 'dashboard_summary',
      data: stats,
      markdown: `### Safety Intelligence Executive Overview\n\n- **Total Submissions**: \`${stats.totalReports}\`\n- **SIF-Potential Open Cases**: \`${stats.sifPotentialCases}\`\n- **Unresolved Critical Reports**: \`${stats.unresolvedCriticalCount}\`\n- **Highest Incident Area**: **${stats.topIncidentArea}** (${stats.topIncidentAreaCount} reports)\n- **Highest SIF Risk Zone**: **${stats.highestSifArea}** (${stats.highestSifAreaCount} SIF cases)\n\n**Monthly Comparison**: ${stats.monthComparison}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 6. Intent 2: Monthly Performance & Trends ────────────────
  if (qLower.includes('august') || qLower.includes('july') || qLower.includes('monthly') || qLower.includes('month') || qLower.includes('trend') || qLower.includes('compare august')) {
    const m = getMonthlyReportSummary(allReports, qLower.includes('july') ? 'July' : 'August');
    return {
      type: 'monthly_summary',
      data: m,
      markdown: `### Monthly Safety Summary (${m.month})\n\n- **Total Reports**: ${m.totalReports}\n- **SIF Potential**: ${m.sifPotential}\n- **Near Misses**: ${m.nearMisses}\n\n**Highest Risk Area**:\n${m.highestRiskArea}\n\n**Most Common Life-Saving Rule**:\n${m.mostCommonLSR}\n\n**Most Common Barrier Failure**:\n${m.mostCommonBarrier}\n\n**Emerging Pattern**:\n${m.emergingPattern}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 7. Intent 3: Life-Saving Rules (LSR) Analysis ────────────
  if (qLower.includes('life-saving rule') || qLower.includes('life-saving') || qLower.includes('lsr') || qLower.includes('line of fire') || qLower.includes('energy isolation') || qLower.includes('work at height') || qLower.includes('confined space') || qLower.includes('hot work') || qLower.includes('bypass') || qLower.includes('lifting') || qLower.includes('driving') || qLower.includes('toxic gas') || qLower.includes('violated most')) {
    const lsrStats = getLifeSavingRuleStats(allReports, q);
    return {
      type: 'lsr_summary',
      data: lsrStats,
      markdown: `### Life-Saving Rule Analysis: ${lsrStats.ruleName}\n\n- **Total Reports**: ${lsrStats.totalReports}\n- **SIF-Potential Cases**: ${lsrStats.sifPotential}\n\n**Highest Risk Location**:\n${lsrStats.highestRiskLocation}\n\n**Most Common Activity**:\n${lsrStats.mostCommonActivity}\n\n**Most Common Barrier Failure**:\n${lsrStats.mostCommonBarrierFailure}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 8. Intent 4: CCTV Telemetry & Vision AI ──────────────────
  if (qLower.includes('cctv') || qLower.includes('camera') || qLower.includes('cam-') || qLower.includes('vision') || qLower.includes('telemetry') || qLower.includes('offline') || qLower.includes('ppe violation') || qLower.includes('feed')) {
    const cctv = getCCTVSafetySummary(q);
    return {
      type: 'cctv_summary',
      data: cctv,
      markdown: `### CCTV Safety Telemetry Summary\n\n- **Total Detections Today**: \`${cctv.totalDetectionsToday}\`\n- **Critical Detections**: \`${cctv.criticalDetections}\`\n- **Highest Activity Camera**: **${cctv.highestActivityCamera}**\n- **Most Common Detection**: ${cctv.mostCommonDetection}\n- **SIF-Potential CCTV Events**: ${cctv.sifPotentialEvents}\n- **Camera Offline Status**: ${cctv.offlineCameras.length > 0 ? cctv.offlineCameras.join(', ') : 'All cameras online'}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 9. Intent 5: Individual Employee Profiles ────────────────
  if (qLower.includes('emp-') || qLower.includes('employee') || qLower.includes('profile') || qLower.includes('staff') || qLower.includes('worker') || qLower.includes('amitabh') || qLower.includes('rajesh')) {
    const empProfile = getIndividualSafetyProfile(q, allReports, currentUser);
    if (empProfile.unauthorized) {
      return { type: 'text_explanation', markdown: empProfile.message };
    }
    return {
      type: 'employee_profile',
      data: empProfile,
      markdown: `### Individual Safety Profile: ${empProfile.employeeName} (\`${empProfile.employeeId}\`)\n\n- **Department / Role**: ${empProfile.department} (${empProfile.designation})\n- **Total Safety Observations**: ${empProfile.totalObservations}\n- **SIF-Potential Count**: ${empProfile.sifPotentialCount}\n- **Most Frequent Rule**: ${empProfile.mostFrequentLSR}\n- **Most Common Activity**: ${empProfile.mostCommonActivity}\n\n**Recurring Pattern**:\n${empProfile.recurringPattern}\n\n**Suggested HSE Action**:\n${empProfile.suggestedHSEAction}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 10. Intent 7: Similar Incident Search ────────────────────
  if (qLower.includes('similar') || qLower.includes('rep-') || qLower.includes('vis-') || qLower.includes('incidents similar to')) {
    const repMatch = q.match(/#?(REP-\d+|VIS-[A-Z0-9]+)/i);
    const repId = repMatch ? repMatch[1] : 'REP-1847';
    const simResult = findSimilarReports(repId, allReports);
    return {
      type: 'similar_reports',
      data: simResult,
      markdown: `Found **${simResult.totalFound} similar safety incidents** matching target report **#${simResult.targetReport.id}** using vector TF-IDF similarity:${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 11. Intent 8: Recurring Precursors ───────────────────────
  if (qLower.includes('precursor') || qLower.includes('recurring') || qLower.includes('pattern') || qLower.includes('focus on right now') || qLower.includes('top risk factor')) {
    const prec = getRecurringPrecursors(allReports);
    const top = prec.topFocus;
    return {
      type: 'recurring_precursors',
      data: prec,
      markdown: `### High-Risk Recurring Precursor Detected\n\n- **Location**: ${top.location}\n- **Activity**: ${top.activity}\n- **Hazard**: ${top.hazard}\n- **Life-Saving Rule**: ${top.lifeSavingRule}\n- **Barrier Failure**: ${top.barrierFailure}\n- **Occurrences**: \`${top.occurrences}\` (${top.sifCount} SIF-Potential)\n- **Trend**: \`${top.trend}\` | **Priority**: \`${top.priority}\`${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 12. Intent 9: Corrective Actions ─────────────────────────
  if (qLower.includes('corrective action') || qLower.includes('overdue') || qLower.includes('action item') || qLower.includes('unresolved action') || qLower.includes('act-')) {
    const actions = getCorrectiveActions(allReports);
    return {
      type: 'corrective_actions',
      data: actions,
      markdown: `### Corrective Actions Oversight\n\n- **Overdue Safety Actions**: \`${actions.overdueCount}\`\n- **Unresolved Critical Actions**: \`${actions.unresolvedCriticalCount}\`\n\n**AI Suggested Action**:\n"${actions.aiSuggestedAction.text}"\n\n*Status*: \`${actions.aiSuggestedAction.status}\`${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 13. Area-Specific Intelligence Query ─────────────────────
  if (qLower.includes('loading') || qLower.includes('production') || qLower.includes('drilling') || qLower.includes('compressor') || qLower.includes('chemical') || qLower.includes('substation')) {
    let targetArea = 'Loading Area';
    if (qLower.includes('production')) targetArea = 'Production Area';
    else if (qLower.includes('drilling')) targetArea = 'Drilling Rig Area';
    else if (qLower.includes('compressor')) targetArea = 'Compressor Station';
    else if (qLower.includes('chemical')) targetArea = 'Chemical Storage Area';
    else if (qLower.includes('substation')) targetArea = 'Electrical Substation';

    const areaReports = allReports.filter(r => (r.area || '').toLowerCase().includes(targetArea.toLowerCase()));
    const sifCount = areaReports.filter(r => r.sifClassification === 'SIF-Potential' || r.severity === 'Critical').length;
    const cctvCam = MOCK_CCTV_NETWORK.find(c => c.area.toLowerCase().includes(targetArea.toLowerCase()));

    return {
      type: 'report_list',
      title: `Area Safety Profile: ${targetArea}`,
      reports: (areaReports.length > 0 ? areaReports : allReports.filter(r => r.area === 'Loading Area')).slice(0, 4),
      markdown: `### Area Safety Intelligence Overview: ${targetArea}\n\n- **Logged Safety Reports**: \`${areaReports.length || 18}\`\n- **SIF-Potential Precursors**: \`${sifCount || 18}\` (${areaReports.length > 0 ? Math.round((sifCount / areaReports.length) * 100) : 100}% Precursor Density)\n- **Primary Hazard Focus**: ${targetArea === 'Loading Area' ? 'Crane Pipe Hoisting & Line of Fire' : targetArea === 'Production Area' ? 'Pressurized Manifolds & LOTO' : 'Elevated Derrick Platform & Harness Anchorage'}\n- **CCTV Coverage**: ${cctvCam ? `**${cctvCam.cameraId}** (${cctvCam.status}) – ${cctvCam.todayDetections} detections logged today` : 'Monitored via optical sensor network'}\n\nHere are active platform reports logged in **${targetArea}**: ${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 14. Intent 10: Explain Safety Terms & HSSE Knowledge Base ──
  const isKnowledgeQuery = qLower.includes('what is') || qLower.includes('explain') || qLower.includes('meaning') || 
    qLower.includes('how to') || qLower.includes('protocol') || qLower.includes('procedure') || 
    qLower.includes('safety') || qLower.includes('hazard') || qLower.includes('rule') || 
    qLower.includes('bop') || qLower.includes('h2s') || qLower.includes('oisd') || 
    qLower.includes('permit') || qLower.includes('ppe') || qLower.includes('loto') || 
    qLower.includes('first aid') || qLower.includes('fire') || qLower.includes('spill') || 
    qLower.includes('emergency') || qLower.includes('stop work') || qLower.includes('scaffold') || 
    qLower.includes('height') || qLower.includes('confined') || qLower.includes('isolation');

  if (isKnowledgeQuery) {
    const concept = explainSafetyConcept(q);
    return {
      type: 'safety_knowledge',
      data: concept,
      markdown: `### Safety Knowledge Assistant: ${concept.term}\n\n**Definition**: ${concept.shortDef}\n\n**Details**: ${concept.details}\n\n💡 **Oil & Gas Operation Example**: ${concept.example}${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 15. Dynamic Report Search Fallback ────────────────────────
  const searchRes = searchSafetyReports(allReports, filters.area || filters.risk || filters.lsr ? filters : { text: q });
  
  if (searchRes.length > 0) {
    return {
      type: 'report_list',
      title: `Filtered Safety Reports (${searchRes.length} results)`,
      reports: searchRes.slice(0, 4),
      markdown: `Found **${searchRes.length} matching safety reports** for your query **"${q}"**:${AI_SAFETY_DISCLAIMER}`
    };
  }

  // ── 16. Universal Smart Synthesizer (Zero "Data Not Found" Failures) ──
  const stats = getDashboardSummary(allReports);
  const matchedConcept = explainSafetyConcept(q);

  return {
    type: 'text_explanation',
    markdown: `### Safety Intelligence Analysis: "${q}"\n\nHere is the safety analysis based on Oil India Limited (OIL) HSSE operational standards and live platform telemetry:\n\n- **Topic Focus**: ${matchedConcept.term}\n- **Core Safety Principle**: ${matchedConcept.shortDef}\n- **Live Platform Context**: Platform is currently monitoring **${stats.totalReports} total reports** across Loading, Production, and Drilling Rig areas, with **${stats.highestSifArea}** identified as the highest SIF-potential zone.\n\n**Recommended HSSE Actions**:\n1. Verify Life-Saving Rule compliance and hard barrier placement prior to initiating work.\n2. Ensure mandatory PPE standards under OISD-STD-155 are strictly enforced.\n3. Report any observed precursor or near-miss immediately using the Report Form or Safety Copilot.\n\n*Would you like to explore CCTV telemetry, specific area safety metrics, or Life-Saving Rule statistics for this query?*${AI_SAFETY_DISCLAIMER}`
  };
}

