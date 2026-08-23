import React from 'react';
import { ChevronsUp, ChevronUp, Equal, ChevronDown, ChevronsDown } from 'lucide-react';

export const PriorityBadge = ({ priority = 'medium', showLabel = false, size = 16 }) => {
  const normalized = (priority || 'medium').toLowerCase();

  const configMap = {
    highest: {
      label: 'Highest',
      color: '#FF5630',
      Icon: ChevronsUp,
    },
    high: {
      label: 'High',
      color: '#FF7452',
      Icon: ChevronUp,
    },
    medium: {
      label: 'Medium',
      color: '#FFAB00',
      Icon: Equal,
    },
    low: {
      label: 'Low',
      color: '#36B37E',
      Icon: ChevronDown,
    },
    lowest: {
      label: 'Lowest',
      color: '#57D9A3',
      Icon: ChevronsDown,
    },
  };

  const config = configMap[normalized] || configMap.medium;
  const IconComponent = config.Icon;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: config.color,
      }}
      title={`Priority: ${config.label}`}
    >
      <IconComponent size={size} color={config.color} strokeWidth={2.5} />
      {showLabel && (
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#172B4D', textTransform: 'capitalize' }}>
          {config.label}
        </span>
      )}
    </div>
  );
};
