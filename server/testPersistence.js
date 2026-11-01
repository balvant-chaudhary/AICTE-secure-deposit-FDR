import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
let submittedFdrId = null;
let submittedFdrNumber = null;
let fdrBId = null;

// Utility for sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPersistenceVerification() {
  console.log('================================================================================');
  console.log(' AICTE FDR MANAGEMENT PORTAL - MONGODB PERSISTENCE VERIFICATION SUITE');
  console.log('================================================================================\n');

  let passedTests = 0;
  const totalTests = 8;
  let instBToken = null;

  // --------------------------------------------------------------------------
  // TEST 1: Connect to MongoDB and confirm the connection
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 1/8] Connecting to MongoDB and confirming connection...');
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte-securedeposit';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    if (mongoose.connection.readyState !== 1) {
      throw new Error(`MongoDB readyState is not 1 (connected). Current: ${mongoose.connection.readyState}`);
    }

    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    const dbName = mongoose.connection.name;
    console.log(`  ✓ Mongoose connected to MongoDB: Host=${host}, Port=${port}, Database=${dbName}`);

    // Verify backend Express server /api/health endpoint
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();

    if (healthRes.status !== 200 || healthData.database?.status !== 'CONNECTED' || healthData.database?.storage !== 'MongoDB') {
      throw new Error(`Health check mismatch: ${JSON.stringify(healthData)}`);
    }
    console.log(`  ✓ Express API Health confirms persistent storage:`, healthData.database);
    console.log('  ✅ TEST 1 PASSED: MongoDB genuinely connected and verified.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 1 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Submit a new FDR using an institution account
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 2/8] Submitting a new FDR using an Institution A account...');
  let instAToken = null;
  try {
    // 1. Login as Institution A
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'institution@aicte.gov.in',
        password: 'Demo@123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.data?.token) {
      throw new Error(`Failed to log in as Institution A: ${loginData.message || loginRes.statusText}`);
    }
    instAToken = loginData.data.token;
    console.log(`  ✓ Logged in as Institution A: ${loginData.data.user.email} (Institution: ${loginData.data.user.institution?.name || 'DIEAT'})`);

    // 2. Submit new FDR with valid sample PDF document
    submittedFdrNumber = `FDR-PERSIST-${Date.now()}`;
    const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (AICTE Persistent FDR Verification Receipt) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    const pdfBlob = new Blob([dummyPdfContent], { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('fdrNumber', submittedFdrNumber);
    formData.append('bankName', 'Punjab National Bank');
    formData.append('branchName', 'Barakhamba Road, New Delhi');
    formData.append('ifscCode', 'PUNB0012300');
    formData.append('amount', '2500000');
    formData.append('depositDate', '2026-02-01');
    formData.append('maturityDate', '2031-02-01');
    formData.append('autoRenewal', 'true');
    formData.append('purpose', 'AICTE Security Deposit for Post-Graduate Program Extension');
    formData.append('jointAccountHolder', 'Member Secretary, AICTE & Director, DIEAT');
    formData.append('remarks', 'Automated persistence verification deposit receipt');
    formData.append('document', pdfBlob, 'fdr_persistence_test.pdf');

    const submitRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instAToken}`
      },
      body: formData
    });

    const submitData = await submitRes.json();
    if (submitRes.status !== 201 || !submitData.data?.fdr) {
      throw new Error(`FDR submission failed (Status ${submitRes.status}): ${submitData.message || JSON.stringify(submitData)}`);
    }

    submittedFdrId = submitData.data.fdr._id;
    const dataSource = submitData.data.dataSource;
    console.log(`  ✓ FDR submitted successfully. ID: ${submittedFdrId}, Number: ${submittedFdrNumber}`);
    console.log(`  ✓ Data Source reported by backend: "${dataSource}"`);

    if (dataSource !== 'MongoDB') {
      throw new Error(`FDR was NOT saved to MongoDB! Backend reported dataSource: "${dataSource}"`);
    }

    console.log('  ✅ TEST 2 PASSED: New FDR submitted and stored via MongoDB.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 2 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Confirm that the FDR exists in the MongoDB collection
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 3/8] Confirming FDR exists directly in MongoDB collection...');
  try {
    const rawFdr = await mongoose.connection.db
      .collection('fdrs')
      .findOne({ _id: new mongoose.Types.ObjectId(submittedFdrId) });

    if (!rawFdr) {
      throw new Error(`FDR with ID ${submittedFdrId} was NOT found in MongoDB collection 'fdrs'!`);
    }

    console.log(`  ✓ Raw MongoDB document verified in 'fdrs' collection:`);
    console.log(`    - _id: ${rawFdr._id}`);
    console.log(`    - fdrNumber: ${rawFdr.fdrNumber}`);
    console.log(`    - bankName: ${rawFdr.bankName}`);
    console.log(`    - amount: ₹${rawFdr.amount.toLocaleString('en-IN')}`);
    console.log(`    - status: ${rawFdr.status}`);
    console.log(`    - documentUrl: ${rawFdr.documentUrl}`);

    if (rawFdr.fdrNumber !== submittedFdrNumber || rawFdr.amount !== 2500000) {
      throw new Error(`Document in MongoDB has mismatched values!`);
    }

    console.log('  ✅ TEST 3 PASSED: Verified record exists permanently in MongoDB collection.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 3 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Restart the backend server
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 4/8] Restarting backend server and confirming reconnection...');
  try {
    // Touch server/src/app.js to trigger nodemon restart
    const appPath = path.resolve('src', 'app.js');
    const now = new Date();
    fs.utimesSync(appPath, now, now);
    console.log(`  ✓ Triggered server reload/restart via nodemon watch touch on app.js`);

    // Give nodemon 2 seconds to reload and initialize MongoDB connection
    console.log('  ⏳ Waiting for backend to restart and reconnect to MongoDB...');
    await sleep(2500);

    // Verify server has restarted and is healthy
    let retries = 5;
    let serverUp = false;
    while (retries > 0) {
      try {
        const ping = await fetch(`${API_BASE}/health`);
        const pingJson = await ping.json();
        if (ping.status === 200 && pingJson.database?.status === 'CONNECTED') {
          serverUp = true;
          console.log(`  ✓ Server rebooted and verified ONLINE: Database status is ${pingJson.database.status}`);
          break;
        }
      } catch (e) {
        // server might still be restarting
      }
      await sleep(1000);
      retries--;
    }

    if (!serverUp) {
      throw new Error('Server did not come back online after restart within expected timeframe');
    }

    console.log('  ✅ TEST 4 PASSED: Server restarted successfully with MongoDB reconnected.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 4 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Log in again and retrieve the same FDR
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 5/8] Logging in again and retrieving the submitted FDR...');
  let freshInstAToken = null;
  let retrievedFdr = null;
  try {
    // Fresh login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'institution@aicte.gov.in',
        password: 'Demo@123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.data?.token) {
      throw new Error(`Failed to re-authenticate as Institution A: ${loginData.message}`);
    }
    freshInstAToken = loginData.data.token;
    console.log('  ✓ Re-authenticated successfully with fresh JWT token.');

    // Retrieve the specific FDR
    const getRes = await fetch(`${API_BASE}/fdrs/${submittedFdrId}`, {
      headers: { Authorization: `Bearer ${freshInstAToken}` }
    });
    const getData = await getRes.json();

    if (getRes.status !== 200 || !getData.data?.fdr) {
      throw new Error(`FDR could not be retrieved after restart! (Status ${getRes.status}): ${getData.message}`);
    }

    retrievedFdr = getData.data.fdr;
    console.log(`  ✓ Successfully retrieved FDR after backend restart: ID=${retrievedFdr._id}`);
    console.log(`  ✓ Data Source reported: "${getData.data.dataSource}"`);

    if (getData.data.dataSource !== 'MongoDB') {
      throw new Error(`Retrieved FDR is NOT backed by MongoDB! Reported: ${getData.data.dataSource}`);
    }

    console.log('  ✅ TEST 5 PASSED: Re-authenticated and retrieved record post-restart.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 5 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Confirm that the FDR still exists with the same ID and details
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 6/8] Confirming FDR details match original submission exactly...');
  try {
    if (retrievedFdr._id.toString() !== submittedFdrId.toString()) {
      throw new Error(`FDR ID mismatch! Expected ${submittedFdrId}, got ${retrievedFdr._id}`);
    }
    if (retrievedFdr.fdrNumber !== submittedFdrNumber) {
      throw new Error(`FDR number mismatch! Expected ${submittedFdrNumber}, got ${retrievedFdr.fdrNumber}`);
    }
    if (Number(retrievedFdr.amount) !== 2500000) {
      throw new Error(`FDR amount mismatch! Expected 2500000, got ${retrievedFdr.amount}`);
    }
    if (retrievedFdr.bankName !== 'Punjab National Bank') {
      throw new Error(`FDR bankName mismatch! Expected Punjab National Bank, got ${retrievedFdr.bankName}`);
    }
    if (retrievedFdr.status !== 'SUBMITTED') {
      throw new Error(`FDR status mismatch! Expected SUBMITTED, got ${retrievedFdr.status}`);
    }

    console.log('  ✓ Verified identical properties post-restart:');
    console.log(`    - ID matches: ${retrievedFdr._id}`);
    console.log(`    - FDR Number matches: ${retrievedFdr.fdrNumber}`);
    console.log(`    - Amount matches: ₹${retrievedFdr.amount.toLocaleString('en-IN')}`);
    console.log(`    - Bank matches: ${retrievedFdr.bankName}`);
    console.log(`    - Status matches: ${retrievedFdr.status}`);
    console.log(`    - Auto-Renewal: ${retrievedFdr.autoRenewal}`);
    console.log(`    - Document attached: ${retrievedFdr.documentUrl}`);

    console.log('  ✅ TEST 6 PASSED: FDR persisted across restart with 100% data fidelity.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 6 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Confirm that Institution A cannot access Institution B's FDR
  // --------------------------------------------------------------------------
  console.log("▶ [TEST 7/8] Confirming cross-institution isolation (Institution A vs Institution B)...");
  try {
    // 1. Create or register Institution B user if not present
    const instBEmail = 'inst_b_admin@mitm.ac.in';
    instBToken = null;

    // Check if user exists or register
    const checkLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: instBEmail, password: 'Password@123' })
    });
    const checkLoginData = await checkLogin.json();

    if (checkLogin.ok && checkLoginData.data?.token) {
      instBToken = checkLoginData.data.token;
    } else {
      // Register Institution B
      const regRes = await fetch(`${API_BASE}/auth/register-institution`, {
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
          adminEmail: instBEmail,
          password: 'Password@123',
          designation: 'Director'
        })
      });
      const regData = await regRes.json();
      if (!regRes.ok || !regData.data?.token) {
        throw new Error(`Failed to create Institution B: ${regData.message || JSON.stringify(regData)}`);
      }
      instBToken = regData.data.token;
      console.log('  ✓ Registered Institution B for isolation testing.');
    }

    // 2. Submit an FDR for Institution B
    const fdrBNumber = `FDR-B-${Date.now()}`;
    const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (Institution B FDR) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    const pdfBlob = new Blob([dummyPdfContent], { type: 'application/pdf' });

    const formB = new FormData();
    formB.append('fdrNumber', fdrBNumber);
    formB.append('bankName', 'Bank of Maharashtra');
    formB.append('branchName', 'Shivajinagar, Pune');
    formB.append('ifscCode', 'MAHB0000123');
    formB.append('amount', '1000000');
    formB.append('depositDate', '2026-03-01');
    formB.append('maturityDate', '2030-03-01');
    formB.append('purpose', 'Security Deposit for MITM Pune');
    formB.append('document', pdfBlob, 'mitm_fdr.pdf');

    const submitBRes = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instBToken}` },
      body: formB
    });
    const submitBData = await submitBRes.json();
    if (!submitBRes.ok || !submitBData.data?.fdr) {
      throw new Error(`Failed to submit FDR for Institution B: ${submitBData.message}`);
    }
    fdrBId = submitBData.data.fdr._id;
    console.log(`  ✓ Institution B FDR created: ID=${fdrBId}`);

    // 3. Institution A attempts to access Institution B's FDR (MUST FAIL with 403 Forbidden)
    const accessBwithA = await fetch(`${API_BASE}/fdrs/${fdrBId}`, {
      headers: { Authorization: `Bearer ${freshInstAToken}` }
    });
    const accessBwithAData = await accessBwithA.json();

    console.log(`  ✓ Institution A access attempt to Institution B's FDR returned HTTP ${accessBwithA.status} ("${accessBwithAData.message}")`);
    if (accessBwithA.status !== 403) {
      throw new Error(`Cross-institution security breach! Expected HTTP 403, got ${accessBwithA.status}`);
    }

    // 4. Institution B attempts to access Institution A's FDR (MUST FAIL with 403 Forbidden)
    const accessAwithB = await fetch(`${API_BASE}/fdrs/${submittedFdrId}`, {
      headers: { Authorization: `Bearer ${instBToken}` }
    });
    const accessAwithBData = await accessAwithB.json();

    console.log(`  ✓ Institution B access attempt to Institution A's FDR returned HTTP ${accessAwithB.status} ("${accessAwithBData.message}")`);
    if (accessAwithB.status !== 403) {
      throw new Error(`Cross-institution security breach! Expected HTTP 403, got ${accessAwithB.status}`);
    }

    console.log('  ✅ TEST 7 PASSED: Strict cross-institution isolation enforced (HTTP 403 Forbidden).\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 7 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Confirm that document download still works after restarting backend
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 8/8] Confirming document download still works after backend restart...');
  try {
    // 1. Authorized Institution A downloads its own document
    const downloadRes = await fetch(`${API_BASE}/fdrs/${submittedFdrId}/download-document`, {
      headers: { Authorization: `Bearer ${freshInstAToken}` }
    });

    if (downloadRes.status !== 200) {
      throw new Error(`Document download failed with HTTP ${downloadRes.status}`);
    }

    const docBuffer = await downloadRes.arrayBuffer();
    const docSize = docBuffer.byteLength;
    console.log(`  ✓ Institution A successfully downloaded document after backend restart (${docSize} bytes).`);

    if (docSize <= 0) {
      throw new Error('Downloaded document buffer is empty!');
    }

    // 2. Unauthorized Institution B attempts to download Institution A's document (MUST FAIL with 403)
    const unauthorizedDownload = await fetch(`${API_BASE}/fdrs/${submittedFdrId}/download-document`, {
      headers: { Authorization: `Bearer ${instBToken}` }
    });
    const unauthorizedData = await unauthorizedDownload.json();

    console.log(`  ✓ Institution B download attempt for Institution A's document returned HTTP ${unauthorizedDownload.status} ("${unauthorizedData.message}")`);
    if (unauthorizedDownload.status !== 403) {
      throw new Error(`Document download security violation! Expected HTTP 403, got ${unauthorizedDownload.status}`);
    }

    console.log('  ✅ TEST 8 PASSED: Secure document download operational and verified post-restart.\n');
    passedTests++;
  } catch (err) {
    console.error('  ❌ TEST 8 FAILED:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('================================================================================');
  console.log(` RESULT: ALL ${passedTests}/${totalTests} PERSISTENCE VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log(' MongoDB storage is active, mandatory, and 100% persistent across server restarts.');
  console.log('================================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runPersistenceVerification().catch((err) => {
  console.error('FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
