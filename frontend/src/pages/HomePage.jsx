import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  ClipboardList,
  MessageCircle,
  FolderKanban,
  Bell,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Plus,
  Users,
  BarChart3,
} from 'lucide-react';
import { issuesAPI, projectsAPI, conversationsAPI } from '../services/api';
import './HomePage.css';

const HomePage = () => {
  const { currentUser } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    assignedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    projectCount: 0,
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Load projects
        const projectsRes = await projectsAPI.list();
        const projects = projectsRes.data;

        // Load issues across all projects for stats
        let allIssues = [];
        for (const project of projects.slice(0, 5)) {
          try {
            const issuesRes = await issuesAPI.list(project.id);
            allIssues = [...allIssues, ...issuesRes.data];
          } catch (err) {
            // Some projects may not have issues
          }
        }

        const myIssues = allIssues.filter(
          (i) => i.assignee_id === currentUser?.id
        );

        setStats({
          assignedCount: myIssues.filter((i) => i.status !== 'done').length,
          inProgressCount: myIssues.filter((i) => i.status === 'inprogress').length,
          completedCount: myIssues.filter((i) => i.status === 'done').length,
          projectCount: projects.length,
        });

        // Recent assigned issues
        setRecentIssues(
          myIssues
            .filter((i) => i.status !== 'done')
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .slice(0, 5)
        );
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { icon: FolderKanban, label: 'View Projects', path: '/projects', color: 'var(--color-primary-500)' },
    { icon: MessageCircle, label: 'Open Chat', path: '/chat', color: 'var(--color-success-500)' },
    { icon: ClipboardList, label: 'My Work', path: '/my-work', color: 'var(--color-purple-500)' },
  ];

  const statusConfig = {
    todo: { label: 'To Do', className: 'status-todo' },
    inprogress: { label: 'In Progress', className: 'status-inprogress' },
    inreview: { label: 'In Review', className: 'status-inreview' },
    done: { label: 'Done', className: 'status-done' },
  };

  const priorityConfig = {
    highest: { label: '⬆⬆', className: 'priority-highest' },
    high: { label: '⬆', className: 'priority-high' },
    medium: { label: '—', className: 'priority-medium' },
    low: { label: '⬇', className: 'priority-low' },
    lowest: { label: '⬇⬇', className: 'priority-lowest' },
  };

  return (
    <div className="home-page">
      {/* Hero greeting */}
      <div className="home-hero">
        <div className="home-hero-content">
          <div className="home-greeting">
            <Sparkles size={20} className="greeting-icon" />
            <h1>
              {greeting()}, {currentUser?.name?.split(' ')[0]}
            </h1>
          </div>
          <p className="home-subtitle">
            Here's what's happening in your workspace today.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="home-stats">
        <div className="stat-card stat-card-assigned">
          <div className="stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.assignedCount}</div>
            <div className="stat-label">Assigned to You</div>
          </div>
        </div>

        <div className="stat-card stat-card-progress">
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card stat-card-completed">
          <div className="stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card stat-card-projects">
          <div className="stat-icon">
            <FolderKanban size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.projectCount}</div>
            <div className="stat-label">Projects</div>
          </div>
        </div>
      </div>

      <div className="home-grid">
        {/* Quick Actions */}
        <div className="home-card">
          <div className="home-card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  className="quick-action-btn"
                  onClick={() => navigate(action.path)}
                >
                  <div className="quick-action-icon" style={{ background: action.color }}>
                    <Icon size={18} color="#fff" />
                  </div>
                  <span>{action.label}</span>
                  <ArrowRight size={14} className="quick-action-arrow" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Assigned Issues */}
        <div className="home-card home-card-wide">
          <div className="home-card-header">
            <h2>Your Active Work</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-work')}>
              View All <ArrowRight size={12} />
            </button>
          </div>
          {loading ? (
            <div className="home-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8 }} />
              ))}
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="home-empty">
              <CheckCircle2 size={40} className="home-empty-icon" />
              <p>No active tasks assigned to you!</p>
              <span>You're all caught up 🎉</span>
            </div>
          ) : (
            <div className="recent-issues">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="recent-issue-row" onClick={() => navigate('/my-work')}>
                  <div className="recent-issue-key">{issue.key}</div>
                  <div className="recent-issue-summary truncate">{issue.summary}</div>
                  <span className={`status-badge ${statusConfig[issue.status]?.className || ''}`}>
                    {statusConfig[issue.status]?.label || issue.status}
                  </span>
                  <span className={priorityConfig[issue.priority]?.className || ''}>
                    {priorityConfig[issue.priority]?.label || issue.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
