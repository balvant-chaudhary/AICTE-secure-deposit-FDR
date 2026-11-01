import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FDR } from './src/models/FDR.js';
import { User } from './src/models/User.js';
import { Institution } from './src/models/Institution.js';
import { Notification } from './src/models/Notification.js';
import { FDR_STATUS } from './src/constants/fdrStatus.js';
import { runMaturityScanNow, acquireDatabaseLock, releaseDatabaseLock } from './src/services/cronService.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runReliabilityTests() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - NOTIFICATION DELIVERY RELIABILITY AUDIT');
  console.log(' Fault-Tolerant Delivery, Partial Failure Recovery & Idempotency Verification');
  console.log('================================================================================\n');

  let passedTests = 0;
  const totalTests = 7;

  // 1. Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte-securedeposit';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB for database state validation.');

  // Helper for API login
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.data?.token) {
      throw new Error(`Login failed for ${email}: ${data.message}`);
    }
    return { token: data.data.token, user: data.data.user };
  };

  const instAuth = await login('institution@aicte.gov.in', 'Demo@123');
  const officerAuth = await login('officer@aicte.gov.in', 'Demo@123');

  const instId = (instAuth.user.institution?.id || instAuth.user.institutionId?._id || instAuth.user.institutionId)?.toString();
  const instUserId = instAuth.user.id || instAuth.user._id;
  const officerUserId = officerAuth.user.id || officerAuth.user._id;

  console.log(`✓ Inst User ID: ${instUserId} (Inst: ${instId})`);
  console.log(`✓ Officer User ID: ${officerUserId}`);

  // Clean test-specific data
  await FDR.deleteMany({ fdrNumber: { $regex: /^TEST-REL-/ } });
  await Notification.deleteMany({ title: { $regex: /TEST-REL-/ } });
  await releaseDatabaseLock('maturity_scan', null, { force: true });

  const BASE_DATE = new Date('2026-11-01T12:00:00.000Z');

  const createReliabilityFDR = async ({ fdrNumber, daysToMaturity, status = FDR_STATUS.VERIFIED_ACTIVE, alertsSent = [], receipts = [] }) => {
    const maturityDate = new Date(BASE_DATE.getTime() + daysToMaturity * 24 * 60 * 60 * 1000);
    const depositDate = new Date(maturityDate.getTime() - 365 * 24 * 60 * 60 * 1000);

    return await FDR.create({
      fdrNumber,
      institutionId: instId,
      submittedBy: instUserId,
      reviewedBy: officerUserId,
      bankName: 'Canara Bank',
      branchName: 'Connaught Place',
      ifscCode: 'CNRB0001234',
      amount: 5000000,
      currency: 'INR',
      depositDate,
      maturityDate,
      purpose: 'Statutory Reliability Test',
      status,
      isBankVerified: true,
      maturityAlertsSent: alertsSent,
      maturityAlertReceipts: receipts
    });
  };

  // -------------------------------------------------------------------------
  // TEST 1: Notification Creation Failure does NOT suppress alert milestone
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 1/7] Notification creation failure: milestone is NOT prematurely marked in maturityAlertsSent...');
  {
    const fdr = await createReliabilityFDR({
      fdrNumber: `TEST-REL-FAIL-${Date.now()}`,
      daysToMaturity: 45, // 60_DAY milestone
      status: FDR_STATUS.VERIFIED_ACTIVE
    });

    // Run scanner with simulated failure on both recipients
    await runMaturityScanNow(BASE_DATE, {
      simulateNotificationFailure: { institution: true, officer: true },
      forceRun: true
    });

    const fdrAfterFail = await FDR.findById(fdr._id);
    const notifsAfterFail = await Notification.find({ title: { $regex: fdr.fdrNumber } });

    const notMarked = !fdrAfterFail.maturityAlertsSent.includes('60_DAY');
    const zeroNotifs = notifsAfterFail.length === 0;

    if (notMarked && zeroNotifs) {
      console.log(`  ✓ Scan failure handled safely: maturityAlertsSent=[${fdrAfterFail.maturityAlertsSent}]`);
      console.log(`  ✓ Zero incomplete notifications persisted in DB (count=${notifsAfterFail.length})`);

      // Now run scanner normally (retry)
      await runMaturityScanNow(BASE_DATE, { forceRun: true });

      const fdrAfterRetry = await FDR.findById(fdr._id);
      const notifsAfterRetry = await Notification.find({ title: { $regex: fdr.fdrNumber } });

      if (
        fdrAfterRetry.maturityAlertsSent.includes('60_DAY') &&
        notifsAfterRetry.length === 2 &&
        fdrAfterRetry.status === FDR_STATUS.EXPIRING_SOON
      ) {
        console.log(`  ✓ Retry successful: both notifications delivered (count=${notifsAfterRetry.length})`);
        console.log(`  ✓ Milestone now recorded in DB: [${fdrAfterRetry.maturityAlertsSent.join(', ')}]`);
        console.log('  ✅ TEST 1 PASSED: Notification failure did not permanently suppress alert; retry succeeded.');
        passedTests++;
      } else {
        console.error(`  ❌ TEST 1 FAILED on retry: alertsSent=[${fdrAfterRetry.maturityAlertsSent}], notifs=${notifsAfterRetry.length}`);
      }
    } else {
      console.error(`  ❌ TEST 1 FAILED: notMarked=${notMarked}, zeroNotifs=${zeroNotifs}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: Partial Delivery Failure (Institution OK, Officer Fails) & Retry
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 2/7] Partial delivery (Institution succeeds, Officer fails): Retry does not duplicate institution alert...');
  {
    const fdr = await createReliabilityFDR({
      fdrNumber: `TEST-REL-PART-INST-${Date.now()}`,
      daysToMaturity: 20, // 30_DAY milestone
      status: FDR_STATUS.EXPIRING_SOON,
      alertsSent: ['60_DAY']
    });

    // Run scanner with simulated failure on officer notification only
    await runMaturityScanNow(BASE_DATE, {
      simulateNotificationFailure: { officer: true },
      forceRun: true
    });

    const fdrAfterFail = await FDR.findById(fdr._id);
    const notifsAfterFail = await Notification.find({ title: { $regex: fdr.fdrNumber } });
    const instNotif = notifsAfterFail.find(n => n.recipientRole === 'institution');
    const officerNotif = notifsAfterFail.find(n => n.recipientRole === 'officer');

    const instDelivered = !!instNotif;
    const officerMissing = !officerNotif;
    const milestoneNotSent = !fdrAfterFail.maturityAlertsSent.includes('30_DAY');
    const receiptRecorded = fdrAfterFail.maturityAlertReceipts.includes('30_DAY:institution');

    if (instDelivered && officerMissing && milestoneNotSent && receiptRecorded) {
      console.log(`  ✓ Partial delivery state: instNotif=true, officerNotif=false`);
      console.log(`  ✓ maturityAlertsSent=[${fdrAfterFail.maturityAlertsSent}] (milestone NOT marked as fully sent)`);
      console.log(`  ✓ maturityAlertReceipts=[${fdrAfterFail.maturityAlertReceipts}] (granular receipt recorded)`);

      // Now retry normal scan
      await runMaturityScanNow(BASE_DATE, { forceRun: true });

      const fdrAfterRetry = await FDR.findById(fdr._id);
      const notifsAfterRetry = await Notification.find({ title: { $regex: fdr.fdrNumber } });
      const instNotifsRetry = notifsAfterRetry.filter(n => n.recipientRole === 'institution');
      const officerNotifsRetry = notifsAfterRetry.filter(n => n.recipientRole === 'officer');

      if (
        instNotifsRetry.length === 1 &&
        officerNotifsRetry.length === 1 &&
        notifsAfterRetry.length === 2 &&
        fdrAfterRetry.maturityAlertsSent.includes('30_DAY')
      ) {
        console.log(`  ✓ Retry outcome: Institution notifications = ${instNotifsRetry.length} (ZERO duplicates)`);
        console.log(`  ✓ Retry outcome: Officer notifications = ${officerNotifsRetry.length} (Delivered successfully)`);
        console.log(`  ✓ maturityAlertsSent now marked: [${fdrAfterRetry.maturityAlertsSent.join(', ')}]`);
        console.log('  ✅ TEST 2 PASSED: Partial institution delivery recovered with zero duplication.');
        passedTests++;
      } else {
        console.error(`  ❌ TEST 2 FAILED on retry: instCount=${instNotifsRetry.length}, offCount=${officerNotifsRetry.length}`);
      }
    } else {
      console.error(`  ❌ TEST 2 FAILED initial state: instDelivered=${instDelivered}, officerMissing=${officerMissing}, milestoneNotSent=${milestoneNotSent}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Partial Delivery Failure (Officer OK, Institution Fails) & Retry
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 3/7] Partial delivery (Officer succeeds, Institution fails): Retry does not duplicate officer alert...');
  {
    const fdr = await createReliabilityFDR({
      fdrNumber: `TEST-REL-PART-OFF-${Date.now()}`,
      daysToMaturity: 5, // 7_DAY milestone
      status: FDR_STATUS.EXPIRING_SOON,
      alertsSent: ['60_DAY', '30_DAY']
    });

    // Run scanner with simulated failure on institution notification only
    await runMaturityScanNow(BASE_DATE, {
      simulateNotificationFailure: { institution: true },
      forceRun: true
    });

    const fdrAfterFail = await FDR.findById(fdr._id);
    const notifsAfterFail = await Notification.find({ title: { $regex: fdr.fdrNumber } });
    const instNotif = notifsAfterFail.find(n => n.recipientRole === 'institution');
    const officerNotif = notifsAfterFail.find(n => n.recipientRole === 'officer');

    const officerDelivered = !!officerNotif;
    const instMissing = !instNotif;
    const milestoneNotSent = !fdrAfterFail.maturityAlertsSent.includes('7_DAY');

    if (officerDelivered && instMissing && milestoneNotSent) {
      console.log(`  ✓ Partial delivery state: officerNotif=true, instNotif=false`);
      console.log(`  ✓ maturityAlertsSent=[${fdrAfterFail.maturityAlertsSent}]`);

      // Now retry normal scan
      await runMaturityScanNow(BASE_DATE, { forceRun: true });

      const fdrAfterRetry = await FDR.findById(fdr._id);
      const notifsAfterRetry = await Notification.find({ title: { $regex: fdr.fdrNumber } });
      const instNotifsRetry = notifsAfterRetry.filter(n => n.recipientRole === 'institution');
      const officerNotifsRetry = notifsAfterRetry.filter(n => n.recipientRole === 'officer');

      if (
        instNotifsRetry.length === 1 &&
        officerNotifsRetry.length === 1 &&
        notifsAfterRetry.length === 2 &&
        fdrAfterRetry.maturityAlertsSent.includes('7_DAY')
      ) {
        console.log(`  ✓ Retry outcome: Officer notifications = ${officerNotifsRetry.length} (ZERO duplicates)`);
        console.log(`  ✓ Retry outcome: Institution notifications = ${instNotifsRetry.length} (Delivered successfully)`);
        console.log(`  ✓ maturityAlertsSent now marked: [${fdrAfterRetry.maturityAlertsSent.join(', ')}]`);
        console.log('  ✅ TEST 3 PASSED: Partial officer delivery recovered with zero duplication.');
        passedTests++;
      } else {
        console.error(`  ❌ TEST 3 FAILED on retry: instCount=${instNotifsRetry.length}, offCount=${officerNotifsRetry.length}`);
      }
    } else {
      console.error(`  ❌ TEST 3 FAILED initial state: officerDelivered=${officerDelivered}, instMissing=${instMissing}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 4: Matured Transition with Delivery Failure and Safe Retry
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 4/7] Matured FDR with notification failure: transitions to MATURED, NOT released, retries cleanly...');
  {
    const fdr = await createReliabilityFDR({
      fdrNumber: `TEST-REL-MAT-FAIL-${Date.now()}`,
      daysToMaturity: -1, // MATURED milestone
      status: FDR_STATUS.EXPIRING_SOON,
      alertsSent: ['60_DAY', '30_DAY', '7_DAY']
    });

    // Run scanner with simulated failure on institution notification
    await runMaturityScanNow(BASE_DATE, {
      simulateNotificationFailure: { institution: true },
      forceRun: true
    });

    const fdrAfterFail = await FDR.findById(fdr._id);
    const statusUpdated = fdrAfterFail.status === FDR_STATUS.MATURED;
    const notReleased = fdrAfterFail.status !== FDR_STATUS.RELEASED;
    const milestoneNotSent = !fdrAfterFail.maturityAlertsSent.includes('MATURED');

    if (statusUpdated && notReleased && milestoneNotSent) {
      console.log(`  ✓ Status transitioned: EXPIRING_SOON -> MATURED (Verified NOT RELEASED)`);
      console.log(`  ✓ MATURED milestone withheld from maturityAlertsSent due to notification failure`);

      // Retry normal scan
      await runMaturityScanNow(BASE_DATE, { forceRun: true });

      const fdrAfterRetry = await FDR.findById(fdr._id);
      const notifsAfterRetry = await Notification.find({ title: { $regex: fdr.fdrNumber } });

      if (
        fdrAfterRetry.status === FDR_STATUS.MATURED &&
        fdrAfterRetry.maturityAlertsSent.includes('MATURED') &&
        notifsAfterRetry.length === 2
      ) {
        console.log(`  ✓ Retry delivered remaining notification: total=${notifsAfterRetry.length}`);
        console.log(`  ✓ Status remained MATURED (statutory hold intact)`);
        console.log('  ✅ TEST 4 PASSED: Matured transition and fault-tolerant retry verified.');
        passedTests++;
      } else {
        console.error(`  ❌ TEST 4 FAILED on retry: status=${fdrAfterRetry.status}, alertsSent=[${fdrAfterRetry.maturityAlertsSent}]`);
      }
    } else {
      console.error(`  ❌ TEST 4 FAILED: statusUpdated=${statusUpdated}, notReleased=${notReleased}, milestoneNotSent=${milestoneNotSent}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 5: Repeated Scans After Successful Delivery (Zero Duplication)
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 5/7] Repeated scans after successful delivery produce zero duplicate notifications...');
  {
    const countBefore = await Notification.countDocuments({ title: { $regex: /^TEST-REL-/ } });

    // Run 3 consecutive scans
    await runMaturityScanNow(BASE_DATE, { forceRun: true });
    await runMaturityScanNow(BASE_DATE, { forceRun: true });
    await runMaturityScanNow(BASE_DATE, { forceRun: true });

    const countAfter = await Notification.countDocuments({ title: { $regex: /^TEST-REL-/ } });

    if (countBefore === countAfter) {
      console.log(`  ✓ Notification count before 3 scans: ${countBefore}`);
      console.log(`  ✓ Notification count after 3 scans: ${countAfter} (Difference: 0)`);
      console.log('  ✅ TEST 5 PASSED: Absolute idempotency verified across repeated scans.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 5 FAILED: Count changed from ${countBefore} to ${countAfter}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: Database-backed Idempotency on Unique Keys
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 6/7] Database-backed idempotency: MongoDB rejects duplicate idempotencyKey at engine level...');
  {
    const uniqueKey = `MATURITY:test-engine-idempotency-${Date.now()}:institution`;

    // First insert succeeds
    await Notification.create({
      recipientRole: 'institution',
      title: 'Idempotency Engine Test 1',
      message: 'Initial unique insert',
      idempotencyKey: uniqueKey
    });

    let duplicateRejected = false;
    try {
      // Second insert with duplicate key must fail
      await Notification.create({
        recipientRole: 'institution',
        title: 'Idempotency Engine Test 2',
        message: 'Duplicate key attempt',
        idempotencyKey: uniqueKey
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateRejected = true;
      }
    }

    if (duplicateRejected) {
      console.log(`  ✓ Duplicate insertion rejected with MongoDB code 11000 (E11000 duplicate key error)`);
      console.log('  ✅ TEST 6 PASSED: Database-backed unique constraint guarantees zero duplicate notifications.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 6 FAILED: MongoDB did not reject duplicate idempotencyKey');
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: Concurrent Scan Protection via Database & Memory Locks
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 7/7] Concurrent scan attempts: Lock blocks overlapping executions...');
  {
    // Launch two scans concurrently without forceRun
    const [scan1, scan2] = await Promise.all([
      runMaturityScanNow(BASE_DATE),
      runMaturityScanNow(BASE_DATE)
    ]);

    const oneSkipped = scan1.status === 'SKIPPED' || scan2.status === 'SKIPPED';
    const oneProcessed = scan1.totalProcessed !== undefined || scan2.totalProcessed !== undefined;

    if (oneSkipped && oneProcessed) {
      console.log(`  ✓ Scan 1 result: ${scan1.status || 'PROCESSED'}`);
      console.log(`  ✓ Scan 2 result: ${scan2.status || 'PROCESSED'}`);
      console.log(`  ✓ Exactly one scan processed while the overlapping scan was safely SKIPPED`);
      console.log('  ✅ TEST 7 PASSED: Concurrent scan lock prevents race conditions.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 7 FAILED: scan1=${JSON.stringify(scan1)}, scan2=${JSON.stringify(scan2)}`);
    }
  }

  // Clean test-specific data
  await FDR.deleteMany({ fdrNumber: { $regex: /^TEST-REL-/ } });
  await Notification.deleteMany({ title: { $regex: /TEST-REL-/ } });
  await Notification.deleteMany({ title: { $regex: /Idempotency Engine Test/ } });
  await releaseDatabaseLock('maturity_scan', null, { force: true });

  console.log('\n================================================================================');
  console.log(` NOTIFICATION RELIABILITY TEST RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================================\n');

  await mongoose.disconnect();
  process.exit(totalTests === passedTests ? 0 : 1);
}

runReliabilityTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
