export const ROLES = {
  INSTITUTION: 'institution',
  OFFICER: 'officer',
  ADMIN: 'admin'
};

export const FDR_STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  VERIFIED_ACTIVE: 'VERIFIED_ACTIVE',
  DISCREPANCY_FLAGGED: 'DISCREPANCY_FLAGGED',
  EXPIRING_SOON: 'EXPIRING_SOON',
  MATURED: 'MATURED',
  RENEWAL_PENDING: 'RENEWAL_PENDING',
  RELEASE_PENDING: 'RELEASE_PENDING',
  RELEASED: 'RELEASED',
  REJECTED: 'REJECTED'
};

export const STATUS_CONFIG = {
  SUBMITTED: {
    label: 'Submitted',
    // navy tint
    bgColor: 'rgba(0,48,73,0.07)',
    textColor: '#003049',
    borderColor: 'rgba(0,48,73,0.2)',
    dotColor: '#003049',
    // legacy Tailwind (kept for fallback)
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    description: 'Awaiting initial AICTE verification'
  },
  UNDER_VERIFICATION: {
    label: 'Under Verification',
    bgColor: 'rgba(247,127,0,0.10)',
    textColor: '#c96200',
    borderColor: 'rgba(247,127,0,0.3)',
    dotColor: '#F77F00',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    description: 'Under review by AICTE regional officer'
  },
  VERIFIED_ACTIVE: {
    label: 'Active & Verified',
    bgColor: 'rgba(22,134,92,0.09)',
    textColor: '#065f46',
    borderColor: 'rgba(22,134,92,0.25)',
    dotColor: '#16865C',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Verified with bank CBS & AICTE lien established'
  },
  DISCREPANCY_FLAGGED: {
    label: 'Discrepancy Flagged',
    bgColor: 'rgba(214,40,40,0.08)',
    textColor: '#9b1c1c',
    borderColor: 'rgba(214,40,40,0.25)',
    dotColor: '#D62828',
    dotPulse: true,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500 animate-pulse',
    description: 'Discrepancy detected with bank records'
  },
  EXPIRING_SOON: {
    label: 'Expiring Soon',
    bgColor: 'rgba(252,191,73,0.15)',
    textColor: '#78350f',
    borderColor: 'rgba(252,191,73,0.5)',
    dotColor: '#FCBF49',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    description: 'Maturity approaching within 60 days'
  },
  MATURED: {
    label: 'Matured (Not Released)',
    bgColor: 'rgba(100,116,139,0.09)',
    textColor: '#334155',
    borderColor: 'rgba(100,116,139,0.25)',
    dotColor: '#64748B',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    description: 'Maturity crossed. Release requires formal review'
  },
  RENEWAL_PENDING: {
    label: 'Renewal Under Review',
    bgColor: 'rgba(0,48,73,0.06)',
    textColor: '#003049',
    borderColor: 'rgba(0,48,73,0.18)',
    dotColor: '#00406a',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    description: 'Renewal request pending officer approval'
  },
  RELEASE_PENDING: {
    label: 'Release Under Review',
    bgColor: 'rgba(247,127,0,0.09)',
    textColor: '#7c3a00',
    borderColor: 'rgba(247,127,0,0.28)',
    dotColor: '#F77F00',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    description: 'Refund/Release clearance undergoing review'
  },
  RELEASED: {
    label: 'Discharged & Released',
    bgColor: 'rgba(22,134,92,0.06)',
    textColor: '#065f46',
    borderColor: 'rgba(22,134,92,0.2)',
    dotColor: '#16865C',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
    description: 'Security deposit released & lien discharged'
  },
  REJECTED: {
    label: 'Rejected',
    bgColor: 'rgba(214,40,40,0.07)',
    textColor: '#991b1b',
    borderColor: 'rgba(214,40,40,0.22)',
    dotColor: '#D62828',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    description: 'Submission rejected'
  }
};

export const PURPOSE_OPTIONS = [
  'Establishment of New Technical Institution',
  'Introduction of New Course / Programme',
  'Increase in Student Intake Capacity',
  'Mandatory Joint AICTE Security Reserve',
  'Dispute Resolution / Escrow Deposit',
  'Other Regulatory Compliance'
];

export const BANK_SUGGESTIONS = [
  'State Bank of India',
  'Punjab National Bank',
  'Canara Bank',
  'Bank of Baroda',
  'Union Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank'
];
