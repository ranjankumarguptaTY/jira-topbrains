import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import wsService from '../services/websocket';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState('disconnected');

  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect(token);
    } else {
      wsService.disconnect();
    }

    return () => {
      wsService.disconnect();
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    const unsub = wsService.onStateChange(setConnectionState);
    return unsub;
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        connectionState,
        isConnected: connectionState === 'connected',
        subscribe: wsService.on.bind(wsService),
        send: wsService.send.bind(wsService),
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
