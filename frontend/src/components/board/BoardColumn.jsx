import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal } from 'lucide-react';
import { IssueCard } from './IssueCard';
import { issuesApi } from '../../api/issues';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';

export const BoardColumn = ({ column, issues }) => {
  const { currentProject, activeSprint, refreshBoard } = useProject();
  const { showToast } = useModal();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickSummary, setQuickSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickSummary.trim() || !currentProject) return;

    try {
      setIsSubmitting(true);
      await issuesApi.create({
        project_id: currentProject.id,
        summary: quickSummary.trim(),
        status: column.id,
        sprint_id: activeSprint?.id || null,
        type: 'story',
        priority: 'medium',
      });
      setQuickSummary('');
      setIsQuickCreateOpen(false);
      refreshBoard();
      showToast({ message: 'Issue created', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create issue: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: 'var(--color-neutral-50)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 190px)',
        border: '1px solid var(--color-neutral-200)',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '12px 14px 8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-neutral-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {column.title}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-neutral-700)',
              backgroundColor: 'var(--color-neutral-200)',
              padding: '1px 6px',
              borderRadius: '10px',
            }}
          >
            {issues.length}
          </span>
        </div>

        <button
          className="jira-btn-ghost"
          style={{ padding: '4px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
        >
          <MoreHorizontal size={16} color="var(--color-neutral-500)" />
        </button>
      </div>

      {/* Droppable Issue List */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              padding: '6px 8px',
              flex: 1,
              overflowY: 'auto',
              minHeight: '120px',
              backgroundColor: snapshot.isDraggingOver ? 'var(--color-primary-50)' : 'transparent',
              transition: 'background-color 0.2s ease',
              borderRadius: '4px',
            }}
          >
            {issues.map((issue, index) => (
              <Draggable key={issue.id} draggableId={issue.id} index={index}>
                {(providedDraggable, snapshotDraggable) => (
                  <div
                    ref={providedDraggable.innerRef}
                    {...providedDraggable.draggableProps}
                    {...providedDraggable.dragHandleProps}
                  >
                    <IssueCard issue={issue} isDragging={snapshotDraggable.isDragging} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Quick Create Card Input */}
            {isQuickCreateOpen ? (
              <form onSubmit={handleQuickCreate} style={{ marginTop: '8px' }}>
                <textarea
                  autoFocus
                  placeholder="What needs to be done?"
                  value={quickSummary}
                  onChange={(e) => setQuickSummary(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickCreate(e);
                    } else if (e.key === 'Escape') {
                      setIsQuickCreateOpen(false);
                    }
                  }}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: '2px solid var(--color-primary-400)',
                    outline: 'none',
                    resize: 'none',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting || !quickSummary.trim()}
                    className="jira-btn jira-btn-primary"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {isSubmitting ? 'Adding...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickCreateOpen(false)}
                    className="jira-btn jira-btn-ghost"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsQuickCreateOpen(true)}
                className="jira-btn jira-btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '6px 8px',
                  fontSize: '12px',
                  color: 'var(--color-neutral-500)',
                  marginTop: '4px',
                  borderRadius: '4px',
                }}
              >
                <Plus size={15} />
                <span>Create issue</span>
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};
