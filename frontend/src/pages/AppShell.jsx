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
} from 'lucide-react';
import { NotificationPanel } from '../components/layout/NotificationPanel';
import './AppShell.css';

const AppShell = () => {
  const { currentUser, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { path: '/', icon: Home, label: 'Home', exact: true },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/my-work', icon: ClipboardList, label: 'My Work' },
  ];

  const bottomNavItems = [
    { path: '/settings', icon: Settings, label: 'Settings' },
    ...(currentUser?.role === 'admin'
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
            <div className="app-logo-icon">
              <FolderKanban size={18} color="#fff" />
            </div>
            <span className="app-logo-text">TopBrains</span>
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
                    <div className="user-dropdown-email">{currentUser?.email}</div>
                    <div className="user-dropdown-role badge badge-primary">{currentUser?.role}</div>
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
          <div className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
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
