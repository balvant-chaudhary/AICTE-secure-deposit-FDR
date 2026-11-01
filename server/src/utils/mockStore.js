import bcrypt from 'bcryptjs';
import { ROLES } from '../constants/roles.js';
import { FDR_STATUS } from '../constants/fdrStatus.js';
import { ACTION_TYPES } from '../constants/actionTypes.js';

// Pre-compute bcrypt hash for seed accounts
const DEFAULT_HASH = bcrypt.hashSync('Demo@123', 10);

const now = new Date();
const activeMaturity = new Date();
activeMaturity.setFullYear(now.getFullYear() + 2);

const expiringDate = new Date();
expiringDate.setDate(now.getDate() + 25);

const pastDate = new Date();
pastDate.setDate(now.getDate() - 10);

const discrepancyMaturity = new Date();
discrepancyMaturity.setFullYear(now.getFullYear() + 1);

const pendingMaturity = new Date();
pendingMaturity.setFullYear(now.getFullYear() + 3);

// In-Memory Database Store (Active when operating standalone without active MongoDB server)
export const mockDB = {
  institutions: [
    {
      _id: 'inst-1',
      aictePermanentId: '1-432890123',
      name: 'Delhi Institute of Engineering & Advanced Technology',
      institutionType: 'Engineering & Technology',
      address: 'Sector 14, Dwarka Institutional Area',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110078',
      contactEmail: 'institution@aicte.gov.in',
      contactPhone: '011-28080123',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      _id: 'inst-2',
      aictePermanentId: '1-897612345',
      name: 'Maharashtra Institute of Technology & Management',
      institutionType: 'Management',
      address: 'Paud Road, Kothrud',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      contactEmail: 'mit_pune@example.ac.in',
      contactPhone: '020-25442111',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ],
  users: [
    {
      _id: 'user-inst-1',
      name: 'Dr. Rameshwar Sharma',
      email: 'institution@aicte.gov.in',
      passwordHash: DEFAULT_HASH,
      role: ROLES.INSTITUTION,
      institutionId: 'inst-1',
      designation: 'Registrar',
      phone: '9811223344',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      _id: 'user-off-1',
      name: 'Sunil Kumar Varma',
      email: 'officer@aicte.gov.in',
      passwordHash: DEFAULT_HASH,
      role: ROLES.OFFICER,
      institutionId: null,
      designation: 'Regional AICTE Officer (North Zone)',
      phone: '9871100223',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      _id: 'user-adm-1',
      name: 'Dr. Anita Roy',
      email: 'admin@aicte.gov.in',
      passwordHash: DEFAULT_HASH,
      role: ROLES.ADMIN,
      institutionId: null,
      designation: 'Director & Head of Approvals, AICTE HQ',
      phone: '9810099887',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ],
  fdrs: [
    {
      _id: 'fdr-1',
      fdrNumber: 'FDR/SBI/2024/78219',
      institutionId: 'inst-1',
      submittedBy: 'user-inst-1',
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
      reviewedBy: 'user-off-1',
      reviewedAt: new Date('2024-01-22'),
      officerRemarks: 'Bank CBS records verified and lien confirmed to Member Secretary, AICTE.',
      createdAt: new Date('2024-01-15')
    }
  ],
  requests: [],
  notifications: [],
  auditLogs: []
};
