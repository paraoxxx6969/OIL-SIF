/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  OIL India HSSE — AI Safety Analysis Engine (Part 2)
 *  Rule-based NLP classifier for SIF classification, Life-Saving Rule mapping,
 *  hazard identification, barrier failure detection and consequence prediction.
 *
 *  This engine processes free-text safety report descriptions using industry-
 *  specific keyword banks aligned with OIL's Life-Saving Rules framework.
 *
 *  Output feeds the SIF Hotspot / Precursor Analysis dashboard.
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ── OIL Life-Saving Rules (LSRs) ─────────────────────────────────────────────
export const LIFE_SAVING_RULES = [
  {
    code: 'LSR-01',
    name: 'Line of Fire',
    description: 'Never position yourself in the line of fire of moving objects, pressurized fluids, or energy.',
    keywords: [
      'line of fire', 'flying object', 'projectile', 'pressurized', 'high pressure',
      'below load', 'suspended load', 'dropped object', 'swing', 'ricochet',
      'blast', 'blowout', 'kick', 'well kick', 'under crane', 'beneath load',
      'exclusion zone', 'barricade', 'exclusion area', 'restricted zone'
    ],
    consequence: 'Struck-by / Crushing / Fatality',
    color: '#DC2626',
  },
  {
    code: 'LSR-02',
    name: 'Working at Height',
    description: 'Prevent falls when working above 1.8 m / 6 feet.',
    keywords: [
      'working at height', 'fall', 'falling', 'fell', 'scaffold', 'scaffolding',
      'ladder', 'elevated', 'roof', 'platform', 'harness', 'lanyard', 'lifeline',
      'guardrail', 'handrail', 'edge', 'open edge', 'height', 'at height',
      'aerial work', 'boom lift', 'aerial platform', 'mewp', 'overhead'
    ],
    consequence: 'Fall from Height / Fatality',
    color: '#EA580C',
  },
  {
    code: 'LSR-03',
    name: 'Confined Space Entry',
    description: 'Never enter a confined space without proper authorization and controls.',
    keywords: [
      'confined space', 'confined', 'tank entry', 'vessel entry', 'manhole',
      'sewer', 'pit', 'trench', 'vault', 'silo', 'tunnel', 'entry permit',
      'gas test', 'oxygen deficiency', 'asphyxia', 'toxic atmosphere',
      'retrieval system', 'standby person', 'rescue'
    ],
    consequence: 'Asphyxiation / Toxic Exposure / Fatality',
    color: '#7C3AED',
  },
  {
    code: 'LSR-04',
    name: 'Isolation / LOTO / LOTOTO',
    description: 'Isolate all energy sources before working on equipment.',
    keywords: [
      'loto', 'lototo', 'lock out', 'lockout', 'tag out', 'tagout', 'isolation',
      'isolate', 'de-energize', 'de-energized', 'energized', 'live equipment',
      'live wire', 'stored energy', 'isolation permit', 'blinding', 'spading',
      'valve locked', 'electrical isolation', 'mechanical isolation', 'pneumatic'
    ],
    consequence: 'Electrocution / Unexpected Energy Release / Fatality',
    color: '#B45309',
  },
  {
    code: 'LSR-05',
    name: 'Hot Work / Ignition Sources',
    description: 'Control all ignition sources in flammable/explosive areas.',
    keywords: [
      'hot work', 'welding', 'grinding', 'cutting', 'spark', 'flame', 'fire',
      'flammable', 'combustible', 'explosive', 'gas cloud', 'vapor', 'ignition',
      'open flame', 'smoking', 'cigarette', 'static electricity', 'permit',
      'hot work permit', 'fire watch', 'lel', 'lower explosive limit'
    ],
    consequence: 'Fire / Explosion / Burns / Fatality',
    color: '#EF4444',
  },
  {
    code: 'LSR-06',
    name: 'Driving & Vehicle Safety',
    description: 'Follow safe driving rules; never drive impaired or distracted.',
    keywords: [
      'driving', 'vehicle', 'car', 'truck', 'speeding', 'speed', 'accident',
      'collision', 'crash', 'seat belt', 'seatbelt', 'mobile phone', 'phone',
      'distracted', 'fatigue', 'tired', 'drunk', 'impaired', 'road', 'highway',
      'driver', 'over speed', 'blind spot', 'reversing', 'reverse', 'pedestrian'
    ],
    consequence: 'Road Traffic Accident / Fatality',
    color: '#0284C7',
  },
  {
    code: 'LSR-07',
    name: 'Lifting Operations',
    description: 'Plan and execute all lifting operations safely.',
    keywords: [
      'lifting', 'crane', 'rigging', 'sling', 'hoist', 'forklift', 'forklifter',
      'suspended', 'load', 'overhead crane', 'mobile crane', 'slinger',
      'banksman', 'lift plan', 'lifting plan', 'rated capacity', 'overload',
      'unbalanced load', 'tag line', 'outrigger', 'ground condition',
      'lifting equipment', 'shackle', 'hook', 'lashing'
    ],
    consequence: 'Crushed by Load / Dropped Load / Fatality',
    color: '#9333EA',
  },
  {
    code: 'LSR-08',
    name: 'Excavation',
    description: 'Prevent cave-ins and struck-by incidents during excavation.',
    keywords: [
      'excavation', 'digging', 'trench', 'trenching', 'underground', 'soil',
      'cave in', 'collapse', 'shoring', 'battering', 'slope', 'soil stability',
      'utility', 'pipeline', 'underground service', 'buried cable', 'permit to dig'
    ],
    consequence: 'Cave-in / Burial / Asphyxiation / Fatality',
    color: '#78350F',
  },
  {
    code: 'LSR-09',
    name: 'Gas / H2S / Breathing Air',
    description: 'Control exposure to toxic, asphyxiating, or flammable gases.',
    keywords: [
      'h2s', 'hydrogen sulfide', 'gas', 'toxic gas', 'gas leak', 'gas cloud',
      'flammable gas', 'natural gas', 'methane', 'breathing air', 'scba',
      'respirator', 'gas detector', 'gas monitor', 'alarm', 'evacuation',
      'muster', 'gas concentration', 'ppm', 'exposure', 'poisoning', 'asphyxia',
      'fumes', 'vapour', 'vapor', 'inhalation'
    ],
    consequence: 'Asphyxiation / Toxic Poisoning / Fatality',
    color: '#047857',
  },
  {
    code: 'LSR-10',
    name: 'Bypassing Safety Controls',
    description: 'Never bypass or override safety-critical equipment.',
    keywords: [
      'bypass', 'override', 'defeat', 'disabled', 'tampered', 'interlock',
      'safety valve', 'pressure relief', 'trip', 'safety system', 'inhibit',
      'inhibited', 'alarm disabled', 'sprinkler', 'detector bypass',
      'safety device', 'guard removed', 'guard missing', 'barricade removed'
    ],
    consequence: 'Loss of Safety Control / Catastrophic Event',
    color: '#BE185D',
  },
  {
    code: 'LSR-11',
    name: 'Management of Change',
    description: 'Assess and manage all changes before implementation.',
    keywords: [
      'change', 'modification', 'modified', 'unauthorized change', 'moc',
      'management of change', 'procedure not followed', 'non-standard',
      'deviation', 'temporary modification', 'workaround', 'makeshift'
    ],
    consequence: 'Uncontrolled Hazard / Incident',
    color: '#0369A1',
  },
  {
    code: 'LSR-12',
    name: 'Personal Protective Equipment (PPE)',
    description: 'Wear the correct PPE for the task and work environment.',
    keywords: [
      'ppe', 'helmet', 'hard hat', 'safety shoe', 'boot', 'glove', 'goggles',
      'safety glasses', 'face shield', 'vest', 'reflective vest', 'harness',
      'ear protection', 'earmuff', 'earplug', 'mask', 'respirator',
      'safety belt', 'no ppe', 'without ppe', 'not wearing', 'improper ppe'
    ],
    consequence: 'Injury due to Lack of Protection',
    color: '#4F46E5',
  },
];

// ── SIF (Serious Injury or Fatality) keyword banks ────────────────────────────
const SIF_HIGH_KEYWORDS = [
  // Consequence words
  'fatal', 'fatality', 'death', 'died', 'kill', 'killed', 'serious injury',
  'crush', 'crushed', 'crushing', 'amputat', 'amputation', 'fracture',
  'explosion', 'explode', 'exploded', 'blast', 'detonation',
  'burn', 'burns', 'severe burn', 'fire', 'engulfed',
  'collapse', 'structural collapse', 'cave in', 'buried',
  'electrocution', 'electrocuted', 'electric shock',
  'drowning', 'drowned', 'suffocation', 'asphyxia',
  'fall from height', 'fell from', 'dropped',
  // Hazard proximity words (high severity context)
  'suspended load', 'below load', 'under crane', 'under load',
  'live wire', 'live equipment', 'energized equipment',
  'h2s', 'hydrogen sulphide', 'toxic gas', 'gas cloud',
  'well blowout', 'blowout', 'uncontrolled well',
  'confined space entry', 'oxygen deficient',
];

const SIF_MEDIUM_KEYWORDS = [
  'near miss', 'near-miss', 'almost', 'narrowly', 'potential', 'could have',
  'would have', 'lucky', 'luckily', 'just missed', 'close call',
  'no barricade', 'no exclusion', 'no permit', 'unauthorized entry',
  'no loto', 'not isolated', 'not locked', 'bypass', 'override',
  'no harness', 'no fall protection', 'working at height without',
  'no gas test', 'no air test', 'without gas monitor',
];

// ── Hazard Taxonomy ──────────────────────────────────────────────────────────
const HAZARD_MAP = [
  { hazard: 'Suspended Load',        keywords: ['suspended', 'load', 'crane', 'rigging', 'sling', 'hoist', 'overhead lift'] },
  { hazard: 'Electrical Hazard',     keywords: ['electrical', 'electric', 'live wire', 'electr', 'cable', 'switchgear', 'high voltage', 'lv', 'hv'] },
  { hazard: 'Toxic Gas / H2S',       keywords: ['gas', 'h2s', 'hydrogen', 'toxic', 'fume', 'vapor', 'vapour', 'methane', 'hydrocarbon', 'lpg'] },
  { hazard: 'Fire / Explosion',      keywords: ['fire', 'explosion', 'flammable', 'spark', 'ignition', 'flame', 'combustion', 'hot work'] },
  { hazard: 'Fall from Height',      keywords: ['fall', 'height', 'scaffold', 'ladder', 'roof', 'platform', 'elevated', 'edge', 'aerial'] },
  { hazard: 'Caught-in/Between',     keywords: ['caught', 'pinch point', 'nip point', 'rotating', 'machinery', 'moving part', 'conveyor'] },
  { hazard: 'Struck-by Object',      keywords: ['struck', 'hit', 'impact', 'flying', 'projectile', 'dropped object', 'fell on', 'falling object'] },
  { hazard: 'Chemical Exposure',     keywords: ['chemical', 'acid', 'caustic', 'corrosive', 'solvent', 'spill', 'splash', 'hazardous material'] },
  { hazard: 'Vehicle / Transport',   keywords: ['vehicle', 'car', 'truck', 'driving', 'collision', 'road', 'forklift', 'transport'] },
  { hazard: 'Excavation / Cave-in',  keywords: ['excavation', 'trench', 'digging', 'collapse', 'cave in', 'soil', 'underground'] },
  { hazard: 'Pressure Hazard',       keywords: ['pressure', 'high pressure', 'pressurized', 'blowout', 'relief', 'rupture', 'burst'] },
  { hazard: 'Ergonomic / Manual',    keywords: ['manual handling', 'heavy lifting', 'strain', 'sprain', 'repetitive', 'ergonomic', 'back'] },
  { hazard: 'Slip / Trip / Fall',    keywords: ['slip', 'slippery', 'trip', 'wet floor', 'uneven', 'obstruction', 'floor', 'walkway'] },
  { hazard: 'Housekeeping',          keywords: ['housekeeping', 'cluttered', 'clutter', 'blocked', 'passage', 'material left', 'tools left', 'waste'] },
];

// ── Barrier Failure patterns ──────────────────────────────────────────────────
const BARRIER_FAILURES = [
  { barrier: 'Exclusion Zone Not Enforced',   keywords: ['no exclusion', 'exclusion zone', 'barricade', 'no barricade', 'entered area', 'unauthorized entry', 'entered below', 'entered under'] },
  { barrier: 'Permit System Failure',         keywords: ['no permit', 'without permit', 'permit not', 'work permit', 'ptw', 'permit to work'] },
  { barrier: 'LOTO / Isolation Not Done',     keywords: ['not isolated', 'no loto', 'no lockout', 'energy not isolated', 'loto not', 'isolation not'] },
  { barrier: 'PPE Not Used / Inadequate',     keywords: ['no ppe', 'without ppe', 'not wearing', 'improper ppe', 'no helmet', 'no harness', 'no glove', 'not used'] },
  { barrier: 'Supervision Failure',           keywords: ['unsupervised', 'no supervision', 'supervisor not', 'no supervisor', 'alone', 'without supervision'] },
  { barrier: 'Procedure Not Followed',        keywords: ['procedure not', 'not following', 'sop', 'did not follow', 'violated procedure', 'bypassed', 'ignored', 'deviation'] },
  { barrier: 'Training / Competency Gap',     keywords: ['untrained', 'not trained', 'unaware', 'did not know', 'unfamiliar', 'competency', 'training'] },
  { barrier: 'Communication Failure',         keywords: ['not communicated', 'no communication', 'not informed', 'not aware', 'miscommunication', 'toolbox', 'not briefed'] },
  { barrier: 'Equipment / Guard Defect',      keywords: ['defective', 'guard missing', 'guard removed', 'broken', 'faulty', 'malfunction', 'damaged equipment', 'not maintained'] },
  { barrier: 'Gas Testing Not Done',          keywords: ['no gas test', 'without gas test', 'gas monitor not', 'not tested', 'gas check not'] },
];

// ── Utility: normalize text ───────────────────────────────────────────────────
const normalize = (text) => (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Score text against a keyword list ────────────────────────────────────────
const scoreKeywords = (text, keywords) => {
  const norm = normalize(text);
  const matched = keywords.filter(k => norm.includes(normalize(k)));
  return { count: matched.length, matched };
};

// ── Classify Life-Saving Rule ─────────────────────────────────────────────────
const classifyLSR = (fullText) => {
  let best = null;
  let bestScore = 0;
  for (const lsr of LIFE_SAVING_RULES) {
    const { count, matched } = scoreKeywords(fullText, lsr.keywords);
    if (count > bestScore) {
      bestScore = count;
      best = { ...lsr, matchedKeywords: matched, matchScore: count };
    }
  }
  return best;
};

// ── Classify Hazard ───────────────────────────────────────────────────────────
const classifyHazard = (fullText) => {
  let best = null;
  let bestScore = 0;
  for (const h of HAZARD_MAP) {
    const { count } = scoreKeywords(fullText, h.keywords);
    if (count > bestScore) { bestScore = count; best = h.hazard; }
  }
  return best || 'Unclassified';
};

// ── Detect Barrier Failure ────────────────────────────────────────────────────
const detectBarrierFailure = (fullText) => {
  const results = [];
  for (const b of BARRIER_FAILURES) {
    const { count } = scoreKeywords(fullText, b.keywords);
    if (count > 0) results.push({ barrier: b.barrier, score: count });
  }
  results.sort((a, b) => b.score - a.score);
  return results.length > 0 ? results[0].barrier : 'Not Identified';
};

// ── SIF Potential classifier ───────────────────────────────────────────────────
const classifySIF = (report, fullText) => {
  const highScore = scoreKeywords(fullText, SIF_HIGH_KEYWORDS);
  const medScore  = scoreKeywords(fullText, SIF_MEDIUM_KEYWORDS);

  // Hard rules → YES
  if (highScore.count >= 2) return { sifPotential: 'Yes', sifScore: Math.min(95, 70 + highScore.count * 5), keywords: highScore.matched };
  if (highScore.count === 1 && report.reportType === 'Incident') return { sifPotential: 'Yes', sifScore: 80, keywords: highScore.matched };
  if (report.immediateDanger === 'Yes') return { sifPotential: 'Yes', sifScore: 85, keywords: ['immediate danger flagged'] };
  if (report.injuryOccurred === 'Yes')  return { sifPotential: 'Yes', sifScore: 88, keywords: ['injury confirmed'] };

  // Medium rules → Maybe
  if (highScore.count === 1) return { sifPotential: 'Maybe', sifScore: 55, keywords: highScore.matched };
  if (medScore.count >= 2)   return { sifPotential: 'Maybe', sifScore: 45, keywords: medScore.matched };
  if (report.reportType === 'Near Miss' && report.narrowlyAvoided === 'Yes') return { sifPotential: 'Maybe', sifScore: 60, keywords: ['near miss confirmed'] };
  if (report.reportType === 'Incident') return { sifPotential: 'Maybe', sifScore: 40, keywords: ['incident type'] };
  if (medScore.count === 1)  return { sifPotential: 'Maybe', sifScore: 30, keywords: medScore.matched };

  return { sifPotential: 'No', sifScore: 10, keywords: [] };
};

// ── Confidence Scorer ────────────────────────────────────────────────────────
const scoreConfidence = (report, lsrMatch) => {
  const descLen = (report.description || '').length;
  const hasActivity = !!report.activity && report.activity !== 'Not Sure';
  const hasLocation = !!report.area;
  const lsrStrong = lsrMatch && lsrMatch.matchScore >= 2;

  let score = 0;
  if (descLen > 150) score += 3;
  else if (descLen > 60) score += 2;
  else if (descLen > 20) score += 1;

  if (hasActivity) score += 2;
  if (hasLocation) score += 1;
  if (lsrStrong)   score += 2;
  if (report.reportType && report.reportType !== 'Not Sure') score += 1;

  if (score >= 6) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
};

// ── Consequence predictor ────────────────────────────────────────────────────
const predictConsequence = (lsr, hazard, sifResult) => {
  if (sifResult.sifPotential === 'No') {
    if (hazard === 'Slip / Trip / Fall') return 'Minor Injury / First Aid';
    if (hazard === 'Housekeeping') return 'Near Miss / Minor Incident';
    return 'Minor Injury / Property Damage';
  }
  if (lsr) return lsr.consequence;
  if (hazard === 'Toxic Gas / H2S') return 'Asphyxiation / Toxic Poisoning / Fatality';
  if (hazard === 'Fire / Explosion') return 'Burns / Explosion / Fatality';
  if (hazard === 'Electrical Hazard') return 'Electrocution / Fatality';
  if (hazard === 'Fall from Height') return 'Fall / Serious Injury / Fatality';
  return 'Serious Injury / Fatality Potential';
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: processReport(report) → aiAnalysis object
// ══════════════════════════════════════════════════════════════════════════════
export const processReport = (report) => {
  try {
    // Build full text corpus from all text fields
    const fullText = [
      report.description || '',
      report.reportType  || '',
      report.activity    || '',
      report.area        || '',
      report.specificLocation || '',
      report.equipment   || '',
      report.actionNotes || '',
    ].join(' ');

    const lsrMatch    = classifyLSR(fullText);
    const hazard      = classifyHazard(fullText);
    const barrier     = detectBarrierFailure(fullText);
    const sifResult   = classifySIF(report, fullText);
    const confidence  = scoreConfidence(report, lsrMatch);
    const consequence = predictConsequence(lsrMatch, hazard, sifResult);

    // Activity: use report field or extract from LSR
    const activityLabel = (report.activity && report.activity !== 'Not Sure' && report.activity !== '')
      ? report.activity
      : (lsrMatch ? lsrMatch.name : 'Not Identified');

    return {
      status:             'analyzed',
      processedAt:        new Date().toISOString(),

      sifPotential:       sifResult.sifPotential,   // 'Yes' | 'Maybe' | 'No'
      sifScore:           sifResult.sifScore,        // 0-100

      confidence:         confidence,                // 'High' | 'Medium' | 'Low'

      lifeSavingRule:     lsrMatch ? lsrMatch.name  : 'Not Identified',
      lsrCode:            lsrMatch ? lsrMatch.code  : null,
      lsrColor:           lsrMatch ? lsrMatch.color : '#64748B',
      lsrDescription:     lsrMatch ? lsrMatch.description : '',

      hazard:             hazard,
      activity:           activityLabel,
      barrierFailure:     barrier,
      potentialConsequence: consequence,

      keywordsMatched:    [...new Set([...sifResult.keywords, ...(lsrMatch?.matchedKeywords || [])])].slice(0, 8),

      adminOverride:      false,
      adminOverrideBy:    null,
    };
  } catch (err) {
    console.error('AI Engine error:', err);
    return {
      status:         'failed',
      processedAt:    new Date().toISOString(),
      sifPotential:   'No',
      sifScore:       0,
      confidence:     'Low',
      lifeSavingRule: 'Not Identified',
      lsrCode:        null,
      hazard:         'Unclassified',
      activity:       'Unknown',
      barrierFailure: 'Not Identified',
      potentialConsequence: 'Unknown',
      keywordsMatched: [],
      adminOverride:  false,
    };
  }
};

// ── Helper exports for components ─────────────────────────────────────────────

export const getSIFColor = (sif) => {
  if (sif === 'Yes')   return { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5' };
  if (sif === 'Maybe') return { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' };
  return                      { bg: '#F0FDF4', text: '#14532D', border: '#86EFAC' };
};

export const getConfidenceColor = (conf) => {
  if (conf === 'High')   return '#10B981';
  if (conf === 'Medium') return '#F59E0B';
  return '#94A3B8';
};

export const getLSRByCode = (code) => LIFE_SAVING_RULES.find(l => l.code === code) || null;
