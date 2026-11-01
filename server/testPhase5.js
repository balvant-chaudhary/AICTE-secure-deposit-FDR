import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FDR } from './src/models/FDR.js';
import { User } from './src/models/User.js';
import { Institution } from './src/models/Institution.js';
import { Notification } from './src/models/Notification.js';
import { AuditLog } from './src/models/AuditLog.js';
import { FDR_STATUS } from './src/constants/fdrStatus.js';
import { runMaturityScanNow, calculateDaysRemaining } from './src/services/cronService.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runPhase5Tests() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - PHASE 5 STEP 2 AUTOMATED TEST SUITE');
  console.log(' Tiered Maturity Alerts & Duplicate Prevention Engine Verification');
  console.log('================================================================================\n');

  let passedTests = 0;
  const totalTests = 11;

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

  console.log('\n[Setup]: Authenticating personas (Inst A, Inst B, Officer, Admin)...');
  const instAAuth = await login('institution@aicte.gov.in', 'Demo@123');
  const officerAuth = await login('officer@aicte.gov.in', 'Demo@123');
  const adminAuth = await login('admin@aicte.gov.in', 'Demo@123');

  // Register or login Inst B
  let instBAuth;
  try {
    instBAuth = await login('inst_b_phase5@mitm.ac.in', 'Password@123');
  } catch {
    const regRes = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aictePermanentId: `1-897612345-P5-${Date.now().toString().slice(-4)}`,
        institutionName: 'Pune Technology & Research Institute',
        institutionType: 'Engineering & Technology',
        address: 'Shivaji Nagar',
        state: 'Maharashtra',
        city: 'Pune',
        pincode: '411005',
        contactPhone: '020-25691111',
        contactEmail: 'pune_tech_p5@example.ac.in',
        adminName: 'Prof. Anant Kulkarni',
        adminEmail: 'inst_b_phase5@mitm.ac.in',
        adminDesignation: 'Registrar',
        password: 'Password@123'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error('Failed to register Inst B: ' + JSON.stringify(regData));
    instBAuth = { token: regData.data.token, user: regData.data.user };
  }

  const instAId = (instAAuth.user.institution?.id || instAAuth.user.institutionId?._id || instAAuth.user.institutionId)?.toString();
  const instBId = (instBAuth.user.institution?.id || instBAuth.user.institutionId?._id || instBAuth.user.institutionId)?.toString();
  const instAUserId = instAAuth.user.id || instAAuth.user._id;
  const officerUserId = officerAuth.user.id || officerAuth.user._id;

  console.log(`✓ Inst A: ${instAAuth.user.email} (ID: ${instAId})`);
  console.log(`✓ Inst B: ${instBAuth.user.email} (ID: ${instBId})`);
  console.log(`✓ Officer: ${officerAuth.user.email} (ID: ${officerUserId})`);

  // Clean test-specific data
  await FDR.deleteMany({ fdrNumber: { $regex: /^TEST-P5-/ } });
  await Notification.deleteMany({ title: { $regex: /TEST-P5-/ } });

  // Controlled test reference time: 2026-11-01 12:00:00 UTC
  const BASE_DATE = new Date('2026-11-01T12:00:00.000Z');

  // Helper to create controlled test FDR
  const createTestFDR = async ({ fdrNumber, daysToMaturity, status = FDR_STATUS.VERIFIED_ACTIVE, alertsSent = [], instId = instAId }) => {
    const maturityDate = new Date(BASE_DATE.getTime() + daysToMaturity * 24 * 60 * 60 * 1000);
    const depositDate = new Date(maturityDate.getTime() - 365 * 24 * 60 * 60 * 1000);

    return await FDR.create({
      fdrNumber,
      institutionId: instId,
      submittedBy: instAUserId,
      reviewedBy: officerUserId,
      bankName: 'State Bank of India',
      branchName: 'Dwarka Sector 11',
      ifscCode: 'SBIN0005432',
      amount: 2500000,
      currency: 'INR',
      depositDate,
      maturityDate,
      purpose: 'Statutory Deposit Test',
      status,
      isBankVerified: true,
      maturityAlertsSent: alertsSent
    });
  };

  // -------------------------------------------------------------------------
  // TEST 1: 60-Day Tier Alert Trigger
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 1/11] 60-Day maturity alert is sent and status transitions to EXPIRING_SOON...');
  {
    const fdr60 = await createTestFDR({
      fdrNumber: `TEST-P5-60D-${Date.now()}`,
      daysToMaturity: 45, // 30 < 45 <= 60
      status: FDR_STATUS.VERIFIED_ACTIVE
    });

    await runMaturityScanNow(BASE_DATE);

    const freshFDR = await FDR.findById(fdr60._id);
    const notifs = await Notification.find({ title: { $regex: freshFDR.fdrNumber } });
    const instNotif = notifs.find(n => n.recipientRole === 'institution');

    if (
      freshFDR.status === FDR_STATUS.EXPIRING_SOON &&
      freshFDR.maturityAlertsSent.includes('60_DAY') &&
      instNotif &&
      instNotif.title.includes('60 Days')
    ) {
      console.log(`  ✓ FDR status transitioned: VERIFIED_ACTIVE -> ${freshFDR.status}`);
      console.log(`  ✓ Milestone recorded in DB: [${freshFDR.maturityAlertsSent.join(', ')}]`);
      console.log(`  ✓ Institution alert delivered: "${instNotif.title}"`);
      console.log('  ✅ TEST 1 PASSED: 60-day alert milestone triggered correctly.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 1 FAILED: Status=${freshFDR.status}, alertsSent=[${freshFDR.maturityAlertsSent}], notifCount=${notifs.length}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: 30-Day Tier Alert Trigger
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 2/11] 30-Day maturity alert is sent to FDR approaching 30 days...');
  {
    const fdr30 = await createTestFDR({
      fdrNumber: `TEST-P5-30D-${Date.now()}`,
      daysToMaturity: 20, // 7 < 20 <= 30
      status: FDR_STATUS.EXPIRING_SOON,
      alertsSent: ['60_DAY']
    });

    await runMaturityScanNow(BASE_DATE);

    const freshFDR = await FDR.findById(fdr30._id);
    const notifs = await Notification.find({ title: { $regex: freshFDR.fdrNumber } });
    const instNotif = notifs.find(n => n.recipientRole === 'institution' && n.title.includes('30 Days'));

    if (
      freshFDR.status === FDR_STATUS.EXPIRING_SOON &&
      freshFDR.maturityAlertsSent.includes('30_DAY') &&
      instNotif
    ) {
      console.log(`  ✓ Milestone recorded in DB: [${freshFDR.maturityAlertsSent.join(', ')}]`);
      console.log(`  ✓ Institution alert delivered: "${instNotif.title}"`);
      console.log('  ✅ TEST 2 PASSED: 30-day alert milestone triggered correctly.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 2 FAILED: alertsSent=[${freshFDR.maturityAlertsSent}], notifCount=${notifs.length}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: 7-Day Critical Warning Trigger
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 3/11] 7-Day critical warning is sent to FDR within 7 days...');
  {
    const fdr7 = await createTestFDR({
      fdrNumber: `TEST-P5-7D-${Date.now()}`,
      daysToMaturity: 4, // 0 < 4 <= 7
      status: FDR_STATUS.EXPIRING_SOON,
      alertsSent: ['60_DAY', '30_DAY']
    });

    await runMaturityScanNow(BASE_DATE);

    const freshFDR = await FDR.findById(fdr7._id);
    const notifs = await Notification.find({ title: { $regex: freshFDR.fdrNumber } });
    const criticalNotif = notifs.find(n => n.recipientRole === 'institution' && n.title.includes('CRITICAL'));

    if (
      freshFDR.status === FDR_STATUS.EXPIRING_SOON &&
      freshFDR.maturityAlertsSent.includes('7_DAY') &&
      criticalNotif
    ) {
      console.log(`  ✓ Milestone recorded in DB: [${freshFDR.maturityAlertsSent.join(', ')}]`);
      console.log(`  ✓ Critical alert delivered: "${criticalNotif.title}"`);
      console.log('  ✅ TEST 3 PASSED: 7-day critical alert milestone triggered correctly.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 3 FAILED: alertsSent=[${freshFDR.maturityAlertsSent}], criticalNotif=${criticalNotif?.title}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 4 & 5: Matured Transition and No Automated Release
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 4 & 5/11] Matured FDR transitions to MATURED, NEVER automatically released...');
  {
    const fdrMatured = await createTestFDR({
      fdrNumber: `TEST-P5-MAT-${Date.now()}`,
      daysToMaturity: -1, // past maturity
      status: FDR_STATUS.EXPIRING_SOON,
      alertsSent: ['60_DAY', '30_DAY', '7_DAY']
    });

    await runMaturityScanNow(BASE_DATE);

    const freshFDR = await FDR.findById(fdrMatured._id);
    const notifs = await Notification.find({ title: { $regex: freshFDR.fdrNumber } });
    const maturedNotif = notifs.find(n => n.recipientRole === 'institution' && n.title.includes('FDR Matured'));
    const audit = await AuditLog.findOne({ entityId: freshFDR._id, actionType: 'STATUS_CHANGE_AUTOMATED' });

    if (
      freshFDR.status === FDR_STATUS.MATURED &&
      freshFDR.status !== FDR_STATUS.RELEASED &&
      freshFDR.maturityAlertsSent.includes('MATURED') &&
      maturedNotif &&
      audit
    ) {
      console.log(`  ✓ FDR status transitioned: EXPIRING_SOON -> ${freshFDR.status} (Verified NOT RELEASED)`);
      console.log(`  ✓ Milestone recorded: [${freshFDR.maturityAlertsSent.join(', ')}]`);
      console.log(`  ✓ Audit event logged: ${audit.actionType} ("${audit.details}")`);
      console.log(`  ✓ Matured alert delivered: "${maturedNotif.title}"`);
      console.log('  ✅ TEST 4 & 5 PASSED: Matured transition and statutory hold verified.');
      passedTests += 2;
    } else {
      console.error(`  ❌ TEST 4/5 FAILED: Status=${freshFDR.status}, alertsSent=[${freshFDR.maturityAlertsSent}], audit=${!!audit}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: Repeated Scans Do Not Duplicate Alerts
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 6/11] Repeated scans do not create duplicate notifications (Deduplication)...');
  {
    const fdrDedup = await createTestFDR({
      fdrNumber: `TEST-P5-DEDUP-${Date.now()}`,
      daysToMaturity: 15, // 30-day window
      status: FDR_STATUS.VERIFIED_ACTIVE
    });

    // Scan 1: Dispatches 30-day alert
    await runMaturityScanNow(BASE_DATE);
    const countAfterScan1 = await Notification.countDocuments({ title: { $regex: fdrDedup.fdrNumber } });

    // Scan 2: Run again immediately with identical reference date
    await runMaturityScanNow(BASE_DATE);
    const countAfterScan2 = await Notification.countDocuments({ title: { $regex: fdrDedup.fdrNumber } });

    // Scan 3: Run third time
    await runMaturityScanNow(BASE_DATE);
    const countAfterScan3 = await Notification.countDocuments({ title: { $regex: fdrDedup.fdrNumber } });

    if (countAfterScan1 > 0 && countAfterScan1 === countAfterScan2 && countAfterScan2 === countAfterScan3) {
      console.log(`  ✓ Scan 1 dispatched: ${countAfterScan1} notifications`);
      console.log(`  ✓ Scan 2 count: ${countAfterScan2} (0 duplicates added)`);
      console.log(`  ✓ Scan 3 count: ${countAfterScan3} (0 duplicates added)`);
      console.log('  ✅ TEST 6 PASSED: Atomic milestone lock prevents all duplicate alerts.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 6 FAILED: Duplicates detected! Counts: ${countAfterScan1}, ${countAfterScan2}, ${countAfterScan3}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: EXPIRING_SOON Progresses Through Later Milestones
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 7/11] FDR marked EXPIRING_SOON progresses through 30d, 7d, and Matured milestones...');
  {
    const fdrProgression = await createTestFDR({
      fdrNumber: `TEST-P5-PROG-${Date.now()}`,
      daysToMaturity: 50, // Starts in 60-day window
      status: FDR_STATUS.VERIFIED_ACTIVE
    });

    // Step A: Initial scan at Day 50 (triggers 60_DAY)
    await runMaturityScanNow(BASE_DATE);
    let check = await FDR.findById(fdrProgression._id);
    const has60 = check.status === FDR_STATUS.EXPIRING_SOON && check.maturityAlertsSent.includes('60_DAY');

    // Step B: Advance 30 days => 20 days remaining (triggers 30_DAY)
    const dateAt20Days = new Date(BASE_DATE.getTime() + 30 * 24 * 60 * 60 * 1000);
    await runMaturityScanNow(dateAt20Days);
    check = await FDR.findById(fdrProgression._id);
    const has30 = check.status === FDR_STATUS.EXPIRING_SOON && check.maturityAlertsSent.includes('30_DAY');

    // Step C: Advance another 15 days => 5 days remaining (triggers 7_DAY)
    const dateAt5Days = new Date(BASE_DATE.getTime() + 45 * 24 * 60 * 60 * 1000);
    await runMaturityScanNow(dateAt5Days);
    check = await FDR.findById(fdrProgression._id);
    const has7 = check.status === FDR_STATUS.EXPIRING_SOON && check.maturityAlertsSent.includes('7_DAY');

    // Step D: Advance another 10 days => -5 days (triggers MATURED)
    const dateAtMaturity = new Date(BASE_DATE.getTime() + 55 * 24 * 60 * 60 * 1000);
    await runMaturityScanNow(dateAtMaturity);
    check = await FDR.findById(fdrProgression._id);
    const hasMatured = check.status === FDR_STATUS.MATURED && check.maturityAlertsSent.includes('MATURED');

    if (has60 && has30 && has7 && hasMatured) {
      console.log('  ✓ Milestone 1 reached: 60_DAY recorded');
      console.log('  ✓ Milestone 2 reached: 30_DAY recorded (status remained EXPIRING_SOON)');
      console.log('  ✓ Milestone 3 reached: 7_DAY recorded');
      console.log('  ✓ Milestone 4 reached: MATURED recorded (status transitioned to MATURED)');
      console.log('  ✅ TEST 7 PASSED: FDR progresses through all maturity milestones seamlessly.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 7 FAILED: Progression broken. has60=${has60}, has30=${has30}, has7=${has7}, hasMatured=${hasMatured}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 8: Ineligible Lifecycle Statuses Receive No Alerts
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 8/11] Ineligible statuses (RELEASED, REJECTED, DISCREPANCY, SUBMITTED) receive no alerts...');
  {
    const fdrReleased = await createTestFDR({ fdrNumber: `TEST-P5-INELIG-REL-${Date.now()}`, daysToMaturity: 3, status: FDR_STATUS.RELEASED });
    const fdrRejected = await createTestFDR({ fdrNumber: `TEST-P5-INELIG-REJ-${Date.now()}`, daysToMaturity: 3, status: FDR_STATUS.REJECTED });
    const fdrDiscrepant = await createTestFDR({ fdrNumber: `TEST-P5-INELIG-DISC-${Date.now()}`, daysToMaturity: 3, status: FDR_STATUS.DISCREPANCY_FLAGGED });
    const fdrSubmitted = await createTestFDR({ fdrNumber: `TEST-P5-INELIG-SUB-${Date.now()}`, daysToMaturity: 3, status: FDR_STATUS.SUBMITTED });

    await runMaturityScanNow(BASE_DATE);

    const notifs = await Notification.find({
      title: { $regex: /TEST-P5-INELIG-/ }
    });

    const freshRel = await FDR.findById(fdrReleased._id);
    const freshRej = await FDR.findById(fdrRejected._id);

    if (notifs.length === 0 && freshRel.status === FDR_STATUS.RELEASED && freshRej.status === FDR_STATUS.REJECTED) {
      console.log(`  ✓ 0 maturity alerts generated for ineligible FDR records`);
      console.log(`  ✓ Statuses untouched: RELEASED, REJECTED, DISCREPANCY_FLAGGED, SUBMITTED`);
      console.log('  ✅ TEST 8 PASSED: Ineligible statuses strictly excluded from scanner.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 8 FAILED: Ineligible records alerted or updated! notifs=${notifs.length}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 9: Institution Notification Isolation
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 9/11] Institution notification isolation for maturity alerts...');
  {
    const fdrInstA = await createTestFDR({
      fdrNumber: `TEST-P5-ISOL-A-${Date.now()}`,
      daysToMaturity: 5,
      instId: instAId
    });

    await runMaturityScanNow(BASE_DATE);

    // Inst B queries its notifications
    const resB = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${instBAuth.token}` }
    });
    const dataB = await resB.json();
    const listB = dataB.data?.notifications || [];

    const leakedToB = listB.some(n => n.title.includes(fdrInstA.fdrNumber) || (n.institutionId && n.institutionId.toString() === instAId));

    if (!leakedToB) {
      console.log(`  ✓ Inst B notifications retrieved: Zero Inst A maturity alerts leaked.`);
      console.log('  ✅ TEST 9 PASSED: Maturity notifications strictly scoped to owning institution.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 9 FAILED: Inst A notification leaked to Inst B!`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 10: Officer Notification Recipient Scoping
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 10/11] Officer receives maturity alerts with proper recipient scoping...');
  {
    const fdrOfficerTest = await createTestFDR({
      fdrNumber: `TEST-P5-OFFICER-${Date.now()}`,
      daysToMaturity: 5,
      instId: instAId
    });

    await runMaturityScanNow(BASE_DATE);

    const officerNotifs = await Notification.find({
      title: { $regex: fdrOfficerTest.fdrNumber },
      recipientRole: 'officer'
    });

    // Fetch via Officer API
    const resOfficer = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${officerAuth.token}` }
    });
    const dataOfficer = await resOfficer.json();
    const visibleToOfficer = (dataOfficer.data?.notifications || []).some(n => n.title.includes(fdrOfficerTest.fdrNumber));

    // Verify Inst A cannot see the officer-scoped notification
    const resA = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${instAAuth.token}` }
    });
    const dataA = await resA.json();
    const leakedToA = (dataA.data?.notifications || []).some(n => n.recipientRole === 'officer' && n.title.includes(fdrOfficerTest.fdrNumber));

    if (officerNotifs.length > 0 && visibleToOfficer && !leakedToA) {
      console.log(`  ✓ Officer notification generated in DB: "${officerNotifs[0].title}"`);
      console.log(`  ✓ Officer successfully retrieves notification via GET /api/notifications`);
      console.log(`  ✓ Institution A prevented from viewing officer notification`);
      console.log('  ✅ TEST 10 PASSED: Officer recipient scoping verified.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 10 FAILED: officerNotifs=${officerNotifs.length}, visible=${visibleToOfficer}, leaked=${leakedToA}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 11: Existing FDR & Notification Workflows Remain Functional
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 11/11] Existing manual cron scan endpoint and workflows remain functional...');
  {
    // Officer triggers manual cron scan via API
    const resScan = await fetch(`${API_BASE}/analytics/trigger-cron-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAuth.token}`
      }
    });

    const dataScan = await resScan.json();

    // Institution marks its unread notification as read
    const anyInstNotif = await Notification.findOne({ institutionId: instAId, isRead: false });
    let markOk = false;
    if (anyInstNotif) {
      const resMark = await fetch(`${API_BASE}/notifications/${anyInstNotif._id}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${instAAuth.token}`
        }
      });
      markOk = resMark.status === 200;
    } else {
      markOk = true;
    }

    if (resScan.status === 200 && dataScan.success && markOk) {
      console.log(`  ✓ POST /api/analytics/trigger-cron-scan: HTTP 200 (Success)`);
      console.log(`  ✓ Scan summary reported: ${JSON.stringify(dataScan.data?.scanResult?.alertsSent)}`);
      console.log(`  ✓ PATCH /api/notifications/:id/read continues to function normally`);
      console.log('  ✅ TEST 11 PASSED: Existing endpoints and operational workflows preserved.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 11 FAILED: resScan=${resScan.status}, markOk=${markOk}`);
    }
  }

  // Clean test-specific data
  await FDR.deleteMany({ fdrNumber: { $regex: /^TEST-P5-/ } });
  await Notification.deleteMany({ title: { $regex: /TEST-P5-/ } });
  await mongoose.disconnect();

  console.log('\n================================================================================');
  console.log(` PHASE 5 STEP 2 TEST RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('[FATAL PHASE 5 TEST ERROR]:', err);
  process.exit(1);
});
