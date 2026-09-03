// ── Sites ─────────────────────────────────────────────────────────────────────
export const SITES = [
  'OIL Duliajan Plant',
  'OIL Jorhat Field',
  'OIL Sivasagar',
  'OIL Digboi',
  'OIL Geleky',
  'Other',
];

// ── Industrial Areas (used as default Area list under any site) ───────────────
export const INDUSTRIAL_AREAS = [
  'Entry / Main Gate',
  'Security Checkpoint',
  'Administrative Area',
  'Production Area',
  'Process Plant / Processing Unit',
  'Drilling Rig Area',
  'Well Site',
  'Pipeline Area / Pipeline Corridor',
  'Pump Station',
  'Compressor Station',
  'Oil Storage Tank Farm',
  'Crude Oil Storage Area',
  'Loading Area',
  'Unloading Area',
  'Tanker Loading Bay',
  'Warehouse',
  'Material Storage Area',
  'Chemical Storage Area',
  'Workshop',
  'Mechanical Maintenance Area',
  'Electrical Maintenance Area',
  'Electrical Substation',
  'Generator Area',
  'Boiler Area',
  'Utility Area',
  'Welding / Hot Work Area',
  'Confined Space Area',
  'Work at Height Area',
  'Scaffolding Area',
  'Excavation Area',
  'Construction Area',
  'Heavy Machinery Area',
  'Crane / Lifting Operation Area',
  'Suspended Load Area',
  'Vehicle Movement Area',
  'Internal Roads',
  'Parking Area',
  'Fire Hazard Area',
  'Emergency Assembly Area',
  'Laboratory',
  'Control Room',
  'Waste Disposal Area',
  'Drainage Area',
  'Oil Spill Prone Area',
  'Gas Handling Area',
  'Flammable Material Storage',
  'Other',
];

// ── Activities ────────────────────────────────────────────────────────────────
export const ACTIVITIES = [
  'Lifting / Crane Operation',
  'Hot Work / Welding',
  'Electrical Maintenance',
  'Mechanical Maintenance',
  'Confined Space Entry',
  'Working at Height',
  'Excavation / Digging',
  'Driving / Vehicle Movement',
  'Pipeline Operation',
  'Tank Cleaning / Inspection',
  'Material Handling',
  'Drilling Operation',
  'Routine Inspection / Patrol',
  'Routine Operation',
  'Fire / Emergency Response',
  'Chemical Handling',
  'Not Sure',
  'Other',
];

// ── People Involved options ───────────────────────────────────────────────────
export const PEOPLE_OPTIONS = [
  'Employee',
  'Contractor',
  'Visitor',
  'Multiple People',
  'Unknown',
];

// ── Immediate Actions checklist ────────────────────────────────────────────────
export const IMMEDIATE_ACTIONS = [
  'Work stopped',
  'Supervisor informed',
  'HSE informed',
  'Area barricaded',
  'Equipment isolated',
  'Personnel moved away',
  'Leak / release contained',
  'Warning provided to others',
  'Emergency services called',
  'No immediate action taken',
  'Other',
];

// ── Departments ───────────────────────────────────────────────────────────────
export const DEPARTMENTS = [
  'HSE / HSSE',
  'Operations',
  'Mechanical',
  'Electrical',
  'Maintenance',
  'Pipeline',
  'Production',
  'Security',
  'Fire & Safety',
  'Civil',
  'Logistics',
];

// ── Mock Users ────────────────────────────────────────────────────────────────
export const MOCK_USERS = [
  {
    userId: 'OIL-EMP-1042',
    password: 'password123',
    name: 'Rajesh Kumar Sharma',
    role: 'Employee',
    designation: 'Senior Field Technician',
    department: 'Operations & Maintenance',
    location: 'Duliajan Plant',
    site: 'OIL Duliajan Plant',
  },
  {
    userId: 'OIL-HSE-9001',
    password: 'adminpass123',
    name: 'Dr. Anirban Sengupta',
    role: 'Admin',
    designation: 'Chief Safety Officer (HSE)',
    department: 'Fire & Safety Management',
    location: 'Central Control',
    site: 'OIL Duliajan Plant',
  },
];

// ── Initial Reports (empty — no demo data) ────────────────────────────────────
export const INITIAL_REPORTS = [];

/*
  ── Safety Report Schema (reference) ─────────────────────────────────────────

  {
    id: 'OIL-HSSE-2026-000184',   // generated on submit
    isDraft: false,                // true when saved as draft

    // Reporter
    employeeId: 'OIL-EMP-1042',
    employeeName: 'Rajesh Kumar Sharma',

    // Section A — Report Type
    reportType: 'Near Miss',  // Unsafe Act (UA) | Unsafe Condition (UC) | Near Miss | Incident | Not Sure

    // Section B — Event Time
    eventDate: '2026-09-02',       // YYYY-MM-DD
    eventTime: '11:35',            // HH:MM
    reportedAt: '2026-09-02T06:05:00.000Z',  // auto, ISO

    // Section C — Location
    site: 'OIL Duliajan Plant',
    area: 'Loading Area',
    specificLocation: 'Crane Bay 02',   // optional
    equipment: 'Crane CR-07',           // optional

    // Section D — Activity
    activity: 'Lifting / Crane Operation',  // optional

    // Section E — Description
    description: 'Worker entered below suspended load during crane operation...',

    // Section F — Immediate Danger
    immediateDanger: 'No',  // Yes | No | Not Sure

    // Section G — Evidence
    images: [],  // base64 strings, up to 5

    // Section H — People Involved
    peopleInvolved: ['Contractor'],

    // Section I — Conditional fields
    injuryOccurred: null,          // Yes | No | Unknown | null  (if Incident)
    propertyDamage: null,          // Yes | No | Unknown | null  (if Incident)
    environmentalRelease: null,    // Yes | No | Unknown | null  (if Incident)
    narrowlyAvoided: null,         // Yes | No | Unknown | null  (if Near Miss)

    // Section J — Immediate Actions
    immediateActionsTaken: ['Work stopped', 'Supervisor informed'],
    actionNotes: 'Lifting operation was stopped immediately.',

    // Flags
    confidential: false,

    // Admin workflow (set by admin only)
    status: 'Submitted',   // Draft | Submitted | Under Review | Action Assigned | In Progress | Resolved | Closed
    adminRemarks: '',
    assignedDepartment: '',
    assignedPerson: '',
    targetDate: '',

    // Timestamps
    createdAt: '2026-09-02T06:05:00.000Z',
    updatedAt: '2026-09-02T06:05:00.000Z',
  }
*/
