import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fdrService } from '../../services/fdrService';
import StatusBadge from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Building2,
  PlusCircle,
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  MapPin,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const InstitutionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fdrService.getFDRs({ limit: 100 });
      setFdrs(response.data?.fdrs || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load institutional FDR summary. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalFDRs = fdrs.length;
  const submittedFDRs = fdrs.filter((f) => f.status === 'SUBMITTED').length;
  const verifiedFDRs = fdrs.filter((f) => f.status === 'VERIFIED_ACTIVE').length;
  const expiringFDRs = fdrs.filter((f) => f.status === 'EXPIRING_SOON').length;
  const maturedFDRs = fdrs.filter((f) => f.status === 'MATURED').length;
  const totalAmount = fdrs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const recentFDRs = [...fdrs].slice(0, 5);

  const stats = [
    {
      label: 'Total FDRs',
      value: loading ? '—' : totalFDRs,
      sub: loading ? 'Loading...' : formatCurrency(totalAmount),
      icon: Wallet,
      variant: 'navy',
    },
    {
      label: 'Submitted',
      value: loading ? '—' : submittedFDRs,
      sub: 'Awaiting AICTE Verification',
      icon: FileText,
      variant: 'bhagwa',
    },
    {
      label: 'Verified Active',
      value: loading ? '—' : verifiedFDRs,
      sub: 'Lien Endorsed & Active',
      icon: CheckCircle2,
      variant: 'success',
    },
    {
      label: 'Expiring Soon',
      value: loading ? '—' : expiringFDRs,
      sub: 'Maturing in < 60 Days',
      icon: Clock,
      variant: 'warning',
    },
    {
      label: 'Matured',
      value: loading ? '—' : maturedFDRs,
      sub: 'Action / Renewal Required',
      icon: AlertTriangle,
      variant: 'danger',
    },
  ];

  return (
    <div className="space-y-6 fade-up">
      {/* Hero Banner */}
      <div className="page-banner">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{ background: 'rgba(247,127,0,0.18)', color: '#FCBF49', border: '1px solid rgba(247,127,0,0.35)' }}>
              <Building2 className="w-3.5 h-3.5" />
              Institution Console
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Welcome, {user?.name || 'Institution Nodal Officer'}
            </h1>
            <p className="text-xs mt-1 max-w-xl" style={{ color: 'rgba(234,226,183,0.75)' }}>
              Manage Security Deposits and Fixed Deposit Receipts (FDRs) under AICTE statutory compliance.
            </p>
            {user?.institution?.name && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(247,127,0,0.15)', color: '#FCBF49', border: '1px solid rgba(247,127,0,0.3)' }}>
                <Building2 className="w-3.5 h-3.5" />
                {user.institution.name}
                <span className="font-mono font-bold text-white">
                  (PID: {user.institution.aictePermanentId || 'Verified'})
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/institution/submit-fdr')}
              className="btn-bhagwa"
            >
              <PlusCircle className="w-4 h-4" /> Submit New FDR
            </button>
            <button
              onClick={() => navigate('/institution/my-fdrs')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <FolderGit2 className="w-4 h-4" /> View All FDRs
            </button>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(234,226,183,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-error fade-up">
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#D62828' }} />
          <span className="flex-1">{error}</span>
          <button
            onClick={fetchDashboardData}
            className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition"
            style={{ background: 'rgba(214,40,40,0.12)', color: '#991b1b' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {stats.map((s) => {
          const variantConfig = {
            navy:    { iconBg: 'rgba(0,48,73,0.09)',    iconColor: '#003049', valColor: '#003049' },
            bhagwa:  { iconBg: 'rgba(247,127,0,0.12)',  iconColor: '#c96200', valColor: '#c96200' },
            success: { iconBg: 'rgba(22,134,92,0.10)',  iconColor: '#16865C', valColor: '#16865C' },
            warning: { iconBg: 'rgba(252,191,73,0.15)', iconColor: '#a16207', valColor: '#a16207' },
            danger:  { iconBg: 'rgba(214,40,40,0.09)',  iconColor: '#D62828', valColor: '#D62828' },
          };
          const vc = variantConfig[s.variant];
          const Icon = s.icon;
          return (
            <div key={s.label}
              className="bg-white rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-200 col-span-1 last:col-span-2 lg:last:col-span-1"
              style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: vc.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: vc.iconColor }} />
                </div>
              </div>
              <div className="text-2xl font-extrabold font-display" style={{ color: vc.valColor }}>{s.value}</div>
              <p className="text-[10px] mt-0.5" style={{ color: vc.iconColor + 'cc' }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent FDRs Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card overflow-hidden"
          style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
          {/* Table Header */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(234,226,183,0.7)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(247,127,0,0.12)' }}>
                <FolderGit2 className="w-4 h-4" style={{ color: '#F77F00' }} />
              </div>
              <h2 className="text-sm font-bold text-brand-navy">Recent FDR Submissions</h2>
            </div>
            <Link
              to="/institution/my-fdrs"
              className="text-xs font-bold flex items-center gap-1 hover:underline"
              style={{ color: '#F77F00' }}>
              View Full Register <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-brand-muted text-xs">Loading FDR records...</div>
          ) : recentFDRs.length === 0 ? (
            <div className="py-14 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(247,127,0,0.10)' }}>
                <FileText className="w-7 h-7" style={{ color: '#F77F00' }} />
              </div>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                No Fixed Deposit Receipts registered yet for your institution.
              </p>
              <button
                onClick={() => navigate('/institution/submit-fdr')}
                className="btn-bhagwa mx-auto">
                Submit First FDR
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-base">
                <thead>
                  <tr>
                    <th>FDR Number</th>
                    <th>Bank</th>
                    <th>Amount</th>
                    <th>Maturity</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFDRs.map((fdr) => (
                    <tr key={fdr._id}>
                      <td className="font-mono font-bold text-brand-navy">{fdr.fdrNumber}</td>
                      <td>
                        <div className="font-semibold text-brand-navy">{fdr.bankName}</div>
                        <div className="text-[10px] text-brand-muted truncate max-w-[130px]">{fdr.branchName}</div>
                      </td>
                      <td className="font-bold text-brand-navy">{formatCurrency(fdr.amount)}</td>
                      <td className="text-brand-muted">{formatDate(fdr.maturityDate)}</td>
                      <td><StatusBadge status={fdr.status} /></td>
                      <td className="text-right">
                        <button
                          onClick={() => navigate(`/institution/fdrs/${fdr._id}`)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150"
                          style={{ color: '#F77F00', background: 'rgba(247,127,0,0.08)' }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Institution Card */}
          <div className="bg-white rounded-2xl p-5 shadow-card space-y-4"
            style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
            <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(234,226,183,0.7)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,48,73,0.08)' }}>
                <ShieldCheck className="w-4 h-4 text-brand-navy" />
              </div>
              <h2 className="text-sm font-bold text-brand-navy">Affiliated Institution</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted block mb-0.5">Institution Name</span>
                <span className="font-bold text-sm text-brand-navy">{user?.institution?.name || 'Technical Institution'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted block mb-0.5">AICTE Permanent ID</span>
                <span className="font-mono font-bold" style={{ color: '#F77F00' }}>{user?.institution?.aictePermanentId || 'Verified Record'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted block mb-0.5">Category & Programme</span>
                <span className="text-brand-navy/80">{user?.institution?.institutionType || 'Engineering & Technology'}</span>
              </div>
              {user?.institution?.city && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted block mb-0.5">Campus Location</span>
                  <span className="text-brand-navy/80 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-muted" />
                    {user.institution.city}, {user.institution.state} – {user.institution.pincode}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(234,226,183,0.7)' }}>
              <span className="text-[10px] text-brand-muted font-semibold">Compliance Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(22,134,92,0.09)', color: '#065f46', border: '1px solid rgba(22,134,92,0.25)' }}>
                <CheckCircle2 className="w-3 h-3" /> Active & Compliant
              </span>
            </div>
          </div>

          {/* Mandate Notice */}
          <div className="rounded-2xl p-4 text-xs"
            style={{ background: 'linear-gradient(135deg, rgba(0,48,73,0.06) 0%, rgba(247,127,0,0.05) 100%)', border: '1px solid rgba(0,48,73,0.12)' }}>
            <div className="flex items-center gap-1.5 font-bold text-brand-navy mb-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: '#F77F00' }} />
              AICTE Statutory Requirement
            </div>
            <p className="leading-relaxed text-brand-navy/65">
              Security Deposit FDRs must maintain active AICTE lien endorsement. All renewal and release sanctions are subject to statutory verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDashboard;
