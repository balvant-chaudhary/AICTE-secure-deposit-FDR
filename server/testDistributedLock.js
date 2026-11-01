import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FDR } from './src/models/FDR.js';
import { FDR_STATUS } from './src/constants/fdrStatus.js';
import {
  acquireDatabaseLock,
  releaseDatabaseLock,
  renewDatabaseLock,
  isDatabaseLockHeld,
  forceReleaseDatabaseLock,
  runMaturityScanNow
} from './src/services/cronService.js';

dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDistributedLockTests() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - DISTRIBUTED LEASE LOCK AUDIT');
  console.log(' Owner Token Verification, Safe Renewal & Concurrency Protection');
  console.log('================================================================================\n');

  let passedTests = 0;
  const totalTests = 7;

  // 1. Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte-securedeposit';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB for database state validation.');

  const collection = mongoose.connection.db.collection('cron_locks');

  // Clean test locks
  await forceReleaseDatabaseLock('test_lock_owner');
  await forceReleaseDatabaseLock('test_lock_expired');
  await forceReleaseDatabaseLock('test_lock_renew');
  await forceReleaseDatabaseLock('test_lock_leaseloss');
  await forceReleaseDatabaseLock('maturity_scan');

  // -------------------------------------------------------------------------
  // TEST 1: Unique Owner Token Generated on Acquisition
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 1/7] Every lock acquisition generates a unique, distinct owner token...');
  {
    const lock1 = await acquireDatabaseLock('test_lock_owner', 5000);
    const lock2Attempt = await acquireDatabaseLock('test_lock_owner', 5000);

    const doc = await collection.findOne({ _id: 'test_lock_owner' });

    if (
      lock1?.acquired &&
      lock1?.ownerToken &&
      lock2Attempt === null &&
      doc?.ownerToken === lock1.ownerToken &&
      new Date(doc.lockedUntil).getTime() > Date.now()
    ) {
      console.log(`  ✓ Lock acquired with unique token: ${lock1.ownerToken}`);
      console.log(`  ✓ Document in cron_locks has matching token and active TTL`);
      console.log(`  ✓ Secondary acquisition properly denied while lease is active`);
      console.log('  ✅ TEST 1 PASSED: Unique owner token generated and stored.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 1 FAILED:', { lock1, lock2Attempt, doc });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: Process Attempting to Release Another Process's Lock is Rejected
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 2/7] Process attempting to release another process\'s lock is strictly rejected...');
  {
    const docBefore = await collection.findOne({ _id: 'test_lock_owner' });
    const originalToken = docBefore.ownerToken;

    // Attacker / another process attempts release with an invalid owner token
    const wrongTokenRelease = await releaseDatabaseLock('test_lock_owner', 'unauthorized-token-67890');

    // Attacker attempts release with no owner token
    const emptyTokenRelease = await releaseDatabaseLock('test_lock_owner');

    const docAfter = await collection.findOne({ _id: 'test_lock_owner' });

    if (
      wrongTokenRelease === false &&
      emptyTokenRelease === false &&
      docAfter?.ownerToken === originalToken &&
      new Date(docAfter.lockedUntil).getTime() > Date.now()
    ) {
      console.log(`  ✓ Release with invalid owner token rejected (returned false)`);
      console.log(`  ✓ Release without owner token rejected (returned false)`);
      console.log(`  ✓ Active lock remained intact with original owner token: ${originalToken.substring(0, 8)}...`);
      console.log('  ✅ TEST 2 PASSED: Foreign process cannot release another process\'s lease.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 2 FAILED:', { wrongTokenRelease, emptyTokenRelease, docAfter });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Legitimate Owner Successfully Releases Lock
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 3/7] Legitimate owner successfully releases its own lock...');
  {
    const docBefore = await collection.findOne({ _id: 'test_lock_owner' });
    const ownerToken = docBefore.ownerToken;

    const releaseResult = await releaseDatabaseLock('test_lock_owner', ownerToken);
    const docAfter = await collection.findOne({ _id: 'test_lock_owner' });

    if (
      releaseResult === true &&
      new Date(docAfter.lockedUntil).getTime() <= Date.now() &&
      docAfter.ownerToken === null
    ) {
      console.log(`  ✓ Lock released successfully with legitimate owner token`);
      console.log(`  ✓ Document state: lockedUntil reset to 0, ownerToken cleared`);
      console.log('  ✅ TEST 3 PASSED: Verified owner can cleanly release lock.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 3 FAILED:', { releaseResult, docAfter });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 4: Expired Lock Acquired by Another Process & Stale Release Prevented
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 4/7] Expired lock acquired by another process; stale process cannot release it...');
  {
    // Process A acquires lock with 200ms TTL
    const lockA = await acquireDatabaseLock('test_lock_expired', 200);
    const ownerTokenA = lockA.ownerToken;

    // Sleep 250ms so lease expires
    await sleep(250);

    // Process B attempts to acquire expired lock
    const lockB = await acquireDatabaseLock('test_lock_expired', 5000);
    const ownerTokenB = lockB?.ownerToken;

    const acquiredByB = !!lockB && ownerTokenB !== ownerTokenA;

    // Now, Process A wakes up late and tries to release the lock using its expired token
    const staleReleaseByA = await releaseDatabaseLock('test_lock_expired', ownerTokenA);

    // Verify Process B's lock is still completely intact in MongoDB
    const docAfterStaleRelease = await collection.findOne({ _id: 'test_lock_expired' });
    const lockBStillActive = docAfterStaleRelease?.ownerToken === ownerTokenB && new Date(docAfterStaleRelease.lockedUntil).getTime() > Date.now();

    // Clean up
    await releaseDatabaseLock('test_lock_expired', ownerTokenB);

    if (acquiredByB && staleReleaseByA === false && lockBStillActive) {
      console.log(`  ✓ Process B acquired expired lock: Owner A -> Owner B (${ownerTokenB.substring(0, 8)}...)`);
      console.log(`  ✓ Stale Process A attempt to release was rejected (returned false)`);
      console.log(`  ✓ Process B lock remained untouched and active`);
      console.log('  ✅ TEST 4 PASSED: Expired lease re-acquired; stale process cannot corrupt active lease.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 4 FAILED:', { acquiredByB, staleReleaseByA, lockBStillActive, docAfterStaleRelease });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 5: Scan Exceeding Original Lease Duration (Safe Lease Renewal)
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 5/7] Safe lease renewal extends lock beyond original duration...');
  {
    // Acquire lock with 300ms TTL
    const lock = await acquireDatabaseLock('test_lock_renew', 300);
    const ownerToken = lock.ownerToken;

    // At 150ms, renew lock with another 400ms TTL
    await sleep(150);
    const renewed = await renewDatabaseLock('test_lock_renew', ownerToken, 400);

    // At 350ms total elapsed (original 300ms has expired, but renewed lease has ~200ms left)
    await sleep(200);

    // Check if lock is still held by owner
    const stillHeld = await isDatabaseLockHeld('test_lock_renew', ownerToken);

    // Process B attempts to acquire: must be blocked because lease was renewed
    const processBAcquire = await acquireDatabaseLock('test_lock_renew', 1000);

    // Clean up
    await releaseDatabaseLock('test_lock_renew', ownerToken);

    if (renewed && stillHeld && processBAcquire === null) {
      console.log(`  ✓ Lease renewed successfully midway through duration`);
      console.log(`  ✓ Lock remained active at 350ms (exceeding original 300ms TTL)`);
      console.log(`  ✓ Another process was blocked from acquiring during the renewed window`);
      console.log('  ✅ TEST 5 PASSED: Lease renewal heartbeat safely protects long-running scans.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 5 FAILED:', { renewed, stillHeld, processBAcquire });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: Process That Loses Lease Halts Processing Immediately
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 6/7] Process that loses its lease halts scan processing immediately...');
  {
    // Create 2 test FDRs
    const testFDR1 = await FDR.create({
      fdrNumber: `TEST-LOCK-HALT-1-${Date.now()}`,
      institutionId: new mongoose.Types.ObjectId(),
      submittedBy: new mongoose.Types.ObjectId(),
      bankName: 'State Bank of India',
      branchName: 'Main',
      ifscCode: 'SBIN0001234',
      amount: 1000000,
      depositDate: new Date('2025-01-01'),
      maturityDate: new Date('2026-11-20'),
      purpose: 'Lock Test',
      status: FDR_STATUS.VERIFIED_ACTIVE
    });

    const testFDR2 = await FDR.create({
      fdrNumber: `TEST-LOCK-HALT-2-${Date.now()}`,
      institutionId: new mongoose.Types.ObjectId(),
      submittedBy: new mongoose.Types.ObjectId(),
      bankName: 'State Bank of India',
      branchName: 'Main',
      ifscCode: 'SBIN0001234',
      amount: 1000000,
      depositDate: new Date('2025-01-01'),
      maturityDate: new Date('2026-11-20'),
      purpose: 'Lock Test',
      status: FDR_STATUS.VERIFIED_ACTIVE
    });

    // Acquire lock with short TTL (100ms) with renewal disabled and checkLeaseBeforeItem enabled
    // We intentionally force lock expiration before candidate processing
    await forceReleaseDatabaseLock('maturity_scan');
    const lockAcquired = await acquireDatabaseLock('maturity_scan', 100);
    const stolenToken = crypto.randomUUID();

    // Sleep 150ms so lease expires, then another process claims it
    await sleep(150);
    await collection.updateOne(
      { _id: 'maturity_scan' },
      { $set: { ownerToken: stolenToken, lockedUntil: new Date(Date.now() + 5000) } }
    );

    // Run scanner with checkLeaseBeforeItem: true
    const scanResult = await runMaturityScanNow(new Date('2026-11-01'), {
      checkLeaseBeforeItem: true,
      forceRun: true,
      disableRenewal: true
    });

    const leaseLostRecorded = scanResult?.errors?.some((e) => e.error === 'LEASE_LOST_ABORTED');

    // Clean up test FDRs
    await FDR.deleteMany({ fdrNumber: { $regex: /^TEST-LOCK-HALT-/ } });
    await forceReleaseDatabaseLock('maturity_scan');

    if (leaseLostRecorded) {
      console.log(`  ✓ Scan detected lost lease lock and halted with LEASE_LOST_ABORTED`);
      console.log('  ✅ TEST 6 PASSED: Stale process immediately terminates processing upon lease loss.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 6 FAILED: Scan did not halt on lease loss:', scanResult);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: Existing Concurrent Scan Protection
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 7/7] Concurrent scan protection: Dual execution prevented by distributed lock...');
  {
    await forceReleaseDatabaseLock('maturity_scan');

    const BASE_DATE = new Date('2026-11-01T12:00:00.000Z');

    const [scan1, scan2] = await Promise.all([
      runMaturityScanNow(BASE_DATE),
      runMaturityScanNow(BASE_DATE)
    ]);

    const oneSkipped = scan1.status === 'SKIPPED' || scan2.status === 'SKIPPED';
    const oneProcessed = scan1.totalProcessed !== undefined || scan2.totalProcessed !== undefined;

    if (oneSkipped && oneProcessed) {
      console.log(`  ✓ Scan 1 result: ${scan1.status || 'PROCESSED'}`);
      console.log(`  ✓ Scan 2 result: ${scan2.status || 'PROCESSED'}`);
      console.log('  ✅ TEST 7 PASSED: Concurrent scan lock prevents race conditions.');
      passedTests++;
    } else {
      console.error('  ❌ TEST 7 FAILED:', { scan1, scan2 });
    }
  }

  // Clean all test locks
  await forceReleaseDatabaseLock('test_lock_owner');
  await forceReleaseDatabaseLock('test_lock_expired');
  await forceReleaseDatabaseLock('test_lock_renew');
  await forceReleaseDatabaseLock('test_lock_leaseloss');
  await forceReleaseDatabaseLock('maturity_scan');

  console.log('\n================================================================================');
  console.log(` DISTRIBUTED LEASE LOCK AUDIT RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================================\n');

  await mongoose.disconnect();
  process.exit(totalTests === passedTests ? 0 : 1);
}

runDistributedLockTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
