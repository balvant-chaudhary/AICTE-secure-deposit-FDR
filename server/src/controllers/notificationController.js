import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { ROLES } from '../constants/roles.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { mockDB } from '../utils/mockStore.js';

const isMongo = () => mongoose.connection.readyState === 1;

/**
 * Builds isolated MongoDB query filter based on the authenticated user persona.
 * Guarantees that:
 * 1. Institution users ONLY receive notifications for their own institutionId or direct recipientId.
 * 2. Officers ONLY receive notifications addressed to 'officer', direct recipientId, or global system broadcast.
 * 3. Admins ONLY receive notifications addressed to 'admin', direct recipientId, or global system broadcast.
 * 4. Institution-private notifications are NEVER matched by officer or admin filters.
 */
export const buildNotificationQueryFilter = (user) => {
  const userId = user._id || user.id;
  const userInstId = (user.institutionId?._id || user.institutionId || user.institution?.id || user.institution?._id)?.toString();

  if (user.role === ROLES.INSTITUTION) {
    if (!userInstId) {
      return {
        $or: [
          { recipientId: userId },
          { recipientRole: 'institution', institutionId: null },
          { recipientRole: 'all', institutionId: null }
        ]
      };
    }
    return {
      $or: [
        { recipientId: userId },
        { institutionId: userInstId },
        { recipientRole: 'institution', institutionId: null },
        { recipientRole: 'all', institutionId: null }
      ]
    };
  }

  if (user.role === ROLES.OFFICER) {
    return {
      $or: [
        { recipientId: userId },
        { recipientRole: ROLES.OFFICER, institutionId: null },
        { recipientRole: 'all', institutionId: null }
      ]
    };
  }

  if (user.role === ROLES.ADMIN) {
    return {
      $or: [
        { recipientId: userId },
        { recipientRole: ROLES.ADMIN, institutionId: null },
        { recipientRole: 'all', institutionId: null }
      ]
    };
  }

  return { recipientId: userId };
};

/**
 * Validates whether an authenticated user is authorized to read/modify a specific notification.
 * Returns true if authorized, false otherwise.
 */
export const isUserAuthorizedForNotification = (notification, user) => {
  if (!notification || !user) return false;

  const userId = (user._id || user.id)?.toString();
  const userRole = user.role;
  const userInstId = (user.institutionId?._id || user.institutionId || user.institution?.id || user.institution?._id)?.toString();

  const notifRecipientId = (notification.recipientId?._id || notification.recipientId)?.toString();
  const notifInstId = (notification.institutionId?._id || notification.institutionId)?.toString();
  const notifRole = notification.recipientRole;

  // 1. Direct Recipient check: if addressed directly to a specific user
  if (notifRecipientId) {
    return notifRecipientId === userId;
  }

  // 2. Institution persona authorization
  if (userRole === ROLES.INSTITUTION) {
    // If notification has an institutionId, it MUST strictly match the user's institution
    if (notifInstId) {
      return notifInstId === userInstId;
    }
    // If no institutionId (e.g. system broadcast), allow if role is 'institution' or 'all'
    return notifRole === 'institution' || notifRole === 'all';
  }

  // 3. Officer persona authorization
  if (userRole === ROLES.OFFICER) {
    // Officers must NEVER access or modify institution-private notifications
    if (notifInstId || notifRole === 'institution') {
      return false;
    }
    if (notifRole === ROLES.ADMIN) {
      return false;
    }
    return notifRole === ROLES.OFFICER || notifRole === 'all';
  }

  // 4. Admin persona authorization
  if (userRole === ROLES.ADMIN) {
    // Admins must NEVER access or modify institution-private notifications via user notification inbox
    if (notifInstId || notifRole === 'institution') {
      return false;
    }
    if (notifRole === ROLES.OFFICER) {
      return false;
    }
    return notifRole === ROLES.ADMIN || notifRole === 'all';
  }

  return false;
};

/**
 * GET /api/notifications
 * Retrieves notifications visible to the authenticated user with strict role isolation.
 */
export const getNotifications = async (req, res) => {
  try {
    const filter = buildNotificationQueryFilter(req.user);

    if (isMongo()) {
      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(50);

      return successResponse(res, 'Notifications retrieved successfully', { notifications });
    }

    if (process.env.USE_MOCK_STORE !== 'true') {
      return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
    }

    // Mock store fallback
    const notifications = (mockDB.notifications || [])
      .filter((n) => isUserAuthorizedForNotification(n, req.user))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);

    return successResponse(res, 'Notifications retrieved successfully (MockStore)', { notifications });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read with strict authorization verification.
 * Prevents cross-institution marking and unauthorized access across roles.
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'Notification ID is required', 400);
    }

    let notification;

    if (isMongo()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Notification not found', 404);
      }

      notification = await Notification.findById(id);
    } else {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }
      notification = (mockDB.notifications || []).find((n) => n._id === id);
    }

    // 1. Check existence
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    // 2. Strict Authorization Guard: Verify user has permission to access this notification
    const authorized = isUserAuthorizedForNotification(notification, req.user);
    if (!authorized) {
      return errorResponse(
        res,
        'Access denied: You are not authorized to mark this notification as read',
        403
      );
    }

    // 3. Update read state
    if (isMongo()) {
      notification.isRead = true;
      await notification.save();
    } else {
      notification.isRead = true;
    }

    return successResponse(res, 'Notification marked as read', { notification });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications visible to the authenticated user as read.
 * Guarantees that only notifications matching the authenticated user's isolated scope are modified.
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userFilter = buildNotificationQueryFilter(req.user);

    // Explicit security assertion: filter MUST never be empty
    if (!userFilter || Object.keys(userFilter).length === 0) {
      return errorResponse(res, 'Unable to determine user notification scope', 400);
    }

    const updateFilter = {
      ...userFilter,
      isRead: false
    };

    let modifiedCount = 0;

    if (isMongo()) {
      const result = await Notification.updateMany(updateFilter, { isRead: true });
      modifiedCount = result.modifiedCount || result.nModified || 0;
    } else {
      if (process.env.USE_MOCK_STORE !== 'true') {
        return errorResponse(res, 'Database unavailable. Persistent MongoDB connection is required.', 503);
      }
      (mockDB.notifications || []).forEach((n) => {
        if (!n.isRead && isUserAuthorizedForNotification(n, req.user)) {
          n.isRead = true;
          modifiedCount++;
        }
      });
    }

    return successResponse(res, 'All notifications marked as read', { modifiedCount });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
