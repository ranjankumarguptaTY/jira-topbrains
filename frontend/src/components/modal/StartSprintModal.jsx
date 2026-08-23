import React, { useState, useEffect } from 'react';
import { X, Play, Calendar } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';
import { sprintsApi } from '../../api/sprints';

export const StartSprintModal = () => {
  const { isStartSprintOpen, setIsStartSprintOpen, targetSprint, refreshBoard } = useProject();
  const { showToast } = useModal();

  const [sprintName, setSprintName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (targetSprint) {
      setSprintName(targetSprint.name || '');
      setGoal(targetSprint.goal || '');
    }
  }, [targetSprint, isStartSprintOpen]);

  if (!isStartSprintOpen || !targetSprint) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await sprintsApi.start(targetSprint.id, {
        name: sprintName.trim(),
        duration_weeks: parseInt(durationWeeks, 10),
        goal: goal.trim(),
      });
      setIsStartSprintOpen(false);
      refreshBoard();
      showToast({ message: `${sprintName} started!`, type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to start sprint: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsStartSprintOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '540px' }}>
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Start sprint</h2>
          <button
            onClick={() => setIsStartSprintOpen(false)}
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
                Sprint Name <span style={{ color: '#FF5630' }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Duration
              </label>
              <select
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                className="jira-input"
                style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
              >
                <option value={1}>1 week</option>
                <option value={2}>2 weeks</option>
                <option value={3}>3 weeks</option>
                <option value={4}>4 weeks</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                Sprint Goal
              </label>
              <textarea
                rows={3}
                placeholder="What is the team's objective for this sprint?"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
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
              onClick={() => setIsStartSprintOpen(false)}
              className="jira-btn jira-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !sprintName.trim()}
              className="jira-btn jira-btn-primary"
            >
              <Play size={14} fill="#FFFFFF" />
              <span>{isSubmitting ? 'Starting...' : 'Start'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
