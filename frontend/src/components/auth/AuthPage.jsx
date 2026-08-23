import React, { useState } from 'react';
import { Lock, Mail, User, Shield, ArrowRight, Sparkles, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { TopBrainsLogo } from '../common/TopBrainsLogo';
import { Avatar } from '../common/Avatar';

const DEMO_ACCOUNTS = [
  {
    name: 'TopBrains Admin',
    email: 'admin@topbrains.com',
    role: 'Master Administrator',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsAdminMaster',
    badgeColor: '#6554C0',
  },
  {
    name: 'Alex Morgan',
    email: 'alex.morgan@topbrains.com',
    role: 'Tech Lead / Admin',
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
    role: 'Product Manager',
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFBFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* TopBrains Jira Brand Header */}
      <div style={{ marginBottom: '28px' }}>
        <TopBrainsLogo size={42} showText={true} />
      </div>

      {/* Main Auth Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid #DFE1E6',
          overflow: 'hidden',
        }}
      >
        {/* Mode Switch Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #DFE1E6', backgroundColor: '#FAFBFC' }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              background: mode === 'login' ? '#FFFFFF' : 'transparent',
              borderBottom: mode === 'login' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: mode === 'login' ? 700 : 500,
              color: mode === 'login' ? '#0052CC' : '#5E6C84',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Log in
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              background: mode === 'register' ? '#FFFFFF' : 'transparent',
              borderBottom: mode === 'register' ? '2px solid #0052CC' : '2px solid transparent',
              fontWeight: mode === 'register' ? 700 : 500,
              color: mode === 'register' ? '#0052CC' : '#5E6C84',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Create account
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} style={{ padding: '28px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: '0 0 6px 0' }}>
                Log in to TopBrains Jira
              </h2>
              <p style={{ fontSize: '13px', color: '#5E6C84', margin: 0 }}>
                Sign in with your TopBrains credentials or select a demo account below.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                  Email address
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
                  Password
                </label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <Lock
                    size={16}
                    color="#7A869A"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="jira-input"
                    style={{ paddingLeft: '34px', backgroundColor: '#FFFFFF' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="jira-btn jira-btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '4px' }}
              >
                {isSubmitting ? 'Logging in...' : 'Log in'}
              </button>
            </div>

            {/* Quick Demo Accounts */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #EBECF0' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#5E6C84',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={13} color="#0052CC" />
                <span>1-Click Team Accounts</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: demo.email === 'admin@topbrains.com' ? '1.5px solid #6554C0' : '1px solid #DFE1E6',
                      backgroundColor: demo.email === 'admin@topbrains.com' ? '#F9F7FF' : '#FAFBFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EBECF0')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        demo.email === 'admin@topbrains.com' ? '#F9F7FF' : '#FAFBFC')
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar user={{ name: demo.name }} size="sm" tooltip={false} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#172B4D' }}>{demo.name}</div>
                        <div style={{ fontSize: '10px', color: demo.badgeColor, fontWeight: 600 }}>{demo.role}</div>
                      </div>
                    </div>
                    <ArrowRight size={13} color="#0052CC" />
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} style={{ padding: '28px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: '0 0 6px 0' }}>
                Join TopBrains Jira
              </h2>
              <p style={{ fontSize: '13px', color: '#5E6C84', margin: 0 }}>
                Create your team member account to collaborate on projects and sprints.
              </p>
            </div>

            {/* Admin Policy Notice */}
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#DEEBFF',
                borderRadius: '4px',
                border: '1px solid #B3D4FF',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <Info size={16} color="#0052CC" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '12px', color: '#0747A6', lineHeight: '1.4' }}>
                <strong>Admin Security Notice:</strong> Administrator accounts can only be created by existing
                TopBrains Administrators from the admin settings portal.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    placeholder="e.g. Jane Doe"
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
                  Work Email <span style={{ color: '#FF5630' }}>*</span>
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
                  Password <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <Lock
                    size={16}
                    color="#7A869A"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="password"
                    placeholder="At least 6 characters"
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
                  Team Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="jira-input"
                  style={{ marginTop: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="member">Software Engineer / Developer</option>
                  <option value="pm">Product Manager</option>
                  <option value="qa">QA Engineer / Tester</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !name || !email || !password}
                className="jira-btn jira-btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '4px' }}
              >
                {isSubmitting ? 'Creating account...' : 'Create Account & Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer info */}
      <div style={{ marginTop: '24px', fontSize: '12px', color: '#7A869A', textAlign: 'center' }}>
        TopBrains Jira Platform · FastAPI (Python) & MongoDB Architecture
      </div>
    </div>
  );
};
