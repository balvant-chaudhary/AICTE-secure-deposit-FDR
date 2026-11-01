import express from 'express';
import {
  getDashboardMetrics,
  getStatusBreakdown,
  getBankDistribution,
  getMaturityTimeline,
  triggerManualScan
} from '../controllers/analyticsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getDashboardMetrics);
router.get('/status-breakdown', getStatusBreakdown);
router.get('/bank-distribution', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), getBankDistribution);
router.get('/maturity-timeline', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), getMaturityTimeline);
router.post('/trigger-cron-scan', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), triggerManualScan);

export default router;
