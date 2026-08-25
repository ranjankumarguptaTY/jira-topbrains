import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useWebSocket } from '../context/WebSocketContext';
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
} from 'lucide-react';
import { NotificationPanel } from '../components/layout/NotificationPanel';
import { TopBrainsLogo } from '../components/common/TopBrainsLogo';
import './AppShell.css';

const AppShell = () => {
  const { currentUser, logout, canManageOrg, isOrgAdmin, currentOrg, userOrgs, switchOrg, isSuperAdmin } = useAuth();
  const { unreadCount, unreadChatCount } = useNotifications();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    logout();
    navigate('/login');
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
          <div className="app-search">
            <Search size={15} className="app-search-icon" />
            <input
              type="text"
              placeholder="Search conversations, projects, issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="app-search-input"
            />
            <kbd className="app-search-shortcut">⌘K</kbd>
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
