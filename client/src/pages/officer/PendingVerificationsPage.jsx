import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import BankVerificationModal from '../../components/fdr/BankVerificationModal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  CheckCircle,
  Building2,
  FileText,
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
} from 'lucide-react';

const PendingVerificationsPage = () => {
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFdr, setSelectedFdr] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fdrs?status=SUBMITTED');
      setFdrs(res.data.data.fdrs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const filtered = fdrs.filter(
    (f) =>
      f.fdrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.institutionId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(247,127,0,0.12)' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#F77F00' }} />
            </span>
            Pending FDR Verifications Desk
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Perform simulated bank CBS lookups, cross-verify amount &amp; AICTE lien, and activate deposits
          </p>
        </div>
        <button
          onClick={fetchPending}
          className="btn-ghost text-xs shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-3 shadow-card"
        style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Institution, FDR Number, or Bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field input-with-icon pl-11"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden"
        style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th>Institution Name</th>
                <th>FDR Number</th>
                <th>Bank &amp; Branch</th>
                <th>Claimed Amount</th>
                <th>Maturity Date</th>
                <th>Receipt Scan</th>
                <th className="text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">Loading pending queue...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No submissions currently pending initial verification.
                  </td>
                </tr>
              ) : (
                filtered.map((fdr) => (
                  <tr key={fdr._id}>
                    <td>
                      <div className="font-semibold text-brand-navy">{fdr.institutionId?.name || 'Institution'}</div>
                      <div className="text-[10px] text-brand-muted font-mono">ID: {fdr.institutionId?.aictePermanentId}</div>
                    </td>
                    <td className="font-mono font-bold text-brand-navy">{fdr.fdrNumber}</td>
                    <td>
                      <div className="font-semibold text-brand-navy">{fdr.bankName}</div>
                      <div className="text-[10px] text-brand-muted">{fdr.branchName} ({fdr.ifscCode})</div>
                    </td>
                    <td className="font-bold text-brand-navy">{formatCurrency(fdr.amount)}</td>
                    <td className="text-brand-muted">{formatDate(fdr.maturityDate)}</td>
                    <td>
                      <a
                        href={`http://localhost:5000${fdr.documentUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                        style={{ color: '#F77F00' }}
                      >
                        <Download className="w-3.5 h-3.5" /> View Receipt
                      </a>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedFdr(fdr)}
                        className="btn-bhagwa ml-auto text-[11px] py-1.5 px-3"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Run CBS Verification
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
          onActionComplete={fetchPending}
        />
      )}
    </div>
  );
};

export default PendingVerificationsPage;
