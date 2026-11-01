import express from 'express';
import {
  registerInstitution,
  login,
  getMe
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public Authentication Endpoints
router.post('/register-institution', registerInstitution);
router.post('/login', login);

// Authenticated Session Verification
router.get('/me', protect, getMe);

export default router;
