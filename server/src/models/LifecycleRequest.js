import mongoose from 'mongoose';

const lifecycleRequestSchema = new mongoose.Schema(
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
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requesting user reference is required']
    },
    requestType: {
      type: String,
      enum: ['RENEWAL', 'RELEASE'],
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Reason/justification for request is required']
    },

    // Renewal specific proposal
    renewalDetails: {
      newMaturityDate: { type: Date, default: null },
      newAmount: { type: Number, default: null },
      newFdrNumber: { type: String, default: '' },
      renewalDocumentUrl: { type: String, default: '' }
    },

    // Release/Refund specific proposal
    releaseDetails: {
      closureJustification: { type: String, default: '' },
      nocDocumentUrl: { type: String, default: '' },
      beneficiaryAccount: {
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        beneficiaryName: { type: String, default: '' }
      }
    },

    // Approval progression: PENDING -> OFFICER_RECOMMENDED -> APPROVED (by Admin) / REJECTED
    status: {
      type: String,
      enum: ['PENDING', 'OFFICER_RECOMMENDED', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },

    // Officer review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    officerRemarks: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: null
    },

    // Admin decision
    finalApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvalOrderNumber: {
      type: String,
      default: ''
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const LifecycleRequest = mongoose.model('LifecycleRequest', lifecycleRequestSchema);
