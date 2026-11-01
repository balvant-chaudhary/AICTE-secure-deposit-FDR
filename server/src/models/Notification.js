import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    recipientRole: {
      type: String,
      enum: ['institution', 'officer', 'admin', 'all'],
      default: 'all',
      index: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: ['EXPIRY_WARNING', 'DISCREPANCY_ALERT', 'REQUEST_UPDATE', 'VERIFICATION_SUCCESS', 'SYSTEM_INFO'],
      default: 'SYSTEM_INFO'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);
