import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';
import { mockDB } from '../utils/mockStore.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === 'null' || token === 'undefined') {
        return errorResponse(res, 'Not authorized, token missing', 401);
      }

      const secret = process.env.JWT_SECRET || 'aicte_securedeposit_jwt_secret_key_sih2026_super_secure';
      const decoded = jwt.verify(token, secret);

      // Check if MongoDB is connected
      if (mongoose.connection.readyState === 1) {
        const user = await User.findById(decoded.id).select('-passwordHash').populate('institutionId');
        if (!user) {
          return errorResponse(res, 'Not authorized, user no longer exists', 401);
        }

        if (!user.isActive) {
          return errorResponse(res, 'Account has been deactivated. Please contact administrator.', 403);
        }

        req.user = user;
        return next();
      }

      // If mock store is not explicitly allowed, fail with 503
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }

      // Standalone Mock Store Fallback (only reached when USE_MOCK_STORE=true)
      const mockUser = mockDB.users.find((u) => u._id === decoded.id);
      if (!mockUser) {
        return errorResponse(res, 'Not authorized, user not found in session store', 401);
      }

      if (!mockUser.isActive) {
        return errorResponse(res, 'Account has been deactivated', 403);
      }

      // Safe user without passwordHash
      const { passwordHash, ...safeUser } = mockUser;
      const inst = mockDB.institutions.find((i) => i._id === safeUser.institutionId);
      req.user = {
        ...safeUser,
        institutionId: inst || null
      };

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(res, 'Authentication token has expired. Please sign in again.', 401);
      }
      return errorResponse(res, 'Not authorized, invalid token', 401);
    }
  }

  return errorResponse(res, 'Not authorized, no token provided', 401);
};
