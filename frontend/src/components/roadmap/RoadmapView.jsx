import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Zap, CheckCircle2, ChevronRight, Layers } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { issuesApi } from '../../api/issues';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Avatar } from '../common/Avatar';

export const RoadmapView = () => {
  const { currentProject, refreshKey, setSelectedIssueId, setIsCreateModalOpen } = useProject();
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEpics = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        const data = await issuesApi.list({
          project_id: currentProject.id,
          type: 'epic',
        });
        setEpics(data);
      } catch (err) {
        console.error('Failed to load epics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEpics();
  }, [currentProject, refreshKey]);

  return (
    <div style={{ padding: '0 24px 32px 24px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: '#5E6C84', fontWeight: 500 }}>
              Projects / {currentProject?.name} /
            </span>
            <span style={{ fontSize: '13px', color: '#172B4D', fontWeight: 600 }}>Roadmap</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            Timeline & Epic Roadmap
          </h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="jira-btn jira-btn-primary"
          style={{ fontSize: '13px' }}
        >
          <Plus size={16} />
          <span>Create Epic</span>
        </button>
      </div>

      {/* Roadmap Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Timeline Header Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 140px 140px 1fr',
            padding: '12px 16px',
            backgroundColor: '#F4F5F7',
            borderBottom: '1px solid #DFE1E6',
            fontSize: '12px',
            fontWeight: 700,
            color: '#5E6C84',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <div>Epic Name</div>
          <div>Status</div>
          <div>Assignee</div>
          <div>Timeline & Progress</div>
        </div>

        {/* Epics List */}
        {epics.length === 0 && !loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7A869A' }}>
            <Zap size={36} color="#6554C0" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '15px', color: '#172B4D', marginBottom: '4px' }}>No Epics Created Yet</h3>
            <p style={{ fontSize: '13px' }}>
              Epics help you group large initiatives into manageable work streams over time.
            </p>
          </div>
        ) : (
          epics.map((epic) => (
            <div
              key={epic.id}
              onClick={() => setSelectedIssueId(epic.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '320px 140px 140px 1fr',
                padding: '14px 16px',
                borderBottom: '1px solid #EBECF0',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFBFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              {/* Epic Summary & Key */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px' }}>
                <div
                  style={{
                    backgroundColor: '#EAE6FF',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={15} color="#6554C0" />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>{epic.key}</div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#172B4D',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {epic.summary}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={epic.status} size="sm" />
              </div>

              {/* Assignee */}
              <div>
                <Avatar user={epic.assignee} size="sm" showName={true} />
              </div>

              {/* Timeline Bar & Schedule */}
              <div style={{ paddingRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#5E6C84', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {epic.due_date ? new Date(epic.due_date).toLocaleDateString() : 'Target: Q3/Q4'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6554C0' }}>
                    {epic.story_points ? `${epic.story_points} pts` : ''}
                  </span>
                </div>

                {/* Progress Visual Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    backgroundColor: '#EBECF0',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: epic.status === 'done' ? '100%' : epic.status === 'inprogress' ? '50%' : '15%',
                      backgroundColor: epic.status === 'done' ? '#36B37E' : '#6554C0',
                      borderRadius: '5px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
