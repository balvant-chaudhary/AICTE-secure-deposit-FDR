import cron from 'node-cron';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { FDR } from '../models/FDR.js';
import { Institution } from '../models/Institution.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { FDR_STATUS } from '../constants/fdrStatus.js';
import { ACTION_TYPES } from '../constants/actionTypes.js';
import { logAuditEvent } from './auditService.js';
import { sendNotificationEmail } from './emailService.js';
import { mockDB } from '../utils/mockStore.js';

const isMongo = () => mongoose.connection.readyState === 1;

// Concurrency lock to prevent overlapping scan runs in-memory
let isScanRunning = false;

/**
 * Acquires a distributed lease lock in MongoDB using atomic findOneAndUpdate on cron_locks collection.
 * Generates a unique, cryptographically random owner token per acquisition.
 * Auto-expires after ttlMs to prevent deadlocks in case of unexpected process termination.
 *
 * Returns { acquired: true, ownerToken, expiresAt } on success, or null if locked by another active process.
 */
export const acquireDatabaseLock = async (lockName, ttlMs = 60000) => {
  const ownerToken = crypto.randomUUID();

  if (!isMongo()) {
    return { acquired: true, ownerToken, expiresAt: new Date(Date.now() + ttlMs) };
  }

  const now = new Date();
  const lockExpiration = new Date(now.getTime() + ttlMs);

  try {
    const collection = mongoose.connection.db.collection('cron_locks');
    const result = await collection.findOneAndUpdate(
      {
        _id: lockName,
        $or: [
          { lockedUntil: { $lte: now } },
          { lockedUntil: { $exists: false } }
        ]
      },
      {
        $set: {
          ownerToken,
          lockedUntil: lockExpiration,
          lockedAt: now,
          renewedAt: now,
          lockedByPid: process.pid
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const doc = result && (result.value !== undefined ? result.value : result);
    if (doc && doc.ownerToken === ownerToken) {
      return { acquired: true, ownerToken, expiresAt: lockExpiration };
    }
    return null;
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key on upsert means another process acquired the lock concurrently
      return null;
    }
    console.warn(`[CronLock Warning]: ${err.message}`);
    // Fallback to in-memory lock if DB lock collection is unavailable
    return { acquired: true, ownerToken, expiresAt: lockExpiration, fallback: true };
  }
};

/**
 * Releases the distributed lease lock in MongoDB ONLY if the stored owner token matches.
 * Returns true if released, false if token did not match or lock already expired/taken.
 */
export const releaseDatabaseLock = async (lockName, ownerToken = null, options = {}) => {
  if (!isMongo()) return true;
  try {
    const collection = mongoose.connection.db.collection('cron_locks');
    const filter = { _id: lockName };

    if (ownerToken) {
      filter.ownerToken = ownerToken;
    } else if (options.force) {
      // Explicit force-clear for test teardown / administrative reset
    } else {
      console.warn(`[CronLock Release Warning]: releaseDatabaseLock called without ownerToken for ${lockName}. Refusing release without verified ownership.`);
      return false;
    }

    const result = await collection.updateOne(
      filter,
      { $set: { lockedUntil: new Date(0), ownerToken: null } }
    );
    return result.modifiedCount > 0;
  } catch (err) {
    console.warn(`[CronLock Release Warning]: ${err.message}`);
    return false;
  }
};

/**
 * Renews an active lease lock in MongoDB.
 * Succeeds ONLY if the lock is currently held by ownerToken and has not yet expired.
 */
export const renewDatabaseLock = async (lockName, ownerToken, ttlMs = 60000) => {
  if (!isMongo()) return true;
  if (!ownerToken) return false;

  const now = new Date();
  const newExpiration = new Date(now.getTime() + ttlMs);

  try {
    const collection = mongoose.connection.db.collection('cron_locks');
    const result = await collection.findOneAndUpdate(
      {
        _id: lockName,
        ownerToken,
        lockedUntil: { $gt: now } // Must be currently active and unexpired
      },
      {
        $set: {
          lockedUntil: newExpiration,
          renewedAt: now
        }
      },
      { returnDocument: 'after' }
    );

    const doc = result && (result.value !== undefined ? result.value : result);
    return !!(doc && doc.ownerToken === ownerToken);
  } catch (err) {
    console.warn(`[CronLock Renewal Warning]: ${err.message}`);
    return false;
  }
};

/**
 * Checks whether the specified ownerToken still currently holds an active (unexpired) lease.
 */
export const isDatabaseLockHeld = async (lockName, ownerToken) => {
  if (!isMongo()) return true;
  if (!ownerToken) return false;

  const now = new Date();
  try {
    const collection = mongoose.connection.db.collection('cron_locks');
    const lock = await collection.findOne({
      _id: lockName,
      ownerToken,
      lockedUntil: { $gt: now }
    });
    return !!lock;
  } catch (err) {
    console.warn(`[CronLock Verification Warning]: ${err.message}`);
    return false;
  }
};

/**
 * Administrative force-release for testing harness reset.
 */
export const forceReleaseDatabaseLock = async (lockName) => {
  return releaseDatabaseLock(lockName, null, { force: true });
};

/**
 * Calculates calendar days remaining until maturityDate relative to refDate.
 * Uses Math.ceil to ensure consistent day-boundary calculations.
 */
export const calculateDaysRemaining = (maturityDate, refDate = new Date()) => {
  const mat = new Date(maturityDate);
  const ref = new Date(refDate);
  const diffTime = mat.getTime() - ref.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Phase 5 Step 2: Reliable Tiered Maturity Scanner & Delivery Engine
 *
 * Evaluates eligible FDRs through 4 distinct lifecycle milestones:
 * 1. 30 < daysRemaining <= 60  => '60_DAY' alert (transitions status to EXPIRING_SOON)
 * 2. 7  < daysRemaining <= 30  => '30_DAY' alert (maintains EXPIRING_SOON)
 * 3. 0  < daysRemaining <= 7   => '7_DAY'  alert (critical final warning)
 * 4. daysRemaining <= 0        => 'MATURED' alert (transitions status to MATURED, NEVER auto-released)
 *
 * Reliability Guarantees:
 * - Milestone is marked in `maturityAlertsSent` ONLY when both recipient notifications succeed.
 * - Granular delivery receipts in `maturityAlertReceipts` and unique `idempotencyKey` on Notification
 *   prevent duplicate delivery when retrying after partial failures.
 * - Concurrency protection combines in-memory mutex and MongoDB distributed lease lock with owner tokens.
 * - Safe lease renewal heartbeat for long scans and mid-run lease loss protection.
 */
export const runMaturityScanNow = async (referenceDate = new Date(), options = {}) => {
  if (isScanRunning && !options.forceRun) {
    console.log('[Maturity Scanner]: Scan already running in memory, skipping overlapping execution.');
    return { status: 'SKIPPED', message: 'Scan already in progress' };
  }

  // Database-backed distributed lock with unique owner token and lease renewal
  const lockTtlMs = options.lockTtlMs || 60000;
  const lockResult = await acquireDatabaseLock('maturity_scan', lockTtlMs);
  if (!lockResult && !options.forceRun) {
    console.log('[Maturity Scanner]: Scan already running in database lock, skipping overlapping execution.');
    return { status: 'SKIPPED', message: 'Scan already in progress' };
  }

  const ownerToken = lockResult?.ownerToken || `token-${Date.now()}`;
  isScanRunning = true;
  console.log(`[Maturity Scanner]: Running Tiered Maturity Scan (Reference Date: ${new Date(referenceDate).toISOString().split('T')[0]}, Owner: ${ownerToken.substring(0, 8)})...`);

  let renewalTimer = null;
  let isLeaseLost = false;

  // Active Lease Heartbeat / Renewal Mechanism:
  // Renews lease periodically at 1/3 of the TTL interval to prevent expiry during long-running scans.
  if (isMongo() && lockResult && !options.disableRenewal) {
    const heartbeatIntervalMs = Math.max(100, Math.floor(lockTtlMs / 3));
    renewalTimer = setInterval(async () => {
      const renewed = await renewDatabaseLock('maturity_scan', ownerToken, lockTtlMs);
      if (!renewed) {
        console.warn(`[Maturity Scanner]: Lease renewal failed for owner ${ownerToken}. Lock lost or expired!`);
        isLeaseLost = true;
        clearInterval(renewalTimer);
      }
    }, heartbeatIntervalMs);

    if (renewalTimer.unref) renewalTimer.unref();
  }

  const summary = {
    totalProcessed: 0,
    alertsSent: {
      sixtyDayCount: 0,
      thirtyDayCount: 0,
      sevenDayCount: 0,
      maturedCount: 0
    },
    errors: []
  };

  try {
    const refDate = new Date(referenceDate);

    // 1. Standalone Mock Store Execution (Testing Mode)
    if (!isMongo()) {
      if (process.env.USE_MOCK_STORE !== 'true') {
        throw new Error('Database unavailable. Persistent MongoDB connection is required.');
      }

      const mockEligible = (mockDB.fdrs || []).filter(
        (f) =>
          f.status === FDR_STATUS.VERIFIED_ACTIVE ||
          f.status === FDR_STATUS.EXPIRING_SOON ||
          (f.status === FDR_STATUS.MATURED && (!f.maturityAlertsSent || !f.maturityAlertsSent.includes('MATURED')))
      );

      for (const fdr of mockEligible) {
        summary.totalProcessed++;
        fdr.maturityAlertsSent = fdr.maturityAlertsSent || [];
        fdr.maturityAlertReceipts = fdr.maturityAlertReceipts || [];

        const daysRemaining = calculateDaysRemaining(fdr.maturityDate, refDate);
        let milestone = null;

        if (daysRemaining <= 0) {
          milestone = 'MATURED';
        } else if (daysRemaining <= 7) {
          milestone = '7_DAY';
        } else if (daysRemaining <= 30) {
          milestone = '30_DAY';
        } else if (daysRemaining <= 60) {
          milestone = '60_DAY';
        }

        if (!milestone || fdr.maturityAlertsSent.includes(milestone)) {
          continue;
        }

        // Lifecycle status update
        if (milestone === 'MATURED') {
          fdr.status = FDR_STATUS.MATURED;
        } else {
          fdr.status = FDR_STATUS.EXPIRING_SOON;
        }

        const instKey = `MATURITY:${fdr._id}:${milestone}:institution`;
        const officerKey = `MATURITY:${fdr._id}:${milestone}:officer`;
        const instReceipt = `${milestone}:institution`;
        const officerReceipt = `${milestone}:officer`;

        let instDelivered = fdr.maturityAlertReceipts.includes(instReceipt);
        if (!instDelivered) {
          if (!options.simulateNotificationFailure?.institution) {
            mockDB.notifications.unshift({
              _id: `notif-${Date.now()}-inst-${Math.random().toString(36).substring(2, 6)}`,
              institutionId: fdr.institutionId?._id || fdr.institutionId,
              recipientRole: 'institution',
              type: 'EXPIRY_WARNING',
              title: `FDR ${milestone}: ${fdr.fdrNumber}`,
              message: `FDR ${fdr.fdrNumber} reached ${milestone} alert threshold (${daysRemaining} days remaining).`,
              link: `/institution/fdrs/${fdr._id}`,
              isRead: false,
              idempotencyKey: instKey,
              createdAt: new Date()
            });
            fdr.maturityAlertReceipts.push(instReceipt);
            instDelivered = true;
          }
        }

        let officerDelivered = fdr.maturityAlertReceipts.includes(officerReceipt);
        if (!officerDelivered) {
          if (!options.simulateNotificationFailure?.officer) {
            mockDB.notifications.unshift({
              _id: `notif-${Date.now()}-off-${Math.random().toString(36).substring(2, 6)}`,
              recipientRole: 'officer',
              institutionId: null,
              type: 'EXPIRY_WARNING',
              title: `Officer FDR ${milestone}: ${fdr.fdrNumber}`,
              message: `Officer Alert: FDR ${fdr.fdrNumber} reached ${milestone}.`,
              link: '/officer/dashboard',
              isRead: false,
              idempotencyKey: officerKey,
              createdAt: new Date()
            });
            fdr.maturityAlertReceipts.push(officerReceipt);
            officerDelivered = true;
          }
        }

        if (instDelivered && officerDelivered) {
          let milestonesToAdd = [milestone];
          if (milestone === '7_DAY') milestonesToAdd = ['60_DAY', '30_DAY', '7_DAY'];
          else if (milestone === '30_DAY') milestonesToAdd = ['60_DAY', '30_DAY'];

          milestonesToAdd.forEach((m) => {
            if (!fdr.maturityAlertsSent.includes(m)) fdr.maturityAlertsSent.push(m);
          });

          if (milestone === 'MATURED') summary.alertsSent.maturedCount++;
          else if (milestone === '7_DAY') summary.alertsSent.sevenDayCount++;
          else if (milestone === '30_DAY') summary.alertsSent.thirtyDayCount++;
          else if (milestone === '60_DAY') summary.alertsSent.sixtyDayCount++;
        }
      }

      return summary;
    }

    // 2. Persistent MongoDB Database Execution
    // Eligible states: VERIFIED_ACTIVE and EXPIRING_SOON.
    // Also includes MATURED records whose 'MATURED' alert was not confirmed sent.
    // Ineligible states (RELEASED, REJECTED, DISCREPANCY_FLAGGED, SUBMITTED, RELEASE_PENDING) are strictly excluded.
    const candidates = await FDR.find({
      $or: [
        { status: { $in: [FDR_STATUS.VERIFIED_ACTIVE, FDR_STATUS.EXPIRING_SOON] } },
        { status: FDR_STATUS.MATURED, maturityAlertsSent: { $ne: 'MATURED' } }
      ]
    })
      .populate('institutionId', 'name aictePermanentId contactEmail')
      .populate('reviewedBy', 'name email designation')
      .populate('submittedBy', 'name email');

    summary.totalProcessed = candidates.length;

    for (const fdr of candidates) {
      // Lease loss safeguard: if lease expired or was taken by another process, immediately halt
      if (isLeaseLost) {
        console.warn(`[Maturity Scanner]: Scan processing halted mid-run because lease was lost for owner ${ownerToken}.`);
        summary.errors.push({ error: 'LEASE_LOST_ABORTED' });
        break;
      }

      if (options.checkLeaseBeforeItem) {
        const stillHeld = await isDatabaseLockHeld('maturity_scan', ownerToken);
        if (!stillHeld) {
          console.warn(`[Maturity Scanner]: Database verification confirmed lease lost for owner ${ownerToken}. Halting scan.`);
          summary.errors.push({ error: 'LEASE_LOST_ABORTED' });
          break;
        }
      }

      try {
        const daysRemaining = calculateDaysRemaining(fdr.maturityDate, refDate);
        let milestone = null;

        if (daysRemaining <= 0) {
          milestone = 'MATURED';
        } else if (daysRemaining <= 7) {
          milestone = '7_DAY';
        } else if (daysRemaining <= 30) {
          milestone = '30_DAY';
        } else if (daysRemaining <= 60) {
          milestone = '60_DAY';
        }

        // Outside alert horizon or already completely dispatched for this specific milestone
        if (!milestone) continue;
        if (fdr.maturityAlertsSent && fdr.maturityAlertsSent.includes(milestone)) continue;

        const instId = fdr.institutionId?._id || fdr.institutionId;
        const instName = fdr.institutionId?.name || 'Technical Institution';
        const formattedAmount = fdr.amount ? `₹${fdr.amount.toLocaleString('en-IN')}` : '₹0';
        const matDateStr = fdr.maturityDate ? new Date(fdr.maturityDate).toISOString().split('T')[0] : '';
        const submitterId = fdr.submittedBy?._id || fdr.submittedBy;
        const prevStatus = fdr.status;

        // Step 1: Lifecycle status progression (FDR remains in AICTE custody, never released)
        if (milestone === 'MATURED') {
          if (fdr.status !== FDR_STATUS.MATURED) {
            await FDR.findByIdAndUpdate(fdr._id, { $set: { status: FDR_STATUS.MATURED } });
            fdr.status = FDR_STATUS.MATURED;

            // Log governance audit trail for automated status change
            await logAuditEvent({
              userId: submitterId,
              userName: 'System Cron Daemon',
              userRole: 'system',
              institutionId: instId,
              actionType: ACTION_TYPES.STATUS_CHANGE_AUTOMATED,
              entityType: 'FDR',
              entityId: fdr._id,
              previousState: { status: prevStatus },
              newState: { status: FDR_STATUS.MATURED },
              details: `Automated transition: FDR reached maturity date (${matDateStr}) without automated release.`
            }).catch((err) => console.warn(`[Audit Log Failed]: ${err.message}`));
          }
        } else {
          // 60_DAY, 30_DAY, 7_DAY: Ensure status is EXPIRING_SOON
          if (fdr.status === FDR_STATUS.VERIFIED_ACTIVE) {
            await FDR.findByIdAndUpdate(fdr._id, { $set: { status: FDR_STATUS.EXPIRING_SOON } });
            fdr.status = FDR_STATUS.EXPIRING_SOON;
          }
        }

        let instTitle = '';
        let instMessage = '';
        let officerTitle = '';
        let officerMessage = '';

        if (milestone === 'MATURED') {
          instTitle = `FDR Matured: ${fdr.fdrNumber}`;
          instMessage = `Security Deposit FDR ${fdr.fdrNumber} (${formattedAmount}) has reached maturity on ${matDateStr}. As per AICTE statutory guidelines, release is NOT automatic. Please submit an official renewal or formal refund request.`;
          officerTitle = `Deposit Matured: ${fdr.fdrNumber}`;
          officerMessage = `Deposit ${fdr.fdrNumber} (${formattedAmount}) for ${instName} has matured without automated release. Pending institutional action.`;
        } else if (milestone === '7_DAY') {
          instTitle = `CRITICAL: FDR Expiring in ${daysRemaining} Days (${fdr.fdrNumber})`;
          instMessage = `FINAL REMINDER: Security Deposit FDR ${fdr.fdrNumber} (${formattedAmount}) matures in ${daysRemaining} days on ${matDateStr}. Please file statutory renewal immediately via the portal.`;
          officerTitle = `Critical Expiry Warning (7 Days): ${fdr.fdrNumber}`;
          officerMessage = `Critical: Deposit ${fdr.fdrNumber} (${formattedAmount}) for ${instName} will mature in ${daysRemaining} days on ${matDateStr}.`;
        } else if (milestone === '30_DAY') {
          instTitle = `FDR Expiring in 30 Days (${daysRemaining} Days Remaining): ${fdr.fdrNumber}`;
          instMessage = `Attention: Security Deposit FDR ${fdr.fdrNumber} (${formattedAmount}) will mature in ${daysRemaining} days on ${matDateStr}. Please prepare and initiate renewal documentation.`;
          officerTitle = `Maturity Alert (30 Days): ${fdr.fdrNumber}`;
          officerMessage = `Deposit ${fdr.fdrNumber} (${formattedAmount}) for ${instName} will mature in ${daysRemaining} days on ${matDateStr}.`;
        } else if (milestone === '60_DAY') {
          instTitle = `FDR Expiring in 60 Days: ${fdr.fdrNumber}`;
          instMessage = `Security Deposit FDR ${fdr.fdrNumber} (${formattedAmount}) will mature in ${daysRemaining} days on ${matDateStr}. Early renewal planning is advised.`;
          officerTitle = `Maturity Notice (60 Days): ${fdr.fdrNumber}`;
          officerMessage = `Deposit ${fdr.fdrNumber} (${formattedAmount}) for ${instName} matures in ${daysRemaining} days on ${matDateStr}.`;
        }

        // Step 2: Reliable Notification Delivery with Partial Delivery Tracking
        const instKey = `MATURITY:${fdr._id}:${milestone}:institution`;
        const officerKey = `MATURITY:${fdr._id}:${milestone}:officer`;
        const instReceipt = `${milestone}:institution`;
        const officerReceipt = `${milestone}:officer`;

        const existingReceipts = fdr.maturityAlertReceipts || [];
        let instDelivered = existingReceipts.includes(instReceipt);
        let officerDelivered = existingReceipts.includes(officerReceipt);

        // 1. Deliver Institution Notification
        if (!instDelivered) {
          const existingInst = await Notification.findOne({ idempotencyKey: instKey });
          if (existingInst) {
            instDelivered = true;
            await FDR.findByIdAndUpdate(fdr._id, { $addToSet: { maturityAlertReceipts: instReceipt } });
          } else {
            try {
              if (options.simulateNotificationFailure?.institution) {
                throw new Error('Simulated institution notification failure');
              }
              await Notification.create({
                institutionId: instId,
                recipientId: submitterId || null,
                recipientRole: 'institution',
                type: 'EXPIRY_WARNING',
                title: instTitle,
                message: instMessage,
                link: `/institution/fdrs/${fdr._id}`,
                isRead: false,
                idempotencyKey: instKey
              });
              instDelivered = true;
              await FDR.findByIdAndUpdate(fdr._id, { $addToSet: { maturityAlertReceipts: instReceipt } });
            } catch (err) {
              if (err.code === 11000) {
                // Handled race condition: notification was created concurrently
                instDelivered = true;
                await FDR.findByIdAndUpdate(fdr._id, { $addToSet: { maturityAlertReceipts: instReceipt } });
              } else {
                console.error(`[Maturity Scanner]: Failed to deliver institution alert for FDR ${fdr.fdrNumber}:`, err.message);
                summary.errors.push({ fdrNumber: fdr.fdrNumber, recipient: 'institution', error: err.message });
              }
            }
          }
        }

        // 2. Deliver Officer Notification
        if (!officerDelivered) {
          const existingOfficer = await Notification.findOne({ idempotencyKey: officerKey });
          if (existingOfficer) {
            officerDelivered = true;
            await FDR.findByIdAndUpdate(fdr._id, { $addToSet: { maturityAlertReceipts: officerReceipt } });
          } else {
            try {
              if (options.simulateNotificationFailure?.officer) {
                throw new Error('Simulated officer notification failure');
              }
              const reviewingOfficerId = fdr.reviewedBy?._id || fdr.reviewedBy;
              await Notification.create({
                recipientId: reviewingOfficerId || null,
                recipientRole: 'officer',
                institutionId: null,
                type: 'EXPIRY_WARNING',
                title: officerTitle,
                message: officerMessage,
                link: '/officer/dashboard',
                isRead: false,
                idempotencyKey: officerKey
              });
              officerDelivered = true;
              await FDR.findByIdAndUpdate(fdr._id, { $addToSet: { maturityAlertReceipts: officerReceipt } });
            } catch (err) {
              if (err.code === 11000) {
                // Handled race condition: notification was created concurrently
                officerDelivered = true;
                await FDR.findByIdAndUpdate(fdr._id, { $addToSet: { maturityAlertReceipts: officerReceipt } });
              } else {
                console.error(`[Maturity Scanner]: Failed to deliver officer alert for FDR ${fdr.fdrNumber}:`, err.message);
                summary.errors.push({ fdrNumber: fdr.fdrNumber, recipient: 'officer', error: err.message });
              }
            }
          }
        }

        // 3. Mark milestone as successfully sent ONLY if both recipient deliveries succeeded
        if (instDelivered && officerDelivered) {
          let milestonesToAdd = [milestone];
          if (milestone === '7_DAY') milestonesToAdd = ['60_DAY', '30_DAY', '7_DAY'];
          else if (milestone === '30_DAY') milestonesToAdd = ['60_DAY', '30_DAY'];

          await FDR.findByIdAndUpdate(fdr._id, {
            $addToSet: { maturityAlertsSent: { $each: milestonesToAdd } }
          });

          if (milestone === 'MATURED') summary.alertsSent.maturedCount++;
          else if (milestone === '7_DAY') summary.alertsSent.sevenDayCount++;
          else if (milestone === '30_DAY') summary.alertsSent.thirtyDayCount++;
          else if (milestone === '60_DAY') summary.alertsSent.sixtyDayCount++;

          // 4. Dispatch Email Alert (simulated/actual)
          if (fdr.institutionId?.contactEmail) {
            await sendNotificationEmail({
              to: fdr.institutionId.contactEmail,
              subject: `AICTE Alert: ${instTitle}`,
              textFallback: instMessage
            }).catch((err) => console.warn(`[Email Alert Failed]: ${err.message}`));
          }
        } else {
          console.warn(
            `[Maturity Scanner]: Milestone ${milestone} for FDR ${fdr.fdrNumber} was partially delivered (inst=${instDelivered}, officer=${officerDelivered}). Will retry on next scan without duplicating sent alerts.`
          );
        }
      } catch (fdrError) {
        console.error(`[Maturity Scanner Error for FDR ${fdr.fdrNumber}]:`, fdrError.message);
        summary.errors.push({ fdrNumber: fdr.fdrNumber, error: fdrError.message });
      }
    }

    console.log(
      `[Maturity Scanner Complete]: Scanned ${summary.totalProcessed} records. Alerts: 60d=${summary.alertsSent.sixtyDayCount}, 30d=${summary.alertsSent.thirtyDayCount}, 7d=${summary.alertsSent.sevenDayCount}, Matured=${summary.alertsSent.maturedCount}.`
    );
    return summary;
  } catch (error) {
    console.error('[Maturity Scanner Fatal Error]:', error.message);
    return { error: error.message };
  } finally {
    if (renewalTimer) {
      clearInterval(renewalTimer);
      renewalTimer = null;
    }
    isScanRunning = false;
    if (ownerToken) {
      await releaseDatabaseLock('maturity_scan', ownerToken);
    }
  }
};

/**
 * Initializes midnight node-cron task
 */
export const initCronJobs = () => {
  // Midnight schedule: '0 0 * * *'
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron Job Triggered]: Scheduled Midnight Maturity Scan');
    await runMaturityScanNow();
  });
  console.log('[Cron Scheduler Initialized]: Midnight validity & maturity watcher active');
};
