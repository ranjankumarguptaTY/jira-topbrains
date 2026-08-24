import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const AdminPage = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-neutral-900)' }}>
          <ShieldCheck size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          Administration
        </h1>
        <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-neutral-500)', marginTop: 4 }}>
          Manage users, teams, and organization settings
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {[
          { title: 'User Management', desc: 'Create, edit, and manage user accounts and roles', icon: '👥' },
          { title: 'Team Management', desc: 'Create and organize teams, assign team heads', icon: '🏢' },
          { title: 'Organization Settings', desc: 'Configure organization name, branding, and policies', icon: '⚙️' },
          { title: 'Security & Access', desc: 'Manage permissions, roles, and access controls', icon: '🔒' },
          { title: 'Activity Logs', desc: 'View audit trail and system activity', icon: '📋' },
          { title: 'Import / Export', desc: 'Import or export project data and configurations', icon: '📥' },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: 'var(--color-neutral-0)',
              border: '1px solid var(--color-neutral-200)',
              borderRadius: 'var(--radius-xl)',
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-300)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-neutral-200)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-900)', marginBottom: 4 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
