import mongoose from 'mongoose';
import { FDR } from '../models/FDR.js';
import { BankVerification, VERIFICATION_STATUS, SIMULATION_SCENARIOS } from '../models/BankVerification.js';
import { Notification } from '../models/Notification.js';
import { FDR_STATUS } from '../constants/fdrStatus.js';
import { ACTION_TYPES } from '../constants/actionTypes.js';
import { ROLES } from '../constants/roles.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { runBankVerification } from '../services/bankVerificationService.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendNotificationEmail } from '../services/emailService.js';

/**
 * POST /api/verification/:fdrId/verify
 * Perform simulated bank CBS verification for an FDR record
 * Accessible strictly by: Officer, Admin
 */
export const verifyFDR = async (req, res) => {
  try {
    const { fdrId } = req.params;
    const { scenario, remarks } = req.body || {};

    // 1. Validate FDR existence
    const fdr = await FDR.findById(fdrId).populate('institutionId');
    if (!fdr) {
      return errorResponse(res, 'FDR record not found', 404);
    }

    const previousStatus = fdr.status;
    const previousState = {
      status: fdr.status,
      isBankVerified: fdr.isBankVerified,
      verificationStatus: fdr.verificationStatus
    };

    // 2. Execute simulated bank verification engine
    const verificationReport = await runBankVerification(fdr, scenario);

    // 3. Persist verification record in MongoDB
    const newVerification = await BankVerification.create({
      fdrId: fdr._id,
      institutionId: fdr.institutionId?._id || fdr.institutionId,
      verificationReference: verificationReport.verificationReference,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      status: verificationReport.status,
      simulationScenario: verificationReport.simulationScenario,
      submittedDetails: verificationReport.submittedDetails,
      confirmedDetails: verificationReport.confirmedDetails,
      fieldComparisons: verificationReport.fieldComparisons,
      discrepancyReasons: verificationReport.discrepancyReasons,
      isSimulated: true
    });

    // 4. Update FDR lifecycle status appropriately based on verification outcome:
    // Fully matching FDR -> VERIFIED_ACTIVE
    // Any discrepancy -> DISCREPANCY_FLAGGED
    // Not found -> DISCREPANCY_FLAGGED
    fdr.latestVerification = newVerification._id;
    fdr.verificationStatus = verificationReport.status;
    fdr.bankVerifiedData = {
      bankReferenceNumber: verificationReport.confirmedDetails.bankReferenceNumber,
      confirmedAmount: verificationReport.confirmedDetails.amount,
      confirmedMaturityDate: verificationReport.confirmedDetails.maturityDate,
      lienMarkedToAICTE: verificationReport.confirmedDetails.lienMarkedToAICTE,
      verificationTimestamp: newVerification.verifiedAt,
      verificationCode: newVerification.verificationReference,
      rawSimulationPayload: {
        scenario: verificationReport.simulationScenario,
        cbsStatus: verificationReport.confirmedDetails.cbsStatus,
        accountHolderName: verificationReport.confirmedDetails.accountHolderName
      }
    };

    if (verificationReport.status === VERIFICATION_STATUS.VERIFIED) {
      fdr.status = FDR_STATUS.VERIFIED_ACTIVE;
      fdr.isBankVerified = true;
      fdr.reviewedBy = req.user._id;
      fdr.reviewedAt = new Date();
      fdr.officerRemarks = remarks || 'Bank CBS verification passed. 100% details match and AICTE lien confirmed.';
      fdr.discrepancy = {
        isFlagged: false,
        reason: '',
        flaggedBy: null,
        flaggedAt: null,
        resolutionRemarks: 'Verified successfully against bank records',
        resolvedAt: new Date()
      };
    } else {
      // Discrepancy found or not found
      fdr.status = FDR_STATUS.DISCREPANCY_FLAGGED;
      fdr.isBankVerified = false;
      fdr.discrepancy = {
        isFlagged: true,
        reason: verificationReport.discrepancyReasons.join(' | ') || 'Discrepancy identified during bank CBS check',
        flaggedBy: req.user._id,
        flaggedAt: new Date(),
        resolutionRemarks: '',
        resolvedAt: null
      };
    }

    await fdr.save();

    // 5. Populate verification record for response
    const populatedVerification = await BankVerification.findById(newVerification._id)
      .populate('verifiedBy', 'name email designation role')
      .populate('institutionId', 'name aictePermanentId');

    // 6. Audit Trail Logging
    await logAuditEvent({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      institutionId: fdr.institutionId?._id || fdr.institutionId,
      actionType:
        verificationReport.status === VERIFICATION_STATUS.VERIFIED
          ? ACTION_TYPES.OFFICER_APPROVAL
          : ACTION_TYPES.DISCREPANCY_FLAGGED,
      entityType: 'FDR',
      entityId: fdr._id,
      previousState,
      newState: {
        status: fdr.status,
        verificationStatus: fdr.verificationStatus,
        verificationReference: newVerification.verificationReference,
        scenario: verificationReport.simulationScenario
      },
      details: `Simulated bank verification executed by ${req.user.name} (${req.user.role}). Result: ${verificationReport.status} [Scenario: ${verificationReport.simulationScenario}]. Discrepancies: ${verificationReport.discrepancyReasons.length}`,
      ipAddress: req.ip
    });

    // 7. In-app and Email Notifications
    if (verificationReport.status === VERIFICATION_STATUS.VERIFIED) {
      await Notification.create({
        institutionId: fdr.institutionId?._id || fdr.institutionId,
        recipientRole: 'institution',
        type: 'VERIFICATION_SUCCESS',
        title: `FDR Verified & Active: ${fdr.fdrNumber}`,
        message: `Your FDR ${fdr.fdrNumber} (₹${fdr.amount.toLocaleString('en-IN')}) has been verified against bank records and marked VERIFIED_ACTIVE by AICTE.`,
        link: `/institution/fdrs/${fdr._id}`
      });

      if (fdr.institutionId?.contactEmail) {
        await sendNotificationEmail({
          to: fdr.institutionId.contactEmail,
          subject: `FDR Verified: AICTE Security Deposit ${fdr.fdrNumber} is Active`,
          textFallback: `FDR ${fdr.fdrNumber} has been successfully verified against bank CBS records and marked VERIFIED_ACTIVE.`
        });
      }
    } else {
      await Notification.create({
        institutionId: fdr.institutionId?._id || fdr.institutionId,
        recipientRole: 'institution',
        type: 'DISCREPANCY_ALERT',
        title: `DISCREPANCY DETECTED: FDR ${fdr.fdrNumber}`,
        message: `Bank verification for FDR ${fdr.fdrNumber} flagged issues: ${verificationReport.discrepancyReasons[0] || 'Details mismatch'}. Please review and submit corrections.`,
        link: `/institution/fdrs/${fdr._id}`
      });

      if (fdr.institutionId?.contactEmail) {
        await sendNotificationEmail({
          to: fdr.institutionId.contactEmail,
          subject: `ACTION REQUIRED: Discrepancy Flagged in FDR ${fdr.fdrNumber}`,
          textFallback: `Bank verification indicated discrepancies in FDR ${fdr.fdrNumber}: ${verificationReport.discrepancyReasons.join('; ')}`
        });
      }
    }

    return successResponse(
      res,
      `Bank verification completed. Status: ${verificationReport.status}`,
      {
        verification: populatedVerification,
        fdr,
        dataSource: 'MongoDB'
      },
      200
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/verification/:fdrId
 * Retrieve the latest verification result and history for an FDR
 * Accessible by: Officer, Admin, or the Institution who owns the FDR (strict isolation)
 */
export const getFDRVerification = async (req, res) => {
  try {
    const { fdrId } = req.params;

    const fdr = await FDR.findById(fdrId).populate('institutionId');
    if (!fdr) {
      return errorResponse(res, 'FDR record not found', 404);
    }

    // STRICT ROLE & OWNERSHIP ISOLATION
    if (req.user.role === ROLES.INSTITUTION) {
      const userInstId = (req.user.institutionId?._id || req.user.institutionId)?.toString();
      const fdrInstId = (fdr.institutionId?._id || fdr.institutionId)?.toString();

      if (userInstId !== fdrInstId) {
        return errorResponse(res, 'Access denied: You do not own this FDR record', 403);
      }
    }

    // Retrieve all verification history for this FDR, ordered latest first
    const history = await BankVerification.find({ fdrId })
      .populate('verifiedBy', 'name email designation role')
      .sort({ verifiedAt: -1 });

    const latestVerification = history[0] || null;

    return successResponse(
      res,
      latestVerification ? 'Verification records retrieved' : 'No verification executed yet',
      {
        latestVerification,
        history,
        fdr,
        dataSource: 'MongoDB'
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/verification
 * Retrieve list of all verifications with pagination, filters, and summary statistics
 * Accessible strictly by: Officer, Admin
 */
export const getAllVerifications = async (req, res) => {
  try {
    const { status, institutionId, search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && Object.values(VERIFICATION_STATUS).includes(status)) {
      filter.status = status;
    }
    if (institutionId) {
      filter.institutionId = institutionId;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { verificationReference: searchRegex },
        { 'submittedDetails.fdrNumber': searchRegex },
        { 'submittedDetails.bankName': searchRegex }
      ];
    }

    const total = await BankVerification.countDocuments(filter);
    const verifications = await BankVerification.find(filter)
      .populate('fdrId', 'fdrNumber amount bankName status maturityDate')
      .populate('institutionId', 'name aictePermanentId state city')
      .populate('verifiedBy', 'name email designation')
      .sort({ verifiedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate aggregated metrics for officer dashboard
    const [pendingCount, verifiedCount, discrepancyCount, notFoundCount] = await Promise.all([
      FDR.countDocuments({ status: { $in: [FDR_STATUS.SUBMITTED, FDR_STATUS.UNDER_VERIFICATION] } }),
      BankVerification.countDocuments({ status: VERIFICATION_STATUS.VERIFIED }),
      BankVerification.countDocuments({ status: VERIFICATION_STATUS.DISCREPANCY_FOUND }),
      BankVerification.countDocuments({ status: VERIFICATION_STATUS.NOT_FOUND })
    ]);

    return successResponse(res, 'Verification records retrieved', {
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      metrics: {
        pendingCount,
        verifiedCount,
        discrepancyCount,
        notFoundCount
      },
      verifications,
      dataSource: 'MongoDB'
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Backward Compatibility: POST /api/verification/:fdrId/simulate-bank-check
 */
export const triggerBankVerification = verifyFDR;

/**
 * Backward Compatibility: POST /api/verification/:fdrId/officer-approve
 */
export const officerApproveFDR = async (req, res) => {
  try {
    const { fdrId } = req.params;
    const { remarks } = req.body;

    const fdr = await FDR.findById(fdrId).populate('institutionId');
    if (!fdr) {
      return errorResponse(res, 'FDR not found', 404);
    }

    const previousStatus = fdr.status;
    fdr.status = FDR_STATUS.VERIFIED_ACTIVE;
    fdr.reviewedBy = req.user._id;
    fdr.reviewedAt = new Date();
    fdr.officerRemarks = remarks || 'FDR manually approved by AICTE Officer.';
    fdr.discrepancy.isFlagged = false;
    await fdr.save();

    await logAuditEvent({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      institutionId: fdr.institutionId?._id || fdr.institutionId,
      actionType: ACTION_TYPES.OFFICER_APPROVAL,
      entityType: 'FDR',
      entityId: fdr._id,
      previousState: { status: previousStatus },
      newState: { status: FDR_STATUS.VERIFIED_ACTIVE },
      details: `Manual approval granted by ${req.user.name}`,
      ipAddress: req.ip
    });

    return successResponse(res, 'FDR has been marked VERIFIED_ACTIVE', { fdr });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Backward Compatibility: POST /api/verification/:fdrId/flag-discrepancy
 */
export const flagDiscrepancy = async (req, res) => {
  try {
    const { fdrId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, 'Please specify the exact discrepancy reason', 400);
    }

    const fdr = await FDR.findById(fdrId).populate('institutionId');
    if (!fdr) {
      return errorResponse(res, 'FDR not found', 404);
    }

    const previousStatus = fdr.status;
    fdr.status = FDR_STATUS.DISCREPANCY_FLAGGED;
    fdr.discrepancy = {
      isFlagged: true,
      reason,
      flaggedBy: req.user._id,
      flaggedAt: new Date(),
      resolutionRemarks: '',
      resolvedAt: null
    };

    await fdr.save();

    await logAuditEvent({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      institutionId: fdr.institutionId?._id || fdr.institutionId,
      actionType: ACTION_TYPES.DISCREPANCY_FLAGGED,
      entityType: 'FDR',
      entityId: fdr._id,
      previousState: { status: previousStatus },
      newState: { status: FDR_STATUS.DISCREPANCY_FLAGGED, discrepancyReason: reason },
      details: `Discrepancy flagged: "${reason}" by Officer ${req.user.name}`,
      ipAddress: req.ip
    });

    return successResponse(res, 'Discrepancy flagged successfully and institution notified', { fdr });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
