import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useModal } from '../context/ModalContext';
import { authAPI } from '../services/api';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Monitor, Info, Check } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useModal();
  const { subscribeToPushNotifications } = useNotifications();
  const [theme, setTheme] = useState(localStorage.getItem('jira-clone-theme') || 'light');
  const [desktopNotifications, setDesktopNotifications] = useState(
    localStorage.getItem('jira-clone-desktop-notifications') === 'true'
  );

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast({ message: 'Please enter your current password.', type: 'error' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast({ message: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ message: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    try {
      setIsChangingPassword(true);
      await authAPI.changePassword(currentPassword, newPassword);
      showToast({ message: 'Password changed successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Failed to change password. If you do not remember your old password, please contact your Organization Administrator.';
      showToast({ message: msg, type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDesktopNotificationsToggle = async (e) => {
    const checked = e.target.checked;
    setDesktopNotifications(checked);
    localStorage.setItem('jira-clone-desktop-notifications', checked ? 'true' : 'false');

    if (checked) {
      if (!('Notification' in window)) {
        alert('Desktop notifications are not supported in this browser.');
        setDesktopNotifications(false);
        localStorage.setItem('jira-clone-desktop-notifications', 'false');
        return;
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Permission denied for Desktop Notifications.');
          setDesktopNotifications(false);
          localStorage.setItem('jira-clone-desktop-notifications', 'false');
        }
      } else if (Notification.permission === 'denied') {
        alert('Notification permission is blocked. Please enable it in your browser settings.');
        setDesktopNotifications(false);
        localStorage.setItem('jira-clone-desktop-notifications', 'false');
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('jira-clone-theme', newTheme);
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-grid">
        {/* Profile Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <User size={18} />
            <h2>Profile</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-profile">
              <div className="settings-avatar">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="avatar avatar-xl" />
                ) : (
                  <div className="avatar avatar-xl">
                    {currentUser?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="settings-profile-info">
                <div className="settings-profile-name">{currentUser?.name}</div>
                <div className="settings-profile-email">{currentUser?.email}</div>
                <span className="badge badge-primary">{currentUser?.role}</span>
              </div>
            </div>

            <div className="settings-form-group">
              <label className="input-label">Display Name</label>
              <input className="input-field" type="text" defaultValue={currentUser?.name} />
            </div>
            <div className="settings-form-group">
              <label className="input-label">Email</label>
              <input className="input-field" type="email" defaultValue={currentUser?.email} disabled />
            </div>
            <button className="btn btn-primary">Save Changes</button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Bell size={18} />
            <h2>Notifications</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-label">Chat Messages</div>
                <div className="settings-toggle-desc">Receive notifications for new chat messages</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-label">Issue Assignments</div>
                <div className="settings-toggle-desc">Notify when issues are assigned to you</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-label">Status Changes</div>
                <div className="settings-toggle-desc">Notify when issue status changes</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-label">Comments & Mentions</div>
                <div className="settings-toggle-desc">Notify when someone comments or mentions you</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-label">Desktop Notifications</div>
                <div className="settings-toggle-desc">Show browser push notifications</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={desktopNotifications}
                  onChange={handleDesktopNotificationsToggle}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Appearance (Theme switcher commented out - default light theme enabled) */}
        {/*
        <div className="settings-card">
          <div className="settings-card-header">
            <Palette size={18} />
            <h2>Appearance</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-group">
              <label className="input-label">Theme</label>
              <select
                className="input-field"
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>
        */}

        {/* Security / Password */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={18} />
            <h2>Security & Password</h2>
          </div>
          <form className="settings-card-body" onSubmit={handlePasswordChangeSubmit}>
            <div className="settings-form-group">
              <label className="input-label">Current Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="settings-form-group">
              <label className="input-label">New Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="settings-form-group">
              <label className="input-label">Confirm New Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* Note to user if they forgot their password */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: 6,
                backgroundColor: '#DEEBFF',
                border: '1px solid #B3D4FF',
                color: '#0747A6',
                fontSize: '12px',
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Forgot your current password?</strong>
                <div>
                  If you do not remember your old password, please contact your <strong>Organization Administrator</strong> or <strong>Super Admin</strong>. They can safely reset your account password to the default <code>Password@123</code> from the Admin Hub.
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isChangingPassword || !currentPassword || !newPassword}
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
