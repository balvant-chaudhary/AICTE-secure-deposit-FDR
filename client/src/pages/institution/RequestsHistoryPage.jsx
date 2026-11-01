import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { GitPullRequest, RefreshCw, Clock, CheckCircle2, XCircle, FileText, ArrowRight } from 'lucide-react';

const RequestsHistoryPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
          <GitPullRequest className="w-6 h-6 text-brand-bhagwa" /> Renewal & Release Requests History
        </h1>
        <p className="text-xs text-brand-muted mt-1">
          Track official petitions filed for FDR renewals, tenure extensions, and refund releases
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden" style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th className="py-3 px-4">Request Type</th>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Proposed Details</th>
                <th className="py-3 px-4">Reason / Justification</th>
                <th className="py-3 px-4">Approval Stage</th>
                <th className="py-3 px-4">Submitted On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No lifecycle requests submitted yet.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-brand-cream/20 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-md text-[11px] ${
                          req.requestType === 'RELEASE'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {req.requestType === 'RELEASE' ? 'Refund / Release' : 'FDR Renewal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {req.fdrId?.fdrNumber || 'FDR Record'}
                    </td>
                    <td className="py-3 px-4">
                      {req.requestType === 'RELEASE' ? (
                        <div className="text-[11px] text-slate-700">
                          Account: <strong>{req.releaseDetails?.beneficiaryAccount?.bankName}</strong> ({req.releaseDetails?.beneficiaryAccount?.accountNumber})
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-700">
                          New Maturity: <strong>{formatDate(req.renewalDetails?.newMaturityDate)}</strong>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="py-3 px-4">
                      {req.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Under Officer Review
                        </span>
                      ) : req.status === 'OFFICER_RECOMMENDED' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold text-[11px] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          <CheckCircle2 className="w-3 h-3" /> Officer Recommended (Admin Pending)
                        </span>
                      ) : req.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Approved ({req.approvalOrderNumber})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatDateTime(req.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RequestsHistoryPage;
