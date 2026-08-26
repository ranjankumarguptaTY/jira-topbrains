import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  Users,
  Check,
  Mail,
  Lock,
  User,
  UserX,
  UserCheck,
  AlertCircle,
  Info,
  Key,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { authApi } from '../../api/auth';
import { Avatar } from '../common/Avatar';

export const UserManagementModal = ({ isOpen, onClose }) => {
  const { users, currentUser, refreshUsers } = useAuth();
  const { showConfirm, showToast } = useModal();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'deactivated'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    try {
      setIsSubmitting(true);
      await authApi.adminCreateUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      await refreshUsers();
      setName('');
      setEmail('');
      setPassword('');
      setRole('member');
      setActiveTab('list');
      showToast({ message: `Account created for ${name} (${role.toUpperCase()})`, type: 'success' });
    } catch (err) {
      showToast({
        message: err.response?.data?.detail || 'Failed to create user: ' + err.message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authApi.adminUpdateRole(userId, newRole);
      await refreshUsers();
      showToast({ message: `User role updated to ${newRole.toUpperCase()}`, type: 'success' });
    } catch (err) {
      showToast({
        message: err.response?.data?.detail || 'Failed to update role: ' + err.message,
        type: 'error',
      });
    }
  };

  const handleToggleUserStatus = (u) => {
    const isCurrentlyActive = u.is_active !== false;

    if (isCurrentlyActive) {
      showConfirm({
        title: `Deactivate ${u.name}?`,
        message:
          `Are you sure you want to deactivate ${u.name} (${u.email})? ` +
          `They will immediately lose access to log into Sprintr. ` +
          `All their existing assigned tickets, comments, time tracking, and audit history will remain 100% preserved.`,
        confirmText: 'Deactivate Account',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await authApi.adminUpdateUserStatus(u.id, false);
            await refreshUsers();
            showToast({ message: `${u.name} has been deactivated`, type: 'info' });
          } catch (err) {
            showToast({
              message: err.response?.data?.detail || 'Failed to deactivate user: ' + err.message,
              type: 'error',
            });
          }
        },
      });
    } else {
      showConfirm({
        title: `Reactivate ${u.name}?`,
        message: `Restore login access for ${u.name} (${u.email})? They will be able to log back into Sprintr.`,
        confirmText: 'Reactivate Account',
        variant: 'primary',
        onConfirm: async () => {
          try {
            await authApi.adminUpdateUserStatus(u.id, true);
            await refreshUsers();
            showToast({ message: `${u.name} has been reactivated`, type: 'success' });
          } catch (err) {
            showToast({
              message: err.response?.data?.detail || 'Failed to reactivate user: ' + err.message,
              type: 'error',
            });
          }
        },
      });
    }
  };

  const handleResetPasswordDefault = (u) => {
    showConfirm({
      title: `Reset Password for ${u.name}?`,
      message: `Are you sure you want to reset the password for ${u.name} (${u.email}) to the default value: "Password@123"? The user will be able to log in immediately using this password.`,
      confirmText: 'Reset to Password@123',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const res = await authApi.adminResetPasswordDefault(u.id);
          showToast({
            message: res.message || `Password for ${u.name} reset to Password@123 successfully!`,
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

  const displayedUsers = users.filter((u) => {
    const isActive = u.is_active !== false;
    if (filterStatus === 'active') return isActive;
    if (filterStatus === 'deactivated') return !isActive;
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '700px', maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
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
            <Shield size={20} color="#0052CC" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Sprintr Team & User Access Control
            </h2>
          </div>
          <button onClick={onClose} className="jira-btn jira-btn-ghost" style={{ padding: '6px' }}>
            <X size={18} color="#5E6C84" />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #DFE1E6', backgroundColor: '#FAFBFC' }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'list' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'list' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'list' ? 700 : 500,
              color: activeTab === 'list' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={16} />
            <span>Team Members ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'create' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'create' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: activeTab === 'create' ? 700 : 500,
              color: activeTab === 'create' ? '#0052CC' : '#5E6C84',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={16} />
            <span>Create New Admin / Member</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Informative Security Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#DEEBFF',
                  borderRadius: '6px',
                  border: '1px solid #B3D4FF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#0747A6',
                }}
              >
                <Info size={16} color="#0052CC" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Work Retention Guarantee:</strong> When you deactivate a team member, their login access is
                  immediately revoked, but all their previous tickets, subtasks, and discussion comments remain intact.
                </span>
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                {['all', 'active', 'deactivated'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: filterStatus === st ? '#0052CC' : '#DFE1E6',
                      backgroundColor: filterStatus === st ? '#DEEBFF' : '#FAFBFC',
                      color: filterStatus === st ? '#0052CC' : '#5E6C84',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* User rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayedUsers.map((u) => {
                  const isSelf = String(currentUser?.id) === String(u.id);
                  const isMasterRoot = u.email === 'admin@topbrains.com';
                  const isActive = u.is_active !== false;

                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px solid #DFE1E6',
                        backgroundColor: isActive ? '#FFFFFF' : '#FAFBFC',
                        opacity: isActive ? 1 : 0.75,
                      }}
                    >
                      {/* User Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ filter: isActive ? 'none' : 'grayscale(100%)' }}>
                          <Avatar user={u} size="md" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D' }}>
                              {u.name}
                            </span>
                            {isSelf && (
                              <span style={{ fontSize: '11px', color: '#0052CC', fontWeight: 700 }}>(You)</span>
                            )}
                            {/* Active / Deactivated Pill */}
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                backgroundColor: isActive ? '#E3FCEF' : '#FFEBE6',
                                color: isActive ? '#006644' : '#DE350B',
                              }}
                            >
                              {isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#5E6C84' }}>{u.email}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Role Selector */}
                        <select
                          value={u.role}
                          disabled={isSelf || !isActive}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="jira-input"
                          style={{
                            width: '130px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: u.role === 'admin' ? '#EAE6FF' : '#FAFBFC',
                            color: u.role === 'admin' ? '#5243AA' : '#172B4D',
                            borderColor: u.role === 'admin' ? '#6554C0' : '#DFE1E6',
                            height: '32px',
                          }}
                        >
                          <option value="admin">Administrator</option>
                          <option value="member">Software Engineer</option>
                          <option value="pm">Product Manager</option>
                          <option value="qa">QA / Tester</option>
                        </select>

                        {/* Reset Password to Default */}
                        {!isSelf && (
                          <button
                            onClick={() => handleResetPasswordDefault(u)}
                            className="jira-btn jira-btn-ghost"
                            style={{
                              fontSize: '12px',
                              padding: '5px 10px',
                              height: '32px',
                              color: '#0052CC',
                              borderColor: '#B3D4FF',
                              backgroundColor: '#DEEBFF',
                              fontWeight: 600,
                            }}
                            title="Reset password to default Password@123"
                          >
                            <Key size={14} />
                            <span>Reset Pwd</span>
                          </button>
                        )}

                        {/* Deactivate / Reactivate Action */}
                        {!isSelf && !isMasterRoot && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className="jira-btn jira-btn-ghost"
                            style={{
                              fontSize: '12px',
                              padding: '5px 10px',
                              height: '32px',
                              color: isActive ? '#FF5630' : '#36B37E',
                              borderColor: isActive ? '#FFBDAD' : '#ABF5D1',
                              backgroundColor: isActive ? '#FFEBE6' : '#E3FCEF',
                              fontWeight: 600,
                            }}
                            title={isActive ? 'Deactivate user login' : 'Reactivate user login'}
                          >
                            {isActive ? (
                              <>
                                <UserX size={14} />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} />
                                <span>Reactivate</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Create New User Tab */
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>
                Create a new user account with designated privileges.
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Full Name <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <User
                    size={16}
                    color="#7A869A"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="e.g. Alex Hunter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="jira-input"
                    style={{ paddingLeft: '34px', backgroundColor: '#FFFFFF' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Email Address <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <Mail
                    size={16}
                    color="#7A869A"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    placeholder="name@topbrains.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="jira-input"
                    style={{ paddingLeft: '34px', backgroundColor: '#FFFFFF' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Temporary Password <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <Lock
                    size={16}
                    color="#7A869A"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="password"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="jira-input"
                    style={{ paddingLeft: '34px', backgroundColor: '#FFFFFF' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Privilege Role <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="member">Software Engineer / Member</option>
                  <option value="pm">Product Manager</option>
                  <option value="qa">QA / Tester</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setActiveTab('list')} className="jira-btn jira-btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name || !email || !password}
                  className="jira-btn jira-btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
