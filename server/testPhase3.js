import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

// Helper to construct multipart/form-data manually with Boundary without external dependencies
function buildMultipartFormData(fields, file) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';
  let bodyChunks = [];

  for (const [key, val] of Object.entries(fields)) {
    bodyChunks.push(Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="${key}"${crlf}${crlf}` +
      `${val}${crlf}`
    ));
  }

  if (file) {
    bodyChunks.push(Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"${crlf}` +
      `Content-Type: ${file.contentType}${crlf}${crlf}`
    ));
    bodyChunks.push(file.content);
    bodyChunks.push(Buffer.from(crlf));
  }

  bodyChunks.push(Buffer.from(`--${boundary}--${crlf}`));
  const buffer = Buffer.concat(bodyChunks);

  return {
    buffer,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }
  };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   AICTE FDR PORTAL — PHASE 3 AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Detail: ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Setup: Authenticate Test Personas
    // -------------------------------------------------------------------------
    console.log('[Setup]: Logging in test personas...');

    // 1. Institution A Login
    const loginInstARes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'institution@aicte.gov.in', password: 'Demo@123' })
    });
    const instAData = await loginInstARes.json();
    const instAToken = instAData.data?.token;
    assert(!!instAToken, 'Login Institution A (Delhi Institute)');

    // 2. Register / Login Institution B
    let instBToken;
    const registerInstBRes = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aictePermanentId: '1-778899001',
        institutionName: 'Bengaluru College of Engineering',
        institutionType: 'Engineering & Technology',
        address: 'MG Road, Central Campus',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        contactEmail: 'bengaluru_engg@example.ac.in',
        contactPhone: '080-22334455',
        adminName: 'Dr. B. Raman',
        adminEmail: 'inst_b_admin@example.ac.in',
        password: 'Password@123',
        designation: 'Registrar',
        phone: '9845011223'
      })
    });
    const instBRegData = await registerInstBRes.json();
    if (instBRegData.success) {
      instBToken = instBRegData.data.token;
    } else {
      // If already registered, login
      const loginBRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'inst_b_admin@example.ac.in', password: 'Password@123' })
      });
      const bLoginData = await loginBRes.json();
      instBToken = bLoginData.data?.token;
    }
    assert(!!instBToken, 'Login / Register Institution B (Bengaluru College)');

    // 3. Officer Login
    const loginOfficerRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@aicte.gov.in', password: 'Demo@123' })
    });
    const officerData = await loginOfficerRes.json();
    const officerToken = officerData.data?.token;
    assert(!!officerToken, 'Login AICTE Officer');

    // 4. Admin Login
    const loginAdminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@aicte.gov.in', password: 'Demo@123' })
    });
    const adminData = await loginAdminRes.json();
    const adminToken = adminData.data?.token;
    assert(!!adminToken, 'Login AICTE Admin');

    const samplePdfBuffer = Buffer.from('%PDF-1.4\n%AICTE Valid FDR Certificate Scan Sample\n1 0 obj\n<< /Title (FDR Deposit Scan) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const validFile = {
      fieldname: 'document',
      filename: 'SBI_FDR_Official_Scan.pdf',
      contentType: 'application/pdf',
      content: samplePdfBuffer
    };

    let fdrAId = null;
    let fdrBId = null;

    // -------------------------------------------------------------------------
    // Test 1: Successful FDR submission
    // -------------------------------------------------------------------------
    const uniqueFdrA = `FDR-AICTE-${Date.now()}-A`;
    const fdrAFields = {
      fdrNumber: uniqueFdrA,
      bankName: 'State Bank of India',
      branchName: 'Dwarka Sector 11, New Delhi',
      ifscCode: 'SBIN0005432',
      amount: '2500000',
      depositDate: '2026-01-10',
      maturityDate: '2028-01-10',
      autoRenewal: 'true',
      purpose: 'Establishment of New Technical Institution',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      remarks: 'Submitted against AICTE 2026 Regulatory Mandate'
    };
    const multipartA = buildMultipartFormData(fdrAFields, validFile);

    const subARes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        ...multipartA.headers
      },
      body: multipartA.buffer
    });
    const subAData = await subARes.json();
    fdrAId = subAData.data?.fdr?._id;

    assert(
      subARes.status === 201 &&
      subAData.success === true &&
      subAData.data?.fdr?.status === 'SUBMITTED' &&
      subAData.data?.fdr?.amount === 2500000 &&
      subAData.data?.fdr?.isBankVerified === false,
      'Test 1: Successful FDR submission (Status 201, Status=SUBMITTED, isBankVerified=false)',
      JSON.stringify(subAData)
    );

    // -------------------------------------------------------------------------
    // Test 2: Missing required fields
    // -------------------------------------------------------------------------
    const missingFields = { ...fdrAFields, fdrNumber: '' };
    delete missingFields.bankName;
    const multipartMissing = buildMultipartFormData(missingFields, validFile);

    const missingRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        ...multipartMissing.headers
      },
      body: multipartMissing.buffer
    });
    const missingData = await missingRes.json();

    assert(
      missingRes.status === 400 && missingData.success === false,
      'Test 2: Missing required fields rejected with 400 Bad Request',
      `Status: ${missingRes.status}, Message: ${missingData.message}`
    );

    // -------------------------------------------------------------------------
    // Test 3: Invalid maturity date (maturity before deposit)
    // -------------------------------------------------------------------------
    const invalidDateFields = {
      ...fdrAFields,
      fdrNumber: `FDR-INV-DATE-${Date.now()}`,
      depositDate: '2026-10-01',
      maturityDate: '2026-05-01' // Before deposit!
    };
    const multipartInvDate = buildMultipartFormData(invalidDateFields, validFile);

    const invDateRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        ...multipartInvDate.headers
      },
      body: multipartInvDate.buffer
    });
    const invDateData = await invDateRes.json();

    assert(
      invDateRes.status === 400 &&
      invDateData.message.toLowerCase().includes('maturity date must be after deposit date'),
      'Test 3: Invalid maturity date (maturity <= deposit) rejected with 400 Bad Request',
      `Status: ${invDateRes.status}, Message: ${invDateData.message}`
    );

    // -------------------------------------------------------------------------
    // Test 4: Invalid file type
    // -------------------------------------------------------------------------
    const invalidFile = {
      fieldname: 'document',
      filename: 'malicious_script.exe',
      contentType: 'application/x-msdownload',
      content: Buffer.from('MZ... executable content')
    };
    const multipartInvFile = buildMultipartFormData(
      { ...fdrAFields, fdrNumber: `FDR-INV-FILE-${Date.now()}` },
      invalidFile
    );

    const invFileRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        ...multipartInvFile.headers
      },
      body: multipartInvFile.buffer
    });
    const invFileData = await invFileRes.json();

    assert(
      invFileRes.status === 400 &&
      invFileData.message.toLowerCase().includes('invalid file format'),
      'Test 4: Invalid file type (.exe) rejected with 400 Bad Request',
      `Status: ${invFileRes.status}, Message: ${invFileData.message}`
    );

    // -------------------------------------------------------------------------
    // Test 5: File larger than 5 MB
    // -------------------------------------------------------------------------
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x41); // 5.5 MB
    const oversizedFile = {
      fieldname: 'document',
      filename: 'oversized_scan.pdf',
      contentType: 'application/pdf',
      content: oversizedBuffer
    };
    const multipartOversized = buildMultipartFormData(
      { ...fdrAFields, fdrNumber: `FDR-OVERSIZE-${Date.now()}` },
      oversizedFile
    );

    const overRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        ...multipartOversized.headers
      },
      body: multipartOversized.buffer
    });
    const overData = await overRes.json();

    assert(
      overRes.status === 400 &&
      overData.message.toLowerCase().includes('5 mb'),
      'Test 5: File larger than 5 MB rejected with 400 Bad Request',
      `Status: ${overRes.status}, Message: ${overData.message}`
    );

    // -------------------------------------------------------------------------
    // Submit an FDR from Institution B for Isolation Tests
    // -------------------------------------------------------------------------
    const uniqueFdrB = `FDR-AICTE-${Date.now()}-B`;
    const fdrBFields = {
      fdrNumber: uniqueFdrB,
      bankName: 'Canara Bank',
      branchName: 'MG Road Bengaluru',
      ifscCode: 'CNRB0001234',
      amount: '5000000',
      depositDate: '2026-02-01',
      maturityDate: '2029-02-01',
      autoRenewal: 'false',
      purpose: 'Increase in Student Intake Capacity',
      jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
      remarks: 'Institution B security deposit'
    };
    const multipartB = buildMultipartFormData(fdrBFields, validFile);
    const subBRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instBToken}`,
        ...multipartB.headers
      },
      body: multipartB.buffer
    });
    const subBData = await subBRes.json();
    fdrBId = subBData.data?.fdr?._id;
    assert(!!fdrBId, 'Setup Institution B FDR record');

    // -------------------------------------------------------------------------
    // Test 6: Institution A cannot view Institution B's FDR
    // -------------------------------------------------------------------------
    const instAViewBRes = await fetch(`${API_BASE}/fdrs/${fdrBId}`, {
      headers: { Authorization: `Bearer ${instAToken}` }
    });
    const instAViewBData = await instAViewBRes.json();

    // Also check list query: Inst A list must NOT include Inst B's FDR
    const instAListRes = await fetch(`${API_BASE}/fdrs`, {
      headers: { Authorization: `Bearer ${instAToken}` }
    });
    const instAListData = await instAListRes.json();
    const instAHasB = instAListData.data?.fdrs?.some(f => f._id === fdrBId || f.fdrNumber === uniqueFdrB);

    assert(
      instAViewBRes.status === 403 &&
      instAViewBData.message.toLowerCase().includes('access denied') &&
      !instAHasB,
      'Test 6: Institution A cannot view Institution B FDR (403 on details, absent in list)',
      `Status: ${instAViewBRes.status}, Message: ${instAViewBData.message}`
    );

    // -------------------------------------------------------------------------
    // Test 7: Institution A cannot update Institution B's FDR
    // -------------------------------------------------------------------------
    const instAUpdateBRes = await fetch(`${API_BASE}/fdrs/${fdrBId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 9999999 })
    });
    const instAUpdateBData = await instAUpdateBRes.json();

    assert(
      instAUpdateBRes.status === 403 &&
      instAUpdateBData.message.toLowerCase().includes('access denied'),
      'Test 7: Institution A cannot update Institution B FDR (403 Forbidden)',
      `Status: ${instAUpdateBRes.status}, Message: ${instAUpdateBData.message}`
    );

    // -------------------------------------------------------------------------
    // Test 8: Institution cannot change verification status or verified data
    // -------------------------------------------------------------------------
    const hackAttemptRes = await fetch(`${API_BASE}/fdrs/${fdrAId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${instAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isBankVerified: true,
        status: 'VERIFIED_ACTIVE',
        bankVerifiedData: {
          confirmedAmount: 99999999,
          lienMarkedToAICTE: true
        }
      })
    });
    const hackAttemptData = await hackAttemptRes.json();

    // Verify record state from server
    const verifyStateRes = await fetch(`${API_BASE}/fdrs/${fdrAId}`, {
      headers: { Authorization: `Bearer ${instAToken}` }
    });
    const verifyStateData = await verifyStateRes.json();
    const currentFdr = verifyStateData.data?.fdr;

    assert(
      currentFdr.status === 'SUBMITTED' &&
      currentFdr.isBankVerified === false &&
      currentFdr.bankVerifiedData?.confirmedAmount !== 99999999,
      'Test 8: Institution cannot manipulate verification fields (status remains SUBMITTED, isBankVerified=false)',
      `Current Status: ${currentFdr.status}, isBankVerified: ${currentFdr.isBankVerified}`
    );

    // -------------------------------------------------------------------------
    // Test 9: Officer/admin can view FDR records across institutions
    // -------------------------------------------------------------------------
    const officerListRes = await fetch(`${API_BASE}/fdrs`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const officerListData = await officerListRes.json();
    const officerSeesA = officerListData.data?.fdrs?.some(f => f.fdrNumber === uniqueFdrA);
    const officerSeesB = officerListData.data?.fdrs?.some(f => f.fdrNumber === uniqueFdrB);

    const adminViewARes = await fetch(`${API_BASE}/fdrs/${fdrAId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminViewBRes = await fetch(`${API_BASE}/fdrs/${fdrBId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(
      officerListRes.status === 200 &&
      officerSeesA &&
      officerSeesB &&
      adminViewARes.status === 200 &&
      adminViewBRes.status === 200,
      'Test 9: Officer & Admin can view FDR records across multiple institutions',
      `Officer sees A: ${officerSeesA}, Officer sees B: ${officerSeesB}`
    );

    // -------------------------------------------------------------------------
    // Test 10: Pagination, filters, and authenticated document download
    // -------------------------------------------------------------------------
    // 10a. Pagination
    const pageRes = await fetch(`${API_BASE}/fdrs?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const pageData = await pageRes.json();
    const paginationWorks = pageData.data?.count === 1 && pageData.data?.total >= 2 && pageData.data?.totalPages >= 2;

    // 10b. Filter by status
    const filterRes = await fetch(`${API_BASE}/fdrs?status=SUBMITTED`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const filterData = await filterRes.json();
    const filterWorks = filterData.data?.fdrs?.every(f => f.status === 'SUBMITTED');

    // 10c. Search by FDR Number
    const searchRes = await fetch(`${API_BASE}/fdrs?search=${uniqueFdrA}`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const searchData = await searchRes.json();
    const searchWorks = searchData.data?.fdrs?.some(f => f.fdrNumber === uniqueFdrA);

    // 10d. Authenticated Document Download
    const downloadRes = await fetch(`${API_BASE}/fdrs/${fdrAId}/download-document`, {
      headers: { Authorization: `Bearer ${instAToken}` }
    });
    const downloadBuffer = await downloadRes.arrayBuffer();
    const downloadWorks = downloadRes.status === 200 && downloadBuffer.byteLength > 0;

    // 10e. Unauthorized Document Download (Institution B cannot download Institution A document)
    const unauthDownloadRes = await fetch(`${API_BASE}/fdrs/${fdrAId}/download-document`, {
      headers: { Authorization: `Bearer ${instBToken}` }
    });
    const unauthDownloadWorks = unauthDownloadRes.status === 403;

    assert(
      paginationWorks && filterWorks && searchWorks && downloadWorks && unauthDownloadWorks,
      'Test 10: Pagination, status filter, keyword search, and secure authenticated document download work',
      `Pagination: ${paginationWorks}, Filter: ${filterWorks}, Search: ${searchWorks}, Download: ${downloadWorks}, Download Guard: ${unauthDownloadWorks}`
    );

  } catch (err) {
    console.error('[Error during test execution]:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
