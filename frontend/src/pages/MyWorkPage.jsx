import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { issuesAPI, projectsAPI } from '../services/api';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Search,
  ChevronDown,
} from 'lucide-react';
import './MyWorkPage.css';

const MyWorkPage = () => {
  const { currentUser } = useAuth();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('assigned'); // assigned | created | completed
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const projectsRes = await projectsAPI.list();
        const allProjects = projectsRes.data;
        setProjects(allProjects);

        let allIssues = [];
        for (const project of allProjects) {
          try {
            const issuesRes = await issuesAPI.list(project.id);
            const withProject = issuesRes.data.map((i) => ({ ...i, project_name: project.name, project_key: project.key }));
            allIssues = [...allIssues, ...withProject];
          } catch (err) { /* skip */ }
        }
        setIssues(allIssues);
      } catch (err) {
        console.error('Failed to load work data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getFilteredIssues = () => {
    let filtered = issues;

    // View filter
    if (activeView === 'assigned') {
      filtered = filtered.filter((i) => i.assignee_id === currentUser?.id && i.status !== 'done');
    } else if (activeView === 'created') {
      filtered = filtered.filter((i) => i.reporter_id === currentUser?.id);
    } else if (activeView === 'completed') {
      filtered = filtered.filter((i) => i.assignee_id === currentUser?.id && i.status === 'done');
    }

    // Additional filters
    if (filterProject !== 'all') {
      filtered = filtered.filter((i) => i.project_id === filterProject);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((i) => i.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter((i) => i.priority === filterPriority);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter((i) => i.type === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.summary?.toLowerCase().includes(q) ||
          i.key?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredIssues = getFilteredIssues();

  const views = [
    { key: 'assigned', label: 'Assigned to Me', icon: ClipboardList, count: issues.filter((i) => i.assignee_id === currentUser?.id && i.status !== 'done').length },
    { key: 'created', label: 'Created by Me', icon: AlertCircle, count: issues.filter((i) => i.reporter_id === currentUser?.id).length },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, count: issues.filter((i) => i.assignee_id === currentUser?.id && i.status === 'done').length },
  ];

  const statusConfig = {
    todo: { label: 'To Do', className: 'status-todo' },
    inprogress: { label: 'In Progress', className: 'status-inprogress' },
    inreview: { label: 'In Review', className: 'status-inreview' },
    done: { label: 'Done', className: 'status-done' },
  };

  const priorityConfig = {
    highest: { label: 'Highest', className: 'priority-highest' },
    high: { label: 'High', className: 'priority-high' },
    medium: { label: 'Medium', className: 'priority-medium' },
    low: { label: 'Low', className: 'priority-low' },
    lowest: { label: 'Lowest', className: 'priority-lowest' },
  };

  const typeIcons = {
    epic: '⚡',
    story: '📖',
    task: '✅',
    bug: '🐛',
    subtask: '🔧',
  };

  return (
    <div className="mywork-page">
      <div className="mywork-header">
        <h1>My Work</h1>
        <p>Track everything assigned to you across all projects</p>
      </div>

      {/* View tabs */}
      <div className="mywork-tabs">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.key}
              className={`mywork-tab ${activeView === view.key ? 'active' : ''}`}
              onClick={() => setActiveView(view.key)}
            >
              <Icon size={15} />
              <span>{view.label}</span>
              <span className="mywork-tab-count">{loading ? '-' : view.count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mywork-filters">
        <div className="mywork-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="mywork-filter-select">
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="mywork-filter-select">
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="inprogress">In Progress</option>
          <option value="inreview">In Review</option>
          <option value="done">Done</option>
        </select>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="mywork-filter-select">
          <option value="all">All Priority</option>
          <option value="highest">Highest</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="lowest">Lowest</option>
        </select>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="mywork-filter-select">
          <option value="all">All Types</option>
          <option value="epic">Epic</option>
          <option value="story">Story</option>
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="subtask">Subtask</option>
        </select>
      </div>

      {/* Issues Table */}
      <div className="mywork-table-container">
        {loading ? (
          <div className="mywork-loading">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />
            ))}
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="mywork-empty">
            <CheckCircle2 size={44} className="mywork-empty-icon" />
            <h3>No issues found</h3>
            <p>{activeView === 'assigned' ? "You don't have any active tasks!" : 'No matching issues'}</p>
          </div>
        ) : (
          <table className="mywork-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Key</th>
                <th>Summary</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="mywork-row">
                  <td className="mywork-type">{typeIcons[issue.type] || '📋'}</td>
                  <td className="mywork-key">{issue.key}</td>
                  <td className="mywork-summary truncate">{issue.summary}</td>
                  <td className="mywork-project">
                    <span className="badge badge-neutral">{issue.project_key || issue.project_name}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${statusConfig[issue.status]?.className || ''}`}>
                      {statusConfig[issue.status]?.label || issue.status}
                    </span>
                  </td>
                  <td>
                    <span className={priorityConfig[issue.priority]?.className || ''}>
                      {priorityConfig[issue.priority]?.label || issue.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyWorkPage;
