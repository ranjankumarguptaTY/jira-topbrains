import React from 'react';
import { Bookmark, CheckSquare, AlertCircle, Zap, Layers } from 'lucide-react';

export const IssueTypeBadge = ({ type = 'story', showLabel = false, size = 16 }) => {
  const normalizedType = (type || 'story').toLowerCase();

  const configMap = {
    story: {
      label: 'Story',
      color: '#36B37E',
      bg: '#E3FCEF',
      Icon: Bookmark,
    },
    task: {
      label: 'Task',
      color: '#4C9AFF',
      bg: '#DEEBFF',
      Icon: CheckSquare,
    },
    bug: {
      label: 'Bug',
      color: '#FF5630',
      bg: '#FFEBE6',
      Icon: AlertCircle,
    },
    epic: {
      label: 'Epic',
      color: '#6554C0',
      bg: '#EAE6FF',
      Icon: Zap,
    },
    subtask: {
      label: 'Sub-task',
      color: '#00B8D9',
      bg: '#E6FCFF',
      Icon: Layers,
    },
  };

  const config = configMap[normalizedType] || configMap.story;
  const IconComponent = config.Icon;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: config.color,
      }}
      title={config.label}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: config.bg,
          padding: '3px',
          borderRadius: '3px',
        }}
      >
        <IconComponent size={size} color={config.color} strokeWidth={2.5} />
      </div>
      {showLabel && (
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#172B4D', textTransform: 'capitalize' }}>
          {config.label}
        </span>
      )}
    </div>
  );
};
