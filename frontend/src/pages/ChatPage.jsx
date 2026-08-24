import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useNotifications } from '../context/NotificationContext';
import { conversationsAPI, guestRequestsAPI, fileTransfersAPI } from '../services/api';
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  Hash,
  Users,
  User,
  UserPlus,
  MoreVertical,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  File,
  ExternalLink,
  ShieldAlert,
  X,
  Sparkles,
} from 'lucide-react';
import './ChatPage.css';

const CHUNK_SIZE = 1024 * 1024 * 4; // 4 MB chunk size

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { currentUser, users } = useAuth();
  const ws = useWebSocket();
  const { clearConversationNotifications } = useNotifications();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showGuestRequests, setShowGuestRequests] = useState(false);
  const [guestRequests, setGuestRequests] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // File upload state
  const [uploadProgress, setUploadProgress] = useState(null); // { filename, percentage, bytes, total }
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConvos(true);
      const res = await conversationsAPI.list();
      setConversations(res.data || []);
    } catch (err) {
      console.debug('Conversations API not ready');
      setConversations([]);
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  // Load guest requests
  const loadGuestRequests = useCallback(async () => {
    try {
      const res = await guestRequestsAPI.list();
      setGuestRequests(res.data || []);
    } catch (err) {
      console.debug('Guest requests API not ready');
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadGuestRequests();
  }, [loadConversations, loadGuestRequests]);

  // Load messages for active conversation
  useEffect(() => {
    if (!conversationId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    // Immediately clear unread count for this conversation in the sidebar state
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const [convoRes, msgsRes] = await Promise.all([
          conversationsAPI.get(conversationId),
          conversationsAPI.getMessages(conversationId),
        ]);
        setActiveConversation(convoRes.data);
        setMessages(msgsRes.data || []);
        conversationsAPI.markRead(conversationId).catch(() => {});
        clearConversationNotifications?.(conversationId);
      } catch (err) {
        console.error('Failed to load messages', err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [conversationId, clearConversationNotifications]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket listeners
  useEffect(() => {
    if (!ws) return;
    const unsubMsg = ws.subscribe('CHAT_MESSAGE_CREATED', (data) => {
      const incomingConvoId = data.conversation_id;
      const incomingMsg = data.message;

      if (incomingConvoId === conversationId) {
        setMessages((prev) => {
          // If this message is from current user and already in list (e.g. temp), update it
          const exists = prev.some((m) => m.id === incomingMsg.id);
          if (exists) return prev;
          return [...prev, incomingMsg];
        });
        // Automatically mark as read if conversation is open
        conversationsAPI.markRead(conversationId).catch(() => {});
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === incomingConvoId);
        if (index !== -1) {
          const updated = {
            ...prev[index],
            last_message: incomingMsg,
            unread_count: (prev[index].unread_count || 0) + (incomingConvoId !== conversationId ? 1 : 0),
            updated_at: incomingMsg.created_at,
          };
          // Move this active conversation to top of list
          return [updated, ...prev.filter((_, i) => i !== index)];
        } else {
          // New conversation not yet in sidebar list, reload list from server
          loadConversations();
          return prev;
        }
      });
    });

    const unsubRead = ws.subscribe('CHAT_MESSAGES_READ', (data) => {
      if (data.conversation_id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            const currentReaders = m.read_by || [];
            if (!currentReaders.includes(data.reader_id)) {
              return { ...m, read_by: [...currentReaders, data.reader_id] };
            }
            return m;
          })
        );
      }
    });

    const unsubFile = ws.subscribe('FILE_READY', (data) => {
      if (data.conversation_id === conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    const unsubGuestReq = ws.subscribe('GUEST_REQUEST_RECEIVED', () => {
      loadGuestRequests();
    });

    const unsubGuestAcc = ws.subscribe('GUEST_REQUEST_ACCEPTED', (data) => {
      loadConversations();
      if (data.conversation_id) {
        navigate(`/chat/${data.conversation_id}`);
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
      unsubFile();
      unsubGuestReq();
      unsubGuestAcc();
    };
  }, [ws, conversationId, loadGuestRequests, loadConversations, navigate]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sendingMessage) return;
    const content = newMessage.trim();
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      content,
      sender_id: currentUser.id,
      sender: { id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatar_url },
      created_at: new Date().toISOString(),
      type: 'text',
      read_by: [currentUser.id],
      _pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      setSendingMessage(true);
      const res = await conversationsAPI.sendMessage(conversationId, { content });
      const savedMsg = res.data;
      // Replace optimistic tempMsg with server response (removes _pending)
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...savedMsg, _pending: false } : m)));
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSendingMessage(false);
    }
  };

  // Resumable Chunked File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    try {
      // 1. Initiate transfer
      const initRes = await fileTransfersAPI.initiate({
        conversation_id: conversationId,
        filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
      });
      const transferId = initRes.data.transfer_id;

      // 2. Upload chunks sequentially
      let offset = 0;
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        await fileTransfersAPI.uploadChunk(transferId, chunk, offset);
        offset += chunk.size;
        setUploadProgress({
          filename: file.name,
          percentage: Math.round((offset / file.size) * 100),
          uploadedBytes: offset,
          totalBytes: file.size,
        });
      }

      // 3. Complete and verify SHA-256
      await fileTransfersAPI.completeUpload(transferId);
      setUploadProgress(null);
    } catch (err) {
      console.error('File upload failed', err);
      alert('File upload failed. Please verify the server and try again.');
      setUploadProgress(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadFile = async (transferId, filename) => {
    try {
      const res = await fileTransfersAPI.download(transferId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'downloaded_file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Notify download complete for storage cleanup
      await fileTransfersAPI.completeDownload(transferId).catch(() => {});
    } catch (err) {
      console.error('Download failed', err);
      alert('File could not be downloaded. It may have expired.');
    }
  };

  const handleStartDM = async (user) => {
    try {
      const res = await conversationsAPI.create({
        type: 'direct',
        member_ids: [user.id],
      });
      const convo = res.data;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === convo.id);
        return exists ? prev : [convo, ...prev];
      });
      navigate(`/chat/${convo.id}`);
      setShowNewChat(false);
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const handleAcceptGuestRequest = async (reqId) => {
    try {
      const res = await guestRequestsAPI.accept(reqId);
      await loadGuestRequests();
      await loadConversations();
      if (res.data?.conversation_id) {
        navigate(`/chat/${res.data.conversation_id}`);
      }
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const handleDeclineGuestRequest = async (reqId) => {
    try {
      await guestRequestsAPI.decline(reqId);
      await loadGuestRequests();
    } catch (err) {
      console.error('Failed to decline request', err);
    }
  };

  const handleBlockGuestRequest = async (reqId) => {
    try {
      await guestRequestsAPI.block(reqId);
      await loadGuestRequests();
    } catch (err) {
      console.error('Failed to block request', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.members?.some((m) => m.name?.toLowerCase().includes(q))
    );
  });

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getConversationName = (convo) => {
    if (convo.name) return convo.name;
    if (convo.type === 'direct') {
      const other = convo.members?.find((m) => m.id !== currentUser?.id);
      return other?.name || 'Direct Message';
    }
    return convo.members?.map((m) => m.name).join(', ') || 'Group Chat';
  };

  const getConversationAvatar = (convo) => {
    if (convo.type === 'channel') return <Hash size={18} />;
    if (convo.type === 'group') return <Users size={16} />;
    const other = convo.members?.find((m) => m.id !== currentUser?.id);
    if (other?.avatar_url) return <img src={other.avatar_url} alt="" />;
    return <User size={16} />;
  };

  return (
    <div className="chat-page">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Chat Sidebar — Conversation List */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setShowGuestRequests(!showGuestRequests)}
              title="Guest / Message Requests"
            >
              <UserPlus size={18} />
              {guestRequests.length > 0 && (
                <span className="badge badge-count" style={{ position: 'absolute', top: 2, right: 2 }}>
                  {guestRequests.length}
                </span>
              )}
            </button>
            <button className="btn btn-icon btn-ghost" onClick={() => setShowNewChat(!showNewChat)} title="New conversation">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="chat-sidebar-search">
          <Search size={14} className="chat-search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Guest Requests Panel */}
        {showGuestRequests && (
          <div className="guest-requests-panel">
            <div className="guest-requests-title">
              <span>Message Requests</span>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowGuestRequests(false)}>
                <X size={14} />
              </button>
            </div>
            {guestRequests.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--color-neutral-500)', textAlign: 'center' }}>
                No pending message requests
              </div>
            ) : (
              guestRequests.map((req) => (
                <div key={req.id} className="guest-request-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar avatar-sm">{req.requester?.name?.[0] || '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{req.requester?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                        {req.message || 'Wants to start a conversation'}
                      </div>
                    </div>
                  </div>
                  <div className="guest-request-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handleAcceptGuestRequest(req.id)}>
                      Accept
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDeclineGuestRequest(req.id)}>
                      Decline
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleBlockGuestRequest(req.id)} title="Block">
                      <ShieldAlert size={14} color="var(--color-danger-500)" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* New Chat — User picker */}
        {showNewChat && (
          <div className="new-chat-panel">
            <div className="new-chat-title">Start a conversation</div>
            {users
              .filter((u) => u.id !== currentUser?.id)
              .map((user) => (
                <button
                  key={user.id}
                  className="new-chat-user"
                  onClick={() => handleStartDM(user)}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="avatar avatar-sm" />
                  ) : (
                    <div className="avatar avatar-sm">{user.name?.[0]}</div>
                  )}
                  <div className="new-chat-user-info">
                    <div className="new-chat-user-name">{user.name}</div>
                    <div className="new-chat-user-email">{user.email}</div>
                  </div>
                </button>
              ))}
          </div>
        )}

        <div className="conversation-list">
          {loadingConvos ? (
            <div className="chat-loading">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 56, margin: '4px 8px' }} />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="chat-empty-list">
              <MessageCircle size={32} className="chat-empty-icon" />
              <p>No conversations yet</p>
              <span>Click + to start chatting</span>
            </div>
          ) : (
            filteredConversations.map((convo) => (
              <div
                key={convo.id}
                className={`conversation-item ${convo.id === conversationId ? 'active' : ''} ${convo.unread_count > 0 ? 'unread' : ''}`}
                onClick={() => navigate(`/chat/${convo.id}`)}
              >
                <div className="conversation-avatar">
                  {getConversationAvatar(convo)}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name truncate">{getConversationName(convo)}</div>
                  <div className="conversation-last-msg truncate">
                    {convo.last_message?.content || 'No messages yet'}
                  </div>
                </div>
                <div className="conversation-meta">
                  <span className="conversation-time">{formatTime(convo.last_message?.created_at)}</span>
                  {convo.unread_count > 0 && (
                    <span className="badge badge-count">{convo.unread_count}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {!conversationId ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">
              <MessageCircle size={48} />
            </div>
            <h2>Welcome to Chat</h2>
            <p>Select a conversation or start a new one to begin messaging</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <h3>{activeConversation ? getConversationName(activeConversation) : '...'}</h3>
                {activeConversation?.type === 'channel' && (
                  <span className="chat-header-members">
                    {activeConversation.members?.length || 0} members
                  </span>
                )}
              </div>
              <div className="chat-header-actions">
                <button className="btn btn-icon btn-ghost" title="Search in conversation">
                  <Search size={16} />
                </button>
                <button className="btn btn-icon btn-ghost" title="More options">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {loadingMessages ? (
                <div className="chat-messages-loading">
                  <div className="spinner" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-messages-empty">
                  <p>No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === currentUser?.id;
                  const showAvatar =
                    idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;

                  // Render File Message
                  if (msg.type === 'file' && msg.metadata) {
                    return (
                      <div key={msg.id} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                        {!isOwn && showAvatar && (
                          <div className="message-avatar">
                            <div className="avatar avatar-sm">{msg.sender?.name?.[0] || '?'}</div>
                          </div>
                        )}
                        <div className="message-content">
                          {!isOwn && showAvatar && <div className="message-sender">{msg.sender?.name}</div>}
                          <div className="chat-file-card">
                            <div className="chat-file-icon">
                              <FileText size={24} />
                            </div>
                            <div className="chat-file-details">
                              <div className="chat-file-name truncate">{msg.metadata.filename}</div>
                              <div className="chat-file-size">{formatBytes(msg.metadata.file_size_bytes)}</div>
                            </div>
                            <button
                              className="btn btn-primary btn-sm chat-file-download-btn"
                              onClick={() => handleDownloadFile(msg.metadata.transfer_id, msg.metadata.filename)}
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Render Ticket Notification Message
                  if (msg.type === 'ticket_notification' && msg.metadata) {
                    return (
                      <div key={msg.id} className="chat-ticket-notification-wrapper">
                        <div className="chat-ticket-card">
                          <div className="chat-ticket-badge">
                            <Sparkles size={13} />
                            <span>Jira Notification</span>
                          </div>
                          <div className="chat-ticket-title">{msg.content}</div>
                          <div className="chat-ticket-meta">
                            <span className="badge badge-primary">{msg.metadata.issue_key}</span>
                            <span>{msg.metadata.project_name}</span>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm chat-ticket-btn"
                            onClick={() => navigate('/my-work')}
                          >
                            <ExternalLink size={13} />
                            Open Ticket
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Standard text message
                  return (
                    <div
                      key={msg.id}
                      className={`chat-message ${isOwn ? 'own' : 'other'} ${msg._pending ? 'pending' : ''}`}
                    >
                      {!isOwn && showAvatar && (
                        <div className="message-avatar">
                          {msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} alt="" className="avatar avatar-sm" />
                          ) : (
                            <div className="avatar avatar-sm">{msg.sender?.name?.[0] || '?'}</div>
                          )}
                        </div>
                      )}
                      <div className={`message-content ${!showAvatar && !isOwn ? 'no-avatar' : ''}`}>
                        {!isOwn && showAvatar && (
                          <div className="message-sender">{msg.sender?.name}</div>
                        )}
                        <div className="message-bubble">
                          <span className="message-text">{msg.content}</span>
                          <span className="message-time">
                            {formatTime(msg.created_at)}
                            {isOwn && (
                              msg._pending ? (
                                <Clock size={12} title="Sending..." className="msg-status-icon pending" />
                              ) : (msg.read_by && msg.read_by.some((uid) => uid !== currentUser?.id)) ? (
                                <CheckCheck size={14} title="Seen" className="msg-status-icon seen" />
                              ) : (
                                <Check size={13} title="Sent" className="msg-status-icon sent" />
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress && (
              <div className="chat-upload-progress-bar">
                <div className="chat-upload-info">
                  <span>Uploading {uploadProgress.filename}...</span>
                  <span>{uploadProgress.percentage}%</span>
                </div>
                <div className="chat-progress-track">
                  <div className="chat-progress-fill" style={{ width: `${uploadProgress.percentage}%` }} />
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="chat-input-area">
              <div className="chat-input-container">
                <button
                  className="btn btn-icon btn-ghost chat-input-btn"
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                />
                <button className="btn btn-icon btn-ghost chat-input-btn" title="Emoji">
                  <Smile size={18} />
                </button>
                <button
                  className={`btn btn-primary chat-send-btn ${!newMessage.trim() ? 'disabled' : ''}`}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
