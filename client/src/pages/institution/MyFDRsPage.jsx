import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fdrService } from '../../services/fdrService';
import StatusBadge from '../../components/common/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  FolderGit2,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted (Pending)' },
  { value: 'UNDER_VERIFICATION', label: 'Under Verification' },
  { value: 'VERIFIED_ACTIVE', label: 'Verified & Active' },
  { value: 'DISCREPANCY_FLAGGED', label: 'Discrepancy Flagged' },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon (< 60D)' },
  { value: 'MATURED', label: 'Matured' },
  { value: 'RENEWAL_PENDING', label: 'Renewal Pending' },
  { value: 'RELEASE_PENDING', label: 'Release Pending' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'REJECTED', label: 'Rejected' },
];

const MyFDRsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fdrs, setFdrs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const fetchFDRs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await fdrService.getFDRs(params);
      setFdrs(res.data?.fdrs || []);
      setTotal(res.data?.total || res.data?.fdrs?.length || 0);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load FDRs:', err);
      setError('Unable to load FDR records. Please check network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFDRs(); }, [statusFilter, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFDRs();
  };

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    if (val) setSearchParams({ status: val });
    else setSearchParams({});
  };

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(247,127,0,0.12)' }}>
              <FolderGit2 className="w-5 h-5" style={{ color: '#F77F00' }} />
            </span>
            My Security Deposits &amp; FDR Records
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Complete inventory of active, maturing, and under-review deposits registered with AICTE
          </p>
        </div>
        <button
          onClick={() => navigate('/institution/submit-fdr')}
          className="btn-bhagwa shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Submit New FDR
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl shadow-card p-4 flex flex-col md:flex-row items-center justify-between gap-3"
        style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <form onSubmit={handleSearch} className="relative w-full md:w-80 flex items-center gap-2">
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 pointer-events-none" />
            <input
              type="text"
              placeholder="Search FDR Number or Bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field input-with-icon pl-11"
            />
          </div>
          <button type="submit" className="btn-navy py-2 px-3 shrink-0 text-xs">Search</button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-brand-muted shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="input-field w-full md:w-auto py-2"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === '' ? `${o.label} (${total})` : o.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPage(1);
              setSearchParams({});
              fetchFDRs();
            }}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'rgba(0,48,73,0.07)', color: '#003049' }}
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error fade-up">
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#D62828' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden"
        style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-base">
            <thead>
              <tr>
                <th>FDR Number</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Deposit Date</th>
                <th>Maturity Date</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-brand-muted">Loading records from AICTE depository...</td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center space-y-3">
                    <p className="text-brand-muted">No FDR records found matching your filters.</p>
                    <button
                      onClick={() => navigate('/institution/submit-fdr')}
                      className="btn-bhagwa mx-auto text-xs"
                    >
                      Submit an FDR
                    </button>
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => (
                  <tr key={fdr._id}>
                    <td className="font-mono font-bold text-brand-navy">{fdr.fdrNumber}</td>
                    <td>
                      <div className="font-semibold text-brand-navy">{fdr.bankName}</div>
                      <div className="text-[10px] text-brand-muted truncate max-w-[140px]">{fdr.branchName}</div>
                    </td>
                    <td className="font-bold text-brand-navy">{formatCurrency(fdr.amount)}</td>
                    <td className="text-brand-muted">{formatDate(fdr.depositDate)}</td>
                    <td className="font-medium text-brand-navy">{formatDate(fdr.maturityDate)}</td>
                    <td><StatusBadge status={fdr.status} /></td>
                    <td className="text-brand-muted">{formatDate(fdr.createdAt)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/institution/fdrs/${fdr._id}`)}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-150"
                        style={{ background: 'rgba(247,127,0,0.10)', color: '#c96200' }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between text-xs text-brand-muted"
            style={{ borderTop: '1px solid rgba(234,226,183,0.7)' }}>
            <span>Page {page} of {totalPages} ({total} records)</span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: '1px solid rgba(234,226,183,0.8)', background: 'rgba(234,226,183,0.3)' }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: '1px solid rgba(234,226,183,0.8)', background: 'rgba(234,226,183,0.3)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFDRsPage;
