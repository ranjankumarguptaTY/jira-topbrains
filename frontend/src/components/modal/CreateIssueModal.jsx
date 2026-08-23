import React, { useState, useEffect } from 'react';
import { X, Plus, Bookmark, CheckSquare, AlertCircle, Zap, Layers } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';

const ISSUE_TYPES = [
  { id: 'story', label: 'Story', icon: Bookmark, color: '#36B37E' },
  { id: 'task', label: 'Task', icon: CheckSquare, color: '#4C9AFF' },
  { id: 'bug', label: 'Bug', icon: AlertCircle, color: '#FF5630' },
  { id: 'epic', label: 'Epic', icon: Zap, color: '#6554C0' },
];

const PRIORITIES = [
  { id: 'highest', label: 'Highest' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'lowest', label: 'Lowest' },
];

export const CreateIssueModal = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    projects,
    currentProject,
    sprints,
    activeSprint,
    refreshBoard,
  } = useProject();

  const { currentUser, users } = useAuth();
  const { showToast } = useModal();

  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('story');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [epicId, setEpicId] = useState('');
  const [epics, setEpics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentProject) {
      setProjectId(currentProject.id);
      if (activeSprint) {
        setSprintId(activeSprint.id);
      } else {
        setSprintId('');
      }

      // Load epics for this project
      issuesApi.list({ project_id: currentProject.id, type: 'epic' }).then(setEpics).catch(console.error);
    }
  }, [currentProject, activeSprint, isCreateModalOpen]);

  if (!isCreateModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim() || !projectId) return;

    try {
      setIsSubmitting(true);
      await issuesApi.create({
        project_id: projectId,
        type,
        summary: summary.trim(),
        description: description.trim(),
        priority,
        story_points: storyPoints !== '' ? parseInt(storyPoints, 10) : null,
        assignee_id: assigneeId || null,
        reporter_id: currentUser?.id || null,
        sprint_id: sprintId || null,
        epic_id: type !== 'epic' ? epicId || null : null,
        status: 'todo',
      });

      // Reset
      setSummary('');
      setDescription('');
      setStoryPoints('');
      setIsCreateModalOpen(false);
      refreshBoard();
      showToast({ message: 'Issue created successfully', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create issue: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '92vw',
          maxHeight: '88vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Create issue</h2>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="jira-btn jira-btn-ghost"
            style={{ padding: '6px' }}
          >
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Project & Issue Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Project <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Issue Type <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Summary <span style={{ color: '#FF5630' }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Implement real-time notifications"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Add context, acceptance criteria, or details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF', resize: 'vertical' }}
              />
            </div>

            {/* Priority & Story Points */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Story Points
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 3, 5, 8"
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                />
              </div>
            </div>

            {/* Assignee & Sprint */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Sprint
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">Backlog (No Sprint)</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.status === 'active' ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Epic Link */}
            {type !== 'epic' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Parent Epic
                </label>
                <select
                  value={epicId}
                  onChange={(e) => setEpicId(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">None</option>
                  {epics.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.key} - {ep.summary}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #DFE1E6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#FAFBFC',
            }}
          >
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="jira-btn jira-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !summary.trim()}
              className="jira-btn jira-btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
