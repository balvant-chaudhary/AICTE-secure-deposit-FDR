import express from 'express';
import {
  verifyFDR,
  getFDRVerification,
  getAllVerifications,
  triggerBankVerification,
  officerApproveFDR,
  flagDiscrepancy
} from '../controllers/verificationController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

// All verification endpoints require authentication
router.use(protect);

// 1. GET /api/verification - List verifications and aggregate statistics (Officer and Admin only)
router.get('/', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), getAllVerifications);

// 2. GET /api/verification/:fdrId - View verification result for an FDR (Officer, Admin, or Institution owner)
router.get('/:fdrId', getFDRVerification);

// 3. POST /api/verification/:fdrId/verify - Execute simulated bank verification (Officer and Admin only)
router.post('/:fdrId/verify', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), verifyFDR);

// Legacy/Compatibility endpoints
router.post('/:fdrId/simulate-bank-check', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), triggerBankVerification);
router.post('/:fdrId/officer-approve', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), officerApproveFDR);
router.post('/:fdrId/flag-discrepancy', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), flagDiscrepancy);

export default router;
