import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import { notificationsAPI } from '../services/api';

const VAPID_PUBLIC_KEY = 'BIfCXTtqIKNyf-7tQ5JSVe3QopuTH6ZXAbegMYBTxHhRaw5qfIQoJrma7Z1PDB0fZ8T97iTiT_nhqWZnynUqRG0';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const ws = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
// Helper to show desktop push notifications
  const showDesktopNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  }, []);

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

  const subscribeToPushNotifications = useCallback(async () => {
    if (!isAuthenticated || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      };
      const subscription = await reg.pushManager.subscribe(subscribeOptions);
      await notificationsAPI.subscribePush(subscription);
      console.log('Successfully registered for Web Push notifications');
    } catch (err) {
      console.warn('Push subscription failed', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && Notification.permission === 'granted' && localStorage.getItem('jira-clone-desktop-notifications') === 'true') {
      subscribeToPushNotifications();
    }
  }, [isAuthenticated, subscribeToPushNotifications]);

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

      // Trigger desktop notification if allowed
      if (localStorage.getItem('jira-clone-desktop-notifications') === 'true') {
        showDesktopNotification(
          data.notification?.title || 'New Notification',
          'New notification received'
        );
      }
    });

    const unsubCount = ws.subscribe('NOTIFICATION_COUNT_UPDATED', (data) => {
      if (typeof data.count === 'number') {
        setUnreadCount(data.count);
      }
    });

    const unsubMsg = ws.subscribe('CHAT_MESSAGE_CREATED', (data) => {
      if (localStorage.getItem('jira-clone-desktop-notifications') === 'true') {
        const isOwn = data.message?.sender_id === currentUser?.id;
        if (!isOwn) {
          const pathSegments = window.location.pathname.split('/');
          const isOnChatPage = pathSegments[1] === 'chat' && pathSegments[2] === data.conversation_id;
          if (!isOnChatPage) {
            const body = data.message?.type === 'file' ? 'Sent a file' : '1 new message';
            showDesktopNotification(
              data.message?.sender?.name || 'New Message',
              body
            );
          }
        }
      }
    });

    return () => {
      unsubCreate();
      unsubCount();
      unsubMsg();
    };
  }, [ws, currentUser, showDesktopNotification]);

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
