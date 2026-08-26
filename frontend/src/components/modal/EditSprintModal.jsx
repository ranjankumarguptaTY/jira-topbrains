import React, { useState, useEffect } from 'react';
import { X, Edit3, Calendar, Target } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';
import { sprintsApi } from '../../api/sprints';

export const EditSprintModal = () => {
  const {
    isEditSprintOpen,
    setIsEditSprintOpen,
    targetSprint,
    currentProject,
    loadSprints,
    refreshBoard,
  } = useProject();

  const { showToast } = useModal();

  const [sprintName, setSprintName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditSprintOpen && targetSprint) {
      setSprintName(targetSprint.name || '');
      setGoal(targetSprint.goal || '');
      
      // Format dates for input type="date"
      if (targetSprint.start_date) {
        try {
          const d = new Date(targetSprint.start_date);
          setStartDate(d.toISOString().split('T')[0]);
        } catch {
          setStartDate('');
        }
      } else {
        setStartDate('');
      }

      if (targetSprint.end_date) {
        try {
          const d = new Date(targetSprint.end_date);
          setEndDate(d.toISOString().split('T')[0]);
        } catch {
          setEndDate('');
        }
      } else {
        setEndDate('');
      }
    }
  }, [isEditSprintOpen, targetSprint]);

  if (!isEditSprintOpen || !targetSprint) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sprintName.trim() || !targetSprint) return;

    try {
      setIsSubmitting(true);
      const updateData = {
        name: sprintName.trim(),
        goal: goal.trim(),
      };

      if (startDate) {
        updateData.start_date = new Date(startDate).toISOString();
      }
      if (endDate) {
        updateData.end_date = new Date(endDate).toISOString();
      }

      await sprintsApi.update(targetSprint.id, updateData);

      if (currentProject?.id) {
        await loadSprints(currentProject.id);
      }
      refreshBoard();
      setIsEditSprintOpen(false);
      showToast({ message: 'Sprint updated successfully', type: 'success' });
    } catch (err) {
      showToast({
        message: 'Failed to update sprint: ' + (err.response?.data?.detail || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsEditSprintOpen(false)}>
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
            <Edit3 size={18} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Edit sprint: {targetSprint.name}
            </h2>
          </div>
          <button
            onClick={() => setIsEditSprintOpen(false)}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                />
              </div>
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
              onClick={() => setIsEditSprintOpen(false)}
              className="jira-btn jira-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !sprintName.trim()}
              className="jira-btn jira-btn-primary"
            >
              {isSubmitting ? 'Updating...' : 'Update sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
