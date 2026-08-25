import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Kanban,
  ListTodo,
  CalendarRange,
  Table,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Users,
  Check,
  FolderPlus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { currentProject, projects, selectProject, activeTab, setActiveTab, setIsCreateProjectOpen } = useProject();
  const { currentOrg, canManageOrg, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const navItems = [
    { id: 'roadmap', label: 'Roadmap', icon: CalendarRange },
    { id: 'board', label: 'Active Board', icon: Kanban },
    { id: 'backlog', label: 'Backlog & Sprints', icon: ListTodo },
    { id: 'issues', label: 'All Issues', icon: Table },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: '#FAFBFC',
        borderRight: '1px solid #DFE1E6',
        height: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.2s cubic-bezier(0.2, 0, 0, 1)',
        position: 'sticky',
        top: '56px',
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* Top Part */}
      <div>
        {/* Project Switcher Header */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            style={{
              padding: collapsed ? '14px 8px' : '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderBottom: '1px solid var(--color-neutral-200)',
              cursor: 'pointer',
              userSelect: 'none',
              background: showProjectPicker ? '#EBECF0' : 'transparent',
              transition: 'background 0.15s ease',
            }}
            title="Click to switch or create projects"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <img
                src={
                  currentProject?.avatar_url ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${currentProject?.key || 'JIRA'}`
                }
                alt="Project Avatar"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-primary-100)',
                  flexShrink: 0,
                }}
              />
              {!collapsed && (
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--color-neutral-900)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={currentProject?.name}
                  >
                    {currentProject?.name || 'Select Project'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#0052CC', fontWeight: 600 }}>
                    {currentProject?.team_name ? `Team: ${currentProject.team_name}` : currentProject?.key || 'No Project'}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && <ChevronDown size={14} color="#5E6C84" style={{ flexShrink: 0 }} />}
          </div>

          {/* Project Dropdown Popover */}
          {showProjectPicker && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                onClick={() => setShowProjectPicker(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 8,
                  width: '260px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DFE1E6',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(9, 30, 66, 0.15)',
                  zIndex: 100,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#7A869A',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    letterSpacing: '0.04em',
                  }}
                >
                  Projects in {currentOrg?.name || 'Organization'}
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {projects.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: '12px', color: '#7A869A', textAlign: 'center' }}>
                      No projects found in this organization.
                    </div>
                  ) : (
                    projects.map((proj) => {
                      const isSelected = currentProject?.id === proj.id;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            selectProject(proj);
                            setShowProjectPicker(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            border: 'none',
                            background: isSelected ? '#DEEBFF' : 'transparent',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#F4F5F7';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <img
                            src={
                              proj.avatar_url ||
                              `https://api.dicebear.com/7.x/identicon/svg?seed=${proj.key || 'JIRA'}`
                            }
                            alt=""
                            style={{ width: '22px', height: '22px', borderRadius: '3px' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {proj.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#5E6C84' }}>
                              {proj.key} {proj.team_name ? `· ${proj.team_name}` : ''}
                            </div>
                          </div>
                          {isSelected && <Check size={14} color="#0052CC" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div style={{ borderTop: '1px solid #EBECF0', margin: '4px 0' }} />

                {/* Create Project Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectPicker(false);
                    setIsCreateProjectOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0052CC',
                    fontWeight: 600,
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#DEEBFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FolderPlus size={14} />
                  + Create New Project
                </button>

                {/* Manage Teams Link */}
                {canManageOrg?.() && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectPicker(false);
                      navigate('/admin');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#403294',
                      fontWeight: 600,
                      fontSize: '12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#EAE6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Users size={14} />
                    👥 Create & Manage Teams (Admin)
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '12px 8px' }}>
          {!collapsed && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-neutral-500)',
                textTransform: 'uppercase',
                padding: '4px 8px 8px 8px',
                letterSpacing: '0.04em',
              }}
            >
              Planning
            </div>
          )}

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: collapsed ? '10px 0' : '8px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--color-primary-50)' : 'transparent',
                    color: isActive ? 'var(--color-primary-600)' : 'var(--color-neutral-700)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={16} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Part */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--color-neutral-200)' }}>
        {!collapsed && (
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px',
              backgroundColor: '#DEEBFF',
              color: '#0052CC',
              border: '1px solid #B3D4FF',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B3D4FF')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DEEBFF')}
          >
            <Plus size={14} />
            Create Project
          </button>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--color-neutral-600)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
