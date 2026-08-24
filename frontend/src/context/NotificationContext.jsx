import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import { notificationsAPI } from '../services/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const ws = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await notificationsAPI.list({ limit: 50 });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      // Notification endpoint might not be ready yet
      console.debug('Notifications API not ready');
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (notifId) => {
    try {
      await notificationsAPI.markRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  }, []);

  // Fetch on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  const clearConversationNotifications = useCallback((conversationId) => {
    setNotifications((prev) =>
      prev.map((n) =>
        (n.entity_id === conversationId || n.entity_type === 'conversation')
          ? { ...n, is_read: true }
          : n
      )
    );
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    if (!ws) return;
    const unsubCreate = ws.subscribe('NOTIFICATION_CREATED', (data) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    const unsubCount = ws.subscribe('NOTIFICATION_COUNT_UPDATED', (data) => {
      if (typeof data.count === 'number') {
        setUnreadCount(data.count);
      }
    });

    return () => {
      unsubCreate();
      unsubCount();
    };
  }, [ws]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        clearConversationNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
