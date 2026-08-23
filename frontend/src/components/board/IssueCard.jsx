import React from 'react';
import { Layers, MessageSquare, CheckCircle2 } from 'lucide-react';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { Avatar } from '../common/Avatar';
import { useProject } from '../../context/ProjectContext';

export const IssueCard = ({ issue, isDragging }) => {
  const { setSelectedIssueId } = useProject();

  const subtasks = issue.subtask_stats;
  const hasSubtasks = subtasks && subtasks.total > 0;

  return (
    <div
      onClick={() => setSelectedIssueId(issue.id)}
      className="jira-card"
      style={{
        padding: '10px 12px',
        marginBottom: '8px',
        cursor: 'pointer',
        backgroundColor: '#FFFFFF',
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        border: isDragging ? '1.5px solid #0052CC' : '1px solid #EBECF0',
        borderRadius: '4px',
        transform: isDragging ? 'rotate(1.5deg)' : 'none',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      {/* Epic Tag */}
      {issue.epic && (
        <div style={{ marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: '#EAE6FF',
              color: '#5243AA',
              padding: '2px 6px',
              borderRadius: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {issue.epic.summary?.length > 28 ? issue.epic.summary.substring(0, 28) + '...' : issue.epic.summary}
          </span>
        </div>
      )}

      {/* Summary */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#172B4D',
          lineHeight: '1.4',
          marginBottom: '10px',
          wordBreak: 'break-word',
        }}
      >
        {issue.summary}
      </div>

      {/* Labels or Subtask progress */}
      {hasSubtasks && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#5E6C84',
            backgroundColor: '#F4F5F7',
            padding: '2px 6px',
            borderRadius: '3px',
            marginBottom: '8px',
          }}
        >
          <CheckCircle2 size={12} color={subtasks.completed === subtasks.total ? '#36B37E' : '#5E6C84'} />
          <span>
            {subtasks.completed}/{subtasks.total}
          </span>
        </div>
      )}

      {/* Bottom Meta Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '4px',
        }}
      >
        {/* Left: Type, Key, Priority, Comments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IssueTypeBadge type={issue.type} size={14} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#5E6C84',
              letterSpacing: '0.01em',
            }}
          >
            {issue.key}
          </span>
          <PriorityBadge priority={issue.priority} size={14} />
          {issue.comments_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: '#7A869A' }}>
              <MessageSquare size={12} />
              <span>{issue.comments_count}</span>
            </div>
          )}
        </div>

        {/* Right: Story points & Assignee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {issue.story_points !== null && issue.story_points !== undefined && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#DFE1E6',
                color: '#42526E',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Story Points"
            >
              {issue.story_points}
            </span>
          )}
          <Avatar user={issue.assignee} size="sm" />
        </div>
      </div>
    </div>
  );
};
