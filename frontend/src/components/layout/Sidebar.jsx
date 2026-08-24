import React, { useState } from 'react';
import {
  Kanban,
  ListTodo,
  CalendarRange,
  Table,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  FolderGit2
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const Sidebar = () => {
  const { currentProject, activeTab, setActiveTab } = useProject();
  const [collapsed, setCollapsed] = useState(false);

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
        backgroundColor: 'var(--color-neutral-50)',
        borderRight: '1px solid var(--color-neutral-200)',
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
        {/* Project Header */}
        <div
          style={{
            padding: collapsed ? '16px 8px' : '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--color-neutral-200)',
          }}
        >
          <img
            src={
              currentProject?.avatar_url ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${currentProject?.key || 'JIRA'}`
            }
            alt="Project Avatar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-primary-100)',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--color-neutral-900)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={currentProject?.name}
              >
                {currentProject?.name || 'Jira Project'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                {currentProject?.category || 'Software project'}
              </div>
            </div>
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
                  <Icon size={18} color={isActive ? 'var(--color-primary-500)' : 'var(--color-neutral-500)'} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-neutral-200)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="jira-btn jira-btn-ghost"
          style={{
            width: '100%',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-neutral-500)',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && <span>Collapse sidebar</span>}
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
