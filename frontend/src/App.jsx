import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { ModalProvider } from './context/ModalContext';
import { AuthPage } from './components/auth/AuthPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { KanbanBoard } from './components/board/KanbanBoard';
import { BacklogView } from './components/backlog/BacklogView';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { IssuesTableView } from './components/issue/IssuesTableView';
import { IssueDetailModal } from './components/issue/IssueDetailModal';
import { CreateIssueModal } from './components/modal/CreateIssueModal';
import { CreateSprintModal } from './components/modal/CreateSprintModal';
import { StartSprintModal } from './components/modal/StartSprintModal';
import { CompleteSprintModal } from './components/modal/CompleteSprintModal';
import { CreateProjectModal } from './components/modal/CreateProjectModal';
import { FolderKanban } from 'lucide-react';

const MainLayout = () => {
  const { activeTab } = useProject();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>
          {activeTab === 'board' && <KanbanBoard />}
          {activeTab === 'backlog' && <BacklogView />}
          {activeTab === 'roadmap' && <RoadmapView />}
          {activeTab === 'issues' && <IssuesTableView />}
        </main>
      </div>

      {/* Global Modals */}
      <IssueDetailModal />
      <CreateIssueModal />
      <CreateSprintModal />
      <StartSprintModal />
      <CompleteSprintModal />
      <CreateProjectModal />
    </div>
  );
};

const AppContent = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: '#FAFBFC',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            background: 'linear-gradient(135deg, #0052CC 0%, #2684FF 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,82,204,0.3)',
            animation: 'pulse 1.5s infinite',
          }}
        >
          <FolderKanban size={26} color="#FFFFFF" />
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#5E6C84' }}>Loading Jira workspace...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <ProjectProvider>
      <MainLayout />
    </ProjectProvider>
  );
};

export default function App() {
  return (
    <ModalProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ModalProvider>
  );
}
