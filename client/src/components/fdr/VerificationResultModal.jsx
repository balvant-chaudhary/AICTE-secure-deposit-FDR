import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Layers
} from 'lucide-react';

const VerificationResultModal = ({ isOpen, onClose, fdrId, fdrNumber }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

  useEffect(() => {
    if (isOpen && fdrId) {
      fetchVerification();
    }
  }, [isOpen, fdrId]);

  const fetchVerification = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/verification/${fdrId}`);
      setData(res.data.data);
      setSelectedHistoryIndex(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load verification record');
    } finally {
      setLoading(false);
    }
  };

  const activeVerification = data?.history?.[selectedHistoryIndex] || data?.latestVerification;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bank Verification Report: ${fdrNumber || data?.fdr?.fdrNumber || 'FDR'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Prototype Notice */}
        <div className="px-3.5 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-200 text-amber-800 uppercase tracking-wider">
              Simulated CBS Engine
            </span>
            <span>SIH26265 Prototype Mode: Demonstrates autonomous bank cross-check & discrepancy detection.</span>
          </div>
          <span className="text-[11px] font-mono text-amber-700">Storage: Persistent MongoDB</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading verification report from database...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center">
            {error}
          </div>
        ) : !activeVerification ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Bank Verification Run Yet</p>
            <p className="text-slate-500 mt-1">This FDR is currently pending initial verification by an authorized AICTE officer.</p>
          </div>
        ) : (
          <>
            {/* Header / Summary Card */}
            <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-300">
                    Ref: {activeVerification.verificationReference}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      activeVerification.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : activeVerification.status === 'NOT_FOUND'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    }`}
                  >
                    {activeVerification.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2">
                  <span>Scenario: <strong className="text-white">{activeVerification.simulationScenario}</strong></span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-0.5 sm:text-right">
                <div className="flex sm:justify-end items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{new Date(activeVerification.verifiedAt).toLocaleString('en-IN')}</span>
                </div>
                {activeVerification.verifiedBy && (
                  <div className="text-[11px] text-slate-400">
                    Verified by: {activeVerification.verifiedBy.name} ({activeVerification.verifiedBy.role || 'Officer'})
                  </div>
                )}
              </div>
            </div>

            {/* Verification History Tabs (if reverified) */}
            {data?.history?.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                  <Layers className="w-3.5 h-3.5" /> History ({data.history.length}):
                </span>
                {data.history.map((h, i) => (
                  <button
                    key={h._id || i}
                    onClick={() => setSelectedHistoryIndex(i)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      selectedHistoryIndex === i
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Run #{data.history.length - i} ({h.status})
                  </button>
                ))}
              </div>
            )}

            {/* Field-by-Field Side-by-Side Comparison Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Field-by-Field CBS Comparison Analysis</span>
                <span className="text-[11px] text-slate-500 font-normal">7 Core Parameters Audited</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3.5">FDR Attribute</th>
                      <th className="py-2.5 px-3.5">Institution Claimed</th>
                      <th className="py-2.5 px-3.5">Bank CBS Confirmed</th>
                      <th className="py-2.5 px-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* 1. FDR Number */}
                    <tr>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">FDR Receipt Number</td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-900">{activeVerification.submittedDetails.fdrNumber}</td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-800">
                        {activeVerification.confirmedDetails.fdrNumber || 'RECORD_NOT_FOUND'}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.fdrNumber?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Not Found
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* 2. Bank Name */}
                    <tr>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">Bank Name</td>
                      <td className="py-2.5 px-3.5 text-slate-900">{activeVerification.submittedDetails.bankName}</td>
                      <td className="py-2.5 px-3.5 text-slate-800">{activeVerification.confirmedDetails.bankName || 'N/A'}</td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.bankName?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* 3. Branch Name */}
                    <tr>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">Branch Name</td>
                      <td className="py-2.5 px-3.5 text-slate-900">{activeVerification.submittedDetails.branchName}</td>
                      <td className="py-2.5 px-3.5 text-slate-800">{activeVerification.confirmedDetails.branchName || 'N/A'}</td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.branchName?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* 4. IFSC Code */}
                    <tr>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">Branch IFSC Code</td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-900">{activeVerification.submittedDetails.ifscCode}</td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-800">{activeVerification.confirmedDetails.ifscCode || 'N/A'}</td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.ifscCode?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* 5. Deposit Amount */}
                    <tr className={!activeVerification.fieldComparisons.amount?.match ? 'bg-rose-50/30' : ''}>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">Principal Deposit Amount</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {formatCurrency(activeVerification.submittedDetails.amount)}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-800">
                        {formatCurrency(activeVerification.confirmedDetails.amount)}
                        {activeVerification.fieldComparisons.amount?.difference !== 0 && (
                          <span className="block text-[10px] text-rose-600 font-normal">
                            Diff: -{formatCurrency(activeVerification.fieldComparisons.amount.difference)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.amount?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* 6. Maturity Date */}
                    <tr className={!activeVerification.fieldComparisons.maturityDate?.match ? 'bg-rose-50/30' : ''}>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">Maturity Date</td>
                      <td className="py-2.5 px-3.5 text-slate-900">{formatDate(activeVerification.submittedDetails.maturityDate)}</td>
                      <td className="py-2.5 px-3.5 text-slate-800">
                        {formatDate(activeVerification.confirmedDetails.maturityDate)}
                        {activeVerification.fieldComparisons.maturityDate?.diffDays !== 0 && (
                          <span className="block text-[10px] text-rose-600 font-normal">
                            {Math.abs(activeVerification.fieldComparisons.maturityDate.diffDays)} days earlier
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.maturityDate?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Mismatch
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* 7. AICTE Lien Marked */}
                    <tr className={!activeVerification.fieldComparisons.lienMarked?.match ? 'bg-rose-50/30' : ''}>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">AICTE Lien Endorsement</td>
                      <td className="py-2.5 px-3.5 text-slate-900">Required (Claimed)</td>
                      <td className="py-2.5 px-3.5 text-slate-800">
                        {activeVerification.confirmedDetails.lienMarkedToAICTE ? (
                          <span className="text-emerald-700 font-semibold">Active Lien in favour of AICTE</span>
                        ) : (
                          <span className="text-rose-700 font-semibold">NO LIEN ENDORSED</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {activeVerification.fieldComparisons.lienMarked?.match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Not Marked
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discrepancy Reasons Alert */}
            {activeVerification.discrepancyReasons?.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Identified Discrepancy Reasons ({activeVerification.discrepancyReasons.length}):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-rose-800 pl-1">
                  {activeVerification.discrepancyReasons.map((reason, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Core Banking Audit Metadata */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-slate-400 font-medium">CBS Reference Number: </span>
                <span className="font-mono font-bold text-slate-800">
                  {activeVerification.confirmedDetails.bankReferenceNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">CBS Status: </span>
                <span className="font-semibold text-slate-800">
                  {activeVerification.confirmedDetails.cbsStatus || 'UNKNOWN'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Account Title: </span>
                <span className="font-semibold text-slate-800">
                  {activeVerification.confirmedDetails.accountHolderName || 'N/A'}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VerificationResultModal;
