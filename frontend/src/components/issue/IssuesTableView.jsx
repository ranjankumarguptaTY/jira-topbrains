import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { issuesApi } from '../../api/issues';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Avatar } from '../common/Avatar';
import { Search, Plus } from 'lucide-react';

export const IssuesTableView = () => {
  const { currentProject, refreshKey, setSelectedIssueId, setIsCreateModalOpen } = useProject();
  const [issues, setIssues] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        const data = await issuesApi.list({ project_id: currentProject.id });
        setIssues(data);
      } catch (err) {
        console.error('Failed to load issues table', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [currentProject, refreshKey]);

  const filtered = issues.filter((i) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      i.summary?.toLowerCase().includes(q) ||
      i.key?.toLowerCase().includes(q) ||
      i.type?.toLowerCase().includes(q) ||
      i.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '0 24px 32px 24px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div
        style={{
          padding: '16px 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: '#5E6C84', fontWeight: 500 }}>
              Projects / {currentProject?.name} /
            </span>
            <span style={{ fontSize: '13px', color: '#172B4D', fontWeight: 600 }}>All Issues</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            Issues & Filters ({filtered.length})
          </h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="jira-btn jira-btn-primary"
          style={{ fontSize: '13px' }}
        >
          <Plus size={16} />
          <span>Create Issue</span>
        </button>
      </div>

      {/* Filter Input */}
      <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '300px' }}>
        <Search
          size={15}
          color="#7A869A"
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Filter issues..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="jira-input"
          style={{ paddingLeft: '32px' }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F5F7', borderBottom: '1px solid #DFE1E6', color: '#5E6C84' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '90px' }}>Type</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '110px' }}>Key</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>Summary</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '130px' }}>Status</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '110px' }}>Priority</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '150px' }}>Assignee</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, width: '80px', textAlign: 'center' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                style={{ borderBottom: '1px solid #EBECF0', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFBFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <td style={{ padding: '10px 14px' }}>
                  <IssueTypeBadge type={issue.type} size={15} />
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0052CC' }}>{issue.key}</td>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: '#172B4D' }}>{issue.summary}</td>
                <td style={{ padding: '10px 14px' }}>
                  <StatusBadge status={issue.status} size="sm" />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <PriorityBadge priority={issue.priority} showLabel={true} size={14} />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <Avatar user={issue.assignee} size="sm" showName={true} />
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#5E6C84' }}>
                  {issue.story_points ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
