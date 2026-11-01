import express from 'express';
import {
  submitFDR,
  getFDRs,
  getFDRById,
  updateFDR,
  downloadDocument
} from '../controllers/fdrController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { handleFDRUpload } from '../middlewares/uploadMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect);

// 1. Submit FDR (Institution-only, multipart/form-data)
router.post('/', authorizeRoles(ROLES.INSTITUTION), handleFDRUpload('document'), submitFDR);

// 2. Get FDRs (Institution sees only own; Officer/Admin see all with filter/pagination)
router.get('/', getFDRs);

// 3. Get FDR Details
router.get('/:id', getFDRById);

// 4. Update FDR (Institution-only, allowed only when SUBMITTED or DISCREPANCY_FLAGGED)
router.put('/:id', authorizeRoles(ROLES.INSTITUTION), handleFDRUpload('document'), updateFDR);

// 5. Download document (Authenticated, ownership-enforced)
router.get('/:id/download-document', downloadDocument);
router.get('/:id/document', downloadDocument);

export default router;
