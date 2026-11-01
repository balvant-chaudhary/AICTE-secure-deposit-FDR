import mongoose from 'mongoose';

const institutionSchema = new mongoose.Schema(
  {
    aictePermanentId: {
      type: String,
      required: [true, 'AICTE Permanent ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true
    },
    institutionType: {
      type: String,
      required: [true, 'Institution type is required'],
      enum: [
        'Engineering & Technology',
        'Management',
        'Pharmacy',
        'Architecture & Town Planning',
        'Applied Arts & Crafts',
        'Polytechnic / Diploma',
        'Other'
      ],
      default: 'Engineering & Technology'
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true
    },
    contactEmail: {
      type: String,
      required: [true, 'Official contact email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid official email address']
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'under_review', 'suspended'],
      default: 'active',
      lowercase: true
    }
  },
  {
    timestamps: true
  }
);

export const Institution = mongoose.model('Institution', institutionSchema);
