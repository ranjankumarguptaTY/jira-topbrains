import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  PlusCircle,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Filter,
  BarChart2,
  PieChart,
  Activity,
  Layers,
  ArrowUpRight,
  Sparkles,
  Info,
  Maximize2,
  Share2,
  X,
  Download,
  ArrowUpDown,
  Flame,
  Zap,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { issuesApi } from '../../api/issues';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';

// Helper for SVG Donut Chart with click-to-filter support
const DonutChart = ({ data, totalValue, title, size = 180, strokeWidth = 26, onSelectSegment, selectedFilter }) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '8px 0' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
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
            segments.map((seg, idx) => {
              const isSelected = selectedFilter?.value === seg.id || selectedFilter?.label === seg.label;
              const isHovered = hoveredSegment?.label === seg.label;
              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isSelected ? strokeWidth + 6 : isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  style={{
                    transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
                    cursor: 'pointer',
                    filter: isSelected ? 'drop-shadow(0 0 4px rgba(0,82,204,0.4))' : 'none',
                  }}
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => onSelectSegment && onSelectSegment(seg)}
                />
              );
            })}
        </svg>

        {/* Center Text */}
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
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#172B4D', lineHeight: 1.1 }}>
            {hoveredSegment ? hoveredSegment.value : totalValue}
          </span>
          <span style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600, marginTop: '2px' }}>
            {hoveredSegment ? hoveredSegment.label : 'Total value'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 10px',
          justifyContent: 'center',
          marginTop: '10px',
          maxWidth: '300px',
        }}
      >
        {data.map((item, idx) => {
          const isSelected = selectedFilter?.value === item.id || selectedFilter?.label === item.label;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSegment && onSelectSegment(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: isSelected ? '#0052CC' : '#42526E',
                fontWeight: isSelected ? 700 : 500,
                background: isSelected ? '#DEEBFF' : 'transparent',
                border: isSelected ? '1px solid #4C9AFF' : '1px solid transparent',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  display: 'inline-block',
                }}
              />
              <span>{item.label}</span>
              <span style={{ color: '#7A869A', fontWeight: 700 }}>({item.value})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// REPORT DEFINITIONS for the "More reports" modal
const REPORT_DEFINITIONS = [
  {
    id: 'burndown',
    title: 'Burndown Chart',
    description:
      'Track the total work remaining and project the likelihood of achieving the sprint goal. This helps your team manage its progress and respond accordingly.',
    icon: Flame,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="35" y="10" width="30" height="60" fill="#F4F5F7" />
        <rect x="95" y="10" width="30" height="60" fill="#F4F5F7" />
        {/* Grey guideline */}
        <line x1="10" y1="15" x2="150" y2="70" stroke="#7A869A" strokeWidth="2" />
        {/* Red actual line */}
        <path d="M 10 15 L 40 15 L 40 35 L 70 35 L 70 50 L 105 50 L 105 65 L 140 65" fill="none" stroke="#FF5630" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'burnup',
    title: 'Burnup Chart',
    description:
      'Track the total scope independently from the total work done. This helps your team manage its progress and better understand the effect of scope change.',
    icon: TrendingUp,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="50" y="10" width="35" height="60" fill="#F4F5F7" />
        {/* Orange scope line */}
        <path d="M 10 20 L 30 20 L 30 30 L 80 30 L 80 25 L 150 25" fill="none" stroke="#FF8B00" strokeWidth="2" />
        {/* Grey total line */}
        <path d="M 10 70 L 25 70 L 40 50 L 80 50 L 110 35 L 150 35" fill="none" stroke="#6554C0" strokeWidth="2" />
        {/* Green completed line */}
        <path d="M 10 70 L 30 70 L 30 60 L 80 60 L 110 50 L 150 50" fill="none" stroke="#36B37E" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'sprint',
    title: 'Sprint Report',
    description:
      'Understand the work completed or pushed back to the backlog in each sprint. This helps you determine if your team is overcommitting or if there is excessive scope creep.',
    icon: CheckCircle2,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="40" y="10" width="15" height="40" fill="#F4F5F7" />
        <path d="M 10 15 L 50 25 L 70 30 L 100 45" fill="none" stroke="#FF5630" strokeWidth="2" />
        {/* Table skeleton rows */}
        <rect x="10" y="55" width="140" height="4" rx="2" fill="#DFE1E6" />
        <rect x="10" y="63" width="120" height="4" rx="2" fill="#DFE1E6" />
        <rect x="10" y="71" width="90" height="4" rx="2" fill="#DFE1E6" />
      </svg>
    ),
  },
  {
    id: 'velocity',
    title: 'Velocity Chart',
    description:
      'Track the amount of work completed from sprint to sprint. This helps you determine your team\'s velocity and estimate the work your team can realistically achieve in future sprints.',
    icon: Zap,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="15" y="25" width="10" height="50" rx="2" fill="#6554C0" />
        <rect x="35" y="15" width="10" height="60" rx="2" fill="#6554C0" />
        <rect x="55" y="30" width="10" height="45" rx="2" fill="#6554C0" />
        <rect x="75" y="20" width="10" height="55" rx="2" fill="#6554C0" />
        <rect x="95" y="10" width="10" height="65" rx="2" fill="#6554C0" />
        <rect x="115" y="22" width="10" height="53" rx="2" fill="#6554C0" />
        <rect x="135" y="8" width="10" height="67" rx="2" fill="#8777D9" />
      </svg>
    ),
  },
  {
    id: 'cfd',
    title: 'Cumulative Flow Diagram',
    description:
      'Shows the statuses of issues over time. This helps you identify potential bottlenecks that need to be investigated.',
    icon: Layers,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <path d="M 10 75 Q 40 70 80 65 Q 120 60 150 55 L 150 75 Z" fill="#E3FCEF" stroke="#36B37E" strokeWidth="1.5" />
        <path d="M 10 55 Q 40 50 80 45 Q 120 40 150 35 L 150 55 Q 120 60 80 65 Q 40 70 10 75 Z" fill="#FFE380" stroke="#FFAB00" strokeWidth="1.5" />
        <path d="M 10 35 Q 40 30 80 25 Q 120 20 150 15 L 150 35 Q 120 40 80 45 Q 40 50 10 55 Z" fill="#EAE6FF" stroke="#6554C0" strokeWidth="1.5" />
        <path d="M 10 20 Q 40 15 80 12 Q 120 10 150 8 L 150 15 Q 120 20 80 25 Q 40 30 10 35 Z" fill="#DEEBFF" stroke="#0052CC" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'version',
    title: 'Version Report',
    description:
      'Track the projected release date for a version. This helps you monitor whether the version will release on time, so you can take action if work is falling behind.',
    icon: Clock,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="25" y="45" width="40" height="30" fill="#B3D4FF" />
        <rect x="65" y="30" width="35" height="45" fill="#4C9AFF" />
        <line x1="90" y1="10" x2="90" y2="75" stroke="#7A869A" strokeDasharray="3 3" />
        <line x1="10" y1="65" x2="150" y2="15" stroke="#0052CC" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'epic',
    title: 'Epic Report',
    description:
      'Understand the progress towards completing one Epic over time. This helps you manage your team\'s progress by tracking the remaining work.',
    icon: Activity,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="20" y="60" width="30" height="15" fill="#B3D4FF" />
        <rect x="50" y="45" width="30" height="30" fill="#4C9AFF" />
        <rect x="80" y="30" width="30" height="45" fill="#0052CC" />
        <rect x="110" y="15" width="30" height="60" fill="#0747A6" />
      </svg>
    ),
  },
  {
    id: 'control',
    title: 'Control Chart',
    description:
      'Shows the cycle time for your product, version or sprint. This helps you identify whether data from the current process can be used to determine future performance.',
    icon: Activity,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <line x1="10" y1="20" x2="150" y2="20" stroke="#DFE1E6" />
        <line x1="10" y1="40" x2="150" y2="40" stroke="#FF5630" strokeWidth="1.5" />
        <line x1="10" y1="60" x2="150" y2="60" stroke="#DFE1E6" />
        <path d="M 10 42 L 35 30 L 65 52 L 95 38 L 125 45 L 150 32" fill="none" stroke="#4C9AFF" strokeWidth="2" />
        <circle cx="35" cy="30" r="3" fill="#36B37E" />
        <circle cx="65" cy="52" r="3" fill="#36B37E" />
        <circle cx="95" cy="38" r="3" fill="#36B37E" />
        <circle cx="125" cy="45" r="3" fill="#36B37E" />
      </svg>
    ),
  },
  {
    id: 'epic_burndown',
    title: 'Epic Burndown',
    description:
      'Track the projected number of sprints required to complete your Epic (optimized for Scrum). This helps you monitor whether your team is on track.',
    icon: Flame,
    renderPreview: () => (
      <svg width="100%" height="80" viewBox="0 0 160 80" style={{ overflow: 'hidden' }}>
        <rect x="15" y="20" width="14" height="55" fill="#4C9AFF" />
        <rect x="35" y="30" width="14" height="45" fill="#4C9AFF" />
        <rect x="55" y="40" width="14" height="35" fill="#4C9AFF" />
        <rect x="55" y="25" width="14" height="15" fill="#36B37E" />
        <rect x="75" y="50" width="14" height="25" fill="#4C9AFF" />
        <rect x="75" y="35" width="14" height="15" fill="#36B37E" />
        <rect x="95" y="58" width="14" height="17" fill="#4C9AFF" />
        <rect x="115" y="65" width="14" height="10" fill="#4C9AFF" />
      </svg>
    ),
  },
];

export const ReportsView = () => {
  const { currentProject, sprints, refreshKey, setSelectedIssueId } = useProject();
  const { users } = useAuth();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active View: 'overview' or a specific report ID e.g. 'burndown', 'velocity', 'cfd', etc.
  const [activeReportView, setActiveReportView] = useState('overview');
  const [selectedSprintId, setSelectedSprintId] = useState('all');

  // Active Click Filter (when clicking a card, donut slice, or legend)
  const [activeFilter, setActiveFilter] = useState(null);

  // More reports modal state
  const [isMoreReportsOpen, setIsMoreReportsOpen] = useState(false);

  // Table search, sorting & pagination state
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('key');
  const [sortDirection, setSortDirection] = useState('asc');
  const rowsPerPage = 10;

  // Real Database Metrics for Selected Sprint Scope
  const sprintScopedIssues = useMemo(() => {
    if (selectedSprintId === 'all' || !selectedSprintId) return issues;
    return issues.filter((i) => i.sprint_id === selectedSprintId);
  }, [issues, selectedSprintId]);

  const totalSprintPoints = useMemo(() => {
    return sprintScopedIssues.reduce((acc, i) => acc + (i.story_points || 1), 0);
  }, [sprintScopedIssues]);

  const completedSprintPoints = useMemo(() => {
    return sprintScopedIssues
      .filter((i) => i.status === 'done')
      .reduce((acc, i) => acc + (i.story_points || 1), 0);
  }, [sprintScopedIssues]);

  const remainingSprintPoints = useMemo(() => {
    return Math.max(0, totalSprintPoints - completedSprintPoints);
  }, [totalSprintPoints, completedSprintPoints]);

  // Velocity data per sprint from real sprints collection
  const velocitySprintData = useMemo(() => {
    if (!sprints || sprints.length === 0) return [];
    return sprints.map((s) => {
      const sIssues = issues.filter((i) => i.sprint_id === s.id);
      const committed = sIssues.reduce((acc, i) => acc + (i.story_points || 1), 0);
      const completed = sIssues
        .filter((i) => i.status === 'done')
        .reduce((acc, i) => acc + (i.story_points || 1), 0);
      return {
        name: s.name,
        committed,
        completed,
      };
    });
  }, [sprints, issues]);

  useEffect(() => {
    const fetchProjectIssues = async () => {
      if (!currentProject) return;
      try {
        setLoading(true);
        const data = await issuesApi.list({ project_id: currentProject.id });
        setIssues(data || []);
      } catch (err) {
        console.error('Failed to load report issues', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjectIssues();
  }, [currentProject?.id, refreshKey]);

  // 1. Top Cards Calculations (7-Day window)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const completedLast7DaysList = useMemo(() => {
    return issues.filter((i) => {
      if (i.status !== 'done') return false;
      const updated = new Date(i.updated_at || i.created_at || 0);
      return updated >= sevenDaysAgo && updated <= now;
    });
  }, [issues, sevenDaysAgo, now]);

  const updatedLast7DaysList = useMemo(() => {
    return issues.filter((i) => {
      const updated = new Date(i.updated_at || i.created_at || 0);
      return updated >= sevenDaysAgo && updated <= now;
    });
  }, [issues, sevenDaysAgo, now]);

  const createdLast7DaysList = useMemo(() => {
    return issues.filter((i) => {
      const created = new Date(i.created_at || 0);
      return created >= sevenDaysAgo && created <= now;
    });
  }, [issues, sevenDaysAgo, now]);

  const dueNext7DaysList = useMemo(() => {
    return issues.filter((i) => {
      if (!i.due_date) return false;
      const due = new Date(i.due_date);
      return due >= now && due <= sevenDaysAhead;
    });
  }, [issues, sevenDaysAhead, now]);

  // 2. Donut Data: By Status
  const statusData = useMemo(() => {
    const map = {
      todo: { id: 'todo', label: 'To Do', color: '#4C9AFF', value: 0 },
      inprogress: { id: 'inprogress', label: 'Dev In-Progress', color: '#6554C0', value: 0 },
      inreview: { id: 'inreview', label: 'Ready for QA', color: '#36B37E', value: 0 },
      done: { id: 'done', label: 'QA Completed / Done', color: '#0052CC', value: 0 },
    };

    issues.forEach((i) => {
      const st = (i.status || 'todo').toLowerCase();
      if (map[st]) {
        map[st].value += 1;
      } else {
        map.todo.value += 1;
      }
    });

    return Object.values(map);
  }, [issues]);

  // 3. Donut Data: By Type
  const typeData = useMemo(() => {
    const map = {
      story: { id: 'story', label: 'Story', color: '#36B37E', value: 0 },
      task: { id: 'task', label: 'Task', color: '#4C9AFF', value: 0 },
      bug: { id: 'bug', label: 'Bug', color: '#FF5630', value: 0 },
      epic: { id: 'epic', label: 'Epic', color: '#6554C0', value: 0 },
    };

    issues.forEach((i) => {
      const t = (i.type || 'story').toLowerCase();
      if (map[t]) map[t].value += 1;
      else map.story.value += 1;
    });

    return Object.values(map);
  }, [issues]);

  // 4. Donut Data: By Assignee
  const assigneeData = useMemo(() => {
    const map = {
      unassigned: { id: 'unassigned', label: 'Unassigned', color: '#36B37E', value: 0 },
    };

    const colors = ['#0052CC', '#6554C0', '#FFAB00', '#00875A', '#FF5630', '#00B8D9', '#5243AA'];
    let colorIdx = 0;

    issues.forEach((i) => {
      if (!i.assignee_id || !i.assignee) {
        map.unassigned.value += 1;
      } else {
        const id = i.assignee_id;
        if (!map[id]) {
          map[id] = {
            id: id,
            label: i.assignee.name || 'Member',
            color: colors[colorIdx % colors.length],
            value: 0,
          };
          colorIdx++;
        }
        map[id].value += 1;
      }
    });

    return Object.values(map);
  }, [issues]);

  // 5. Completion Trend Data (Monthly grouping)
  const completionMonths = useMemo(() => {
    const grouped = {};
    const months = ['2026-06', '2026-07', '2026-08', '2026-09'];
    months.forEach((m) => {
      grouped[m] = { month: m, epic: 0, story: 0, task: 0, bug: 0, total: 0 };
    });

    issues.forEach((i) => {
      const d = new Date(i.created_at || now);
      const mStr = d.toISOString().slice(0, 7);
      if (!grouped[mStr]) {
        grouped[mStr] = { month: mStr, epic: 0, story: 0, task: 0, bug: 0, total: 0 };
      }
      const t = (i.type || 'story').toLowerCase();
      if (grouped[mStr][t] !== undefined) {
        grouped[mStr][t] += 1;
      } else {
        grouped[mStr].story += 1;
      }
      grouped[mStr].total += 1;
    });

    return Object.values(grouped).slice(-4);
  }, [issues]);

  // 6. Filtered Table Rows based on Search + Active Click Filter
  const filteredTableIssues = useMemo(() => {
    let list = [...issues];

    if (activeFilter) {
      if (activeFilter.type === 'completedLast7') {
        list = completedLast7DaysList;
      } else if (activeFilter.type === 'updatedLast7') {
        list = updatedLast7DaysList;
      } else if (activeFilter.type === 'createdLast7') {
        list = createdLast7DaysList;
      } else if (activeFilter.type === 'dueNext7') {
        list = dueNext7DaysList;
      } else if (activeFilter.type === 'status') {
        list = list.filter((i) => (i.status || 'todo').toLowerCase() === activeFilter.value.toLowerCase());
      } else if (activeFilter.type === 'issueType') {
        list = list.filter((i) => (i.type || 'story').toLowerCase() === activeFilter.value.toLowerCase());
      } else if (activeFilter.type === 'assignee') {
        if (activeFilter.value === 'unassigned') {
          list = list.filter((i) => !i.assignee_id && !i.assignee);
        } else {
          list = list.filter((i) => i.assignee_id === activeFilter.value);
        }
      }
    }

    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (i) =>
          i.summary?.toLowerCase().includes(q) ||
          i.key?.toLowerCase().includes(q) ||
          i.type?.toLowerCase().includes(q) ||
          i.priority?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA = (a[sortField] || '').toString().toLowerCase();
      let valB = (b[sortField] || '').toString().toLowerCase();
      if (sortField === 'key') {
        valA = a.key || '';
        valB = b.key || '';
      }
      if (sortDirection === 'asc') return valA.localeCompare(valB, undefined, { numeric: true });
      return valB.localeCompare(valA, undefined, { numeric: true });
    });

    return list;
  }, [
    issues,
    activeFilter,
    tableSearch,
    sortField,
    sortDirection,
    completedLast7DaysList,
    updatedLast7DaysList,
    createdLast7DaysList,
    dueNext7DaysList,
  ]);

  const totalPages = Math.ceil(filteredTableIssues.length / rowsPerPage) || 1;
  const paginatedIssues = filteredTableIssues.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalIssuesCount = issues.length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    const headers = ['Work item key', 'Work type', 'Work item priority', 'Status', 'Assignee', 'Issue summary'];
    const rows = filteredTableIssues.map((i) => [
      i.key,
      i.type,
      i.priority || 'medium',
      i.status || 'todo',
      i.assignee?.name || 'Unassigned',
      `"${(i.summary || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentProject?.key || 'Jira'}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selected specific report definition (if not in overview)
  const currentReportObj = REPORT_DEFINITIONS.find((r) => r.id === activeReportView);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FAFBFC', minHeight: '100%', padding: '20px 28px 40px 28px' }}>
      {/* 1. Header & Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5E6C84' }}>
            <span>Projects</span>
            <span>/</span>
            <span>{currentProject?.name || 'Workspace'}</span>
            <span>/</span>
            <span
              style={{ fontWeight: 600, color: '#0052CC', cursor: 'pointer' }}
              onClick={() => setActiveReportView('overview')}
            >
              Reports
            </span>
            {currentReportObj && (
              <>
                <span>/</span>
                <span style={{ fontWeight: 600, color: '#172B4D' }}>{currentReportObj.title}</span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
              {currentReportObj
                ? currentReportObj.title
                : currentProject
                ? `${currentProject.key} Reports & Analytics`
                : 'Project Reports'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeReportView !== 'overview' && (
            <button
              onClick={() => setActiveReportView('overview')}
              className="jira-btn jira-btn-ghost"
              style={{
                border: '1px solid #DFE1E6',
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RotateCcw size={14} color="#5E6C84" />
              <span>Back to Overview</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="jira-btn jira-btn-ghost"
            style={{
              border: '1px solid #DFE1E6',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Export filtered table to CSV"
          >
            <Download size={14} color="#5E6C84" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsMoreReportsOpen(true)}
            className="jira-btn jira-btn-ghost"
            style={{
              border: '1px solid #DFE1E6',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BarChart2 size={14} color="#0052CC" />
            <span>More reports</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CASE A: DETAILED SINGLE REPORT VIEW (e.g. Burndown, Velocity, CFD, etc.) */}
      {/* ========================================================================= */}
      {activeReportView !== 'overview' && currentReportObj ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DFE1E6',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
            }}
          >
            {/* Dynamic Controls Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #DFE1E6', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: '0 0 6px 0' }}>
                  {currentReportObj.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#5E6C84', margin: 0, maxWidth: '700px' }}>
                  {currentReportObj.description}
                </p>
              </div>

              {/* Sprint / Epic Filter Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>Sprint / Scope:</span>
                <select
                  value={selectedSprintId || 'all'}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #DFE1E6',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#172B4D',
                    backgroundColor: '#FAFBFC',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Project Sprints ({issues.length} issues)</option>
                  {(sprints || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Metrics Bar for Selected Report Scope */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                backgroundColor: '#FAFBFC',
                padding: '12px 16px',
                borderRadius: '6px',
                border: '1px solid #DFE1E6',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Story Points
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#172B4D', marginTop: '2px' }}>
                  {totalSprintPoints} pts
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#00875A', fontWeight: 600, textTransform: 'uppercase' }}>
                  Completed Points
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#00875A', marginTop: '2px' }}>
                  {completedSprintPoints} pts ({totalSprintPoints > 0 ? Math.round((completedSprintPoints / totalSprintPoints) * 100) : 0}%)
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#FF5630', fontWeight: 600, textTransform: 'uppercase' }}>
                  Remaining Points
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF5630', marginTop: '2px' }}>
                  {remainingSprintPoints} pts
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#0052CC', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Issues in Scope
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0052CC', marginTop: '2px' }}>
                  {sprintScopedIssues.length} tickets
                </div>
              </div>
            </div>

            {/* Render Detailed Chart Representation */}
            <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {activeReportView === 'burndown' && (
                <div style={{ position: 'relative', width: '100%' }}>
                  <svg width="100%" height="280" viewBox="0 0 800 280" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="40" y1="40" x2="780" y2="40" stroke="#EBECF0" />
                    <line x1="40" y1="100" x2="780" y2="100" stroke="#EBECF0" />
                    <line x1="40" y1="160" x2="780" y2="160" stroke="#EBECF0" />
                    <line x1="40" y1="220" x2="780" y2="220" stroke="#EBECF0" />
                    {/* Sprint Days Shading */}
                    <rect x="180" y="40" width="80" height="200" fill="#FAFBFC" />
                    <rect x="360" y="40" width="80" height="200" fill="#FAFBFC" />
                    <rect x="540" y="40" width="80" height="200" fill="#FAFBFC" />
                    {/* Guideline (Story Points Remaining) */}
                    <line x1="40" y1="40" x2="760" y2="240" stroke="#7A869A" strokeWidth="2.5" strokeDasharray="5 5" />
                    {/* Actual Burndown Polyline based on real remaining points */}
                    <polyline
                      fill="none"
                      stroke="#FF5630"
                      strokeWidth="3.5"
                      points={`40,40 160,${40 + (200 * (totalSprintPoints - Math.min(totalSprintPoints, completedSprintPoints * 0.2))) / Math.max(1, totalSprintPoints)} 360,${40 + (200 * (totalSprintPoints - Math.min(totalSprintPoints, completedSprintPoints * 0.5))) / Math.max(1, totalSprintPoints)} 540,${40 + (200 * remainingSprintPoints) / Math.max(1, totalSprintPoints)} 760,${40 + (200 * remainingSprintPoints) / Math.max(1, totalSprintPoints)}`}
                    />
                    {/* Data Points */}
                    <circle cx="40" cy="40" r="5" fill="#FF5630" />
                    <circle cx="760" cy={`${40 + (200 * remainingSprintPoints) / Math.max(1, totalSprintPoints)}`} r="6" fill="#FF5630" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', fontSize: '12px', color: '#5E6C84', fontWeight: 600 }}>
                    <span>Sprint Start ({totalSprintPoints} pts)</span>
                    <span>Sprint Midpoint</span>
                    <span>Current / End ({remainingSprintPoints} pts remaining)</span>
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 14, height: 3, backgroundColor: '#7A869A', display: 'inline-block' }} />
                      <span>Guideline</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 14, height: 3, backgroundColor: '#FF5630', display: 'inline-block' }} />
                      <span>Actual Remaining ({remainingSprintPoints} pts)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeReportView === 'velocity' && (
                <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '240px', borderBottom: '1px solid #DFE1E6', paddingBottom: '4px' }}>
                    {velocitySprintData.length === 0 ? (
                      <div style={{ color: '#7A869A', fontSize: '13px', margin: 'auto' }}>
                        No sprint history found. Create sprints in Backlog to see velocity trends.
                      </div>
                    ) : (
                      velocitySprintData.map((sData, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                            {/* Committed bar */}
                            <div
                              style={{
                                width: '28px',
                                height: `${Math.min(200, Math.max(10, sData.committed * 8))}px`,
                                backgroundColor: '#998DD9',
                                borderRadius: '4px 4px 0 0',
                              }}
                              title={`Committed: ${sData.committed} pts`}
                            />
                            {/* Completed bar */}
                            <div
                              style={{
                                width: '28px',
                                height: `${Math.min(200, Math.max(10, sData.completed * 8))}px`,
                                backgroundColor: '#6554C0',
                                borderRadius: '4px 4px 0 0',
                              }}
                              title={`Completed: ${sData.completed} pts`}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#172B4D', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sData.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 12, height: 12, backgroundColor: '#998DD9', borderRadius: '2px' }} />
                      <span>Commitment</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 12, height: 12, backgroundColor: '#6554C0', borderRadius: '2px' }} />
                      <span>Completed</span>
                    </div>
                  </div>
                </div>
              )}

              {activeReportView === 'cfd' && (
                <div style={{ position: 'relative', width: '100%' }}>
                  <svg width="100%" height="240" viewBox="0 0 800 240" preserveAspectRatio="none">
                    <path d="M 0 240 Q 200 220 400 200 Q 600 180 800 160 L 800 240 Z" fill="#E3FCEF" stroke="#36B37E" strokeWidth="2" />
                    <path d="M 0 180 Q 200 160 400 140 Q 600 120 800 100 L 800 160 Q 600 180 400 200 Q 200 220 0 240 Z" fill="#FFE380" stroke="#FFAB00" strokeWidth="2" />
                    <path d="M 0 120 Q 200 100 400 80 Q 600 60 800 40 L 800 100 Q 600 120 400 140 Q 200 160 0 180 Z" fill="#EAE6FF" stroke="#6554C0" strokeWidth="2" />
                    <path d="M 0 60 Q 200 45 400 35 Q 600 25 800 15 L 800 40 Q 600 60 400 80 Q 200 100 0 120 Z" fill="#DEEBFF" stroke="#0052CC" strokeWidth="2" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 10, height: 10, backgroundColor: '#0052CC', borderRadius: '2px' }} />
                      To Do ({issues.filter((i) => i.status === 'todo').length})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 10, height: 10, backgroundColor: '#6554C0', borderRadius: '2px' }} />
                      In Progress ({issues.filter((i) => i.status === 'inprogress').length})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 10, height: 10, backgroundColor: '#FFAB00', borderRadius: '2px' }} />
                      In Review / QA ({issues.filter((i) => i.status === 'inreview').length})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 10, height: 10, backgroundColor: '#36B37E', borderRadius: '2px' }} />
                      Done ({issues.filter((i) => i.status === 'done').length})
                    </span>
                  </div>
                </div>
              )}

              {activeReportView === 'sprint' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                    Completed Issues in this Sprint ({sprintScopedIssues.filter((i) => i.status === 'done').length})
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF5630', marginTop: '10px' }}>
                    Issues Not Completed ({sprintScopedIssues.filter((i) => i.status !== 'done').length})
                  </div>
                </div>
              )}

              {['burnup', 'version', 'epic', 'control', 'epic_burndown'].includes(activeReportView) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                  <div style={{ maxWidth: '480px', width: '100%', padding: '24px', backgroundColor: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px' }}>
                    {currentReportObj.renderPreview()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE B: DEFAULT REPORTS DASHBOARD (Overview with 4 Cards, Donuts, Trends) */
        /* ========================================================================= */
        <>
          {/* ACTIVE FILTER BADGE BANNER */}
          {activeFilter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#DEEBFF',
                border: '1px solid #B3D4FF',
                borderRadius: '6px',
                padding: '8px 16px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#0747A6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={14} />
                <span>
                  Filtered by: <strong>{activeFilter.label}</strong> ({filteredTableIssues.length} issues)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0747A6',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                }}
              >
                <X size={14} />
                <span>Clear filter</span>
              </button>
            </div>
          )}

          {/* 1. TOP 4 METRICS SUMMARY CARDS */}
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
              onClick={() =>
                setActiveFilter(
                  activeFilter?.type === 'completedLast7'
                    ? null
                    : { type: 'completedLast7', label: 'Completed in the last 7 days' }
                )
              }
              style={{
                backgroundColor: '#FFFFFF',
                border: activeFilter?.type === 'completedLast7' ? '2px solid #00875A' : '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#E3FCEF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} color="#00875A" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
                  {completedLast7DaysList.length} work items
                </div>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                  completed in the last 7 days
                </div>
              </div>
            </div>

            {/* Card 2: Updated */}
            <div
              onClick={() =>
                setActiveFilter(
                  activeFilter?.type === 'updatedLast7'
                    ? null
                    : { type: 'updatedLast7', label: 'Updated in the last 7 days' }
                )
              }
              style={{
                backgroundColor: '#FFFFFF',
                border: activeFilter?.type === 'updatedLast7' ? '2px solid #0052CC' : '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#DEEBFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={20} color="#0052CC" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
                  {updatedLast7DaysList.length} work items
                </div>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                  updated in the last 7 days
                </div>
              </div>
            </div>

            {/* Card 3: Created */}
            <div
              onClick={() =>
                setActiveFilter(
                  activeFilter?.type === 'createdLast7'
                    ? null
                    : { type: 'createdLast7', label: 'Created in the last 7 days' }
                )
              }
              style={{
                backgroundColor: '#FFFFFF',
                border: activeFilter?.type === 'createdLast7' ? '2px solid #42526E' : '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#F4F5F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PlusCircle size={20} color="#42526E" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
                  {createdLast7DaysList.length} work items
                </div>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                  created in the last 7 days
                </div>
              </div>
            </div>

            {/* Card 4: Due */}
            <div
              onClick={() =>
                setActiveFilter(
                  activeFilter?.type === 'dueNext7'
                    ? null
                    : { type: 'dueNext7', label: 'Due in the next 7 days' }
                )
              }
              style={{
                backgroundColor: '#FFFFFF',
                border: activeFilter?.type === 'dueNext7' ? '2px solid #FF5630' : '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#FFEBE6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Calendar size={20} color="#FF5630" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>
                  {dueNext7DaysList.length} work items
                </div>
                <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '2px' }}>
                  due in the next 7 days
                </div>
              </div>
            </div>
          </div>

          {/* 2. THREE DONUT DISTRIBUTION CHARTS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            {/* Donut 1: By Status */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: '0 0 16px 0' }}>
                Work items by status
              </h3>
              <DonutChart
                data={statusData}
                totalValue={totalIssuesCount}
                selectedFilter={activeFilter?.type === 'status' ? activeFilter : null}
                onSelectSegment={(seg) =>
                  setActiveFilter(
                    activeFilter?.type === 'status' && activeFilter.value === seg.id
                      ? null
                      : { type: 'status', value: seg.id, label: `Status: ${seg.label}` }
                  )
                }
              />
            </div>

            {/* Donut 2: By Type */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: '0 0 16px 0' }}>
                Work items by type
              </h3>
              <DonutChart
                data={typeData}
                totalValue={totalIssuesCount}
                selectedFilter={activeFilter?.type === 'issueType' ? activeFilter : null}
                onSelectSegment={(seg) =>
                  setActiveFilter(
                    activeFilter?.type === 'issueType' && activeFilter.value === seg.id
                      ? null
                      : { type: 'issueType', value: seg.id, label: `Type: ${seg.label}` }
                  )
                }
              />
            </div>

            {/* Donut 3: By Assignee */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: '0 0 16px 0' }}>
                Work items by assignee
              </h3>
              <DonutChart
                data={assigneeData}
                totalValue={totalIssuesCount}
                selectedFilter={activeFilter?.type === 'assignee' ? activeFilter : null}
                onSelectSegment={(seg) =>
                  setActiveFilter(
                    activeFilter?.type === 'assignee' && activeFilter.value === seg.id
                      ? null
                      : { type: 'assignee', value: seg.id, label: `Assignee: ${seg.label}` }
                  )
                }
              />
            </div>
          </div>

          {/* 3. TRENDS & VELOCITY CHARTS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            {/* Creation Trend Chart */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: '0 0 16px 0' }}>
                Work item creation trend
              </h3>
              <div style={{ height: '220px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <svg width="100%" height="180" viewBox="0 0 400 160" preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#EBECF0" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#EBECF0" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="400" y2="140" stroke="#EBECF0" />
                  <polyline
                    fill="none"
                    stroke="#0052CC"
                    strokeWidth="3"
                    points="10,130 100,110 200,60 300,75 390,30"
                  />
                  <circle cx="10" cy="130" r="4" fill="#0052CC" />
                  <circle cx="100" cy="110" r="4" fill="#0052CC" />
                  <circle cx="200" cy="60" r="4" fill="#0052CC" />
                  <circle cx="300" cy="75" r="4" fill="#0052CC" />
                  <circle cx="390" cy="30" r="4" fill="#0052CC" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A869A', marginTop: '6px' }}>
                  <span>Sprint 1</span>
                  <span>Sprint 2</span>
                  <span>Sprint 3</span>
                  <span>Sprint 4</span>
                  <span>Current</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#5E6C84', marginTop: '4px' }}>
                  Work item creation date
                </div>
              </div>
            </div>

            {/* Completion Trend (Stacked Bars) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
                  Work item completion trend
                </h3>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#5E6C84' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 8, height: 8, backgroundColor: '#0052CC', borderRadius: '2px' }} />
                    Epic
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 8, height: 8, backgroundColor: '#36B37E', borderRadius: '2px' }} />
                    Story
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 8, height: 8, backgroundColor: '#6554C0', borderRadius: '2px' }} />
                    Task
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 8, height: 8, backgroundColor: '#FFAB00', borderRadius: '2px' }} />
                    Bug
                  </span>
                </div>
              </div>

              {/* Stacked Bars */}
              <div style={{ height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', borderBottom: '1px solid #DFE1E6', paddingBottom: '2px' }}>
                  {completionMonths.map((m, idx) => {
                    const height = Math.min(160, Math.max(30, m.total * 25));
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: `${height}px`,
                            borderRadius: '4px 4px 0 0',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column-reverse',
                          }}
                        >
                          <div style={{ height: '20%', backgroundColor: '#0052CC' }} title="Epic" />
                          <div style={{ height: '45%', backgroundColor: '#36B37E' }} title="Story" />
                          <div style={{ height: '20%', backgroundColor: '#6554C0' }} title="Task" />
                          <div style={{ height: '15%', backgroundColor: '#FFAB00' }} title="Bug" />
                        </div>
                        <span style={{ fontSize: '11px', color: '#5E6C84', marginTop: '6px' }}>{m.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#5E6C84', marginTop: '4px' }}>
                  Work item resolution date
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 4. WORK ITEM DETAILS TABLE (Always visible for full drill-down) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            Work item details
          </h3>

          {/* Search in Table */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={14}
              color="#7A869A"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search table"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="jira-input"
              style={{ paddingLeft: '30px', height: '32px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F5F7', borderBottom: '1px solid #DFE1E6', color: '#5E6C84' }}>
              <th
                onClick={() => handleSort('key')}
                style={{ padding: '10px 14px', fontWeight: 700, width: '130px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Work item key</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSort('type')}
                style={{ padding: '10px 14px', fontWeight: 700, width: '130px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Work type</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSort('priority')}
                style={{ padding: '10px 14px', fontWeight: 700, width: '150px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Work item priority</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSort('summary')}
                style={{ padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Issue summary</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedIssues.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#7A869A' }}>
                  No work items match your current filter or query.
                </td>
              </tr>
            ) : (
              paginatedIssues.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  style={{
                    borderBottom: '1px solid #EBECF0',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFBFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0052CC' }}>{issue.key}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <IssueTypeBadge type={issue.type} showLabel={true} size={14} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <PriorityBadge priority={issue.priority || 'medium'} showLabel={true} size={14} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#172B4D', fontWeight: 500 }}>
                    {issue.summary}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            fontSize: '12px',
            color: '#5E6C84',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="jira-btn jira-btn-ghost"
              style={{ padding: '4px 8px', border: '1px solid #DFE1E6', fontSize: '12px' }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => setCurrentPage(pNum)}
                className="jira-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  backgroundColor: currentPage === pNum ? '#0052CC' : '#FFFFFF',
                  color: currentPage === pNum ? '#FFFFFF' : '#172B4D',
                  border: '1px solid #DFE1E6',
                  fontWeight: currentPage === pNum ? 700 : 500,
                }}
              >
                {pNum}
              </button>
            ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="jira-btn jira-btn-ghost"
              style={{ padding: '4px 8px', border: '1px solid #DFE1E6', fontSize: '12px' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div>
            Showing rows {(currentPage - 1) * rowsPerPage + 1}-
            {Math.min(currentPage * rowsPerPage, filteredTableIssues.length)} of{' '}
            {filteredTableIssues.length}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. "MORE REPORTS" MODAL DIALOG (Exact replica of Jira Reports Catalog)  */}
      {/* ========================================================================= */}
      {isMoreReportsOpen && (
        <div
          onClick={() => setIsMoreReportsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(9, 30, 66, 0.25)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
                More reports
              </h2>
              <button
                type="button"
                onClick={() => setIsMoreReportsOpen(false)}
                className="jira-btn-ghost"
                style={{ padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                <X size={20} color="#5E6C84" />
              </button>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: '12px 0 16px 0' }}>
              Agile
            </h3>

            {/* Reports Grid (3 Columns) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              {REPORT_DEFINITIONS.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setActiveReportView(report.id);
                    setIsMoreReportsOpen(false);
                  }}
                  style={{
                    border: '1px solid #DFE1E6',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(9, 30, 66, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#DFE1E6';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Visual Chart Thumbnail Container */}
                  <div
                    style={{
                      height: '95px',
                      backgroundColor: '#FFFFFF',
                      borderBottom: '1px solid #EBECF0',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {report.renderPreview()}
                  </div>

                  {/* Text Details */}
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                      {report.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#5E6C84', lineHeight: 1.45 }}>
                      {report.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
