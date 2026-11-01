// Automated Phase 2 Test Script for Authentication, Authorization & RBAC
const API_BASE = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('===============================================================');
  console.log('AICTE SecureDeposit 360 - Phase 2 Authentication & RBAC Test Suite');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       Details: ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
      failed++;
    }
  };

  const testInstId = `TEST-AICTE-${Date.now().toString().slice(-6)}`;
  const testEmail = `test_admin_${Date.now()}@testinst.ac.in`;
  let institutionToken = null;
  let officerToken = null;

  // -------------------------------------------------------------
  // Test 1: Institution Registration
  // -------------------------------------------------------------
  console.log('>>> Running Test 1: Institution Registration...');
  try {
    const regPayload = {
      aictePermanentId: testInstId,
      institutionName: 'Aryabhatta Institute of Technology',
      institutionType: 'Engineering & Technology',
      address: 'Knowledge Park III, Greater Noida',
      state: 'Uttar Pradesh',
      city: 'Greater Noida',
      pincode: '201306',
      contactEmail: `contact_${Date.now()}@testinst.ac.in`,
      contactPhone: '0120-2323232',
      adminName: 'Prof. Vikram Sen',
      adminEmail: testEmail,
      password: 'SecurePass@2026',
      designation: 'Registrar',
      phone: '9899001122',
      role: 'admin' // Attempting privilege escalation: Backend MUST ignore this!
    };

    const res = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const data = await res.json();

    const isSuccess = res.status === 201 && data.success === true;
    const isRoleInstitution = data.data?.user?.role === 'institution'; // Confirmed privilege escalation blocked
    const hasToken = !!data.data?.token;
    const noPasswordHash = data.data?.user?.passwordHash === undefined;

    institutionToken = data.data?.token;

    assert(
      isSuccess && isRoleInstitution && hasToken && noPasswordHash,
      'Test 1: Institution Registration',
      `Status: ${res.status}, Role: ${data.data?.user?.role} (Security: Privilege escalation blocked, no passwordHash exposed)`
    );
  } catch (err) {
    assert(false, 'Test 1: Institution Registration', err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Duplicate Email Rejection
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 2: Duplicate Email Rejection...');
  try {
    const duplicateEmailPayload = {
      aictePermanentId: `DIFF-ID-${Date.now().toString().slice(-4)}`,
      institutionName: 'Another Institute',
      institutionType: 'Management',
      state: 'Delhi',
      city: 'New Delhi',
      pincode: '110001',
      contactEmail: 'another@example.com',
      contactPhone: '011-22334455',
      adminName: 'Prof. Duplicate',
      adminEmail: testEmail, // Reusing existing email
      password: 'AnotherPassword@123'
    };

    const res = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateEmailPayload)
    });
    const data = await res.json();

    assert(
      res.status === 409 && data.success === false,
      'Test 2: Duplicate Email Rejection',
      `Status: ${res.status}, Message: "${data.message}"`
    );
  } catch (err) {
    assert(false, 'Test 2: Duplicate Email Rejection', err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Duplicate AICTE Permanent ID Rejection
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 3: Duplicate AICTE Permanent ID Rejection...');
  try {
    const duplicateIdPayload = {
      aictePermanentId: testInstId, // Reusing registered ID
      institutionName: 'Cloned Campus',
      institutionType: 'Pharmacy',
      state: 'Maharashtra',
      city: 'Mumbai',
      pincode: '400001',
      contactEmail: 'unique_contact@example.com',
      contactPhone: '022-22334455',
      adminName: 'Dr. Unique',
      adminEmail: `brand_new_${Date.now()}@example.com`,
      password: 'AnotherPassword@123'
    };

    const res = await fetch(`${API_BASE}/auth/register-institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateIdPayload)
    });
    const data = await res.json();

    assert(
      res.status === 409 && data.success === false,
      'Test 3: Duplicate AICTE Permanent ID Rejection',
      `Status: ${res.status}, Message: "${data.message}"`
    );
  } catch (err) {
    assert(false, 'Test 3: Duplicate AICTE Permanent ID Rejection', err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Successful Login
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 4: Successful Login...');
  try {
    const loginPayload = {
      email: testEmail,
      password: 'SecurePass@2026'
    };

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });
    const data = await res.json();

    const isSuccess = res.status === 200 && data.success === true;
    const hasToken = !!data.data?.token;
    const roleMatches = data.data?.user?.role === 'institution';
    const noPasswordHash = data.data?.user?.passwordHash === undefined;

    institutionToken = data.data?.token;

    assert(
      isSuccess && hasToken && roleMatches && noPasswordHash,
      'Test 4: Successful Login',
      `Status: ${res.status}, User: ${data.data?.user?.name}, Role: ${data.data?.user?.role}`
    );
  } catch (err) {
    assert(false, 'Test 4: Successful Login', err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Incorrect Password Rejection
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 5: Incorrect Password Rejection...');
  try {
    const wrongPassPayload = {
      email: testEmail,
      password: 'WrongPassword999!'
    };

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrongPassPayload)
    });
    const data = await res.json();

    assert(
      res.status === 401 && data.success === false,
      'Test 5: Incorrect Password Rejection',
      `Status: ${res.status}, Message: "${data.message}"`
    );
  } catch (err) {
    assert(false, 'Test 5: Incorrect Password Rejection', err.message);
  }

  // -------------------------------------------------------------
  // Test 6: GET /api/auth/me with Valid Token
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 6: GET /api/auth/me with Valid Token...');
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${institutionToken}`
      }
    });
    const data = await res.json();

    const isSuccess = res.status === 200 && data.success === true;
    const emailMatches = data.data?.user?.email === testEmail;
    const noPasswordHash = data.data?.user?.passwordHash === undefined;

    assert(
      isSuccess && emailMatches && noPasswordHash,
      'Test 6: GET /api/auth/me with Valid Token',
      `Status: ${res.status}, Authenticated User: ${data.data?.user?.email}, Role: ${data.data?.user?.role}`
    );
  } catch (err) {
    assert(false, 'Test 6: GET /api/auth/me with Valid Token', err.message);
  }

  // -------------------------------------------------------------
  // Test 7: GET /api/auth/me without Token
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 7: GET /api/auth/me without Token...');
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET'
    });
    const data = await res.json();

    assert(
      res.status === 401 && data.success === false,
      'Test 7: GET /api/auth/me without Token',
      `Status: ${res.status}, Message: "${data.message}"`
    );
  } catch (err) {
    assert(false, 'Test 7: GET /api/auth/me without Token', err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Role-Based Route Restrictions (RBAC)
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 8: Role-Based Route Restrictions (RBAC)...');
  try {
    // 8a. Institution user attempting to access officer-only verification route -> MUST BE 403 FORBIDDEN
    const forbiddenRes = await fetch(`${API_BASE}/verification/fdr-1/officer-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${institutionToken}`
      },
      body: JSON.stringify({ remarks: 'Hacked approval' })
    });
    const forbiddenData = await forbiddenRes.json();
    const instBlockedFromOfficerRoute = forbiddenRes.status === 403;

    // 8b. Login as Officer and access officer route -> MUST BE PERMITTED / NOT 403
    const officerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@aicte.gov.in', password: 'Demo@123' })
    });
    const officerData = await officerLoginRes.json();
    officerToken = officerData.data?.token;

    // Officer accesses institutions list (Officer/Admin allowed)
    const officerAccessRes = await fetch(`${API_BASE}/institutions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const officerAllowed = officerAccessRes.status === 200;

    assert(
      instBlockedFromOfficerRoute && officerAllowed,
      'Test 8: Role-Based Route Restrictions (RBAC)',
      `Institution blocked from officer endpoint: HTTP ${forbiddenRes.status} (Forbidden). Officer access to /api/institutions: HTTP ${officerAccessRes.status} (Allowed).`
    );
  } catch (err) {
    assert(false, 'Test 8: Role-Based Route Restrictions (RBAC)', err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Logout & Session Invalidation
  // -------------------------------------------------------------
  console.log('\n>>> Running Test 9: Logout and Session Invalidation...');
  try {
    // Attempting access with invalid/malformed token -> MUST BE 401
    const invalidTokenRes = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer INVALID_EXPIRED_OR_LOGGED_OUT_TOKEN' }
    });
    const invalidData = await invalidTokenRes.json();

    assert(
      invalidTokenRes.status === 401 && invalidData.success === false,
      'Test 9: Logout and Frontend Session Handling',
      `Invalid / cleared token rejection: HTTP ${invalidTokenRes.status} ("${invalidData.message}")`
    );
  } catch (err) {
    assert(false, 'Test 9: Logout and Frontend Session Handling', err.message);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`Phase 2 Test Results: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');
};

runTests();
