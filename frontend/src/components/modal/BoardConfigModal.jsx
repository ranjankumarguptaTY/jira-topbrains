import React, { useState } from 'react';
import { X, Plus, Trash2, SlidersHorizontal, Tag, Columns, Check, AlertCircle } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';
import { projectsApi } from '../../api/projects';

const PRESET_COLORS = [
  '#0052CC', // Jira Blue
  '#00875A', // Green
  '#FF8B00', // Amber / Orange
  '#DE350B', // Red
  '#6554C0', // Purple
  '#00B8D9', // Teal / Cyan
  '#42526E', // Slate / Gray
  '#FF5630', // Coral
];

export const BoardConfigModal = ({ isOpen, onClose }) => {
  const { currentProject, refreshBoard } = useProject();
  const { showToast } = useModal();

  const [activeTab, setActiveTab] = useState('columns'); // 'columns' | 'tags'
  const [columns, setColumns] = useState(currentProject?.columns || []);
  const [tags, setTags] = useState(currentProject?.tags || []);

  // Form states for adding new column
  const [newColTitle, setNewColTitle] = useState('');
  const [newColColor, setNewColColor] = useState('#0052CC');
  const [isAddingCol, setIsAddingCol] = useState(false);

  // Form states for adding new tag
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0052CC');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const [saving, setSaving] = useState(false);

  if (!isOpen || !currentProject) return null;

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColTitle.trim()) return;

    const colId = newColTitle
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || `col_${Date.now()}`;

    if (columns.some((c) => c.id === colId)) {
      showToast({ message: `Column key "${colId}" already exists.`, type: 'error' });
      return;
    }

    const newCol = {
      id: colId,
      title: newColTitle.trim(),
      color: newColColor,
    };

    try {
      setSaving(true);
      await projectsApi.addColumn(currentProject.id, newCol);
      const updatedCols = [...columns];
      if (updatedCols.length > 0 && updatedCols[updatedCols.length - 1].id === 'done') {
        updatedCols.splice(updatedCols.length - 1, 0, newCol);
      } else {
        updatedCols.push(newCol);
      }
      setColumns(updatedCols);
      setNewColTitle('');
      setIsAddingCol(false);
      refreshBoard();
      showToast({ message: `Card column "${newCol.title}" added to board!`, type: 'success' });
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to add column', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColumn = async (col) => {
    if (col.id === 'todo' || col.id === 'done') {
      showToast({ message: `The default "${col.title}" column cannot be deleted.`, type: 'error' });
      return;
    }

    if (!window.confirm(`Delete "${col.title}" column? Any active tickets in this column will safely move to "To Do".`)) {
      return;
    }

    try {
      setSaving(true);
      await projectsApi.deleteColumn(currentProject.id, col.id);
      setColumns(columns.filter((c) => c.id !== col.id));
      refreshBoard();
      showToast({ message: `Column "${col.title}" removed from board.`, type: 'success' });
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to delete column', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const tagId = newTagName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 30);

    if (tags.some((t) => (t.name || t.id).toLowerCase() === newTagName.trim().toLowerCase())) {
      showToast({ message: `Tag "${newTagName}" already exists in this project.`, type: 'error' });
      return;
    }

    const newTag = {
      id: tagId,
      name: newTagName.trim(),
      color: newTagColor,
    };

    try {
      setSaving(true);
      await projectsApi.addTag(currentProject.id, newTag);
      setTags([...tags, newTag]);
      setNewTagName('');
      setIsAddingTag(false);
      refreshBoard();
      showToast({ message: `Tag "${newTag.name}" added to project!`, type: 'success' });
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to add tag', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.name}" from project?`)) return;

    try {
      setSaving(true);
      await projectsApi.deleteTag(currentProject.id, tag.id);
      setTags(tags.filter((t) => t.id !== tag.id));
      refreshBoard();
      showToast({ message: `Tag "${tag.name}" deleted.`, type: 'success' });
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to delete tag', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={20} color="#0052CC" />
              Customize Board Cards & Tags
            </h2>
            <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 3 }}>
              Project: <b>{currentProject.name}</b> ({currentProject.key})
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #DFE1E6', padding: '0 24px', background: '#FAFBFC' }}>
          <button
            onClick={() => setActiveTab('columns')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'columns' ? '2px solid #0052CC' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === 'columns' ? 700 : 500,
              color: activeTab === 'columns' ? '#0052CC' : '#5E6C84',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <Columns size={16} /> Board Cards & Columns ({columns.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'tags' ? '2px solid #0052CC' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === 'tags' ? 700 : 500,
              color: activeTab === 'tags' ? '#0052CC' : '#5E6C84',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <Tag size={16} /> Project Tags & Labels ({tags.length})
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* TAB 1: COLUMNS */}
          {activeTab === 'columns' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                    Active Board Columns
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#5E6C84' }}>
                    Add extra status card lists (e.g. QA / Testing, In Review, Blocked) to your Kanban board.
                  </p>
                </div>
                {!isAddingCol && (
                  <button
                    className="jira-btn jira-btn-primary"
                    onClick={() => setIsAddingCol(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}
                  >
                    <Plus size={14} /> Add Card Column
                  </button>
                )}
              </div>

              {/* Add Column Inline Form */}
              {isAddingCol && (
                <form
                  onSubmit={handleAddColumn}
                  style={{
                    background: '#F4F5F7',
                    border: '1.5px solid #0052CC',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#172B4D', marginBottom: 10 }}>
                    New Board Card Column
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <input
                      type="text"
                      className="jira-input"
                      placeholder="e.g. QA / Testing, Code Review, Blocked"
                      value={newColTitle}
                      onChange={(e) => setNewColTitle(e.target.value)}
                      required
                      autoFocus
                      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColColor(c)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: c,
                            border: newColColor === c ? '2.5px solid #172B4D' : '2px solid #FFF',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="jira-btn jira-btn-ghost"
                      onClick={() => setIsAddingCol(false)}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !newColTitle.trim()}
                      className="jira-btn jira-btn-primary"
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                    >
                      Add Column
                    </button>
                  </div>
                </form>
              )}

              {/* Column List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {columns.map((col, idx) => {
                  const isSystem = ['todo', 'done'].includes(col.id);
                  const color = col.color || '#42526E';

                  return (
                    <div
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #DFE1E6',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '11px', color: '#7A869A', fontWeight: 700, width: 16 }}>
                          {idx + 1}.
                        </span>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {col.title}
                            <span style={{ fontSize: '10px', color: '#7A869A', background: '#F4F5F7', padding: '1px 6px', borderRadius: 4 }}>
                              status: {col.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isSystem ? (
                          <span style={{ fontSize: '11px', color: '#7A869A', background: '#EBECF0', padding: '2px 8px', borderRadius: 4 }}>
                            Core Column
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteColumn(col)}
                            className="btn btn-icon btn-ghost btn-sm"
                            style={{ color: '#DE350B' }}
                            title="Delete Column"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TAGS & LABELS */}
          {activeTab === 'tags' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                    Project Tags & Labels
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#5E6C84' }}>
                    Define tags (e.g. Frontend, Backend, Urgent, Bugfix) that members can assign to tickets.
                  </p>
                </div>
                {!isAddingTag && (
                  <button
                    className="jira-btn jira-btn-primary"
                    onClick={() => setIsAddingTag(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}
                  >
                    <Plus size={14} /> Add Tag
                  </button>
                )}
              </div>

              {/* Add Tag Inline Form */}
              {isAddingTag && (
                <form
                  onSubmit={handleAddTag}
                  style={{
                    background: '#F4F5F7',
                    border: '1.5px solid #0052CC',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#172B4D', marginBottom: 10 }}>
                    Create Project Tag
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <input
                      type="text"
                      className="jira-input"
                      placeholder="e.g. Frontend, DevOps, Security, P0"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      required
                      autoFocus
                      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewTagColor(c)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: c,
                            border: newTagColor === c ? '2.5px solid #172B4D' : '2px solid #FFF',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="jira-btn jira-btn-ghost"
                      onClick={() => setIsAddingTag(false)}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !newTagName.trim()}
                      className="jira-btn jira-btn-primary"
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                    >
                      Create Tag
                    </button>
                  </div>
                </form>
              )}

              {/* Tags Grid / Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {tags.map((t) => {
                  const color = t.color || '#0052CC';
                  return (
                    <div
                      key={t.id || t.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #DFE1E6',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 4,
                            background: `${color}18`,
                            color: color,
                            border: `1px solid ${color}33`,
                          }}
                        >
                          {t.name}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteTag(t)}
                        className="btn btn-icon btn-ghost btn-sm"
                        style={{ color: '#DE350B' }}
                        title="Delete Tag"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="jira-btn jira-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
