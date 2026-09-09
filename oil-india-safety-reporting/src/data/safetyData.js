// Comprehensive HSSE Safety Intelligence Data Model & Knowledge Base
// Grounded real data for SIF/Non-SIF, Life-Saving Rules, CCTV monitoring, Employee profiles, Corrective actions & Knowledge RAG

export const SUPPORTED_LIFE_SAVING_RULES = [
  { id: 'LINE_OF_FIRE', name: 'Line of Fire', icon: '🎯', description: 'Positioning yourself in the path of moving machinery, suspended loads, or pressurized releases.' },
  { id: 'ENERGY_ISOLATION', name: 'Energy Isolation', icon: '⚡', description: 'Verifying isolation and zero energy state (LOTO) before beginning work.' },
  { id: 'WORK_AT_HEIGHT', name: 'Work at Height', icon: '🧗', description: 'Using 100% fall protection when working above 1.8 meters.' },
  { id: 'CONFINED_SPACE', name: 'Confined Space Entry', icon: '🕳️', description: 'Obtaining permit, gas testing, and maintaining continuous standby attendant.' },
  { id: 'HOT_WORK', name: 'Hot Work Controls', icon: '🔥', description: 'Clearing flammable hazards, conducting gas checks, and posting a fire watch.' },
  { id: 'BYPASS_SAFEGUARDS', name: 'Bypass Safety Controls', icon: '🛡️', description: 'Obtaining authorization before overriding or disconnecting safety critical equipment.' },
  { id: 'SAFE_LIFTING', name: 'Safe Mechanical Lifting', icon: '🏗️', description: 'Ensuring lifting equipment is inspected, load path clear, and riggers qualified.' },
  { id: 'DRIVING_SAFETY', name: 'Driving & Mobile Equipment', icon: '🚛', description: 'Wearing seatbelts, obeying speed limits, and avoiding mobile phone distractions.' },
  { id: 'TOXIC_GAS_PPE', name: 'Toxic Gas & Specialized PPE', icon: '🤿', description: 'Wearing personal H2S gas monitors and breathing apparatus in designated zones.' }
];

export const INITIAL_SAMPLE_REPORTS = [
  {
    id: "REP-1847",
    employeeId: "EMP-1024",
    employeeName: "Amitabh Roy",
    type: "Unsafe Event",
    area: "Loading Area",
    exactLocation: "Tanker Bay 2 - Crane Pad",
    severity: "Critical",
    status: "Submitted",
    sifClassification: "SIF-Potential",
    lifeSavingRule: "Line of Fire",
    activity: "Crane / Lifting Operation",
    hazard: "Suspended Load",
    barrierFailure: "Exclusion Zone Failure",
    description: "Rigging worker walked directly under a 3.5 ton pipe bundle suspended at 4m height during crane swing operation. Barricade tape had snapped and was not replaced.",
    date: "2026-08-28 14:15",
    images: ["https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=60"]
  },
  {
    id: "REP-1842",
    employeeId: "EMP-1024",
    employeeName: "Amitabh Roy",
    type: "Unsafe Condition",
    area: "Loading Area",
    exactLocation: "Loading Arm Platform 3",
    severity: "High",
    status: "Under Review",
    sifClassification: "SIF-Potential",
    lifeSavingRule: "Line of Fire",
    activity: "Crane / Lifting Operation",
    hazard: "Suspended Load",
    barrierFailure: "Exclusion Zone Failure",
    description: "Personnel positioning inside the blind spot swing radius of mobile crane while offloading heavy crude manifolds.",
    date: "2026-08-25 11:30",
    images: ["https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=60"]
  },
  {
    id: "REP-1830",
    employeeId: "OIL-EMP-1042",
    employeeName: "Rajesh Kumar Sharma",
    type: "Unsafe Condition",
    area: "Production Area",
    exactLocation: "Compressor Building B - Line 4",
    severity: "Critical",
    status: "Action Assigned",
    sifClassification: "SIF-Potential",
    lifeSavingRule: "Energy Isolation",
    activity: "Pipe Maintenance",
    hazard: "Pressurized Lines",
    barrierFailure: "LOTO Isolation Missing",
    description: "High pressure gas manifold flange valve unbolted without lock-out tag-out padlocks affixed to primary bleeder valve.",
    date: "2026-08-22 09:45",
    images: ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60"]
  },
  {
    id: "REP-1815",
    employeeId: "EMP-1088",
    employeeName: "Anand Baruah",
    type: "Unsafe Condition",
    area: "Drilling Rig Area",
    exactLocation: "Rig Floor - Wellhead Site 7",
    severity: "High",
    status: "Submitted",
    sifClassification: "SIF-Potential",
    lifeSavingRule: "Work at Height",
    activity: "Scaffolding / Elevation Work",
    hazard: "Unsecured Work Platform",
    barrierFailure: "Harness Anchor Point Unsecured",
    description: "Derrick hand working on monkey board at 12m elevation with safety harness lanyard clipped to uncertified conduit pipe.",
    date: "2026-08-19 16:20",
    images: []
  },
  {
    id: "REP-1790",
    employeeId: "EMP-1024",
    employeeName: "Amitabh Roy",
    type: "Unsafe Event",
    area: "Loading Area",
    exactLocation: "Tanker Offloading Gantry",
    severity: "Critical",
    status: "In Progress",
    sifClassification: "SIF-Potential",
    lifeSavingRule: "Line of Fire",
    activity: "Crane / Lifting Operation",
    hazard: "Suspended Load",
    barrierFailure: "Exclusion Zone Failure",
    description: "Tag line operator stood directly below hoisted steel beam while guiding hoist onto transport trailer.",
    date: "2026-08-14 10:05",
    images: []
  },
  {
    id: "REP-1762",
    employeeId: "OIL-EMP-1042",
    employeeName: "Rajesh Kumar Sharma",
    type: "Unsafe Condition",
    area: "Electrical Substation",
    exactLocation: "Substation 2 - High Voltage Bay",
    severity: "High",
    status: "Resolved",
    sifClassification: "Non-SIF",
    lifeSavingRule: "Bypass Safety Controls",
    activity: "Electrical Servicing",
    hazard: "High Voltage Electrical Exposure",
    barrierFailure: "Permit to Work Not Issued",
    description: "Substation interlock panel key left inside override lock without written shift supervisor authorization.",
    date: "2026-08-10 15:00",
    images: []
  },
  {
    id: "REP-1740",
    employeeId: "EMP-1099",
    employeeName: "Manoj Gogoi",
    type: "Unsafe Condition",
    area: "Chemical Storage Area",
    exactLocation: "Storage Shed 4 - Drum Rack",
    severity: "Medium",
    status: "Resolved",
    sifClassification: "Near Miss",
    lifeSavingRule: "Toxic Gas & Specialized PPE",
    activity: "Chemical Transfer",
    hazard: "Chemical Exposure",
    barrierFailure: "Barricade Missing",
    description: "Corrosive chemical drum secondary containment tray accumulated 10L solvent spill; warning sign missing.",
    date: "2026-07-29 13:10",
    images: []
  },
  {
    id: "REP-1710",
    employeeId: "EMP-1024",
    employeeName: "Amitabh Roy",
    type: "Unsafe Condition",
    area: "Loading Area",
    exactLocation: "Tanker Rail 1",
    severity: "Medium",
    status: "Closed",
    sifClassification: "Non-SIF",
    lifeSavingRule: "Driving & Mobile Equipment",
    activity: "Vehicle Movement",
    hazard: "Vehicle Collision",
    barrierFailure: "Speed Limit Override",
    description: "Forklift driver exceeded 15 km/h speed threshold in congested loading lane.",
    date: "2026-07-15 08:30",
    images: []
  }
];

export const MOCK_CCTV_NETWORK = [
  {
    cameraId: "CAM-04",
    cameraName: "CAM-04 – Loading Area",
    area: "Loading Area",
    status: "Online",
    todayDetections: 18,
    criticalDetections: 4,
    sifPotentialEvents: 3,
    mostCommonDetection: "Restricted-zone entry under suspended load",
    ppeViolations: 8,
    lastEventTime: "10 mins ago"
  },
  {
    cameraId: "CAM-01",
    cameraName: "CAM-01 – Production Wellhead 4",
    area: "Production Area",
    status: "Online",
    todayDetections: 5,
    criticalDetections: 1,
    sifPotentialEvents: 1,
    mostCommonDetection: "Missing hard hat in active press manifold area",
    ppeViolations: 4,
    lastEventTime: "45 mins ago"
  },
  {
    cameraId: "CAM-07",
    cameraName: "CAM-07 – Drilling Rig Floor",
    area: "Drilling Rig Area",
    status: "Online",
    todayDetections: 8,
    criticalDetections: 2,
    sifPotentialEvents: 2,
    mostCommonDetection: "Personnel inside rotary table swing line of fire",
    ppeViolations: 3,
    lastEventTime: "1 hour ago"
  },
  {
    cameraId: "CAM-12",
    cameraName: "CAM-12 – Compressor Station B",
    area: "Compressor Station",
    status: "Offline",
    todayDetections: 0,
    criticalDetections: 0,
    sifPotentialEvents: 0,
    mostCommonDetection: "N/A (Camera Offline / Maintenance Required)",
    ppeViolations: 0,
    lastEventTime: "Offline since yesterday"
  },
  {
    cameraId: "CAM-09",
    cameraName: "CAM-09 – Chemical Storage Gantry",
    area: "Chemical Storage Area",
    status: "Online",
    todayDetections: 2,
    criticalDetections: 0,
    sifPotentialEvents: 0,
    mostCommonDetection: "Failure to wear safety goggles during transfer",
    ppeViolations: 2,
    lastEventTime: "3 hours ago"
  }
];

export const MOCK_EMPLOYEE_PROFILES = {
  "EMP-1024": {
    employeeId: "EMP-1024",
    employeeName: "Amitabh Roy",
    department: "Operations & Logistics",
    designation: "Rigging Supervisor",
    location: "Loading Area - Duliajan",
    totalObservations: 12,
    sifPotentialCount: 3,
    mostFrequentLSR: "Line of Fire",
    mostCommonActivity: "Lifting Operation",
    recurringPattern: "3 Line-of-Fire observations during lifting operations in the last 60 days.",
    suggestedHSEAction: "Consider refresher training on lifting-zone and Line-of-Fire safety, and review crane barricading procedures with team before high-tonnage hoists.",
    last5Observations: [
      { id: "REP-1847", date: "2026-08-28", lsr: "Line of Fire", sif: "SIF-Potential", area: "Loading Area" },
      { id: "REP-1842", date: "2026-08-25", lsr: "Line of Fire", sif: "SIF-Potential", area: "Loading Area" },
      { id: "REP-1790", date: "2026-08-14", lsr: "Line of Fire", sif: "SIF-Potential", area: "Loading Area" },
      { id: "REP-1710", date: "2026-07-15", lsr: "Driving Safety", sif: "Non-SIF", area: "Loading Area" },
      { id: "REP-1650", date: "2026-06-20", lsr: "Work at Height", sif: "Non-SIF", area: "Warehouse" }
    ]
  },
  "OIL-EMP-1042": {
    employeeId: "OIL-EMP-1042",
    employeeName: "Rajesh Kumar Sharma",
    department: "Operations & Maintenance",
    designation: "Senior Field Technician",
    location: "Production Plant - Duliajan",
    totalObservations: 8,
    sifPotentialCount: 1,
    mostFrequentLSR: "Energy Isolation",
    mostCommonActivity: "Pipe Maintenance",
    recurringPattern: "1 SIF-potential Energy Isolation observation in high pressure manifold area.",
    suggestedHSEAction: "Acknowledge pro-active hazard identification habits; conduct 1-on-1 review of Lockout/Tagout (LOTO) isolation verification protocols.",
    last5Observations: [
      { id: "REP-1830", date: "2026-08-22", lsr: "Energy Isolation", sif: "SIF-Potential", area: "Production Area" },
      { id: "REP-1762", date: "2026-08-10", lsr: "Bypass Safety Controls", sif: "Non-SIF", area: "Electrical Substation" },
      { id: "REP-1680", date: "2026-06-29", lsr: "Hot Work Controls", sif: "Non-SIF", area: "Production Area" },
      { id: "REP-1612", date: "2026-05-18", lsr: "Energy Isolation", sif: "Non-SIF", area: "Compressor Station" }
    ]
  }
};

export const MOCK_RECURRING_PRECURSORS = [
  {
    precursorId: "PREC-01",
    location: "Loading Area",
    activity: "Crane / Lifting Operation",
    hazard: "Suspended Load",
    lifeSavingRule: "Line of Fire",
    barrierFailure: "Exclusion Zone Failure",
    occurrences: 18,
    sifCount: 18,
    trend: "Increasing ↑",
    priority: "High",
    recommendedAction: "Review crane exclusion-zone controls in Loading Area and verify physical barricading procedures before hoist operations begin."
  },
  {
    precursorId: "PREC-02",
    location: "Production Area",
    activity: "Pipe Maintenance / Valve Servicing",
    hazard: "Pressurized Lines",
    lifeSavingRule: "Energy Isolation",
    barrierFailure: "LOTO Isolation Missing",
    occurrences: 9,
    sifCount: 6,
    trend: "Stable ➡️",
    priority: "High",
    recommendedAction: "Audit Lockout-Tagout (LOTO) permits and double-block-and-bleed isolation check sheets in Production Compressor Buildings."
  },
  {
    precursorId: "PREC-03",
    location: "Drilling Rig Area",
    activity: "Scaffolding / Rig Derrick Work",
    hazard: "Unsecured Work Platform",
    lifeSavingRule: "Work at Height",
    barrierFailure: "Harness Anchor Point Unsecured",
    occurrences: 7,
    sifCount: 5,
    trend: "Increasing ↑",
    priority: "High",
    recommendedAction: "Inspect Derrick monkey-board lanyards and enforce mandatory 100% dual-hook harness tie-off compliance."
  }
];

export const MOCK_CORRECTIVE_ACTIONS = [
  {
    id: "ACT-801",
    location: "Loading Area",
    hazard: "Suspended Load Line-of-Fire",
    risk: "Critical",
    status: "Overdue",
    assignedTo: "Logistics & Lifting Operations Team",
    dueDate: "2026-08-25",
    description: "Install heavy-duty physical chain barricades and automatic laser perimeter alarms around Crane Bay 2 swing radius."
  },
  {
    id: "ACT-804",
    location: "Production Area",
    hazard: "Unisolated Pressure Lines",
    risk: "Critical",
    status: "In Progress",
    assignedTo: "Mechanical Maintenance Lead",
    dueDate: "2026-09-05",
    description: "Mandate pre-job LOTO isolation sign-offs and install standardized lockboxes for all high-pressure gas manifold maintenance."
  },
  {
    id: "ACT-809",
    location: "Loading Area",
    hazard: "Exclusion Zone Failure",
    risk: "Critical",
    status: "Requires HSE Approval",
    assignedTo: "HSE Control Committee",
    dueDate: "2026-09-10",
    description: "AI Suggested Action: Review crane exclusion-zone controls in Loading Area, enforce pre-lift safety toolbox talks, and verify physical barricading procedures."
  }
];

export const SAFETY_KNOWLEDGE_GLOSSARY = {
  "sif": {
    term: "SIF (Serious Injury or Fatality)",
    shortDef: "A safety event or precursor that results in, or has a high probability of resulting in, a life-altering injury or fatality.",
    details: "In oil & gas operations, SIF events differ from minor recordables because they involve high-energy hazards (e.g., heavy suspended loads, high-pressure gas, toxic gases). SIF-potential precursors require immediate engineering barricading or energy isolation rather than just behavior reminders.",
    example: "Example: A worker standing inside the swing radius of a crane hoisting a 4-ton manifold without barricades is a SIF Potential, even if no drop occurred."
  },
  "line of fire": {
    term: "Line of Fire",
    shortDef: "Positioning oneself directly in the path of stored energy, moving equipment, falling objects, or high-pressure releases.",
    details: "Line of Fire is the single leading Life-Saving Rule precursor for oilfield lifting and heavy equipment operations.",
    example: "Example: Standing under a crane load, standing behind a reversing heavy truck, or positioning hands near a pressurized valve flange during bolt loosening."
  },
  "energy isolation": {
    term: "Energy Isolation (LOTO)",
    shortDef: "Isolating electrical, hydraulic, pneumatic, or mechanical energy sources before performing maintenance.",
    details: "Requires Lockout/Tagout (LOTO), double block and bleed valve isolation, and zero-energy verification (zero pressure gauge check, electrical dead-test).",
    example: "Example: Maintenance on a crude oil booster pump requires locking out the electrical breaker, closing and locking suction/discharge valves, and venting residual line pressure."
  },
  "work at height": {
    term: "Work at Height & Fall Protection",
    shortDef: "Mandatory safety controls required when working at elevations of 1.8 meters (6 feet) or higher above ground.",
    details: "Requires full-body safety harness with dual shock-absorbing lanyards, certified 100% tie-off anchor points (capable of supporting 22.2 kN), scaffold Green-Tag inspection status, and mobile elevating work platform (MEWP) safety controls.",
    example: "Example: Derrick hand on Monkey Board at 12m height must maintain continuous dual-lanyard clipping to certified fall-arrest cables."
  },
  "confined space": {
    term: "Confined Space Entry",
    shortDef: "Entry into any enclosed space with limited entry/exit points and potential hazardous atmosphere (e.g., tanks, vessels, pits, separators).",
    details: "Requires formal Confined Space Entry Permit, continuous 4-gas testing (O2: 19.5%-23.5%, LEL: 0%, H2S: <10ppm, CO: <25ppm), continuous standby attendant with rescue tripod, and positive mechanical ventilation.",
    example: "Example: Cleaning crude storage tank sludge requires continuous gas monitoring, positive air blower, and standby attendant at manhole."
  },
  "hot work": {
    term: "Hot Work Controls",
    shortDef: "Any operation involving open flames, sparks, or thermal energy generation (e.g., welding, grinding, torch cutting) in operational areas.",
    details: "Requires Hot Work Permit under OISD-STD-105, 0% LEL gas test verification, removal of combustible materials within 10m radius, fire-blanket shielding, and a dedicated Fire Watch stationed for 30 minutes post-work.",
    example: "Example: Structural welding on crude manifold pipe rack requires clearing oil residues, placing fire blankets, and 30-min post-job fire watch."
  },
  "bypass safety controls": {
    term: "Bypass Safety Controls & Interlocks",
    shortDef: "Overriding, disconnecting, or defeating any safety-critical equipment, ESD valves, flame detectors, or pressure relief systems.",
    details: "Requires formal written approval from Operations Manager, temporary risk assessment (TRA), compensatory safety controls, and continuous logging in the bypass logbook.",
    example: "Example: Bypassing gas detector interlock during instrument calibration requires written supervisor approval and manual gas testing."
  },
  "safe mechanical lifting": {
    term: "Safe Mechanical Lifting & Crane Operations",
    shortDef: "Controls for crane, hoist, and rigging activities to prevent load drops, crane tipping, and Line-of-Fire injuries.",
    details: "Requires certified rigging hardware (slings, shackles with color-coded inspection tags), approved Lift Plan for lifts >5 tons, ground bearing capacity check, physical exclusion zone barricading, and tag line guidance.",
    example: "Example: Hoisting 3.5 ton pipe bundle requires rigid barricading of 6m swing radius and certified rigger using tag lines."
  },
  "driving safety": {
    term: "Driving & Mobile Equipment Safety",
    shortDef: "Operational rules for tanker trucks, forklifts, pickup trucks, and mobile cranes across oilfield roads.",
    details: "Mandates 15 km/h plant speed limits, 100% seatbelt compliance, automatic reverse alarms, zero mobile phone usage, and mandatory spotters for blind maneuvering.",
    example: "Example: Tanker truck moving inside Loading Area Bay must maintain maximum 15 km/h speed and obey spotter hand signals."
  },
  "toxic gas ppe": {
    term: "Toxic Gas & Specialized PPE",
    shortDef: "Specialized breathing apparatus, personal gas detectors, and chemical splash suits for toxic environments.",
    details: "Mandates personal multi-gas monitors (H2S/LEL/CO/O2), EEBD (Emergency Escape Breathing Device) carried on belt in sour gas fields, and positive-pressure SCBA (Self-Contained Breathing Apparatus) for gas entry.",
    example: "Example: Technicians working at Sour Crude Wellhead 4 must wear clip-on H2S detectors set to alarm at 10 ppm."
  },
  "ppe": {
    term: "Personal Protective Equipment (PPE) Standards",
    shortDef: "Mandatory personal protective gear required for all personnel entering OIL operational facilities under OISD-STD-155.",
    details: "Standard minimum PPE includes: Industrial Safety Helmet (Hard Hat), Steel-Toe Safety Boots with oil-resistant soles, High-Visibility Flame Retardant (FR) Coveralls, and Impact Safety Glasses. Specialized zones require H2S monitors, ear defenders, gloves, and fall-arrest harnesses.",
    example: "Example: Visitors and operators walking inside Loading Bay must wear Hard Hat, Steel-Toe Boots, FR Coveralls, and Safety Glasses."
  },
  "barrier failure": {
    term: "Barrier Failure",
    shortDef: "The breakdown, omission, or degradation of a physical, engineering, or administrative safeguard designed to prevent harm.",
    details: "Barriers are categorized into Hard Barriers (physical barricades, interlocks, safety valves) and Soft Barriers (permits, warning tape, safety signs). Hard barrier failures present significantly higher SIF risk.",
    example: "Example: Using snapped warning tape instead of a rigid metal exclusion gate during crane lifting operations is a barrier failure."
  },
  "near miss": {
    term: "Near Miss",
    shortDef: "An unplanned event that did not result in injury, illness, or damage – but had the potential to do so under slightly different circumstances.",
    details: "Reporting near misses provides vital early precursor data before an actual SIF event occurs.",
    example: "Example: A wrench dropped from scaffolding height that landed 1 meter away from a technician walking past."
  },
  "sif precursor density": {
    term: "SIF Precursor Density",
    shortDef: "The percentage or ratio of safety reports in a specific area or activity that contain high-energy SIF potential hazards.",
    details: "Calculated as (SIF Potential Reports / Total Reports in Area) * 100. Areas exceeding 35% SIF density require immediate HSE intervention.",
    example: "Example: Loading Area has 18 SIF-potential cases out of 42 total reports, giving a high SIF Precursor Density of 42.8%."
  },
  "blowout": {
    term: "Blowout Prevention & Well Control",
    shortDef: "Uncontrolled release of crude oil, gas, or drilling fluids from a well after formation pressure exceeds wellbore hydrostatic pressure.",
    details: "Well control relies on primary barriers (drilling mud hydrostatic weight) and secondary barriers (Blowout Preventer / BOP stack, annular preventers, pipe rammers, kill and choke lines). Regular BOP pressure tests and pit volume monitoring are mandatory.",
    example: "Example: During tripping out on Rig 4, pit gain alarms trigger immediate closure of the annular BOP to seal the wellbore."
  },
  "h2s": {
    term: "H2S (Hydrogen Sulfide) Safety Protocol",
    shortDef: "A highly toxic, flammable, and colorless gas with a rotten-egg smell at low concentrations, causing olfactory fatigue and fatal respiratory paralysis at >100 ppm.",
    details: "Workplaces exceeding 10 ppm TWA require continuous personal H2S detectors, EEBD (Emergency Escape Breathing Devices), SCBA for entry, and wind sock orientation awareness.",
    example: "Example: Gas testing before entering Production Wellhead 4 shows 12 ppm H2S. Work is stopped and personnel don positive-pressure SCBA gear."
  },
  "permit to work": {
    term: "Permit to Work (PTW) System",
    shortDef: "A formal written safety management system used to authorize high-risk activities in operational oilfield zones.",
    details: "Covers Hot Work, Cold Work, Confined Space Entry, Electrical Isolation, Radiography, and Excavation. Requires joint hazard identification (JSA), gas testing, and authorized issuer/receiver signatures.",
    example: "Example: Welding a structural bracket in a process plant requires a Hot Work Permit (OISD-STD-105) with 0% LEL gas check and dedicated fire watch."
  },
  "fire safety": {
    term: "Oilfield Fire Protection & Deluge Systems",
    shortDef: "Specialized fire suppression networks engineered for hydrocarbon liquid and gas fires (Class B).",
    details: "Includes High-Velocity Water Spray (HVWS) deluge systems around crude tanks, Aqueous Film Forming Foam (AFFF) monitors, DCP (Dry Chemical Powder) skids, and Emergency Shutdown (ESD) valves.",
    example: "Example: Tanker loading bay ESD button automatically trips crude supply pumps and activates foam deluge monitors within 5 seconds."
  },
  "oisd": {
    term: "OISD (Oil Industry Safety Directorate) Standards",
    shortDef: "Technical safety standards formulated by the Ministry of Petroleum & Natural Gas (India) for oil & gas facilities.",
    details: "Enforces mandatory safety rules including OISD-STD-105 (Permit to Work), OISD-STD-116 (Fire Fighting Equipment), OISD-STD-155 (PPE), and OISD-STD-189 (Standard Operating Procedures).",
    example: "Example: Distance between crude storage tanks and plant boundary wall must comply with OISD-STD-118 layout safety margins."
  },
  "hazardous area": {
    term: "Hazardous Area Classification (Zone 0, 1, 2)",
    shortDef: "Classification of operational locations based on the likelihood and duration of explosive gas atmospheres.",
    details: "Zone 0: Explosive gas present continuously (>1000 hrs/yr). Zone 1: Likely in normal operation (10-1000 hrs/yr). Zone 2: Unlikely in normal operation (<10 hrs/yr). Requires Ex d / Ex i flameproof electrical apparatus.",
    example: "Example: Handheld torches used near crude manifold flanges must be certified intrinsically safe (Ex id IIC T4)."
  },
  "stop work": {
    term: "Stop Work Authority (SWA)",
    shortDef: "The absolute right and duty of any worker, regardless of position, to halt an activity if an imminent hazard or safety violation is observed.",
    details: "SWA protects workers against retaliation. Operational activities can only resume after HSE hazard verification and mitigation.",
    example: "Example: A junior field technician invokes Stop Work Authority when a mobile crane is set up on soft uncompacted soil near a ditch."
  },
  "oil spill": {
    term: "Oil Spill Response & Environmental Containment",
    shortDef: "Emergency containment and recovery procedures for hydrocarbon releases to land or water.",
    details: "Utilizes secondary containment bunds, oil-water separators (OWS), absorbent booms, skimmers, and dispersants while ensuring zero ignition sources.",
    example: "Example: Pipeline flange leak at Crude Trunkline Pump Station contained using absorbent boom barriers and vacuum truck recovery."
  },
  "first aid": {
    term: "First Aid & Emergency Medical Response",
    shortDef: "Immediate life-saving procedures for chemical burns, gas exposure, thermal burns, and physical trauma in oilfields.",
    details: "Includes 15-minute eyewash flushing for chemical splashes, moving H2S victims upwind to fresh air before CPR, emergency burn dressings, and immediate contact with OIL Occupational Health Centre (OHC).",
    example: "Example: Chemical splash in eyes requires holding eyelids open under emergency eyewash station for minimum 15 minutes."
  },
  "incident reporting": {
    term: "Safety Incident & Precursor Reporting Protocol",
    shortDef: "Step-by-step process to report Unsafe Conditions, Unsafe Events, Near Misses, and SIF-Potential hazards on the OIL platform.",
    details: "1. Open 'Report Form' or use Safety Copilot. 2. Select Location, Hazard Type, and Life-Saving Rule. 3. Describe the observation (or paste natural text for AI auto-extraction). 4. Attach photo evidence. 5. Submit for HSE Coordinator review.",
    example: "Example: Reporting broken warning tape in Loading Area via Safety Copilot creates an official REP report and routes it for HSE action."
  },
  "emergency response": {
    term: "OIL Emergency Response & Evacuation Protocol",
    shortDef: "Standard operating procedure during plant sirens, gas alarms, or fire emergencies.",
    details: "1. Stop work immediately and isolate machinery if safe. 2. Observe wind sock direction. 3. Evacuate crosswind or upwind to designated Emergency Assembly Point. 4. Conduct roll-call attendance check. 5. Await HSE All-Clear clearance signal.",
    example: "Example: Continuous siren tone indicates toxic gas release; personnel head upwind to Assembly Point A."
  }
};
