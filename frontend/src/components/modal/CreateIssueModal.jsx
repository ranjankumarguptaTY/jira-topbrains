import React, { useState, useEffect } from 'react';
import { X, Plus, Bookmark, CheckSquare, AlertCircle, Zap, Layers } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';
import { projectsApi } from '../../api/projects';
import { JiraRichTextEditor } from '../common/JiraRichTextEditor';

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

  const { currentUser, currentOrg, users } = useAuth();
  const { showToast } = useModal();

  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('story');
  const [status, setStatus] = useState('todo');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [epicId, setEpicId] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [epics, setEpics] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const targetProjId = projectId || currentProject?.id;
    if (targetProjId && isCreateModalOpen) {
      projectsApi
        .listMembers(targetProjId)
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
          console.error('Failed to load project team members', err);
          setTeamUsers([]);
        });
    }
  }, [projectId, currentProject?.id, isCreateModalOpen]);

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

  const handleToggleTag = (tagName) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleAddCustomTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = customTagInput.trim().replace(/,/g, '');
      if (val && !selectedTags.includes(val)) {
        setSelectedTags([...selectedTags, val]);
        setCustomTagInput('');
      }
    }
  };

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
        status: status || 'todo',
        labels: selectedTags,
      });

      // Reset
      setSummary('');
      setDescription('');
      setStoryPoints('');
      setSelectedTags([]);
      setCustomTagInput('');
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

            {/* Description Rich Text Editor */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                Description
              </label>
              <JiraRichTextEditor
                value={description}
                onChange={(html) => setDescription(html)}
                placeholder="Add context, acceptance criteria, or details..."
                minHeight="120px"
              />
            </div>

            {/* Priority & Status */}
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
                  Status / Board Column
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  {(currentProject?.columns || [
                    { id: 'todo', title: 'To Do' },
                    { id: 'inprogress', title: 'In Progress' },
                    { id: 'inreview', title: 'In Review' },
                    { id: 'done', title: 'Done' },
                  ]).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.label || c.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Story Points */}
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

            {/* Project Tags / Labels */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>Tags & Labels</span>
                {selectedTags.length > 0 && <span style={{ color: '#0052CC', textTransform: 'none', fontWeight: 600 }}>{selectedTags.length} selected</span>}
              </label>
              <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {(currentProject?.tags || []).map((t) => {
                  const isSelected = selectedTags.includes(t.name || t.id);
                  const color = t.color || '#0052CC';
                  return (
                    <button
                      key={t.id || t.name}
                      type="button"
                      onClick={() => handleToggleTag(t.name || t.id)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: isSelected ? `1.5px solid ${color}` : '1px solid #DFE1E6',
                        background: isSelected ? `${color}22` : '#FFF',
                        color: isSelected ? color : '#5E6C84',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      {t.name}
                    </button>
                  );
                })}

                {/* Custom tags entered */}
                {selectedTags
                  .filter((st) => !(currentProject?.tags || []).some((t) => (t.name || t.id) === st))
                  .map((st) => (
                    <span
                      key={st}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1.5px solid #0052CC',
                        background: '#DEEBFF',
                        color: '#0747A6',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {st}
                      <button
                        type="button"
                        onClick={() => handleToggleTag(st)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0747A6', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}

                <input
                  type="text"
                  placeholder="+ Type & Enter tag..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={handleAddCustomTag}
                  className="jira-input"
                  style={{ width: '150px', fontSize: '11px', padding: '3px 8px', height: '26px' }}
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
                  {(teamUsers.length > 0 ? teamUsers : users).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.team_role ? `(${u.team_role})` : u.email ? `(${u.email})` : ''}
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
