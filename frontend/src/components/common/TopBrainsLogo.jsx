import React from 'react';

export const TopBrainsLogo = ({ size = 28, showText = true, textColor = '#172B4D' }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,82,204,0.25))' }}
      >
        <defs>
          <linearGradient id="tbLogoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0052CC" />
            <stop offset="50%" stopColor="#2684FF" />
            <stop offset="100%" stopColor="#6554C0" />
          </linearGradient>
          <linearGradient id="tbAccentGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00B8D9" />
            <stop offset="100%" stopColor="#36B37E" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" rx="16" fill="url(#tbLogoGrad)" />
        <rect x="14" y="16" width="10" height="32" rx="5" fill="#FFFFFF" fillOpacity="0.95" />
        <rect x="27" y="12" width="10" height="40" rx="5" fill="#FFFFFF" />
        <rect x="40" y="20" width="10" height="28" rx="5" fill="#FFFFFF" fillOpacity="0.9" />

        <circle cx="19" cy="22" r="2.5" fill="#0052CC" />
        <circle cx="32" cy="18" r="2.5" fill="#2684FF" />
        <circle cx="45" cy="26" r="2.5" fill="#6554C0" />
        <circle cx="32" cy="38" r="3.2" fill="url(#tbAccentGrad)" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: textColor,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            TopBrains
          </span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#0052CC',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Jira
          </span>
        </div>
      )}
    </div>
  );
};
