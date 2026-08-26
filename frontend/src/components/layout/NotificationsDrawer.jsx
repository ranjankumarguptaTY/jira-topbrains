import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Play,
  UserCheck,
  AlertCircle,
  X
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'mention',
    title: 'Sarah Chen mentioned you in TOP-3',
    subtitle: 'Added cryptographic SHA-256 verifier generation for Sprintr OAuth.',
    time: '15m ago',
    unread: true,
    issueKey: 'TOP-3',
  },
  {
    id: 'n2',
    type: 'sprint',
    title: 'Sprint 1: Core Security started',
    subtitle: 'Sprintr Admin started the 2-week active sprint with 5 committed tickets.',
    time: '2h ago',
    unread: true,
    issueKey: null,
  },
  {
    id: 'n3',
    type: 'assignment',
    title: 'Alex Morgan assigned TOP-6 to you',
    subtitle: 'Role-Based Access Control (RBAC) middleware for Sprintr routes.',
    time: '1d ago',
    unread: true,
    issueKey: 'TOP-6',
  },
  {
    id: 'n4',
    type: 'bug',
    title: 'New High Priority Bug logged: TOP-14',
    subtitle: 'Memory leak when rendering 500+ cards on virtualized Kanban board.',
    time: '2d ago',
    unread: false,
    issueKey: 'TOP-14',
  },
];

export const NotificationsDrawer = ({ isOpen, onClose, onNotificationCountChange }) => {
  const { issues, selectIssue, setIsDetailModalOpen } = useProject();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const drawerRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, unread: false }));
    setNotifications(updated);
    if (onNotificationCountChange) onNotificationCountChange(0);
  };

  const handleNotificationClick = (item) => {
    const updated = notifications.map((n) => (n.id === item.id ? { ...n, unread: false } : n));
    setNotifications(updated);
    if (onNotificationCountChange) {
      onNotificationCountChange(updated.filter((n) => n.unread).length);
    }

    if (item.issueKey) {
      const match = issues.find((i) => i.key === item.issueKey);
      if (match) {
        selectIssue(match);
        setIsDetailModalOpen(true);
        onClose();
      }
    }
  };

  const displayedList = filter === 'unread' ? notifications.filter((n) => n.unread) : notifications;

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '-60px',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 8px 30px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        border: '1px solid #DFE1E6',
        zIndex: 1000,
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.15s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #EBECF0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFBFC',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="#0052CC" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: '#FF5630',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
                lineHeight: '1.2',
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="jira-btn jira-btn-ghost"
              style={{ fontSize: '12px', padding: '4px 8px', color: '#0052CC', fontWeight: 600 }}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="jira-btn jira-btn-ghost"
            style={{ padding: '4px', border: 'none', borderRadius: '4px' }}
          >
            <X size={16} color="#5E6C84" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #EBECF0',
          padding: '0 12px',
          backgroundColor: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            borderBottom: filter === 'all' ? '2px solid #0052CC' : '2px solid transparent',
            fontWeight: filter === 'all' ? 700 : 500,
            color: filter === 'all' ? '#0052CC' : '#5E6C84',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            borderBottom: filter === 'unread' ? '2px solid #0052CC' : '2px solid transparent',
            fontWeight: filter === 'unread' ? 700 : 500,
            color: filter === 'unread' ? '#0052CC' : '#5E6C84',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List Container */}
      <div style={{ maxHeight: '360px', overflowY: 'auto', boxSizing: 'border-box' }}>
        {displayedList.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: '#7A869A', fontSize: '13px' }}>
            <CheckCheck size={28} color="#36B37E" style={{ marginBottom: '8px', opacity: 0.8 }} />
            <div style={{ fontWeight: 600, color: '#172B4D' }}>You're all caught up!</div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>No unread notifications right now.</div>
          </div>
        ) : (
          displayedList.map((item) => {
            let Icon = Bell;
            let iconColor = '#0052CC';
            let iconBg = '#DEEBFF';
            if (item.type === 'mention') {
              Icon = MessageSquare;
              iconColor = '#0052CC';
              iconBg = '#DEEBFF';
            } else if (item.type === 'sprint') {
              Icon = Play;
              iconColor = '#36B37E';
              iconBg = '#E3FCEF';
            } else if (item.type === 'assignment') {
              Icon = UserCheck;
              iconColor = '#6554C0';
              iconBg = '#EAE6FF';
            } else if (item.type === 'bug') {
              Icon = AlertCircle;
              iconColor = '#FF5630';
              iconBg = '#FFEBE6';
            }

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #F4F5F7',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  backgroundColor: item.unread ? '#F4F5F7' : '#FFFFFF',
                  transition: 'background-color 0.15s ease',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.unread ? '#EBECF0' : '#FAFBFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.unread ? '#F4F5F7' : '#FFFFFF')}
              >
                {/* Type Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: iconBg,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Icon size={16} />
                </div>

                {/* Content Box */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: item.unread ? 700 : 600,
                      color: '#172B4D',
                      lineHeight: '1.35',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.title}
                  </div>

                  {item.subtitle && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#5E6C84',
                        marginTop: '3px',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.subtitle}
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#7A869A', marginTop: '4px', fontWeight: 500 }}>
                    {item.time}
                  </div>
                </div>

                {/* Unread indicator */}
                {item.unread && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#0052CC',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
