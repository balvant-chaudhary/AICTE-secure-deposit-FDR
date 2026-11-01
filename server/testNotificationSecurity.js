import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Notification } from './src/models/Notification.js';
import { User } from './src/models/User.js';
import { Institution } from './src/models/Institution.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - PHASE 5 STEP 1 TEST SUITE');
  console.log(' Notification API Authorization & Data Isolation Security Verification');
  console.log('================================================================================\n');

  let passedTests = 0;
  const totalTests = 10;

  // Connect to DB for direct ground-truth assertions
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
    instBAuth = await login('inst_b_security@mitm.ac.in', 'Password@123');
  } catch {
    const regRes = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aictePermanentId: `1-897612345-SEC-${Date.now().toString().slice(-4)}`,
        institutionName: 'Pune Technology & Research Institute',
        institutionType: 'Engineering & Technology',
        address: 'Shivaji Nagar',
        state: 'Maharashtra',
        city: 'Pune',
        pincode: '411005',
        contactPhone: '020-25691111',
        contactEmail: 'pune_tech@example.ac.in',
        adminName: 'Prof. Anant Kulkarni',
        adminEmail: 'inst_b_security@mitm.ac.in',
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

  if (!instAId || !instBId) {
    throw new Error(`Failed to resolve institution IDs: instAId=${instAId}, instBId=${instBId}`);
  }

  console.log(`✓ Inst A: ${instAAuth.user.email} (InstID: ${instAId})`);
  console.log(`✓ Inst B: ${instBAuth.user.email} (InstID: ${instBId})`);
  console.log(`✓ Officer: ${officerAuth.user.email} (${officerAuth.user.role})`);
  console.log(`✓ Admin: ${adminAuth.user.email} (${adminAuth.user.role})`);

  // Clean test-specific notifications
  await Notification.deleteMany({ title: { $regex: /^\[SEC_TEST\]/ } });

  // -------------------------------------------------------------------------
  // TEST 1: Unauthenticated requests return 401
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 1/10] Unauthenticated requests return HTTP 401...');
  {
    const resGet = await fetch(`${API_BASE}/notifications`);
    const resRead = await fetch(`${API_BASE}/notifications/64b1f2e8c9d0a1b2c3d4e5f6/read`, { method: 'PATCH' });
    const resReadAll = await fetch(`${API_BASE}/notifications/read-all`, { method: 'PATCH' });

    if (resGet.status === 401 && resRead.status === 401 && resReadAll.status === 401) {
      console.log('  ✓ GET /notifications without token: HTTP 401');
      console.log('  ✓ PATCH /notifications/:id/read without token: HTTP 401');
      console.log('  ✓ PATCH /notifications/read-all without token: HTTP 401');
      console.log('  ✅ TEST 1 PASSED: Unauthenticated access properly rejected.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 1 FAILED: Expected 401s, got: GET=${resGet.status}, READ=${resRead.status}, ALL=${resReadAll.status}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: Institution A cannot mark Institution B's notification as read
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 2/10] Institution A cannot mark Institution B notification as read (HTTP 403)...');
  {
    const notifB = await Notification.create({
      institutionId: instBId,
      recipientRole: 'institution',
      type: 'DISCREPANCY_ALERT',
      title: '[SEC_TEST] Inst B Private Alert',
      message: 'Private audit alert for Institution B only.',
      isRead: false
    });

    const res = await fetch(`${API_BASE}/notifications/${notifB._id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instAAuth.token}`
      }
    });

    const data = await res.json();
    const freshNotifB = await Notification.findById(notifB._id);

    if (res.status === 403 && freshNotifB.isRead === false) {
      console.log(`  ✓ Access denied returned: HTTP ${res.status} ("${data.message}")`);
      console.log(`  ✓ Database verification: isRead remained ${freshNotifB.isRead}`);
      console.log('  ✅ TEST 2 PASSED: Cross-institution notification mutation strictly blocked.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 2 FAILED: Expected 403 and isRead=false, got status=${res.status}, isRead=${freshNotifB.isRead}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Officer cannot mark institution-private notification as read
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 3/10] Officer cannot mark institution-private notification as read (HTTP 403)...');
  {
    const notifA = await Notification.create({
      institutionId: instAId,
      recipientRole: 'institution',
      type: 'EXPIRY_WARNING',
      title: '[SEC_TEST] Inst A Private Expiry Notice',
      message: 'Notice for Institution A',
      isRead: false
    });

    const res = await fetch(`${API_BASE}/notifications/${notifA._id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAuth.token}`
      }
    });

    const data = await res.json();
    const freshNotifA = await Notification.findById(notifA._id);

    if (res.status === 403 && freshNotifA.isRead === false) {
      console.log(`  ✓ Officer attempt blocked: HTTP ${res.status} ("${data.message}")`);
      console.log(`  ✓ Database verification: Inst A notification remained unread (isRead: false)`);
      console.log('  ✅ TEST 3 PASSED: Officer isolated from institution-private notifications.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 3 FAILED: Expected 403, got status=${res.status}, isRead=${freshNotifA?.isRead}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 4: Admin cannot mark institution-private notification as read
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 4/10] Admin cannot mark institution-private notification as read (HTTP 403)...');
  {
    const notifA = await Notification.create({
      institutionId: instAId,
      recipientRole: 'institution',
      type: 'EXPIRY_WARNING',
      title: '[SEC_TEST] Inst A Private Notice for Admin Test',
      message: 'Private notice for Inst A',
      isRead: false
    });

    const res = await fetch(`${API_BASE}/notifications/${notifA._id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`
      }
    });

    const data = await res.json();
    const freshNotifA = await Notification.findById(notifA._id);

    if (res.status === 403 && freshNotifA.isRead === false) {
      console.log(`  ✓ Admin attempt blocked: HTTP ${res.status} ("${data.message}")`);
      console.log(`  ✓ Database verification: Inst A notification remained unread (isRead: false)`);
      console.log('  ✅ TEST 4 PASSED: Admin cannot corrupt institution-private read status.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 4 FAILED: Expected 403, got status=${res.status}, isRead=${freshNotifA?.isRead}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 5: Authorized users can mark their own notification as read
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 5/10] Authorized users can mark their own notification as read (HTTP 200)...');
  {
    const notifA = await Notification.create({
      institutionId: instAId,
      recipientRole: 'institution',
      type: 'VERIFICATION_SUCCESS',
      title: '[SEC_TEST] Inst A Authorized Success Notification',
      message: 'Your FDR has been verified active.',
      isRead: false
    });

    const res = await fetch(`${API_BASE}/notifications/${notifA._id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instAAuth.token}`
      }
    });

    const data = await res.json();
    const freshNotifA = await Notification.findById(notifA._id);

    if (res.status === 200 && data.success && freshNotifA.isRead === true) {
      console.log(`  ✓ Inst A successfully marked own notification as read: HTTP 200`);
      console.log(`  ✓ Database verification: isRead is now true`);
      console.log('  ✅ TEST 5 PASSED: Authorized notification update confirmed.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 5 FAILED: Expected 200 with isRead=true, got status=${res.status}, isRead=${freshNotifA?.isRead}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: Institution A read-all operation does not affect Institution B
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 6/10] Institution A read-all does not affect Institution B notifications...');
  {
    const nA1 = await Notification.create({ institutionId: instAId, recipientRole: 'institution', title: '[SEC_TEST] Inst A Alert 1', message: 'Msg 1', isRead: false });
    const nA2 = await Notification.create({ institutionId: instAId, recipientRole: 'institution', title: '[SEC_TEST] Inst A Alert 2', message: 'Msg 2', isRead: false });
    const nB1 = await Notification.create({ institutionId: instBId, recipientRole: 'institution', title: '[SEC_TEST] Inst B Alert 1', message: 'Msg 1', isRead: false });
    const nB2 = await Notification.create({ institutionId: instBId, recipientRole: 'institution', title: '[SEC_TEST] Inst B Alert 2', message: 'Msg 2', isRead: false });

    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instAAuth.token}`
      }
    });

    const data = await res.json();
    const freshA1 = await Notification.findById(nA1._id);
    const freshA2 = await Notification.findById(nA2._id);
    const freshB1 = await Notification.findById(nB1._id);
    const freshB2 = await Notification.findById(nB2._id);

    if (
      res.status === 200 &&
      freshA1.isRead === true &&
      freshA2.isRead === true &&
      freshB1.isRead === false &&
      freshB2.isRead === false
    ) {
      console.log(`  ✓ Inst A read-all succeeded: HTTP 200 (Modified count: ${data.data?.modifiedCount})`);
      console.log(`  ✓ Inst A notifications updated: isRead=${freshA1.isRead}, ${freshA2.isRead}`);
      console.log(`  ✓ Inst B notifications preserved: isRead=${freshB1.isRead}, ${freshB2.isRead}`);
      console.log('  ✅ TEST 6 PASSED: Cross-institution read-all isolation confirmed.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 6 FAILED: Inst B notifications leaked or incorrectly updated!`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: Officer read-all does not modify institution-private notifications
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 7/10] Officer read-all does not modify institution-private notifications...');
  {
    const notifOfficer = await Notification.create({
      recipientRole: 'officer',
      title: '[SEC_TEST] Officer Task Notification',
      message: 'Pending verifications awaiting your action',
      isRead: false
    });

    const notifInstB = await Notification.create({
      institutionId: instBId,
      recipientRole: 'institution',
      title: '[SEC_TEST] Inst B Private Renewal Alert',
      message: 'Renewal window open',
      isRead: false
    });

    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAuth.token}`
      }
    });

    const data = await res.json();
    const freshOfficer = await Notification.findById(notifOfficer._id);
    const freshInstB = await Notification.findById(notifInstB._id);

    if (res.status === 200 && freshOfficer.isRead === true && freshInstB.isRead === false) {
      console.log(`  ✓ Officer read-all executed: HTTP 200`);
      console.log(`  ✓ Officer notification marked as read: isRead=${freshOfficer.isRead}`);
      console.log(`  ✓ Institution B notification unaffected: isRead=${freshInstB.isRead}`);
      console.log('  ✅ TEST 7 PASSED: Officer read-all does not touch institution-private notifications.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 7 FAILED: Officer read-all modified institution notification! (InstB isRead=${freshInstB?.isRead})`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 8: Admin read-all only modifies notifications authorized for admin
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 8/10] Admin read-all only modifies notifications authorized for admin...');
  {
    const notifAdmin = await Notification.create({
      recipientRole: 'admin',
      title: '[SEC_TEST] Admin Sanction Request Notice',
      message: 'Release request ready for final approval',
      isRead: false
    });

    const notifOfficer = await Notification.create({
      recipientRole: 'officer',
      title: '[SEC_TEST] Officer Private Reminder',
      message: 'Review pending',
      isRead: false
    });

    const notifInstA = await Notification.create({
      institutionId: instAId,
      recipientRole: 'institution',
      title: '[SEC_TEST] Inst A Private Alert for Admin Test',
      message: 'Inst A private notice',
      isRead: false
    });

    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`
      }
    });

    const data = await res.json();
    const freshAdmin = await Notification.findById(notifAdmin._id);
    const freshOfficer = await Notification.findById(notifOfficer._id);
    const freshInstA = await Notification.findById(notifInstA._id);

    if (
      res.status === 200 &&
      freshAdmin.isRead === true &&
      freshOfficer.isRead === false &&
      freshInstA.isRead === false
    ) {
      console.log(`  ✓ Admin read-all executed: HTTP 200`);
      console.log(`  ✓ Admin notification marked as read: isRead=${freshAdmin.isRead}`);
      console.log(`  ✓ Officer notification unaffected: isRead=${freshOfficer.isRead}`);
      console.log(`  ✓ Institution notification unaffected: isRead=${freshInstA.isRead}`);
      console.log('  ✅ TEST 8 PASSED: Admin read-all is strictly constrained to admin scope.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 8 FAILED: Admin read-all modified non-admin notifications!`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 9: GET /api/notifications data isolation
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 9/10] GET /api/notifications enforces strict persona data isolation...');
  {
    const resA = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${instAAuth.token}` }
    });
    const dataA = await resA.json();
    const listA = dataA.data?.notifications || [];

    // Verify none of the items in listA belong to Inst B
    const leakedB = listA.filter(n => n.institutionId && n.institutionId.toString() === instBId);

    const resOfficer = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${officerAuth.token}` }
    });
    const dataOfficer = await resOfficer.json();
    const listOfficer = dataOfficer.data?.notifications || [];

    // Verify none of the items in listOfficer are institution-private
    const leakedInst = listOfficer.filter(n => n.institutionId || n.recipientRole === 'institution');

    if (leakedB.length === 0 && leakedInst.length === 0) {
      console.log(`  ✓ Inst A list retrieved (${listA.length} items): 0 Inst B leaks detected`);
      console.log(`  ✓ Officer list retrieved (${listOfficer.length} items): 0 Institution-private leaks detected`);
      console.log('  ✅ TEST 9 PASSED: Query filters strictly isolate notification datasets.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 9 FAILED: Leaked notifications! LeakedB=${leakedB.length}, LeakedInst=${leakedInst.length}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 10: Non-existent notification ID returns 404
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 10/10] Non-existent notification ID returns HTTP 404...');
  {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await fetch(`${API_BASE}/notifications/${fakeId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instAAuth.token}`
      }
    });
    const data = await res.json();

    if (res.status === 404) {
      console.log(`  ✓ Non-existent notification ID rejected with HTTP 404: "${data.message}"`);
      console.log('  ✅ TEST 10 PASSED: 404 correctly handled.');
      passedTests++;
    } else {
      console.error(`  ❌ TEST 10 FAILED: Expected 404, got status=${res.status}`);
    }
  }

  // Clean test notifications
  await Notification.deleteMany({ title: { $regex: /^\[SEC_TEST\]/ } });
  await mongoose.disconnect();

  console.log('\n================================================================================');
  console.log(` PHASE 5 STEP 1 TEST RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL TEST ERROR]:', err);
  process.exit(1);
});
