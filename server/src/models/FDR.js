import mongoose from 'mongoose';
import { FDR_STATUS, ALL_FDR_STATUSES } from '../constants/fdrStatus.js';

const fdrSchema = new mongoose.Schema(
  {
    fdrNumber: {
      type: String,
      required: [true, 'FDR Receipt number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitted by user reference is required']
    },

    // Institution-submitted data
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true
    },
    branchName: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      trim: true,
      uppercase: true
    },
    amount: {
      type: Number,
      required: [true, 'FDR deposit amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    depositDate: {
      type: Date,
      required: [true, 'Deposit date is required']
    },
    maturityDate: {
      type: Date,
      required: [true, 'Maturity date is required']
    },
    autoRenewal: {
      type: Boolean,
      default: false
    },
    purpose: {
      type: String,
      required: [true, 'Deposit purpose is required'],
      trim: true,
      default: 'Establishment of New Technical Institution'
    },
    jointAccountHolder: {
      type: String,
      default: 'Member Secretary, AICTE & Principal/Director',
      trim: true
    },
    remarks: {
      type: String,
      default: ''
    },

    // Document attachment
    documentUrl: {
      type: String,
      default: ''
    },
    documentOriginalName: {
      type: String,
      default: ''
    },
    documentMimeType: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },

    // Independently Verified Bank Information (Distinct from submitted data)
    isBankVerified: {
      type: Boolean,
      default: false
    },
    bankVerifiedData: {
      bankReferenceNumber: { type: String, default: '' },
      confirmedAmount: { type: Number, default: 0 },
      confirmedMaturityDate: { type: Date, default: null },
      lienMarkedToAICTE: { type: Boolean, default: false },
      verificationTimestamp: { type: Date, default: null },
      verificationCode: { type: String, default: '' },
      rawSimulationPayload: { type: mongoose.Schema.Types.Mixed, default: null }
    },

    // Verification Link & State
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'DISCREPANCY_FOUND', 'NOT_FOUND', 'VERIFICATION_PENDING'],
      default: 'VERIFICATION_PENDING',
      index: true
    },
    latestVerification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankVerification',
      default: null
    },

    // Lifecycle Status
    status: {
      type: String,
      enum: ALL_FDR_STATUSES,
      default: FDR_STATUS.SUBMITTED,
      index: true
    },

    // Milestone alerts tracking (Phase 5 Step 2: Tiered Alerts & Deduplication)
    maturityAlertsSent: {
      type: [
        {
          type: String,
          enum: ['60_DAY', '30_DAY', '7_DAY', 'MATURED']
        }
      ],
      default: []
    },

    // Granular delivery receipts tracking (Phase 5 Step 2: Partial Delivery & Retry)
    maturityAlertReceipts: {
      type: [String],
      default: []
    },

    // Discrepancy details
    discrepancy: {
      isFlagged: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      flaggedAt: { type: Date, default: null },
      resolutionRemarks: { type: String, default: '' },
      resolvedAt: { type: Date, default: null }
    },

    // AICTE Officer review details
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    officerRemarks: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
fdrSchema.index({ institutionId: 1, status: 1 });
fdrSchema.index({ maturityDate: 1 });

// Pre-validate hook to verify maturityDate is strictly after depositDate
fdrSchema.pre('validate', function () {
  if (this.depositDate && this.maturityDate) {
    if (new Date(this.maturityDate) <= new Date(this.depositDate)) {
      this.invalidate('maturityDate', 'Maturity date must be after deposit date');
    }
  }
});

// Virtual for remaining days to maturity
fdrSchema.virtual('daysToMaturity').get(function () {
  if (!this.maturityDate) return null;
  const now = new Date();
  const diffTime = this.maturityDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

fdrSchema.set('toJSON', { virtuals: true });
fdrSchema.set('toObject', { virtuals: true });

export const FDR = mongoose.model('FDR', fdrSchema);
