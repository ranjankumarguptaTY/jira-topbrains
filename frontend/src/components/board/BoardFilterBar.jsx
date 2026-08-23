import React from 'react';
import { Search, X, CheckCircle, Flame, Filter } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const BoardFilterBar = () => {
  const {
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

  const { currentUser, users } = useAuth();

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
            color="#7A869A"
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
              border: '1px solid var(--jira-border)',
              backgroundColor: '#FAFBFC',
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
              <X size={14} color="#7A869A" />
            </button>
          )}
        </div>

        {/* Assignee Avatar Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {users.map((u) => {
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

        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="jira-btn jira-btn-ghost"
            style={{ fontSize: '12px', padding: '4px 8px', color: '#0052CC' }}
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
              color: '#5E6C84',
              backgroundColor: '#DEEBFF',
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
            style={{ fontSize: '12px', fontWeight: 600, color: '#006644', backgroundColor: '#E3FCEF' }}
          >
            <CheckCircle size={15} color="#006644" />
            <span>Complete sprint</span>
          </button>
        </div>
      )}
    </div>
  );
};
