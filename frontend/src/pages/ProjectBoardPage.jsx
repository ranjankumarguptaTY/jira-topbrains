import React from 'react';
import { ProjectProvider } from '../context/ProjectContext';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { BacklogView } from '../components/backlog/BacklogView';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { IssuesTableView } from '../components/issue/IssuesTableView';
import { IssueDetailModal } from '../components/issue/IssueDetailModal';
import { CreateIssueModal } from '../components/modal/CreateIssueModal';
import { CreateSprintModal } from '../components/modal/CreateSprintModal';
import { StartSprintModal } from '../components/modal/StartSprintModal';
import { CompleteSprintModal } from '../components/modal/CompleteSprintModal';
import { CreateProjectModal } from '../components/modal/CreateProjectModal';
import { useProject } from '../context/ProjectContext';

const ProjectContent = () => {
  const { activeTab } = useProject();

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>
        {activeTab === 'board' && <KanbanBoard />}
        {activeTab === 'backlog' && <BacklogView />}
        {activeTab === 'roadmap' && <RoadmapView />}
        {activeTab === 'issues' && <IssuesTableView />}
      </main>

      {/* Modals */}
      <IssueDetailModal />
      <CreateIssueModal />
      <CreateSprintModal />
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
