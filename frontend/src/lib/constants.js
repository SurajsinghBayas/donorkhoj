/**
 * Shared domain constants — organ catalog, blood groups,
 * status metadata, and per-field clinical units.
 */

export const ORGANS = [
  {
    id: 'kidney',
    label: 'Kidney',
    note: 'Most needed. Living donation possible with one healthy kidney.',
  },
  {
    id: 'liver',
    label: 'Liver',
    note: 'Partial donation — the liver regenerates in both donor and recipient.',
  },
  {
    id: 'heart',
    label: 'Heart',
    note: 'Deceased donation only. Requires negative crossmatch and size match.',
  },
  {
    id: 'lung',
    label: 'Lung',
    note: 'Single or double transplant, assessed via pulmonary function tests.',
  },
];

export const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];

// Server stores ASCII minus; display uses proper minus sign
export const BLOOD_GROUPS_API = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const INFECTION_OPTIONS = [
  { value: 'negative', label: 'Negative' },
  { value: 'positive', label: 'Positive' },
  { value: 'unknown', label: 'Unknown / not tested' },
];

export const SMOKING_OPTIONS = [
  { value: 'never', label: 'Never smoked' },
  { value: 'former', label: 'Former smoker' },
  { value: 'current', label: 'Current smoker' },
];

export const ALCOHOL_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'regular', label: 'Regular' },
];

export const CROSSMATCH_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'negative', label: 'Negative' },
  { value: 'positive', label: 'Positive' },
];

export const CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart disease',
  'Chronic kidney disease',
  'Liver disease',
  'Asthma / COPD',
  'Thyroid disorder',
  'Autoimmune disease',
];

/** Match status → badge tone + label */
export const MATCH_STATUS = {
  pending:   { tone: 'stone',  label: 'Pending' },
  running:   { tone: 'amber',  label: 'Running' },
  completed: { tone: 'blue',   label: 'Awaiting review' },
  approved:  { tone: 'green',  label: 'Approved' },
  rejected:  { tone: 'red',    label: 'Rejected' },
};

/** Compatibility class → tone */
export function compatTone(cls) {
  const c = (cls || '').toUpperCase();
  if (c.includes('HIGH')) return 'green';
  if (c.includes('MED')) return 'amber';
  if (c.includes('LOW')) return 'stone';
  if (c.includes('INCOMPAT')) return 'red';
  return 'stone';
}

export const ROLE_LABELS = {
  donor: 'Donor',
  recipient: 'Recipient',
  doctor: 'Doctor',
  admin: 'Admin',
};

/** Clinical units shown beside wizard inputs */
export const UNITS = {
  creatinine: 'mg/dL',
  egfr: 'mL/min/1.73m²',
  blood_pressure_systolic: 'mmHg',
  blood_pressure_diastolic: 'mmHg',
  alt: 'U/L',
  ast: 'U/L',
  alp: 'U/L',
  bilirubin_total: 'mg/dL',
  albumin: 'g/dL',
  total_protein: 'g/dL',
  ejection_fraction: '%',
  fev1_percent: '% pred',
  fvc_percent: '% pred',
  fev1_fvc_ratio: 'ratio',
  pra_percent: '%',
  smoking_pack_years: 'pack-yrs',
  alcohol_units_per_week: 'units/wk',
};
