import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { projectsApi } from '../../api/projects';

export const CreateProjectModal = () => {
  const { isCreateProjectOpen, setIsCreateProjectOpen, selectProject, loadProjects } = useProject();
  const { currentUser } = useAuth();
  const { showToast } = useModal();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateProjectOpen) return null;

  const handleNameChange = (val) => {
    setName(val);
    // Auto-generate key from first letters
    if (!key || key.length <= 4) {
      const generated = val
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 4);
      if (generated) setKey(generated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    try {
      setIsSubmitting(true);
      const newProj = await projectsApi.create({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        lead_id: currentUser?.id || null,
        category: 'Software',
      });

      await loadProjects();
      selectProject(newProj);
      setIsCreateProjectOpen(false);
      setName('');
      setKey('');
      setDescription('');
      showToast({ message: `Project ${newProj.name} created!`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create project: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCreateProjectOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '500px' }}>
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
            <FolderPlus size={18} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Create project</h2>
          </div>
          <button
            onClick={() => setIsCreateProjectOpen(false)}
            className="jira-btn jira-btn-ghost"
            style={{ padding: '6px' }}
          >
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Project Name <span style={{ color: '#FF5630' }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Mobile App Redesign"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Project Key <span style={{ color: '#FF5630' }}>*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. MOB"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF', textTransform: 'uppercase' }}
                required
              />
              <span style={{ fontSize: '11px', color: '#5E6C84', marginTop: '4px', display: 'block' }}>
                Used as a prefix for all issue keys (e.g. {key || 'PROJ'}-123).
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of project scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>

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
              onClick={() => setIsCreateProjectOpen(false)}
              className="jira-btn jira-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !key.trim()}
              className="jira-btn jira-btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
