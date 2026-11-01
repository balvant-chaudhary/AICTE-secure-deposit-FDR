import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Play
} from 'lucide-react';

const SCENARIOS = [
  { id: 'ALL_MATCH', label: '1. All Details Match', desc: 'Perfect CBS match. Verified Active.' },
  { id: 'AMOUNT_MISMATCH', label: '2. Amount Mismatch', desc: 'Bank shows 20% lower deposit amount.' },
  { id: 'MATURITY_DATE_MISMATCH', label: '3. Maturity Date Mismatch', desc: 'Bank records mature 6 months earlier.' },
  { id: 'IFSC_MISMATCH', label: '4. IFSC Branch Mismatch', desc: 'Branch relocated/different IFSC.' },
  { id: 'FDR_NOT_FOUND', label: '5. FDR Not Found', desc: 'No deposit record in core CBS.' },
  { id: 'LIEN_NOT_MARKED', label: '6. AICTE Lien Missing', desc: 'Deposit lacks AICTE exclusive lien.' },
  { id: 'MULTIPLE_DISCREPANCIES', label: '7. Multiple Discrepancies', desc: 'Amount + Date + Lien mismatch.' }
];

const BankVerificationModal = ({ isOpen, onClose, fdr, onActionComplete }) => {
  const [selectedScenario, setSelectedScenario] = useState('ALL_MATCH');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');

  const runVerification = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post(`/verification/${fdr._id}/verify`, {
        scenario: selectedScenario,
        remarks: officerRemarks
      });
      setVerificationResult(res.data.data.verification);
      if (onActionComplete) onActionComplete(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute bank CBS verification');
    } finally {
      setLoading(false);
    }
  };

  if (!fdr) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Simulated Bank CBS Verification: ${fdr.fdrNumber}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Prototype Header Banner */}
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-xs text-blue-900 uppercase tracking-wide">
                Target Bank: {fdr.bankName} ({fdr.branchName})
              </span>
            </div>
            <p className="text-xs text-blue-800/80 mt-1">
              IFSC: <span className="font-mono font-semibold">{fdr.ifscCode}</span> | Claimed Amount: <strong className="text-blue-900">{formatCurrency(fdr.amount)}</strong>
            </p>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-full bg-blue-200/80 text-blue-800 border border-blue-300">
            Simulated CBS Environment
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Simulation Scenario Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-brand-navy uppercase tracking-wider block">
            Select Simulation Test Scenario (Controlled SIH Test Engine):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {SCENARIOS.map((s) => (
              <label
                key={s.id}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedScenario === s.id
                    ? 'border-brand-bhagwa bg-brand-bhagwa/10 ring-1 ring-brand-bhagwa shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-brand-cream/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-navy">{s.label}</span>
                  <input
                    type="radio"
                    name="scenario"
                    value={s.id}
                    checked={selectedScenario === s.id}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                    className="accent-brand-bhagwa cursor-pointer"
                  />
                </div>
                <span className="text-[11px] text-brand-muted mt-1">{s.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Officer Remarks & Run Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <input
            type="text"
            placeholder="Officer audit remarks (optional)"
            value={officerRemarks}
            onChange={(e) => setOfficerRemarks(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
          />
          <button
            onClick={runVerification}
            disabled={loading}
            className="btn-bhagwa w-full sm:w-auto py-2.5 px-5 text-xs font-bold"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Querying Core Banking Records...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run Simulated CBS Verification
              </>
            )}
          </button>
        </div>

        {/* Verification Result Showcase */}
        {verificationResult && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 text-white">
              <div>
                <span className="text-[11px] font-mono text-indigo-300 block">
                  Reference: {verificationResult.verificationReference}
                </span>
                <span className="text-xs font-bold">
                  Status:{' '}
                  <span
                    className={
                      verificationResult.status === 'VERIFIED'
                        ? 'text-emerald-400'
                        : verificationResult.status === 'NOT_FOUND'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }
                  >
                    {verificationResult.status}
                  </span>
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  verificationResult.status === 'VERIFIED'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {verificationResult.status === 'VERIFIED' ? 'FDR Activated' : 'Discrepancy Flagged'}
              </span>
            </div>

            {/* Field-by-Field Mini Comparison */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">Submitted</th>
                    <th className="p-2.5">CBS Confirmed</th>
                    <th className="p-2.5 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(verificationResult.fieldComparisons || {}).map(([key, val]) => (
                    <tr key={key}>
                      <td className="p-2.5 font-semibold capitalize text-slate-700">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </td>
                      <td className="p-2.5 text-slate-800">
                        {key === 'amount'
                          ? formatCurrency(val.submitted)
                          : key.includes('Date')
                          ? formatDate(val.submitted)
                          : String(val.submitted)}
                      </td>
                      <td className="p-2.5 text-slate-800">
                        {key === 'amount'
                          ? formatCurrency(val.confirmed)
                          : key.includes('Date')
                          ? formatDate(val.confirmed)
                          : String(val.confirmed)}
                      </td>
                      <td className="p-2.5 text-center">
                        {val.match ? (
                          <span className="text-emerald-600 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Match
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Diff
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Discrepancies Alert */}
            {verificationResult.discrepancyReasons?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <span className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Discrepancies Recorded & Institution Alerted:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                  {verificationResult.discrepancyReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-brand-cream/70">
          <button
            onClick={onClose}
            className="btn-navy py-2 px-6 text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BankVerificationModal;
