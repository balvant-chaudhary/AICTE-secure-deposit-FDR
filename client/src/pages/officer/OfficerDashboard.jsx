import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import BankVerificationModal from '../../components/fdr/BankVerificationModal';
import VerificationResultModal from '../../components/fdr/VerificationResultModal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Award,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Eye,
  Play,
  FileCheck2,
} from 'lucide-react';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    verifiedCount: 0,
    discrepancyCount: 0,
    notFoundCount: 0,
  });
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedVerifyFdr, setSelectedVerifyFdr] = useState(null);
  const [selectedResultFdr, setSelectedResultFdr] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [verifRes, fdrsRes] = await Promise.all([
        api.get('/verification'),
        api.get('/fdrs?limit=100'),
      ]);
      if (verifRes.data.data?.metrics) setMetrics(verifRes.data.data.metrics);
      setFdrs(fdrsRes.data.data.fdrs || []);
    } catch (err) {
      console.error('Failed to load officer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const filteredFdrs = fdrs.filter((f) => {
    const matchesSearch =
      f.fdrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.institutionId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.bankName?.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && f.status === 'SUBMITTED';
    if (statusFilter === 'VERIFIED') return matchesSearch && f.status === 'VERIFIED_ACTIVE';
    if (statusFilter === 'DISCREPANCY') return matchesSearch && f.status === 'DISCREPANCY_FLAGGED';
    return matchesSearch;
  });

  const metricCards = [
    {
      label: 'Pending Verifications',
      value: metrics.pendingCount,
      sub: 'Awaiting officer CBS audit',
      icon: Clock,
      bgColor: 'rgba(247,127,0,0.08)',
      borderColor: 'rgba(247,127,0,0.25)',
      iconBg: 'rgba(247,127,0,0.12)',
      iconColor: '#c96200',
      valColor: '#003049',
    },
    {
      label: 'Verified & Active',
      value: metrics.verifiedCount,
      sub: '100% CBS match confirmed',
      icon: CheckCircle2,
      bgColor: 'rgba(22,134,92,0.06)',
      borderColor: 'rgba(22,134,92,0.2)',
      iconBg: 'rgba(22,134,92,0.10)',
      iconColor: '#16865C',
      valColor: '#003049',
    },
    {
      label: 'Discrepancies Flagged',
      value: metrics.discrepancyCount,
      sub: 'Amount/Date/Lien mismatch',
      icon: AlertTriangle,
      bgColor: 'rgba(214,40,40,0.06)',
      borderColor: 'rgba(214,40,40,0.2)',
      iconBg: 'rgba(214,40,40,0.09)',
      iconColor: '#D62828',
      valColor: '#003049',
    },
    {
      label: 'FDR Not Found',
      value: metrics.notFoundCount,
      sub: 'Unregistered in bank CBS',
      icon: HelpCircle,
      bgColor: 'rgba(100,116,139,0.06)',
      borderColor: 'rgba(100,116,139,0.18)',
      iconBg: 'rgba(100,116,139,0.09)',
      iconColor: '#64748B',
      valColor: '#003049',
    },
  ];

  const filterTabs = [
    { id: 'ALL', label: 'All Records' },
    { id: 'PENDING', label: 'Pending Review' },
    { id: 'VERIFIED', label: 'Verified' },
    { id: 'DISCREPANCY', label: 'Discrepancy' },
  ];

  return (
    <div className="space-y-6 fade-up">
      {/* Banner */}
      <div className="page-banner">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
          style={{ background: 'rgba(22,134,92,0.18)', color: '#86efac', border: '1px solid rgba(22,134,92,0.35)' }}>
          <Award className="w-3.5 h-3.5" />
          AICTE Officer Console
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Welcome, Officer {user?.name || 'Regional Officer'}
            </h1>
            <p className="text-xs mt-1 max-w-xl" style={{ color: 'rgba(234,226,183,0.75)' }}>
              Simulated Bank Verification & Discrepancy Detection active. Cross-check institution FDR claims against CBS records with full audit trails.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((mc) => {
          const Icon = mc.icon;
          return (
            <div key={mc.label}
              className="rounded-2xl p-5 flex items-center justify-between shadow-card hover:shadow-card-hover transition-all duration-200"
              style={{ background: mc.bgColor, border: `1px solid ${mc.borderColor}` }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: mc.iconColor }}>{mc.label}</span>
                <div className="text-2xl font-extrabold font-display mt-1" style={{ color: mc.valColor }}>{mc.value}</div>
                <span className="text-[10px] mt-0.5 block" style={{ color: mc.iconColor + 'cc' }}>{mc.sub}</span>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: mc.iconBg }}>
                <Icon className="w-6 h-6" style={{ color: mc.iconColor }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main FDR Table Panel */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden"
        style={{ border: '1px solid rgba(234,226,183,0.7)' }}>

        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(234,226,183,0.7)' }}>
          <div>
            <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
              <FileCheck2 className="w-5 h-5" style={{ color: '#F77F00' }} />
              FDR Bank Verification & Discrepancy Console
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Simulate CBS cross-checks, inspect comparisons, and enforce persistent compliance.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl text-xs font-semibold shrink-0"
            style={{ background: 'rgba(234,226,183,0.4)', border: '1px solid rgba(234,226,183,0.8)' }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className="px-3 py-1.5 rounded-lg transition-all duration-150"
                style={statusFilter === tab.id
                  ? { background: '#003049', color: '#FCBF49', fontWeight: 700 }
                  : { color: '#64748B' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-4 pb-2">
          {/* Search */}
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
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full text-left text-xs table-base mt-3 rounded-xl overflow-hidden">
            <thead>
              <tr>
                <th>Institution Name</th>
                <th>FDR Number</th>
                <th>Bank & Branch</th>
                <th>Amount</th>
                <th>Maturity Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">Loading records...</td>
                </tr>
              ) : filteredFdrs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No FDR records match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredFdrs.map((fdr) => (
                  <tr key={fdr._id}>
                    <td>
                      <div className="font-semibold text-brand-navy">{fdr.institutionId?.name || 'Institution'}</div>
                      <span className="text-[10px] text-brand-muted">
                        {fdr.institutionId?.aictePermanentId || '1-0000000'}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-brand-navy">{fdr.fdrNumber}</td>
                    <td>
                      <div className="font-semibold text-brand-navy">{fdr.bankName}</div>
                      <span className="text-[10px] text-brand-muted">{fdr.branchName} ({fdr.ifscCode})</span>
                    </td>
                    <td className="font-bold text-brand-navy">{formatCurrency(fdr.amount)}</td>
                    <td className="text-brand-muted">{formatDate(fdr.maturityDate)}</td>
                    <td><StatusBadge status={fdr.status} /></td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedVerifyFdr(fdr)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150"
                          style={{ background: 'rgba(247,127,0,0.10)', color: '#c96200' }}
                        >
                          <Play className="w-3 h-3" /> Verify
                        </button>
                        <button
                          onClick={() => setSelectedResultFdr(fdr)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150"
                          style={{ background: 'rgba(0,48,73,0.07)', color: '#003049' }}
                        >
                          <Eye className="w-3 h-3" /> Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedVerifyFdr && (
        <BankVerificationModal
          isOpen={!!selectedVerifyFdr}
          onClose={() => setSelectedVerifyFdr(null)}
          fdr={selectedVerifyFdr}
          onActionComplete={() => fetchDashboardData()}
        />
      )}
      {selectedResultFdr && (
        <VerificationResultModal
          isOpen={!!selectedResultFdr}
          onClose={() => setSelectedResultFdr(null)}
          fdrId={selectedResultFdr._id}
          fdrNumber={selectedResultFdr.fdrNumber}
        />
      )}
    </div>
  );
};

export default OfficerDashboard;
