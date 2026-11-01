import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ALL_ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required']
    },
    role: {
      type: String,
      enum: ALL_ROLES,
      default: ROLES.INSTITUTION,
      required: [true, 'User role is required'],
      index: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
      validate: {
        validator: function (value) {
          // Required only if role is institution
          if (this.role === ROLES.INSTITUTION) {
            return value !== null && value !== undefined;
          }
          return true;
        },
        message: 'Institution ID is required for institution users'
      }
    },
    designation: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Method to verify password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

// CRITICAL SECURITY: Never expose passwordHash in API JSON responses
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', {
  transform: function (doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model('User', userSchema);
