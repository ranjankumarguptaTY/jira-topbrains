import React from 'react';

export const StatusBadge = ({ status = 'todo', size = 'md' }) => {
  const normalized = (status || 'todo').toLowerCase();

  const configMap = {
    todo: {
      label: 'TO DO',
      className: 'status-todo',
      bg: '#DFE1E6',
      text: '#42526E',
    },
    inprogress: {
      label: 'IN PROGRESS',
      className: 'status-inprogress',
      bg: '#DEEBFF',
      text: '#0052CC',
    },
    inreview: {
      label: 'IN REVIEW',
      className: 'status-inreview',
      bg: '#EAE6FF',
      text: '#5243AA',
    },
    done: {
      label: 'DONE',
      className: 'status-done',
      bg: '#E3FCEF',
      text: '#006644',
    },
  };

  const config = configMap[normalized] || configMap.todo;

  return (
    <span
      className={`status-pill ${config.className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '1px 6px' : '2px 8px',
        borderRadius: '3px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        display: 'inline-block',
      }}
    >
      {config.label}
    </span>
  );
};
