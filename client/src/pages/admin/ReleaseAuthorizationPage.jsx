import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  ShieldCheck,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

const ReleaseAuthorizationPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [orderNumber, setOrderNumber] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecommendedRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests?type=RELEASE&status=OFFICER_RECOMMENDED');
      setRequests(res.data.data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendedRequests();
  }, []);

  const openDecisionModal = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setOrderNumber(`AICTE/REL-ORD/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
    setAdminRemarks('');
  };

  const handleDecision = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/requests/${selectedReq._id}/admin-decision`, {
        decision: actionType,
        orderNumber: actionType === 'APPROVE' ? orderNumber : '',
        remarks: adminRemarks
      });

      alert(
        actionType === 'APPROVE'
          ? `Security deposit release order ${orderNumber} approved! FDR lien officially discharged.`
          : 'Release petition rejected.'
      );
      setSelectedReq(null);
      fetchRecommendedRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-purple-700" /> Apex Release Authorization Console
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Authoritative approval desk for discharging institutional security deposits and issuing official AICTE refund sanction orders
          </p>
        </div>
        <button
          onClick={fetchRecommendedRequests}
          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
        <span>
          <strong>Strict Protocol:</strong> Only petitions vetted and recommended by an authorized AICTE Regional Officer appear here. Approving a release discharges the joint lien and marks the FDR as Officially Released.
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden" style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Deposit Amount</th>
                <th className="py-3 px-4">Officer Recommendation Note</th>
                <th className="py-3 px-4">Beneficiary Refund Bank</th>
                <th className="py-3 px-4 text-right">Admin Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading recommended petitions...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No release petitions currently awaiting final Admin authorization.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-brand-cream/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                      <div>{req.institutionId?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {req.institutionId?.aictePermanentId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {req.fdrId?.fdrNumber}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-purple-800">
                      {formatCurrency(req.fdrId?.amount)}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-[11px]">
                        <strong>Officer Note:</strong> {req.officerRemarks}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-semibold">{req.releaseDetails?.beneficiaryAccount?.beneficiaryName}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {req.releaseDetails?.beneficiaryAccount?.bankName} ({req.releaseDetails?.beneficiaryAccount?.accountNumber})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => openDecisionModal(req, 'APPROVE')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
                      >
                        Authorize Release
                      </button>
                      <button
                        onClick={() => openDecisionModal(req, 'REJECT')}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold rounded-lg text-xs transition"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={
            actionType === 'APPROVE'
              ? `Authorize Final Release: ${selectedReq.fdrId?.fdrNumber}`
              : `Reject Release Petition: ${selectedReq.fdrId?.fdrNumber}`
          }
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleDecision} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary Institution:</span>
                <span className="font-bold text-slate-900">{selectedReq.institutionId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Release Disbursal Amount:</span>
                <span className="font-extrabold text-purple-700">{formatCurrency(selectedReq.fdrId?.amount)}</span>
              </div>
            </div>

            {actionType === 'APPROVE' ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official AICTE Release Order Reference Number *
                </label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono font-bold uppercase text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  rows={3}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Specify grounds for refusing security deposit release..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 text-white font-bold rounded-lg shadow-xs transition disabled:opacity-50 ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting
                  ? 'Processing...'
                  : actionType === 'APPROVE'
                  ? 'Confirm Sanction & Issue Order'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ReleaseAuthorizationPage;
