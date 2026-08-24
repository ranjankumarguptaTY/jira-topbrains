import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Monitor } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage = () => {
  const { currentUser } = useAuth();

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
                <input type="checkbox" />
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
              <select className="input-field">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
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
