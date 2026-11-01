import mongoose from 'mongoose';
import { Institution } from '../models/Institution.js';
import { FDR } from '../models/FDR.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { mockDB } from '../utils/mockStore.js';

const isMongo = () => mongoose.connection.readyState === 1;

export const getMyProfile = async (req, res) => {
  try {
    const instId = req.user.institutionId?._id || req.user.institutionId;
    if (!instId) {
      return errorResponse(res, 'User is not linked to any institution', 400);
    }

    if (!isMongo()) {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }
      const institution = mockDB.institutions.find((i) => i._id === instId);
      if (!institution) {
        return errorResponse(res, 'Institution profile not found', 404);
      }
      return successResponse(res, 'Institution profile retrieved', { institution, dataSource: 'MockStore (Testing Mode)' });
    }

    const institution = await Institution.findById(instId);
    if (!institution) {
      return errorResponse(res, 'Institution profile not found', 404);
    }
    return successResponse(res, 'Institution profile retrieved', { institution, dataSource: 'MongoDB' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const instId = req.user.institutionId?._id || req.user.institutionId;
    if (!instId) {
      return errorResponse(res, 'User is not linked to an institution', 400);
    }

    const { contactPhone, address, state, city, pincode } = req.body;

    if (!isMongo()) {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }
      const institution = mockDB.institutions.find((i) => i._id === instId);
      if (!institution) return errorResponse(res, 'Institution not found', 404);
      if (contactPhone) institution.contactPhone = contactPhone;
      if (address) institution.address = address;
      if (state) institution.state = state;
      if (city) institution.city = city;
      if (pincode) institution.pincode = pincode;
      return successResponse(res, 'Institution profile updated', { institution, dataSource: 'MockStore (Testing Mode)' });
    }

    const institution = await Institution.findById(instId);
    if (!institution) {
      return errorResponse(res, 'Institution not found', 404);
    }

    if (contactPhone) institution.contactPhone = contactPhone;
    if (address) institution.address = address;
    if (state) institution.state = state;
    if (city) institution.city = city;
    if (pincode) institution.pincode = pincode;

    await institution.save();
    return successResponse(res, 'Institution profile updated', { institution, dataSource: 'MongoDB' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getAllInstitutions = async (req, res) => {
  try {
    if (!isMongo()) {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }
      return successResponse(res, 'Institutions retrieved', {
        count: mockDB.institutions.length,
        institutions: mockDB.institutions,
        dataSource: 'MockStore (Testing Mode)'
      });
    }

    const { search, state, type } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { aictePermanentId: { $regex: search, $options: 'i' } }
      ];
    }
    if (state) filter.state = state;
    if (type) filter.institutionType = type;

    const institutions = await Institution.find(filter).sort({ name: 1 });
    return successResponse(res, 'Institutions retrieved', {
      count: institutions.length,
      institutions,
      dataSource: 'MongoDB'
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getInstitutionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isMongo()) {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }
      const institution = mockDB.institutions.find((i) => i._id === id);
      if (!institution) return errorResponse(res, 'Institution not found', 404);
      const fdrs = mockDB.fdrs.filter((f) => f.institutionId === id);
      return successResponse(res, 'Institution details retrieved', { institution, fdrs, dataSource: 'MockStore (Testing Mode)' });
    }

    const institution = await Institution.findById(id);
    if (!institution) {
      return errorResponse(res, 'Institution not found', 404);
    }

    const fdrs = await FDR.find({ institutionId: id }).sort({ createdAt: -1 });

    return successResponse(res, 'Institution details retrieved', {
      institution,
      fdrs
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
