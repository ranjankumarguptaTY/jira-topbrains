import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { BoardFilterBar } from './BoardFilterBar';
import { BoardColumn } from './BoardColumn';
import { BoardConfigModal } from '../modal/BoardConfigModal';
import { issuesApi } from '../../api/issues';
import { projectsApi } from '../../api/projects';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Sparkles, Layers, ListTodo, Plus } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#42526E' },
  { id: 'inprogress', title: 'In Progress', color: '#0052CC' },
  { id: 'inreview', title: 'In Review', color: '#FF8B00' },
  { id: 'done', title: 'Done', color: '#00875A' },
];

export const KanbanBoard = () => {
  const {
    currentProject,
    activeSprint,
    refreshKey,
    searchQuery,
    selectedAssignees,
    onlyMyIssues,
    setActiveTab,
    setIsCreateProjectOpen,
    refreshBoard,
  } = useProject();

  const { currentUser, isSuperAdmin, isOrgAdmin } = useAuth();
  const { showToast } = useModal();
  const canManageBoard =
    isSuperAdmin() ||
    isOrgAdmin() ||
    (currentProject?.lead_id && String(currentProject.lead_id) === String(currentUser?.id));

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBoardConfigOpen, setIsBoardConfigOpen] = useState(false);

  // Load issues for the board
  useEffect(() => {
    const fetchBoardIssues = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        const params = { project_id: currentProject.id };
        if (activeSprint) {
          params.sprint_id = activeSprint.id;
        }
        const data = await issuesApi.list(params);
        // Exclude subtasks from top-level board columns (they are shown inside parent cards)
        const parentIssues = data.filter((i) => i.type !== 'subtask');
        setIssues(parentIssues);
      } catch (err) {
        console.error('Failed to load board issues', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardIssues();
  }, [currentProject, activeSprint, refreshKey]);

  // Apply frontend filters
  const filteredIssues = issues.filter((issue) => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSummary = issue.summary?.toLowerCase().includes(q);
      const matchKey = issue.key?.toLowerCase().includes(q);
      const matchEpic = issue.epic?.summary?.toLowerCase().includes(q);
      if (!matchSummary && !matchKey && !matchEpic) return false;
    }

    // Assignee filter
    if (selectedAssignees.length > 0) {
      if (!issue.assignee_id || !selectedAssignees.includes(issue.assignee_id)) {
        return false;
      }
    }

    // Only my issues filter
    if (onlyMyIssues && currentUser) {
      if (issue.assignee_id !== currentUser.id) return false;
    }

    return true;
  });

  // Group issues by column status (dynamically supports custom project card columns)
  const projectColumns =
    currentProject?.columns && currentProject.columns.length > 0
      ? currentProject.columns
      : COLUMNS;

  const columnsData = projectColumns.map((col) => ({
    ...col,
    issues: filteredIssues
      .filter((i) => (i.status || 'todo').toLowerCase() === col.id.toLowerCase())
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
  }));

  const handleMoveColumn = async (fromIndex, toIndex) => {
    if (!canManageBoard || !currentProject) return;
    if (toIndex < 0 || toIndex >= projectColumns.length) return;

    const newCols = Array.from(projectColumns);
    const [movedCol] = newCols.splice(fromIndex, 1);
    newCols.splice(toIndex, 0, movedCol);

    currentProject.columns = newCols;
    try {
      await projectsApi.updateBoardConfig(currentProject.id, { columns: newCols });
      refreshBoard();
      showToast({ message: `Moved "${movedCol.title}" column to position ${toIndex + 1}`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to reorder columns: ' + err.message, type: 'error' });
    }
  };

  const handleEditColumn = async (index, updatedCol) => {
    if (!canManageBoard || !currentProject) return;
    const newCols = [...projectColumns];
    newCols[index] = updatedCol;
    currentProject.columns = newCols;
    try {
      await projectsApi.updateBoardConfig(currentProject.id, { columns: newCols });
      refreshBoard();
      showToast({ message: `Column "${updatedCol.title}" updated`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to update column: ' + err.message, type: 'error' });
    }
  };

  const handleDeleteColumn = async (col) => {
    if (!canManageBoard || !currentProject) return;
    if (['todo', 'done'].includes(col.id)) {
      showToast({ message: 'Core columns cannot be deleted', type: 'error' });
      return;
    }
    if (!window.confirm(`Delete "${col.title}" column? Any active tickets in this column will safely move to "To Do".`)) {
      return;
    }
    try {
      await projectsApi.deleteColumn(currentProject.id, col.id);
      currentProject.columns = projectColumns.filter((c) => c.id !== col.id);
      refreshBoard();
      showToast({ message: `Column "${col.title}" deleted`, type: 'success' });
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to delete column', type: 'error' });
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // 1. Column Drag & Drop Reordering (persisted for everyone)
    if (type === 'COLUMN') {
      if (!canManageBoard || !currentProject) return;
      const newCols = Array.from(projectColumns);
      const [reorderedCol] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, reorderedCol);

      currentProject.columns = newCols;
      try {
        await projectsApi.updateBoardConfig(currentProject.id, { columns: newCols });
        refreshBoard();
        showToast({
          message: `Column "${reorderedCol.title}" moved to position ${destination.index + 1}`,
          type: 'success',
        });
      } catch (err) {
        showToast({ message: 'Failed to save column position: ' + err.message, type: 'error' });
      }
      return;
    }

    // 2. Issue Drag & Drop
    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    // Find dragged issue
    const draggedIssue = issues.find((i) => i.id === draggableId);
    if (!draggedIssue) return;

    // Destination column items
    const destItems = issues.filter(
      (i) => (i.status || 'todo').toLowerCase() === destStatus.toLowerCase() && i.id !== draggableId
    );

    // Calculate new order
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

    // Optimistic state update
    setIssues((prev) =>
      prev.map((item) => {
        if (item.id === draggableId) {
          return { ...item, status: destStatus, order: newOrder };
        }
        return item;
      })
    );

    // Backend sync
    try {
      await issuesApi.updateStatus(draggableId, destStatus, newOrder, draggedIssue.sprint_id);
    } catch (err) {
      console.error('Failed to sync issue drag status', err);
    }
  };

  return (
    <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Board Header Title */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-neutral-500)', fontWeight: 500 }}>
            Projects / {currentProject ? currentProject.name : 'Workspace'} /
          </span>
          <span style={{ fontSize: '13px', color: 'var(--color-neutral-900)', fontWeight: 600 }}>
            {activeSprint ? activeSprint.name : 'Active Board'}
          </span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-neutral-900)', margin: 0 }}>
          {currentProject ? (activeSprint ? `${currentProject.key} Board` : `${currentProject.name} Board`) : 'Kanban Board'}
        </h1>
      </div>

      {/* Filter Bar */}
      {currentProject && (
        <BoardFilterBar onOpenBoardConfig={() => setIsBoardConfigOpen(true)} />
      )}

      {/* No Project in Org state */}
      {!currentProject && !loading && (
        <div
          style={{
            backgroundColor: '#FAFBFC',
            border: '2px dashed #DFE1E6',
            borderRadius: '8px',
            padding: '48px 32px',
            textAlign: 'center',
            marginTop: '24px',
          }}
        >
          <Layers size={40} color="#0052CC" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', marginBottom: '8px' }}>
            No Projects in this Organization Yet
          </h3>
          <p style={{ fontSize: '14px', color: '#5E6C84', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            Projects are assigned to Teams. Click below to create a new Jira project for your team in this organization.
          </p>
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="jira-btn jira-btn-primary"
            style={{ margin: '0 auto' }}
          >
            + Create New Project
          </button>
        </div>
      )}

      {/* Active Sprint Notice if no sprint is active */}
      {currentProject && !activeSprint && issues.length === 0 && !loading && (
        <div
          style={{
            backgroundColor: 'var(--color-neutral-50)',
            border: '2px dashed var(--color-neutral-200)',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          <Layers size={36} color="#0052CC" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: '6px' }}>
            No active sprint found for this project
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Head over to the Backlog to start a sprint or create backlog issues to populate your board.
          </p>
          <button
            onClick={() => setActiveTab('backlog')}
            className="jira-btn jira-btn-primary"
            style={{ margin: '0 auto' }}
          >
            <ListTodo size={16} />
            Go to Backlog & Sprints
          </button>
        </div>
      )}

      {/* Kanban Drag and Drop Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '8px',
                overflowX: 'auto',
                paddingBottom: '16px',
                flex: 1,
                alignItems: 'flex-start',
              }}
            >
              {columnsData.map((column, index) => (
                <Draggable
                  key={column.id}
                  draggableId={`col-${column.id}`}
                  index={index}
                  isDragDisabled={!canManageBoard}
                >
                  {(colProvided, colSnapshot) => (
                    <div
                      ref={colProvided.innerRef}
                      {...colProvided.draggableProps}
                      style={{
                        ...colProvided.draggableProps.style,
                        opacity: colSnapshot.isDragging ? 0.85 : 1,
                      }}
                    >
                      <BoardColumn
                        column={column}
                        columnIndex={index}
                        totalColumns={columnsData.length}
                        issues={column.issues}
                        dragHandleProps={colProvided.dragHandleProps}
                        canManageBoard={canManageBoard}
                        onMoveColumnLeft={() => handleMoveColumn(index, index - 1)}
                        onMoveColumnRight={() => handleMoveColumn(index, index + 1)}
                        onDeleteColumn={() => handleDeleteColumn(column)}
                        onEditColumn={(updatedCol) => handleEditColumn(index, updatedCol)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Quick Add Card Column for Leads/Admins */}
              {canManageBoard && currentProject && (
                <div
                  onClick={() => setIsBoardConfigOpen(true)}
                  style={{
                    minWidth: '220px',
                    maxWidth: '220px',
                    minHeight: '120px',
                    borderRadius: '6px',
                    border: '2px dashed #DFE1E6',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: '#5E6C84',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    marginTop: '0px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.color = '#0052CC';
                    e.currentTarget.style.backgroundColor = '#DEEBFF33';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#DFE1E6';
                    e.currentTarget.style.color = '#5E6C84';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  <Plus size={20} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>+ Add Card Column</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Board & Tags Configuration Modal */}
      {isBoardConfigOpen && (
        <BoardConfigModal isOpen={isBoardConfigOpen} onClose={() => setIsBoardConfigOpen(false)} />
      )}
    </div>
  );
};
