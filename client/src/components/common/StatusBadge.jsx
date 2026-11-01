import React from 'react';
import { STATUS_CONFIG } from '../../utils/constants';

const StatusBadge = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    bgColor: 'rgba(100,116,139,0.08)',
    textColor: '#475569',
    borderColor: 'rgba(100,116,139,0.2)',
    dotColor: '#94a3b8',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-1.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-colors ${sizeClasses[size]}`}
      style={{
        background: config.bgColor,
        color: config.textColor,
        borderColor: config.borderColor,
      }}
    >
      <span
        className={`rounded-full shrink-0 ${config.dotPulse ? 'animate-pulse' : ''}`}
        style={{
          width: size === 'sm' ? '5px' : '6px',
          height: size === 'sm' ? '5px' : '6px',
          background: config.dotColor,
        }}
      />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
