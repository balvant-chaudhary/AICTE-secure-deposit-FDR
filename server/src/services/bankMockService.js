/**
 * Simulated Bank Core-Banking (CBS) Verification Engine
 * SIH26265 Prototype Service: Simulates independent verification with public & private sector banks
 * (State Bank of India, Punjab National Bank, Canara Bank, HDFC Bank, ICICI Bank, etc.)
 */

export const simulateBankVerification = async (fdrData) => {
  // Simulate network latency of bank API (300ms)
  await new Promise((resolve) => setTimeout(resolve, 300));

  const fdrNum = fdrData.fdrNumber?.toUpperCase() || '';
  const claimedAmount = Number(fdrData.amount) || 0;
  const claimedDate = new Date(fdrData.maturityDate);

  // Deterministic simulation based on FDR number keywords for hackathon demonstration:
  // If FDR number contains "DISCREPANCY" or "DIFF" -> simulate amount discrepancy
  // If FDR number contains "NOLIEN" -> simulate missing AICTE lien
  // If FDR number contains "EXPIRED" -> simulate already matured/cancelled
  // Otherwise -> Perfect verified match with AICTE lien marked

  let isMatch = true;
  let lienMarked = true;
  let confirmedAmount = claimedAmount;
  let confirmedMaturityDate = claimedDate;
  let discrepancyReasons = [];
  let simulationScenario = 'STANDARD_VERIFIED';

  if (fdrNum.includes('DIFF') || fdrNum.includes('DISCREPANCY')) {
    simulationScenario = 'AMOUNT_DISCREPANCY';
    // Bank shows lesser amount than institution claimed
    confirmedAmount = Math.round(claimedAmount * 0.8);
    discrepancyReasons.push(
      `Bank records show deposited amount ₹${confirmedAmount.toLocaleString('en-IN')}, whereas institution claimed ₹${claimedAmount.toLocaleString('en-IN')}.`
    );
    isMatch = false;
  } else if (fdrNum.includes('NOLIEN')) {
    simulationScenario = 'NO_AICTE_LIEN';
    lienMarked = false;
    discrepancyReasons.push(
      'Bank certificate does NOT show AICTE lien marking / joint custody endorsement in core CBS records.'
    );
    isMatch = false;
  } else if (fdrNum.includes('DATE_MISMATCH')) {
    simulationScenario = 'DATE_MISMATCH';
    // Bank maturity date is 6 months earlier
    const alteredDate = new Date(claimedDate);
    alteredDate.setMonth(alteredDate.getMonth() - 6);
    confirmedMaturityDate = alteredDate;
    discrepancyReasons.push(
      `Bank CBS indicates maturity date ${confirmedMaturityDate.toISOString().split('T')[0]}, mismatched with claimed date ${claimedDate.toISOString().split('T')[0]}.`
    );
    isMatch = false;
  }

  const verificationCode = `BANK-VER-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  return {
    success: true,
    simulationScenario,
    isMatch,
    verificationCode,
    bankVerifiedData: {
      bankReferenceNumber: `CBS-${Math.floor(10000000 + Math.random() * 90000000)}`,
      confirmedAmount,
      confirmedMaturityDate,
      lienMarkedToAICTE: lienMarked,
      verificationTimestamp: new Date(),
      verificationCode,
      rawSimulationPayload: {
        queriedBank: fdrData.bankName,
        queriedBranch: fdrData.branchName,
        queriedIFSC: fdrData.ifscCode,
        accountHolderName: fdrData.jointAccountHolder || 'Joint AICTE & Institution',
        cbsStatus: 'ACTIVE_DEPOSIT',
        lienMarked: lienMarked,
        lienHolder: lienMarked ? 'Member Secretary, AICTE' : 'None',
        interestRate: '6.75% p.a.',
        depositTenureMonths: 36
      }
    },
    discrepancyReasons
  };
};
