import React, { useState } from 'react';
import { Lock, Mail, User, Shield, ArrowRight, Sparkles, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { TopBrainsLogo } from '../common/TopBrainsLogo';
import { Avatar } from '../common/Avatar';
import './AuthPage.css';

const DEMO_ACCOUNTS = [
  {
    name: 'TopBrains Admin',
    email: 'admin@topbrains.com',
    role: 'Master Administrator',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsAdminMaster',
    badgeColor: '#6554C0',
    isAdmin: true,
  },
  {
    name: 'Alex Morgan',
    email: 'alex.morgan@topbrains.com',
    role: 'Engineering Lead / Team Head',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    badgeColor: '#0052CC',
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@topbrains.com',
    role: 'Frontend Engineer',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    badgeColor: '#36B37E',
  },
  {
    name: 'David Kim',
    email: 'david.kim@topbrains.com',
    role: 'Backend Engineer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    badgeColor: '#FFAB00',
  },
  {
    name: 'Emily Watson',
    email: 'emily.watson@topbrains.com',
    role: 'Product Manager / Team Head',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    badgeColor: '#4C9AFF',
  },
];

export const AuthPage = () => {
  const { login, register } = useAuth();
  const { showToast } = useModal();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickDemoLogin = async (demo) => {
    setEmail(demo.email);
    const pwd = demo.email === 'admin@topbrains.com' ? 'adminpassword123' : 'password123';
    setPassword(pwd);
    try {
      setIsSubmitting(true);
      await login(demo.email, pwd);
      showToast({ message: `Welcome back, ${demo.name}!`, type: 'success' });
    } catch (err) {
      showToast({
        message: 'Login failed: ' + (err.response?.data?.detail || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setIsSubmitting(true);
      const user = await login(email.trim(), password);
      showToast({ message: `Logged in as ${user.name}`, type: 'success' });
    } catch (err) {
      showToast({
        message: err.response?.data?.detail || 'Invalid email or password',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    try {
      setIsSubmitting(true);
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      showToast({ message: `Account created! Welcome, ${user.name}`, type: 'success' });
    } catch (err) {
      showToast({
        message: err.response?.data?.detail || 'Registration failed',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* TopBrains Brand Header */}
      <div className="auth-header">
        <TopBrainsLogo size={42} showText={true} />
      </div>

      {/* Main Auth Card */}
      <div className="auth-card">
        {/* Mode Switch Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
          >
            Create account
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="auth-form-body">
            <div className="auth-title-block">
              <h2 className="auth-title">Log in to TopBrains</h2>
              <p className="auth-subtitle">
                Sign in with your work email or click a 1-click demo account below.
              </p>
            </div>

            <div className="auth-form-fields">
              <div className="auth-input-group">
                <label className="auth-input-label">Email address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="name@topbrains.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="btn btn-primary auth-submit-btn"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            {/* Quick Demo Accounts */}
            <div className="auth-demo-section">
              <div className="auth-demo-header">
                <Sparkles size={14} color="var(--color-primary-500)" />
                <span>1-Click Demo Accounts</span>
              </div>

              <div className="auth-demo-list">
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo)}
                    className={`auth-demo-btn ${demo.isAdmin ? 'admin' : ''}`}
                  >
                    <div className="auth-demo-info">
                      <Avatar user={{ name: demo.name }} size="sm" tooltip={false} />
                      <div>
                        <div className="auth-demo-name">{demo.name}</div>
                        <div className="auth-demo-role" style={{ color: demo.badgeColor }}>{demo.role}</div>
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--color-primary-500)" />
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="auth-form-body">
            <div className="auth-title-block">
              <h2 className="auth-title">Join TopBrains</h2>
              <p className="auth-subtitle">
                Create your team member account to collaborate on chat and projects.
              </p>
            </div>

            {/* Admin Policy Notice */}
            <div className="auth-security-notice">
              <Info size={16} color="var(--color-primary-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Admin Security Notice:</strong> Master Administrator accounts can only be created by existing
                Administrators from the admin settings portal.
              </span>
            </div>

            <div className="auth-form-fields">
              <div className="auth-input-group">
                <label className="auth-input-label">
                  Full Name <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                </label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">
                  Work Email <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                </label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="name@topbrains.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">
                  Password <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                </label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Team Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="auth-select"
                >
                  <option value="member">Software Engineer / Developer</option>
                  <option value="team_head">Team Head / Tech Lead</option>
                  <option value="pm">Product Manager</option>
                  <option value="qa">QA Engineer / Tester</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !name || !email || !password}
                className="btn btn-primary auth-submit-btn"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account & Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="auth-footer">
        TopBrains Collaboration Platform · Unified Chat & Agile Project Tracking
      </div>
    </div>
  );
};
