import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { Institution } from '../models/Institution.js';
import { FDR } from '../models/FDR.js';
import { LifecycleRequest } from '../models/LifecycleRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { ROLES } from '../constants/roles.js';
import { FDR_STATUS } from '../constants/fdrStatus.js';
import { ACTION_TYPES } from '../constants/actionTypes.js';

// Ensure demo PDF exists
const uploadDir = path.resolve('uploads', 'fdr-documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const demoPdfPath = path.join(uploadDir, 'sample-fdr-receipt.pdf');
if (!fs.existsSync(demoPdfPath)) {
  fs.writeFileSync(
    demoPdfPath,
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
  );
}

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte-securedeposit';
    await mongoose.connect(mongoUri);
    console.log('[Seed]: Connected to MongoDB');

    // Clean existing records
    await Promise.all([
      User.deleteMany({}),
      Institution.deleteMany({}),
      FDR.deleteMany({}),
      LifecycleRequest.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('[Seed]: Cleared existing collections');

    // 1. Create Institutions
    const inst1 = await Institution.create({
      aictePermanentId: '1-432890123',
      name: 'Delhi Institute of Engineering & Advanced Technology',
      institutionType: 'Engineering & Technology',
      address: 'Sector 14, Dwarka Institutional Area',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110078',
      contactEmail: 'institution@aicte.gov.in',
      contactPhone: '011-28080123',
      status: 'active'
    });

    const inst2 = await Institution.create({
      aictePermanentId: '1-897612345',
      name: 'Maharashtra Institute of Technology & Management',
      institutionType: 'Management',
      address: 'Paud Road, Kothrud',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      contactEmail: 'mit_pune@example.ac.in',
      contactPhone: '020-25442111',
      status: 'active'
    });

    // 2. Create Users
    const passwordHash = await User.hashPassword('Demo@123');

    const institutionUser = await User.create({
      name: 'Dr. Rameshwar Sharma',
      email: 'institution@aicte.gov.in',
      passwordHash,
      role: ROLES.INSTITUTION,
      institutionId: inst1._id,
      designation: 'Registrar',
      phone: '9811223344'
    });

    const officerUser = await User.create({
      name: 'Sunil Kumar Varma',
      email: 'officer@aicte.gov.in',
      passwordHash,
      role: ROLES.OFFICER,
      designation: 'Regional AICTE Officer (North Zone)',
      phone: '9871100223'
    });

    const adminUser = await User.create({
      name: 'Dr. Anita Roy',
      email: 'admin@aicte.gov.in',
      passwordHash,
      role: ROLES.ADMIN,
      designation: 'Director & Head of Approvals, AICTE HQ',
      phone: '9810099887'
    });

    console.log('[Seed]: Created demo accounts (Password for all: Demo@123)');

    // 3. Create Sample FDRs
    const now = new Date();

    // 3a. Active Verified FDR (Healthy, matures in 2 years)
    const activeMaturity = new Date();
    activeMaturity.setFullYear(now.getFullYear() + 2);
    const fdrActive = await FDR.create({
      fdrNumber: 'FDR/SBI/2024/78219',
      institutionId: inst1._id,
      submittedBy: institutionUser._id,
      bankName: 'State Bank of India',
      branchName: 'Dwarka Sector 11, New Delhi',
      ifscCode: 'SBIN0005432',
      amount: 2500000,
      currency: 'INR',
      depositDate: new Date('2024-01-15'),
      maturityDate: activeMaturity,
      autoRenewal: false,
      purpose: 'Establishment of New Technical Institution',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      remarks: 'Primary security deposit towards AICTE Letter of Approval (LoA).',
      documentUrl: '/uploads/fdr-documents/sample-fdr-receipt.pdf',
      documentOriginalName: 'SBI_FDR_78219_Receipt.pdf',
      isBankVerified: true,
      bankVerifiedData: {
        bankReferenceNumber: 'CBS-SBI-98231477',
        confirmedAmount: 2500000,
        confirmedMaturityDate: activeMaturity,
        lienMarkedToAICTE: true,
        verificationTimestamp: new Date('2024-01-20'),
        verificationCode: 'BANK-VER-SBI-9821'
      },
      status: FDR_STATUS.VERIFIED_ACTIVE,
      reviewedBy: officerUser._id,
      reviewedAt: new Date('2024-01-22'),
      officerRemarks: 'Bank CBS records verified and lien confirmed to Member Secretary, AICTE.'
    });

    // 3b. Expiring Soon FDR (Matures in 25 days)
    const expiringDate = new Date();
    expiringDate.setDate(now.getDate() + 25);
    const fdrExpiring = await FDR.create({
      fdrNumber: 'FDR/PNB/2023/45120',
      institutionId: inst1._id,
      submittedBy: institutionUser._id,
      bankName: 'Punjab National Bank',
      branchName: 'Connaught Place, New Delhi',
      ifscCode: 'PUNB0012900',
      amount: 1500000,
      currency: 'INR',
      depositDate: new Date('2023-03-10'),
      maturityDate: expiringDate,
      autoRenewal: false,
      purpose: 'Introduction of New Course / Programme',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      documentUrl: '/uploads/fdr-documents/sample-fdr-receipt.pdf',
      documentOriginalName: 'PNB_FDR_Receipt.pdf',
      isBankVerified: true,
      bankVerifiedData: {
        bankReferenceNumber: 'CBS-PNB-44129801',
        confirmedAmount: 1500000,
        confirmedMaturityDate: expiringDate,
        lienMarkedToAICTE: true,
        verificationTimestamp: new Date('2023-03-15'),
        verificationCode: 'BANK-VER-PNB-3310'
      },
      status: FDR_STATUS.EXPIRING_SOON,
      reviewedBy: officerUser._id,
      reviewedAt: new Date('2023-03-16'),
      officerRemarks: 'Verified and active.'
    });

    // 3c. Matured FDR (Matured 10 days ago; STRICT RULE: NOT released)
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 10);
    const fdrMatured = await FDR.create({
      fdrNumber: 'FDR/CANARA/2023/11098',
      institutionId: inst1._id,
      submittedBy: institutionUser._id,
      bankName: 'Canara Bank',
      branchName: 'Janakpuri, New Delhi',
      ifscCode: 'CNRB0002134',
      amount: 2000000,
      currency: 'INR',
      depositDate: new Date('2023-01-05'),
      maturityDate: pastDate,
      autoRenewal: false,
      purpose: 'Increase in Student Intake Capacity',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      documentUrl: '/uploads/fdr-documents/sample-fdr-receipt.pdf',
      documentOriginalName: 'Canara_FDR_Receipt.pdf',
      isBankVerified: true,
      bankVerifiedData: {
        bankReferenceNumber: 'CBS-CNRB-11098231',
        confirmedAmount: 2000000,
        confirmedMaturityDate: pastDate,
        lienMarkedToAICTE: true,
        verificationTimestamp: new Date('2023-01-10'),
        verificationCode: 'BANK-VER-CNRB-1109'
      },
      status: FDR_STATUS.MATURED,
      reviewedBy: officerUser._id,
      reviewedAt: new Date('2023-01-12'),
      officerRemarks: 'Tenure completed. Waiting for institution renewal submission or formal release petition.'
    });

    // 3d. Discrepancy Flagged FDR (Amount mismatch simulated)
    const discrepancyMaturity = new Date();
    discrepancyMaturity.setFullYear(now.getFullYear() + 1);
    const fdrDiscrepancy = await FDR.create({
      fdrNumber: 'FDR/HDFC/2025/DIFF88',
      institutionId: inst1._id,
      submittedBy: institutionUser._id,
      bankName: 'HDFC Bank',
      branchName: 'Barakhamba Road, New Delhi',
      ifscCode: 'HDFC0000003',
      amount: 3500000,
      currency: 'INR',
      depositDate: new Date('2025-02-01'),
      maturityDate: discrepancyMaturity,
      autoRenewal: false,
      purpose: 'Establishment of New Technical Institution',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      documentUrl: '/uploads/fdr-documents/sample-fdr-receipt.pdf',
      documentOriginalName: 'HDFC_Deposit_Slip.pdf',
      isBankVerified: true,
      bankVerifiedData: {
        bankReferenceNumber: 'CBS-HDFC-9912001',
        confirmedAmount: 2800000,
        confirmedMaturityDate: discrepancyMaturity,
        lienMarkedToAICTE: false,
        verificationTimestamp: new Date(),
        verificationCode: 'BANK-VER-HDFC-DISC'
      },
      status: FDR_STATUS.DISCREPANCY_FLAGGED,
      discrepancy: {
        isFlagged: true,
        reason: 'Bank CBS records show deposited amount ₹28,00,000, whereas claimed is ₹35,00,000. Also, AICTE joint lien endorsement is missing.',
        flaggedBy: officerUser._id,
        flaggedAt: new Date()
      }
    });

    // 3e. Newly Submitted FDR (Pending AICTE Officer Verification)
    const pendingMaturity = new Date();
    pendingMaturity.setFullYear(now.getFullYear() + 3);
    const fdrPending = await FDR.create({
      fdrNumber: 'FDR/ICICI/2026/90214',
      institutionId: inst2._id,
      submittedBy: institutionUser._id,
      bankName: 'ICICI Bank',
      branchName: 'Shivajinagar, Pune',
      ifscCode: 'ICIC0000104',
      amount: 1000000,
      currency: 'INR',
      depositDate: new Date(),
      maturityDate: pendingMaturity,
      autoRenewal: true,
      purpose: 'Introduction of New Course / Programme',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      documentUrl: '/uploads/fdr-documents/sample-fdr-receipt.pdf',
      documentOriginalName: 'ICICI_Receipt_90214.pdf',
      status: FDR_STATUS.SUBMITTED
    });

    // 3f. Released FDR (Fully Discharged)
    const releasedMaturity = new Date('2024-05-01');
    const fdrReleased = await FDR.create({
      fdrNumber: 'FDR/BOB/2021/33421',
      institutionId: inst1._id,
      submittedBy: institutionUser._id,
      bankName: 'Bank of Baroda',
      branchName: 'Dwarka, New Delhi',
      ifscCode: 'BARB0DWARKA',
      amount: 1500000,
      currency: 'INR',
      depositDate: new Date('2021-05-01'),
      maturityDate: releasedMaturity,
      autoRenewal: false,
      purpose: 'Mandatory Joint AICTE Security Reserve',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      documentUrl: '/uploads/fdr-documents/sample-fdr-receipt.pdf',
      documentOriginalName: 'BOB_Receipt.pdf',
      isBankVerified: true,
      bankVerifiedData: {
        bankReferenceNumber: 'CBS-BARB-882190',
        confirmedAmount: 1500000,
        confirmedMaturityDate: releasedMaturity,
        lienMarkedToAICTE: true,
        verificationTimestamp: new Date('2021-05-10'),
        verificationCode: 'BANK-VER-BOB-3342'
      },
      status: FDR_STATUS.RELEASED,
      reviewedBy: officerUser._id,
      reviewedAt: new Date('2024-05-10'),
      officerRemarks: 'Refund approved after institution course closure NOC clearance.'
    });

    // 4. Create sample Lifecycle Request
    await LifecycleRequest.create({
      fdrId: fdrMatured._id,
      institutionId: inst1._id,
      requestedBy: institutionUser._id,
      requestType: 'RELEASE',
      reason: 'Course duration concluded and batch graduated with complete compliance.',
      releaseDetails: {
        closureJustification: 'Institution completed 10-year term without dispute; AICTE clearance issued.',
        beneficiaryAccount: {
          bankName: 'Canara Bank',
          accountNumber: '021340100982',
          ifscCode: 'CNRB0002134',
          beneficiaryName: 'Delhi Institute of Engineering & Advanced Technology'
        }
      },
      status: 'OFFICER_RECOMMENDED',
      reviewedBy: officerUser._id,
      officerRemarks: 'NOC verified. Institute has no pending student grievances or regulatory fines. Recommended for release order.',
      reviewedAt: new Date()
    });

    // 5. Create Sample Notifications
    await Notification.create([
      {
        institutionId: inst1._id,
        recipientRole: 'institution',
        type: 'DISCREPANCY_ALERT',
        title: `Discrepancy: ${fdrDiscrepancy.fdrNumber}`,
        message: 'Amount mismatch detected in FDR deposit records. Please rectify.',
        link: `/institution/fdrs/${fdrDiscrepancy._id}`
      },
      {
        institutionId: inst1._id,
        recipientRole: 'institution',
        type: 'EXPIRY_WARNING',
        title: `Expiring Soon: ${fdrExpiring.fdrNumber}`,
        message: `FDR ${fdrExpiring.fdrNumber} will mature in 25 days. Please file for renewal.`,
        link: `/institution/fdrs/${fdrExpiring._id}`
      },
      {
        recipientRole: 'officer',
        type: 'REQUEST_UPDATE',
        title: 'New Verification Pending',
        message: `Institution ${inst2.name} submitted FDR ${fdrPending.fdrNumber} for verification.`,
        link: `/officer/pending`
      }
    ]);

    // 6. Create Initial Audit Logs
    await AuditLog.create([
      {
        userId: institutionUser._id,
        userName: institutionUser.name,
        userRole: institutionUser.role,
        institutionId: inst1._id,
        actionType: ACTION_TYPES.FDR_SUBMISSION,
        entityType: 'FDR',
        entityId: fdrActive._id,
        details: 'Initial submission of FDR FDR/SBI/2024/78219 (₹25,00,000)'
      },
      {
        userId: officerUser._id,
        userName: officerUser.name,
        userRole: officerUser.role,
        institutionId: inst1._id,
        actionType: ACTION_TYPES.OFFICER_APPROVAL,
        entityType: 'FDR',
        entityId: fdrActive._id,
        details: 'Officer approved and activated FDR after bank CBS verification'
      },
      {
        userId: officerUser._id,
        userName: officerUser.name,
        userRole: officerUser.role,
        institutionId: inst1._id,
        actionType: ACTION_TYPES.DISCREPANCY_FLAGGED,
        entityType: 'FDR',
        entityId: fdrDiscrepancy._id,
        details: 'Officer flagged amount mismatch discrepancy on FDR FDR/HDFC/2025/DIFF88'
      }
    ]);

    console.log('[Seed Complete]: Successfully populated realistic demonstration database!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  }
};

seedDatabase();
