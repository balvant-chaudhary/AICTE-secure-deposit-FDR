import mongoose from 'mongoose';
import { ALL_ACTION_TYPES } from '../constants/actionTypes.js';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      default: ''
    },
    userRole: {
      type: String,
      required: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true
    },
    actionType: {
      type: String,
      enum: ALL_ACTION_TYPES,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ['FDR', 'USER', 'INSTITUTION', 'REQUEST'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    details: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
