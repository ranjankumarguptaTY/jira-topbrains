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
        boxShadow: isDragging ? '0 8px 16px rgba(9, 30, 66, 0.2)' : '0 1px 2px rgba(9, 30, 66, 0.08)',
        border: isDragging ? '1.5px solid #0052CC' : '1px solid #DFE1E6',
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
              backgroundColor: 'var(--color-purple-50)',
              color: 'var(--color-purple-600)',
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
          color: 'var(--color-neutral-900)',
          lineHeight: '1.4',
          marginBottom: '10px',
          wordBreak: 'break-word',
        }}
      >
        {issue.summary}
      </div>

      {/* Tags & Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {issue.labels.map((lbl, idx) => {
            const projectTags = currentProject?.tags || [];
            const tagObj = projectTags.find((t) => (t.name || t.id).toLowerCase() === lbl.toLowerCase());
            const color = tagObj?.color || '#0052CC';
            return (
              <span
                key={idx}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: `${color}18`,
                  color: color,
                  border: `1px solid ${color}33`,
                }}
              >
                {tagObj?.name || lbl}
              </span>
            );
          })}
        </div>
      )}

      {/* Subtask progress */}
      {hasSubtasks && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: 'var(--color-neutral-500)',
            backgroundColor: 'var(--color-neutral-100)',
            padding: '2px 6px',
            borderRadius: '3px',
            marginBottom: '8px',
          }}
        >
          <CheckCircle2 size={12} color={subtasks.completed === subtasks.total ? 'var(--color-success-500)' : 'var(--color-neutral-500)'} />
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
              color: 'var(--color-neutral-500)',
              letterSpacing: '0.01em',
            }}
          >
            {issue.key}
          </span>
          <PriorityBadge priority={issue.priority} size={14} />
          {issue.comments_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-neutral-500)' }}>
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
                backgroundColor: 'var(--color-neutral-200)',
                color: 'var(--color-neutral-700)',
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
