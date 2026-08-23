import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Keyboard,
  BookOpen,
  Terminal,
  ExternalLink,
  Zap,
  CheckCircle2
} from 'lucide-react';

const KEYBOARD_SHORTCUTS = [
  { key: 'c', desc: 'Create a new issue modal from anywhere', category: 'Actions' },
  { key: '/', desc: 'Quickly focus project search input', category: 'Navigation' },
  { key: 'k', desc: 'Switch to Active Kanban Board', category: 'Navigation' },
  { key: 'b', desc: 'Switch to Sprint & Backlog View', category: 'Navigation' },
  { key: 'r', desc: 'Switch to Roadmap Timeline View', category: 'Navigation' },
  { key: 'i', desc: 'Switch to All Issues Table View', category: 'Navigation' },
  { key: '?', desc: 'Open this Help & Shortcuts reference', category: 'General' },
  { key: 'Esc', desc: 'Close open dialogs, modals, and drawers', category: 'General' },
];

export const HelpShortcutsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shortcuts'); // 'shortcuts' | 'guide' | 'api'

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '600px', maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={20} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              TopBrains Jira Help & Shortcuts
            </h2>
          </div>
          <button onClick={onClose} className="jira-btn jira-btn-ghost" style={{ padding: '6px' }}>
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #DFE1E6', backgroundColor: '#FAFBFC' }}>
          <button
            onClick={() => setActiveTab('shortcuts')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'shortcuts' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'shortcuts' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'shortcuts' ? 700 : 500,
              color: activeTab === 'shortcuts' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Keyboard size={16} />
            <span>Keyboard Shortcuts</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'guide' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'guide' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'guide' ? 700 : 500,
              color: activeTab === 'guide' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BookOpen size={16} />
            <span>Agile Quick Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'api' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'api' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'api' ? 700 : 500,
              color: activeTab === 'api' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Terminal size={16} />
            <span>API & Architecture</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'shortcuts' && (
            <div>
              <div style={{ fontSize: '13px', color: '#5E6C84', marginBottom: '14px' }}>
                Use these hotkeys anywhere in TopBrains Jira to accelerate your workflow:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {KEYBOARD_SHORTCUTS.map((sc) => (
                  <div
                    key={sc.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#FAFBFC',
                      border: '1px solid #DFE1E6',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#172B4D', fontWeight: 500 }}>{sc.desc}</span>
                    <kbd
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #C1C7D0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#172B4D',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        minWidth: '28px',
                        textAlign: 'center',
                      }}
                    >
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#DEEBFF', padding: '14px', borderRadius: '6px', border: '1px solid #B3D4FF' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0747A6', marginBottom: '4px' }}>
                  🎯 Scrum vs Kanban in TopBrains Jira
                </div>
                <div style={{ fontSize: '12px', color: '#172B4D', lineHeight: '1.4' }}>
                  Use the <strong>Backlog</strong> to plan upcoming iterations into 1 to 4-week timeboxes (Sprints). When
                  you click <strong>Start Sprint</strong>, tickets flow onto the interactive <strong>Active Board</strong>{' '}
                  for real-time drag-and-drop tracking.
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#172B4D' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Story Points & Estimation</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6', fontSize: '13px', color: '#5E6C84' }}>
                  <li><strong>1-2 Points:</strong> Trivial or quick tasks (e.g. bug fix, copy adjustment)</li>
                  <li><strong>3-5 Points:</strong> Standard features with moderate complexity</li>
                  <li><strong>8+ Points:</strong> Large user stories that should be broken down with subtasks</li>
                </ul>
              </div>

              <div style={{ fontSize: '13px', color: '#172B4D' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Sub-tasks & Progress Bars</h4>
                <div style={{ fontSize: '13px', color: '#5E6C84', lineHeight: '1.4' }}>
                  Open any Story or Bug to add subtasks. Checking off subtasks automatically fills the visual progress
                  bar on cards and in the audit activity log.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>
                TopBrains Jira is powered by a high-performance Python FastAPI backend and Motor async MongoDB.
              </div>

              <div
                style={{
                  backgroundColor: '#F4F5F7',
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                }}
              >
                <div><strong>FastAPI Base URL:</strong> http://127.0.0.1:8000</div>
                <div><strong>MongoDB Port:</strong> 27017 (Database: jira_clone_db)</div>
                <div><strong>Interactive Swagger UI:</strong> http://127.0.0.1:8000/docs</div>
              </div>

              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="jira-btn jira-btn-primary"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Open FastAPI Swagger Documentation</span>
                <ExternalLink size={15} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
