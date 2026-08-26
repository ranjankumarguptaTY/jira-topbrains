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
  FolderKanban,
  Crown,
  UserCheck,
  Tag,
  X,
  Key,
  KeyRound,
} from 'lucide-react';
import { authAPI, orgAPI, teamsAPI, projectsAPI, migrateAPI } from '../services/api';

const ALL_ROLES = [
  { id: 'admin', label: 'Org Admin', desc: 'Can manage all teams, users, and projects in org' },
  { id: 'lead', label: 'Team Lead', desc: 'Can manage team projects, members, and team channels' },
  { id: 'engineer', label: 'Software Engineer', desc: 'Can work on tickets and participate in chats' },
  { id: 'tester', label: 'QA / Tester', desc: 'Can test tickets and report bugs' },
  { id: 'pm', label: 'Product Manager', desc: 'Can manage backlogs and roadmap' },
  { id: 'member', label: 'Member', desc: 'Standard team contributor' },
];

export const AdminPage = () => {
  const { currentUser, refreshUsers, currentOrg, userOrgs, fetchOrgs, isSuperAdmin, isOrgAdmin, canManageOrg } = useAuth();
  const { showToast, showConfirm } = useModal();

  // Active view: null (shows cards) | 'orgs' | 'org_members' | 'teams' | 'users' | 'org_settings' | 'security' | 'activity' | 'import_export'
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);

  // Selected Org for scoped management
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [organizations, setOrganizations] = useState([]);

  // Org creation
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgData, setNewOrgData] = useState({ name: '', description: '', admin_user_id: '' });
  const [orgAdminSearchQuery, setOrgAdminSearchQuery] = useState('');
  const [searchedOrgAdminUsers, setSearchedOrgAdminUsers] = useState([]);
  const [searchingOrgAdminUsers, setSearchingOrgAdminUsers] = useState(false);
  const [selectedOrgAdminUser, setSelectedOrgAdminUser] = useState(null);

  // Org Members state
  const [orgMembers, setOrgMembers] = useState([]);
  const [orgMemberFilter, setOrgMemberFilter] = useState('');
  const [showAddOrgMemberModal, setShowAddOrgMemberModal] = useState(false);
  const [addOrgMemberUserId, setAddOrgMemberUserId] = useState('');
  const [addOrgMemberRoles, setAddOrgMemberRoles] = useState(['member']);
  const [editingMember, setEditingMember] = useState(null);

  // Org Roles state
  const [orgRolesList, setOrgRolesList] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ id: '', name: '', description: '', color: '#0052CC' });
  const [editingRole, setEditingRole] = useState(null);

  // Users state (Platform-wide)
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
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '', lead_user_id: '' });
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');

  // Org settings state
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);

  // Projects for export/backup
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Migration status
  const [migrationRunning, setMigrationRunning] = useState(false);

  // Set default selected org from currentOrg or first available org
  useEffect(() => {
    if (currentOrg?.id && !selectedOrgId) {
      setSelectedOrgId(currentOrg.id);
    }
  }, [currentOrg, selectedOrgId]);

  // Load organizations on mount
  useEffect(() => {
    loadOrgs();
  }, []);

  // Debounced search for Org Admin user selection in Create Org Modal (min 3 chars, max 10 results)
  useEffect(() => {
    const query = orgAdminSearchQuery.trim();
    if (query.length < 3) {
      setSearchedOrgAdminUsers([]);
      setSearchingOrgAdminUsers(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingOrgAdminUsers(true);
        const res = await authAPI.searchUsers(query, null, 10, true);
        setSearchedOrgAdminUsers(res.data || []);
      } catch (err) {
        console.error('Failed to search users for org admin', err);
        setSearchedOrgAdminUsers([]);
      } finally {
        setSearchingOrgAdminUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [orgAdminSearchQuery]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.list();
      setOrganizations(res.data || []);
      if (res.data?.length > 0 && !selectedOrgId) {
        setSelectedOrgId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  // Load section data when activeSection or selectedOrgId changes
  useEffect(() => {
    if (activeSection === 'orgs') {
      loadOrgs();
    } else if (activeSection === 'org_members') {
      loadOrgMembers(selectedOrgId);
      loadOrgRoles(selectedOrgId);
      loadAllUsers();
    } else if (activeSection === 'teams') {
      loadTeams(selectedOrgId);
      loadOrgMembers(selectedOrgId);
    } else if (activeSection === 'org_roles') {
      loadOrgRoles(selectedOrgId);
      loadOrgMembers(selectedOrgId);
    } else if (activeSection === 'users') {
      loadAllUsers();
    } else if (activeSection === 'org_settings') {
      loadOrgSettings(selectedOrgId);
    } else if (activeSection === 'import_export') {
      loadProjects();
    }
  }, [activeSection, selectedOrgId]);

  const loadOrgRoles = async (orgId) => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await orgAPI.listRoles(orgId);
      setOrgRolesList(res.data || []);
    } catch (err) {
      console.error('Failed to load org roles', err);
      setOrgRolesList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
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

  const loadOrgMembers = async (orgId) => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await orgAPI.listMembers(orgId);
      setOrgMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load org members', err);
      setOrgMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async (orgId) => {
    try {
      setLoading(true);
      const res = await teamsAPI.list(orgId);
      setTeams(res.data || []);
      if (res.data?.length > 0) {
        handleSelectTeam(res.data[0]);
      } else {
        setSelectedTeam(null);
        setTeamMembers([]);
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

  const loadOrgSettings = async (orgId) => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await orgAPI.get(orgId);
      setOrgName(res.data?.name || '');
      setOrgDesc(res.data?.description || '');
    } catch (err) {
      console.error('Failed to load org settings', err);
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

  // =============================================
  // ORG ACTIONS
  // =============================================
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await orgAPI.create(newOrgData);
      showToast({ message: `Organization "${newOrgData.name}" created!`, type: 'success' });
      setShowCreateOrgModal(false);
      setNewOrgData({ name: '', description: '', admin_user_id: '' });
      setOrgAdminSearchQuery('');
      setSearchedOrgAdminUsers([]);
      setSelectedOrgAdminUser(null);
      await loadOrgs();
      if (res.data) {
        setSelectedOrgId(res.data.id);
      }
      fetchOrgs();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create organization', type: 'error' });
    }
  };

  const handleDeleteOrg = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete this organization? All teams, projects, and broadcast channels will be permanently removed.')) {
      return;
    }
    try {
      await orgAPI.delete(orgId);
      showToast({ message: 'Organization deleted', type: 'success' });
      await loadOrgs();
      fetchOrgs();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to delete organization', type: 'error' });
    }
  };

  const handleSaveOrgSettings = async (e) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    try {
      setOrgSaving(true);
      await orgAPI.update(selectedOrgId, { name: orgName, description: orgDesc });
      showToast({ message: 'Organization updated successfully', type: 'success' });
      loadOrgs();
      fetchOrgs();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update organization', type: 'error' });
    } finally {
      setOrgSaving(false);
    }
  };

  // =============================================
  // ORG MEMBERS ACTIONS
  // =============================================
  const handleAddOrgMember = async (e) => {
    e.preventDefault();
    if (!selectedOrgId || !addOrgMemberUserId) return;
    try {
      await orgAPI.addMember(selectedOrgId, addOrgMemberUserId, addOrgMemberRoles);
      showToast({ message: 'User added to organization', type: 'success' });
      setShowAddOrgMemberModal(false);
      setAddOrgMemberUserId('');
      setAddOrgMemberRoles(['member']);
      loadOrgMembers(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to add user to org', type: 'error' });
    }
  };

  const handleUpdateMemberRoles = async (userId, roles) => {
    if (!selectedOrgId) return;
    try {
      await orgAPI.updateMemberRoles(selectedOrgId, userId, roles);
      showToast({ message: 'Member roles updated', type: 'success' });
      setEditingMember(null);
      loadOrgMembers(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update roles', type: 'error' });
    }
  };

  const handleRemoveOrgMember = async (userId) => {
    if (!selectedOrgId) return;
    if (!window.confirm('Remove this user from the organization? They will also be removed from all teams and projects.')) return;
    try {
      await orgAPI.removeMember(selectedOrgId, userId);
      showToast({ message: 'User removed from organization', type: 'success' });
      loadOrgMembers(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to remove member', type: 'error' });
    }
  };

  // =============================================
  // ORG CUSTOM ROLES ACTIONS
  // =============================================
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!selectedOrgId || !newRoleData.name.trim()) return;
    try {
      await orgAPI.createRole(selectedOrgId, {
        id: newRoleData.id.trim() || undefined,
        name: newRoleData.name.trim(),
        description: newRoleData.description.trim(),
        color: newRoleData.color,
      });
      showToast({ message: `Role "${newRoleData.name}" created successfully!`, type: 'success' });
      setShowCreateRoleModal(false);
      setNewRoleData({ id: '', name: '', description: '', color: '#0052CC' });
      loadOrgRoles(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create role', type: 'error' });
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedOrgId || !editingRole) return;
    try {
      await orgAPI.updateRole(selectedOrgId, editingRole.id, {
        name: editingRole.name.trim(),
        description: editingRole.description.trim(),
        color: editingRole.color,
      });
      showToast({ message: `Role "${editingRole.name}" updated!`, type: 'success' });
      setEditingRole(null);
      loadOrgRoles(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update role', type: 'error' });
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system && ['admin', 'member'].includes(role.id)) {
      showToast({ message: `The system role "${role.name}" cannot be deleted.`, type: 'error' });
      return;
    }
    if (role.member_count > 0) {
      showToast({
        message: `Cannot delete role "${role.name}" because it is currently assigned to ${role.member_count} member(s). Please reassign those members first.`,
        type: 'error',
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;
    try {
      await orgAPI.deleteRole(selectedOrgId, role.id);
      showToast({ message: `Role "${role.name}" deleted!`, type: 'success' });
      loadOrgRoles(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to delete role', type: 'error' });
    }
  };

  // =============================================
  // TEAM ACTIONS
  // =============================================
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!selectedOrgId) {
      showToast({ message: 'Please select an organization first', type: 'error' });
      return;
    }
    try {
      const res = await teamsAPI.create({
        ...newTeamData,
        organization_id: selectedOrgId,
      });
      showToast({ message: `Team "${newTeamData.name}" created with #team broadcast!`, type: 'success' });
      setShowCreateTeamModal(false);
      setNewTeamData({ name: '', description: '', lead_user_id: '' });
      await loadTeams(selectedOrgId);
      if (res.data) handleSelectTeam(res.data);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create team', type: 'error' });
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? All team projects and channels will be removed.')) return;
    try {
      await teamsAPI.delete(teamId);
      showToast({ message: 'Team deleted', type: 'success' });
      loadTeams(selectedOrgId);
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to delete team', type: 'error' });
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

  // =============================================
  // PLATFORM USER ACTIONS
  // =============================================
  const handleRoleChange = async (userId, newRole) => {
    try {
      await authAPI.adminUpdateRole(userId, newRole);
      showToast({ message: 'Platform role updated', type: 'success' });
      loadAllUsers();
      refreshUsers();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update role', type: 'error' });
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await authAPI.adminUpdateStatus(userId, !currentStatus);
      showToast({ message: `User account ${!currentStatus ? 'activated' : 'deactivated'}`, type: 'success' });
      loadAllUsers();
      refreshUsers();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to update status', type: 'error' });
    }
  };

  const handleResetPasswordDefault = (targetUser) => {
    const userName = targetUser.name || targetUser.user?.name || 'User';
    const userEmail = targetUser.email || targetUser.user?.email || '';
    const userId = targetUser.id || targetUser.user_id || targetUser.user?.id;

    showConfirm({
      title: `Reset Password for ${userName}?`,
      message: `Are you sure you want to reset the password for ${userName} (${userEmail}) to the default value: "Password@123"? The user will be able to log in immediately using this password.`,
      confirmText: 'Reset to Password@123',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const res = await authAPI.adminResetPasswordDefault(userId);
          showToast({
            message: res.data?.message || `Password for ${userName} reset to Password@123 successfully!`,
            type: 'success',
            duration: 6000,
          });
        } catch (err) {
          showToast({
            message: err.response?.data?.detail || 'Failed to reset user password',
            type: 'error',
          });
        }
      },
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await authAPI.adminCreateUser(newUserData);
      showToast({ message: `Created user ${newUserData.name}`, type: 'success' });
      setShowCreateUserModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'member' });
      loadAllUsers();
      refreshUsers();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Failed to create user', type: 'error' });
    }
  };

  const handleRunMigration = async () => {
    try {
      setMigrationRunning(true);
      const res = await migrateAPI.run();
      showToast({ message: 'Data migration completed successfully!', type: 'success' });
      await loadOrgs();
      fetchOrgs();
    } catch (err) {
      showToast({ message: err.response?.data?.detail || 'Migration failed', type: 'error' });
    } finally {
      setMigrationRunning(false);
    }
  };

  // Admin Cards configuration based on roles
  const adminCards = [
    ...(isSuperAdmin()
      ? [
          {
            id: 'orgs',
            title: 'Organization Directory',
            desc: 'Create, inspect, and configure multi-tenant organizations across the platform',
            icon: '🏢',
            color: '#6554C0',
          },
        ]
      : []),
    {
      id: 'org_members',
      title: 'Organization Members',
      desc: 'Add users to organization and assign roles across teams',
      icon: '👥',
      color: '#0052CC',
    },
    {
      id: 'org_roles',
      title: 'Organization Roles',
      desc: 'Create, customize, and manage custom job titles & roles specific to this organization',
      icon: '🎖️',
      color: '#403294',
    },
    {
      id: 'teams',
      title: 'Team Management',
      desc: 'Create and organize teams with team leads and dedicated #team broadcast channels',
      icon: '🏛️',
      color: '#00875A',
    },
    {
      id: 'org_settings',
      title: 'Organization Profile',
      desc: 'Configure organization name, branding profile, and workspace details',
      icon: '⚙️',
      color: '#00B8D9',
    },
    ...(isSuperAdmin()
      ? [
          {
            id: 'users',
            title: 'Platform User Accounts',
            desc: 'Manage all platform accounts, authentication credentials, and account statuses',
            icon: '👤',
            color: '#FF5630',
          },
        ]
      : []),
    {
      id: 'import_export',
      title: 'Data & Migration',
      desc: 'Run schema updates, export backups, and migrate organization structures',
      icon: '📥',
      color: '#FFAB00',
    },
  ];

  const currentRolesList = orgRolesList.length > 0
    ? orgRolesList
    : ALL_ROLES.map((r) => ({ id: r.id, name: r.label, description: r.desc, color: '#0052CC', is_system: true }));

  const filteredRoles = currentRolesList.filter((r) => {
    if (!roleFilter) return true;
    const q = roleFilter.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const filteredUsers = userList.filter((u) => {
    if (!userFilter) return true;
    const q = userFilter.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const filteredOrgMembers = orgMembers.filter((m) => {
    if (!orgMemberFilter) return true;
    const q = orgMemberFilter.toLowerCase();
    const name = m.user?.name || '';
    const email = m.user?.email || '';
    const roles = (m.roles || []).join(' ');
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || roles.toLowerCase().includes(q);
  });

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) || currentOrg;

  if (!isSuperAdmin() && !isOrgAdmin()) {
    return (
      <div style={{ padding: '64px 24px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFEBE6', color: '#DE350B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <ShieldCheck size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#172B4D', marginBottom: 8 }}>
          Member Access Restricted
        </h2>
        <p style={{ fontSize: '14px', color: '#5E6C84', lineHeight: 1.5, marginBottom: 24 }}>
          You are currently viewing <b>{currentOrg?.name || 'this Organization'}</b> with <b>Member</b> privileges. Administrative settings (adding members, creating teams, modifying roles) are restricted to Organization Admins and Super Admins.
        </p>
        <button className="jira-btn jira-btn-primary" onClick={() => navigate('/')}>
          Return to Home Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeSection && (
              <button
                onClick={() => setActiveSection(null)}
                className="jira-btn jira-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '12px' }}
              >
                <ArrowLeft size={14} /> Back to Hub
              </button>
            )}
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#172B4D', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={26} color="#0052CC" />
              {activeSection ? adminCards.find((c) => c.id === activeSection)?.title : 'Administration & Organization Hub'}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#5E6C84', margin: '4px 0 0 0' }}>
            {activeSection
              ? adminCards.find((c) => c.id === activeSection)?.desc
              : 'Multi-level management for Organizations, Teams, Leads, Members, and Projects'}
          </p>
        </div>

        {/* Organization Switcher / Selector */}
        {organizations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', padding: '6px 12px', borderRadius: 8, border: '1px solid #DFE1E6' }}>
            <Building size={16} color="#0052CC" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>Active Org:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="jira-input"
              style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 700, color: '#172B4D', border: 'none', background: 'transparent' }}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.member_count || 0} members)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* DASHBOARD CARDS VIEW */}
      {!activeSection && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {adminCards.map((card) => (
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

      {/* 1. ORGANIZATIONS MANAGEMENT (Super Admin) */}
      {activeSection === 'orgs' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#172B4D' }}>All Organizations</h3>
            <button
              className="jira-btn jira-btn-primary"
              onClick={() => setShowCreateOrgModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              Create Organization
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {organizations.map((org) => (
              <div
                key={org.id}
                style={{
                  border: selectedOrgId === org.id ? '2px solid #0052CC' : '1px solid #DFE1E6',
                  borderRadius: 8,
                  padding: 16,
                  background: selectedOrgId === org.id ? '#F4F5F7' : '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building size={18} color="#0052CC" />
                    {org.name}
                  </div>
                  {organizations.length > 1 && (
                    <button
                      onClick={() => handleDeleteOrg(org.id)}
                      className="btn btn-icon btn-ghost btn-sm"
                      title="Delete Organization"
                      style={{ color: '#DE350B' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#5E6C84', margin: '0 0 12px 0', minHeight: 32 }}>
                  {org.description || 'No description provided'}
                </p>
                <div style={{ display: 'flex', gap: 12, fontSize: '11px', color: '#7A869A', borderTop: '1px solid #EBECF0', paddingTop: 10 }}>
                  <span>👥 <b>{org.member_count || 0}</b> Members</span>
                  <span>🏢 <b>{org.team_count || 0}</b> Teams</span>
                  <span>📁 <b>{org.project_count || 0}</b> Projects</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                    className="jira-btn jira-btn-secondary"
                    style={{ width: '100%', fontSize: '12px', padding: '6px 0' }}
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setActiveSection('org_members');
                    }}
                  >
                    Manage Members & Teams →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ORG MEMBERS MANAGEMENT */}
      {activeSection === 'org_members' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 280 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
                <input
                  type="text"
                  placeholder="Filter org members..."
                  value={orgMemberFilter}
                  onChange={(e) => setOrgMemberFilter(e.target.value)}
                  className="jira-input"
                  style={{ paddingLeft: 32, fontSize: '13px' }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#5E6C84' }}>
                Showing <b>{filteredOrgMembers.length}</b> members in <b>{selectedOrg?.name}</b>
              </span>
            </div>

            <button
              className="jira-btn jira-btn-primary"
              onClick={() => {
                setShowAddOrgMemberModal(true);
                loadAllUsers();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <UserPlus size={16} />
              Add User to Organization
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #DFE1E6', color: '#5E6C84', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 8px' }}>User</th>
                <th style={{ padding: '12px 8px' }}>Assigned Roles in Org</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgMembers.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #EBECF0' }}>
                  <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                      {m.user?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#172B4D' }}>{m.user?.name || 'Unknown User'}</div>
                      <div style={{ fontSize: '11px', color: '#7A869A' }}>{m.user?.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(m.roles || ['member']).map((roleId) => {
                        const roleObj = currentRolesList.find((r) => r.id === roleId);
                        const label = roleObj?.name || roleObj?.label || roleId;
                        const color = roleObj?.color || (
                          roleId === 'admin' ? '#DE350B' :
                          roleId === 'lead' ? '#00875A' :
                          roleId === 'engineer' ? '#0052CC' :
                          roleId === 'tester' ? '#403294' : '#42526E'
                        );
                        return (
                          <span
                            key={roleId}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: color + '15',
                              color: color,
                              border: `1px solid ${color}33`,
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="jira-btn jira-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Reset password to default Password@123"
                        onClick={() => handleResetPasswordDefault(m)}
                      >
                        <Key size={12} />
                        Reset Password
                      </button>
                      <button
                        className="jira-btn jira-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => setEditingMember(m)}
                      >
                        Edit Roles
                      </button>
                      <button
                        className="btn btn-icon btn-ghost btn-sm"
                        style={{ color: '#DE350B' }}
                        title="Remove from organization"
                        onClick={() => handleRemoveOrgMember(m.user_id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2.5. ORGANIZATION CUSTOM ROLES MANAGEMENT */}
      {activeSection === 'org_roles' && (
        <div>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Organization Roles ({currentRolesList.length})</span>
                <span className="badge badge-subtle" style={{ fontSize: '11px' }}>
                  {selectedOrg?.name}
                </span>
              </h2>
              <p style={{ fontSize: '12px', color: '#5E6C84', margin: '4px 0 0 0' }}>
                Define custom roles, titles, and permission profiles for this organization. Roles with assigned members cannot be deleted.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
                <input
                  type="text"
                  placeholder="Filter roles..."
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="jira-input"
                  style={{ paddingLeft: 30, fontSize: '13px', width: 200 }}
                />
              </div>

              <button
                className="jira-btn jira-btn-primary"
                onClick={() => {
                  setNewRoleData({ id: '', name: '', description: '', color: '#0052CC' });
                  setShowCreateRoleModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}
              >
                <Plus size={14} /> Create Custom Role
              </button>
            </div>
          </div>

          {/* Roles Table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAFBFC', borderBottom: '2px solid #DFE1E6', color: '#5E6C84', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px' }}>Role Title & Key</th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active Members</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => {
                  const isCoreSystem = ['admin', 'member'].includes(role.id);
                  const hasAssignedMembers = role.member_count > 0;
                  const color = role.color || '#0052CC';

                  return (
                    <tr key={role.id} style={{ borderBottom: '1px solid #EBECF0', transition: 'background 0.1s ease' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#172B4D', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {role.name}
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: color + '15', color: color, fontWeight: 600 }}>
                                {role.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#5E6C84', maxWidth: 360 }}>
                        {role.description || 'No description provided'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {role.is_system ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 4, background: '#EBECF0', color: '#42526E', fontWeight: 600 }}>
                            System Default
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 4, background: '#EAE6FF', color: '#403294', fontWeight: 600 }}>
                            Custom Role
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 12,
                            background: hasAssignedMembers ? '#DEEBFF' : '#F4F5F7',
                            color: hasAssignedMembers ? '#0052CC' : '#7A869A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Users size={12} />
                          {role.member_count || 0} member{role.member_count === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="jira-btn jira-btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => setEditingRole(role)}
                          >
                            Edit
                          </button>
                          {!isCoreSystem && (
                            <button
                              className="btn btn-icon btn-ghost btn-sm"
                              style={{ color: hasAssignedMembers ? '#A5ADBA' : '#DE350B', cursor: hasAssignedMembers ? 'not-allowed' : 'pointer' }}
                              title={hasAssignedMembers ? `Assigned to ${role.member_count} member(s) - reassign before deleting` : 'Delete custom role'}
                              onClick={() => handleDeleteRole(role)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TEAM MANAGEMENT */}
      {activeSection === 'teams' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Teams list */}
          <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#172B4D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Teams ({teams.length})
              </h3>
              <button
                className="jira-btn jira-btn-primary"
                onClick={() => setShowCreateTeamModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '12px' }}
              >
                <Plus size={14} /> New Team
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {teams.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#7A869A', fontSize: '12px' }}>
                  No teams in this organization yet. Click "+ New Team" to create one.
                </div>
              ) : (
                teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTeam(t)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: selectedTeam?.id === t.id ? '#EBECF0' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: selectedTeam?.id === t.id ? '3px solid #0052CC' : '3px solid transparent',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>#{t.name}</div>
                      <div style={{ fontSize: '11px', color: '#7A869A' }}>
                        Lead: {t.lead_name || 'None'} • {t.member_count || 0} members
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Team Members */}
          <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 20 }}>
            {selectedTeam ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #EBECF0', paddingBottom: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>#{selectedTeam.name}</span>
                      <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                        Broadcast Channel: #{selectedTeam.name}
                      </span>
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#5E6C84' }}>
                      {selectedTeam.description || 'No description'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTeam(selectedTeam.id)}
                    className="jira-btn jira-btn-secondary"
                    style={{ color: '#DE350B', borderColor: '#FFBDAD', fontSize: '12px' }}
                  >
                    Delete Team
                  </button>
                </div>

                {/* Add member to team form */}
                <form onSubmit={handleAddTeamMember} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <select
                    value={addMemberUserId}
                    onChange={(e) => setAddMemberUserId(e.target.value)}
                    className="jira-input"
                    style={{ flex: 1, fontSize: '13px' }}
                    required
                  >
                    <option value="">-- Select Org Member to Add --</option>
                    {orgMembers
                      .filter((m) => !teamMembers.some((tm) => tm.user_id === m.user_id))
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user?.name} ({m.user?.email}) - {(m.roles || []).join(', ')}
                        </option>
                      ))}
                  </select>
                  <select
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value)}
                    className="jira-input"
                    style={{ width: 140, fontSize: '13px' }}
                  >
                    <option value="member">Member</option>
                    <option value="lead">Team Lead</option>
                    <option value="engineer">Engineer</option>
                    <option value="tester">Tester</option>
                    <option value="pm">Product Manager</option>
                  </select>
                  <button type="submit" className="jira-btn jira-btn-primary" style={{ fontSize: '13px' }}>
                    Add to Team
                  </button>
                </form>

                {/* Team members list */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #DFE1E6', color: '#5E6C84', textTransform: 'uppercase', fontSize: '11px' }}>
                      <th style={{ padding: '8px' }}>Member</th>
                      <th style={{ padding: '8px' }}>Team Role</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #EBECF0' }}>
                        <td style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00875A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                            {m.user?.name?.[0] || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#172B4D' }}>{m.user?.name}</div>
                            <div style={{ fontSize: '11px', color: '#7A869A' }}>{m.user?.email}</div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '11px',
                              background: m.role === 'lead' ? '#E3FCEF' : '#F4F5F7',
                              color: m.role === 'lead' ? '#006644' : '#42526E',
                              fontWeight: 600,
                            }}
                          >
                            {m.role === 'lead' ? '⭐ Team Lead' : m.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <button
                            className="btn btn-icon btn-ghost btn-sm"
                            style={{ color: '#DE350B' }}
                            title="Remove from team"
                            onClick={() => handleRemoveTeamMember(m.user_id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#7A869A' }}>
                Select a team on the left to view members and permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PLATFORM USER MANAGEMENT (Super Admin) */}
      {activeSection === 'users' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
              <input
                type="text"
                placeholder="Filter platform users..."
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
              Create Platform User
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #DFE1E6', color: '#5E6C84', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 8px' }}>User</th>
                <th style={{ padding: '12px 8px' }}>Platform Role</th>
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
                      <option value="member">Common User / Member</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin (Legacy)</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 600,
                        background: u.is_active !== false ? '#E3FCEF' : '#FFEBE6',
                        color: u.is_active !== false ? '#006644' : '#BF2600',
                      }}
                    >
                      {u.is_active !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => handleResetPasswordDefault(u)}
                        className="jira-btn jira-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Reset password to default Password@123"
                      >
                        <Key size={12} />
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleStatusToggle(u.id, u.is_active !== false)}
                        className="jira-btn jira-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        disabled={u.id === currentUser?.id || u.email === 'admin@sprintr.com' || u.email === 'admin@topbrains.com'}
                      >
                        {u.is_active !== false ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. ORG SETTINGS */}
      {activeSection === 'org_settings' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 24, maxWidth: 640 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#172B4D' }}>Organization Profile & Settings</h3>
          <form onSubmit={handleSaveOrgSettings}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="jira-input"
                style={{ width: '100%', fontSize: '14px' }}
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>
                Description
              </label>
              <textarea
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                className="jira-input"
                rows={3}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
            <button type="submit" className="jira-btn jira-btn-primary" disabled={orgSaving}>
              <Save size={14} style={{ marginRight: 6 }} />
              {orgSaving ? 'Saving...' : 'Save Organization Settings'}
            </button>
          </form>
        </div>
      )}

      {/* 6. IMPORT / EXPORT & MIGRATION */}
      {activeSection === 'import_export' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 8, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#172B4D' }}>Database Transition & Data Management</h3>

          <div style={{ background: '#DEEBFF', border: '1px solid #B3D4FF', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: '#0747A6', marginBottom: 4 }}>Hierarchy & Channels Data Sync</div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#172B4D' }}>
              Run the automatic database migration to ensure all organizations, teams, and projects have proper #org, #team, and #project broadcast channels, and update user role references.
            </p>
            <button
              className="jira-btn jira-btn-primary"
              onClick={handleRunMigration}
              disabled={migrationRunning}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={14} />
              {migrationRunning ? 'Running Migration...' : 'Run Database Migration'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Create Organization */}
      {showCreateOrgModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <h2 className="modal-title">Create New Organization</h2>
            <form onSubmit={handleCreateOrg}>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Organization Name</label>
                <input
                  type="text"
                  className="jira-input"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  required
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="jira-input"
                  value={newOrgData.description}
                  onChange={(e) => setNewOrgData({ ...newOrgData, description: e.target.value })}
                  placeholder="Workspace scope and details..."
                  rows={2}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="form-label">Assign Organization Admin</label>
                <select
                  className="jira-input"
                  value={newOrgData.admin_user_id}
                  onChange={(e) => setNewOrgData({ ...newOrgData, admin_user_id: e.target.value })}
                >
                  <option value="">-- Select Org Admin (Optional) --</option>
                  {userList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="jira-btn jira-btn-secondary" onClick={() => setShowCreateOrgModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add User to Org */}
      {showAddOrgMemberModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <h2 className="modal-title">Add User to Organization</h2>
            <p style={{ fontSize: '12px', color: '#5E6C84', margin: '-8px 0 16px 0' }}>
              Add a registered platform user to <b>{selectedOrg?.name}</b> and assign their organization roles.
            </p>
            <form onSubmit={handleAddOrgMember}>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Select Registered User</label>
                <select
                  className="jira-input"
                  value={addOrgMemberUserId}
                  onChange={(e) => setAddOrgMemberUserId(e.target.value)}
                  required
                >
                  <option value="">-- Choose User --</option>
                  {userList
                    .filter((u) => !orgMembers.some((m) => m.user_id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="form-label">Assign Org Roles (Select multiple)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  {ALL_ROLES.map((role) => {
                    const isChecked = addOrgMemberRoles.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '12px',
                          padding: '6px 8px',
                          border: isChecked ? '1px solid #0052CC' : '1px solid #DFE1E6',
                          borderRadius: 6,
                          background: isChecked ? '#DEEBFF' : '#FFF',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddOrgMemberRoles([...addOrgMemberRoles, role.id]);
                            } else {
                              setAddOrgMemberRoles(addOrgMemberRoles.filter((r) => r !== role.id));
                            }
                          }}
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="jira-btn jira-btn-secondary" onClick={() => setShowAddOrgMemberModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Add to Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Organization */}
      {showCreateOrgModal && (
        <div className="modal-overlay" onClick={() => setShowCreateOrgModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>Create New Organization</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreateOrgModal(false)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <form onSubmit={handleCreateOrg}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Organization Name <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="text"
                    className="jira-input"
                    value={newOrgData.name}
                    onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                    placeholder="e.g. Acme Corporation"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Description</label>
                  <textarea
                    className="jira-input"
                    value={newOrgData.description}
                    onChange={(e) => setNewOrgData({ ...newOrgData, description: e.target.value })}
                    placeholder="Workspace scope and details..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>
                    Assign Organization Admin <span style={{ fontSize: '11px', fontWeight: 400, color: '#7A869A' }}>(Optional)</span>
                  </label>

                  {selectedOrgAdminUser ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#DEEBFF',
                        border: '1px solid #B3D4FF',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#0052CC',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {selectedOrgAdminUser.name?.[0] || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>
                            {selectedOrgAdminUser.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#0052CC' }}>{selectedOrgAdminUser.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-icon btn-ghost btn-sm"
                        title="Remove selected admin"
                        onClick={() => {
                          setSelectedOrgAdminUser(null);
                          setNewOrgData({ ...newOrgData, admin_user_id: '' });
                          setOrgAdminSearchQuery('');
                          setSearchedOrgAdminUsers([]);
                        }}
                      >
                        <X size={14} color="#DE350B" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <Search
                          size={14}
                          style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#7A869A',
                          }}
                        />
                        <input
                          type="text"
                          className="jira-input"
                          placeholder="Search user by email or name (min 3 chars)..."
                          value={orgAdminSearchQuery}
                          onChange={(e) => setOrgAdminSearchQuery(e.target.value)}
                          style={{ paddingLeft: 30, fontSize: '12px' }}
                        />
                      </div>

                      {/* Search Indicators & Results */}
                      {searchingOrgAdminUsers && (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#5E6C84', textAlign: 'center' }}>
                          Searching platform users...
                        </div>
                      )}

                      {!searchingOrgAdminUsers && orgAdminSearchQuery.trim().length >= 3 && searchedOrgAdminUsers.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#7A869A', textAlign: 'center' }}>
                          No users found matching "{orgAdminSearchQuery}"
                        </div>
                      )}

                      {!searchingOrgAdminUsers && searchedOrgAdminUsers.length > 0 && (
                        <div
                          style={{
                            marginTop: 4,
                            maxHeight: 180,
                            overflowY: 'auto',
                            border: '1px solid #DFE1E6',
                            borderRadius: 6,
                            background: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(9, 30, 66, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            padding: 4,
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A869A', padding: '4px 8px', textTransform: 'uppercase' }}>
                            Matching Users (Max 10)
                          </div>
                          {searchedOrgAdminUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedOrgAdminUser(user);
                                setNewOrgData({ ...newOrgData, admin_user_id: user.id });
                                setOrgAdminSearchQuery('');
                                setSearchedOrgAdminUsers([]);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 8px',
                                border: 'none',
                                background: 'transparent',
                                borderRadius: 4,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: '#0052CC',
                                  color: '#FFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  flexShrink: 0,
                                }}
                              >
                                {user.name?.[0] || 'U'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '12px', color: '#172B4D' }}>{user.name}</div>
                                <div style={{ fontSize: '11px', color: '#5E6C84' }}>{user.email}</div>
                              </div>
                              <span style={{ fontSize: '11px', color: '#0052CC', fontWeight: 600 }}>Select</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <span style={{ fontSize: '11px', color: '#7A869A', marginTop: 4, display: 'block' }}>
                        Leave blank to create the organization without assigning an admin now. You can assign an Org Admin later from Organization Members.
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setShowCreateOrgModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add User to Org */}
      {showAddOrgMemberModal && (
        <div className="modal-overlay" onClick={() => setShowAddOrgMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>Add User to Organization</h2>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 2 }}>
                  Adding to <b>{selectedOrg?.name}</b>
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowAddOrgMemberModal(false)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <form onSubmit={handleAddOrgMember}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Select Registered User <span style={{ color: '#FF5630' }}>*</span></label>
                  <select
                    className="jira-input"
                    value={addOrgMemberUserId}
                    onChange={(e) => setAddOrgMemberUserId(e.target.value)}
                    required
                    autoFocus
                  >
                    <option value="">-- Choose User --</option>
                    {userList
                      .filter((u) => !orgMembers.some((m) => m.user_id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Assign Org Roles (Select multiple)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    {currentRolesList.map((role) => {
                      const isChecked = addOrgMemberRoles.includes(role.id);
                      const color = role.color || '#0052CC';
                      return (
                        <label
                          key={role.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '12px',
                            padding: '8px',
                            border: isChecked ? `1.5px solid ${color}` : '1px solid #DFE1E6',
                            borderRadius: 6,
                            background: isChecked ? `${color}14` : '#FFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddOrgMemberRoles([...addOrgMemberRoles, role.id]);
                              } else {
                                setAddOrgMemberRoles(addOrgMemberRoles.filter((r) => r !== role.id));
                              }
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? 700 : 500, color: isChecked ? color : '#172B4D' }}>
                            {role.name || role.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setShowAddOrgMemberModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Add to Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Member Roles */}
      {editingMember && (
        <div className="modal-overlay" onClick={() => setEditingMember(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '520px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>
                  Edit Roles for {editingMember.user?.name}
                </h2>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 2 }}>
                  Organization: <b>{selectedOrg?.name}</b> · {editingMember.user?.email}
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setEditingMember(null)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#5E6C84', margin: '0 0 14px 0' }}>
                Select all roles and job titles that apply to this user within this organization.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {currentRolesList.map((role) => {
                  const isChecked = (editingMember.roles || []).includes(role.id);
                  const color = role.color || '#0052CC';
                  return (
                    <label
                      key={role.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: '12px',
                        padding: '10px',
                        border: isChecked ? `1.5px solid ${color}` : '1px solid #DFE1E6',
                        borderRadius: 8,
                        background: isChecked ? `${color}14` : '#FFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        style={{ marginTop: 2 }}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...(editingMember.roles || []), role.id]
                            : (editingMember.roles || []).filter((r) => r !== role.id);
                          setEditingMember({ ...editingMember, roles: updated });
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: isChecked ? color : '#172B4D', fontSize: '13px' }}>
                          {role.name || role.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7A869A', marginTop: 2 }}>
                          {role.description || role.desc || 'Organization role'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setEditingMember(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="jira-btn jira-btn-primary"
                onClick={() => handleUpdateMemberRoles(editingMember.user_id, editingMember.roles || ['member'])}
              >
                Save Roles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Custom Role */}
      {showCreateRoleModal && (
        <div className="modal-overlay" onClick={() => setShowCreateRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>Create Custom Organization Role</h2>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 2 }}>
                  For organization: <b>{selectedOrg?.name}</b>
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreateRoleModal(false)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <form onSubmit={handleCreateRole}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Role Title / Name <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="text"
                    className="jira-input"
                    value={newRoleData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const slug = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 30);
                      setNewRoleData({ ...newRoleData, name: val, id: newRoleData.id || slug });
                    }}
                    placeholder="e.g. DevOps Engineer, SDET Lead, UI/UX Designer"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Role Key / Identifier</label>
                  <input
                    type="text"
                    className="jira-input"
                    value={newRoleData.id}
                    onChange={(e) => setNewRoleData({ ...newRoleData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="e.g. devops_engineer"
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#7A869A', marginTop: 2, display: 'block' }}>
                    Unique identifier used for backend role mapping and API checks.
                  </span>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Description</label>
                  <textarea
                    className="jira-input"
                    value={newRoleData.description}
                    onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                    placeholder="Responsibilities, team scope, and job profile details..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 6 }}>Badge Color Theme</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {['#0052CC', '#00875A', '#403294', '#DE350B', '#00B8D9', '#FF8B00', '#6554C0', '#42526E'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewRoleData({ ...newRoleData, color: c })}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: c,
                          border: newRoleData.color === c ? '3px solid #172B4D' : '2px solid #FFF',
                          boxShadow: newRoleData.color === c ? '0 0 0 1px #172B4D' : '0 1px 3px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setShowCreateRoleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Custom Role */}
      {editingRole && (
        <div className="modal-overlay" onClick={() => setEditingRole(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>Edit Role: {editingRole.name}</h2>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 2 }}>
                  Identifier: <code>{editingRole.id}</code> · Organization: <b>{selectedOrg?.name}</b>
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setEditingRole(null)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <form onSubmit={handleUpdateRole}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Role Title / Name <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="text"
                    className="jira-input"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Description</label>
                  <textarea
                    className="jira-input"
                    value={editingRole.description || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    placeholder="Role responsibilities..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 6 }}>Badge Color Theme</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {['#0052CC', '#00875A', '#403294', '#DE350B', '#00B8D9', '#FF8B00', '#6554C0', '#42526E'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingRole({ ...editingRole, color: c })}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: c,
                          border: editingRole.color === c ? '3px solid #172B4D' : '2px solid #FFF',
                          boxShadow: editingRole.color === c ? '0 0 0 1px #172B4D' : '0 1px 3px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setEditingRole(null)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Team */}
      {showCreateTeamModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTeamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>Create Team</h2>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 2 }}>
                  In organization: <b>{selectedOrg?.name}</b>
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreateTeamModal(false)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Team Name <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="text"
                    className="jira-input"
                    value={newTeamData.name}
                    onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                    placeholder="e.g. Frontend Engineering, QA Testing"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Description</label>
                  <textarea
                    className="jira-input"
                    value={newTeamData.description}
                    onChange={(e) => setNewTeamData({ ...newTeamData, description: e.target.value })}
                    placeholder="Team mission and responsibilities..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Assign Team Lead</label>
                  <select
                    className="jira-input"
                    value={newTeamData.lead_user_id}
                    onChange={(e) => setNewTeamData({ ...newTeamData, lead_user_id: e.target.value })}
                  >
                    <option value="">-- Select Team Lead from Org Members --</option>
                    {orgMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user?.name} ({m.user?.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setShowCreateTeamModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn jira-btn-primary">
                  Create Team & Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Platform User */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => setShowCreateUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '440px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172B4D' }}>Create Platform User</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreateUserModal(false)}>
                <X size={18} color="#5E6C84" />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Full Name <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="text"
                    className="jira-input"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Email Address <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="email"
                    className="jira-input"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="user@sprintr.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Password <span style={{ color: '#FF5630' }}>*</span></label>
                  <input
                    type="password"
                    className="jira-input"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5E6C84', marginBottom: 4 }}>Platform Role</label>
                  <select
                    className="jira-input"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  >
                    <option value="member">Common User / Member</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="jira-btn jira-btn-ghost" onClick={() => setShowCreateUserModal(false)}>
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
    </div>
  );
};

export default AdminPage;
