import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useNotifications } from '../context/NotificationContext';
import { authAPI, conversationsAPI, guestRequestsAPI, fileTransfersAPI, orgAPI } from '../services/api';
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
  Radio,
  Building,
  Briefcase,
  ChevronDown,
  ChevronRight,
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
  const { currentUser, currentOrg } = useAuth();
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

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const filteredMessages = messages.filter((msg) => {
    if (!messageSearchQuery) return true;
    return msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  const [guestRequests, setGuestRequests] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTab, setNewChatTab] = useState('direct'); // 'direct' | 'group'
  const [groupName, setGroupName] = useState('');
  const [groupSelectedMembers, setGroupSelectedMembers] = useState([]);
  const [orgMemberList, setOrgMemberList] = useState([]);

  const [showGuestRequests, setShowGuestRequests] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [externalReqMessage, setExternalReqMessage] = useState('');
  const [selectedExternalUser, setSelectedExternalUser] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [loadingConvos, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Search registered users by name or email
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

  // Load org members for group chat creation
  useEffect(() => {
    if (showNewChat && newChatTab === 'group' && currentOrg?.id) {
      orgAPI.listMembers(currentOrg.id).then((res) => {
        setOrgMemberList(res.data || []);
      }).catch((err) => console.warn('Failed to load org members', err));
    }
  }, [showNewChat, newChatTab, currentOrg]);

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

  // Load conversations list
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

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom) {
      setNewIncomingCount(0);
    }

    if (container.scrollTop < 20 && hasMoreBefore && messages.length > 0) {
      try {
        setFetchingPage(true);
        const beforeId = messages[0].id;
        const res = await conversationsAPI.getMessages(conversationId, { before: beforeId, limit: 50 });
        const olderMsgs = res.data || [];

        if (olderMsgs.length < 50) {
          setHasMoreBefore(false);
        }

        setMessages((prev) => {
          const combined = [...olderMsgs, ...prev];
          return combined;
        });
      } catch (err) {
        console.error('Failed to fetch older messages', err);
      } finally {
        setFetchingPage(false);
      }
    }
  };

  // WebSocket event handler
  useEffect(() => {
    if (!ws?.lastMessage) return;

    const event = ws.lastMessage;

    if (event.type === 'CHAT_MESSAGE_CREATED') {
      const { conversation_id, message } = event;

      if (conversation_id === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        conversationsAPI.markRead(conversationId).catch(() => {});

        setTimeout(() => {
          if (chatMessagesRef.current) {
            const container = chatMessagesRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom) {
              scrollToBottom('smooth');
            } else {
              setNewIncomingCount((c) => c + 1);
            }
          }
        }, 50);
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation_id) {
            return {
              ...c,
              last_message: message,
              updated_at: message.created_at,
              unread_count:
                c.id === conversationId
                  ? 0
                  : (c.unread_count || 0) + (message.sender_id !== currentUser?.id ? 1 : 0),
            };
          }
          return c;
        })
      );
    }

    if (event.type === 'CHAT_MESSAGES_READ') {
      const { conversation_id, reader_id } = event;
      if (conversation_id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (!m.read_by) m.read_by = [];
            if (!m.read_by.includes(reader_id)) {
              return { ...m, read_by: [...m.read_by, reader_id] };
            }
            return m;
          })
        );
      }
    }

    if (event.type === 'GUEST_REQUEST_RECEIVED') {
      loadGuestRequests();
    }
  }, [ws?.lastMessage, conversationId, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sendingMessage) return;

    const content = newMessage.trim();
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    const tempCreatedAt = new Date(Date.now() + (window.serverTimeOffset || 0)).toISOString();
    const tempMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content,
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
      setSelectedExternalUser(user);
      return;
    }

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

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || groupSelectedMembers.length === 0) {
      alert('Please provide a group name and select at least one member.');
      return;
    }

    try {
      const res = await conversationsAPI.create({
        type: 'group',
        name: groupName.trim(),
        member_ids: groupSelectedMembers,
        organization_id: currentOrg?.id,
      });
      const convo = res.data;
      setConversations((prev) => [convo, ...prev]);
      navigate(`/chat/${convo.id}`);
      setShowNewChat(false);
      setGroupName('');
      setGroupSelectedMembers([]);
    } catch (err) {
      console.error('Failed to create group chat', err);
      alert('Failed to create group chat');
    }
  };

  const handleSendExternalRequest = async () => {
    if (!selectedExternalUser) return;
    try {
      await guestRequestsAPI.send({
        target_user_id: selectedExternalUser.id,
        message: externalReqMessage.trim() || 'Hi, I would like to connect with you.',
      });
      alert(`Chat request sent to ${selectedExternalUser.name}.`);
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
    if (convo.type === 'org_broadcast') return <Radio size={16} color="#0052CC" />;
    if (convo.type === 'team_broadcast') return <Building size={16} color="#00875A" />;
    if (convo.type === 'project_broadcast') return <Briefcase size={16} color="#6554C0" />;
    if (convo.type === 'channel') return <Hash size={16} />;
    if (convo.type === 'group') return <Users size={16} color="#0052CC" />;
    const other = convo.members?.find((m) => m.id !== currentUser?.id);
    if (other?.avatar_url) return <img src={other.avatar_url} alt="" />;
    return <User size={16} />;
  };

  // Group conversations into categories
  const filterByQuery = (list) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.members?.some((m) => m.name?.toLowerCase().includes(q))
    );
  };

  const orgBroadcasts = filterByQuery(conversations.filter((c) => c.type === 'org_broadcast'));
  const teamBroadcasts = filterByQuery(conversations.filter((c) => c.type === 'team_broadcast'));
  const projectBroadcasts = filterByQuery(conversations.filter((c) => c.type === 'project_broadcast'));
  const groupChats = filterByQuery(conversations.filter((c) => c.type === 'group' || c.type === 'channel'));
  const directChats = filterByQuery(conversations.filter((c) => c.type === 'direct'));

  const renderConversationItem = (convo) => (
    <div
      key={convo.id}
      className={`conversation-item ${convo.id === conversationId ? 'active' : ''} ${convo.unread_count > 0 ? 'unread' : ''}`}
      onClick={() => navigate(`/chat/${convo.id}`)}
    >
      <div className="conversation-avatar">{getConversationAvatar(convo)}</div>
      <div className="conversation-info">
        <div className="conversation-name truncate" style={{ fontSize: '13px', fontWeight: 600 }}>
          {getConversationName(convo)}
        </div>
        <div className="conversation-last-msg truncate" style={{ fontSize: '11px', color: '#7A869A' }}>
          {convo.last_message?.content || 'No messages yet'}
        </div>
      </div>
      <div className="conversation-meta">
        <span className="conversation-time">{formatTime(convo.last_message?.created_at)}</span>
        {convo.unread_count > 0 && <span className="badge badge-count">{convo.unread_count}</span>}
      </div>
    </div>
  );

  const renderSectionHeader = (title, count, sectionKey, icon) => (
    <div
      onClick={() => toggleSection(sectionKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px 4px 12px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: '#5E6C84',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span>{title} ({count})</span>
      </div>
      {collapsedSections[sectionKey] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
    </div>
  );

  return (
    <div className="chat-page">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Chat Sidebar — Grouped Slack-style Channels */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Slack & Jira Chat</h2>
            {currentOrg && (
              <span style={{ fontSize: '11px', color: '#0052CC', fontWeight: 600 }}>
                🏢 {currentOrg.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setShowGuestRequests(!showGuestRequests)}
              title="Message Requests"
            >
              <UserPlus size={18} />
              {guestRequests.length > 0 && (
                <span className="badge badge-count" style={{ position: 'absolute', top: 2, right: 2 }}>
                  {guestRequests.length}
                </span>
              )}
            </button>
            <button className="btn btn-icon btn-ghost" onClick={() => setShowNewChat(!showNewChat)} title="New chat or group">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="chat-sidebar-search">
          <Search size={14} className="chat-search-icon" />
          <input
            type="text"
            placeholder="Search channels & DMs..."
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

        {/* New Chat / Group Modal Panel */}
        {showNewChat && (
          <div className="new-chat-panel" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`jira-btn ${newChatTab === 'direct' ? 'jira-btn-primary' : 'jira-btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => setNewChatTab('direct')}
                >
                  1:1 Direct Chat
                </button>
                <button
                  className={`jira-btn ${newChatTab === 'group' ? 'jira-btn-primary' : 'jira-btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => setNewChatTab('group')}
                >
                  👥 New Org Group
                </button>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => { setShowNewChat(false); setSelectedExternalUser(null); }}>
                <X size={14} />
              </button>
            </div>

            {newChatTab === 'direct' ? (
              selectedExternalUser ? (
                <div style={{ padding: '8px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #DFE1E6' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D', marginBottom: '4px' }}>
                    Send Chat Request to {selectedExternalUser.name}
                  </div>
                  <textarea
                    rows={2}
                    value={externalReqMessage}
                    onChange={(e) => setExternalReqMessage(e.target.value)}
                    placeholder="Message..."
                    className="jira-input"
                    style={{ fontSize: '12px', marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedExternalUser(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSendExternalRequest}>
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
                      placeholder="Search any user..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px 6px 26px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #DFE1E6',
                      }}
                      autoFocus
                    />
                  </div>

                  {searchingUsers ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#7A869A' }}>
                      Searching...
                    </div>
                  ) : (
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {searchedUsers.map((user) => (
                        <button
                          key={user.id}
                          className="new-chat-user"
                          onClick={() => handleUserSelect(user)}
                          style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 6 }}
                        >
                          <div className="avatar avatar-sm">{user.name?.[0]}</div>
                          <div className="new-chat-user-info" style={{ flex: 1 }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{user.name}</span>
                            <div style={{ fontSize: '10px', color: '#7A869A' }}>{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )
            ) : (
              /* CREATE ORG GROUP CHAT */
              <form onSubmit={handleCreateGroupChat} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Group Name (e.g. Frontend Devs, Leads)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="jira-input"
                  style={{ fontSize: '12px' }}
                  required
                />
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#5E6C84' }}>Select Org Members:</div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #DFE1E6', borderRadius: 4, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {orgMemberList
                    .filter((m) => m.user_id !== currentUser?.id)
                    .map((m) => {
                      const isChecked = groupSelectedMembers.includes(m.user_id);
                      return (
                        <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGroupSelectedMembers([...groupSelectedMembers, m.user_id]);
                              } else {
                                setGroupSelectedMembers(groupSelectedMembers.filter((id) => id !== m.user_id));
                              }
                            }}
                          />
                          <span>{m.user?.name}</span>
                        </label>
                      );
                    })}
                </div>
                <button type="submit" className="jira-btn jira-btn-primary" style={{ fontSize: '12px' }}>
                  Create Org Group Chat
                </button>
              </form>
            )}
          </div>
        )}

        {/* CATEGORIZED CONVERSATIONS LIST */}
        <div className="conversation-list" style={{ overflowY: 'auto' }}>
          {loadingConvos ? (
            <div className="chat-loading">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 48, margin: '4px 8px' }} />
              ))}
            </div>
          ) : (
            <>
              {/* 1. ORGANIZATION BROADCASTS */}
              {orgBroadcasts.length > 0 && (
                <div>
                  {renderSectionHeader('Organization', orgBroadcasts.length, 'org', <Radio size={13} color="#0052CC" />)}
                  {!collapsedSections['org'] && orgBroadcasts.map(renderConversationItem)}
                </div>
              )}

              {/* 2. TEAM BROADCASTS */}
              {teamBroadcasts.length > 0 && (
                <div>
                  {renderSectionHeader('Team Channels', teamBroadcasts.length, 'team', <Building size={13} color="#00875A" />)}
                  {!collapsedSections['team'] && teamBroadcasts.map(renderConversationItem)}
                </div>
              )}

              {/* 3. PROJECT BROADCASTS */}
              {projectBroadcasts.length > 0 && (
                <div>
                  {renderSectionHeader('Project Channels', projectBroadcasts.length, 'project', <Briefcase size={13} color="#6554C0" />)}
                  {!collapsedSections['project'] && projectBroadcasts.map(renderConversationItem)}
                </div>
              )}

              {/* 4. GROUP CHATS */}
              {groupChats.length > 0 && (
                <div>
                  {renderSectionHeader('Group Chats', groupChats.length, 'group', <Users size={13} color="#0052CC" />)}
                  {!collapsedSections['group'] && groupChats.map(renderConversationItem)}
                </div>
              )}

              {/* 5. DIRECT MESSAGES */}
              {directChats.length > 0 && (
                <div>
                  {renderSectionHeader('Direct Messages', directChats.length, 'direct', <User size={13} color="#42526E" />)}
                  {!collapsedSections['direct'] && directChats.map(renderConversationItem)}
                </div>
              )}

              {conversations.length === 0 && (
                <div className="chat-empty-list">
                  <MessageCircle size={32} className="chat-empty-icon" />
                  <p>No conversations yet</p>
                  <span>Click + to start chatting or create a group</span>
                </div>
              )}
            </>
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
            <h2>Welcome to Unified Chat & Work Hub</h2>
            <p>Select an Organization broadcast, Team channel, Project channel, Group, or 1:1 conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0 }}>
                    {activeConversation ? getConversationName(activeConversation) : '...'}
                  </h3>
                  {activeConversation?.type === 'org_broadcast' && (
                    <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                      📢 Org Broadcast
                    </span>
                  )}
                  {activeConversation?.type === 'team_broadcast' && (
                    <span className="badge" style={{ fontSize: '10px', background: '#E3FCEF', color: '#006644' }}>
                      🏢 Team Channel
                    </span>
                  )}
                  {activeConversation?.type === 'project_broadcast' && (
                    <span className="badge" style={{ fontSize: '10px', background: '#EAE6FF', color: '#403294' }}>
                      🎯 Project Channel
                    </span>
                  )}
                </div>
                <span className="chat-header-members" style={{ fontSize: '11px', color: '#7A869A' }}>
                  {activeConversation?.members?.length || 0} members · All members can broadcast
                </span>
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
                  <p>No messages yet. Send a message to get started! 👋</p>
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
                          {!isOwn && (
                            showAvatar ? (
                              <div className="message-avatar">
                                <div className="avatar avatar-sm">{msg.sender?.name?.[0] || '?'}</div>
                              </div>
                            ) : (
                              <div className="message-avatar-spacer" style={{ width: 28, height: 28, flexShrink: 0 }} />
                            )
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
                              <span>Ticket: <b>{msg.metadata.issue_key}</b></span>
                              {msg.metadata.status && (
                                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                                  {msg.metadata.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular Text Message
                    return (
                      <div key={msg.id} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                        {!isOwn && (
                          showAvatar ? (
                            <div className="message-avatar">
                              <div className="avatar avatar-sm">{msg.sender?.name?.[0] || '?'}</div>
                            </div>
                          ) : (
                            <div className="message-avatar-spacer" style={{ width: 28, height: 28, flexShrink: 0 }} />
                          )
                        )}
                        <div className="message-content">
                          {!isOwn && showAvatar && (
                            <div className="message-sender" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontWeight: 600 }}>{msg.sender?.name || 'Member'}</span>
                              {msg.sender?.role && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    letterSpacing: '0.4px',
                                    background: msg.sender.role === 'super_admin' ? '#FFE380' : msg.sender.role === 'org_admin' ? '#DEEBFF' : '#EBECF0',
                                    color: msg.sender.role === 'super_admin' ? '#7A5E00' : msg.sender.role === 'org_admin' ? '#0747A6' : '#42526E',
                                  }}
                                >
                                  {msg.sender.role === 'super_admin' ? 'Super Admin' : msg.sender.role === 'org_admin' ? 'Org Admin' : msg.sender.role}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="message-bubble">
                            <div className="message-text">{msg.content}</div>
                            <div className="message-time">
                              {formatMessageBubbleTime(msg.created_at)}
                              {isOwn && (
                                <span className="message-status" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}>
                                  {msg._pending ? (
                                    <Clock size={12} style={{ opacity: 0.7 }} />
                                  ) : msg.read_by && msg.read_by.length > 1 ? (
                                    <CheckCheck size={13} color="#57D9A3" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))' }} title="Read" />
                                  ) : (
                                    <Check size={12} style={{ opacity: 0.8 }} title="Sent" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <React.Fragment key={msg.id || idx}>
                      {isNewDay && (
                        <div className="chat-date-separator">
                          <span className="chat-date-separator-text">{getSeparatorText(msgDate)}</span>
                        </div>
                      )}
                      {renderMessage()}
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload progress banner */}
            {uploadProgress && (
              <div className="chat-upload-progress">
                <span>Uploading {uploadProgress.filename}...</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress.percentage}%` }} />
                </div>
                <span>{uploadProgress.percentage}%</span>
              </div>
            )}

            {/* Input area */}
            <div className="chat-input-area">
              <form className="chat-input-container" onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost chat-input-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${activeConversation ? getConversationName(activeConversation) : ''}...`}
                  className="chat-input"
                  autoFocus
                />

                <div className="chat-emoji-picker-container" ref={emojiPickerRef}>
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost chat-input-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Emoji"
                  >
                    <Smile size={18} />
                  </button>
                  {showEmojiPicker && (
                    <div className="chat-emoji-picker">
                      <div className="chat-emoji-grid">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
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
                  type="submit"
                  className="btn btn-icon btn-primary chat-send-btn"
                  disabled={!newMessage.trim() || sendingMessage}
                  title="Send message (Enter)"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* MODAL: Add Member to Conversation */}
      {showAddMember && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <h2 className="modal-title">Add Member to Channel</h2>
            <div style={{ position: 'relative', margin: '14px 0' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
              <input
                type="text"
                placeholder="Search user to add..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="jira-input"
                style={{ paddingLeft: 30, fontSize: '13px' }}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searchedMemberUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleAddMember(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px',
                    border: '1px solid #DFE1E6',
                    borderRadius: 6,
                    background: '#FFF',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div className="avatar avatar-sm">{u.name?.[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{u.name}</div>
                    <div style={{ fontSize: '10px', color: '#7A869A' }}>{u.email}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="jira-btn jira-btn-secondary" onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
