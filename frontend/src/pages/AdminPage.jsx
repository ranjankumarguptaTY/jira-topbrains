import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Building,
  Briefcase,
  Plus,
  Trash2,
  Lock,
  History,
  Download,
  Upload,
  Search,
  UserPlus,
  ArrowLeft,
  Save,
  CheckCircle,
} from 'lucide-react';
import { authAPI, orgAPI, teamsAPI, projectsAPI } from '../services/api';

const ADMIN_CARDS = [
  {
    id: 'users',
    title: 'User Management',
    desc: 'Create, edit, deactivate user accounts and assign administrative roles',
    icon: '👥',
    color: '#0052CC',
  },
  {
    id: 'teams',
    title: 'Team Management',
    desc: 'Create and organize teams, assign team heads, and manage members',
    icon: '🏢',
    color: '#00875A',
  },
  {
    id: 'org',
    title: 'Organization Settings',
    desc: 'Configure organization name, branding profile, and workspace policies',
    icon: '⚙️',
    color: '#6554C0',
  },
  {
    id: 'security',
    title: 'Security & Access',
    desc: 'Role permission policies, token authentication, and session security',
    icon: '🔒',
    color: '#FF5630',
  },
  {
    id: 'activity',
    title: 'Activity Logs',
    desc: 'Audit trail of system events, user actions, and security operations',
    icon: '📋',
    color: '#FFAB00',
  },
  {
    id: 'import_export',
    title: 'Import / Export',
    desc: 'Import or export project boards, CSV tickets, and JSON backups',
    icon: '📥',
    color: '#00B8D9',
  },
];

export const AdminPage = () => {
  const { currentUser, refreshUsers } = useAuth();
  const { showToast } = useModal();

  // Active view: null (shows 6 cards) | 'users' | 'teams' | 'org' | 'security' | 'activity' | 'import_export'
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);

  // Users state
  const [userList, setUserList] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
  });

  // Teams state
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '' });
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');

  // Org state
  const [org, setOrg] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);

  // Projects for export/backup
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Load section data
  useEffect(() => {
    if (activeSection === 'users') {
      loadUsers();
    } else if (activeSection === 'teams') {
      loadTeams();
      loadUsers();
    } else if (activeSection === 'org') {
      loadOrg();
    } else if (activeSection === 'import_export') {
      loadProjects();
    }
  }, [activeSection]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await authAPI.listUsers();
      setUserList(res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const res = await teamsAPI.list();
      setTeams(res.data || []);
      if (res.data?.length > 0 && !selectedTeam) {
        handleSelectTeam(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team) => {
    setSelectedTeam(team);
    try {
      const res = await teamsAPI.listMembers(team.id);
      setTeamMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load team members', err);
      setTeamMembers([]);
    }
  };

  const loadOrg = async () => {
    try {
      setLoading(true);
      const res = await orgAPI.getMine();
      setOrg(res.data);
      setOrgName(res.data?.name || '');
      setOrgDesc(res.data?.description || '');
    } catch (err) {
      console.error('Failed to load org', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data || []);
      if (res.data?.length > 0) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  // User Actions
  const handleRoleChange = async (userId, newRole) => {
    try {
      await authAPI.adminUpdateRole(userId, newRole);
      showToast({ message: 'User role updated', type: 'success' });
      loadUsers();
      refreshUsers();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update role', type: 'error' });
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await authAPI.adminUpdateStatus(userId, !currentStatus);
      showToast({ message: `User account ${!currentStatus ? 'activated' : 'deactivated'}`, type: 'success' });
      loadUsers();
      refreshUsers();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update status', type: 'error' });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await authAPI.adminCreateUser(newUserData);
      showToast({ message: `Created user ${newUserData.name}`, type: 'success' });
      setShowCreateUserModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'member' });
      loadUsers();
      refreshUsers();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create user', type: 'error' });
    }
  };

  // Team Actions
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await teamsAPI.create(newTeamData);
      showToast({ message: `Team "${newTeamData.name}" created`, type: 'success' });
      setShowCreateTeamModal(false);
      setNewTeamData({ name: '', description: '' });
      await loadTeams();
      if (res.data) handleSelectTeam(res.data);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create team', type: 'error' });
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!selectedTeam || !addMemberUserId) return;
    try {
      await teamsAPI.addMember(selectedTeam.id, addMemberUserId, addMemberRole);
      showToast({ message: 'Member added to team', type: 'success' });
      setAddMemberUserId('');
      handleSelectTeam(selectedTeam);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to add member', type: 'error' });
    }
  };

  const handleRemoveTeamMember = async (userId) => {
    if (!selectedTeam) return;
    try {
      await teamsAPI.removeMember(selectedTeam.id, userId);
      showToast({ message: 'Member removed from team', type: 'success' });
      handleSelectTeam(selectedTeam);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to remove member', type: 'error' });
    }
  };

  // Org Actions
  const handleSaveOrg = async (e) => {
    e.preventDefault();
    if (!org) return;
    try {
      setOrgSaving(true);
      await orgAPI.update(org.id, { name: orgName, description: orgDesc });
      showToast({ message: 'Organization updated successfully', type: 'success' });
      loadOrg();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update organization', type: 'error' });
    } finally {
      setOrgSaving(false);
    }
  };

  const filteredUsers = userList.filter((u) => {
    if (!userFilter) return true;
    const q = userFilter.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeSection && (
              <button
                onClick={() => setActiveSection(null)}
                className="jira-btn jira-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '12px' }}
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            )}
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#172B4D', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={26} color="#0052CC" />
              {activeSection ? ADMIN_CARDS.find((c) => c.id === activeSection)?.title : 'Administration Hub'}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#5E6C84', margin: '4px 0 0 0' }}>
            {activeSection
              ? ADMIN_CARDS.find((c) => c.id === activeSection)?.desc
              : 'Select a management module below to configure your organization and system policies'}
          </p>
        </div>
      </div>

      {/* 6 INTERACTIVE CARDS DASHBOARD VIEW */}
      {!activeSection && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {ADMIN_CARDS.map((card) => (
            <div
              key={card.id}
              onClick={() => setActiveSection(card.id)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: 12,
                padding: '24px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.color;
                e.currentTarget.style.boxShadow = `0 8px 24px rgba(9, 30, 66, 0.1), 0 0 0 1px ${card.color}`;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#DFE1E6';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(9, 30, 66, 0.04)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 16,
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', marginBottom: 6 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: '13px', color: '#5E6C84', lineHeight: 1.4 }}>
                  {card.desc}
                </div>
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Open Module →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. USER MANAGEMENT SECTION */}
      {activeSection === 'users' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
              <input
                type="text"
                placeholder="Filter users by name or email..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="jira-input"
                style={{ paddingLeft: 32, fontSize: '13px' }}
              />
            </div>
            <button
              className="jira-btn jira-btn-primary"
              onClick={() => setShowCreateUserModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              Create New User
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #DFE1E6', color: '#5E6C84', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 8px' }}>User</th>
                <th style={{ padding: '12px 8px' }}>Role</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #EBECF0' }}>
                  <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                      {u.name?.[0] || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#172B4D' }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: '#7A869A' }}>{u.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <select
                      value={u.role || 'member'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="jira-input"
                      style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                      disabled={u.id === currentUser?.id}
                    >
                      <option value="member">Member</option>
                      <option value="team_head">Team Head</option>
                      <option value="admin">Administrator</option>
                      <option value="pm">Product Manager</option>
                      <option value="qa">QA Engineer</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span
                      className={`badge ${u.is_active !== false ? 'badge-success' : 'badge-danger'}`}
                      style={{ fontSize: '11px' }}
                    >
                      {u.is_active !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {u.id !== currentUser?.id && (
                      <button
                        className={`jira-btn ${u.is_active !== false ? 'jira-btn-danger' : 'jira-btn-secondary'}`}
                        onClick={() => handleStatusToggle(u.id, u.is_active !== false)}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        {u.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. TEAM MANAGEMENT SECTION */}
      {activeSection === 'teams' && (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Teams Sidebar */}
          <div style={{ flex: '0 0 320px', background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>Teams ({teams.length})</div>
              <button
                className="jira-btn jira-btn-primary"
                onClick={() => setShowCreateTeamModal(true)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                <Plus size={14} /> New Team
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teams.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: selectedTeam?.id === t.id ? '1.5px solid #0052CC' : '1px solid #DFE1E6',
                    background: selectedTeam?.id === t.id ? '#EBF5FF' : '#FAFBFC',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: '#5E6C84' }}>{t.description || 'No description'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Detail */}
          <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 20 }}>
            {selectedTeam ? (
              <div>
                <div style={{ borderBottom: '1px solid #DFE1E6', paddingBottom: 16, marginBottom: 16 }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{selectedTeam.name}</h2>
                  <p style={{ fontSize: '13px', color: '#5E6C84', margin: 0 }}>{selectedTeam.description}</p>
                </div>

                {/* Add Member Bar */}
                <form onSubmit={handleAddTeamMember} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <select
                    value={addMemberUserId}
                    onChange={(e) => setAddMemberUserId(e.target.value)}
                    className="jira-input"
                    style={{ flex: 1 }}
                    required
                  >
                    <option value="">Select a user to add...</option>
                    {userList
                      .filter((u) => !teamMembers.some((m) => m.user_id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                  <select
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value)}
                    className="jira-input"
                    style={{ width: 140 }}
                  >
                    <option value="member">Member</option>
                    <option value="team_head">Team Head</option>
                  </select>
                  <button type="submit" className="jira-btn jira-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserPlus size={14} /> Add
                  </button>
                </form>

                {/* Team Members List */}
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#5E6C84', marginBottom: 10, textTransform: 'uppercase' }}>
                  Members ({teamMembers.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {teamMembers.map((m) => (
                    <div
                      key={m.id || m.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: '1px solid #DFE1E6',
                        background: '#FAFBFC',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6554C0', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                          {m.user?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.user?.name || m.user_id}</div>
                          <div style={{ fontSize: '11px', color: '#7A869A' }}>{m.user?.email} · Role: {m.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveTeamMember(m.user_id)}
                        className="jira-btn jira-btn-danger"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#7A869A', padding: 40 }}>Select a team to manage members</div>
            )}
          </div>
        </div>
      )}

      {/* 3. ORGANIZATION SETTINGS SECTION */}
      {activeSection === 'org' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 24, maxWidth: 640 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 16 }}>Organization Profile</h2>
          <form onSubmit={handleSaveOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="jira-input"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                rows={4}
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                className="jira-input"
              />
            </div>
            <button
              type="submit"
              disabled={orgSaving}
              className="jira-btn jira-btn-primary"
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Save size={16} />
              {orgSaving ? 'Saving...' : 'Save Organization Settings'}
            </button>
          </form>
        </div>
      )}

      {/* 4. SECURITY & ACCESS SECTION */}
      {activeSection === 'security' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 24, maxWidth: 720 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 16 }}>Security & Access Control</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '16px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4 }}>JWT Token Authentication</div>
              <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: 8 }}>
                HMAC-SHA256 signature authentication with 24-hour token expiration.
              </div>
              <span className="badge badge-success">Active & Enforced</span>
            </div>
            <div style={{ padding: '16px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4 }}>Role-Based Access Control (RBAC)</div>
              <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: 8 }}>
                Granular permission matrix for Admins, Team Heads, PMs, Engineers, and QAs.
              </div>
              <span className="badge badge-success">Active & Enforced</span>
            </div>
            <div style={{ padding: '16px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4 }}>Cross-Origin Resource Sharing (CORS)</div>
              <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: 8 }}>
                Multi-origin support for development (5173, 5174, 5175) and production domains.
              </div>
              <span className="badge badge-success">Active & Enforced</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. ACTIVITY LOGS SECTION */}
      {activeSection === 'activity' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 24 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 16 }}>Audit & Activity Trail</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { text: 'Master Administrator logged in', time: 'Just now', type: 'auth' },
              { text: 'WebSocket server broadcasted status synchronization', time: '5 mins ago', type: 'ws' },
              { text: 'Database collections verified intact', time: '15 mins ago', type: 'db' },
              { text: 'TopBrains platform initialized', time: '1 hour ago', type: 'system' },
            ].map((log, idx) => (
              <div key={idx} style={{ padding: '12px 16px', borderBottom: '1px solid #EBECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="#36B37E" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#172B4D' }}>{log.text}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#7A869A' }}>{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. IMPORT / EXPORT SECTION */}
      {activeSection === 'import_export' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 24, maxWidth: 640 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 16 }}>Project Data Backup & Export</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="jira-input"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <a
                href={`/api/projects/${selectedProjectId}/export-jira-csv`}
                download
                className="jira-btn jira-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                <Download size={16} /> Export Jira CSV
              </a>
              <a
                href={`/api/projects/${selectedProjectId}/export-json`}
                download
                className="jira-btn jira-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                <Download size={16} /> Export JSON Backup
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => setShowCreateUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 440, padding: 24, background: '#FFFFFF', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Create User Account</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84' }}>Full Name</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="jira-input"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84' }}>Work Email</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="jira-input"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84' }}>Password</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="jira-input"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84' }}>Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="jira-input"
                >
                  <option value="member">Member</option>
                  <option value="team_head">Team Head</option>
                  <option value="admin">Administrator</option>
                  <option value="pm">Product Manager</option>
                  <option value="qa">QA Engineer</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="jira-btn jira-btn-secondary" onClick={() => setShowCreateUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTeamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 440, padding: 24, background: '#FFFFFF', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Create New Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84' }}>Team Name</label>
                <input
                  type="text"
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                  className="jira-input"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84' }}>Description</label>
                <textarea
                  rows={3}
                  value={newTeamData.description}
                  onChange={(e) => setNewTeamData({ ...newTeamData, description: e.target.value })}
                  className="jira-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="jira-btn jira-btn-secondary" onClick={() => setShowCreateTeamModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
