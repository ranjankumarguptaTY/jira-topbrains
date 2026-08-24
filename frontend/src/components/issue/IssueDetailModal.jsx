import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Share2,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Send,
  MessageSquare,
  History,
  Tag,
  Zap,
  Check,
  ChevronDown
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';
import { commentsApi } from '../../api/comments';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Avatar } from '../common/Avatar';

const STATUS_OPTIONS = [
  { id: 'todo', label: 'TO DO' },
  { id: 'inprogress', label: 'IN PROGRESS' },
  { id: 'inreview', label: 'IN REVIEW' },
  { id: 'done', label: 'DONE' },
];

const PRIORITY_OPTIONS = [
  { id: 'highest', label: 'Highest' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'lowest', label: 'Lowest' },
];

const TYPE_OPTIONS = [
  { id: 'story', label: 'Story' },
  { id: 'task', label: 'Task' },
  { id: 'bug', label: 'Bug' },
  { id: 'epic', label: 'Epic' },
  { id: 'subtask', label: 'Sub-task' },
];

export const IssueDetailModal = () => {
  const { selectedIssueId, setSelectedIssueId, refreshBoard, currentProject } = useProject();
  const { currentUser, users } = useAuth();
  const { showConfirm, showToast } = useModal();

  const [issue, setIssue] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [epics, setEpics] = useState([]);
  const [activeTab, setActiveTab] = useState('comments'); // comments or history

  // Form states
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [timeEstimate, setTimeEstimate] = useState(0);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newSubtaskSummary, setNewSubtaskSummary] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [loading, setLoading] = useState(true);

  // Debounce timers
  const storyPointsTimerRef = useRef(null);
  const timeSpentTimerRef = useRef(null);
  const timeEstimateTimerRef = useRef(null);

  const fetchIssueDetails = async (id) => {
    try {
      setLoading(true);
      const data = await issuesApi.get(id);
      setIssue(data);
      setSummary(data.summary || '');
      setDescription(data.description || '');
      setStoryPoints(data.story_points !== null && data.story_points !== undefined ? String(data.story_points) : '');
      setTimeSpent(data.time_spent || 0);
      setTimeEstimate(data.time_original_estimate || 0);

      // Load subtasks
      const subtaskData = await issuesApi.getSubtasks(id);
      setSubtasks(subtaskData);

      // Load comments
      const commentData = await commentsApi.getByIssue(id);
      setComments(commentData);

      // Load activity
      const activityData = await commentsApi.getActivity(id);
      setActivities(activityData);

      // Load epics
      if (currentProject) {
        const epicsData = await issuesApi.list({ project_id: currentProject.id, type: 'epic' });
        setEpics(epicsData);
      }
    } catch (err) {
      showToast({ message: 'Failed to load issue details: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIssueId) {
      fetchIssueDetails(selectedIssueId);
    }

    return () => {
      if (storyPointsTimerRef.current) clearTimeout(storyPointsTimerRef.current);
      if (timeSpentTimerRef.current) clearTimeout(timeSpentTimerRef.current);
      if (timeEstimateTimerRef.current) clearTimeout(timeEstimateTimerRef.current);
    };
  }, [selectedIssueId]);

  if (!selectedIssueId) return null;

  const handleUpdateField = async (fields, showNotification = true) => {
    try {
      const updated = await issuesApi.update(selectedIssueId, fields);
      setIssue(updated);
      refreshBoard();
      // reload activity
      const activityData = await commentsApi.getActivity(selectedIssueId);
      setActivities(activityData);
      if (showNotification) {
        showToast({ message: 'Saved changes', type: 'success' });
      }
    } catch (err) {
      showToast({ message: 'Failed to update: ' + err.message, type: 'error' });
    }
  };

  // Debounced Story Points handler
  const handleStoryPointsChange = (val) => {
    setStoryPoints(val);
    if (storyPointsTimerRef.current) {
      clearTimeout(storyPointsTimerRef.current);
    }
    storyPointsTimerRef.current = setTimeout(async () => {
      const num = val === '' ? null : parseInt(val, 10);
      if (isNaN(num) && val !== '') return;
      await handleUpdateField({ story_points: num }, false);
    }, 500);
  };

  const handleStoryPointsBlur = () => {
    if (storyPointsTimerRef.current) {
      clearTimeout(storyPointsTimerRef.current);
    }
    const num = storyPoints === '' ? null : parseInt(storyPoints, 10);
    if (isNaN(num) && storyPoints !== '') return;
    if (num !== (issue?.story_points ?? null)) {
      handleUpdateField({ story_points: num }, false);
    }
  };

  // Debounced Time Tracking handlers
  const handleTimeSpentChange = (val) => {
    const num = parseFloat(val) || 0;
    setTimeSpent(num);
    if (timeSpentTimerRef.current) {
      clearTimeout(timeSpentTimerRef.current);
    }
    timeSpentTimerRef.current = setTimeout(async () => {
      await handleUpdateField({ time_spent: num }, false);
    }, 500);
  };

  const handleTimeEstimateChange = (val) => {
    const num = parseFloat(val) || 0;
    setTimeEstimate(num);
    if (timeEstimateTimerRef.current) {
      clearTimeout(timeEstimateTimerRef.current);
    }
    timeEstimateTimerRef.current = setTimeout(async () => {
      await handleUpdateField({ time_original_estimate: num }, false);
    }, 500);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await issuesApi.updateStatus(selectedIssueId, newStatus);
      setIssue(updated);
      refreshBoard();
      const activityData = await commentsApi.getActivity(selectedIssueId);
      setActivities(activityData);
      showToast({ message: `Status updated to ${newStatus.toUpperCase()}`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to update status: ' + err.message, type: 'error' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const comment = await commentsApi.create({
        issue_id: selectedIssueId,
        content: newComment.trim(),
      });
      setComments([...comments, comment]);
      setNewComment('');
      const activityData = await commentsApi.getActivity(selectedIssueId);
      setActivities(activityData);
      showToast({ message: 'Comment posted', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to add comment: ' + err.message, type: 'error' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    showConfirm({
      title: 'Delete Comment?',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await commentsApi.delete(commentId);
          setComments(comments.filter((c) => c.id !== commentId));
          showToast({ message: 'Comment deleted', type: 'success' });
        } catch (err) {
          showToast({ message: 'Failed to delete comment: ' + err.message, type: 'error' });
        }
      },
    });
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskSummary.trim() || !currentProject) return;
    try {
      const subtask = await issuesApi.create({
        project_id: currentProject.id,
        summary: newSubtaskSummary.trim(),
        type: 'subtask',
        parent_id: selectedIssueId,
        sprint_id: issue.sprint_id,
        status: 'todo',
        priority: 'medium',
      });
      setSubtasks([...subtasks, subtask]);
      setNewSubtaskSummary('');
      setIsAddingSubtask(false);
      refreshBoard();
      showToast({ message: 'Subtask added', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to add subtask: ' + err.message, type: 'error' });
    }
  };

  const handleToggleSubtask = async (subtask) => {
    const nextStatus = subtask.status === 'done' ? 'todo' : 'done';
    try {
      const updated = await issuesApi.updateStatus(subtask.id, nextStatus);
      setSubtasks(subtasks.map((s) => (s.id === subtask.id ? updated : s)));
      refreshBoard();
    } catch (err) {
      showToast({ message: 'Failed to update subtask: ' + err.message, type: 'error' });
    }
  };

  const handleDeleteIssue = () => {
    showConfirm({
      title: `Delete ${issue?.key || 'Issue'}?`,
      message: `Are you sure you want to delete "${issue?.summary}"? All associated subtasks, comments, and logs will be permanently removed.`,
      confirmText: 'Delete issue',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await issuesApi.delete(selectedIssueId);
          setSelectedIssueId(null);
          refreshBoard();
          showToast({ message: `${issue?.key} deleted successfully`, type: 'success' });
        } catch (err) {
          showToast({ message: 'Failed to delete issue: ' + err.message, type: 'error' });
        }
      },
    });
  };

  const completedSubtasksCount = subtasks.filter((s) => s.status === 'done').length;

  return (
    <div className="modal-overlay" onClick={() => setSelectedIssueId(null)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '940px',
          maxWidth: '95vw',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Left: Type + Key */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={issue?.type || 'story'}
              onChange={(e) => handleUpdateField({ type: e.target.value })}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                color: '#172B4D',
              }}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#5E6C84' }}>{issue?.key}</span>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleDeleteIssue}
              className="jira-btn jira-btn-ghost"
              title="Delete issue"
              style={{ padding: '6px', color: '#FF5630' }}
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setSelectedIssueId(null)}
              className="jira-btn jira-btn-ghost"
              style={{ padding: '6px' }}
            >
              <X size={18} color="#5E6C84" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
          {/* Left Main Content (65%) */}
          <div style={{ flex: '0 0 65%', padding: '24px', overflowY: 'auto', borderRight: '1px solid #DFE1E6', backgroundColor: '#FFFFFF' }}>
            {/* Summary Title */}
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={() => {
                if (summary !== issue?.summary) handleUpdateField({ summary });
              }}
              style={{
                width: '100%',
                fontSize: '20px',
                fontWeight: 700,
                color: '#172B4D',
                border: '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 6px',
                outline: 'none',
                marginBottom: '16px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#4C9AFF')}
            />

            {/* Description Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '8px' }}>
                Description
              </div>
              {isEditingDesc ? (
                <div>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="jira-input"
                    style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.5' }}
                    placeholder="Add a detailed description, reproduction steps, or context..."
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        handleUpdateField({ description });
                        setIsEditingDesc(false);
                      }}
                      className="jira-btn jira-btn-primary"
                    >
                      Save
                    </button>
                    <button onClick={() => setIsEditingDesc(false)} className="jira-btn jira-btn-ghost">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '4px',
                    backgroundColor: '#FAFBFC',
                    border: '1px solid #EBECF0',
                    minHeight: '64px',
                    fontSize: '13px',
                    color: description ? '#172B4D' : '#7A869A',
                    cursor: 'pointer',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5',
                  }}
                >
                  {description || 'Click to add a description...'}
                </div>
              )}
            </div>

            {/* Subtasks Section */}
            {issue?.type !== 'subtask' && (
              <div style={{ marginBottom: '28px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D' }}>Sub-tasks</span>
                    {subtasks.length > 0 && (
                      <span style={{ fontSize: '12px', color: '#5E6C84' }}>
                        ({completedSubtasksCount}/{subtasks.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtask Progress Bar */}
                {subtasks.length > 0 && (
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: '#EBECF0',
                      borderRadius: '3px',
                      marginBottom: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(completedSubtasksCount / subtasks.length) * 100}%`,
                        backgroundColor: '#36B37E',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}

                {/* Subtask Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EBECF0',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleSubtask(st)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {st.status === 'done' ? (
                            <CheckCircle2 size={16} color="#36B37E" />
                          ) : (
                            <Circle size={16} color="#7A869A" />
                          )}
                        </button>
                        <span
                          style={{
                            fontSize: '13px',
                            color: st.status === 'done' ? '#5E6C84' : '#172B4D',
                            textDecoration: st.status === 'done' ? 'line-through' : 'none',
                          }}
                        >
                          {st.summary}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#7A869A' }}>{st.key}</span>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Form */}
                {isAddingSubtask ? (
                  <form onSubmit={handleAddSubtask} style={{ marginTop: '8px' }}>
                    <input
                      autoFocus
                      type="text"
                      placeholder="What needs to be done?"
                      value={newSubtaskSummary}
                      onChange={(e) => setNewSubtaskSummary(e.target.value)}
                      className="jira-input"
                      style={{ fontSize: '13px', padding: '6px 8px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button type="submit" className="jira-btn jira-btn-primary" style={{ fontSize: '12px' }}>
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingSubtask(false)}
                        className="jira-btn jira-btn-ghost"
                        style={{ fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="jira-btn jira-btn-subtle"
                    style={{ marginTop: '8px', fontSize: '12px' }}
                  >
                    <Plus size={14} />
                    <span>Add sub-task</span>
                  </button>
                )}
              </div>
            )}

            {/* Activity & Discussion Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #DFE1E6', marginBottom: '16px' }}>
                <button
                  onClick={() => setActiveTab('comments')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: activeTab === 'comments' ? '#0052CC' : '#5E6C84',
                    borderBottom: activeTab === 'comments' ? '2px solid #0052CC' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Comments ({comments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: activeTab === 'history' ? '#0052CC' : '#5E6C84',
                    borderBottom: activeTab === 'history' ? '2px solid #0052CC' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <History size={16} />
                  <span>History ({activities.length})</span>
                </button>
              </div>

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div>
                  {/* Add Comment Input */}
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <Avatar user={currentUser} size="md" />
                    <div style={{ flex: 1 }}>
                      <textarea
                        rows={2}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="jira-input"
                        style={{ fontSize: '13px' }}
                      />
                      {newComment.trim() && (
                        <div style={{ marginTop: '6px' }}>
                          <button type="submit" className="jira-btn jira-btn-primary" style={{ fontSize: '12px' }}>
                            <Send size={13} />
                            <span>Save comment</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </form>

                  {/* Comments List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {comments.map((c) => (
                      <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                        <Avatar user={c.user} size="md" />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D' }}>
                              {c.user?.name || 'User'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#7A869A' }}>
                              {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                            </span>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#7A869A',
                                fontSize: '11px',
                                cursor: 'pointer',
                                marginLeft: 'auto',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                          <div style={{ fontSize: '13px', color: '#172B4D', lineHeight: '1.4' }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activities.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                      <Avatar user={a.user} size="sm" />
                      <div>
                        <span style={{ fontWeight: 600, color: '#172B4D' }}>{a.user?.name || 'Someone'}</span>{' '}
                        <span style={{ color: '#5E6C84' }}>
                          {a.action === 'changed_status'
                            ? `changed status from "${a.details.old_status}" to "${a.details.new_status}"`
                            : a.action === 'created_issue'
                            ? 'created this issue'
                            : a.action === 'added_comment'
                            ? 'commented on this issue'
                            : `updated ${a.details?.field || 'field'}`}
                        </span>
                        <div style={{ fontSize: '11px', color: '#7A869A' }}>
                          {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Meta (35%) */}
          <div
            style={{
              flex: '0 0 35%',
              padding: '24px 20px',
              backgroundColor: '#FAFBFC',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Status Dropdown */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Status
              </label>
              <select
                value={issue?.status || 'todo'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="jira-input"
                style={{
                  marginTop: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  textTransform: 'uppercase',
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Assignee
                </label>
                {currentUser && (
                  <button
                    onClick={() => handleUpdateField({ assignee_id: currentUser.id })}
                    style={{ background: 'none', border: 'none', color: '#0052CC', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Assign to me
                  </button>
                )}
              </div>
              <select
                value={issue?.assignee_id || ''}
                onChange={(e) => handleUpdateField({ assignee_id: e.target.value || null })}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reporter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Reporter
              </label>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar user={issue?.reporter} size="sm" showName={true} />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Priority
              </label>
              <select
                value={issue?.priority || 'medium'}
                onChange={(e) => handleUpdateField({ priority: e.target.value })}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Story Points */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Story Points
              </label>
              <input
                type="number"
                min="0"
                value={storyPoints}
                onChange={(e) => handleStoryPointsChange(e.target.value)}
                onBlur={handleStoryPointsBlur}
                placeholder="e.g. 5"
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Epic Link */}
            {issue?.type !== 'epic' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Parent Epic
                </label>
                <select
                  value={issue?.epic_id || ''}
                  onChange={(e) => handleUpdateField({ epic_id: e.target.value || null })}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">None (No Epic)</option>
                  {epics.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.key} - {ep.summary}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time Tracking */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Time Tracking
                </label>
                <span style={{ fontSize: '11px', color: '#5E6C84' }}>
                  {timeSpent}h logged / {timeEstimate}h estimated
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#DFE1E6',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(
                      100,
                      ((timeSpent || 0) / (timeEstimate || 1)) * 100
                    )}%`,
                    backgroundColor: '#0052CC',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#5E6C84' }}>Logged (h)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={timeSpent}
                    onChange={(e) => handleTimeSpentChange(e.target.value)}
                    className="jira-input"
                    style={{ fontSize: '12px', padding: '4px 6px', marginTop: '2px', backgroundColor: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#5E6C84' }}>Estimate (h)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={timeEstimate}
                    onChange={(e) => handleTimeEstimateChange(e.target.value)}
                    className="jira-input"
                    style={{ fontSize: '12px', padding: '4px 6px', marginTop: '2px', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>
            </div>

            {/* Meta Timestamps */}
            <div style={{ borderTop: '1px solid #DFE1E6', paddingTop: '16px', fontSize: '11px', color: '#7A869A' }}>
              <div>Created: {issue?.created_at ? new Date(issue.created_at).toLocaleDateString() : '-'}</div>
              <div style={{ marginTop: '2px' }}>
                Updated: {issue?.updated_at ? new Date(issue.updated_at).toLocaleDateString() : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
