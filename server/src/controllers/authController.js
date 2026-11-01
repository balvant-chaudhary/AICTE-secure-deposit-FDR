import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Institution } from '../models/Institution.js';
import { ROLES } from '../constants/roles.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generateToken } from '../utils/generateToken.js';
import { mockDB } from '../utils/mockStore.js';
import bcrypt from 'bcryptjs';

const isMongo = () => mongoose.connection.readyState === 1;

/**
 * POST /api/auth/register-institution
 * Registers a new technical institution and creates its primary institution user
 * Security:
 * - Role is strictly locked to 'institution' (frontend cannot override role)
 * - User is strictly locked to newly created institutionId
 * - Atomic rollback on partial failure
 * - Password hashed with bcrypt
 * - Never returns passwordHash
 */
export const registerInstitution = async (req, res) => {
  const {
    aictePermanentId,
    institutionName,
    institutionType,
    address = '',
    state,
    city,
    pincode,
    contactEmail,
    contactPhone,
    adminName,
    adminEmail,
    password,
    designation = 'Registrar',
    phone = ''
  } = req.body;

  // 1. Mandatory Fields Validation
  if (!aictePermanentId || !aictePermanentId.trim()) {
    return errorResponse(res, 'AICTE Permanent ID is required', 400);
  }
  if (!institutionName || !institutionName.trim()) {
    return errorResponse(res, 'Institution name is required', 400);
  }
  if (!state || !state.trim()) {
    return errorResponse(res, 'State is required', 400);
  }
  if (!city || !city.trim()) {
    return errorResponse(res, 'City is required', 400);
  }
  if (!pincode || !pincode.trim()) {
    return errorResponse(res, 'Pincode is required', 400);
  }
  if (!contactPhone || !contactPhone.trim()) {
    return errorResponse(res, 'Institution contact phone is required', 400);
  }
  if (!adminName || !adminName.trim()) {
    return errorResponse(res, 'Administrator / Nodal Officer name is required', 400);
  }
  if (!adminEmail || !adminEmail.trim()) {
    return errorResponse(res, 'Administrator email is required', 400);
  }
  if (!password || password.length < 6) {
    return errorResponse(res, 'Password is required and must be at least 6 characters long', 400);
  }

  // Email format validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  const normalizedAdminEmail = adminEmail.trim().toLowerCase();
  const normalizedContactEmail = (contactEmail || adminEmail).trim().toLowerCase();

  if (!emailRegex.test(normalizedAdminEmail)) {
    return errorResponse(res, 'Please provide a valid administrator email address', 400);
  }
  if (!emailRegex.test(normalizedContactEmail)) {
    return errorResponse(res, 'Please provide a valid official contact email address', 400);
  }

  const cleanPermanentId = aictePermanentId.trim().toUpperCase();
  const cleanInstName = institutionName.trim();
  const cleanAdminName = adminName.trim();

  // 2. Standalone / In-Memory Mock Mode
  if (!isMongo()) {
    if (process.env.USE_MOCK_STORE !== 'true') {
      return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required for institution registration.', 503);
    }

    // Check duplicates in mockDB
    const duplicateId = mockDB.institutions.find(
      (i) => i.aictePermanentId.toUpperCase() === cleanPermanentId
    );
    if (duplicateId) {
      return errorResponse(
        res,
        `An institution with AICTE Permanent ID '${cleanPermanentId}' is already registered`,
        409
      );
    }

    const duplicateUserEmail = mockDB.users.find(
      (u) => u.email.toLowerCase() === normalizedAdminEmail
    );
    if (duplicateUserEmail) {
      return errorResponse(
        res,
        `A user account with email '${normalizedAdminEmail}' already exists`,
        409
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newInst = {
      _id: `inst-${Date.now()}`,
      aictePermanentId: cleanPermanentId,
      name: cleanInstName,
      institutionType: institutionType || 'Engineering & Technology',
      address: address.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      contactEmail: normalizedContactEmail,
      contactPhone: contactPhone.trim(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newUser = {
      _id: `user-${Date.now()}`,
      name: cleanAdminName,
      email: normalizedAdminEmail,
      passwordHash,
      role: ROLES.INSTITUTION, // STRICT: Role is hardcoded to institution
      institutionId: newInst._id, // STRICT: Bound to this institution
      designation: designation.trim() || 'Registrar',
      phone: (phone || contactPhone).trim(),
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockDB.institutions.push(newInst);
    mockDB.users.push(newUser);

    const token = generateToken(newUser._id);

    return successResponse(
      res,
      'Institution and primary user registered successfully',
      {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          designation: newUser.designation,
          institution: {
            id: newInst._id,
            name: newInst.name,
            aictePermanentId: newInst.aictePermanentId,
            institutionType: newInst.institutionType,
            city: newInst.city,
            state: newInst.state,
            pincode: newInst.pincode,
            status: newInst.status
          }
        }
      },
      201
    );
  }

  // 3. MongoDB Execution with Duplicate Checking and Safe Rollback
  let createdInstitution = null;

  try {
    // Duplicate AICTE Permanent ID check
    const existingInst = await Institution.findOne({ aictePermanentId: cleanPermanentId });
    if (existingInst) {
      return errorResponse(
        res,
        `An institution with AICTE Permanent ID '${cleanPermanentId}' is already registered`,
        409
      );
    }

    // Duplicate User Email check
    const existingUser = await User.findOne({ email: normalizedAdminEmail });
    if (existingUser) {
      return errorResponse(
        res,
        `A user account with email '${normalizedAdminEmail}' already exists`,
        409
      );
    }

    // Create Institution document
    createdInstitution = await Institution.create({
      aictePermanentId: cleanPermanentId,
      name: cleanInstName,
      institutionType: institutionType || 'Engineering & Technology',
      address: address.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      contactEmail: normalizedContactEmail,
      contactPhone: contactPhone.trim(),
      status: 'active'
    });

    // Hash Password
    const passwordHash = await User.hashPassword(password);

    // Create Primary Institution User
    // STRICT SECURITY:
    // - role is forced to ROLES.INSTITUTION
    // - institutionId is forced to createdInstitution._id
    let user;
    try {
      user = await User.create({
        name: cleanAdminName,
        email: normalizedAdminEmail,
        passwordHash,
        role: ROLES.INSTITUTION,
        institutionId: createdInstitution._id,
        designation: designation.trim() || 'Registrar',
        phone: (phone || contactPhone).trim(),
        isActive: true,
        lastLogin: new Date()
      });
    } catch (userErr) {
      // Safe partial registration rollback: If user creation fails, delete created institution
      if (createdInstitution && createdInstitution._id) {
        await Institution.findByIdAndDelete(createdInstitution._id);
      }
      throw userErr;
    }

    const token = generateToken(user._id);

    return successResponse(
      res,
      'Institution and primary user registered successfully',
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          institution: {
            id: createdInstitution._id,
            name: createdInstitution.name,
            aictePermanentId: createdInstitution.aictePermanentId,
            institutionType: createdInstitution.institutionType,
            city: createdInstitution.city,
            state: createdInstitution.state,
            pincode: createdInstitution.pincode,
            status: createdInstitution.status
          }
        }
      },
      201
    );
  } catch (error) {
    // Ensure rollback if any error occurred before returning
    if (createdInstitution && createdInstitution._id) {
      await Institution.findByIdAndDelete(createdInstitution._id).catch(() => {});
    }
    return errorResponse(res, error.message || 'Registration failed', 500);
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials, updates lastLogin, and returns signed JWT with safe user profile
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Standalone / Mock Mode
    if (!isMongo()) {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required for authentication.', 503);
      }

      const mockUser = mockDB.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!mockUser) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      const isMatch = await bcrypt.compare(password, mockUser.passwordHash);
      if (!isMatch) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      if (!mockUser.isActive) {
        return errorResponse(res, 'Account has been deactivated. Please contact AICTE administrator.', 403);
      }

      mockUser.lastLogin = new Date();
      const token = generateToken(mockUser._id);
      const inst = mockDB.institutions.find((i) => i._id === mockUser.institutionId);

      return successResponse(res, 'Logged in successfully', {
        token,
        user: {
          id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          designation: mockUser.designation,
          institution: inst
            ? {
                id: inst._id,
                name: inst.name,
                aictePermanentId: inst.aictePermanentId,
                institutionType: inst.institutionType,
                city: inst.city,
                state: inst.state,
                pincode: inst.pincode
              }
            : null
        }
      });
    }

    // 2. MongoDB Database Execution
    const user = await User.findOne({ email: normalizedEmail }).populate('institutionId');
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated. Please contact AICTE administrator.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    return successResponse(res, 'Logged in successfully', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        institution: user.institutionId
          ? {
              id: user.institutionId._id,
              name: user.institutionId.name,
              aictePermanentId: user.institutionId.aictePermanentId,
              institutionType: user.institutionId.institutionType,
              city: user.institutionId.city,
              state: user.institutionId.state,
              pincode: user.institutionId.pincode
            }
          : null
      }
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Login error', 500);
  }
};

/**
 * GET /api/auth/me
 * Returns currently authenticated user session details
 * Protected by protect middleware
 */
export const getMe = async (req, res) => {
  try {
    const user = req.user;

    const safeUser = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation || '',
      phone: user.phone || '',
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      institution: user.institutionId
        ? {
            id: user.institutionId._id || user.institutionId.id,
            name: user.institutionId.name,
            aictePermanentId: user.institutionId.aictePermanentId,
            institutionType: user.institutionId.institutionType,
            city: user.institutionId.city,
            state: user.institutionId.state,
            pincode: user.institutionId.pincode
          }
        : null
    };

    return successResponse(res, 'Session profile retrieved', { user: safeUser });
  } catch (error) {
    return errorResponse(res, error.message || 'Could not retrieve profile', 500);
  }
};
