import { VERIFICATION_STATUS, SIMULATION_SCENARIOS } from '../models/BankVerification.js';

/**
 * Deterministically infer simulation scenario from requested parameter or FDR number
 */
export const determineScenario = (fdr, requestedScenario) => {
  if (requestedScenario && Object.values(SIMULATION_SCENARIOS).includes(requestedScenario)) {
    return requestedScenario;
  }

  const fdrNum = (fdr.fdrNumber || '').toUpperCase();

  if (fdrNum.includes('NOT_FOUND') || fdrNum.includes('NOTFOUND')) {
    return SIMULATION_SCENARIOS.FDR_NOT_FOUND;
  }
  if (fdrNum.includes('AMOUNT_DIFF') || fdrNum.includes('DIFF') || fdrNum.includes('DISCREPANCY')) {
    return SIMULATION_SCENARIOS.AMOUNT_MISMATCH;
  }
  if (fdrNum.includes('DATE_DIFF') || fdrNum.includes('DATE_MISMATCH')) {
    return SIMULATION_SCENARIOS.MATURITY_DATE_MISMATCH;
  }
  if (fdrNum.includes('IFSC_DIFF') || fdrNum.includes('IFSC_MISMATCH')) {
    return SIMULATION_SCENARIOS.IFSC_MISMATCH;
  }
  if (fdrNum.includes('NOLIEN') || fdrNum.includes('NO_LIEN')) {
    return SIMULATION_SCENARIOS.LIEN_NOT_MARKED;
  }
  if (fdrNum.includes('MULTI') || fdrNum.includes('MULTIPLE')) {
    return SIMULATION_SCENARIOS.MULTIPLE_DISCREPANCIES;
  }

  return SIMULATION_SCENARIOS.ALL_MATCH;
};

/**
 * Generate simulated Bank Core-Banking System (CBS) confirmed details
 */
export const generateSimulatedBankData = (fdr, scenario) => {
  const submittedAmount = Number(fdr.amount) || 0;
  const submittedDepositDate = new Date(fdr.depositDate);
  const submittedMaturityDate = new Date(fdr.maturityDate);

  const bankRefNum = `CBS-${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Default to 100% matching details
  const confirmed = {
    fdrNumber: fdr.fdrNumber,
    bankName: fdr.bankName,
    branchName: fdr.branchName,
    ifscCode: fdr.ifscCode,
    amount: submittedAmount,
    depositDate: submittedDepositDate,
    maturityDate: submittedMaturityDate,
    lienMarkedToAICTE: true,
    bankReferenceNumber: bankRefNum,
    cbsStatus: 'ACTIVE_DEPOSIT',
    accountHolderName: fdr.jointAccountHolder || 'Member Secretary, AICTE & Principal/Director'
  };

  // Apply deterministic deviations based on scenario
  switch (scenario) {
    case SIMULATION_SCENARIOS.AMOUNT_MISMATCH:
      // Bank records show 20% lower deposit amount
      confirmed.amount = Math.round(submittedAmount * 0.8);
      break;

    case SIMULATION_SCENARIOS.MATURITY_DATE_MISMATCH: {
      // Bank records show maturity 180 days (6 months) earlier
      const alteredDate = new Date(submittedMaturityDate);
      alteredDate.setDate(alteredDate.getDate() - 180);
      confirmed.maturityDate = alteredDate;
      break;
    }

    case SIMULATION_SCENARIOS.IFSC_MISMATCH: {
      // Bank branch IFSC differs
      const prefix = fdr.ifscCode.slice(0, 4);
      confirmed.ifscCode = `${prefix}0999999`;
      break;
    }

    case SIMULATION_SCENARIOS.FDR_NOT_FOUND:
      confirmed.fdrNumber = 'NOT_FOUND_IN_CBS';
      confirmed.cbsStatus = 'RECORD_NOT_FOUND';
      confirmed.amount = 0;
      confirmed.depositDate = null;
      confirmed.maturityDate = null;
      confirmed.lienMarkedToAICTE = false;
      confirmed.bankReferenceNumber = 'CBS-NOT-FOUND';
      confirmed.accountHolderName = 'N/A';
      break;

    case SIMULATION_SCENARIOS.LIEN_NOT_MARKED:
      confirmed.lienMarkedToAICTE = false;
      break;

    case SIMULATION_SCENARIOS.MULTIPLE_DISCREPANCIES: {
      confirmed.amount = Math.round(submittedAmount * 0.75);
      const alteredDate = new Date(submittedMaturityDate);
      alteredDate.setDate(alteredDate.getDate() - 180);
      confirmed.maturityDate = alteredDate;
      confirmed.lienMarkedToAICTE = false;
      const prefix = fdr.ifscCode.slice(0, 4);
      confirmed.ifscCode = `${prefix}0999999`;
      break;
    }

    case SIMULATION_SCENARIOS.ALL_MATCH:
    default:
      // Keep perfect match
      break;
  }

  return confirmed;
};

/**
 * Execute field-by-field comparison between submitted FDR and simulated bank CBS record
 */
export const compareFdrWithBankData = (fdr, confirmed, scenario) => {
  const discrepancyReasons = [];

  // 1. FDR Number Check
  const fdrNumberMatch =
    scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND &&
    fdr.fdrNumber.trim().toUpperCase() === confirmed.fdrNumber.trim().toUpperCase();

  const fdrNumberComparison = {
    submitted: fdr.fdrNumber,
    confirmed: confirmed.fdrNumber,
    match: fdrNumberMatch,
    remarks: fdrNumberMatch
      ? 'FDR number exists and is active in Core Banking System'
      : 'FDR receipt number not found in bank Core Banking System (CBS)'
  };
  if (!fdrNumberMatch) {
    discrepancyReasons.push(
      `FDR receipt number '${fdr.fdrNumber}' was not found in ${fdr.bankName} Core Banking records.`
    );
  }

  // 2. Bank Name Check
  const bankNameMatch =
    fdr.bankName.trim().toLowerCase() === confirmed.bankName.trim().toLowerCase();
  const bankNameComparison = {
    submitted: fdr.bankName,
    confirmed: confirmed.bankName,
    match: bankNameMatch
  };
  if (!bankNameMatch && scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND) {
    discrepancyReasons.push(
      `Bank name mismatch: Submitted '${fdr.bankName}' vs CBS confirmed '${confirmed.bankName}'.`
    );
  }

  // 3. Branch Name Check
  const branchNameMatch =
    fdr.branchName.trim().toLowerCase() === confirmed.branchName.trim().toLowerCase();
  const branchNameComparison = {
    submitted: fdr.branchName,
    confirmed: confirmed.branchName,
    match: branchNameMatch
  };
  if (!branchNameMatch && scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND) {
    discrepancyReasons.push(
      `Branch name mismatch: Submitted '${fdr.branchName}' vs CBS confirmed '${confirmed.branchName}'.`
    );
  }

  // 4. IFSC Code Check
  const ifscMatch =
    fdr.ifscCode.trim().toUpperCase() === confirmed.ifscCode.trim().toUpperCase();
  const ifscComparison = {
    submitted: fdr.ifscCode,
    confirmed: confirmed.ifscCode,
    match: ifscMatch
  };
  if (!ifscMatch && scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND) {
    discrepancyReasons.push(
      `Branch IFSC code mismatch: Submitted '${fdr.ifscCode}' vs CBS confirmed branch IFSC '${confirmed.ifscCode}'.`
    );
  }

  // 5. Deposit Amount Check
  const submittedAmount = Number(fdr.amount);
  const confirmedAmount = Number(confirmed.amount);
  const amountMatch = submittedAmount === confirmedAmount;
  const amountDifference = submittedAmount - confirmedAmount;

  const amountComparison = {
    submitted: submittedAmount,
    confirmed: confirmedAmount,
    match: amountMatch,
    difference: amountDifference
  };
  if (!amountMatch && scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND) {
    discrepancyReasons.push(
      `Deposit amount discrepancy: Institution claimed ₹${submittedAmount.toLocaleString('en-IN')}, but bank CBS confirms ₹${confirmedAmount.toLocaleString('en-IN')} (Difference: ₹${amountDifference.toLocaleString('en-IN')}).`
    );
  }

  // 6. Maturity Date Check
  let dateMatch = false;
  let diffDays = 0;
  if (confirmed.maturityDate) {
    const subMatDate = new Date(fdr.maturityDate);
    const confMatDate = new Date(confirmed.maturityDate);
    diffDays = Math.round((subMatDate.getTime() - confMatDate.getTime()) / (1000 * 60 * 60 * 24));
    dateMatch = Math.abs(diffDays) === 0;
  }

  const maturityDateComparison = {
    submitted: fdr.maturityDate,
    confirmed: confirmed.maturityDate,
    match: dateMatch,
    diffDays
  };
  if (!dateMatch && scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND) {
    const confDateStr = confirmed.maturityDate ? new Date(confirmed.maturityDate).toISOString().split('T')[0] : 'None';
    const subDateStr = new Date(fdr.maturityDate).toISOString().split('T')[0];
    discrepancyReasons.push(
      `Maturity date discrepancy: Bank records indicate maturity on ${confDateStr}, while institution submitted ${subDateStr} (${Math.abs(diffDays)} days difference).`
    );
  }

  // 7. AICTE Lien Marking Check
  const lienMatch = confirmed.lienMarkedToAICTE === true;
  const lienComparison = {
    submitted: true,
    confirmed: confirmed.lienMarkedToAICTE,
    match: lienMatch
  };
  if (!lienMatch && scenario !== SIMULATION_SCENARIOS.FDR_NOT_FOUND) {
    discrepancyReasons.push(
      'Lien not marked in favour of AICTE: Bank CBS records indicate deposit does not carry exclusive lien/joint custody endorsement to Member Secretary, AICTE.'
    );
  }

  // Determine Overall Status
  let status;
  if (scenario === SIMULATION_SCENARIOS.FDR_NOT_FOUND || !fdrNumberMatch) {
    status = VERIFICATION_STATUS.NOT_FOUND;
  } else if (discrepancyReasons.length > 0) {
    status = VERIFICATION_STATUS.DISCREPANCY_FOUND;
  } else {
    status = VERIFICATION_STATUS.VERIFIED;
  }

  return {
    status,
    discrepancyReasons,
    fieldComparisons: {
      fdrNumber: fdrNumberComparison,
      bankName: bankNameComparison,
      branchName: branchNameComparison,
      ifscCode: ifscComparison,
      amount: amountComparison,
      maturityDate: maturityDateComparison,
      lienMarked: lienComparison
    }
  };
};

/**
 * High-level orchestration service for executing simulated bank verification
 */
export const runBankVerification = async (fdr, requestedScenario = null) => {
  // Simulate network latency (200ms) for realistic experience
  await new Promise((resolve) => setTimeout(resolve, 200));

  const scenario = determineScenario(fdr, requestedScenario);
  const confirmedDetails = generateSimulatedBankData(fdr, scenario);
  const comparisonResult = compareFdrWithBankData(fdr, confirmedDetails, scenario);

  const verificationReference = `VRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  return {
    verificationReference,
    simulationScenario: scenario,
    status: comparisonResult.status,
    submittedDetails: {
      fdrNumber: fdr.fdrNumber,
      bankName: fdr.bankName,
      branchName: fdr.branchName,
      ifscCode: fdr.ifscCode,
      amount: fdr.amount,
      depositDate: fdr.depositDate,
      maturityDate: fdr.maturityDate,
      jointAccountHolder: fdr.jointAccountHolder || ''
    },
    confirmedDetails,
    fieldComparisons: comparisonResult.fieldComparisons,
    discrepancyReasons: comparisonResult.discrepancyReasons,
    isSimulated: true
  };
};
