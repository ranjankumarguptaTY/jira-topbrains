import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, CheckCircle, Plus, ChevronDown, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { BacklogIssueRow } from './BacklogIssueRow';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';
import { sprintsApi } from '../../api/sprints';

export const SprintSection = ({ sprint, issues }) => {
  const {
    currentProject,
    setIsStartSprintOpen,
    setIsCompleteSprintOpen,
    setTargetSprint,
    loadSprints,
    refreshBoard,
  } = useProject();

  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { showConfirm, showToast } = useModal();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isQuickCreate, setIsQuickCreate] = useState(false);
  const [quickSummary, setQuickSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate story points breakdown
  const todoPts = issues
    .filter((i) => (i.status || 'todo') === 'todo')
    .reduce((sum, i) => sum + (i.story_points || 0), 0);
  const inProgressPts = issues
    .filter((i) => ['inprogress', 'inreview'].includes((i.status || '').toLowerCase()))
    .reduce((sum, i) => sum + (i.story_points || 0), 0);
  const donePts = issues
    .filter((i) => (i.status || '') === 'done')
    .reduce((sum, i) => sum + (i.story_points || 0), 0);

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickSummary.trim() || !currentProject) return;

    try {
      setIsSubmitting(true);
      await issuesApi.create({
        project_id: currentProject.id,
        summary: quickSummary.trim(),
        sprint_id: sprint.id,
        status: 'todo',
        type: 'story',
        priority: 'medium',
      });
      setQuickSummary('');
      setIsQuickCreate(false);
      refreshBoard();
      showToast({ message: 'Issue created in sprint', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create issue: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSprint = () => {
    showConfirm({
      title: `Delete ${sprint.name}?`,
      message: 'Are you sure you want to delete this sprint? Incomplete issues will automatically be returned to the Backlog.',
      confirmText: 'Delete sprint',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await sprintsApi.delete(sprint.id);
          if (currentProject?.id) {
            await loadSprints(currentProject.id);
          }
          refreshBoard();
          showToast({ message: `${sprint.name} deleted`, type: 'success' });
        } catch (err) {
          showToast({ message: 'Failed to delete sprint: ' + err.message, type: 'error' });
        }
      },
    });
  };

  const isActive = sprint.status === 'active';

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Sprint Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: '#F4F5F7',
          border: '1px solid #DFE1E6',
          borderRadius: isExpanded && issues.length > 0 ? '4px 4px 0 0' : '4px',
        }}
      >
        {/* Left Sprint Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isExpanded ? <ChevronDown size={18} color="#5E6C84" /> : <ChevronRight size={18} />}
          </button>

          <span style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>{sprint.name}</span>

          {isActive && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#0052CC',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
              }}
            >
              Active Sprint
            </span>
          )}

          <span style={{ fontSize: '12px', color: '#5E6C84' }}>({issues.length} issues)</span>

          {sprint.goal && (
            <span style={{ fontSize: '12px', color: '#7A869A', fontStyle: 'italic', marginLeft: '8px' }}>
              Goal: {sprint.goal}
            </span>
          )}
        </div>

        {/* Right Sprint Actions & Story Point Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Point Breakdown Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#DFE1E6',
                color: '#42526E',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
              title="To Do story points"
            >
              {todoPts}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#DEEBFF',
                color: '#0052CC',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
              title="In Progress story points"
            >
              {inProgressPts}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#E3FCEF',
                color: '#006644',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
              title="Done story points"
            >
              {donePts}
            </span>
          </div>

          {/* Start / Complete Action Button - Admin Only */}
          {isAdmin && (
            <>
              {isActive ? (
                <button
                  onClick={() => {
                    setTargetSprint(sprint);
                    setIsCompleteSprintOpen(true);
                  }}
                  className="jira-btn jira-btn-subtle"
                  style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#E3FCEF', color: '#006644' }}
                >
                  <CheckCircle size={14} color="#006644" />
                  <span>Complete sprint</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTargetSprint(sprint);
                    setIsStartSprintOpen(true);
                  }}
                  className="jira-btn jira-btn-primary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  <Play size={13} fill="#FFFFFF" />
                  <span>Start sprint</span>
                </button>
              )}

              <button
                onClick={handleDeleteSprint}
                className="jira-btn-ghost"
                title="Delete sprint"
                style={{ padding: '4px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
              >
                <Trash2 size={15} color="#FF5630" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Droppable Sprint Issue List */}
      {isExpanded && (
        <Droppable droppableId={sprint.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                backgroundColor: snapshot.isDraggingOver ? '#E9F2FF' : '#FAFBFC',
                minHeight: '48px',
                border: '1px solid #DFE1E6',
                borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                transition: 'background-color 0.15s ease',
              }}
            >
              {issues.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#7A869A',
                    fontSize: '13px',
                    borderStyle: 'dashed',
                  }}
                >
                  Drag issues here from the backlog or other sprints
                </div>
              ) : (
                issues.map((issue, index) => (
                  <Draggable key={issue.id} draggableId={issue.id} index={index}>
                    {(providedDraggable, snapshotDraggable) => (
                      <div
                        ref={providedDraggable.innerRef}
                        {...providedDraggable.draggableProps}
                        {...providedDraggable.dragHandleProps}
                      >
                        <BacklogIssueRow issue={issue} isDragging={snapshotDraggable.isDragging} />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}

              {/* Inline Create inside Sprint */}
              {isQuickCreate ? (
                <form onSubmit={handleQuickCreate} style={{ padding: '8px 12px', backgroundColor: '#FFFFFF' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="What needs to be done in this sprint?"
                    value={quickSummary}
                    onChange={(e) => setQuickSummary(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsQuickCreate(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '13px',
                      borderRadius: '3px',
                      border: '2px solid #4C9AFF',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting || !quickSummary.trim()}
                      className="jira-btn jira-btn-primary"
                      style={{ fontSize: '12px', padding: '3px 8px' }}
                    >
                      {isSubmitting ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQuickCreate(false)}
                      className="jira-btn jira-btn-ghost"
                      style={{ fontSize: '12px', padding: '3px 6px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsQuickCreate(true)}
                  className="jira-btn jira-btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#5E6C84',
                    borderTop: '1px solid #DFE1E6',
                  }}
                >
                  <Plus size={15} />
                  <span>Create issue in sprint</span>
                </button>
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
};
