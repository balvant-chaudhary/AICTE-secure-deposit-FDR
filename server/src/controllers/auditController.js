import { AuditLog } from '../models/AuditLog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { actionType, entityType, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (actionType) filter.actionType = actionType;
    if (entityType) filter.entityType = entityType;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .populate('institutionId', 'name aictePermanentId')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return successResponse(res, 'Audit logs retrieved', {
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      logs
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getFDRAuditHistory = async (req, res) => {
  try {
    const { fdrId } = req.params;
    const logs = await AuditLog.find({ entityId: fdrId })
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 });

    return successResponse(res, 'FDR audit trail retrieved', { logs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
