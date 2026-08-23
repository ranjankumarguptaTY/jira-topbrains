import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  FolderKanban,
  Sliders,
  Database,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { projectsApi } from '../../api/projects';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { currentProject, loadProjects, selectProject, refreshBoard } = useProject();
  const { currentUser, users } = useAuth();
  const { showConfirm, showToast } = useModal();

  const [activeTab, setActiveTab] = useState('project'); // 'project' | 'board' | 'danger'
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');
  const [category, setCategory] = useState('Software');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentProject && isOpen) {
      setName(currentProject.name || '');
      setKey(currentProject.key || '');
      setDescription(currentProject.description || '');
      setLeadId(currentProject.lead_id || '');
      setCategory(currentProject.category || 'Software');
    }
  }, [currentProject, isOpen]);

  if (!isOpen || !currentProject) return null;

  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await projectsApi.update(currentProject.id, {
        name: name.trim(),
        description: description.trim(),
        lead_id: leadId || null,
        category,
      });

      await loadProjects();
      selectProject(updated);
      showToast({ message: 'Project settings updated successfully', type: 'success' });
      onClose();
    } catch (err) {
      showToast({
        message: 'Failed to update project: ' + (err.response?.data?.detail || err.message),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = () => {
    showConfirm({
      title: `Delete project ${currentProject.name}?`,
      message:
        'This will permanently delete this project and all its sprints, issues, subtasks, and comments from MongoDB.',
      confirmText: 'Delete Project',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await projectsApi.delete(currentProject.id);
          showToast({ message: 'Project deleted', type: 'info' });
          window.location.reload();
        } catch (err) {
          showToast({ message: 'Failed to delete project: ' + err.message, type: 'error' });
        }
      },
    });
  };

  const handleSeedDatabase = () => {
    showConfirm({
      title: 'Reset & Seed TopBrains Jira Database?',
      message: 'This will reset all data and create the Master Admin account (admin@topbrains.com / adminpassword123).',
      confirmText: 'Reset & Seed',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await projectsApi.seed();
          showToast({ message: 'TopBrains Jira seeded successfully!', type: 'success' });
          window.location.reload();
        } catch (err) {
          showToast({ message: 'Failed to seed database: ' + err.message, type: 'error' });
        }
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '640px', maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Project & Workspace Settings
            </h2>
          </div>
          <button onClick={onClose} className="jira-btn jira-btn-ghost" style={{ padding: '6px' }}>
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #DFE1E6', backgroundColor: '#FAFBFC' }}>
          <button
            onClick={() => setActiveTab('project')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'project' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'project' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'project' ? 700 : 500,
              color: activeTab === 'project' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FolderKanban size={16} />
            <span>Project Details</span>
          </button>

          <button
            onClick={() => setActiveTab('board')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'board' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'board' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'board' ? 700 : 500,
              color: activeTab === 'board' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={16} />
            <span>Workflow & Board</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'danger' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'danger' ? '2px solid #FF5630' : '2px solid transparent',
              fontWeight: activeTab === 'danger' ? 700 : 500,
              color: activeTab === 'danger' ? '#FF5630' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} />
            <span>Danger Zone</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'project' && (
            <form onSubmit={handleSaveProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Project Name <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                    Project Key
                  </label>
                  <input
                    type="text"
                    value={key}
                    disabled
                    className="jira-input"
                    style={{ marginTop: '6px', backgroundColor: '#F4F5F7', cursor: 'not-allowed' }}
                  />
                  <div style={{ fontSize: '11px', color: '#7A869A', marginTop: '3px' }}>
                    Prefix for ticket IDs (e.g. {key}-123)
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                    Project Lead
                  </label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="jira-input"
                    style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF', resize: 'vertical' }}
                  placeholder="Describe the purpose of this project..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={onClose} className="jira-btn jira-btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving || !name.trim()} className="jira-btn jira-btn-primary">
                  <Save size={15} />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'board' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>
                Columns and status mappings currently enabled on this active board:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { name: 'To Do', id: 'todo', color: '#42526E', bg: '#F4F5F7' },
                  { name: 'In Progress', id: 'inprogress', color: '#0052CC', bg: '#DEEBFF' },
                  { name: 'In Review', id: 'inreview', color: '#6554C0', bg: '#EAE6FF' },
                  { name: 'Done', id: 'done', color: '#006644', bg: '#E3FCEF' },
                ].map((col) => (
                  <div
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#FAFBFC',
                      border: '1px solid #DFE1E6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          backgroundColor: col.bg,
                          color: col.color,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {col.name}
                      </span>
                      <span style={{ fontSize: '13px', color: '#5E6C84' }}>Mapped status: {col.id}</span>
                    </div>

                    <span style={{ fontSize: '12px', color: '#36B37E', fontWeight: 600 }}>Active</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Seed database */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FAFBFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>Reset & Re-seed Data</div>
                  <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                    Wipes existing database and seeds sample project, master admin, and active sprint.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSeedDatabase}
                  className="jira-btn jira-btn-ghost"
                  style={{ color: '#0052CC', borderColor: '#C1C7D0' }}
                >
                  <Database size={15} />
                  <span>Seed Data</span>
                </button>
              </div>

              {/* Delete project */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid #FFBDAD',
                  backgroundColor: '#FFEBE6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#DE350B' }}>Delete this Project</div>
                  <div style={{ fontSize: '12px', color: '#BF2600', marginTop: '2px' }}>
                    Once deleted, all tickets and history for {currentProject.name} cannot be recovered.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="jira-btn jira-btn-danger"
                  style={{ padding: '8px 14px' }}
                >
                  <Trash2 size={15} />
                  <span>Delete Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
