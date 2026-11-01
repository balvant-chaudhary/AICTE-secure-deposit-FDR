import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  FileCheck2,
  RefreshCw,
  Building2,
  KeyRound,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const ReleaseReviewPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests?type=RELEASE&status=PENDING');
      setRequests(res.data.data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRecommend = async (e) => {
    e.preventDefault();
    if (!officerRemarks.trim()) {
      alert('Please enter your officer review comments / clearance verification.');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/requests/${selectedReq._id}/officer-recommend`, {
        remarks: officerRemarks
      });
      alert('Release request verified and recommended to AICTE Admin for final approval order.');
      setSelectedReq(null);
      setOfficerRemarks('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-purple-700" /> Release & Refund Clearance Review Queue
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Review institution security deposit refund requests, verify compliance NOCs, and formulate recommendations for AICTE Admin
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden" style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Refund Amount</th>
                <th className="py-3 px-4">Grounds / Reason</th>
                <th className="py-3 px-4">Beneficiary Bank Account</th>
                <th className="py-3 px-4 text-right">Clearance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading clearance queue...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No pending release requests requiring officer clearance.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-brand-cream/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                      <div>{req.institutionId?.name || 'Institution'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {req.institutionId?.aictePermanentId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {req.fdrId?.fdrNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(req.fdrId?.amount)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-semibold">{req.releaseDetails?.beneficiaryAccount?.bankName}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        A/C: {req.releaseDetails?.beneficiaryAccount?.accountNumber} ({req.releaseDetails?.beneficiaryAccount?.ifscCode})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setOfficerRemarks(
                            'Institution course tenure completed. Verified zero outstanding student dues or AICTE fines. Recommended for release.'
                          );
                        }}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg text-xs shadow-xs transition"
                      >
                        Inspect & Recommend
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`Officer Clearance Review: ${selectedReq.fdrId?.fdrNumber}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleRecommend} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Institution:</span>
                <span className="font-bold text-slate-900">{selectedReq.institutionId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security Deposit Sum:</span>
                <span className="font-bold text-purple-700">{formatCurrency(selectedReq.fdrId?.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-medium text-slate-800">
                  {selectedReq.releaseDetails?.beneficiaryAccount?.beneficiaryName}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Grounds for Release Stated by Institution:
              </label>
              <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-200 text-xs">
                {selectedReq.reason}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                AICTE Officer Clearance Assessment & Remarks *
              </label>
              <textarea
                required
                rows={3}
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                placeholder="Record your verification findings regarding student grievances, AICTE compliance, and NOC..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs"
              />
            </div>

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
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Recommend for Admin Authorization
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ReleaseReviewPage;
