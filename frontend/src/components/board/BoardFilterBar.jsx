import React, { useState, useEffect } from 'react';
import { Search, X, CheckCircle, Flame, Filter, SlidersHorizontal } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { projectsApi } from '../../api/projects';
import { Avatar } from '../common/Avatar';

export const BoardFilterBar = ({ onOpenBoardConfig }) => {
  const {
    currentProject,
    activeSprint,
    searchQuery,
    setSearchQuery,
    selectedAssignees,
    setSelectedAssignees,
    onlyMyIssues,
    setOnlyMyIssues,
    setIsCompleteSprintOpen,
    setTargetSprint,
  } = useProject();

  const { currentUser, currentOrg, users, isSuperAdmin, isOrgAdmin } = useAuth();
  const canManageBoard = isSuperAdmin() || isOrgAdmin() || (currentProject?.lead_id && String(currentProject.lead_id) === String(currentUser?.id));
  const [teamUsers, setTeamUsers] = useState([]);

  useEffect(() => {
    if (currentProject?.id) {
      projectsApi
        .listMembers(currentProject.id)
        .then((members) => {
          const uList = (members || [])
            .map((m) => ({
              ...(m.user || {}),
              team_role: m.role,
            }))
            .filter((u) => u.id);
          setTeamUsers(uList);
        })
        .catch((err) => {
          console.error('Failed to load project team members for filter bar', err);
          setTeamUsers([]);
        });
    }
  }, [currentProject?.id]);

  const toggleAssignee = (userId) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const hasFilters = searchQuery || selectedAssignees.length > 0 || onlyMyIssues;

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedAssignees([]);
    setOnlyMyIssues(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 0',
      }}
    >
      {/* Filters Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '200px' }}>
          <Search
            size={14}
            color="var(--color-neutral-400)"
            style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Filter board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid var(--color-neutral-200)',
              backgroundColor: 'var(--color-neutral-50)',
              color: 'var(--color-neutral-900)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={14} color="var(--color-neutral-400)" />
            </button>
          )}
        </div>

        {/* Assignee Avatar Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(teamUsers.length > 0 ? teamUsers : users).map((u) => {
            const isSelected = selectedAssignees.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleAssignee(u.id)}
                title={`Filter by ${u.name}`}
                style={{
                  border: isSelected ? '2px solid #0052CC' : '2px solid transparent',
                  borderRadius: '50%',
                  padding: '1px',
                  background: 'transparent',
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Avatar user={u} size="md" tooltip={false} />
              </button>
            );
          })}
        </div>

        {/* Only My Issues Quick Filter */}
        <button
          onClick={() => setOnlyMyIssues(!onlyMyIssues)}
          className={`jira-btn ${onlyMyIssues ? 'jira-btn-primary' : 'jira-btn-subtle'}`}
          style={{ fontSize: '12px', padding: '5px 10px' }}
        >
          <span>Only my issues</span>
        </button>

        {canManageBoard && onOpenBoardConfig && (
          <button
            onClick={onOpenBoardConfig}
            className="jira-btn jira-btn-subtle"
            style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            title="Configure board card columns, statuses, and custom tags"
          >
            <SlidersHorizontal size={13} color="#0052CC" />
            <span>Customize Cards & Tags</span>
          </button>
        )}

        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="jira-btn jira-btn-ghost"
            style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--color-primary-600)' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Right side - Sprint Actions */}
      {activeSprint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-primary-600)',
              backgroundColor: 'var(--color-primary-50)',
              padding: '4px 10px',
              borderRadius: '4px',
            }}
          >
            Active: {activeSprint.name}
          </div>

          <button
            onClick={() => {
              setTargetSprint(activeSprint);
              setIsCompleteSprintOpen(true);
            }}
            className="jira-btn jira-btn-subtle"
            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success-600)', backgroundColor: 'var(--color-success-50)' }}
          >
            <CheckCircle size={15} color="var(--color-success-600)" />
            <span>Complete sprint</span>
          </button>
        </div>
      )}
    </div>
  );
};
