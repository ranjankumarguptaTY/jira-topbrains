import React, { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
  Check,
  X,
  GripVertical,
} from 'lucide-react';
import { IssueCard } from './IssueCard';
import { issuesApi } from '../../api/issues';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';

const PRESET_COLORS = [
  '#42526E',
  '#0052CC',
  '#FF8B00',
  '#00875A',
  '#DE350B',
  '#6554C0',
  '#00B8D9',
];

export const BoardColumn = ({
  column,
  columnIndex = 0,
  totalColumns = 1,
  issues = [],
  dragHandleProps = {},
  canManageBoard = false,
  onMoveColumnLeft,
  onMoveColumnRight,
  onDeleteColumn,
  onEditColumn,
}) => {
  const { currentProject, activeSprint, refreshBoard } = useProject();
  const { showToast } = useModal();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickSummary, setQuickSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState(column.color || '#42526E');

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    if (onEditColumn) {
      onEditColumn({
        ...column,
        title: editTitle.trim(),
        color: editColor,
      });
    }
    setIsEditing(false);
  };

  const isCoreColumn = ['todo', 'done'].includes(column.id);
  const columnColor = column.color || '#42526E';

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: '#F4F5F7',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 190px)',
        border: '1px solid #DFE1E6',
        boxShadow: '0 1px 2px rgba(9, 30, 66, 0.08)',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '10px 12px 8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(9, 30, 66, 0.06)',
          cursor: canManageBoard ? 'grab' : 'default',
          position: 'relative',
        }}
        {...(canManageBoard ? dragHandleProps : {})}
      >
        {isEditing ? (
          <form
            onSubmit={handleSaveEdit}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="jira-input"
                style={{ fontSize: '12px', padding: '3px 6px', height: '26px', flex: 1, backgroundColor: '#FFF' }}
                autoFocus
              />
              <button
                type="submit"
                className="jira-btn jira-btn-primary"
                style={{ padding: '3px 6px', height: '26px' }}
                title="Save"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                className="jira-btn jira-btn-ghost"
                onClick={() => setIsEditing(false)}
                style={{ padding: '3px 6px', height: '26px' }}
                title="Cancel"
              >
                <X size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: c,
                    border: editColor === c ? '2px solid #172B4D' : '1px solid #FFF',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {canManageBoard && (
                <GripVertical size={13} color="#A5ADBA" style={{ cursor: 'grab', marginRight: -2 }} />
              )}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: columnColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-neutral-700)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={column.title}
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

            {/* Three-Dot Menu Button */}
            <div style={{ position: 'relative' }} ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="jira-btn-ghost"
                style={{
                  padding: '4px',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  backgroundColor: menuOpen ? '#DEEBFF' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Column actions"
              >
                <MoreHorizontal size={16} color={menuOpen ? '#0052CC' : 'var(--color-neutral-500)'} />
              </button>

              {/* Three-Dot Dropdown Menu */}
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '28px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(9, 30, 66, 0.15)',
                    width: '180px',
                    zIndex: 100,
                    padding: '4px 0',
                  }}
                >
                  <div style={{ padding: '6px 12px', borderBottom: '1px solid #EBECF0', fontSize: '11px', color: '#7A869A', fontWeight: 600 }}>
                    COLUMN ({columnIndex + 1} OF {totalColumns})
                  </div>

                  {canManageBoard ? (
                    <>
                      {/* Move Left */}
                      <button
                        disabled={columnIndex === 0}
                        onClick={() => {
                          setMenuOpen(false);
                          if (onMoveColumnLeft) onMoveColumnLeft();
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: columnIndex === 0 ? '#A5ADBA' : '#172B4D',
                          background: 'none',
                          border: 'none',
                          cursor: columnIndex === 0 ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (columnIndex > 0) e.currentTarget.style.backgroundColor = '#F4F5F7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <ArrowLeft size={14} /> Move column left
                      </button>

                      {/* Move Right */}
                      <button
                        disabled={columnIndex >= totalColumns - 1}
                        onClick={() => {
                          setMenuOpen(false);
                          if (onMoveColumnRight) onMoveColumnRight();
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: columnIndex >= totalColumns - 1 ? '#A5ADBA' : '#172B4D',
                          background: 'none',
                          border: 'none',
                          cursor: columnIndex >= totalColumns - 1 ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (columnIndex < totalColumns - 1) e.currentTarget.style.backgroundColor = '#F4F5F7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <ArrowRight size={14} /> Move column right
                      </button>

                      {/* Edit Column */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setEditTitle(column.title);
                          setEditColor(column.color || '#42526E');
                          setIsEditing(true);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: '#172B4D',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Edit2 size={14} /> Edit name & color
                      </button>

                      {/* Add Issue to Column */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setIsQuickCreateOpen(true);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: '#172B4D',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Plus size={14} /> Create issue here
                      </button>

                      {/* Delete Column (Custom only) */}
                      {!isCoreColumn && (
                        <div style={{ borderTop: '1px solid #EBECF0', marginTop: '4px', paddingTop: '4px' }}>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              if (onDeleteColumn) onDeleteColumn();
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              fontSize: '12px',
                              color: '#DE350B',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFEBE6')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <Trash2 size={14} /> Delete column
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '8px 12px', fontSize: '11px', color: '#7A869A', lineHeight: 1.4 }}>
                      Only Org Admins and Project Leads can modify or move board columns.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
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
