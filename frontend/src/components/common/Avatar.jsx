import React from 'react';

// Atlassian signature avatar color tokens
const AVATAR_PALETTE = [
  { bg: '#0052CC', color: '#FFFFFF' }, // Electric Blue
  { bg: '#6554C0', color: '#FFFFFF' }, // Purple
  { bg: '#00875A', color: '#FFFFFF' }, // Emerald Green
  { bg: '#FF8B00', color: '#FFFFFF' }, // Amber Orange
  { bg: '#008DA6', color: '#FFFFFF' }, // Teal
  { bg: '#E05284', color: '#FFFFFF' }, // Rose
  { bg: '#403294', color: '#FFFFFF' }, // Deep Indigo
  { bg: '#006644', color: '#FFFFFF' }, // Forest Green
  { bg: '#5243AA', color: '#FFFFFF' }, // Royal Violet
  { bg: '#253858', color: '#FFFFFF' }, // Navy Charcoal
];

function getAvatarColors(name) {
  if (!name || name.toLowerCase() === 'unassigned') {
    return { bg: '#DFE1E6', color: '#5E6C84' };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

function getInitials(name) {
  if (!name || name.toLowerCase() === 'unassigned') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = ({ user, size = 'md', className = '', showName = false, tooltip = true }) => {
  const sizeMap = {
    xs: { size: 20, fontSize: '10px' },
    sm: { size: 24, fontSize: '11px' },
    md: { size: 32, fontSize: '12px' },
    lg: { size: 40, fontSize: '14px' },
    xl: { size: 48, fontSize: '16px' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const name = typeof user === 'string' ? user : (user?.name || 'Unassigned');
  const isActive = user?.is_active !== false;
  const initials = getInitials(name);
  const { bg, color } = getAvatarColors(name);

  return (
    <div
      className={className}
      title={tooltip ? `${name}${!isActive ? ' (Deactivated)' : ''}` : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
    >
      <div
        style={{
          width: `${currentSize.size}px`,
          height: `${currentSize.size}px`,
          borderRadius: '50%',
          backgroundColor: isActive ? bg : '#A5ADBA',
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: currentSize.fontSize,
          letterSpacing: '-0.02em',
          flexShrink: 0,
          border: '1.5px solid #FFFFFF',
          boxShadow: '0 0 0 1px rgba(9, 30, 66, 0.12)',
          opacity: isActive ? 1 : 0.7,
          filter: isActive ? 'none' : 'grayscale(60%)',
          transition: 'transform 0.15s ease',
        }}
      >
        <span>{initials}</span>
      </div>
      {showName && (
        <span style={{ fontSize: '13px', color: '#172B4D', fontWeight: 500 }}>
          {name} {!isActive && <span style={{ fontSize: '11px', color: '#FF5630' }}>(Deactivated)</span>}
        </span>
      )}
    </div>
  );
};
