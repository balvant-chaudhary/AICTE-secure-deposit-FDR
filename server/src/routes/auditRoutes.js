import express from 'express';
import { getAuditLogs, getFDRAuditHistory } from '../controllers/auditController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect);

router.get('/', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), getAuditLogs);
router.get('/fdr/:fdrId', getFDRAuditHistory);

export default router;
