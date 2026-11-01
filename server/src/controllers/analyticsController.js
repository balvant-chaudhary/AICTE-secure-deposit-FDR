import { FDR } from '../models/FDR.js';
import { Institution } from '../models/Institution.js';
import { LifecycleRequest } from '../models/LifecycleRequest.js';
import { FDR_STATUS } from '../constants/fdrStatus.js';
import { ROLES } from '../constants/roles.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { runMaturityScanNow } from '../services/cronService.js';

export const getDashboardMetrics = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === ROLES.INSTITUTION) {
      filter.institutionId = req.user.institutionId;
    }

    const [
      totalFDRs,
      activeFDRs,
      expiringSoonFDRs,
      maturedFDRs,
      discrepancyFDRs,
      releasedFDRs,
      pendingRequests
    ] = await Promise.all([
      FDR.countDocuments(filter),
      FDR.countDocuments({ ...filter, status: FDR_STATUS.VERIFIED_ACTIVE }),
      FDR.countDocuments({ ...filter, status: FDR_STATUS.EXPIRING_SOON }),
      FDR.countDocuments({ ...filter, status: FDR_STATUS.MATURED }),
      FDR.countDocuments({ ...filter, status: FDR_STATUS.DISCREPANCY_FLAGGED }),
      FDR.countDocuments({ ...filter, status: FDR_STATUS.RELEASED }),
      LifecycleRequest.countDocuments(
        req.user.role === ROLES.INSTITUTION
          ? { institutionId: req.user.institutionId, status: { $in: ['PENDING', 'OFFICER_RECOMMENDED'] } }
          : { status: { $in: ['PENDING', 'OFFICER_RECOMMENDED'] } }
      )
    ]);

    // Aggregate total locked amount
    const activeAmountAgg = await FDR.aggregate([
      {
        $match: {
          ...filter,
          status: { $in: [FDR_STATUS.VERIFIED_ACTIVE, FDR_STATUS.EXPIRING_SOON, FDR_STATUS.MATURED] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalLockedAmount = activeAmountAgg[0]?.totalAmount || 0;

    return successResponse(res, 'Dashboard metrics calculated', {
      metrics: {
        totalFDRs,
        activeFDRs,
        expiringSoonFDRs,
        maturedFDRs,
        discrepancyFDRs,
        releasedFDRs,
        pendingRequests,
        totalLockedAmount
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getStatusBreakdown = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === ROLES.INSTITUTION) {
      filter.institutionId = req.user.institutionId;
    }

    const distribution = await FDR.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);

    return successResponse(res, 'Status distribution retrieved', { distribution });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getBankDistribution = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === ROLES.INSTITUTION) {
      filter.institutionId = req.user.institutionId;
    }

    const bankDistribution = await FDR.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$bankName',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    return successResponse(res, 'Bank exposure distribution retrieved', { bankDistribution });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMaturityTimeline = async (req, res) => {
  try {
    const filter = {
      status: { $in: [FDR_STATUS.VERIFIED_ACTIVE, FDR_STATUS.EXPIRING_SOON, FDR_STATUS.MATURED] }
    };

    if (req.user.role === ROLES.INSTITUTION) {
      filter.institutionId = req.user.institutionId;
    }

    const timeline = await FDR.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$maturityDate' },
            month: { $month: '$maturityDate' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    const formattedTimeline = timeline.map((item) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        count: item.count,
        totalAmount: item.totalAmount
      };
    });

    return successResponse(res, 'Maturity projection timeline retrieved', { timeline: formattedTimeline });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const triggerManualScan = async (req, res) => {
  try {
    const scanResult = await runMaturityScanNow();
    return successResponse(res, 'Manual maturity scan executed successfully', { scanResult });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
