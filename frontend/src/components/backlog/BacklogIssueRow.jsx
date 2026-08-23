import React from 'react';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Avatar } from '../common/Avatar';
import { useProject } from '../../context/ProjectContext';

export const BacklogIssueRow = ({ issue, isDragging }) => {
  const { setSelectedIssueId } = useProject();

  return (
    <div
      onClick={() => setSelectedIssueId(issue.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderTop: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        userSelect: 'none',
        boxShadow: isDragging ? 'var(--shadow-md)' : 'none',
        transform: isDragging ? 'rotate(1deg)' : 'none',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = '#FAFBFC';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = '#FFFFFF';
      }}
    >
      {/* Left side: Type, Key, Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <IssueTypeBadge type={issue.type} size={15} />
        <span
          style={{
            fontWeight: 600,
            color: '#5E6C84',
            fontSize: '12px',
            flexShrink: 0,
            textDecoration: issue.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {issue.key}
        </span>
        <span
          style={{
            fontWeight: 500,
            color: issue.status === 'done' ? '#5E6C84' : '#172B4D',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textDecoration: issue.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {issue.summary}
        </span>

        {/* Epic Badge */}
        {issue.epic && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: '#EAE6FF',
              color: '#5243AA',
              padding: '1px 6px',
              borderRadius: '3px',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {issue.epic.summary?.length > 20 ? issue.epic.summary.substring(0, 20) + '...' : issue.epic.summary}
          </span>
        )}
      </div>

      {/* Right side: Status, Points, Priority, Assignee */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '12px' }}>
        <StatusBadge status={issue.status} size="sm" />

        {/* Story Points Pill */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#DFE1E6',
            color: '#42526E',
            padding: '1px 7px',
            borderRadius: '10px',
            minWidth: '20px',
            textAlign: 'center',
          }}
        >
          {issue.story_points ?? '-'}
        </span>

        <PriorityBadge priority={issue.priority} size={15} />
        <Avatar user={issue.assignee} size="sm" />
      </div>
    </div>
  );
};
