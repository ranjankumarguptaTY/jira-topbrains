import React from 'react';
import { ProjectProvider } from '../context/ProjectContext';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { BacklogView } from '../components/backlog/BacklogView';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { ListView } from '../components/list/ListView';
import { CalendarView } from '../components/calendar/CalendarView';
import { ReportsView } from '../components/reports/ReportsView';
import { SummaryView } from '../components/summary/SummaryView';
import { IssuesTableView } from '../components/issue/IssuesTableView';
import { IssueDetailModal } from '../components/issue/IssueDetailModal';
import { CreateIssueModal } from '../components/modal/CreateIssueModal';
import { CreateSprintModal } from '../components/modal/CreateSprintModal';
import { EditSprintModal } from '../components/modal/EditSprintModal';
import { StartSprintModal } from '../components/modal/StartSprintModal';
import { CompleteSprintModal } from '../components/modal/CompleteSprintModal';
import { CreateProjectModal } from '../components/modal/CreateProjectModal';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Building, ShieldAlert, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProjectContent = () => {
  const { activeTab, loading } = useProject();
  const { currentOrg, userOrgs, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // If user is not super admin and belongs to no organization at all
  if (!loading && !currentOrg && (!userOrgs || userOrgs.length === 0) && !isSuperAdmin?.()) {
    return (
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            background: 'var(--color-neutral-50, #F4F5F7)',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #DFE1E6',
              borderRadius: '12px',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(9, 30, 66, 0.08)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#DEEBFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <Building size={32} color="#0052CC" />
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#172B4D',
                marginBottom: '10px',
              }}
            >
              Not Assigned to an Organization
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#5E6C84',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              You are currently not a member of any organization or project team. Once an Organization Administrator adds you to an organization or team, your Jira boards, sprints, and project timelines will appear here.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="jira-btn jira-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <MessageSquare size={16} />
                Open Direct Chat
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, backgroundColor: '#FAFBFC' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0, backgroundColor: '#FAFBFC' }}>
        {activeTab === 'summary' && <SummaryView />}
        {activeTab === 'board' && <KanbanBoard />}
        {activeTab === 'backlog' && <BacklogView />}
        {activeTab === 'roadmap' && <RoadmapView />}
        {(activeTab === 'list' || activeTab === 'issues') && <ListView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Modals */}
      <IssueDetailModal />
      <CreateIssueModal />
      <CreateSprintModal />
      <EditSprintModal />
      <StartSprintModal />
      <CompleteSprintModal />
      <CreateProjectModal />
    </div>
  );
};

const ProjectBoardPage = () => {
  return (
    <ProjectProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ProjectContent />
      </div>
    </ProjectProvider>
  );
};

export default ProjectBoardPage;
