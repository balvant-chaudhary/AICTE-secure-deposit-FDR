import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  FolderGit2,
  Search,
  Filter,
  RefreshCw,
  Download,
  Building2,
  ExternalLink
} from 'lucide-react';

const AllFDRsPage = () => {
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAllFDRs = async () => {
    try {
      setLoading(true);
      let query = '/fdrs?';
      if (statusFilter) query += `status=${statusFilter}&`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      const res = await api.get(query);
      setFdrs(res.data.data.fdrs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFDRs();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAllFDRs();
  };

  const exportCSV = () => {
    if (fdrs.length === 0) return;
    const headers = ['FDR Number', 'Institution', 'Permanent ID', 'Bank', 'Branch', 'IFSC', 'Amount', 'Deposit Date', 'Maturity Date', 'Status'];
    const rows = fdrs.map((f) => [
      f.fdrNumber,
      `"${f.institutionId?.name || ''}"`,
      f.institutionId?.aictePermanentId || '',
      f.bankName,
      `"${f.branchName}"`,
      f.ifscCode,
      f.amount,
      f.depositDate ? f.depositDate.split('T')[0] : '',
      f.maturityDate ? f.maturityDate.split('T')[0] : '',
      f.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AICTE_FDR_Registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-purple-700" /> Nationwide Security Deposit & FDR Depository
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Complete regulatory ledger of all security deposits submitted across technical institutions in India
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
        >
          <Download className="w-4 h-4" /> Export CSV Ledger
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full md:w-80 flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search FDR Number, Bank, or Institute..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field input-with-icon pl-11 text-xs py-2"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED_ACTIVE">Active & Verified</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="MATURED">Matured</option>
            <option value="DISCREPANCY_FLAGGED">Discrepancy Flagged</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="RELEASE_PENDING">Release Under Review</option>
            <option value="RELEASED">Discharged & Released</option>
          </select>
          <button
            onClick={fetchAllFDRs}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden" style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Bank & Branch</th>
                <th className="py-3 px-4">Deposit Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading depository records...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching deposit records found.
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => (
                  <tr key={fdr._id} className="hover:bg-brand-cream/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                      <div>{fdr.institutionId?.name || 'Institution'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {fdr.institutionId?.aictePermanentId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {fdr.fdrNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{fdr.bankName}</div>
                      <div className="text-[11px] text-slate-400">{fdr.branchName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {formatCurrency(fdr.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {formatDate(fdr.maturityDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={fdr.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/institution/fdrs/${fdr._id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition"
                      >
                        Inspect
                      </button>
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

export default AllFDRsPage;
