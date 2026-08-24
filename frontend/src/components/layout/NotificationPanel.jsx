import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  Sparkles,
  UserPlus,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationPanel.css';

export const NotificationPanel = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications, loading } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }

    if (notif.entity_type === 'issue' || notif.type.startsWith('issue_')) {
      navigate('/my-work');
      onClose();
    } else if (notif.entity_type === 'conversation' || notif.type === 'chat_message') {
      if (notif.entity_id) {
        navigate(`/chat/${notif.entity_id}`);
      } else {
        navigate('/chat');
      }
      onClose();
    } else if (notif.type === 'guest_request') {
      navigate('/chat');
      onClose();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'issue_assigned':
        return <ClipboardList size={16} className="notif-icon-assignment" />;
      case 'issue_status_changed':
      case 'issue_completed':
        return <Sparkles size={16} className="notif-icon-status" />;
      case 'issue_comment':
      case 'chat_message':
        return <MessageSquare size={16} className="notif-icon-chat" />;
      case 'guest_request':
        return <UserPlus size={16} className="notif-icon-guest" />;
      default:
        return <Bell size={16} className="notif-icon-default" />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - d) / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="notif-backdrop" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-header">
          <div className="notif-header-title">
            <Bell size={18} />
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="badge badge-count">{unreadCount}</span>}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm notif-mark-all-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
            <button className="btn btn-icon btn-ghost" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notif-list">
          {loading ? (
            <div className="notif-loading">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 60, margin: '8px 12px' }} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <Bell size={36} className="notif-empty-icon" />
              <p>No notifications yet</p>
              <span>We'll notify you when someone assigns work or sends a message</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="notif-item-icon">{getNotificationIcon(notif.type)}</div>
                <div className="notif-item-content">
                  <div className="notif-item-title">{notif.title}</div>
                  <div className="notif-item-body">{notif.body}</div>
                  <div className="notif-item-time">{formatTime(notif.created_at)}</div>
                </div>
                {!notif.is_read && <div className="notif-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
