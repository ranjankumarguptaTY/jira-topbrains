import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, ListTodo, ChevronDown, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { SprintSection } from './SprintSection';
import { BacklogIssueRow } from './BacklogIssueRow';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';
import { sprintsApi } from '../../api/sprints';

export const BacklogView = () => {
  const { currentProject, sprints, loadSprints, refreshKey, refreshBoard, setIsCreateSprintOpen } = useProject();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { showToast } = useModal();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBacklogExpanded, setIsBacklogExpanded] = useState(true);
  const [isQuickCreate, setIsQuickCreate] = useState(false);
  const [quickSummary, setQuickSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all project issues
  useEffect(() => {
    const fetchIssues = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        const data = await issuesApi.list({ project_id: currentProject.id });
        const parentIssues = data.filter((i) => i.type !== 'subtask');
        setIssues(parentIssues);
      } catch (err) {
        showToast({ message: 'Failed to load backlog issues: ' + err.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, [currentProject, refreshKey]);

  // Create new sprint directly
  const handleCreateSprint = async () => {
    if (!currentProject) return;
    try {
      const sprintNumber = (sprints?.length || 0) + 1;
      await sprintsApi.create({
        project_id: currentProject.id,
        name: `${currentProject.key || 'JIRA'} Sprint ${sprintNumber}`,
        goal: '',
      });
      if (currentProject?.id) {
        await loadSprints(currentProject.id);
      }
      refreshBoard();
      showToast({ message: 'Sprint created', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create sprint: ' + (err.response?.data?.detail || err.message), type: 'error' });
    }
  };

  // Quick create issue in backlog
  const handleQuickCreateBacklog = async (e) => {
    e.preventDefault();
    if (!quickSummary.trim() || !currentProject) return;

    try {
      setIsSubmitting(true);
      await issuesApi.create({
        project_id: currentProject.id,
        summary: quickSummary.trim(),
        sprint_id: null,
        status: 'todo',
        type: 'story',
        priority: 'medium',
      });
      setQuickSummary('');
      setIsQuickCreate(false);
      refreshBoard();
      showToast({ message: 'Issue added to backlog', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create issue: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and drop between sprints and backlog
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceContainer = source.droppableId;
    const destContainer = destination.droppableId;

    // Destination sprint ID (null if 'backlog')
    const targetSprintId = destContainer === 'backlog' ? null : destContainer;

    // Calculate new order
    const destItems = issues.filter((i) => {
      if (destContainer === 'backlog') return !i.sprint_id && i.id !== draggableId;
      return i.sprint_id === destContainer && i.id !== draggableId;
    });

    let newOrder = 1000.0;
    if (destItems.length === 0) {
      newOrder = 1000.0;
    } else if (destination.index === 0) {
      newOrder = (destItems[0].order || 1000.0) / 2;
    } else if (destination.index >= destItems.length) {
      newOrder = (destItems[destItems.length - 1].order || 1000.0) + 1000.0;
    } else {
      const prev = destItems[destination.index - 1].order || 0.0;
      const next = destItems[destination.index].order || 2000.0;
      newOrder = (prev + next) / 2;
    }

    // Optimistic update
    setIssues((prev) =>
      prev.map((item) => {
        if (item.id === draggableId) {
          return { ...item, sprint_id: targetSprintId, order: newOrder };
        }
        return item;
      })
    );

    // API update
    try {
      await issuesApi.updateStatus(draggableId, undefined, newOrder, targetSprintId || 'backlog');
    } catch (err) {
      console.error('Failed to sync sprint movement', err);
    }
  };

  const backlogIssues = issues
    .filter((i) => !i.sprint_id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div style={{ padding: '0 24px 32px 24px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
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
            <span style={{ fontSize: '13px', color: '#172B4D', fontWeight: 600 }}>Backlog</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            Backlog & Sprints
          </h1>
        </div>

        <button
          onClick={() => setIsCreateSprintOpen(true)}
          className="jira-btn jira-btn-primary"
          style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Create sprint</span>
        </button>
      </div>

      {/* Empty Sprints Callout */}
      {sprints.length === 0 && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FAFBFC',
            border: '1px dashed #C1C7D0',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '2px' }}>
              No active or upcoming sprints
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>
              Create a sprint to organize, prioritize, and assign issues from the backlog to your team.
            </div>
          </div>
          <button
            onClick={() => setIsCreateSprintOpen(true)}
            className="jira-btn jira-btn-subtle"
            style={{
              fontSize: '13px',
              backgroundColor: '#DEEBFF',
              color: '#0052CC',
              border: '1px solid #B3D4FF',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} />
            <span>Create sprint</span>
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Sprints List */}
        {sprints.map((sprint) => {
          const sprintIssues = issues
            .filter((i) => i.sprint_id === sprint.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return <SprintSection key={sprint.id} sprint={sprint} issues={sprintIssues} />;
        })}

        {/* Main Backlog Section */}
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#F4F5F7',
              border: '1px solid #DFE1E6',
              borderRadius: isBacklogExpanded && backlogIssues.length > 0 ? '4px 4px 0 0' : '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsBacklogExpanded(!isBacklogExpanded)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {isBacklogExpanded ? <ChevronDown size={18} color="#5E6C84" /> : <ChevronRight size={18} />}
              </button>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>Backlog</span>
              <span style={{ fontSize: '12px', color: '#5E6C84' }}>({backlogIssues.length} issues)</span>
            </div>

            <span style={{ fontSize: '12px', color: '#5E6C84' }}>
              {backlogIssues.reduce((sum, i) => sum + (i.story_points || 0), 0)} story points
            </span>
          </div>

          {isBacklogExpanded && (
            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? '#E9F2FF' : '#FAFBFC',
                    minHeight: '60px',
                    border: '1px solid #DFE1E6',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {backlogIssues.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#7A869A', fontSize: '13px' }}>
                      Your backlog is empty. Create new items below to plan upcoming sprints.
                    </div>
                  ) : (
                    backlogIssues.map((issue, index) => (
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

                  {/* Create Issue inside Backlog */}
                  {isQuickCreate ? (
                    <form onSubmit={handleQuickCreateBacklog} style={{ padding: '8px 12px', backgroundColor: '#FFFFFF' }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="What needs to be done in backlog?"
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
                      <span>Create issue in backlog</span>
                    </button>
                  )}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>
    </div>
  );
};
