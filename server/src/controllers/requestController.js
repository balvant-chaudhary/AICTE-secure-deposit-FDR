import { LifecycleRequest } from '../models/LifecycleRequest.js';
import { FDR } from '../models/FDR.js';
import { Notification } from '../models/Notification.js';
import { FDR_STATUS } from '../constants/fdrStatus.js';
import { ROLES } from '../constants/roles.js';
import { ACTION_TYPES } from '../constants/actionTypes.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendNotificationEmail } from '../services/emailService.js';

export const submitRenewalRequest = async (req, res) => {
  try {
    const { fdrId, newMaturityDate, newAmount, newFdrNumber, reason } = req.body;

    if (!fdrId || !newMaturityDate || !reason) {
      return errorResponse(res, 'FDR ID, new maturity date, and justification reason are required', 400);
    }

    const fdr = await FDR.findById(fdrId);
    if (!fdr) {
      return errorResponse(res, 'FDR not found', 404);
    }

    const userInstId = (req.user.institutionId?._id || req.user.institutionId)?.toString();
    const fdrInstId = (fdr.institutionId?._id || fdr.institutionId)?.toString();

    if (
      req.user.role === ROLES.INSTITUTION &&
      fdrInstId !== userInstId
    ) {
      return errorResponse(res, 'Access denied: You do not own this FDR', 403);
    }

    let renewalDocumentUrl = '';
    if (req.file) {
      renewalDocumentUrl = `/uploads/fdr-documents/${req.file.filename}`;
    }

    const request = await LifecycleRequest.create({
      fdrId,
      institutionId: fdr.institutionId,
      requestedBy: req.user._id,
      requestType: 'RENEWAL',
      reason,
      renewalDetails: {
        newMaturityDate: new Date(newMaturityDate),
        newAmount: newAmount ? Number(newAmount) : fdr.amount,
        newFdrNumber: newFdrNumber || fdr.fdrNumber,
        renewalDocumentUrl
      },
      status: 'PENDING'
    });

    // Update FDR state
    fdr.status = FDR_STATUS.RENEWAL_PENDING;
    await fdr.save();

    await logAuditEvent({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      institutionId: fdr.institutionId,
      actionType: ACTION_TYPES.RENEWAL_REQUESTED,
      entityType: 'REQUEST',
      entityId: request._id,
      newState: { status: 'PENDING', requestType: 'RENEWAL' },
      details: `Renewal requested for FDR ${fdr.fdrNumber} until ${new Date(newMaturityDate).toISOString().split('T')[0]}`,
      ipAddress: req.ip
    });

    return successResponse(res, 'FDR renewal request submitted for officer review', { request }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const submitReleaseRequest = async (req, res) => {
  try {
    const {
      fdrId,
      reason,
      closureJustification,
      bankName,
      accountNumber,
      ifscCode,
      beneficiaryName
    } = req.body;

    if (!fdrId || !reason || !bankName || !accountNumber || !ifscCode || !beneficiaryName) {
      return errorResponse(res, 'Please provide FDR ID, closure justification, and refund bank account details', 400);
    }

    const fdr = await FDR.findById(fdrId);
    if (!fdr) {
      return errorResponse(res, 'FDR not found', 404);
    }

    const userInstId = (req.user.institutionId?._id || req.user.institutionId)?.toString();
    const fdrInstId = (fdr.institutionId?._id || fdr.institutionId)?.toString();

    if (
      req.user.role === ROLES.INSTITUTION &&
      fdrInstId !== userInstId
    ) {
      return errorResponse(res, 'Access denied: You do not own this FDR', 403);
    }

    let nocDocumentUrl = '';
    if (req.file) {
      nocDocumentUrl = `/uploads/fdr-documents/${req.file.filename}`;
    }

    const request = await LifecycleRequest.create({
      fdrId,
      institutionId: fdr.institutionId,
      requestedBy: req.user._id,
      requestType: 'RELEASE',
      reason,
      releaseDetails: {
        closureJustification: closureJustification || reason,
        nocDocumentUrl,
        beneficiaryAccount: {
          bankName,
          accountNumber,
          ifscCode,
          beneficiaryName
        }
      },
      status: 'PENDING'
    });

    fdr.status = FDR_STATUS.RELEASE_PENDING;
    await fdr.save();

    await logAuditEvent({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      institutionId: fdr.institutionId,
      actionType: ACTION_TYPES.RELEASE_REQUESTED,
      entityType: 'REQUEST',
      entityId: request._id,
      newState: { status: 'PENDING', requestType: 'RELEASE' },
      details: `Release & Refund requested for FDR ${fdr.fdrNumber} (₹${fdr.amount.toLocaleString('en-IN')})`,
      ipAddress: req.ip
    });

    return successResponse(res, 'Release and refund request submitted for AICTE processing', { request }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getRequests = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};

    if (req.user.role === ROLES.INSTITUTION) {
      filter.institutionId = req.user.institutionId;
    }

    if (type) filter.requestType = type;
    if (status) filter.status = status;

    const requests = await LifecycleRequest.find(filter)
      .populate('fdrId')
      .populate('institutionId', 'name aictePermanentId institutionType contactEmail')
      .populate('requestedBy', 'name email designation')
      .populate('reviewedBy', 'name email designation')
      .populate('finalApprovedBy', 'name email designation')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Lifecycle requests retrieved', {
      count: requests.length,
      requests
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const officerRecommendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const request = await LifecycleRequest.findById(id).populate('fdrId');
    if (!request) {
      return errorResponse(res, 'Request not found', 404);
    }

    request.status = 'OFFICER_RECOMMENDED';
    request.reviewedBy = req.user._id;
    request.officerRemarks = remarks || 'Clearance documents verified by Officer. Recommended for Admin authorization.';
    request.reviewedAt = new Date();
    await request.save();

    await logAuditEvent({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      institutionId: request.institutionId,
      actionType: ACTION_TYPES.RELEASE_RECOMMENDED,
      entityType: 'REQUEST',
      entityId: request._id,
      newState: { status: 'OFFICER_RECOMMENDED' },
      details: `Officer recommended ${request.requestType} request for FDR ${request.fdrId?.fdrNumber}. Remarks: ${request.officerRemarks}`,
      ipAddress: req.ip
    });

    return successResponse(res, 'Request recommended to Admin for final authorization', { request });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const adminDecisionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, remarks, orderNumber } = req.body; // decision: 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return errorResponse(res, "Decision must be 'APPROVE' or 'REJECT'", 400);
    }

    const request = await LifecycleRequest.findById(id)
      .populate('fdrId')
      .populate('institutionId');

    if (!request) {
      return errorResponse(res, 'Request not found', 404);
    }

    const fdr = await FDR.findById(request.fdrId._id);

    if (decision === 'APPROVE') {
      request.status = 'APPROVED';
      request.finalApprovedBy = req.user._id;
      request.approvedAt = new Date();
      request.approvalOrderNumber = orderNumber || `AICTE/SEC-DEP/ORD-${Date.now().toString().slice(-6)}`;

      if (request.requestType === 'RELEASE') {
        fdr.status = FDR_STATUS.RELEASED;
        await fdr.save();

        await Notification.create({
          institutionId: request.institutionId._id,
          recipientRole: 'institution',
          type: 'REQUEST_UPDATE',
          title: `FDR Release Approved: ${fdr.fdrNumber}`,
          message: `Your Security Deposit release request for FDR ${fdr.fdrNumber} (Order: ${request.approvalOrderNumber}) has been APPROVED. AICTE lien discharged.`,
          link: `/institution/requests`
        });
      } else if (request.requestType === 'RENEWAL') {
        fdr.status = FDR_STATUS.VERIFIED_ACTIVE;
        if (request.renewalDetails.newMaturityDate) {
          fdr.maturityDate = request.renewalDetails.newMaturityDate;
        }
        if (request.renewalDetails.newAmount) {
          fdr.amount = request.renewalDetails.newAmount;
        }
        if (request.renewalDetails.newFdrNumber) {
          fdr.fdrNumber = request.renewalDetails.newFdrNumber;
        }
        if (request.renewalDetails.renewalDocumentUrl) {
          fdr.documentUrl = request.renewalDetails.renewalDocumentUrl;
        }
        await fdr.save();

        await Notification.create({
          institutionId: request.institutionId._id,
          recipientRole: 'institution',
          type: 'REQUEST_UPDATE',
          title: `FDR Renewal Approved: ${fdr.fdrNumber}`,
          message: `FDR renewal has been approved. New maturity date: ${fdr.maturityDate.toISOString().split('T')[0]}. Status is Active.`,
          link: `/institution/fdrs/${fdr._id}`
        });
      }

      await logAuditEvent({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        institutionId: request.institutionId._id,
        actionType: request.requestType === 'RELEASE' ? ACTION_TYPES.RELEASE_APPROVED : ACTION_TYPES.RENEWAL_APPROVED,
        entityType: 'REQUEST',
        entityId: request._id,
        newState: { status: 'APPROVED', fdrStatus: fdr.status },
        details: `Admin ${decision}D ${request.requestType} request. Order: ${request.approvalOrderNumber}`,
        ipAddress: req.ip
      });
    } else {
      // Rejection
      request.status = 'REJECTED';
      request.finalApprovedBy = req.user._id;
      request.rejectionReason = remarks || 'Request rejected by AICTE Administrator.';
      request.approvedAt = new Date();

      // Revert FDR status
      fdr.status = fdr.maturityDate <= new Date() ? FDR_STATUS.MATURED : FDR_STATUS.VERIFIED_ACTIVE;
      await fdr.save();

      await Notification.create({
        institutionId: request.institutionId._id,
        recipientRole: 'institution',
        type: 'REQUEST_UPDATE',
        title: `${request.requestType} Request Rejected: ${fdr.fdrNumber}`,
        message: `Your request was rejected. Reason: "${request.rejectionReason}".`,
        link: `/institution/requests`
      });

      await logAuditEvent({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        institutionId: request.institutionId._id,
        actionType: request.requestType === 'RELEASE' ? ACTION_TYPES.RELEASE_REJECTED : ACTION_TYPES.RENEWAL_REJECTED,
        entityType: 'REQUEST',
        entityId: request._id,
        newState: { status: 'REJECTED', fdrStatus: fdr.status },
        details: `Admin rejected ${request.requestType} request. Reason: ${request.rejectionReason}`,
        ipAddress: req.ip
      });
    }

    await request.save();
    return successResponse(res, `Request successfully marked as ${request.status}`, { request, fdr });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
