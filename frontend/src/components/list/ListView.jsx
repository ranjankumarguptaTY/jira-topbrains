import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreHorizontal,
  Sliders,
  Check,
  X,
  Share2,
  Maximize2,
  Trash2,
  User,
  ArrowUpDown,
  Sparkles,
  Calendar,
  Globe,
  TrendingUp,
  Table2,
  Bookmark,
  CheckSquare,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';
import { commentsApi } from '../../api/comments';
import { Avatar } from '../common/Avatar';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';

const STATUS_OPTIONS = [
  { id: 'todo', label: 'TO DO', color: '#42526E', bg: '#DFE1E6' },
  { id: 'inprogress', label: 'IN PROGRESS', color: '#0052CC', bg: '#DEEBFF' },
  { id: 'inreview', label: 'IN REVIEW / READY FOR QA', color: '#5243AA', bg: '#EAE6FF' },
  { id: 'done', label: 'DONE / QA COMPLETED', color: '#006644', bg: '#E3FCEF' },
];

const PRIORITY_OPTIONS = [
  { id: 'lowest', label: 'Lowest', color: '#2684FF' },
  { id: 'low', label: 'Low', color: '#0052CC' },
  { id: 'medium', label: 'Medium', color: '#FFAB00' },
  { id: 'high', label: 'High', color: '#FF5630' },
  { id: 'highest', label: 'Highest', color: '#DE350B' },
];

const ISSUE_TYPES = [
  { id: 'story', label: 'Story', Icon: Bookmark, color: '#36B37E', bg: '#E3FCEF' },
  { id: 'task', label: 'Task', Icon: CheckSquare, color: '#4C9AFF', bg: '#DEEBFF' },
  { id: 'bug', label: 'Bug', Icon: AlertCircle, color: '#FF5630', bg: '#FFEBE6' },
  { id: 'epic', label: 'Epic', Icon: Zap, color: '#6554C0', bg: '#EAE6FF' },
];

export const ListView = () => {
  const {
    currentProject,
    refreshKey,
    refreshBoard,
    setSelectedIssueId,
    setIsCreateModalOpen,
    activeTab,
    setActiveTab,
    sprints,
  } = useProject();

  const { currentUser, users, currentOrg } = useAuth();
  const { showToast, showConfirm } = useModal();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'status', 'assignee', 'priority', 'epic'

  // Selection state
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);

  // Inline edit state
  const [editingSummaryId, setEditingSummaryId] = useState(null);
  const [editingSummaryText, setEditingSummaryText] = useState('');

  // Dropdown open states
  const [activeDropdown, setActiveDropdown] = useState(null); // { type: 'status'|'assignee'|'priority', issueId: '...' }
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  // Quick Inline Create Row State
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickSummary, setQuickSummary] = useState('');
  const [quickType, setQuickType] = useState('story');
  const [quickStatus, setQuickStatus] = useState('todo');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Expanded parent issues / subtasks
  const [expandedParents, setExpandedParents] = useState({});

  // Quick Comment state
  const [commentingIssueId, setCommentingIssueId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load issues
  const fetchIssues = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await issuesApi.list({ project_id: currentProject.id });
      setIssues(data || []);
    } catch (err) {
      console.error('Failed to load list issues', err);
      showToast({ message: 'Failed to load issues: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [currentProject?.id, refreshKey]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveDropdown(null);
      setShowFilterMenu(false);
      setShowGroupMenu(false);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchSummary = issue.summary?.toLowerCase().includes(q);
      const matchKey = issue.key?.toLowerCase().includes(q);
      const matchAssignee = issue.assignee?.name?.toLowerCase().includes(q);
      const matchStatus = issue.status?.toLowerCase().includes(q);
      if (!matchSummary && !matchKey && !matchAssignee && !matchStatus) return false;
    }

    if (selectedAssigneeFilter) {
      if (issue.assignee_id !== selectedAssigneeFilter) return false;
    }

    if (selectedTypeFilter !== 'all') {
      if (issue.type !== selectedTypeFilter) return false;
    }

    if (selectedStatusFilter !== 'all') {
      if ((issue.status || 'todo').toLowerCase() !== selectedStatusFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Handle inline summary save
  const handleSaveSummary = async (issueId) => {
    if (!editingSummaryText.trim()) {
      setEditingSummaryId(null);
      return;
    }
    const target = issues.find((i) => i.id === issueId);
    if (!target || target.summary === editingSummaryText.trim()) {
      setEditingSummaryId(null);
      return;
    }

    const updatedText = editingSummaryText.trim();
    // Optimistic
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, summary: updatedText } : i)));
    setEditingSummaryId(null);

    try {
      await issuesApi.update(issueId, { summary: updatedText });
      refreshBoard();
      showToast({ message: 'Summary updated', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to update summary: ' + err.message, type: 'error' });
      fetchIssues();
    }
  };

  // Handle status update
  const handleUpdateStatus = async (issueId, newStatus) => {
    setActiveDropdown(null);
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));

    try {
      await issuesApi.updateStatus(issueId, newStatus);
      refreshBoard();
      showToast({ message: `Status moved to ${newStatus.toUpperCase()}`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to change status: ' + err.message, type: 'error' });
      fetchIssues();
    }
  };

  // Handle assignee update
  const handleUpdateAssignee = async (issueId, newAssigneeId) => {
    setActiveDropdown(null);
    const assignedUser = users.find((u) => u.id === newAssigneeId) || null;
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, assignee_id: newAssigneeId, assignee: assignedUser } : i))
    );

    try {
      await issuesApi.update(issueId, { assignee_id: newAssigneeId || null });
      refreshBoard();
      showToast({
        message: assignedUser ? `Assigned to ${assignedUser.name}` : 'Unassigned',
        type: 'success',
      });
    } catch (err) {
      showToast({ message: 'Failed to assign issue: ' + err.message, type: 'error' });
      fetchIssues();
    }
  };

  // Handle priority update
  const handleUpdatePriority = async (issueId, newPriority) => {
    setActiveDropdown(null);
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, priority: newPriority } : i)));

    try {
      await issuesApi.update(issueId, { priority: newPriority });
      refreshBoard();
      showToast({ message: `Priority set to ${newPriority}`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to update priority: ' + err.message, type: 'error' });
      fetchIssues();
    }
  };

  // Handle quick create issue inline
  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickSummary.trim() || !currentProject) return;

    try {
      setIsSubmittingQuick(true);
      await issuesApi.create({
        project_id: currentProject.id,
        summary: quickSummary.trim(),
        type: quickType,
        status: quickStatus,
        priority: 'medium',
      });
      setQuickSummary('');
      setIsQuickCreateOpen(false);
      fetchIssues();
      refreshBoard();
      showToast({ message: 'Issue created successfully', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create issue: ' + err.message, type: 'error' });
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Handle quick comment add
  const handleAddComment = async (issueId) => {
    if (!commentText.trim()) {
      setCommentingIssueId(null);
      return;
    }

    try {
      setIsSubmittingComment(true);
      await commentsApi.create({
        issue_id: issueId,
        content: commentText.trim(),
      });
      setCommentText('');
      setCommentingIssueId(null);
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, comments_count: (i.comments_count || 0) + 1 } : i))
      );
      showToast({ message: 'Comment added', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to post comment: ' + err.message, type: 'error' });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIssueIds(filteredIssues.map((i) => i.id));
    } else {
      setSelectedIssueIds([]);
    }
  };

  const handleToggleSelect = (issueId) => {
    setSelectedIssueIds((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIssueIds.length === 0) return;
    showConfirm({
      title: `Delete ${selectedIssueIds.length} issues?`,
      message: 'Are you sure you want to delete the selected issues? This action cannot be undone.',
      confirmText: `Delete ${selectedIssueIds.length} Issues`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          for (const id of selectedIssueIds) {
            await issuesApi.delete(id);
          }
          setSelectedIssueIds([]);
          fetchIssues();
          refreshBoard();
          showToast({ message: 'Issues deleted successfully', type: 'success' });
        } catch (err) {
          showToast({ message: 'Error deleting issues: ' + err.message, type: 'error' });
        }
      },
    });
  };

  // Grouping logic
  const renderGroupedRows = () => {
    if (groupBy === 'status') {
      const groups = [
        { id: 'todo', title: 'To Do', color: '#42526E' },
        { id: 'inprogress', title: 'In Progress', color: '#0052CC' },
        { id: 'inreview', title: 'In Review', color: '#5243AA' },
        { id: 'done', title: 'Done', color: '#00875A' },
      ];
      return groups.map((g) => {
        const groupIssues = filteredIssues.filter(
          (i) => (i.status || 'todo').toLowerCase() === g.id.toLowerCase()
        );
        return renderGroupSection(g.title, groupIssues, g.color);
      });
    }

    if (groupBy === 'priority') {
      return PRIORITY_OPTIONS.map((p) => {
        const groupIssues = filteredIssues.filter(
          (i) => (i.priority || 'medium').toLowerCase() === p.id.toLowerCase()
        );
        return renderGroupSection(p.label, groupIssues, p.color);
      });
    }

    return renderTableRows(filteredIssues);
  };

  const renderGroupSection = (groupTitle, groupItems, color) => {
    return (
      <React.Fragment key={groupTitle}>
        <tr style={{ backgroundColor: '#F4F5F7', borderTop: '2px solid #DFE1E6', borderBottom: '1px solid #DFE1E6' }}>
          <td colSpan={7} style={{ padding: '8px 14px', fontWeight: 700, fontSize: '12px', color: color || '#172B4D' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{groupTitle}</span>
              <span style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 500 }}>
                ({groupItems.length} items)
              </span>
            </div>
          </td>
        </tr>
        {renderTableRows(groupItems)}
      </React.Fragment>
    );
  };

  const renderTableRows = (items) => {
    if (items.length === 0 && !isQuickCreateOpen) {
      return (
        <tr>
          <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#7A869A', fontSize: '13px' }}>
            No issues match your current filters. Click "+ Create" below to add a work item.
          </td>
        </tr>
      );
    }

    return items.map((issue) => {
      const isSelected = selectedIssueIds.includes(issue.id);
      const isEditingSummary = editingSummaryId === issue.id;
      const isEpic = issue.type === 'epic';
      const isExpanded = expandedParents[issue.id];
      const hasSubtasks = issue.subtask_stats?.total > 0;

      return (
        <tr
          key={issue.id}
          style={{
            borderBottom: '1px solid #EBECF0',
            backgroundColor: isSelected ? '#DEEBFF33' : '#FFFFFF',
            transition: 'background-color 0.12s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = '#FAFBFC';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          {/* Checkbox */}
          <td style={{ width: '40px', padding: '10px 12px', textAlign: 'center' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleSelect(issue.id)}
              style={{ cursor: 'pointer', borderRadius: '3px' }}
            />
          </td>

          {/* Type with expand chevron / subtask plus */}
          <td style={{ width: '70px', padding: '10px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {(isEpic || hasSubtasks) && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedParents((prev) => ({ ...prev, [issue.id]: !prev[issue.id] }))
                  }
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {isExpanded ? <ChevronDown size={14} color="#5E6C84" /> : <ChevronRight size={14} color="#5E6C84" />}
                </button>
              )}
              <IssueTypeBadge type={issue.type} size={15} />
            </div>
          </td>

          {/* Key */}
          <td style={{ width: '100px', padding: '10px 12px' }}>
            <button
              type="button"
              onClick={() => setSelectedIssueId(issue.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#0052CC',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {issue.key}
            </button>
          </td>

          {/* Summary (Inline Editable) */}
          <td style={{ padding: '10px 14px', minWidth: '320px' }}>
            {isEditingSummary ? (
              <input
                autoFocus
                type="text"
                value={editingSummaryText}
                onChange={(e) => setEditingSummaryText(e.target.value)}
                onBlur={() => handleSaveSummary(issue.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSummary(issue.id);
                  if (e.key === 'Escape') setEditingSummaryId(null);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: '13px',
                  borderRadius: '3px',
                  border: '2px solid #4C9AFF',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            ) : (
              <div
                onClick={() => {
                  setEditingSummaryId(issue.id);
                  setEditingSummaryText(issue.summary);
                }}
                title="Click to edit summary"
                style={{
                  cursor: 'text',
                  fontSize: '13px',
                  color: '#172B4D',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '560px',
                }}
              >
                {issue.summary}
              </div>
            )}
          </td>

          {/* Status (Interactive Dropdown Pill) */}
          <td style={{ width: '160px', padding: '10px 12px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(
                    activeDropdown?.issueId === issue.id && activeDropdown?.type === 'status'
                      ? null
                      : { type: 'status', issueId: issue.id }
                  );
                }}
                className="jira-btn-ghost"
                style={{
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <StatusBadge status={issue.status} size="sm" />
                <ChevronDown size={12} color="#5E6C84" />
              </button>

              {activeDropdown?.issueId === issue.id && activeDropdown?.type === 'status' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                    zIndex: 200,
                    padding: '4px',
                    minWidth: '170px',
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleUpdateStatus(issue.id, opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: opt.color,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span>{opt.label}</span>
                      {(issue.status || 'todo').toLowerCase() === opt.id && (
                        <Check size={14} color="#0052CC" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>

          {/* Comments Column */}
          <td style={{ width: '150px', padding: '10px 12px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentingIssueId(commentingIssueId === issue.id ? null : issue.id);
                  setCommentText('');
                }}
                className="jira-btn-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: issue.comments_count > 0 ? '#172B4D' : '#7A869A',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <MessageSquare size={14} color={issue.comments_count > 0 ? '#0052CC' : '#7A869A'} />
                <span>
                  {issue.comments_count > 0
                    ? `${issue.comments_count} comment${issue.comments_count > 1 ? 's' : ''}`
                    : 'Add comment'}
                </span>
              </button>

              {/* Quick Comment Popup */}
              {commentingIssueId === issue.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    width: '260px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                    zIndex: 200,
                    padding: '10px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', marginBottom: '6px' }}>
                    Add comment to {issue.key}
                  </div>
                  <textarea
                    autoFocus
                    rows={2}
                    placeholder="Type a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      fontSize: '12px',
                      borderRadius: '3px',
                      border: '1px solid #DFE1E6',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setCommentingIssueId(null)}
                      className="jira-btn jira-btn-ghost"
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingComment || !commentText.trim()}
                      onClick={() => handleAddComment(issue.id)}
                      className="jira-btn jira-btn-primary"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      {isSubmittingComment ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>

          {/* Assignee / Actions */}
          <td style={{ width: '140px', padding: '10px 12px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(
                    activeDropdown?.issueId === issue.id && activeDropdown?.type === 'assignee'
                      ? null
                      : { type: 'assignee', issueId: issue.id }
                  );
                }}
                className="jira-btn-ghost"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                }}
              >
                {issue.assignee ? (
                  <Avatar user={issue.assignee} size="sm" showName={true} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7A869A', fontSize: '12px' }}>
                    <User size={14} />
                    <span>Unassigned</span>
                  </div>
                )}
              </button>

              {activeDropdown?.issueId === issue.id && activeDropdown?.type === 'assignee' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                    zIndex: 200,
                    padding: '4px',
                    minWidth: '180px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateAssignee(issue.id, null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#5E6C84',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <User size={14} />
                    <span>Unassigned</span>
                  </button>

                  {users.map((usr) => (
                    <button
                      key={usr.id}
                      type="button"
                      onClick={() => handleUpdateAssignee(issue.id, usr.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '6px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#172B4D',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Avatar user={usr} size="sm" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {usr.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FFFFFF', minHeight: '100%' }}>
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div style={{ padding: '16px 24px 16px 24px', borderBottom: '1px solid #DFE1E6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5E6C84' }}>
              <span>Projects</span>
              <span>/</span>
              <span>{currentProject?.name || 'Workspace'}</span>
              <span>/</span>
              <span style={{ fontWeight: 600, color: '#172B4D' }}>List</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
                {currentProject ? `${currentProject.name} List` : 'Project List'}
              </h1>
              <span style={{ fontSize: '12px', color: '#5E6C84', fontWeight: 500 }}>
                ({filteredIssues.length} items)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="jira-btn jira-btn-primary"
              style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Create issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR (Search list, Avatar filters, Filter dropdown, Group dropdown) */}
      <div
        style={{
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FAFBFC',
          borderBottom: '1px solid #DFE1E6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search list */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={15}
              color="#7A869A"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search list"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="jira-input"
              style={{ paddingLeft: '32px', height: '32px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            />
          </div>

          {/* Quick Assignee Avatar Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {users.slice(0, 5).map((u) => {
              const isSelected = selectedAssigneeFilter === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedAssigneeFilter(isSelected ? null : u.id)}
                  title={`Filter by ${u.name}`}
                  style={{
                    padding: 0,
                    border: isSelected ? '2px solid #0052CC' : '2px solid transparent',
                    borderRadius: '50%',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Avatar user={u} size="sm" />
                </button>
              );
            })}
            {selectedAssigneeFilter && (
              <button
                type="button"
                onClick={() => setSelectedAssigneeFilter(null)}
                className="jira-btn jira-btn-ghost"
                style={{ fontSize: '11px', padding: '2px 6px' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterMenu(!showFilterMenu);
                setShowGroupMenu(false);
              }}
              className="jira-btn jira-btn-ghost"
              style={{
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #DFE1E6',
                backgroundColor: '#FFFFFF',
                padding: '4px 10px',
              }}
            >
              <span>Filter</span>
              <ChevronDown size={14} color="#5E6C84" />
            </button>

            {showFilterMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  width: '200px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DFE1E6',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                  zIndex: 200,
                  padding: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', marginBottom: '4px' }}>
                  TYPE
                </div>
                {['all', 'story', 'task', 'bug', 'epic'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedTypeFilter(t);
                      setShowFilterMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '4px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      textTransform: 'capitalize',
                      color: selectedTypeFilter === t ? '#0052CC' : '#172B4D',
                      fontWeight: selectedTypeFilter === t ? 700 : 400,
                    }}
                  >
                    <span>{t}</span>
                    {selectedTypeFilter === t && <Check size={14} color="#0052CC" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Actions (Group dropdown, Bulk delete if selected) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedIssueIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="jira-btn jira-btn-ghost"
              style={{ color: '#FF5630', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={14} />
              <span>Delete ({selectedIssueIds.length})</span>
            </button>
          )}

          {/* Group ▾ Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGroupMenu(!showGroupMenu);
                setShowFilterMenu(false);
              }}
              className="jira-btn jira-btn-ghost"
              style={{
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #DFE1E6',
                backgroundColor: '#FFFFFF',
                padding: '4px 10px',
              }}
            >
              <span>Group{groupBy !== 'none' ? `: ${groupBy}` : ''}</span>
              <ChevronDown size={14} color="#5E6C84" />
            </button>

            {showGroupMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  width: '160px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DFE1E6',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                  zIndex: 200,
                  padding: '4px',
                }}
              >
                {[
                  { id: 'none', label: 'None' },
                  { id: 'status', label: 'Status' },
                  { id: 'priority', label: 'Priority' },
                ].map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => {
                      setGroupBy(grp.id);
                      setShowGroupMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: groupBy === grp.id ? '#0052CC' : '#172B4D',
                      fontWeight: groupBy === grp.id ? 700 : 400,
                    }}
                  >
                    <span>{grp.label}</span>
                    {groupBy === grp.id && <Check size={14} color="#0052CC" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. MAIN LIST TABLE */}
      <div style={{ flex: 1, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F5F7', borderBottom: '1px solid #DFE1E6', color: '#5E6C84' }}>
              <th style={{ width: '40px', padding: '10px 12px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={
                    filteredIssues.length > 0 &&
                    selectedIssueIds.length === filteredIssues.length
                  }
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ width: '70px', padding: '10px 10px', fontWeight: 700 }}>Type</th>
              <th style={{ width: '100px', padding: '10px 12px', fontWeight: 700 }}>Key</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>Summary</th>
              <th style={{ width: '160px', padding: '10px 12px', fontWeight: 700 }}>Status</th>
              <th style={{ width: '150px', padding: '10px 12px', fontWeight: 700 }}>Comments</th>
              <th style={{ width: '140px', padding: '10px 12px', fontWeight: 700 }}>Assignee</th>
            </tr>
          </thead>
          <tbody>{renderGroupedRows()}</tbody>
        </table>

        {/* 5. STICKY / BOTTOM QUICK CREATE ROW (+ Create) */}
        <div style={{ borderTop: '1px solid #DFE1E6', padding: '12px 24px', backgroundColor: '#FAFBFC' }}>
          {isQuickCreateOpen ? (
            <form onSubmit={handleQuickCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Type Select */}
              <select
                value={quickType}
                onChange={(e) => setQuickType(e.target.value)}
                style={{
                  padding: '6px 8px',
                  fontSize: '13px',
                  borderRadius: '3px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
              </select>

              {/* Summary Input */}
              <input
                autoFocus
                type="text"
                placeholder="What needs to be done? Press Enter to save..."
                value={quickSummary}
                onChange={(e) => setQuickSummary(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsQuickCreateOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '13px',
                  borderRadius: '3px',
                  border: '2px solid #4C9AFF',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />

              <button
                type="submit"
                disabled={isSubmittingQuick || !quickSummary.trim()}
                className="jira-btn jira-btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {isSubmittingQuick ? 'Creating...' : 'Create'}
              </button>

              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="jira-btn jira-btn-ghost"
                style={{ fontSize: '12px', padding: '6px 10px' }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(true)}
              className="jira-btn jira-btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0052CC',
                padding: '6px 12px',
                borderRadius: '4px',
              }}
            >
              <Plus size={16} />
              <span>Create</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
