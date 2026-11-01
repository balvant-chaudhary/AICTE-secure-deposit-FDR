import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus2,
  FolderGit2,
  GitPullRequest,
  CheckCircle,
  AlertOctagon,
  Building,
  History,
  ShieldAlert,
  BarChart3,
  FileCheck2,
  KeyRound,
  FileText,
  ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const { role } = useAuth();

  const institutionLinks = [
    { to: '/institution/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/institution/submit-fdr', label: 'Submit New FDR', icon: FilePlus2 },
    { to: '/institution/my-fdrs', label: 'My FDRs & Deposits', icon: FolderGit2 },
    { to: '/institution/requests', label: 'Renewal & Release', icon: GitPullRequest },
    { to: '/institution/profile', label: 'Institution Profile', icon: Building },
  ];

  const officerLinks = [
    { to: '/officer/dashboard', label: 'Officer Dashboard', icon: LayoutDashboard },
    { to: '/officer/pending', label: 'Pending Verifications', icon: CheckCircle },
    { to: '/officer/discrepancies', label: 'Discrepancy Queue', icon: AlertOctagon },
    { to: '/officer/release-reviews', label: 'Release Review Queue', icon: FileCheck2 },
    { to: '/officer/institutions', label: 'Institutions Directory', icon: Building },
    { to: '/officer/audit-logs', label: 'Audit Trail', icon: History },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Executive Hub', icon: LayoutDashboard },
    { to: '/admin/release-authorization', label: 'Release Authorization', icon: KeyRound },
    { to: '/admin/all-fdrs', label: 'All FDR Records', icon: FolderGit2 },
    { to: '/admin/institutions', label: 'Institution Directory', icon: Building },
    { to: '/admin/analytics', label: 'Analytics & Exposure', icon: BarChart3 },
    { to: '/admin/audit-logs', label: 'System Audit Logs', icon: History },
  ];

  const links =
    role === 'institution'
      ? institutionLinks
      : role === 'officer'
      ? officerLinks
      : adminLinks;

  const roleConfig = {
    institution: {
      label: 'Institution Workspace',
      dotColor: '#F77F00',
      pillBg: 'rgba(247,127,0,0.10)',
      pillBorder: 'rgba(247,127,0,0.25)',
      pillText: '#c96200',
    },
    officer: {
      label: 'AICTE Officer Console',
      dotColor: '#16865C',
      pillBg: 'rgba(22,134,92,0.10)',
      pillBorder: 'rgba(22,134,92,0.25)',
      pillText: '#065f46',
    },
    admin: {
      label: 'AICTE Apex Admin',
      dotColor: '#D62828',
      pillBg: 'rgba(214,40,40,0.08)',
      pillBorder: 'rgba(214,40,40,0.2)',
      pillText: '#991b1b',
    },
  };

  const rc = roleConfig[role] || roleConfig.institution;

  return (
    <aside className="w-64 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]"
      style={{ background: '#FFFFFF', borderRight: '1px solid rgba(234,226,183,0.8)' }}>

      {/* Role Pill Header */}
      <div className="p-4" style={{ borderBottom: '1px solid rgba(234,226,183,0.8)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{ background: rc.pillBg, border: `1px solid ${rc.pillBorder}` }}>
          <span className="w-2 h-2 rounded-full shrink-0 pulse-bhagwa"
            style={{ background: rc.dotColor }} />
          <span className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: rc.pillText }}>
            {rc.label}
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'nav-active'
                    : 'text-brand-navy/70 hover:text-brand-navy hover:bg-brand-cream/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-brand-bhagwa' : 'text-brand-navy/50 group-hover:text-brand-bhagwa'
                  }`} />
                  <span className="flex-1">{link.label}</span>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-brand-bhagwa shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-3 mx-3 mb-3">
        <div className="rounded-xl p-3.5 text-[11px] leading-relaxed"
          style={{
            background: 'linear-gradient(135deg, rgba(0,48,73,0.06) 0%, rgba(247,127,0,0.05) 100%)',
            border: '1px solid rgba(0,48,73,0.12)'
          }}>
          <div className="flex items-center gap-1.5 font-bold text-brand-navy mb-1.5">
            <FileText className="w-3.5 h-3.5 text-brand-bhagwa" />
            <span>AICTE Mandate</span>
          </div>
          <p className="text-brand-navy/60">
            Security Deposits &amp; FDRs require verified joint lien and officer authorization before release.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
