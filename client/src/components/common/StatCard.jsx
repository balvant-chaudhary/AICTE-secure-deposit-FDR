import React from 'react';

/**
 * StatCard — Bhagwa + Deep Navy theme
 *
 * Props:
 *   title      — Card label (string)
 *   value      — Main metric (string | number)
 *   subtext    — Supporting text (string)
 *   icon       — Lucide icon component
 *   variant    — 'bhagwa' | 'navy' | 'success' | 'warning' | 'danger' | 'neutral'
 *   trend      — optional trend label
 */
const StatCard = ({ title, value, subtext, icon: Icon, variant = 'navy', trend, badgeText, badgeColor }) => {
  // Support legacy badgeColor prop mapping
  const legacyMap = {
    blue: 'navy',
    green: 'success',
    amber: 'bhagwa',
    rose: 'danger',
    purple: 'navy',
  };
  const resolvedVariant = variant !== 'navy' ? variant : (legacyMap[badgeColor] || 'navy');

  const variantConfig = {
    bhagwa: {
      iconBg: 'rgba(247,127,0,0.12)',
      iconColor: '#c96200',
      valueColor: '#c96200',
      badgeBg: 'rgba(247,127,0,0.10)',
      badgeText: '#c96200',
      badgeBorder: 'rgba(247,127,0,0.25)',
      dot: '#F77F00',
      accent: 'rgba(247,127,0,0.08)',
    },
    navy: {
      iconBg: 'rgba(0,48,73,0.09)',
      iconColor: '#003049',
      valueColor: '#003049',
      badgeBg: 'rgba(0,48,73,0.07)',
      badgeText: '#003049',
      badgeBorder: 'rgba(0,48,73,0.2)',
      dot: '#003049',
      accent: 'rgba(0,48,73,0.04)',
    },
    success: {
      iconBg: 'rgba(22,134,92,0.10)',
      iconColor: '#16865C',
      valueColor: '#16865C',
      badgeBg: 'rgba(22,134,92,0.08)',
      badgeText: '#065f46',
      badgeBorder: 'rgba(22,134,92,0.25)',
      dot: '#16865C',
      accent: 'rgba(22,134,92,0.05)',
    },
    warning: {
      iconBg: 'rgba(252,191,73,0.15)',
      iconColor: '#a16207',
      valueColor: '#a16207',
      badgeBg: 'rgba(252,191,73,0.12)',
      badgeText: '#78350f',
      badgeBorder: 'rgba(252,191,73,0.4)',
      dot: '#FCBF49',
      accent: 'rgba(252,191,73,0.07)',
    },
    danger: {
      iconBg: 'rgba(214,40,40,0.09)',
      iconColor: '#D62828',
      valueColor: '#D62828',
      badgeBg: 'rgba(214,40,40,0.07)',
      badgeText: '#9b1c1c',
      badgeBorder: 'rgba(214,40,40,0.25)',
      dot: '#D62828',
      accent: 'rgba(214,40,40,0.04)',
    },
    neutral: {
      iconBg: 'rgba(100,116,139,0.10)',
      iconColor: '#64748B',
      valueColor: '#003049',
      badgeBg: 'rgba(100,116,139,0.08)',
      badgeText: '#475569',
      badgeBorder: 'rgba(100,116,139,0.2)',
      dot: '#94a3b8',
      accent: 'rgba(100,116,139,0.04)',
    },
  };

  const cfg = variantConfig[resolvedVariant] || variantConfig.navy;

  const displayBadgeText = badgeText || trend;

  return (
    <div
      className="relative bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden group cursor-default"
      style={{ border: '1px solid rgba(234,226,183,0.7)' }}>

      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-6 translate-x-6 transition-all duration-300 group-hover:scale-110"
        style={{ background: cfg.accent }} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block">
            {title}
          </span>

          <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-extrabold tracking-tight font-display" style={{ color: cfg.valueColor }}>
              {value}
            </span>
            {displayBadgeText && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ background: cfg.badgeBg, color: cfg.badgeText, borderColor: cfg.badgeBorder }}>
                {displayBadgeText}
              </span>
            )}
          </div>

          {subtext && (
            <p className="mt-1.5 text-[11px] text-brand-muted/80 leading-relaxed">{subtext}</p>
          )}
        </div>

        {Icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3 shadow-sm"
            style={{ background: cfg.iconBg }}>
            <Icon className="w-5 h-5" style={{ color: cfg.iconColor }} />
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300 rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, ${cfg.dot}, transparent)` }} />
    </div>
  );
};

export default StatCard;
