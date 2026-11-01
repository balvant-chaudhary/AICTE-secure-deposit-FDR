import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, Building2, UserCheck, BadgeCheck } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (role === 'institution') {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
          style={{ background: 'rgba(247,127,0,0.18)', color: '#FCBF49', border: '1px solid rgba(247,127,0,0.4)' }}>
          Institution
        </span>
      );
    }
    if (role === 'officer') {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
          style={{ background: 'rgba(22,134,92,0.2)', color: '#86efac', border: '1px solid rgba(22,134,92,0.4)' }}>
          AICTE Officer
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
          style={{ background: 'rgba(214,40,40,0.18)', color: '#fca5a5', border: '1px solid rgba(214,40,40,0.4)' }}>
          AICTE Admin
        </span>
      );
    }
    return null;
  };

  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="glass-navy sticky top-0 z-40 text-white">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #F77F00 0%, #FCBF49 100%)' }}>
            <ShieldCheck className="w-6 h-6 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-brand-navyDark bg-brand-success pulse-bhagwa" />
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base sm:text-lg tracking-tight"
                style={{ background: 'linear-gradient(90deg, #ffffff 0%, #FCBF49 60%, #F77F00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                AICTE FDR Management Portal
              </span>
            </div>
            <p className="text-[11px] hidden sm:block" style={{ color: 'rgba(234,226,183,0.6)' }}>
              Fixed Deposit Receipt &amp; Security Deposit Management
            </p>
          </div>
        </div>

        {/* Right: Role + Notifications + Profile + Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {getRoleBadge()}

          {/* Notification Center */}
          <NotificationCenter />

          {/* Divider */}
          <div className="w-px h-6 hidden sm:block" style={{ background: 'rgba(247,127,0,0.25)' }} />

          {/* User Pill */}
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0"
              style={{ background: 'linear-gradient(135deg, #F77F00 0%, #FCBF49 100%)' }}>
              {avatarInitial}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] truncate max-w-[140px]" style={{ color: 'rgba(234,226,183,0.7)' }}>
                {user?.institution?.name || user?.designation || role}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs ml-1 group"
              style={{ color: 'rgba(234,226,183,0.7)' }}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 group-hover:text-brand-red transition-colors" />
              <span className="hidden md:inline group-hover:text-brand-red transition-colors">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #F77F00 0%, #FCBF49 40%, transparent 100%)' }} />
    </header>
  );
};

export default Navbar;
