import { AuditLog } from '../models/AuditLog.js';

export const logAuditEvent = async ({
  userId,
  userName = '',
  userRole = '',
  institutionId = null,
  actionType,
  entityType,
  entityId,
  previousState = null,
  newState = null,
  details = '',
  ipAddress = ''
}) => {
  try {
    const entry = await AuditLog.create({
      userId,
      userName,
      userRole,
      institutionId,
      actionType,
      entityType,
      entityId,
      previousState,
      newState,
      details,
      ipAddress,
      timestamp: new Date()
    });
    return entry;
  } catch (error) {
    console.error('[Audit Log Error]: Failed to write audit event:', error.message);
    return null;
  }
};
