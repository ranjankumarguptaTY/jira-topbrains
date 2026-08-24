import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Lazy-loaded page components
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const AppShell = React.lazy(() => import('./pages/AppShell'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const ProjectBoardPage = React.lazy(() => import('./pages/ProjectBoardPage'));
const MyWorkPage = React.lazy(() => import('./pages/MyWorkPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));

/** Protected route wrapper */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

/** Guest-only route (login/register) */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <React.Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-neutral-50)',
          }}
        >
          <div className="spinner spinner-lg" />
        </div>
      }
    >
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <AuthPage />
            </GuestRoute>
          }
        />

        {/* Protected app routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="projects" element={<ProjectBoardPage />} />
          <Route path="projects/:projectId" element={<ProjectBoardPage />} />
          <Route path="projects/:projectId/:tab" element={<ProjectBoardPage />} />
          <Route path="my-work" element={<MyWorkPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
