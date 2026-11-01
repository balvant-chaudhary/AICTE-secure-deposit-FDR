import mongoose from 'mongoose';

export const VERIFICATION_STATUS = {
  VERIFIED: 'VERIFIED',
  DISCREPANCY_FOUND: 'DISCREPANCY_FOUND',
  NOT_FOUND: 'NOT_FOUND',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING'
};

export const ALL_VERIFICATION_STATUSES = Object.values(VERIFICATION_STATUS);

export const SIMULATION_SCENARIOS = {
  ALL_MATCH: 'ALL_MATCH',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MATURITY_DATE_MISMATCH: 'MATURITY_DATE_MISMATCH',
  IFSC_MISMATCH: 'IFSC_MISMATCH',
  FDR_NOT_FOUND: 'FDR_NOT_FOUND',
  LIEN_NOT_MARKED: 'LIEN_NOT_MARKED',
  MULTIPLE_DISCREPANCIES: 'MULTIPLE_DISCREPANCIES'
};

const bankVerificationSchema = new mongoose.Schema(
  {
    fdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: [true, 'FDR reference is required'],
      index: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true
    },
    verificationReference: {
      type: String,
      required: [true, 'Verification reference is required'],
      unique: true,
      index: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Officer reference is required']
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    status: {
      type: String,
      enum: ALL_VERIFICATION_STATUSES,
      required: true,
      index: true
    },
    simulationScenario: {
      type: String,
      default: SIMULATION_SCENARIOS.ALL_MATCH
    },

    // Snapshot of submitted FDR details at time of verification
    submittedDetails: {
      fdrNumber: { type: String, required: true },
      bankName: { type: String, required: true },
      branchName: { type: String, required: true },
      ifscCode: { type: String, required: true },
      amount: { type: Number, required: true },
      depositDate: { type: Date, required: true },
      maturityDate: { type: Date, required: true },
      jointAccountHolder: { type: String, default: '' }
    },

    // Details confirmed from simulated Bank CBS
    confirmedDetails: {
      fdrNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branchName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      amount: { type: Number, default: 0 },
      depositDate: { type: Date, default: null },
      maturityDate: { type: Date, default: null },
      lienMarkedToAICTE: { type: Boolean, default: false },
      bankReferenceNumber: { type: String, default: '' },
      cbsStatus: { type: String, default: 'ACTIVE_DEPOSIT' },
      accountHolderName: { type: String, default: '' }
    },

    // Field-by-field comparison outcome
    fieldComparisons: {
      fdrNumber: {
        submitted: { type: String },
        confirmed: { type: String },
        match: { type: Boolean, default: false },
        remarks: { type: String, default: '' }
      },
      bankName: {
        submitted: { type: String },
        confirmed: { type: String },
        match: { type: Boolean, default: false }
      },
      branchName: {
        submitted: { type: String },
        confirmed: { type: String },
        match: { type: Boolean, default: false }
      },
      ifscCode: {
        submitted: { type: String },
        confirmed: { type: String },
        match: { type: Boolean, default: false }
      },
      amount: {
        submitted: { type: Number },
        confirmed: { type: Number },
        match: { type: Boolean, default: false },
        difference: { type: Number, default: 0 }
      },
      maturityDate: {
        submitted: { type: Date },
        confirmed: { type: Date },
        match: { type: Boolean, default: false },
        diffDays: { type: Number, default: 0 }
      },
      lienMarked: {
        submitted: { type: Boolean, default: true },
        confirmed: { type: Boolean, default: false },
        match: { type: Boolean, default: false }
      }
    },

    // List of reasons for discrepancies (if any)
    discrepancyReasons: {
      type: [String],
      default: []
    },

    // Flag indicating this is a simulated verification for hackathon prototype
    isSimulated: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
bankVerificationSchema.index({ fdrId: 1, verifiedAt: -1 });
bankVerificationSchema.index({ institutionId: 1, status: 1 });

export const BankVerification = mongoose.model('BankVerification', bankVerificationSchema);
