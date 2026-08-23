import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Target } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';
import { sprintsApi } from '../../api/sprints';

export const CreateSprintModal = () => {
  const {
    isCreateSprintOpen,
    setIsCreateSprintOpen,
    currentProject,
    sprints,
    loadSprints,
    refreshBoard,
  } = useProject();

  const { showToast } = useModal();

  const [sprintName, setSprintName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCreateSprintOpen && currentProject) {
      const nextNum = (sprints?.length || 0) + 1;
      setSprintName(`${currentProject.key || 'JIRA'} Sprint ${nextNum}`);
      setGoal('');
      setDurationWeeks(2);
    }
  }, [isCreateSprintOpen, currentProject, sprints]);

  if (!isCreateSprintOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sprintName.trim() || !currentProject) return;

    try {
      setIsSubmitting(true);
      await sprintsApi.create({
        project_id: currentProject.id,
        name: sprintName.trim(),
        goal: goal.trim(),
      });

      if (currentProject?.id) {
        await loadSprints(currentProject.id);
      }
      refreshBoard();
      setIsCreateSprintOpen(false);
      showToast({ message: 'Sprint created successfully', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create sprint: ' + (err.response?.data?.detail || err.message), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCreateSprintOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '520px' }}>
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
            <Plus size={18} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Create sprint</h2>
          </div>
          <button
            onClick={() => setIsCreateSprintOpen(false)}
            className="jira-btn jira-btn-ghost"
            style={{ padding: '6px' }}
          >
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Sprint Name <span style={{ color: '#FF5630' }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                placeholder="e.g. CYBER Sprint 3"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Sprint Goal
              </label>
              <textarea
                rows={3}
                placeholder="What is the objective or deliverable for this sprint?"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer */}
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
              onClick={() => setIsCreateSprintOpen(false)}
              className="jira-btn jira-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !sprintName.trim()}
              className="jira-btn jira-btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
