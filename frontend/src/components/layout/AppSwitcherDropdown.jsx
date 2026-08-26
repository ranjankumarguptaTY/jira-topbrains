import React from 'react';
import {
  FolderKanban,
  FileText,
  GitBranch,
  Compass,
  LifeBuoy,
  Activity,
  ExternalLink,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

const SPRINTR_APPS = [
  {
    id: 'jira',
    name: 'Sprintr Agile',
    description: 'Agile project management & sprint tracking',
    icon: FolderKanban,
    color: '#0052CC',
    bg: '#DEEBFF',
    active: true,
  },
  {
    id: 'confluence',
    name: 'Sprintr Docs',
    description: 'Team workspaces & documentation',
    icon: FileText,
    color: '#006644',
    bg: '#E3FCEF',
    active: false,
  },
  {
    id: 'bitbucket',
    name: 'Sprintr Code',
    description: 'Code repositories & CI/CD pipelines',
    icon: GitBranch,
    color: '#2684FF',
    bg: '#DEEBFF',
    active: false,
  },
  {
    id: 'compass',
    name: 'Sprintr Architecture',
    description: 'Developer architecture & component catalog',
    icon: Compass,
    color: '#6554C0',
    bg: '#EAE6FF',
    active: false,
  },
  {
    id: 'servicedesk',
    name: 'Sprintr Service Desk',
    description: 'Customer service & incident management',
    icon: LifeBuoy,
    color: '#FF7452',
    bg: '#FFEBE6',
    active: false,
  },
  {
    id: 'statuspage',
    name: 'Sprintr Status',
    description: 'Real-time uptime & incident communication',
    icon: Activity,
    color: '#36B37E',
    bg: '#E3FCEF',
    active: false,
  },
];

export const AppSwitcherDropdown = ({ isOpen, onClose }) => {
  const { currentProject, setActiveTab } = useProject();

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '48px',
        left: '12px',
        width: '340px',
        backgroundColor: '#FFFFFF',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid #DFE1E6',
        padding: '16px',
        zIndex: 1000,
        animation: 'slideUp 0.15s ease-out',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#5E6C84',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Sparkles size={13} color="#0052CC" />
        <span>Sprintr Cloud Platform</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {SPRINTR_APPS.map((app) => {
          const Icon = app.icon;
          return (
            <div
              key={app.id}
              onClick={() => {
                if (app.id === 'jira') {
                  setActiveTab('board');
                  onClose();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: app.active ? '#F4F5F7' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!app.active) e.currentTarget.style.backgroundColor = '#FAFBFC';
              }}
              onMouseLeave={(e) => {
                if (!app.active) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: app.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: app.color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D' }}>{app.name}</span>
                  {app.active && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#DEEBFF',
                        color: '#0052CC',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: '2px', lineHeight: '1.3' }}>
                  {app.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: '1px', backgroundColor: '#EBECF0', margin: '12px 0 8px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: '12px',
            color: '#0052CC',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>FastAPI Backend Docs</span>
          <ExternalLink size={12} />
        </a>

        <span style={{ fontSize: '11px', color: '#7A869A' }}>v2.4 Pro</span>
      </div>
    </div>
  );
};
