import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Database,
  Sparkles
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useModal } from '../../context/ModalContext';
import { projectsApi } from '../../api/projects';

export const JiraImportExportModal = ({ isOpen, onClose }) => {
  const { currentProject, refreshBoard, loadSprints } = useProject();
  const { showToast } = useModal();

  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !currentProject) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !currentProject) return;

    try {
      setIsUploading(true);
      const res = await projectsApi.importJiraData(currentProject.id, selectedFile);
      setImportResult(res);
      await loadSprints(currentProject.id);
      refreshBoard();
      showToast({
        message: `Imported ${res.imported_issues_count} Jira issues into ${currentProject.name}!`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: 'Import failed: ' + (err.response?.data?.detail || err.message),
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      'Issue Type,Summary,Description,Status,Priority,Story Points,Sprint,Labels\n' +
      'Story,Implement OAuth2 PKCE authorization,Secure Single-Page Apps using Proof Key for Code Exchange,In Progress,Highest,5,Sprint 1,auth;security\n' +
      'Task,Configure Redis session cache,Setup Redis cluster for session invalidation,To Do,High,3,Sprint 1,redis;backend\n' +
      'Bug,Fix memory leak in board cards,Unmounted DOM nodes during drag and drop,To Do,Highest,2,Sprint 2,bug;performance\n' +
      'Story,Design dark mode contrast theme,Audit WCAG 2.1 contrast compliance,Done,Medium,3,Sprint 1,ui;a11y\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Jira_Import_Sample_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '640px', maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
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
            <FileSpreadsheet size={20} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Jira Data Migration & Exchange
            </h2>
          </div>
          <button onClick={onClose} className="jira-btn jira-btn-ghost" style={{ padding: '6px' }}>
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #DFE1E6', backgroundColor: '#FAFBFC' }}>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'import' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'import' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'import' ? 700 : 500,
              color: activeTab === 'import' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={16} />
            <span>Import from Actual Jira</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'export' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'export' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'export' ? 700 : 500,
              color: activeTab === 'export' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={16} />
            <span>Export Project Data</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'import' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: '#5E6C84', lineHeight: '1.4' }}>
                Upload any official <strong>Atlassian Jira CSV Export</strong> or <strong>JSON Backup</strong> from
                your Jira Cloud or Jira Server projects. It will automatically populate your project, create sprints,
                and map story points, statuses, and labels.
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #0052CC',
                  borderRadius: '8px',
                  backgroundColor: '#F4F5F7',
                  padding: '28px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EBECF0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#DEEBFF',
                    color: '#0052CC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                  }}
                >
                  <Upload size={20} />
                </div>

                <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D' }}>
                  {selectedFile ? selectedFile.name : 'Choose a Jira CSV or JSON file'}
                </div>
                <div style={{ fontSize: '12px', color: '#7A869A', marginTop: '4px' }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB · Ready to import`
                    : 'Click or drag & drop exported Jira file here'}
                </div>
              </div>

              {/* Target Project Info */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FAFBFC',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#5E6C84' }}>Target Destination Project:</span>
                <span style={{ fontWeight: 700, color: '#0052CC' }}>
                  {currentProject.name} ({currentProject.key})
                </span>
              </div>

              {/* Import Result Feedback */}
              {importResult && (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#E3FCEF',
                    borderRadius: '6px',
                    border: '1px solid #ABF5D1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <CheckCircle2 size={20} color="#006644" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#006644' }}>
                      {importResult.message}
                    </div>
                    <div style={{ fontSize: '12px', color: '#006644', marginTop: '2px' }}>
                      Created {importResult.created_sprints_count} sprint(s). Last generated key:{' '}
                      <strong>{importResult.last_issue_key}</strong>.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="jira-btn jira-btn-ghost"
                  style={{ fontSize: '12px', color: '#0052CC' }}
                >
                  <FileText size={14} />
                  <span>Download Sample Jira CSV</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={onClose} className="jira-btn jira-btn-ghost">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!selectedFile || isUploading}
                    className="jira-btn jira-btn-primary"
                  >
                    {isUploading ? 'Importing Issues...' : 'Import into Workspace'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Export Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>
                Export your current project issues, sprints, and task progress in official Jira CSV or JSON backup
                format.
              </div>

              {/* CSV Export Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FAFBFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                    Export as Jira-Compatible CSV
                  </div>
                  <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                    Standard CSV spreadsheet compatible with Excel, Google Sheets, and Atlassian Jira Importer.
                  </div>
                </div>

                <a
                  href={`http://127.0.0.1:8000/api/projects/${currentProject.id}/export-jira-csv`}
                  download
                  className="jira-btn jira-btn-primary"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={15} />
                  <span>Export CSV</span>
                </a>
              </div>

              {/* JSON Backup Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FAFBFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                    Full Project JSON Backup
                  </div>
                  <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                    Includes project metadata, sprints, issues, and audit configurations.
                  </div>
                </div>

                <a
                  href={`http://127.0.0.1:8000/api/projects/${currentProject.id}/export-json`}
                  download
                  className="jira-btn jira-btn-subtle"
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#0052CC',
                    borderColor: '#C1C7D0',
                  }}
                >
                  <Database size={15} />
                  <span>Download JSON</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
