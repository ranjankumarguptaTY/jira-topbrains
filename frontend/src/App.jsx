import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import AppRoutes from './router';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  React.useEffect(() => {
    // Application defaults to the clean Light theme
    document.documentElement.setAttribute('data-theme', 'light');

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
