import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useWebSocket } from '../context/WebSocketContext';
import { searchAPI } from '../services/api';
import {
  Home,
  MessageCircle,
  FolderKanban,
  ClipboardList,
  Settings,
  ShieldCheck,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Building,
  Check,
  ChevronsUpDown,
  User,
  Hash,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { NotificationPanel } from '../components/layout/NotificationPanel';
import { TopBrainsLogo } from '../components/common/TopBrainsLogo';
import './AppShell.css';

const AppShell = () => {
  const { currentUser, logout, canManageOrg, isOrgAdmin, currentOrg, userOrgs, switchOrg, isSuperAdmin } = useAuth();
  const { unreadCount, unreadChatCount } = useNotifications();
  const { showConfirm } = useModal();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  // --- Context-Aware Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Compute search scope based on current route
  const getSearchScope = () => {
    if (location.pathname.startsWith('/chat')) return 'chat';
    if (location.pathname.startsWith('/projects') || location.pathname.startsWith('/my-work') || location.pathname === '/') {
      return 'jira';
    }
    return 'all';
  };

  // Keyboard shortcut (⌘K or Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = searchContainerRef.current?.querySelector('input');
        input?.focus();
      }
      if (e.key === 'Escape') {
        setShowSearchDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search trigger (250ms, min 2 chars)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    const scope = getSearchScope();
    const activeOrgId = currentOrg?.id || null;

    const timer = setTimeout(async () => {
      try {
        const res = await searchAPI.search(q, scope, activeOrgId);
        setSearchResults(res.data);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, location.pathname, currentOrg?.id]);

  const navItems = [
    { path: '/', icon: Home, label: 'Home', exact: true },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/my-work', icon: ClipboardList, label: 'My Work' },
  ];

  const bottomNavItems = [
    { path: '/settings', icon: Settings, label: 'Settings' },
    ...(isSuperAdmin?.() || isOrgAdmin?.()
      ? [{ path: '/admin', icon: ShieldCheck, label: 'Admin' }]
      : []),
  ];

  const handleLogout = () => {
    setShowUserMenu(false);
    showConfirm({
      title: 'Sign Out of TopBrains?',
      message: 'Are you sure you want to sign out? You will need to log back in to access your chats, projects, and notifications.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        logout();
        navigate('/login');
      },
    });
  };

  const userInitials = currentUser?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-shell">
      {/* === TOP NAVBAR === */}
      <header className="app-navbar">
        <div className="app-navbar-left">
          <button
            className="btn btn-icon btn-ghost navbar-menu-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <Menu size={18} /> : <Menu size={18} />}
          </button>
          <div className="app-logo" onClick={() => navigate('/')}>
            <TopBrainsLogo size={28} />
          </div>

          {/* PWA navigation controls */}
          <div className="app-pwa-nav-controls">
            <button
              className="btn btn-icon btn-ghost pwa-nav-btn"
              title="Go back"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={15} />
            </button>
            <button
              className="btn btn-icon btn-ghost pwa-nav-btn"
              title="Go forward"
              onClick={() => window.history.forward()}
            >
              <ArrowRight size={15} />
            </button>
            <button
              className="btn btn-icon btn-ghost pwa-nav-btn"
              title="Refresh"
              onClick={() => window.location.reload()}
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        <div className="app-navbar-center">
          <div className="app-search" ref={searchContainerRef}>
            {isSearching ? (
              <Loader2 size={15} className="app-search-icon" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Search size={15} className="app-search-icon" />
            )}
            <input
              type="text"
              placeholder={
                location.pathname.startsWith('/chat')
                  ? 'Search users, messages, conversations...'
                  : currentOrg
                  ? `Search ${currentOrg.name} issues & projects...`
                  : 'Search issues, projects, chats...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 3 && searchResults) {
                  setShowSearchDropdown(true);
                }
              }}
              className="app-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                  setShowSearchDropdown(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#7A869A',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
            <kbd className="app-search-shortcut">⌘K</kbd>

            {/* === UNIFIED CONTEXT-AWARE SEARCH DROPDOWN === */}
            {showSearchDropdown && searchResults && (
              <div className="app-search-dropdown">
                {/* 1. JIRA ISSUES / TICKETS */}
                {searchResults.issues?.length > 0 && (
                  <div className="app-search-section">
                    <div className="app-search-section-title">
                      <CheckCircle2 size={12} color="#0052CC" />
                      <span>Jira Tickets ({searchResults.issues.length})</span>
                    </div>
                    {searchResults.issues.map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        className="app-search-item"
                        onClick={() => {
                          navigate(`/projects/${issue.project_id}?issue=${issue.id}`);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="app-search-item-left">
                          <span
                            className="badge badge-primary"
                            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}
                          >
                            {issue.key}
                          </span>
                          <div className="app-search-item-info">
                            <div className="app-search-item-title truncate">{issue.summary}</div>
                            <div className="app-search-item-subtitle truncate">
                              Status: <b>{issue.status?.toUpperCase()}</b> · Assignee:{' '}
                              {issue.assignee?.name || 'Unassigned'}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. JIRA PROJECTS */}
                {searchResults.projects?.length > 0 && (
                  <div className="app-search-section">
                    <div className="app-search-section-title">
                      <FolderKanban size={12} color="#00875A" />
                      <span>Projects ({searchResults.projects.length})</span>
                    </div>
                    {searchResults.projects.map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        className="app-search-item"
                        onClick={() => {
                          navigate(`/projects/${proj.id}`);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="app-search-item-left">
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              background: '#E3FCEF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#006644',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            {proj.key}
                          </div>
                          <div className="app-search-item-info">
                            <div className="app-search-item-title truncate">{proj.name}</div>
                            <div className="app-search-item-subtitle truncate">
                              Key: {proj.key} · Lead: {proj.lead?.name || 'Project Lead'}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. CHAT USERS */}
                {searchResults.users?.length > 0 && (
                  <div className="app-search-section">
                    <div className="app-search-section-title">
                      <User size={12} color="#6554C0" />
                      <span>People ({searchResults.users.length})</span>
                    </div>
                    {searchResults.users.map((usr) => (
                      <button
                        key={usr.id}
                        type="button"
                        className="app-search-item"
                        onClick={async () => {
                          try {
                            const { conversationsAPI } = await import('../services/api');
                            const res = await conversationsAPI.create({
                              type: 'direct',
                              member_ids: [usr.id],
                            });
                            navigate(`/chat/${res.data.id}`);
                          } catch (err) {
                            console.error('Failed to create/open conversation:', err);
                            navigate('/chat');
                          }
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="app-search-item-left">
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: '#DEEBFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#0052CC',
                            }}
                          >
                            {usr.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="app-search-item-info">
                            <div className="app-search-item-title truncate">
                              {usr.name}
                              {usr.company_name && (
                                <span style={{ fontSize: '10px', color: '#5E6C84', fontWeight: 400 }}>
                                  ({usr.company_name})
                                </span>
                              )}
                            </div>
                            <div className="app-search-item-subtitle truncate">{usr.email}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. CHAT CONVERSATIONS & CHANNELS */}
                {searchResults.conversations?.length > 0 && (
                  <div className="app-search-section">
                    <div className="app-search-section-title">
                      <Hash size={12} color="#0052CC" />
                      <span>Channels & Chats ({searchResults.conversations.length})</span>
                    </div>
                    {searchResults.conversations.map((convo) => (
                      <button
                        key={convo.id}
                        type="button"
                        className="app-search-item"
                        onClick={() => {
                          navigate(`/chat/${convo.id}`);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="app-search-item-left">
                          <Hash size={16} color="#0052CC" />
                          <div className="app-search-item-info">
                            <div className="app-search-item-title truncate">
                              #{convo.name || 'Conversation'}
                            </div>
                            {convo.description && (
                              <div className="app-search-item-subtitle truncate">
                                {convo.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 5. MATCHED CHAT MESSAGES */}
                {searchResults.messages?.length > 0 && (
                  <div className="app-search-section">
                    <div className="app-search-section-title">
                      <FileText size={12} color="#42526E" />
                      <span>Message Matches ({searchResults.messages.length})</span>
                    </div>
                    {searchResults.messages.map((msg) => (
                      <button
                        key={msg.id}
                        type="button"
                        className="app-search-item"
                        onClick={() => {
                          navigate(`/chat/${msg.conversation_id}`);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="app-search-item-left">
                          <div className="app-search-item-info">
                            <div className="app-search-item-title truncate">
                              {msg.sender?.name || 'Member'}:
                            </div>
                            <div className="app-search-item-subtitle truncate" style={{ color: '#172B4D' }}>
                              "{msg.content}"
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* NO RESULTS FOUND */}
                {searchResults.issues?.length === 0 &&
                  searchResults.projects?.length === 0 &&
                  searchResults.users?.length === 0 &&
                  searchResults.conversations?.length === 0 &&
                  searchResults.messages?.length === 0 && (
                    <div className="app-search-empty">
                      No results found for "<b>{searchQuery}</b>"
                      {currentOrg ? ` in ${currentOrg.name}` : ''}.
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="app-navbar-right">
          <div className="connection-indicator" title={isConnected ? 'Connected' : 'Reconnecting...'}>
            {isConnected ? (
              <Wifi size={14} className="connection-online" />
            ) : (
              <WifiOff size={14} className="connection-offline" />
            )}
          </div>

          <button
            className="btn btn-icon btn-ghost notif-btn"
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="badge badge-count notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          <div className="user-menu-container">
            <button
              className="user-avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
            >
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.name} className="avatar avatar-md" />
              ) : (
                <div className="avatar avatar-md">{userInitials}</div>
              )}
            </button>

            {showUserMenu && (
              <>
                <div className="dropdown-backdrop" onClick={() => setShowUserMenu(false)} />
                <div className="dropdown-menu user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{currentUser?.name}</div>
                    {currentUser?.company_name && (
                      <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600, marginTop: '2px' }}>
                        🏢 {currentUser.company_name}
                      </div>
                    )}
                    <div className="user-dropdown-role badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {isSuperAdmin?.()
                        ? 'Super Admin'
                        : isOrgAdmin?.()
                        ? `Org Admin · ${currentOrg?.name || ''}`
                        : `Member · ${currentOrg?.name || 'Workspace'}`}
                    </div>
                  </div>
                  <div className="dropdown-separator" />
                  <button className="dropdown-item" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                    <Settings size={15} />
                    Settings
                  </button>
                  <div className="dropdown-separator" />
                  <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* === LEFT SIDEBAR === */}
        <nav className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div>
            {/* Workspace / Org Switcher */}
            <div className="sidebar-org-container">
              <button
                type="button"
                className={`sidebar-org-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                title={currentOrg ? `Organization: ${currentOrg.name}` : 'Personal Workspace'}
              >
                <div className="sidebar-org-icon">
                  <Building size={16} color="#0052CC" />
                </div>
                {!sidebarCollapsed && (
                  <div className="sidebar-org-info">
                    <div className="sidebar-org-name truncate">
                      {currentOrg?.name || (isSuperAdmin?.() ? 'All Organizations' : 'Personal Workspace')}
                    </div>
                    {isSuperAdmin?.() ? (
                      <div className="sidebar-org-role">{currentOrg ? 'Viewing Org Specific' : 'Overall Platform View'}</div>
                    ) : userOrgs.length > 1 ? (
                      <div className="sidebar-org-role">{userOrgs.length} Orgs (Click to switch)</div>
                    ) : currentOrg ? (
                      <div className="sidebar-org-role">Active Org</div>
                    ) : null}
                  </div>
                )}
                {!sidebarCollapsed && (userOrgs.length > 1 || isSuperAdmin?.()) && (
                  <ChevronsUpDown size={14} className="sidebar-org-chevron" />
                )}
              </button>

              {/* Org Switcher Dropdown */}
              {showOrgSwitcher && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setShowOrgSwitcher(false)} />
                  <div className={`dropdown-menu sidebar-org-dropdown ${sidebarCollapsed ? 'from-collapsed' : ''}`}>
                    <div className="sidebar-org-dropdown-header">
                      <span>Switch Organization</span>
                      <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                        {userOrgs.length} Available
                      </span>
                    </div>

                    <div className="sidebar-org-list">
                      {isSuperAdmin?.() && (
                        <button
                          type="button"
                          className={`sidebar-org-item ${!currentOrg ? 'selected' : ''}`}
                          onClick={() => {
                            switchOrg(null);
                            setShowOrgSwitcher(false);
                          }}
                        >
                          <div className="sidebar-org-item-avatar" style={{ background: !currentOrg ? '#DEEBFF' : '#EBECF0' }}>
                            <Building size={14} color={!currentOrg ? '#0052CC' : '#5E6C84'} />
                          </div>
                          <div className="sidebar-org-item-info">
                            <div className="sidebar-org-item-name truncate" style={{ fontWeight: 700 }}>
                              🌐 All Organizations (Overall)
                            </div>
                            <div className="sidebar-org-item-meta">
                              Platform analytics across all orgs
                            </div>
                          </div>
                          {!currentOrg && <Check size={14} color="#0052CC" className="sidebar-org-item-check" />}
                        </button>
                      )}

                      {userOrgs.map((org) => {
                        const isSelected = currentOrg?.id === org.id;
                        return (
                          <button
                            key={org.id}
                            type="button"
                            className={`sidebar-org-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              switchOrg(org);
                              setShowOrgSwitcher(false);
                            }}
                          >
                            <div className="sidebar-org-item-avatar">
                              <Building size={14} color={isSelected ? '#0052CC' : '#5E6C84'} />
                            </div>
                            <div className="sidebar-org-item-info">
                              <div className="sidebar-org-item-name truncate">{org.name}</div>
                              <div className="sidebar-org-item-meta">
                                {org.member_count || 0} members · {org.team_count || 0} teams
                              </div>
                            </div>
                            {isSelected && <Check size={14} color="#0052CC" className="sidebar-org-item-check" />}
                          </button>
                        );
                      })}
                    </div>

                    {isSuperAdmin?.() && (
                      <>
                        <div className="dropdown-separator" />
                        <button
                          type="button"
                          className="dropdown-item"
                          style={{ fontSize: '12px', color: '#0052CC', fontWeight: 600 }}
                          onClick={() => {
                            navigate('/admin');
                            setShowOrgSwitcher(false);
                          }}
                        >
                          <ShieldCheck size={14} />
                          Admin Hub (All Orgs & Teams)
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const isChat = item.path === '/chat';
              const hasChatUnread = isChat && unreadChatCount > 0;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                  style={{ position: 'relative' }}
                >
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} />
                    {hasChatUnread && sidebarCollapsed && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -2,
                          right: -4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#DE350B',
                          boxShadow: '0 0 0 2px #FAFBFC',
                        }}
                      />
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                      <span>{item.label}</span>
                      {hasChatUnread && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#DE350B',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            minWidth: '18px',
                            height: '16px',
                            lineHeight: 1,
                          }}
                        >
                          {unreadChatCount > 99 ? '99+' : unreadChatCount}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
            </div>
          </div>

          <div className="sidebar-bottom">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}

            <button
              className="sidebar-nav-item sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#DE350B',
              }}
            >
              <LogOut size={18} />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>

            <button
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </nav>

        {/* === MAIN CONTENT === */}
        <main className="app-main">
          <Outlet />
        </main>
      </div>

      {/* Notifications Panel */}
      <NotificationPanel isOpen={showNotifPanel} onClose={() => setShowNotifPanel(false)} />
    </div>
  );
};

export default AppShell;
