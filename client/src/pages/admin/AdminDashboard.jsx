import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck, Mail, CheckCircle2, KeyRound,
  FolderGit2, Building2, BarChart3, History,
  ArrowRight
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();

  const quickLinks = [
    { to: '/admin/release-authorization', label: 'Release Authorization', desc: 'Sanction FDR release approvals', icon: KeyRound, color: '#D62828' },
    { to: '/admin/all-fdrs', label: 'All FDR Records', desc: 'View entire FDR registry', icon: FolderGit2, color: '#F77F00' },
    { to: '/admin/institutions', label: 'Institution Directory', desc: 'Browse registered institutions', icon: Building2, color: '#003049' },
    { to: '/admin/analytics', label: 'Analytics & Exposure', desc: 'Nationwide deposit insights', icon: BarChart3, color: '#16865C' },
    { to: '/admin/audit-logs', label: 'System Audit Logs', desc: 'Full governance audit trail', icon: History, color: '#64748B' },
  ];

  const permissions = [
    'Full System Governance & User Management',
    'Final Release & Refund Sanction Authorization',
    'Audit Logs & Regulatory Compliance Access',
    'Nationwide Institution Directory Oversight',
  ];

  return (
    <div className="space-y-6 fade-up">
      {/* Banner */}
      <div className="page-banner">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
          style={{ background: 'rgba(214,40,40,0.18)', color: '#fca5a5', border: '1px solid rgba(214,40,40,0.35)' }}>
          <KeyRound className="w-3.5 h-3.5" />
          Apex Admin Hub
        </div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight relative z-10">
          Welcome, Administrator {user?.name || 'AICTE Admin'}
        </h1>
        <p className="text-xs mt-1 max-w-xl relative z-10" style={{ color: 'rgba(234,226,183,0.75)' }}>
          Role-based access verified. Authorized for nationwide institution directory oversight, release authorization sanctions, and audit governance.
        </p>
      </div>

      {/* Admin Profile & Permissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Identity Card */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4"
          style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(234,226,183,0.7)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(214,40,40,0.08)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: '#D62828' }} />
            </div>
            <h2 className="text-sm font-bold text-brand-navy">Administrator Identity</h2>
          </div>

          {/* Avatar row */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0"
              style={{ background: 'linear-gradient(135deg, #D62828 0%, #F77F00 100%)' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="font-bold text-base text-brand-navy">{user?.name}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: '#D62828' }}>
                {user?.designation || 'Director & Head of Approvals, AICTE HQ'}
              </div>
              <div className="text-xs text-brand-muted flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </div>
            </div>
          </div>

          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(214,40,40,0.09)', color: '#9b1c1c', border: '1px solid rgba(214,40,40,0.22)' }}>
              <ShieldCheck className="w-3.5 h-3.5" /> Role: AICTE Admin
            </span>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4"
          style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(234,226,183,0.7)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,48,73,0.08)' }}>
              <CheckCircle2 className="w-4 h-4 text-brand-navy" />
            </div>
            <h2 className="text-sm font-bold text-brand-navy">Apex Authorization Scope</h2>
          </div>

          <div className="space-y-2.5">
            {permissions.map((perm) => (
              <div key={perm} className="flex items-start gap-2.5 text-xs text-brand-navy">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#16865C' }} />
                <span>{perm}</span>
              </div>
            ))}
          </div>

          {/* Status pill */}
          <div className="flex items-center gap-2.5 pt-3 rounded-xl px-3 py-2.5 text-xs"
            style={{ background: 'rgba(22,134,92,0.07)', border: '1px solid rgba(22,134,92,0.2)' }}>
            <span className="w-2 h-2 rounded-full pulse-bhagwa" style={{ background: '#16865C' }} />
            <span className="font-bold" style={{ color: '#065f46' }}>Session Active — All permissions granted</span>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2 className="text-sm font-bold text-brand-navy mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full inline-block" style={{ background: '#F77F00' }} />
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((ql) => {
            const Icon = ql.icon;
            return (
              <Link
                key={ql.to}
                to={ql.to}
                className="group bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center gap-4"
                style={{ border: '1px solid rgba(234,226,183,0.7)', textDecoration: 'none' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${ql.color}14` }}>
                  <Icon className="w-6 h-6" style={{ color: ql.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-brand-navy group-hover:text-brand-bhagwa transition-colors">{ql.label}</div>
                  <div className="text-[11px] text-brand-muted mt-0.5">{ql.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 text-brand-muted/40 group-hover:text-brand-bhagwa group-hover:translate-x-1 transition-all duration-200" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
