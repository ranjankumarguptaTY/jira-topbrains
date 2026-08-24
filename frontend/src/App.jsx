import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import AppRoutes from './router';

export default function App() {
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
