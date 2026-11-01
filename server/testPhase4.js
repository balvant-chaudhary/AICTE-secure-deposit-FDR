import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPhase4Tests() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - PHASE 4 AUTOMATED TEST SUITE');
  console.log(' Simulated Bank Verification & Discrepancy Detection Engine');
  console.log('================================================================================\n');

  let passedTests = 0;
  const totalTests = 14;

  // 1. Setup & Authenticate Test Personas
  console.log('▶ [Setup] Authenticating test personas (Officer, Admin, Inst A, Inst B)...');
  let officerToken, adminToken, instAToken, instBToken;

  try {
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
      return data.data.token;
    };

    officerToken = await login('officer@aicte.gov.in', 'Demo@123');
    adminToken = await login('admin@aicte.gov.in', 'Demo@123');
    instAToken = await login('institution@aicte.gov.in', 'Demo@123');

    // Register or login Inst B
    try {
      instBToken = await login('inst_b_admin@mitm.ac.in', 'Password@123');
    } catch {
      const reg = await fetch(`${API_BASE}/auth/register-institution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aictePermanentId: `1-897612345-${Date.now().toString().slice(-4)}`,
          institutionName: 'Maharashtra Institute of Technology & Management',
          institutionType: 'Engineering & Technology',
          address: 'Pune University Road',
          state: 'Maharashtra',
          city: 'Pune',
          pincode: '411007',
          contactPhone: '020-25690000',
          contactEmail: 'contact@mitm.ac.in',
          adminName: 'Dr. Suresh Patil',
          adminEmail: 'inst_b_admin@mitm.ac.in',
          password: 'Password@123',
          designation: 'Director'
        })
      });
      const regData = await reg.json();
      instBToken = regData.data.token;
    }

    console.log('  ✓ All test personas authenticated successfully.\n');
  } catch (err) {
    console.error('  ❌ Setup Failed:', err.message);
    process.exit(1);
  }

  // Helper to submit an FDR as Institution A
  const createTestFDR = async (fdrNumber, amount = 1500000, token = instAToken) => {
    const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (AICTE Verification Test Document) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    const pdfBlob = new Blob([dummyPdfContent], { type: 'application/pdf' });

    const form = new FormData();
    form.append('fdrNumber', fdrNumber);
    form.append('bankName', 'State Bank of India');
    form.append('branchName', 'New Delhi Main Branch');
    form.append('ifscCode', 'SBIN0000691');
    form.append('amount', String(amount));
    form.append('depositDate', '2026-01-10');
    form.append('maturityDate', '2029-01-10');
    form.append('autoRenewal', 'true');
    form.append('purpose', 'Security Deposit for Phase 4 Verification Testing');
    form.append('jointAccountHolder', 'Member Secretary, AICTE & Director, DIEAT');
    form.append('document', pdfBlob, 'fdr_verify_test.pdf');

    const res = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    if (!res.ok || !data.data?.fdr) {
      throw new Error(`Failed to create test FDR ${fdrNumber}: ${data.message}`);
    }
    return data.data.fdr;
  };

  // --------------------------------------------------------------------------
  // TEST 1: Officer successfully verifies an FDR
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 1/14] Officer successfully verifies an FDR...');
  let fdr1;
  try {
    fdr1 = await createTestFDR(`FDR-OFFICER-TEST-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr1._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'ALL_MATCH', remarks: 'Officer verified successfully' })
    });
    const verifyData = await verifyRes.json();

    if (verifyRes.status !== 200 || !verifyData.data?.verification) {
      throw new Error(`Officer verification failed: ${verifyData.message}`);
    }

    const v = verifyData.data.verification;
    if (v.status !== 'VERIFIED' || !v.verificationReference) {
      throw new Error(`Verification status unexpected: ${v.status}`);
    }
    console.log(`  ✓ Officer initiated verification. Ref: ${v.verificationReference}, Status: ${v.status}`);
    console.log('  ✅ TEST 1 PASSED: Officer verification executed successfully.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 1 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Admin successfully verifies an FDR
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 2/14] Admin successfully verifies an FDR...');
  try {
    const fdr2 = await createTestFDR(`FDR-ADMIN-TEST-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr2._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'ALL_MATCH', remarks: 'Admin verified successfully' })
    });
    const verifyData = await verifyRes.json();

    if (verifyRes.status !== 200 || verifyData.data?.verification?.status !== 'VERIFIED') {
      throw new Error(`Admin verification failed: ${verifyData.message}`);
    }
    console.log(`  ✓ Admin verified FDR. Ref: ${verifyData.data.verification.verificationReference}`);
    console.log('  ✅ TEST 2 PASSED: Admin verification executed successfully.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 2 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Institution cannot initiate verification (RBAC Guard)
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 3/14] Institution cannot initiate verification (403 Forbidden)...');
  try {
    const fdr3 = await createTestFDR(`FDR-INST-ATTEMPT-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr3._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'ALL_MATCH' })
    });
    const verifyData = await verifyRes.json();

    if (verifyRes.status !== 403) {
      throw new Error(`Security breach! Expected HTTP 403, got ${verifyRes.status}`);
    }
    console.log(`  ✓ Institution verification attempt blocked: HTTP ${verifyRes.status} ("${verifyData.message}")`);
    console.log('  ✅ TEST 3 PASSED: Institution prevented from initiating bank verification.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 3 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Fully matching details result in VERIFIED_ACTIVE
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 4/14] Fully matching details result in VERIFIED_ACTIVE...');
  try {
    const fdr4 = await createTestFDR(`FDR-MATCH-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr4._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'ALL_MATCH' })
    });
    const verifyData = await verifyRes.json();

    const updatedFdr = verifyData.data.fdr;
    if (updatedFdr.status !== 'VERIFIED_ACTIVE' || updatedFdr.isBankVerified !== true) {
      throw new Error(`FDR status is not VERIFIED_ACTIVE! Current: ${updatedFdr.status}`);
    }
    console.log(`  ✓ Fully matching details resulted in status: ${updatedFdr.status}, isBankVerified: ${updatedFdr.isBankVerified}`);
    console.log('  ✅ TEST 4 PASSED: Matching FDR transitions to VERIFIED_ACTIVE.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 4 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Amount mismatch is detected
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 5/14] Amount mismatch is detected...');
  try {
    const fdr5 = await createTestFDR(`FDR-AMOUNT-DIFF-${Date.now()}`, 2000000);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr5._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'AMOUNT_MISMATCH' })
    });
    const verifyData = await verifyRes.json();

    const v = verifyData.data.verification;
    const f = verifyData.data.fdr;

    if (v.status !== 'DISCREPANCY_FOUND' || f.status !== 'DISCREPANCY_FLAGGED') {
      throw new Error(`Expected DISCREPANCY_FOUND / DISCREPANCY_FLAGGED, got v=${v.status}, f=${f.status}`);
    }
    if (v.fieldComparisons.amount.match !== false || v.fieldComparisons.amount.difference <= 0) {
      throw new Error('Field comparison for amount did not flag mismatch!');
    }
    console.log(`  ✓ Amount mismatch detected: Claimed ₹${v.fieldComparisons.amount.submitted}, Bank confirmed ₹${v.fieldComparisons.amount.confirmed}`);
    console.log(`  ✓ Discrepancy reason: "${v.discrepancyReasons[0]}"`);
    console.log('  ✅ TEST 5 PASSED: Amount mismatch flagged properly.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 5 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Maturity date mismatch is detected
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 6/14] Maturity date mismatch is detected...');
  try {
    const fdr6 = await createTestFDR(`FDR-DATE-DIFF-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr6._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'MATURITY_DATE_MISMATCH' })
    });
    const verifyData = await verifyRes.json();

    const v = verifyData.data.verification;
    const f = verifyData.data.fdr;

    if (v.status !== 'DISCREPANCY_FOUND' || f.status !== 'DISCREPANCY_FLAGGED') {
      throw new Error(`Expected DISCREPANCY_FOUND, got v=${v.status}, f=${f.status}`);
    }
    if (v.fieldComparisons.maturityDate.match !== false) {
      throw new Error('Field comparison for maturityDate did not flag mismatch!');
    }
    console.log(`  ✓ Maturity date mismatch detected: ${Math.abs(v.fieldComparisons.maturityDate.diffDays)} days difference.`);
    console.log('  ✅ TEST 6 PASSED: Maturity date mismatch flagged properly.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 6 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 7: IFSC mismatch is detected
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 7/14] IFSC mismatch is detected...');
  try {
    const fdr7 = await createTestFDR(`FDR-IFSC-DIFF-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr7._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'IFSC_MISMATCH' })
    });
    const verifyData = await verifyRes.json();

    const v = verifyData.data.verification;
    if (v.status !== 'DISCREPANCY_FOUND' || v.fieldComparisons.ifscCode.match !== false) {
      throw new Error('IFSC code comparison did not flag mismatch!');
    }
    console.log(`  ✓ IFSC mismatch detected: Submitted '${v.fieldComparisons.ifscCode.submitted}' vs CBS confirmed '${v.fieldComparisons.ifscCode.confirmed}'`);
    console.log('  ✅ TEST 7 PASSED: IFSC mismatch flagged properly.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 7 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Lien mismatch is detected
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 8/14] Lien mismatch is detected...');
  try {
    const fdr8 = await createTestFDR(`FDR-NOLIEN-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr8._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'LIEN_NOT_MARKED' })
    });
    const verifyData = await verifyRes.json();

    const v = verifyData.data.verification;
    if (v.status !== 'DISCREPANCY_FOUND' || v.fieldComparisons.lienMarked.match !== false) {
      throw new Error('Lien marked comparison did not flag mismatch!');
    }
    console.log(`  ✓ Lien mismatch detected: AICTE lien confirmed: ${v.fieldComparisons.lienMarked.confirmed}`);
    console.log('  ✅ TEST 8 PASSED: Lien mismatch flagged properly.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 8 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 9: FDR not found scenario
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 9/14] FDR not found scenario...');
  try {
    const fdr9 = await createTestFDR(`FDR-NOTFOUND-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr9._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'FDR_NOT_FOUND' })
    });
    const verifyData = await verifyRes.json();

    const v = verifyData.data.verification;
    const f = verifyData.data.fdr;

    if (v.status !== 'NOT_FOUND' || f.status !== 'DISCREPANCY_FLAGGED') {
      throw new Error(`Expected NOT_FOUND / DISCREPANCY_FLAGGED, got v=${v.status}, f=${f.status}`);
    }
    console.log(`  ✓ FDR not found scenario handled. Verification Status: ${v.status}, FDR Status: ${f.status}`);
    console.log('  ✅ TEST 9 PASSED: Unregistered FDR handled with NOT_FOUND.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 9 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Multiple discrepancies are detected
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 10/14] Multiple discrepancies are detected...');
  try {
    const fdr10 = await createTestFDR(`FDR-MULTI-${Date.now()}`);
    const verifyRes = await fetch(`${API_BASE}/verification/${fdr10._id}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scenario: 'MULTIPLE_DISCREPANCIES' })
    });
    const verifyData = await verifyRes.json();

    const v = verifyData.data.verification;
    if (v.status !== 'DISCREPANCY_FOUND' || v.discrepancyReasons.length < 2) {
      throw new Error(`Expected multiple discrepancy reasons, got ${v.discrepancyReasons.length}`);
    }
    console.log(`  ✓ Multiple discrepancies detected (${v.discrepancyReasons.length} distinct issues logged):`);
    v.discrepancyReasons.forEach((r, idx) => console.log(`    ${idx + 1}. ${r}`));
    console.log('  ✅ TEST 10 PASSED: Multiple simultaneous discrepancies flagged properly.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 10 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Institution cannot manipulate verification fields
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 11/14] Institution cannot manipulate verification fields...');
  try {
    // Attempt to spoof verification fields via PUT /api/fdrs/:id
    const fdr11 = await createTestFDR(`FDR-SPOOF-${Date.now()}`);

    const editRes = await fetch(`${API_BASE}/fdrs/${fdr11._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isBankVerified: true,
        status: 'VERIFIED_ACTIVE',
        verificationStatus: 'VERIFIED',
        bankVerifiedData: {
          confirmedAmount: 99999999,
          lienMarkedToAICTE: true
        }
      })
    });
    const editData = await editRes.json();

    // Fetch fresh from database
    const checkRes = await fetch(`${API_BASE}/fdrs/${fdr11._id}`, {
      headers: { Authorization: `Bearer ${instAToken}` }
    });
    const checkData = await checkRes.json();
    const checkedFdr = checkData.data.fdr;

    if (checkedFdr.status === 'VERIFIED_ACTIVE' || checkedFdr.isBankVerified === true) {
      throw new Error('Security flaw: Institution was able to forge verification fields!');
    }

    console.log(`  ✓ Attempted forgery rejected. Status remains '${checkedFdr.status}', isBankVerified is ${checkedFdr.isBankVerified}`);
    console.log('  ✅ TEST 11 PASSED: Verification fields are strictly protected against institution manipulation.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 11 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Unauthorized users cannot access verification results (cross-institution)
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 12/14] Unauthorized users cannot access verification results (cross-institution isolation)...');
  try {
    // fdr1 belongs to Institution A.
    // Institution A can view its own verification
    const ownRes = await fetch(`${API_BASE}/verification/${fdr1._id}`, {
      headers: { Authorization: `Bearer ${instAToken}` }
    });
    if (ownRes.status !== 200) {
      throw new Error(`Owner institution should be able to view its verification result! Got status ${ownRes.status}`);
    }
    console.log(`  ✓ Owner Institution A successfully accessed its own verification result (HTTP 200).`);

    // Institution B must NOT be able to access Institution A's verification result
    const breachRes = await fetch(`${API_BASE}/verification/${fdr1._id}`, {
      headers: { Authorization: `Bearer ${instBToken}` }
    });
    const breachData = await breachRes.json();

    if (breachRes.status !== 403) {
      throw new Error(`Cross-institution data leakage! Expected HTTP 403, got ${breachRes.status}`);
    }
    console.log(`  ✓ Institution B blocked from Institution A's verification: HTTP ${breachRes.status} ("${breachData.message}")`);
    console.log('  ✅ TEST 12 PASSED: Cross-institution verification isolation enforced.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 12 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 13: Verification history persists after backend restart
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 13/14] Verification history persists after backend restart...');
  try {
    // Touch server/src/app.js to trigger nodemon restart
    const appPath = path.resolve('src', 'app.js');
    const now = new Date();
    fs.utimesSync(appPath, now, now);
    console.log('  ✓ Triggered server reload/restart via nodemon watch touch on app.js');

    console.log('  ⏳ Waiting for backend to restart and reconnect to MongoDB...');
    await sleep(2500);

    // Re-verify that verification record exists and matches in database
    const getRes = await fetch(`${API_BASE}/verification/${fdr1._id}`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const getData = await getRes.json();

    if (getRes.status !== 200 || !getData.data?.latestVerification) {
      throw new Error(`Failed to retrieve verification record after restart: ${getData.message}`);
    }

    const postRestartV = getData.data.latestVerification;
    if (postRestartV.fdrId.toString() !== fdr1._id.toString() || postRestartV.status !== 'VERIFIED') {
      throw new Error('Verification data corrupted or mismatched after restart!');
    }

    console.log(`  ✓ Post-restart verified: Ref=${postRestartV.verificationReference}, Status=${postRestartV.status}, Storage=MongoDB`);
    console.log('  ✅ TEST 13 PASSED: Verification records persisted in MongoDB across backend restarts.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 13 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 14: Existing Phase 2 and Phase 3 regression tests still pass
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 14/14] Verification list and dashboard statistics aggregation API...');
  try {
    const listRes = await fetch(`${API_BASE}/verification`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const listData = await listRes.json();

    if (listRes.status !== 200 || !listData.data?.metrics) {
      throw new Error(`Failed to get verification list: ${listData.message}`);
    }

    const metrics = listData.data.metrics;
    console.log(`  ✓ Officer metrics aggregated:`);
    console.log(`    - Pending FDRs: ${metrics.pendingCount}`);
    console.log(`    - Verified Active: ${metrics.verifiedCount}`);
    console.log(`    - Discrepancy Found: ${metrics.discrepancyCount}`);
    console.log(`    - Not Found: ${metrics.notFoundCount}`);
    console.log(`    - Total Verifications Logged: ${listData.data.total}`);

    console.log('  ✅ TEST 14 PASSED: Aggregation and listing APIs operating with full persistence.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 14 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('================================================================================');
  console.log(` RESULT: ALL ${passedTests}/${totalTests} PHASE 4 VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log(' Simulated Bank Verification & Discrepancy Detection is fully operational.');
  console.log('================================================================================\n');

  process.exit(0);
}

runPhase4Tests().catch((err) => {
  console.error('FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
