import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import BankVerificationModal from '../../components/fdr/BankVerificationModal';
import VerificationResultModal from '../../components/fdr/VerificationResultModal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  AlertOctagon,
  RefreshCw,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink,
  Eye,
  ShieldCheck
} from 'lucide-react';

const DiscrepancyQueuePage = () => {
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFdr, setSelectedFdr] = useState(null);
  const [selectedReportFdr, setSelectedReportFdr] = useState(null);

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fdrs?status=DISCREPANCY_FLAGGED');
      setFdrs(res.data.data.fdrs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-600" /> Discrepancy Queue & Case Management
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Active FDRs flagged for amount mismatch, missing AICTE joint lien endorsement, or maturity conflicts
          </p>
        </div>
        <button
          onClick={fetchDiscrepancies}
          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden" style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Claimed vs Bank Amount</th>
                <th className="py-3 px-4">Flagged Reason / Audit Note</th>
                <th className="py-3 px-4">Flagged On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading discrepancies...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No active discrepancies in queue! All verified records are synchronized.
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => (
                  <tr key={fdr._id} className="hover:bg-brand-cream/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                      <div>{fdr.institutionId?.name || 'Institution'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {fdr.institutionId?.aictePermanentId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {fdr.fdrNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{formatCurrency(fdr.amount)}</div>
                      {fdr.isBankVerified && (
                        <div className="text-[10px] font-semibold text-rose-600">
                          Bank CBS: {formatCurrency(fdr.bankVerifiedData?.confirmedAmount)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-[11px] leading-relaxed">
                        {fdr.discrepancy?.reason || 'Mismatch detected'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDateTime(fdr.discrepancy?.flaggedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReportFdr(fdr)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Report
                      </button>
                      <button
                        onClick={() => setSelectedFdr(fdr)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-xs transition"
                      >
                        Re-Audit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFdr && (
        <BankVerificationModal
          isOpen={!!selectedFdr}
          onClose={() => setSelectedFdr(null)}
          fdr={selectedFdr}
          onActionComplete={fetchDiscrepancies}
        />
      )}

      {selectedReportFdr && (
        <VerificationResultModal
          isOpen={!!selectedReportFdr}
          onClose={() => setSelectedReportFdr(null)}
          fdrId={selectedReportFdr._id}
          fdrNumber={selectedReportFdr.fdrNumber}
        />
      )}
    </div>
  );
};

export default DiscrepancyQueuePage;
