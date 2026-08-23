import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Plus,
  Search,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown,
  Database,
  Check,
  FolderKanban,
  LogOut,
  Sliders,
  Users
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Avatar } from '../common/Avatar';
import { TopBrainsLogo } from '../common/TopBrainsLogo';
import { UserManagementModal } from '../modal/UserManagementModal';
import { AppSwitcherDropdown } from './AppSwitcherDropdown';
import { NotificationsDrawer } from './NotificationsDrawer';
import { HelpShortcutsModal } from '../modal/HelpShortcutsModal';
import { SettingsModal } from '../modal/SettingsModal';
import { JiraImportExportModal } from '../modal/JiraImportExportModal';
import { projectsApi } from '../../api/projects';

export const Navbar = () => {
  const {
    projects,
    currentProject,
    selectProject,
    setIsCreateModalOpen,
    setIsCreateProjectOpen,
    searchQuery,
    setSearchQuery,
    setActiveTab,
    refreshBoard
  } = useProject();

  const { currentUser, users, switchUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { showConfirm, showToast } = useModal();

  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [isSeeding, setIsSeeding] = useState(false);

  const searchInputRef = useRef(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (isInput) return;

      if (e.key === 'c') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsHelpOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'k') {
        e.preventDefault();
        setActiveTab('board');
      } else if (e.key === 'b') {
        e.preventDefault();
        setActiveTab('backlog');
      } else if (e.key === 'r') {
        e.preventDefault();
        setActiveTab('roadmap');
      } else if (e.key === 'i') {
        e.preventDefault();
        setActiveTab('issues');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCreateModalOpen, setActiveTab]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    showConfirm({
      title: 'Log out of TopBrains Jira?',
      message: 'You can log back in anytime with your credentials.',
      confirmText: 'Log out',
      variant: 'danger',
      onConfirm: async () => {
        logout();
        showToast({ message: 'Logged out successfully', type: 'info' });
      },
    });
  };

  const handleSeedData = () => {
    showConfirm({
      title: 'Reset & Seed TopBrains Jira Database?',
      message: 'This will reset all data and create the Master Admin account (admin@topbrains.com / adminpassword123).',
      confirmText: 'Reset & Seed',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsSeeding(true);
          await projectsApi.seed();
          showToast({ message: 'TopBrains Jira seeded successfully!', type: 'success' });
          window.location.reload();
        } catch (err) {
          showToast({ message: 'Failed to seed database: ' + err.message, type: 'error' });
        } finally {
          setIsSeeding(false);
        }
      },
    });
  };

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--jira-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* 9-Dot App Switcher Icon */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsAppSwitcherOpen(!isAppSwitcherOpen);
              setIsProjectsMenuOpen(false);
              setIsNotificationsOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="jira-btn-ghost"
            style={{
              padding: '6px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isAppSwitcherOpen ? '#EBECF0' : 'transparent',
            }}
            title="TopBrains Suite Apps"
          >
            <Grid size={20} color="#5E6C84" />
          </button>

          <AppSwitcherDropdown
            isOpen={isAppSwitcherOpen}
            onClose={() => setIsAppSwitcherOpen(false)}
          />
        </div>

        {/* TopBrains Jira Logo */}
        <div
          onClick={() => setActiveTab('board')}
          style={{ cursor: 'pointer' }}
          title="TopBrains Jira - Home"
        >
          <TopBrainsLogo size={28} />
        </div>

        {/* Projects Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsProjectsMenuOpen(!isProjectsMenuOpen);
              setIsAppSwitcherOpen(false);
              setIsNotificationsOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="jira-btn jira-btn-ghost"
            style={{
              fontWeight: 600,
              color: '#172B4D',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: isProjectsMenuOpen ? '#EBECF0' : 'transparent',
            }}
          >
            Projects
            <ChevronDown size={15} color="#5E6C84" />
          </button>

          {isProjectsMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '260px',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--jira-border)',
                padding: '6px 0',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#5E6C84',
                  textTransform: 'uppercase',
                }}
              >
                Recent Projects
              </div>

              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => {
                    selectProject(proj);
                    setIsProjectsMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: currentProject?.id === proj.id ? '#EBECF0' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (currentProject?.id !== proj.id) e.currentTarget.style.backgroundColor = '#FAFBFC';
                  }}
                  onMouseLeave={(e) => {
                    if (currentProject?.id !== proj.id) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '3px',
                        backgroundColor: '#0052CC',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                    >
                      {proj.key[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#172B4D' }}>{proj.name}</div>
                      <div style={{ fontSize: '11px', color: '#5E6C84' }}>{proj.category || 'Software'} project</div>
                    </div>
                  </div>
                  {currentProject?.id === proj.id && <Check size={16} color="#0052CC" />}
                </div>
              ))}

              {isAdmin && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'var(--jira-border)', margin: '4px 0' }} />

                  <button
                    onClick={() => {
                      setIsProjectsMenuOpen(false);
                      setIsImportExportOpen(true);
                    }}
                    className="jira-btn jira-btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '13px', color: '#0052CC' }}
                  >
                    <Database size={15} />
                    <span>Import / Export Jira Data</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProjectsMenuOpen(false);
                      setIsCreateProjectOpen(true);
                    }}
                    className="jira-btn jira-btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '13px' }}
                  >
                    <Plus size={16} />
                    <span>Create project</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Filters Quick Dropdown */}
        <button
          onClick={() => setActiveTab('issues')}
          className="jira-btn jira-btn-ghost"
          style={{ fontWeight: 600, color: '#172B4D', fontSize: '14px' }}
        >
          Filters
        </button>

        {/* Dashboards Quick Tab */}
        <button
          onClick={() => setActiveTab('roadmap')}
          className="jira-btn jira-btn-ghost"
          style={{ fontWeight: 600, color: '#172B4D', fontSize: '14px' }}
        >
          Plans
        </button>

        {/* Universal Create Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="jira-btn jira-btn-primary"
          style={{ padding: '6px 12px', fontSize: '14px', marginLeft: '8px' }}
          title="Create Issue (Hotkey: c)"
        >
          <Plus size={16} />
          <span>Create</span>
        </button>
      </div>

      {/* Center Search bar */}
      <div style={{ position: 'relative', width: '280px' }}>
        <Search
          size={16}
          color="#7A869A"
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search issues, boards... (/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="jira-input"
          style={{
            paddingLeft: '32px',
            paddingRight: '32px',
            height: '32px',
            backgroundColor: '#FAFBFC',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Seed Data Button - Admin Only */}
        {isAdmin && (
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="jira-btn jira-btn-subtle"
            title="Reset database with TopBrains master admin & sample project"
            style={{ fontSize: '12px', padding: '5px 10px', color: '#0052CC', fontWeight: 600 }}
          >
            <Database size={15} />
            <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
          </button>
        )}

        {/* Notification Bell Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsAppSwitcherOpen(false);
              setIsProjectsMenuOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="jira-btn-ghost"
            style={{
              padding: '6px',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              backgroundColor: isNotificationsOpen ? '#EBECF0' : 'transparent',
            }}
            title="Notifications"
          >
            <Bell size={18} color="#5E6C84" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#FF5630',
                  border: '1.5px solid #FFFFFF',
                }}
              />
            )}
          </button>

          <NotificationsDrawer
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            onNotificationCountChange={setUnreadCount}
          />
        </div>

        {/* Help & Shortcuts Question Mark */}
        <button
          onClick={() => {
            setIsHelpOpen(true);
            setIsAppSwitcherOpen(false);
            setIsNotificationsOpen(false);
            setIsUserMenuOpen(false);
          }}
          className="jira-btn-ghost"
          style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
          title="Help & Shortcuts (Hotkey: ?)"
        >
          <HelpCircle size={18} color="#5E6C84" />
        </button>

        {/* Settings Gear Button - Admin Only */}
        {isAdmin && (
          <button
            onClick={() => {
              setIsSettingsOpen(true);
              setIsAppSwitcherOpen(false);
              setIsNotificationsOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="jira-btn-ghost"
            style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
            title="Project & Workspace Settings"
          >
            <Settings size={18} color="#5E6C84" />
          </button>
        )}

        {/* User Switcher / Profile */}
        <div style={{ position: 'relative', marginLeft: '6px' }}>
          <div
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsAppSwitcherOpen(false);
              setIsNotificationsOpen(false);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <Avatar user={currentUser} size="md" />
            <ChevronDown size={14} color="#5E6C84" />
          </div>

          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '250px',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--jira-border)',
                padding: '8px 0',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--jira-border)' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D' }}>{currentUser?.name}</div>
                <div style={{ fontSize: '12px', color: '#5E6C84' }}>{currentUser?.email}</div>
                <div
                  style={{
                    fontSize: '11px',
                    color: currentUser?.role === 'admin' ? '#6554C0' : '#0052CC',
                    marginTop: '2px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Role: {currentUser?.role}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 14px 4px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#5E6C84',
                  textTransform: 'uppercase',
                }}
              >
                Switch Active User
              </div>

              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    switchUser(u);
                    setIsUserMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: currentUser?.id === u.id ? '#EBECF0' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (currentUser?.id !== u.id) e.currentTarget.style.backgroundColor = '#FAFBFC';
                  }}
                  onMouseLeave={(e) => {
                    if (currentUser?.id !== u.id) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar user={u} size="sm" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#172B4D' }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: '#5E6C84' }}>{u.role}</div>
                    </div>
                  </div>
                  {currentUser?.id === u.id && <Check size={16} color="#0052CC" />}
                </div>
              ))}

              {/* Admin-only Team & Admins Management */}
              {currentUser?.role === 'admin' && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'var(--jira-border)', margin: '6px 0' }} />
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsUserManagementOpen(true);
                    }}
                    className="jira-btn jira-btn-ghost"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0052CC',
                      fontWeight: 600,
                    }}
                  >
                    <Users size={15} />
                    <span>Team & Admin Management</span>
                  </button>
                </>
              )}

              <div style={{ height: '1px', backgroundColor: 'var(--jira-border)', margin: '6px 0' }} />

              <button
                onClick={handleLogout}
                className="jira-btn jira-btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '13px',
                  color: '#FF5630',
                }}
              >
                <LogOut size={15} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Navbar Modals */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />

      <HelpShortcutsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <JiraImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
      />
    </header>
  );
};
