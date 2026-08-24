import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import AppRoutes from './router';

export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('jira-clone-theme') || 'light';
    if (savedTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Fetch server time offset to calibrate client clock
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.server_time) {
          const serverTime = new Date(data.server_time);
          const clientTime = new Date();
          window.serverTimeOffset = serverTime.getTime() - clientTime.getTime();
        }
      })
      .catch((err) => console.warn('Failed to calculate server time offset', err));
  }, []);

  return (
    <BrowserRouter>
      <ModalProvider>
        <AuthProvider>
          <WebSocketProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ModalProvider>
    </BrowserRouter>
  );
}
