import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Globe,
  Info,
  CheckCircle2,
  Edit3,
  Copy,
  Calendar,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  X,
  ExternalLink,
  Users,
  Activity,
  Bookmark,
  CheckSquare,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Pin,
  MoreHorizontal,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { issuesApi } from '../../api/issues';
import { Avatar } from '../common/Avatar';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';

// Helper SVG Donut for Status Overview
const StatusDonutChart = ({ data, totalValue, size = 210, strokeWidth = 30 }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = data.map((item) => {
    const percent = totalValue > 0 ? item.value / totalValue : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return { ...item, percent, strokeDasharray, strokeDashoffset };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#EBECF0"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {totalValue > 0 &&
          segments.map((seg, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={hoveredSegment?.label === seg.label ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              style={{
                transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
            />
          ))}
      </svg>

      {/* Center Value */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '26px', fontWeight: 800, color: '#172B4D', lineHeight: 1.1 }}>
          {hoveredSegment ? hoveredSegment.value : totalValue}
        </span>
        <span style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600, marginTop: '2px', maxWidth: '100px', textAlign: 'center' }}>
          {hoveredSegment ? hoveredSegment.label : 'Total work items'}
        </span>
      </div>
    </div>
  );
};

export const SummaryView = () => {
  const { currentProject, refreshKey, setActiveTab, setSelectedIssueId } = useProject();
  const { users, currentOrg } = useAuth();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');

  // Filter Popover State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterField, setActiveFilterField] = useState('status'); // 'parent' | 'assignee' | 'status' | 'work_type' | 'priority' | 'labels'
  const [filterSearch, setFilterSearch] = useState('');
  const filterPopupRef = useRef(null);

  // Active Multi-Select Filters
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedParents, setSelectedParents] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);

  // Keyboard shortcut Shift + F to toggle filter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setIsFilterOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close filter popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  // Load project issues from database
  useEffect(() => {
    const fetchIssues = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        const data = await issuesApi.list({ project_id: currentProject.id });
        setIssues(data || []);
      } catch (err) {
        console.error('Failed to load summary issues', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, [currentProject?.id, refreshKey]);

  // Count active filters
  const totalActiveFilterCount =
    (selectedUserFilter !== 'all' ? 1 : 0) +
    selectedStatuses.length +
    selectedTypes.length +
    selectedPriorities.length +
    selectedAssignees.length +
    selectedParents.length +
    selectedLabels.length;

  const clearAllFilters = () => {
    setSelectedUserFilter('all');
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedPriorities([]);
    setSelectedAssignees([]);
    setSelectedParents([]);
    setSelectedLabels([]);
  };

  // Filter issues by active criteria
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Avatar bar filter
      if (selectedUserFilter !== 'all' && issue.assignee_id !== selectedUserFilter) {
        return false;
      }
      // 2. Status filter
      if (selectedStatuses.length > 0) {
        const st = (issue.status || 'todo').toLowerCase();
        if (!selectedStatuses.includes(st)) return false;
      }
      // 3. Work type filter
      if (selectedTypes.length > 0) {
        const t = (issue.type || 'story').toLowerCase();
        if (!selectedTypes.includes(t)) return false;
      }
      // 4. Priority filter
      if (selectedPriorities.length > 0) {
        const p = (issue.priority || 'medium').toLowerCase();
        if (!selectedPriorities.includes(p)) return false;
      }
      // 5. Assignee filter
      if (selectedAssignees.length > 0) {
        const aId = issue.assignee_id || 'unassigned';
        if (!selectedAssignees.includes(aId)) return false;
      }
      // 6. Parent filter
      if (selectedParents.length > 0) {
        const parent = issue.parent_id || issue.epic_id || 'none';
        if (!selectedParents.includes(parent)) return false;
      }
      // 7. Labels filter
      if (selectedLabels.length > 0) {
        const issueLabels = issue.labels || [];
        const hasMatch = selectedLabels.some((l) => issueLabels.includes(l));
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [
    issues,
    selectedUserFilter,
    selectedStatuses,
    selectedTypes,
    selectedPriorities,
    selectedAssignees,
    selectedParents,
    selectedLabels,
  ]);

  const totalCount = filteredIssues.length;

  // 1. Top 4 7-Day Metric Calculations
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const completed7Days = filteredIssues.filter((i) => {
    if (i.status !== 'done') return false;
    const d = new Date(i.updated_at || i.created_at || 0);
    return d >= sevenDaysAgo && d <= now;
  }).length;

  const updated7Days = filteredIssues.filter((i) => {
    const d = new Date(i.updated_at || i.created_at || 0);
    return d >= sevenDaysAgo && d <= now;
  }).length;

  const created7Days = filteredIssues.filter((i) => {
    const d = new Date(i.created_at || 0);
    return d >= sevenDaysAgo && d <= now;
  }).length;

  const dueSoon7Days = filteredIssues.filter((i) => {
    if (!i.due_date) return false;
    const due = new Date(i.due_date);
    return due >= now && due <= sevenDaysAhead;
  }).length;

  // 2. Status Overview Breakdown
  const statusOverviewData = useMemo(() => {
    const map = {
      todo: { label: 'To Do', color: '#4C9AFF', value: 0 },
      inprogress: { label: 'Dev In-Progress', color: '#6554C0', value: 0 },
      inreview: { label: 'Ready for QA', color: '#36B37E', value: 0 },
      done: { label: 'Bug fixed / Done', color: '#0052CC', value: 0 },
      parked: { label: 'Parked', color: '#57D9A3', value: 0 },
      reopen: { label: 'Reopen', color: '#00B8D9', value: 0 },
      deployed: { label: 'Deployed to Test Env', color: '#FF8B00', value: 0 },
    };

    filteredIssues.forEach((i) => {
      const st = (i.status || 'todo').toLowerCase();
      if (map[st]) {
        map[st].value += 1;
      } else if (st === 'done') {
        map.done.value += 1;
      } else {
        map.todo.value += 1;
      }
    });

    return Object.values(map);
  }, [filteredIssues]);

  // 3. Priority Breakdown
  const priorityBreakdown = useMemo(() => {
    const counts = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0, none: 0 };
    filteredIssues.forEach((i) => {
      const p = (i.priority || 'none').toLowerCase();
      if (counts[p] !== undefined) counts[p]++;
      else counts.none++;
    });
    return [
      { id: 'highest', label: 'Highest', count: counts.highest, color: '#FF5630' },
      { id: 'high', label: 'High', count: counts.high, color: '#FF7452' },
      { id: 'medium', label: 'Medium', count: counts.medium, color: '#FFAB00' },
      { id: 'low', label: 'Low', count: counts.low, color: '#4C9AFF' },
      { id: 'lowest', label: 'Lowest', count: counts.lowest, color: '#0052CC' },
      { id: 'none', label: 'None', count: counts.none, color: '#DFE1E6' },
    ];
  }, [filteredIssues]);

  const maxPriorityCount = Math.max(1, ...priorityBreakdown.map((p) => p.count));

  // 4. Types of Work Breakdown
  const typeBreakdown = useMemo(() => {
    const counts = { bug: 0, story: 0, epic: 0, subtask: 0, task: 0 };
    filteredIssues.forEach((i) => {
      const t = (i.type || 'story').toLowerCase();
      if (t === 'bug') counts.bug++;
      else if (t === 'story') counts.story++;
      else if (t === 'epic') counts.epic++;
      else if (t === 'subtask' || t === 'sub-task') counts.subtask++;
      else counts.task++;
    });

    const total = Math.max(1, filteredIssues.length);
    return [
      { id: 'bug', label: 'Bug', count: counts.bug, pct: Math.round((counts.bug / total) * 100), color: '#FF5630' },
      { id: 'story', label: 'Story', count: counts.story, pct: Math.round((counts.story / total) * 100), color: '#36B37E' },
      { id: 'epic', label: 'Epic', count: counts.epic, pct: Math.round((counts.epic / total) * 100), color: '#6554C0' },
      { id: 'subtask', label: 'Sub-task', count: counts.subtask, pct: Math.round((counts.subtask / total) * 100), color: '#4C9AFF' },
      { id: 'task', label: 'Task', count: counts.task, pct: Math.round((counts.task / total) * 100), color: '#0052CC' },
    ];
  }, [filteredIssues]);

  // 5. Team Workload Breakdown
  const teamWorkload = useMemo(() => {
    const map = {};
    let unassignedCount = 0;

    filteredIssues.forEach((i) => {
      if (!i.assignee_id || !i.assignee) {
        unassignedCount++;
      } else {
        const id = i.assignee_id;
        if (!map[id]) {
          map[id] = { user: i.assignee, count: 0 };
        }
        map[id].count++;
      }
    });

    const total = Math.max(1, filteredIssues.length);
    const list = Object.values(map).map((item) => ({
      user: item.user,
      name: item.user?.name || 'Member',
      count: item.count,
      pct: Math.round((item.count / total) * 100),
    }));

    if (unassignedCount > 0) {
      list.push({
        user: null,
        name: 'Unassigned',
        count: unassignedCount,
        pct: Math.round((unassignedCount / total) * 100),
      });
    }

    list.sort((a, b) => b.count - a.count);
    return list;
  }, [filteredIssues]);

  // 6. Epic Progress Breakdown
  const epicProgressList = useMemo(() => {
    const epics = filteredIssues.filter((i) => i.type === 'epic');
    if (epics.length === 0) {
      return [
        {
          key: `${currentProject?.key || 'TF'}-1`,
          summary: `${currentProject?.name || 'Project'} Core Epic`,
          donePct: 40,
          inProgressPct: 30,
          toDoPct: 30,
        },
      ];
    }

    return epics.map((epic) => {
      const childIssues = filteredIssues.filter((i) => i.parent_id === epic.id || i.epic_id === epic.id);
      const total = childIssues.length || 1;
      const doneCount = childIssues.filter((i) => i.status === 'done').length;
      const inProgCount = childIssues.filter((i) => i.status === 'inprogress' || i.status === 'inreview').length;
      const todoCount = total - doneCount - inProgCount;

      return {
        key: epic.key,
        summary: epic.summary,
        donePct: Math.round((doneCount / total) * 100) || (epic.status === 'done' ? 100 : 0),
        inProgressPct: Math.round((inProgCount / total) * 100) || (epic.status === 'inprogress' ? 50 : 0),
        toDoPct: Math.max(0, 100 - (Math.round((doneCount / total) * 100) + Math.round((inProgCount / total) * 100))),
      };
    });
  }, [filteredIssues, currentProject]);

  // Toggle helper for multi-select filter arrays
  const toggleSelection = (item, currentList, setList) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((x) => x !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FAFBFC', minHeight: '100%', padding: '20px 28px 40px 28px' }}>
      {/* 1. Header & Breadcrumbs */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5E6C84' }}>
          <span>Spaces</span>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#172B4D' }}>{currentOrg?.name || currentProject?.name || 'TopBrains'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            {currentProject ? `${currentProject.key} board` : 'Board'}
          </h1>
        </div>
      </div>

      {/* 2. Blue Info Banner */}
      {showBanner && (
        <div
          style={{
            backgroundColor: '#DEEBFF',
            border: '1px solid #B3D4FF',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', color: '#0052CC' }}>
              <Info size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0747A6', margin: '0 0 4px 0' }}>
                Customize your Reports view to suit your space.
              </h4>
              <p style={{ fontSize: '13px', color: '#172B4D', margin: 0 }}>
                Head to the Reports tab to easily customize charts and widgets for a dashboard tailored to your space.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setActiveTab('reports')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#0052CC',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Take me to Reports
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#5E6C84',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          {/* Banner Graphic Illustration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div
              style={{
                width: '60px',
                height: '42px',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                border: '1px solid #DFE1E6',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                padding: '4px',
              }}
            >
              <div style={{ width: '8px', height: '24px', backgroundColor: '#FFAB00', borderRadius: '2px' }} />
              <div style={{ width: '8px', height: '32px', backgroundColor: '#36B37E', borderRadius: '2px' }} />
              <div style={{ width: '8px', height: '18px', backgroundColor: '#6554C0', borderRadius: '2px' }} />
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '4px solid #0052CC' }} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Avatar Filter Bar + Advanced Filter Button */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setSelectedUserFilter('all')}
          style={{
            background: selectedUserFilter === 'all' ? '#DEEBFF' : 'transparent',
            border: selectedUserFilter === 'all' ? '1px solid #4C9AFF' : '1px solid #DFE1E6',
            borderRadius: '16px',
            padding: '3px 10px',
            fontSize: '12px',
            fontWeight: 600,
            color: selectedUserFilter === 'all' ? '#0052CC' : '#42526E',
            cursor: 'pointer',
          }}
        >
          All ({issues.length})
        </button>

        {users.slice(0, 5).map((u) => {
          const isSelected = selectedUserFilter === u.id;
          return (
            <div
              key={u.id}
              onClick={() => setSelectedUserFilter(isSelected ? 'all' : u.id)}
              style={{ cursor: 'pointer', transform: isSelected ? 'scale(1.1)' : 'none', transition: 'all 0.15s ease' }}
              title={u.name}
            >
              <Avatar user={u} size="sm" />
            </div>
          );
        })}

        {users.length > 5 && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84', marginLeft: '4px' }}>
            +{users.length - 5}
          </span>
        )}

        {/* Filter Trigger Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="jira-btn jira-btn-ghost"
            style={{
              border: totalActiveFilterCount > 0 ? '1px solid #0052CC' : '1px solid #DFE1E6',
              backgroundColor: totalActiveFilterCount > 0 ? '#DEEBFF' : '#FFFFFF',
              color: totalActiveFilterCount > 0 ? '#0052CC' : '#42526E',
              fontSize: '12px',
              fontWeight: totalActiveFilterCount > 0 ? 700 : 500,
              padding: '4px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px',
            }}
          >
            <Filter size={13} />
            <span>Filter {totalActiveFilterCount > 0 ? `(${totalActiveFilterCount})` : ''}</span>
          </button>

          {/* ========================================================================= */}
          {/* ADVANCED FILTER POPUP MODAL (Exact match with user screenshot)           */}
          {/* ========================================================================= */}
          {isFilterOpen && (
            <div
              ref={filterPopupRef}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: '8px',
                width: '640px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #DFE1E6',
                boxShadow: '0 8px 30px rgba(9, 30, 66, 0.2)',
                zIndex: 500,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Main 2-Column Split Content */}
              <div style={{ display: 'flex', minHeight: '280px', maxHeight: '380px' }}>
                {/* Left Fields Selector */}
                <div
                  style={{
                    width: '210px',
                    borderRight: '1px solid #DFE1E6',
                    backgroundColor: '#FAFBFC',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 6px' }}>
                    {[
                      { id: 'parent', label: 'Parent', count: selectedParents.length },
                      { id: 'assignee', label: 'Assignee', count: selectedAssignees.length },
                      { id: 'status', label: 'Status', count: selectedStatuses.length },
                      { id: 'work_type', label: 'Work type', count: selectedTypes.length },
                      { id: 'priority', label: 'Priority', count: selectedPriorities.length },
                      { id: 'labels', label: 'Labels', count: selectedLabels.length },
                    ].map((field) => {
                      const isActive = activeFilterField === field.id;
                      return (
                        <button
                          key={field.id}
                          onClick={() => {
                            setActiveFilterField(field.id);
                            setFilterSearch('');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            background: isActive ? '#EAE6FF' : 'transparent',
                            color: isActive ? '#5243AA' : '#172B4D',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{field.label}</span>
                            {field.count > 0 && (
                              <span style={{ fontSize: '11px', backgroundColor: '#0052CC', color: '#FFFFFF', padding: '1px 6px', borderRadius: '10px' }}>
                                {field.count}
                              </span>
                            )}
                          </div>
                          {isActive && <Pin size={13} color="#5243AA" />}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className="jira-btn-ghost"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        color: '#5E6C84',
                        fontSize: '12px',
                        marginTop: '4px',
                        border: '1px dashed #C1C7D0',
                        borderRadius: '4px',
                      }}
                    >
                      <Plus size={13} />
                      <span>add field</span>
                    </button>
                  </div>

                  {/* Clear All Link at bottom left */}
                  <div style={{ padding: '8px 14px', borderTop: '1px solid #EBECF0' }}>
                    <button
                      onClick={clearAllFilters}
                      disabled={totalActiveFilterCount === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: totalActiveFilterCount > 0 ? '#0052CC' : '#A5ADBA',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: totalActiveFilterCount > 0 ? 'pointer' : 'default',
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                {/* Right Options List with Search */}
                <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  {/* Status Options */}
                  {activeFilterField === 'status' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Filter by Status
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {[
                          { id: 'todo', label: 'To Do', color: '#4C9AFF' },
                          { id: 'inprogress', label: 'In Progress / Dev', color: '#6554C0' },
                          { id: 'inreview', label: 'Ready for QA', color: '#36B37E' },
                          { id: 'done', label: 'Done / Bug Fixed', color: '#0052CC' },
                        ].map((st) => (
                          <label
                            key={st.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#172B4D',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(st.id)}
                              onChange={() => toggleSelection(st.id, selectedStatuses, setSelectedStatuses)}
                              style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                            />
                            <StatusBadge status={st.id} size="sm" />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Type Options */}
                  {activeFilterField === 'work_type' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Filter by Work Type
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {[
                          { id: 'story', label: 'Story' },
                          { id: 'task', label: 'Task' },
                          { id: 'bug', label: 'Bug' },
                          { id: 'epic', label: 'Epic' },
                          { id: 'subtask', label: 'Sub-task' },
                        ].map((t) => (
                          <label
                            key={t.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#172B4D',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={selectedTypes.includes(t.id)}
                              onChange={() => toggleSelection(t.id, selectedTypes, setSelectedTypes)}
                              style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                            />
                            <IssueTypeBadge type={t.id} showLabel={true} size={14} />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignee Options */}
                  {activeFilterField === 'assignee' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Filter by Assignee
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#172B4D',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignees.includes('unassigned')}
                            onChange={() => toggleSelection('unassigned', selectedAssignees, setSelectedAssignees)}
                            style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                          />
                          <span>Unassigned</span>
                        </label>
                        {users.map((u) => (
                          <label
                            key={u.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#172B4D',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(u.id)}
                              onChange={() => toggleSelection(u.id, selectedAssignees, setSelectedAssignees)}
                              style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                            />
                            <Avatar user={u} size="sm" />
                            <span>{u.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority Options */}
                  {activeFilterField === 'priority' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Filter by Priority
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {['highest', 'high', 'medium', 'low', 'lowest'].map((p) => (
                          <label
                            key={p}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#172B4D',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPriorities.includes(p)}
                              onChange={() => toggleSelection(p, selectedPriorities, setSelectedPriorities)}
                              style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                            />
                            <PriorityBadge priority={p} showLabel={true} size={14} />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parent / Epic Options */}
                  {activeFilterField === 'parent' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Filter by Parent Epic
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {issues
                          .filter((i) => i.type === 'epic')
                          .map((ep) => (
                            <label
                              key={ep.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#172B4D',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedParents.includes(ep.id)}
                                onChange={() => toggleSelection(ep.id, selectedParents, setSelectedParents)}
                                style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                              />
                              <span style={{ fontWeight: 700, color: '#6554C0' }}>{ep.key}</span>
                              <span>{ep.summary}</span>
                            </label>
                          ))}
                        {issues.filter((i) => i.type === 'epic').length === 0 && (
                          <div style={{ fontSize: '13px', color: '#7A869A', padding: '10px' }}>
                            No epics found in this space.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Labels Options */}
                  {activeFilterField === 'labels' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Filter by Label
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {['frontend', 'backend', 'auth', 'database', 'qa', 'bugfix'].map((lbl) => (
                          <label
                            key={lbl}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#172B4D',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLabels.includes(lbl)}
                              onChange={() => toggleSelection(lbl, selectedLabels, setSelectedLabels)}
                              style={{ width: '16px', height: '16px', accentColor: '#0052CC' }}
                            />
                            <span style={{ backgroundColor: '#DFE1E6', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                              {lbl}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: '#FAFBFC',
                  borderTop: '1px solid #DFE1E6',
                  fontSize: '12px',
                  color: '#5E6C84',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <MessageSquare size={14} />
                  <span>Give feedback</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Press</span>
                  <kbd style={{ backgroundColor: '#EBECF0', padding: '2px 6px', borderRadius: '3px', border: '1px solid #DFE1E6', fontWeight: 600, color: '#172B4D' }}>
                    Shift
                  </kbd>
                  <span>+</span>
                  <kbd style={{ backgroundColor: '#EBECF0', padding: '2px 6px', borderRadius: '3px', border: '1px solid #DFE1E6', fontWeight: 600, color: '#172B4D' }}>
                    F
                  </kbd>
                  <span>to open and close</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Top 4 Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Completed */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#F4F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} color="#42526E" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
              {completed7Days} completed
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
              in the last 7 days
            </div>
          </div>
        </div>

        {/* Card 2: Updated */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#F4F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Edit3 size={20} color="#42526E" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
              {updated7Days} updated
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
              in the last 7 days
            </div>
          </div>
        </div>

        {/* Card 3: Created */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#F4F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Copy size={20} color="#42526E" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
              {created7Days} created
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
              in the last 7 days
            </div>
          </div>
        </div>

        {/* Card 4: Due Soon */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#F4F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={20} color="#42526E" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
              {dueSoon7Days} due soon
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
              in the next 7 days
            </div>
          </div>
        </div>
      </div>

      {/* 5. Status Overview (Large Donut Card) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            Status overview
          </h3>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#0052CC',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            View all work items
          </button>
        </div>
        <p style={{ fontSize: '13px', color: '#5E6C84', margin: '0 0 20px 0' }}>
          Get a snapshot of the status of your work items.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '24px' }}>
          <StatusDonutChart data={statusOverviewData} totalValue={totalCount} />

          {/* Right Legend */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '220px',
              overflowY: 'auto',
              minWidth: '240px',
            }}
          >
            {statusOverviewData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#172B4D' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: item.color,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 500 }}>{item.label}:</span>
                <span style={{ fontWeight: 700, color: '#5E6C84' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Priority Breakdown & Types of Work */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Priority Breakdown (Vertical Bars) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: '0 0 4px 0' }}>
            Priority breakdown
          </h3>
          <p style={{ fontSize: '13px', color: '#5E6C84', margin: '0 0 20px 0' }}>
            Get a holistic view of how work is being prioritized.{' '}
            <span style={{ color: '#0052CC', cursor: 'pointer' }}>How to manage priorities for spaces</span>
          </p>

          <div style={{ height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '170px', borderBottom: '2px solid #5E6C84', paddingBottom: '2px' }}>
              {priorityBreakdown.map((p) => {
                const barHeight = Math.max(8, (p.count / maxPriorityCount) * 140);
                return (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '50px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', marginBottom: '4px' }}>
                      {p.count}
                    </span>
                    <div
                      style={{
                        width: '32px',
                        height: `${barHeight}px`,
                        backgroundColor: '#7A869A',
                        borderRadius: '2px 2px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                      title={`${p.label}: ${p.count}`}
                    />
                    <span style={{ fontSize: '11px', color: '#5E6C84', marginTop: '8px', textAlign: 'center' }}>
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Types of Work (Horizontal Bars) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Types of work
            </h3>
            <button
              onClick={() => setActiveTab('list')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#0052CC',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              View all items
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#5E6C84', margin: '0 0 20px 0' }}>
            Get a breakdown of work items by their types.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {typeBreakdown.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '90px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IssueTypeBadge type={t.id} size={14} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D' }}>{t.label}</span>
                </div>

                <div style={{ flex: 1, height: '22px', backgroundColor: '#EBECF0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${t.pct}%`,
                      backgroundColor: '#7A869A',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <span style={{ width: '45px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>
                  {t.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Team Workload & Epic Progress */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Team Workload */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: '0 0 4px 0' }}>
            Team workload
          </h3>
          <p style={{ fontSize: '13px', color: '#5E6C84', margin: '0 0 20px 0' }}>
            Monitor the capacity of your team.{' '}
            <span style={{ color: '#0052CC', cursor: 'pointer' }}>Reassign work items to get the right balance</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '240px', overflowY: 'auto' }}>
            {teamWorkload.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '140px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.user ? <Avatar user={m.user} size="sm" /> : <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#DFE1E6' }} />}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </span>
                </div>

                <div style={{ flex: 1, height: '20px', backgroundColor: '#EBECF0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${m.pct}%`,
                      backgroundColor: '#7A869A',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <span style={{ width: '45px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>
                  {m.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Epic Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Epic progress
            </h3>
            <button
              onClick={() => setActiveTab('roadmap')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#0052CC',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              View all epics
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#5E6C84', margin: '0 0 16px 0' }}>
            See how your epics are progressing at a glance.
          </p>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#5E6C84', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, backgroundColor: '#36B37E', borderRadius: '2px' }} />
              Done
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, backgroundColor: '#4C9AFF', borderRadius: '2px' }} />
              In progress
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, backgroundColor: '#7A869A', borderRadius: '2px' }} />
              To do
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '220px', overflowY: 'auto' }}>
            {epicProgressList.map((ep, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <IssueTypeBadge type="epic" size={14} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>{ep.key}</span>
                  <span style={{ fontSize: '13px', color: '#5E6C84', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ep.summary}
                  </span>
                </div>

                {/* Multi-segment Progress Bar */}
                <div style={{ height: '18px', backgroundColor: '#EBECF0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  {ep.donePct > 0 && (
                    <div
                      style={{
                        width: `${ep.donePct}%`,
                        backgroundColor: '#36B37E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                      title={`Done: ${ep.donePct}%`}
                    >
                      {ep.donePct > 15 ? `${ep.donePct}%` : ''}
                    </div>
                  )}
                  {ep.inProgressPct > 0 && (
                    <div
                      style={{
                        width: `${ep.inProgressPct}%`,
                        backgroundColor: '#4C9AFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                      title={`In progress: ${ep.inProgressPct}%`}
                    >
                      {ep.inProgressPct > 15 ? `${ep.inProgressPct}%` : ''}
                    </div>
                  )}
                  {ep.toDoPct > 0 && (
                    <div
                      style={{
                        width: `${ep.toDoPct}%`,
                        backgroundColor: '#7A869A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                      title={`To do: ${ep.toDoPct}%`}
                    >
                      {ep.toDoPct > 15 ? `${ep.toDoPct}%` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
