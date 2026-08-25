import React, { useState, useEffect } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { projectsAPI, teamsAPI } from '../../services/api';

export const CreateProjectModal = () => {
  const { isCreateProjectOpen, setIsCreateProjectOpen, selectProject, loadProjects } = useProject();
  const { currentUser, currentOrg } = useAuth();
  const { showToast } = useModal();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load teams when modal opens
  useEffect(() => {
    if (isCreateProjectOpen && currentOrg?.id) {
      teamsAPI.list(currentOrg.id).then((res) => {
        setTeams(res.data || []);
        if (res.data?.length > 0 && !teamId) {
          setTeamId(res.data[0].id);
        }
      }).catch((err) => console.warn('Failed to load teams for project creation', err));
    }
  }, [isCreateProjectOpen, currentOrg, teamId]);

  if (!isCreateProjectOpen) return null;

  const handleNameChange = (val) => {
    setName(val);
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
      const res = await projectsAPI.create({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        lead_id: currentUser?.id || null,
        team_id: teamId || null,
        organization_id: currentOrg?.id || null,
        category: 'Software',
      });
      const newProj = res.data;

      await loadProjects();
      selectProject(newProj);
      setIsCreateProjectOpen(false);
      setName('');
      setKey('');
      setDescription('');
      setTeamId('');
      showToast({ message: `Project ${newProj.name} created with #project broadcast channel!`, type: 'success' });
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create project', type: 'error' });
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Create Jira project</h2>
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
                Prefix for all tickets in this project (e.g. {key || 'PROJ'}-123).
              </span>
            </div>

            {/* Team Selection */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Assign to Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              >
                <option value="">-- No Team (Global Project) --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.name} (Lead: {t.lead_name || 'None'})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: '#5E6C84', marginTop: '4px', display: 'block' }}>
                Team members will automatically receive access and project broadcast notifications.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Description
              </label>
              <textarea
                rows={2}
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
              {isSubmitting ? 'Creating...' : 'Create project & Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
