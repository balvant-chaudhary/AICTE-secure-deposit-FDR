import express from 'express';
import {
  submitRenewalRequest,
  submitReleaseRequest,
  getRequests,
  officerRecommendRequest,
  adminDecisionRequest
} from '../controllers/requestController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { uploadFDRDocument } from '../middlewares/uploadMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect);

router.post('/renewal', authorizeRoles(ROLES.INSTITUTION), uploadFDRDocument.single('document'), submitRenewalRequest);
router.post('/release', authorizeRoles(ROLES.INSTITUTION), uploadFDRDocument.single('document'), submitReleaseRequest);
router.get('/', getRequests);
router.patch('/:id/officer-recommend', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), officerRecommendRequest);
router.patch('/:id/admin-decision', authorizeRoles(ROLES.ADMIN), adminDecisionRequest);

export default router;
