import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useNotifications } from '../context/NotificationContext';
import { authAPI, conversationsAPI, guestRequestsAPI, fileTransfersAPI } from '../services/api';
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
  ArrowDown,
} from 'lucide-react';
import './ChatPage.css';

const CHUNK_SIZE = 1024 * 1024 * 4; // 4 MB chunk size

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
  '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
  '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '👍', '👎', '👊', '✊', '✌️', '👌', '👋', '👏', '🙌', '🙏',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '✨'
];

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const ws = useWebSocket();
  const { clearConversationNotifications } = useNotifications();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreBefore, setHasMoreBefore] = useState(true);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const [fetchingPage, setFetchingPage] = useState(false);
  const [newIncomingCount, setNewIncomingCount] = useState(0);
  const chatMessagesRef = useRef(null);

  const scrollToBottom = (behavior = 'auto') => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior
      });
    }
  };
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchedMemberUsers, setSearchedMemberUsers] = useState([]);
  const [searchingMemberUsers, setSearchingMemberUsers] = useState(false);

  const filteredMessages = messages.filter((msg) => {
    if (!messageSearchQuery) return true;
    return msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });
  const [guestRequests, setGuestRequests] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showGuestRequests, setShowGuestRequests] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [externalReqMessage, setExternalReqMessage] = useState('');
  const [selectedExternalUser, setSelectedExternalUser] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // { filename, percentage }
  const [loadingConvos, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Search registered users by name or email when typing in user picker
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setSearchedUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const res = await authAPI.searchUsers(userSearchQuery.trim());
        setSearchedUsers(res.data || []);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

const handleEmojiClick = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showMoreMenu &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showMoreMenu]);

  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      setSearchedMemberUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingMemberUsers(true);
        const res = await authAPI.searchUsers(memberSearchQuery.trim());
        setSearchedMemberUsers(res.data || []);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setSearchingMemberUsers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearchQuery]);

const handleClearChat = async () => {
    try {
      await conversationsAPI.clearMessages(conversationId);
      setMessages([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear messages", err);
      alert("Failed to clear messages");
    }
  };

  const handleAddMember = async (user) => {
    try {
      await conversationsAPI.addMember(conversationId, user.id);
      setShowAddMember(false);
      setMemberSearchQuery('');
      setSearchedMemberUsers([]);
      const res = await conversationsAPI.get(conversationId);
      setActiveConversation(res.data);
      alert(`${user.name} added successfully!`);
    } catch (err) {
      console.error('Failed to add member', err);
      alert('Failed to add member to conversation.');
    }
  };

  // Load conversations list (only active chatted conversations)
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await conversationsAPI.list();
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
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

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        setHasMoreBefore(true);
        setHasMoreAfter(false);
        const [convoRes, msgsRes] = await Promise.all([
          conversationsAPI.get(conversationId),
          conversationsAPI.getMessages(conversationId, { limit: 50 }),
        ]);
        setActiveConversation(convoRes.data);
        const msgs = msgsRes.data || [];
        setMessages(msgs);
        if (msgs.length < 50) {
          setHasMoreBefore(false);
        }
        conversationsAPI.markRead(conversationId).catch(() => {});
        clearConversationNotifications?.(conversationId);

        // Scroll to bottom
        setTimeout(() => {
          if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
          }
        }, 50);
      } catch (err) {
        console.error('Failed to load messages', err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [conversationId, clearConversationNotifications]);

  const handleScroll = async () => {
    const container = chatMessagesRef.current;
    if (!container || fetchingPage) return;

    // Clear unread badge if user reaches the bottom
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom) {
      setNewIncomingCount(0);
    }

    // Scroll near the top -> Load older messages
    if (container.scrollTop < 20 && hasMoreBefore && messages.length > 0) {
      try {
        setFetchingPage(true);
        const beforeId = messages[0].id;
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;

        const res = await conversationsAPI.getMessages(conversationId, { before: beforeId, limit: 50 });
        const olderMsgs = res.data || [];

        if (olderMsgs.length < 50) {
          setHasMoreBefore(false);
        }

        setMessages((prev) => {
          const combined = [...olderMsgs, ...prev];
          if (combined.length > 100) {
            setHasMoreAfter(true);
            return combined.slice(0, 100);
          }
          return combined;
        });

        setTimeout(() => {
          container.scrollTop = container.scrollHeight - previousScrollHeight + previousScrollTop;
        }, 0);
      } catch (err) {
        console.error('Failed to load older messages', err);
      } finally {
        setFetchingPage(false);
      }
    }

    // Scroll near the bottom -> Load newer messages
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
    if (isNearBottom && hasMoreAfter && messages.length > 0) {
      try {
        setFetchingPage(true);
        const afterId = messages[messages.length - 1].id;

        const res = await conversationsAPI.getMessages(conversationId, { after: afterId, limit: 50 });
        const newerMsgs = res.data || [];

        if (newerMsgs.length < 50) {
          setHasMoreAfter(false);
        }

        setHasMoreBefore(true);

        setMessages((prev) => {
          const combined = [...prev, ...newerMsgs];
          if (combined.length > 100) {
            return combined.slice(combined.length - 100);
          }
          return combined;
        });
      } catch (err) {
        console.error('Failed to load newer messages', err);
      } finally {
        setFetchingPage(false);
      }
    }
  };

  // WebSocket listeners
  useEffect(() => {
    if (!ws) return;
    const unsubMsg = ws.subscribe('CHAT_MESSAGE_CREATED', (data) => {
      const incomingConvoId = data.conversation_id;
      const incomingMsg = data.message;

      if (incomingConvoId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          if (hasMoreAfter) return prev;
          const combined = [...prev, incomingMsg];
          if (combined.length > 100) {
            setHasMoreBefore(true);
            return combined.slice(combined.length - 100);
          }
          return combined;
        });
        conversationsAPI.markRead(conversationId).catch(() => {});

        setTimeout(() => {
          const container = chatMessagesRef.current;
          if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            const isOwn = incomingMsg.sender_id === currentUser?.id;
            if (isNearBottom || isOwn) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
              setNewIncomingCount(0);
            } else {
              setNewIncomingCount((prev) => prev + 1);
            }
          }
        }, 50);
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
          return [updated, ...prev.filter((_, i) => i !== index)];
        } else {
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
    const tempCreatedAt = new Date(Date.now() + (window.serverTimeOffset || 0)).toISOString();
    const tempMsg = {
      id: tempId,
      content,
      sender_id: currentUser.id,
      sender: { id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatar_url },
      created_at: tempCreatedAt,
      type: 'text',
      read_by: [currentUser.id],
      _pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      setSendingMessage(true);
      const res = await conversationsAPI.sendMessage(conversationId, { content });
      const savedMsg = res.data;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...savedMsg, _pending: false } : m)));
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    try {
      const initRes = await fileTransfersAPI.initiate({
        conversation_id: conversationId,
        filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
      });
      const transferId = initRes.data.transfer_id;

      let offset = 0;
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        await fileTransfersAPI.uploadChunk(transferId, chunk, offset);
        offset += chunk.size;
        setUploadProgress({
          filename: file.name,
          percentage: Math.min(100, Math.round((offset / file.size) * 100)),
        });
      }

      await fileTransfersAPI.completeUpload(transferId);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('File upload failed', err);
      setUploadProgress(null);
      alert('File upload failed. Please try again.');
    }
  };

  const handleDownloadFile = async (transferId, filename) => {
    try {
      const res = await fileTransfersAPI.download(transferId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('File could not be downloaded. It may have expired.');
    }
  };

  const handleUserSelect = async (user) => {
    if (user.is_external) {
      // Out-of-org / guest flow: Prompt for initial message request (Google Chat style)
      setSelectedExternalUser(user);
      return;
    }

    // In-org member direct message
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
      setUserSearchQuery('');
      setSearchedUsers([]);
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const handleSendExternalRequest = async () => {
    if (!selectedExternalUser) return;
    try {
      await guestRequestsAPI.send({
        target_user_id: selectedExternalUser.id,
        message: externalReqMessage.trim() || 'Hi, I would like to connect with you.',
      });
      alert(`Chat request sent to ${selectedExternalUser.name}. They will be able to accept or decline.`);
      setSelectedExternalUser(null);
      setExternalReqMessage('');
      setShowNewChat(false);
      setUserSearchQuery('');
      setSearchedUsers([]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send chat request');
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

  const formatMessageBubbleTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

        {/* New Chat — Search & User picker */}
        {showNewChat && (
          <div className="new-chat-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="new-chat-title" style={{ padding: 0 }}>Start a conversation</div>
              <button className="btn btn-icon btn-ghost" onClick={() => { setShowNewChat(false); setSelectedExternalUser(null); }}>
                <X size={14} />
              </button>
            </div>

            {selectedExternalUser ? (
              <div style={{ padding: '8px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #DFE1E6' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D', marginBottom: '4px' }}>
                  Send Chat Request to {selectedExternalUser.name}
                </div>
                <div style={{ fontSize: '11px', color: '#5E6C84', marginBottom: '10px' }}>
                  {selectedExternalUser.email} · <span className="badge badge-warning" style={{ fontSize: '10px' }}>Out of Organization</span>
                </div>
                <textarea
                  rows={3}
                  value={externalReqMessage}
                  onChange={(e) => setExternalReqMessage(e.target.value)}
                  placeholder="Introduce yourself or state purpose..."
                  className="jira-input"
                  style={{ fontSize: '12px', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedExternalUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSendExternalRequest}
                  >
                    Send Request
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px 6px 26px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid #DFE1E6',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                </div>

                {searchingUsers ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#7A869A' }}>
                    Searching users...
                  </div>
                ) : userSearchQuery.trim() && searchedUsers.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#7A869A' }}>
                    No users found matching "{userSearchQuery}"
                  </div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {searchedUsers.map((user) => (
                      <button
                        key={user.id}
                        className="new-chat-user"
                        onClick={() => handleUserSelect(user)}
                        style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                      >
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="avatar avatar-sm" />
                        ) : (
                          <div className="avatar avatar-sm">{user.name?.[0]}</div>
                        )}
                        <div className="new-chat-user-info" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="new-chat-user-name" style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</span>
                            {user.is_external && (
                              <span className="badge badge-neutral" style={{ fontSize: '9px', padding: '1px 4px' }}>Guest</span>
                            )}
                          </div>
                          <div className="new-chat-user-email" style={{ fontSize: '11px', color: '#7A869A' }}>{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
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
                {showMessageSearch ? (
                  <div className="chat-message-search-input-wrapper">
                    <input
                      type="text"
                      className="chat-message-search-input"
                      placeholder="Search messages..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn btn-icon btn-ghost btn-sm"
                      onClick={() => {
                        setShowMessageSearch(false);
                        setMessageSearchQuery('');
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-icon btn-ghost"
                    title="Search in conversation"
                    onClick={() => setShowMessageSearch(true)}
                  >
                    <Search size={16} />
                  </button>
                )}

                <div className="chat-more-menu-container" ref={moreMenuRef}>
                  <button
                    className="btn btn-icon btn-ghost"
                    title="More options"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showMoreMenu && (
                    <div className="chat-dropdown-menu">
                      {(activeConversation?.type === 'channel' || activeConversation?.type === 'group') && (
                        <button
                          className="chat-dropdown-item"
                          onClick={() => {
                            setShowAddMember(true);
                            setShowMoreMenu(false);
                          }}
                        >
                          Add Member
                        </button>
                      )}
                      <button
                        className="chat-dropdown-item chat-dropdown-item-danger"
                        onClick={() => {
                          setShowClearConfirm(true);
                          setShowMoreMenu(false);
                        }}
                      >
                        Clear Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
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
                filteredMessages.map((msg, idx) => {
                  const isOwn = msg.sender_id === currentUser?.id;
                  const showAvatar =
                    idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;

                  const msgDate = new Date(msg.created_at);
                  const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                  const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;
                  const isNewDay = !prevMsgDate || 
                    msgDate.getDate() !== prevMsgDate.getDate() ||
                    msgDate.getMonth() !== prevMsgDate.getMonth() ||
                    msgDate.getFullYear() !== prevMsgDate.getFullYear();

                  const getSeparatorText = (date) => {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    if (date.toDateString() === today.toDateString()) return 'Today';
                    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
                    return date.toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  };

                  const renderMessage = () => {
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
                  };

                  return (
                    <React.Fragment key={msg.id || idx}>
                      {isNewDay && (
                        <div className="chat-date-separator">
                          <span className="chat-date-separator-text">
                            {getSeparatorText(msgDate)}
                          </span>
                        </div>
                      )}
                      {renderMessage()}
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating scroll to bottom badge */}
            {newIncomingCount > 0 && (
              <button 
                className="chat-scroll-bottom-badge" 
                onClick={() => {
                  scrollToBottom('smooth');
                  setNewIncomingCount(0);
                }}
              >
                <ArrowDown size={14} />
                <span>{newIncomingCount} {newIncomingCount === 1 ? 'new message' : 'new messages'}</span>
              </button>
            )}

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
                <div className="chat-emoji-picker-container" ref={emojiPickerRef}>
                  <button
                    className="btn btn-icon btn-ghost chat-input-btn"
                    title="Emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile size={18} />
                  </button>
                  {showEmojiPicker && (
                    <div className="chat-emoji-picker">
                      <div className="chat-emoji-grid">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            className="chat-emoji-btn"
                            onClick={() => handleEmojiClick(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

        {showAddMember && (
          <div className="chat-modal-overlay">
            <div className="chat-modal-card">
              <div className="chat-modal-header">
                <h3>Add member to channel</h3>
                <button
                  className="btn btn-icon btn-ghost"
                  onClick={() => {
                    setShowAddMember(false);
                    setMemberSearchQuery('');
                    setSearchedMemberUsers([]);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="chat-modal-body">
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '28px' }}
                    placeholder="Search users by name or email..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="chat-modal-results">
                  {searchingMemberUsers ? (
                    <div style={{ padding: '8px 0', fontSize: '12px', color: 'var(--color-neutral-500)' }}>Searching...</div>
                  ) : memberSearchQuery.trim() && searchedMemberUsers.length === 0 ? (
                    <div style={{ padding: '8px 0', fontSize: '12px', color: 'var(--color-neutral-500)' }}>No users found</div>
                  ) : (
                    searchedMemberUsers.map((user) => (
                      <div key={user.id} className="chat-modal-result-item" onClick={() => handleAddMember(user)}>
                        <div className="avatar avatar-sm">
                          {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>{user.email}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
{showClearConfirm && (
          <div className="chat-modal-overlay">
            <div className="chat-modal-card" style={{ width: '360px' }}>
              <div className="chat-modal-header">
                <h3>Clear Chat History</h3>
                <button className="btn btn-icon btn-ghost" onClick={() => setShowClearConfirm(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="chat-modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
                <p style={{ fontSize: '14px', color: 'var(--color-neutral-800)', marginBottom: '20px' }}>
                  Are you sure you want to clear all message history in this conversation? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleClearChat}>
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
