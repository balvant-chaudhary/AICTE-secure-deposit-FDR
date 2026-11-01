import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  RefreshCw,
  ExternalLink,
  Info,
  X
} from 'lucide-react';

/**
 * Format relative time ago without heavy external date libraries.
 */
const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Visual metadata and icons tailored to notification types.
 */
const getNotificationTypeMeta = (type) => {
  switch (type) {
    case 'EXPIRY_WARNING':
      return {
        icon: Clock,
        iconColor: '#F77F00',
        bg: 'rgba(247, 127, 0, 0.12)',
        border: 'rgba(247, 127, 0, 0.3)',
        label: 'Expiry Warning'
      };
    case 'DISCREPANCY_ALERT':
      return {
        icon: AlertCircle,
        iconColor: '#D62828',
        bg: 'rgba(214, 40, 40, 0.12)',
        border: 'rgba(214, 40, 40, 0.3)',
        label: 'Discrepancy'
      };
    case 'VERIFICATION_SUCCESS':
      return {
        icon: CheckCircle2,
        iconColor: '#16A34A',
        bg: 'rgba(22, 163, 74, 0.12)',
        border: 'rgba(22, 163, 74, 0.3)',
        label: 'Verified'
      };
    case 'REQUEST_UPDATE':
      return {
        icon: FileText,
        iconColor: '#003049',
        bg: 'rgba(0, 48, 73, 0.12)',
        border: 'rgba(0, 48, 73, 0.25)',
        label: 'Request Update'
      };
    default:
      return {
        icon: Info,
        iconColor: '#FCBF49',
        bg: 'rgba(252, 191, 73, 0.18)',
        border: 'rgba(252, 191, 73, 0.35)',
        label: 'Notice'
      };
  }
};

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleManualRefresh = async (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refreshNotifications();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    if (unreadCount > 0) {
      await markAllAsRead();
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#FCBF49]/60 ${
          isOpen
            ? 'bg-white/20 text-[#FCBF49]'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
        title="Notifications"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />

        {/* Unread Count Badge (Hidden when count is 0) */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[19px] h-[19px] px-1 text-[10px] font-extrabold text-white rounded-full shadow-lg border-2 border-[#003049] animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #F77F00 0%, #D62828 100%)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-[420px] max-w-[420px] bg-white rounded-2xl shadow-2xl border border-[#EAE2B7] z-50 overflow-hidden transform transition-all duration-200"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0, 48, 73, 0.35)'
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3.5 flex items-center justify-between text-white border-b border-[#F77F00]/20"
            style={{
              background: 'linear-gradient(135deg, #003049 0%, #002235 100%)'
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(247, 127, 0, 0.25)', color: '#FCBF49' }}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span
                      className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
                      style={{ background: '#F77F00' }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-white/60">AICTE Security Deposit &amp; FDR Alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleManualRefresh}
                className="p-1.5 text-white/70 hover:text-[#FCBF49] hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Close Button on Mobile */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors sm:hidden"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader: Mark All As Read */}
          <div
            className="px-4 py-2 flex items-center justify-between text-[11px] border-b border-[#EAE2B7]/60"
            style={{ background: '#FAF8F2' }}
          >
            <span className="text-[#003049]/70 font-medium">
              {notifications.length} {notifications.length === 1 ? 'alert' : 'alerts'} total
            </span>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 font-semibold text-[#F77F00] hover:text-[#D62828] transition-colors focus:outline-none"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            ) : (
              <span className="text-[#16A34A] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> All caught up
              </span>
            )}
          </div>

          {/* Notification List Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#EAE2B7]/40 bg-white">
            {/* Loading State */}
            {loading && notifications.length === 0 && (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-full" />
                      <div className="h-2 bg-gray-100 rounded w-1/4 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && notifications.length === 0 && (
              <div className="p-6 text-center">
                <div
                  className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2"
                  style={{ background: 'rgba(214, 40, 40, 0.1)', color: '#D62828' }}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#003049]">{error}</p>
                <button
                  type="button"
                  onClick={refreshNotifications}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg text-white"
                  style={{ background: '#003049' }}
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && notifications.length === 0 && (
              <div className="py-10 px-6 text-center">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
                  style={{ background: 'rgba(252, 191, 73, 0.15)', color: '#F77F00' }}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-[#003049]">No Notifications</h4>
                <p className="text-[11px] text-[#003049]/60 mt-1 max-w-xs mx-auto">
                  You are completely up to date. Security deposit milestone warnings and status alerts will appear here.
                </p>
              </div>
            )}

            {/* Notification Items */}
            {notifications.map((notif) => {
              const meta = getNotificationTypeMeta(notif.type);
              const IconComponent = meta.icon;

              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 transition-all duration-150 cursor-pointer flex gap-3 relative group ${
                    notif.isRead
                      ? 'bg-white hover:bg-[#FAF8F2]'
                      : 'hover:bg-[#FFF7ED]'
                  }`}
                  style={{
                    background: notif.isRead ? '#FFFFFF' : 'rgba(247, 127, 0, 0.05)'
                  }}
                >
                  {/* Unread Accent Left Bar */}
                  {!notif.isRead && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ background: '#F77F00' }}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                    style={{
                      background: meta.bg,
                      borderColor: meta.border,
                      color: meta.iconColor
                    }}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4
                        className={`text-xs truncate ${
                          notif.isRead
                            ? 'font-medium text-[#003049]/80'
                            : 'font-bold text-[#003049]'
                        }`}
                        title={notif.title}
                      >
                        {notif.title}
                      </h4>

                      {/* Unread indicator dot */}
                      {!notif.isRead && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0 mt-1"
                          style={{ background: '#F77F00' }}
                          title="Unread"
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-[#003049]/70 mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-dashed border-[#EAE2B7]/60">
                      <span className="text-[10px] text-[#003049]/50 flex items-center gap-1 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>

                      {notif.link && (
                        <span className="text-[10px] font-semibold text-[#F77F00] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          View details
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 text-center text-[10px] text-[#003049]/50 border-t border-[#EAE2B7]/60"
            style={{ background: '#F8F6EF' }}
          >
            AICTE FDR Automated Governance &amp; Maturity Warning System
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
