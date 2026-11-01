import express from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getAllInstitutions,
  getInstitutionDetails
} from '../controllers/institutionController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.use(protect);

router.get('/my-profile', authorizeRoles(ROLES.INSTITUTION), getMyProfile);
router.put('/my-profile', authorizeRoles(ROLES.INSTITUTION), updateMyProfile);

router.get('/', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), getAllInstitutions);
router.get('/:id', authorizeRoles(ROLES.OFFICER, ROLES.ADMIN), getInstitutionDetails);

export default router;
