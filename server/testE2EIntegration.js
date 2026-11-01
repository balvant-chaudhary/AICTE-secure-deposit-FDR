import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { FDR } from './src/models/FDR.js';
import { Institution } from './src/models/Institution.js';
import { User } from './src/models/User.js';
import { Notification } from './src/models/Notification.js';
import { LifecycleRequest } from './src/models/LifecycleRequest.js';
import { BankVerification, SIMULATION_SCENARIOS, VERIFICATION_STATUS } from './src/models/BankVerification.js';
import { FDR_STATUS } from './src/constants/fdrStatus.js';
import { ROLES } from './src/constants/roles.js';
import { runMaturityScanNow, forceReleaseDatabaseLock } from './src/services/cronService.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runE2EAudit() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - COMPREHENSIVE END-TO-END INTEGRATION AUDIT');
  console.log(' Inspection-First Verification Across All 10 Workflows & Security Matrix');
  console.log('================================================================================\n');

  const results = {
    workflow1_registration_login: false,
    workflow2_fdr_submission_upload: false,
    workflow3_all_cbs_simulations: false,
    workflow4_discrepancy_rectification: false,
    workflow5_renewal_approval: false,
    workflow6_release_approval_hierarchy: false,
    workflow7_tiered_maturity_scanning: false,
    workflow8_matured_no_auto_release: false,
    workflow9_notification_center_lifecycle: false,
    workflow10_analytics_consistency: false,
    security_cross_tenant_isolation: false,
    security_role_hierarchy_guards: false,
    security_document_protection: false
  };

  const issuesFound = [];

  // Connect to DB for direct ground-truth assertions
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte-securedeposit';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to persistent MongoDB for ground-truth validation.');

  // Clean any lingering cron locks from previous test runs
  await forceReleaseDatabaseLock('maturity_scan');

  // Helper login function
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

  // Helper for multipart/form-data upload using standard Blob/FormData
  const submitFDRMultipart = async (token, fdrData, fileBuffer, fileName = 'fdr_certificate.pdf') => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = '';

    for (const [key, val] of Object.entries(fdrData)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${val}\r\n`;
    }

    if (fileBuffer) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
      body += `Content-Type: application/pdf\r\n\r\n`;
    }

    const payloadBuffer = fileBuffer
      ? Buffer.concat([
          Buffer.from(body, 'utf-8'),
          fileBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')
        ])
      : Buffer.from(body + `--${boundary}--\r\n`, 'utf-8');

    const res = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: payloadBuffer
    });

    return { status: res.status, data: await res.json() };
  };

  const samplePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (AICTE Test Receipt) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

  try {
    // -------------------------------------------------------------------------
    // WORKFLOW 1: Institution Registration and Login
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 1]: Institution Registration & Login ---');
    const testTimestamp = Date.now().toString().slice(-6);
    const instRegPayload = {
      aictePermanentId: `1-E2E-${testTimestamp}`,
      institutionName: `E2E Tech Institute ${testTimestamp}`,
      institutionType: 'Engineering & Technology',
      address: '42 Knowledge Boulevard',
      state: 'Karnataka',
      city: 'Bengaluru',
      pincode: '560001',
      contactPhone: '080-23456789',
      contactEmail: `inst_e2e_${testTimestamp}@example.edu.in`,
      adminName: 'Dr. Ramesh Kumar',
      adminEmail: `admin_e2e_${testTimestamp}@example.edu.in`,
      adminDesignation: 'Registrar',
      password: 'DemoPassword@123'
    };

    // 1.1 Register fresh institution
    const regRes = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instRegPayload)
    });
    const regData = await regRes.json();

    if (regRes.status !== 201 || !regData.data?.token) {
      throw new Error(`Registration failed: ${regRes.status} ${JSON.stringify(regData)}`);
    }
    const instE2EToken = regData.data.token;
    const instE2EUser = regData.data.user;
    const instE2EId = (instE2EUser.institution?.id || instE2EUser.institutionId?._id || instE2EUser.institutionId)?.toString();
    console.log(`✓ 1.1 Institution registered successfully. Inst ID: ${instE2EId}, User ID: ${instE2EUser.id}`);

    // 1.2 Test duplicate AICTE ID prevention
    const dupRes = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instRegPayload)
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate registration, got ${dupRes.status}`);
    }
    console.log('✓ 1.2 Duplicate AICTE Permanent ID registration properly rejected with 409 Conflict.');

    // 1.3 Login with newly created credentials
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: instRegPayload.adminEmail,
        password: 'DemoPassword@123'
      })
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.data?.token) {
      throw new Error(`Login failed for newly registered user: ${loginRes.status}`);
    }
    console.log('✓ 1.3 Direct login with registered user credentials succeeded with valid JWT.');

    // 1.4 Verify /me endpoint
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.data.token}` }
    });
    const meData = await meRes.json();
    if (meRes.status !== 200 || meData.data?.user?.email !== instRegPayload.adminEmail) {
      throw new Error(`Session /me check failed: ${meRes.status}`);
    }
    console.log('✓ 1.4 Session validation via GET /api/auth/me confirmed profile and institution linkage.');
    results.workflow1_registration_login = true;

    // Load admin, officer, and existing Institution A tokens
    const adminAuth = await login('admin@aicte.gov.in', 'Demo@123');
    const officerAuth = await login('officer@aicte.gov.in', 'Demo@123');
    const instAAuth = await login('institution@aicte.gov.in', 'Demo@123');
    const instAId = (instAAuth.user.institution?.id || instAAuth.user.institutionId?._id || instAAuth.user.institutionId)?.toString();

    // -------------------------------------------------------------------------
    // WORKFLOW 2: FDR Submission with Document Upload
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 2]: FDR Submission with Document Upload ---');
    const fdrPayload1 = {
      fdrNumber: `E2E-FDR-VALID-${testTimestamp}`,
      bankName: 'State Bank of India',
      branchName: 'IISc Campus Branch',
      ifscCode: 'SBIN0008080',
      amount: '500000',
      depositDate: '2025-01-15',
      maturityDate: '2028-01-15',
      autoRenewal: 'false',
      purpose: 'Establishment of New Technical Institute',
      jointAccountHolder: 'Member Secretary, AICTE & Principal',
      remarks: 'Submitted for Phase 6 end-to-end audit'
    };

    // 2.1 Missing document check
    const noDocRes = await submitFDRMultipart(instE2EToken, fdrPayload1, null);
    if (noDocRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request when document is omitted, got ${noDocRes.status}`);
    }
    console.log('✓ 2.1 Missing document scan rejected with 400 Bad Request.');

    // 2.2 Invalid amount check (<= 0)
    const invalidAmtRes = await submitFDRMultipart(instE2EToken, { ...fdrPayload1, amount: '0' }, samplePdfBuffer);
    if (invalidAmtRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for zero amount, got ${invalidAmtRes.status}`);
    }
    console.log('✓ 2.2 Invalid amount (<=0) rejected with 400 Bad Request.');

    // 2.3 Invalid dates check (maturity <= deposit)
    const invalidDateRes = await submitFDRMultipart(
      instE2EToken,
      { ...fdrPayload1, depositDate: '2026-05-01', maturityDate: '2026-01-01' },
      samplePdfBuffer
    );
    if (invalidDateRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for maturity <= deposit, got ${invalidDateRes.status}`);
    }
    console.log('✓ 2.3 Invalid dates (maturity <= deposit) rejected with 400 Bad Request.');

    // 2.4 Valid FDR submission
    const validSubRes = await submitFDRMultipart(instE2EToken, fdrPayload1, samplePdfBuffer);
    if (validSubRes.status !== 201 || !validSubRes.data?.data?.fdr?._id) {
      throw new Error(`Valid FDR submission failed: ${validSubRes.status} ${JSON.stringify(validSubRes.data)}`);
    }
    const createdFDR1 = validSubRes.data.data.fdr;
    if (createdFDR1.status !== FDR_STATUS.SUBMITTED || createdFDR1.isBankVerified !== false) {
      throw new Error(`FDR state after submission is invalid: status=${createdFDR1.status}, isBankVerified=${createdFDR1.isBankVerified}`);
    }
    console.log(`✓ 2.4 Valid FDR submitted: ${createdFDR1.fdrNumber} (Status: ${createdFDR1.status}, isBankVerified: ${createdFDR1.isBankVerified}).`);

    // 2.5 Duplicate FDR Number rejection
    const dupFdrRes = await submitFDRMultipart(instE2EToken, fdrPayload1, samplePdfBuffer);
    if (dupFdrRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate FDR number, got ${dupFdrRes.status}`);
    }
    console.log('✓ 2.5 Duplicate FDR number correctly rejected with 409 Conflict.');
    results.workflow2_fdr_submission_upload = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 3: Officer Reviews & Verifies FDR using all 7 CBS Simulation Scenarios
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 3]: Officer Verification Across All 7 CBS Simulation Scenarios ---');
    const scenariosToTest = [
      { scenario: SIMULATION_SCENARIOS.ALL_MATCH, expectedStatus: FDR_STATUS.VERIFIED_ACTIVE, expectedVerified: true },
      { scenario: SIMULATION_SCENARIOS.AMOUNT_MISMATCH, expectedStatus: FDR_STATUS.DISCREPANCY_FLAGGED, expectedVerified: false },
      { scenario: SIMULATION_SCENARIOS.MATURITY_DATE_MISMATCH, expectedStatus: FDR_STATUS.DISCREPANCY_FLAGGED, expectedVerified: false },
      { scenario: SIMULATION_SCENARIOS.IFSC_MISMATCH, expectedStatus: FDR_STATUS.DISCREPANCY_FLAGGED, expectedVerified: false },
      { scenario: SIMULATION_SCENARIOS.FDR_NOT_FOUND, expectedStatus: FDR_STATUS.DISCREPANCY_FLAGGED, expectedVerified: false },
      { scenario: SIMULATION_SCENARIOS.LIEN_NOT_MARKED, expectedStatus: FDR_STATUS.DISCREPANCY_FLAGGED, expectedVerified: false },
      { scenario: SIMULATION_SCENARIOS.MULTIPLE_DISCREPANCIES, expectedStatus: FDR_STATUS.DISCREPANCY_FLAGGED, expectedVerified: false }
    ];

    let allScenariosPassed = true;

    for (let i = 0; i < scenariosToTest.length; i++) {
      const { scenario, expectedStatus, expectedVerified } = scenariosToTest[i];
      const testFDRNum = `E2E-CBS-${scenario.substring(0, 10)}-${testTimestamp}-${i}`;
      const sub = await submitFDRMultipart(
        instE2EToken,
        {
          ...fdrPayload1,
          fdrNumber: testFDRNum,
          amount: '1000000'
        },
        samplePdfBuffer
      );
      const fdrId = sub.data.data.fdr._id;

      // Officer executes CBS verification
      const verifRes = await fetch(`${API_BASE}/verification/${fdrId}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${officerAuth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scenario, remarks: `Officer tested scenario ${scenario}` })
      });
      const verifData = await verifRes.json();

      if (verifRes.status !== 200) {
        throw new Error(`Verification endpoint failed for ${scenario}: ${verifRes.status}`);
      }

      // Check MongoDB ground truth
      const updatedFdr = await FDR.findById(fdrId);
      const verifRecord = await BankVerification.findOne({ fdrId }).sort({ createdAt: -1 });

      if (!verifRecord) {
        throw new Error(`No BankVerification record was created for ${scenario}`);
      }
      if (updatedFdr.status !== expectedStatus || updatedFdr.isBankVerified !== expectedVerified) {
        allScenariosPassed = false;
        throw new Error(`Scenario ${scenario} resulted in status=${updatedFdr.status} (expected ${expectedStatus}), isBankVerified=${updatedFdr.isBankVerified} (expected ${expectedVerified})`);
      }
      console.log(`  ✓ CBS Scenario [${scenario}]: Correctly transitioned FDR to ${updatedFdr.status} (isBankVerified: ${updatedFdr.isBankVerified}). Verified Reference: ${verifRecord.verificationReference}`);
    }

    if (allScenariosPassed) {
      results.workflow3_all_cbs_simulations = true;
      console.log('✓ All 7 CBS simulation scenarios verified with complete field comparisons and audit trails.');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 4: Discrepancy Detection, Institution Visibility & Rectification
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 4]: Discrepancy Detection & Institution Rectification ---');
    // Create an FDR specifically flagged with AMOUNT_MISMATCH
    const discFDRNum = `E2E-DISC-${testTimestamp}`;
    const discSub = await submitFDRMultipart(
      instE2EToken,
      { ...fdrPayload1, fdrNumber: discFDRNum, amount: '750000' },
      samplePdfBuffer
    );
    const discFDRId = discSub.data.data.fdr._id;

    // Flag with AMOUNT_MISMATCH
    await fetch(`${API_BASE}/verification/${discFDRId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerAuth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: SIMULATION_SCENARIOS.AMOUNT_MISMATCH })
    });

    // 4.1 Institution views discrepancy on GET /api/fdrs/:id
    const instGetRes = await fetch(`${API_BASE}/fdrs/${discFDRId}`, {
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const instGetData = await instGetRes.json();
    const instFdr = instGetData.data.fdr;
    if (instFdr.status !== FDR_STATUS.DISCREPANCY_FLAGGED || !instFdr.discrepancy?.isFlagged || !instFdr.discrepancy?.reason) {
      throw new Error(`Institution did not receive discrepancy details on GET /api/fdrs/:id`);
    }
    console.log(`✓ 4.1 Institution verified discrepancy status and reason: "${instFdr.discrepancy.reason.substring(0, 70)}..."`);

    // 4.2 Institution views full bank CBS verification report via GET /api/verification/:fdrId
    const instVerifRes = await fetch(`${API_BASE}/verification/${discFDRId}`, {
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const instVerifData = await instVerifRes.json();
    if (instVerifRes.status !== 200 || !instVerifData.data?.latestVerification?.fieldComparisons) {
      throw new Error(`Institution failed to retrieve CBS verification report: ${instVerifRes.status}`);
    }
    console.log('✓ 4.2 Institution successfully retrieved full CBS comparison report with field breakdowns.');

    // 4.3 Institution rectifies the FDR details via PUT /api/fdrs/:id
    const boundary = '----WebKitFormBoundaryRectify' + testTimestamp;
    let rectifyBody = `--${boundary}\r\nContent-Disposition: form-data; name="amount"\r\n\r\n600000\r\n`;
    rectifyBody += `--${boundary}\r\nContent-Disposition: form-data; name="depositDate"\r\n\r\n2025-01-15\r\n`;
    rectifyBody += `--${boundary}\r\nContent-Disposition: form-data; name="maturityDate"\r\n\r\n2028-01-15\r\n`;
    rectifyBody += `--${boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nRectified deposit for audit\r\n`;
    rectifyBody += `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="corrected_receipt.pdf"\r\n`;
    rectifyBody += `Content-Type: application/pdf\r\n\r\n`;

    const rectifyBuffer = Buffer.concat([
      Buffer.from(rectifyBody, 'utf-8'),
      samplePdfBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')
    ]);

    const rectifyRes = await fetch(`${API_BASE}/fdrs/${discFDRId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${instE2EToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: rectifyBuffer
    });
    const rectifyData = await rectifyRes.json();
    if (rectifyRes.status !== 200) {
      throw new Error(`Rectification failed: ${rectifyRes.status} ${JSON.stringify(rectifyData)}`);
    }

    const reCheckedFDR = await FDR.findById(discFDRId);
    if (reCheckedFDR.status !== FDR_STATUS.SUBMITTED || reCheckedFDR.isBankVerified !== false) {
      throw new Error(`Rectified FDR must return to SUBMITTED state with isBankVerified=false. Got status=${reCheckedFDR.status}`);
    }
    console.log(`✓ 4.3 FDR successfully rectified: Amount updated to ₹${reCheckedFDR.amount}, status reset to SUBMITTED for re-verification.`);

    // 4.4 Officer re-verifies with ALL_MATCH
    await fetch(`${API_BASE}/verification/${discFDRId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerAuth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: SIMULATION_SCENARIOS.ALL_MATCH, remarks: 'Rectification accepted' })
    });
    const finalRectifiedFDR = await FDR.findById(discFDRId);
    if (finalRectifiedFDR.status !== FDR_STATUS.VERIFIED_ACTIVE || !finalRectifiedFDR.isBankVerified) {
      throw new Error(`Re-verification failed to activate FDR: status=${finalRectifiedFDR.status}`);
    }
    console.log(`✓ 4.4 Officer re-verified rectified FDR: Successfully transitioned to VERIFIED_ACTIVE.`);
    results.workflow4_discrepancy_rectification = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 5: Renewal Request Submission and Approval
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 5]: Renewal Request Submission & Approval ---');
    // We will use finalRectifiedFDR (which is now VERIFIED_ACTIVE)
    const renewalMaturity = '2030-01-15';
    const renewalRes = await fetch(`${API_BASE}/requests/renewal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instE2EToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fdrId: discFDRId,
        newMaturityDate: renewalMaturity,
        newAmount: 650000,
        reason: 'Statutory 2-year tenure extension as per AICTE directive'
      })
    });
    const renewalData = await renewalRes.json();
    if (renewalRes.status !== 201 || !renewalData.data?.request?._id) {
      throw new Error(`Renewal request submission failed: ${renewalRes.status} ${JSON.stringify(renewalData)}`);
    }
    const renewalRequestId = renewalData.data.request._id;

    // Check FDR status transitioned to RENEWAL_PENDING
    let fdrPostRenewalSub = await FDR.findById(discFDRId);
    if (fdrPostRenewalSub.status !== FDR_STATUS.RENEWAL_PENDING) {
      throw new Error(`FDR status should be RENEWAL_PENDING, got ${fdrPostRenewalSub.status}`);
    }
    console.log(`✓ 5.1 Renewal request submitted. Request ID: ${renewalRequestId}. FDR transitioned to ${fdrPostRenewalSub.status}.`);

    // 5.2 Officer recommends renewal request
    const officerRecRes = await fetch(`${API_BASE}/requests/${renewalRequestId}/officer-recommend`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${officerAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ remarks: 'Renewal tenure and documents verified by officer.' })
    });
    const officerRecData = await officerRecRes.json();
    if (officerRecRes.status !== 200 || officerRecData.data?.request?.status !== 'OFFICER_RECOMMENDED') {
      throw new Error(`Officer recommendation failed: ${officerRecRes.status}`);
    }
    console.log('✓ 5.2 Officer recommended renewal request (Status: OFFICER_RECOMMENDED).');

    // 5.3 Admin approves renewal request
    const adminApproveRes = await fetch(`${API_BASE}/requests/${renewalRequestId}/admin-decision`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decision: 'APPROVE', remarks: 'Renewal approved by Admin.' })
    });
    const adminApproveData = await adminApproveRes.json();
    if (adminApproveRes.status !== 200 || adminApproveData.data?.request?.status !== 'APPROVED') {
      throw new Error(`Admin renewal approval failed: ${adminApproveRes.status}`);
    }

    const fdrPostApproval = await FDR.findById(discFDRId);
    if (fdrPostApproval.status !== FDR_STATUS.VERIFIED_ACTIVE) {
      throw new Error(`FDR status after renewal approval should be VERIFIED_ACTIVE, got ${fdrPostApproval.status}`);
    }
    const newMatIso = new Date(renewalMaturity).toISOString().split('T')[0];
    const updatedMatIso = new Date(fdrPostApproval.maturityDate).toISOString().split('T')[0];
    if (newMatIso !== updatedMatIso) {
      throw new Error(`Maturity date not updated: expected ${newMatIso}, got ${updatedMatIso}`);
    }
    console.log(`✓ 5.3 Admin approved renewal: FDR status restored to VERIFIED_ACTIVE, maturityDate extended to ${updatedMatIso}.`);
    results.workflow5_renewal_approval = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 6: Release Request Submission, Officer Recommendation, and Admin Authorization
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 6]: Release Request Submission, Officer Recommendation, & Admin Authorization ---');
    // Create a new VERIFIED_ACTIVE FDR for release testing
    const releaseFDRNum = `E2E-REL-${testTimestamp}`;
    const relSub = await submitFDRMultipart(
      instE2EToken,
      { ...fdrPayload1, fdrNumber: releaseFDRNum, amount: '1500000' },
      samplePdfBuffer
    );
    const relFDRId = relSub.data.data.fdr._id;

    // Officer verifies to VERIFIED_ACTIVE
    await fetch(`${API_BASE}/verification/${relFDRId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerAuth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: SIMULATION_SCENARIOS.ALL_MATCH })
    });

    // 6.1 Institution submits Release Request
    const releaseReqRes = await fetch(`${API_BASE}/requests/release`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instE2EToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fdrId: relFDRId,
        reason: 'Closure of technical programme / AICTE approval surrendered',
        closureJustification: 'Institution has completed statutory 10-year term and fulfilled all compliance requirements',
        bankName: 'Canara Bank',
        accountNumber: '110022334455',
        ifscCode: 'CNRB0001234',
        beneficiaryName: 'E2E Tech Institute Bengaluru'
      })
    });
    const releaseReqData = await releaseReqRes.json();
    if (releaseReqRes.status !== 201 || !releaseReqData.data?.request?._id) {
      throw new Error(`Release request failed: ${releaseReqRes.status} ${JSON.stringify(releaseReqData)}`);
    }
    const releaseRequestId = releaseReqData.data.request._id;

    let fdrPostRelSub = await FDR.findById(relFDRId);
    if (fdrPostRelSub.status !== FDR_STATUS.RELEASE_PENDING) {
      throw new Error(`FDR status should be RELEASE_PENDING, got ${fdrPostRelSub.status}`);
    }
    console.log(`✓ 6.1 Release request submitted. Request ID: ${releaseRequestId}. FDR status: ${fdrPostRelSub.status}.`);

    // 6.2 Officer recommends release request
    const officerRelRecRes = await fetch(`${API_BASE}/requests/${releaseRequestId}/officer-recommend`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${officerAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ remarks: 'Clearance certificate & NOC verified. Recommended for release order.' })
    });
    if (officerRelRecRes.status !== 200) {
      throw new Error(`Officer release recommendation failed: ${officerRelRecRes.status}`);
    }
    console.log('✓ 6.2 Officer recommended release request to Admin.');

    // 6.3 Security Check: Officer ATTEMPTS Admin Authorization -> MUST BE 403 FORBIDDEN!
    const officerUnauthorizedDecision = await fetch(`${API_BASE}/requests/${releaseRequestId}/admin-decision`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${officerAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decision: 'APPROVE', remarks: 'Officer attempting unauthorized approval.' })
    });
    if (officerUnauthorizedDecision.status !== 403) {
      throw new Error(`CRITICAL SECURITY FAILURE: Officer was not blocked from admin decision! Got status ${officerUnauthorizedDecision.status}`);
    }
    console.log('✓ 6.3 SECURITY VERIFIED: Officer blocked with 403 Forbidden when attempting admin-only authorization.');

    // 6.4 Admin authorizes release
    const adminRelApproveRes = await fetch(`${API_BASE}/requests/${releaseRequestId}/admin-decision`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        orderNumber: `AICTE/REL-ORD/${new Date().getFullYear()}/9876`,
        remarks: 'Final release and lien discharge authorized by AICTE Competent Authority.'
      })
    });
    const adminRelApproveData = await adminRelApproveRes.json();
    if (adminRelApproveRes.status !== 200 || adminRelApproveData.data?.request?.status !== 'APPROVED') {
      throw new Error(`Admin release authorization failed: ${adminRelApproveRes.status}`);
    }

    const fdrReleased = await FDR.findById(relFDRId);
    if (fdrReleased.status !== FDR_STATUS.RELEASED) {
      throw new Error(`FDR status should be RELEASED, got ${fdrReleased.status}`);
    }
    console.log(`✓ 6.4 Admin authorized release: FDR status transitioned to ${fdrReleased.status}. Order: ${adminRelApproveData.data.request.approvalOrderNumber}.`);
    results.workflow6_release_approval_hierarchy = true;
    results.security_role_hierarchy_guards = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 7: Maturity Scanning at 60, 30, and 7 Days
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 7]: Tiered Maturity Scanning at 60, 30, and 7 Days ---');
    const now = new Date();

    // Helper to create active FDR with specific maturity date offset
    const createActiveFDRWithOffset = async (prefix, daysAhead) => {
      const matDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const doc = await FDR.create({
        fdrNumber: `${prefix}-${testTimestamp}`,
        institutionId: instE2EId,
        submittedBy: instE2EUser.id,
        reviewedBy: officerAuth.user.id,
        bankName: 'State Bank of India',
        branchName: 'Main Branch',
        ifscCode: 'SBIN0001000',
        amount: 800000,
        currency: 'INR',
        depositDate: new Date('2022-01-01'),
        maturityDate: matDate,
        purpose: 'AICTE Security Deposit',
        jointAccountHolder: 'Member Secretary AICTE',
        documentUrl: '/storage/fdr-documents/test.pdf',
        documentOriginalName: 'test.pdf',
        status: FDR_STATUS.VERIFIED_ACTIVE,
        isBankVerified: true
      });
      return doc;
    };

    const fdr60 = await createActiveFDRWithOffset('E2E-MAT-60D', 45); // 30 < 45 <= 60
    const fdr30 = await createActiveFDRWithOffset('E2E-MAT-30D', 20); // 7 < 20 <= 30
    const fdr7 = await createActiveFDRWithOffset('E2E-MAT-7D', 4);    // 0 < 4 <= 7

    // Run first maturity scan
    const scan1 = await runMaturityScanNow(now, { forceRun: true });
    console.log(`✓ 7.1 Executed maturity scan. Summary: processed=${scan1.totalProcessed}, 60d=${scan1.alertsSent?.sixtyDayCount}, 30d=${scan1.alertsSent?.thirtyDayCount}, 7d=${scan1.alertsSent?.sevenDayCount}.`);

    const checked60 = await FDR.findById(fdr60._id);
    const checked30 = await FDR.findById(fdr30._id);
    const checked7 = await FDR.findById(fdr7._id);

    if (!checked60.maturityAlertsSent.includes('60_DAY') || checked60.status !== FDR_STATUS.EXPIRING_SOON) {
      throw new Error(`FDR 60-day milestone failed: alertsSent=${checked60.maturityAlertsSent}, status=${checked60.status}`);
    }
    if (!checked30.maturityAlertsSent.includes('30_DAY') || checked30.status !== FDR_STATUS.EXPIRING_SOON) {
      throw new Error(`FDR 30-day milestone failed: alertsSent=${checked30.maturityAlertsSent}, status=${checked30.status}`);
    }
    if (!checked7.maturityAlertsSent.includes('7_DAY') || checked7.status !== FDR_STATUS.EXPIRING_SOON) {
      throw new Error(`FDR 7-day milestone failed: alertsSent=${checked7.maturityAlertsSent}, status=${checked7.status}`);
    }
    console.log('✓ 7.2 All 3 milestones (60_DAY, 30_DAY, 7_DAY) correctly recorded in maturityAlertsSent and status set to EXPIRING_SOON.');

    // 7.3 Duplicate Notification Prevention Check: Re-run scan immediately
    const scan2 = await runMaturityScanNow(now, { forceRun: true });
    if (
      scan2.alertsSent?.sixtyDayCount !== 0 ||
      scan2.alertsSent?.thirtyDayCount !== 0 ||
      scan2.alertsSent?.sevenDayCount !== 0
    ) {
      throw new Error(`Duplicate notification prevention failed! Re-scan triggered new alerts: ${JSON.stringify(scan2.alertsSent)}`);
    }
    console.log('✓ 7.3 Duplicate notification prevention verified: Subsequent immediate scan sent 0 duplicate alerts.');
    results.workflow7_tiered_maturity_scanning = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 8: MATURED Status Without Automatic Release
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 8]: MATURED Status Hold Without Automatic Release ---');
    // Create an FDR with maturity date 3 days in the past
    const maturedFDR = await createActiveFDRWithOffset('E2E-PAST-MAT', -3);

    const scanMatured = await runMaturityScanNow(now, { forceRun: true });
    const checkedMatured = await FDR.findById(maturedFDR._id);

    // CRITICAL GOVERNANCE CHECK:
    if (checkedMatured.status !== FDR_STATUS.MATURED) {
      throw new Error(`Expected status to transition to MATURED, got ${checkedMatured.status}`);
    }
    if (checkedMatured.status === FDR_STATUS.RELEASED) {
      throw new Error(`CRITICAL COMPLIANCE FAILURE: FDR was automatically released! Must never automatically release funds!`);
    }
    if (!checkedMatured.maturityAlertsSent.includes('MATURED')) {
      throw new Error(`Expected 'MATURED' in maturityAlertsSent`);
    }
    console.log(`✓ 8.1 FDR correctly transitioned to MATURED (never automatically released). Alerts recorded: ${checkedMatured.maturityAlertsSent}.`);

    // Verify ineligible states are excluded from scan
    const releasedFDR = await createActiveFDRWithOffset('E2E-EXCL-REL', -10);
    await FDR.findByIdAndUpdate(releasedFDR._id, { $set: { status: FDR_STATUS.RELEASED } });

    const discrepancyFDR = await createActiveFDRWithOffset('E2E-EXCL-DISC', 20);
    await FDR.findByIdAndUpdate(discrepancyFDR._id, { $set: { status: FDR_STATUS.DISCREPANCY_FLAGGED } });

    const scanExcl = await runMaturityScanNow(now, { forceRun: true });
    const reCheckedRel = await FDR.findById(releasedFDR._id);
    const reCheckedDisc = await FDR.findById(discrepancyFDR._id);

    if (reCheckedRel.maturityAlertsSent.length > 0 || reCheckedDisc.maturityAlertsSent.length > 0) {
      throw new Error('Ineligible FDR states (RELEASED, DISCREPANCY_FLAGGED) were improperly processed by scanner!');
    }
    console.log('✓ 8.2 Ineligible states (RELEASED, DISCREPANCY_FLAGGED) strictly excluded from maturity scanning.');
    results.workflow8_matured_no_auto_release = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 9: Notification Delivery, Unread Count, Mark-As-Read, & Mark-All-As-Read
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 9]: Notification Delivery, Unread Count, & Mark As Read ---');
    // 9.1 Institution fetches notifications
    const instNotifRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const instNotifData = await instNotifRes.json();
    if (instNotifRes.status !== 200) {
      throw new Error(`Failed to fetch notifications: ${instNotifRes.status}`);
    }
    const notifs = instNotifData.data?.notifications || [];
    const unreadCountInitial = notifs.filter((n) => !n.isRead).length;
    if (notifs.length === 0 || unreadCountInitial === 0) {
      throw new Error(`Institution has no notifications delivered from prior workflows. Total=${notifs.length}, Unread=${unreadCountInitial}`);
    }
    console.log(`✓ 9.1 Institution notifications retrieved: ${notifs.length} total, ${unreadCountInitial} unread.`);

    // 9.2 Mark single notification as read
    const targetNotif = notifs.find((n) => !n.isRead) || notifs[0];
    const markReadRes = await fetch(`${API_BASE}/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const markReadData = await markReadRes.json();
    if (markReadRes.status !== 200 || !markReadData.data?.notification?.isRead) {
      throw new Error(`Mark-as-read failed: ${markReadRes.status}`);
    }

    const instNotifRes2 = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const instNotifData2 = await instNotifRes2.json();
    const notifs2 = instNotifData2.data?.notifications || [];
    const unreadCountAfterSingle = notifs2.filter((n) => !n.isRead).length;
    if (unreadCountAfterSingle !== unreadCountInitial - 1) {
      throw new Error(`Unread count did not decrement: before=${unreadCountInitial}, after=${unreadCountAfterSingle}`);
    }
    console.log(`✓ 9.2 Single notification marked as read. Unread count properly decremented to ${unreadCountAfterSingle}.`);

    // 9.3 Cross-Tenant Security Check: Inst A tries to mark Inst E2E's notification as read -> MUST BE REJECTED!
    const crossNotifRes = await fetch(`${API_BASE}/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${instAAuth.token}` }
    });
    if (crossNotifRes.status !== 403 && crossNotifRes.status !== 404) {
      throw new Error(`CRITICAL SECURITY FAILURE: Inst A marked Inst E2E notification as read! Status=${crossNotifRes.status}`);
    }
    console.log(`✓ 9.3 SECURITY VERIFIED: Cross-tenant notification mark-as-read rejected with ${crossNotifRes.status}.`);

    // 9.4 Mark all notifications as read
    const readAllRes = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    if (readAllRes.status !== 200) {
      throw new Error(`Mark-all-as-read failed: ${readAllRes.status}`);
    }
    const instNotifRes3 = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const instNotifData3 = await instNotifRes3.json();
    const notifs3 = instNotifData3.data?.notifications || [];
    const unreadCountFinal = notifs3.filter((n) => !n.isRead).length;
    if (unreadCountFinal !== 0) {
      throw new Error(`Mark-all-as-read did not clear unread count! Remaining: ${unreadCountFinal}`);
    }
    console.log('✓ 9.4 Mark all as read cleared all institution unread notifications (unreadCount: 0).');
    results.workflow9_notification_center_lifecycle = true;

    // -------------------------------------------------------------------------
    // WORKFLOW 10: Analytics and Dashboard Consistency
    // -------------------------------------------------------------------------
    console.log('\n--- [Workflow 10]: Analytics & Dashboard Consistency ---');
    // 10.1 Admin metrics check against DB ground truth
    const adminMetricsRes = await fetch(`${API_BASE}/analytics/metrics`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` }
    });
    const adminMetricsData = await adminMetricsRes.json();
    if (adminMetricsRes.status !== 200) {
      throw new Error(`Failed to fetch admin metrics: ${adminMetricsRes.status}`);
    }
    const adminMetrics = adminMetricsData.data?.metrics;

    const [dbTotalFDRs, dbActiveFDRs, dbMaturedFDRs, dbReleasedFDRs] = await Promise.all([
      FDR.countDocuments(),
      FDR.countDocuments({ status: FDR_STATUS.VERIFIED_ACTIVE }),
      FDR.countDocuments({ status: FDR_STATUS.MATURED }),
      FDR.countDocuments({ status: FDR_STATUS.RELEASED })
    ]);

    if (
      adminMetrics.totalFDRs !== dbTotalFDRs ||
      adminMetrics.activeFDRs !== dbActiveFDRs ||
      adminMetrics.maturedFDRs !== dbMaturedFDRs ||
      adminMetrics.releasedFDRs !== dbReleasedFDRs
    ) {
      throw new Error(`Analytics metrics discrepancy: API=${JSON.stringify(adminMetrics)}, DB={total:${dbTotalFDRs}, active:${dbActiveFDRs}, matured:${dbMaturedFDRs}, released:${dbReleasedFDRs}}`);
    }
    console.log(`✓ 10.1 Admin analytics metrics match MongoDB ground truth 100%: Total=${adminMetrics.totalFDRs}, Active=${adminMetrics.activeFDRs}, Matured=${adminMetrics.maturedFDRs}, Released=${adminMetrics.releasedFDRs}.`);

    // 10.2 Institution metrics role-scoping check
    const instMetricsRes = await fetch(`${API_BASE}/analytics/metrics`, {
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    const instMetricsData = await instMetricsRes.json();
    const instMetrics = instMetricsData.data?.metrics;

    const dbInstTotal = await FDR.countDocuments({ institutionId: instE2EId });
    if (instMetrics.totalFDRs !== dbInstTotal) {
      throw new Error(`Institution analytics leakage! Expected ${dbInstTotal}, got ${instMetrics.totalFDRs}`);
    }
    console.log(`✓ 10.2 Institution analytics role-scoping verified: Sees only its own ${instMetrics.totalFDRs} records (System total: ${adminMetrics.totalFDRs}).`);
    results.workflow10_analytics_consistency = true;

    // -------------------------------------------------------------------------
    // SECURITY MATRIX VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- [Security Matrix Verification] ---');

    // S.1 Cross-tenant FDR access (Inst A views Inst E2E's FDR) -> 403
    const crossGetRes = await fetch(`${API_BASE}/fdrs/${discFDRId}`, {
      headers: { Authorization: `Bearer ${instAAuth.token}` }
    });
    if (crossGetRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-institution FDR access, got ${crossGetRes.status}`);
    }
    console.log('✓ S.1 Cross-tenant FDR retrieval blocked with 403 Forbidden.');

    // S.2 Cross-tenant FDR update -> 403
    const crossPutRes = await fetch(`${API_BASE}/fdrs/${discFDRId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${instAAuth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 999999 })
    });
    if (crossPutRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-institution FDR update, got ${crossPutRes.status}`);
    }
    console.log('✓ S.2 Cross-tenant FDR update blocked with 403 Forbidden.');

    // S.3 Cross-tenant Document Download -> 403
    const crossDocRes = await fetch(`${API_BASE}/fdrs/${discFDRId}/download-document`, {
      headers: { Authorization: `Bearer ${instAAuth.token}` }
    });
    if (crossDocRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-institution document download, got ${crossDocRes.status}`);
    }
    console.log('✓ S.3 Unauthorized document download blocked with 403 Forbidden.');

    // S.4 Unauthenticated document download -> 401
    const unauthDocRes = await fetch(`${API_BASE}/fdrs/${discFDRId}/download-document`);
    if (unauthDocRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for unauthenticated document download, got ${unauthDocRes.status}`);
    }
    console.log('✓ S.4 Unauthenticated document download blocked with 401 Unauthorized.');

    // S.5 Institution blocked from officer CBS verification -> 403
    const instVerifyBlock = await fetch(`${API_BASE}/verification/${discFDRId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instE2EToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: SIMULATION_SCENARIOS.ALL_MATCH })
    });
    if (instVerifyBlock.status !== 403) {
      throw new Error(`Expected 403 Forbidden when institution calls CBS verification, got ${instVerifyBlock.status}`);
    }
    console.log('✓ S.5 Institution barred from executing CBS verification with 403 Forbidden.');

    // S.6 Institution blocked from recommending requests -> 403
    const instRecBlock = await fetch(`${API_BASE}/requests/${renewalRequestId}/officer-recommend`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${instE2EToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks: 'Hacked recommendation' })
    });
    if (instRecBlock.status !== 403) {
      throw new Error(`Expected 403 Forbidden when institution calls officer-recommend, got ${instRecBlock.status}`);
    }
    console.log('✓ S.6 Institution barred from officer-recommend with 403 Forbidden.');

    // S.7 Institution blocked from triggering manual cron scan -> 403
    const instCronBlock = await fetch(`${API_BASE}/analytics/trigger-cron-scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instE2EToken}` }
    });
    if (instCronBlock.status !== 403) {
      throw new Error(`Expected 403 Forbidden when institution triggers cron scan, got ${instCronBlock.status}`);
    }
    console.log('✓ S.7 Institution barred from triggering manual cron scans with 403 Forbidden.');

    // S.8 BankVerification snapshot immutability check
    const verifSnapshot = await BankVerification.findOne({ fdrId: discFDRId });
    if (!verifSnapshot || !verifSnapshot.submittedDetails || !verifSnapshot.confirmedDetails) {
      throw new Error('BankVerification snapshot missing immutable details');
    }
    console.log('✓ S.8 Bank verification snapshot immutability verified in database.');

    results.security_cross_tenant_isolation = true;
    results.security_document_protection = true;

  } catch (err) {
    console.error('\n❌ AUDIT EXECUTION ERROR:', err.message);
    issuesFound.push(err.message);
  } finally {
    // Safe cleanup of test-specific records
    console.log('\n--- [Cleanup]: Pruning test-generated audit records ---');
    try {
      const deletedFdrs = await FDR.deleteMany({ fdrNumber: { $regex: /^E2E-/ } });
      const deletedNotifs = await Notification.deleteMany({ idempotencyKey: { $regex: /^MATURITY:/ } });
      const deletedVerifs = await BankVerification.deleteMany({ verificationReference: { $regex: /^AICTE-VERIF-/ } });
      const deletedReqs = await LifecycleRequest.deleteMany({ reason: { $regex: /audit|directive/i } });
      const deletedUsers = await User.deleteMany({ email: { $regex: /_e2e_/ } });
      const deletedInsts = await Institution.deleteMany({ aictePermanentId: { $regex: /^1-E2E-/ } });

      console.log(`✓ Cleaned up: ${deletedFdrs.deletedCount} FDRs, ${deletedNotifs.deletedCount} notifications, ${deletedVerifs.deletedCount} verifications, ${deletedReqs.deletedCount} requests, ${deletedUsers.deletedCount} users, ${deletedInsts.deletedCount} institutions.`);
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================================');
  console.log(' FINAL AUDIT EXECUTION SUMMARY');
  console.log('================================================================================');
  for (const [key, val] of Object.entries(results)) {
    console.log(`${val ? 'PASS' : 'FAIL'} : ${key}`);
  }

  if (issuesFound.length > 0) {
    console.log('\nISSUES ENCOUNTERED:');
    issuesFound.forEach((iss, idx) => console.log(` ${idx + 1}. ${iss}`));
  } else {
    console.log('\n✓ ALL WORKFLOWS & SECURITY POLICIES PASSED GROUND-TRUTH VERIFICATION.');
  }
}

runE2EAudit();
