import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { BoardFilterBar } from './BoardFilterBar';
import { BoardColumn } from './BoardColumn';
import { issuesApi } from '../../api/issues';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Layers, ListTodo } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'inprogress', title: 'In Progress' },
  { id: 'inreview', title: 'In Review' },
  { id: 'done', title: 'Done' },
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
  } = useProject();

  const { currentUser } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load issues for the board
  useEffect(() => {
    const fetchBoardIssues = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        // If there is an active sprint, fetch issues for active sprint; otherwise fetch all active project issues
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

  // Group issues by column status
  const columnsData = COLUMNS.map((col) => ({
    ...col,
    issues: filteredIssues
      .filter((i) => (i.status || 'todo').toLowerCase() === col.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
  }));

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    // Find dragged issue
    const draggedIssue = issues.find((i) => i.id === draggableId);
    if (!draggedIssue) return;

    // Destination column items
    const destItems = issues.filter(
      (i) => (i.status || 'todo').toLowerCase() === destStatus && i.id !== draggableId
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
    <div style={{ padding: '0 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Board Title Header */}
      <div style={{ paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', color: '#5E6C84', fontWeight: 500 }}>
            Projects / {currentProject?.name} /
          </span>
          <span style={{ fontSize: '13px', color: '#172B4D', fontWeight: 600 }}>
            {activeSprint ? activeSprint.name : 'Kanban Board'}
          </span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
          {activeSprint ? `${currentProject?.key || 'JIRA'} Board` : `${currentProject?.name} Board`}
        </h1>
      </div>

      {/* Filter Bar */}
      <BoardFilterBar />

      {/* Active Sprint Notice if no sprint is active */}
      {!activeSprint && issues.length === 0 && !loading && (
        <div
          style={{
            backgroundColor: '#FAFBFC',
            border: '2px dashed #DFE1E6',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          <Layers size={36} color="#0052CC" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>
            No active sprint found for this project
          </h3>
          <p style={{ fontSize: '13px', color: '#5E6C84', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Head over to the Backlog to start a sprint or create backlog issues to populate your board.
          </p>
          <button
            onClick={() => setActiveTab('backlog')}
            className="jira-btn jira-btn-primary"
            style={{ margin: '0 auto' }}
          >
            <ListTodo size={16} />
            <span>Go to Backlog & Sprints</span>
          </button>
        </div>
      )}

      {/* Kanban Drag and Drop Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '8px',
            overflowX: 'auto',
            paddingBottom: '16px',
            flex: 1,
          }}
        >
          {columnsData.map((column) => (
            <BoardColumn key={column.id} column={column} issues={column.issues} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
