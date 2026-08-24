import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Monitor } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage = () => {
  const { currentUser } = useAuth();
  const { subscribeToPushNotifications } = useNotifications();
  const [theme, setTheme] = React.useState(localStorage.getItem('jira-clone-theme') || 'light');
  const [desktopNotifications, setDesktopNotifications] = React.useState(
    localStorage.getItem('jira-clone-desktop-notifications') === 'true'
  );

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

        {/* Appearance */}
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

        {/* Security */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={18} />
            <h2>Security</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-group">
              <label className="input-label">Current Password</label>
              <input className="input-field" type="password" placeholder="••••••••" />
            </div>
            <div className="settings-form-group">
              <label className="input-label">New Password</label>
              <input className="input-field" type="password" placeholder="••••••••" />
            </div>
            <button className="btn btn-secondary">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
