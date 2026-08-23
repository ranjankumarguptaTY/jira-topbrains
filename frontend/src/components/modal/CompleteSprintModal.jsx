import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';
import { sprintsApi } from '../../api/sprints';

export const CompleteSprintModal = () => {
  const {
    isCompleteSprintOpen,
    setIsCompleteSprintOpen,
    targetSprint,
    sprints,
    loadSprints,
    currentProject,
    refreshBoard,
  } = useProject();

  const { showToast } = useModal();
  const [moveToSprintId, setMoveToSprintId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCompleteSprintOpen || !targetSprint) return null;

  const futureSprints = sprints.filter(
    (s) => s.id !== targetSprint.id && s.status === 'future'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await sprintsApi.complete(targetSprint.id, {
        move_incomplete_to_sprint_id: moveToSprintId || null,
      });
      if (currentProject?.id) {
        await loadSprints(currentProject.id);
      }
      setIsCompleteSprintOpen(false);
      refreshBoard();
      showToast({ message: `${targetSprint.name} completed!`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to complete sprint: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCompleteSprintOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '520px' }}>
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            Complete {targetSprint.name}
          </h2>
          <button
            onClick={() => setIsCompleteSprintOpen(false)}
            className="jira-btn jira-btn-ghost"
            style={{ padding: '6px' }}
          >
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#172B4D', lineHeight: '1.5' }}>
              Completing this sprint will close out all finished work and move any open tickets to your chosen
              destination.
            </div>

            <div
              style={{
                backgroundColor: '#FAFBFC',
                border: '1px solid #DFE1E6',
                borderRadius: '6px',
                padding: '12px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <CheckCircle2 size={16} color="#36B37E" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D' }}>
                  {targetSprint.completed_story_points || 0} story points completed
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#FFAB00" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#5E6C84' }}>
                  Open issues will be transferred
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Move open issues to:
              </label>
              <select
                value={moveToSprintId}
                onChange={(e) => setMoveToSprintId(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              >
                <option value="">Backlog</option>
                {futureSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Future Sprint)
                  </option>
                ))}
              </select>
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
              onClick={() => setIsCompleteSprintOpen(false)}
              className="jira-btn jira-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="jira-btn jira-btn-primary"
              style={{ backgroundColor: '#006644' }}
            >
              {isSubmitting ? 'Completing...' : 'Complete sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
