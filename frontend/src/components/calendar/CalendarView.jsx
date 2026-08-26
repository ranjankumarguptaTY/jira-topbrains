import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Sliders,
  X,
  Plus,
  Filter,
  Check,
  User,
  Bookmark,
  CheckSquare,
  AlertCircle,
  Zap,
  Layers,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { issuesApi } from '../../api/issues';
import { Avatar } from '../common/Avatar';
import { IssueTypeBadge } from '../common/IssueTypeBadge';
import { StatusBadge } from '../common/StatusBadge';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarView = () => {
  const {
    currentProject,
    refreshKey,
    refreshBoard,
    setSelectedIssueId,
    setIsCreateModalOpen,
  } = useProject();

  const { users, currentUser } = useAuth();
  const { showToast } = useModal();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar Date State (default to current date)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

  // Side Panel State
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(true);
  const [unscheduledSearch, setUnscheduledSearch] = useState('');
  const [unscheduledSort, setUnscheduledSort] = useState('recent'); // 'recent' | 'priority' | 'key'

  // Toolbar Filters State
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Active Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null); // 'assignee' | 'type' | 'status' | 'viewMode'

  // Dragging issue state
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  // Load project issues
  const fetchIssues = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await issuesApi.list({ project_id: currentProject.id });
      setIssues(data || []);
    } catch (err) {
      console.error('Failed to load calendar issues', err);
      showToast({ message: 'Failed to load calendar issues: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [currentProject?.id, refreshKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleWindowClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Filter issues for calendar display
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchSummary = issue.summary?.toLowerCase().includes(q);
        const matchKey = issue.key?.toLowerCase().includes(q);
        if (!matchSummary && !matchKey) return false;
      }
      if (selectedAssignee !== 'all') {
        if (issue.assignee_id !== selectedAssignee) return false;
      }
      if (selectedType !== 'all') {
        if (issue.type !== selectedType) return false;
      }
      if (selectedStatus !== 'all') {
        if ((issue.status || 'todo').toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }
      return true;
    });
  }, [issues, searchFilter, selectedAssignee, selectedType, selectedStatus]);

  // Unscheduled issues list (no due_date set)
  const unscheduledIssues = useMemo(() => {
    let list = filteredIssues.filter((i) => !i.due_date);
    if (unscheduledSearch) {
      const q = unscheduledSearch.toLowerCase();
      list = list.filter(
        (i) => i.summary?.toLowerCase().includes(q) || i.key?.toLowerCase().includes(q)
      );
    }
    if (unscheduledSort === 'priority') {
      const pWeights = { highest: 5, high: 4, medium: 3, low: 2, lowest: 1 };
      list.sort((a, b) => (pWeights[b.priority] || 3) - (pWeights[a.priority] || 3));
    } else if (unscheduledSort === 'key') {
      list.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
    } else {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return list;
  }, [filteredIssues, unscheduledSearch, unscheduledSort]);

  // Calendar Month Grid Generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Days in current month
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Day of week for 1st of month (0 = Sun, 1 = Mon ... 6 = Sat)
    // Convert to Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dateObj = new Date(year, month - 1, dayNum);
      const dateStr = dateObj.toISOString().split('T')[0];
      days.push({
        dateNumber: dayNum,
        dateString: dateStr,
        isCurrentMonth: false,
        dateObj,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateObj = new Date(year, month, dayNum);
      const dateStr = dateObj.toISOString().split('T')[0];
      days.push({
        dateNumber: dayNum,
        dateString: dateStr,
        isCurrentMonth: true,
        dateObj,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const dateObj = new Date(year, month + 1, dayNum);
      const dateStr = dateObj.toISOString().split('T')[0];
      days.push({
        dateNumber: dayNum,
        dateString: dateStr,
        isCurrentMonth: false,
        dateObj,
      });
    }

    return days;
  }, [currentDate]);

  // Map issues to date strings YYYY-MM-DD
  const issuesByDate = useMemo(() => {
    const map = {};
    filteredIssues.forEach((issue) => {
      if (issue.due_date) {
        try {
          const dStr = new Date(issue.due_date).toISOString().split('T')[0];
          if (!map[dStr]) map[dStr] = [];
          map[dStr].push(issue);
        } catch {}
      }
    });
    return map;
  }, [filteredIssues]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and Drop Handler: Drag issue to set due date
  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.setData('text/plain', issue.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!draggedIssue) return;

    const issueId = draggedIssue.id;
    const newDueDate = new Date(`${targetDateStr}T12:00:00Z`).toISOString();

    // Optimistic Update
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, due_date: newDueDate } : i))
    );

    try {
      await issuesApi.update(issueId, { due_date: newDueDate });
      refreshBoard();
      showToast({
        message: `${draggedIssue.key} scheduled for ${targetDateStr}`,
        type: 'success',
      });
    } catch (err) {
      showToast({ message: 'Failed to schedule issue: ' + err.message, type: 'error' });
      fetchIssues();
    } finally {
      setDraggedIssue(null);
    }
  };

  // Priority icon helper
  const renderPriorityIcon = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'highest' || p === 'high') {
      return <ArrowUp size={13} color="#FF5630" strokeWidth={3} />;
    }
    if (p === 'lowest' || p === 'low') {
      return <ArrowDown size={13} color="#0052CC" strokeWidth={3} />;
    }
    return <Minus size={13} color="#FFAB00" strokeWidth={3} />;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FAFBFC', minHeight: '100%' }}>
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div style={{ padding: '16px 24px 12px 24px', borderBottom: '1px solid #DFE1E6', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5E6C84' }}>
              <span>Projects</span>
              <span>/</span>
              <span>{currentProject?.name || 'Workspace'}</span>
              <span>/</span>
              <span style={{ fontWeight: 600, color: '#172B4D' }}>Calendar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
                {currentProject ? `${currentProject.key} board Calendar` : 'Calendar'}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="jira-btn jira-btn-primary"
              style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Create issue</span>
            </button>
          </div>
        </div>

        {/* 2. TOOLBAR (Search, Filters, Month Controls, Unscheduled Toggle) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Left Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '180px' }}>
              <Search
                size={14}
                color="#7A869A"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search cal..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="jira-input"
                style={{ paddingLeft: '30px', height: '32px', fontSize: '13px', backgroundColor: '#FAFBFC' }}
              />
            </div>

            {/* Assignee Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee');
                }}
                className="jira-btn jira-btn-ghost"
                style={{
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FFFFFF',
                  padding: '4px 10px',
                }}
              >
                <span>
                  {selectedAssignee === 'all'
                    ? 'Assignee'
                    : users.find((u) => u.id === selectedAssignee)?.name || 'Assignee'}
                </span>
                <ChevronDown size={14} color="#5E6C84" />
              </button>

              {activeDropdown === 'assignee' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    width: '180px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                    zIndex: 200,
                    padding: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssignee('all');
                      setActiveDropdown(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <span>All Assignees</span>
                    {selectedAssignee === 'all' && <Check size={14} color="#0052CC" />}
                  </button>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssignee(u.id);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name}
                      </span>
                      {selectedAssignee === u.id && <Check size={14} color="#0052CC" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'type' ? null : 'type');
                }}
                className="jira-btn jira-btn-ghost"
                style={{
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FFFFFF',
                  padding: '4px 10px',
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>
                  {selectedType === 'all' ? 'Type' : selectedType}
                </span>
                <ChevronDown size={14} color="#5E6C84" />
              </button>

              {activeDropdown === 'type' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    width: '150px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                    zIndex: 200,
                    padding: '4px',
                  }}
                >
                  {['all', 'story', 'task', 'bug', 'epic'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedType(t);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textTransform: 'capitalize',
                      }}
                    >
                      <span>{t}</span>
                      {selectedType === t && <Check size={14} color="#0052CC" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === 'status' ? null : 'status');
                }}
                className="jira-btn jira-btn-ghost"
                style={{
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #DFE1E6',
                  backgroundColor: '#FFFFFF',
                  padding: '4px 10px',
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>
                  {selectedStatus === 'all' ? 'Status' : selectedStatus}
                </span>
                <ChevronDown size={14} color="#5E6C84" />
              </button>

              {activeDropdown === 'status' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    width: '160px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DFE1E6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(9, 30, 66, 0.15)',
                    zIndex: 200,
                    padding: '4px',
                  }}
                >
                  {['all', 'todo', 'inprogress', 'inreview', 'done'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(st);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span>{st}</span>
                      {selectedStatus === st && <Check size={14} color="#0052CC" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Month Controls & Unscheduled Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleToday}
              className="jira-btn jira-btn-ghost"
              style={{
                fontSize: '13px',
                border: '1px solid #DFE1E6',
                backgroundColor: '#FFFFFF',
                padding: '4px 10px',
                fontWeight: 600,
              }}
            >
              Today
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #DFE1E6',
                borderRadius: '4px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Previous Month"
              >
                <ChevronLeft size={16} color="#5E6C84" />
              </button>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D', padding: '0 8px', minWidth: '90px', textAlign: 'center' }}>
                {MONTH_NAMES[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Next Month"
              >
                <ChevronRight size={16} color="#5E6C84" />
              </button>
            </div>

            {/* Toggle Unscheduled Work Panel */}
            <button
              type="button"
              onClick={() => setIsUnscheduledOpen(!isUnscheduledOpen)}
              className="jira-btn jira-btn-ghost"
              style={{
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: isUnscheduledOpen ? '1px solid #0052CC' : '1px solid #DFE1E6',
                backgroundColor: isUnscheduledOpen ? '#DEEBFF' : '#FFFFFF',
                color: isUnscheduledOpen ? '#0052CC' : '#42526E',
                padding: '4px 10px',
              }}
              title="Toggle Unscheduled work sidebar"
            >
              <CalendarIcon size={15} />
              <span>Unscheduled ({unscheduledIssues.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: CALENDAR GRID + UNSCHEDULED WORK SIDE PANEL */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* === CALENDAR GRID (LEFT) === */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px 20px' }}>
          {/* Day of Week Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid #DFE1E6',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px 6px 0 0',
              border: '1px solid #DFE1E6',
              borderBottomWidth: 0,
            }}
          >
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                style={{
                  padding: '10px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#5E6C84',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              border: '1px solid #DFE1E6',
              backgroundColor: '#FFFFFF',
              borderRadius: '0 0 6px 6px',
            }}
          >
            {calendarDays.map((day, idx) => {
              const dateIssues = issuesByDate[day.dateString] || [];
              const isToday = day.dateString === todayStr;
              const isDragOver = dragOverDate === day.dateString;

              return (
                <div
                  key={idx}
                  onDragOver={(e) => handleDragOver(e, day.dateString)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.dateString)}
                  style={{
                    minHeight: '110px',
                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #EBECF0',
                    borderBottom: '1px solid #EBECF0',
                    padding: '8px',
                    backgroundColor: isDragOver
                      ? '#E9F2FF'
                      : day.isCurrentMonth
                      ? '#FFFFFF'
                      : '#FAFBFC',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Date Number Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isToday ? 700 : 600,
                        color: isToday
                          ? '#FFFFFF'
                          : day.isCurrentMonth
                          ? '#172B4D'
                          : '#A5ADBA',
                        backgroundColor: isToday ? '#0052CC' : 'transparent',
                        width: isToday ? '22px' : 'auto',
                        height: isToday ? '22px' : 'auto',
                        borderRadius: isToday ? '50%' : '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {day.dateNumber}
                    </span>

                    {/* Quick Add Issue for this Date */}
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="jira-btn-ghost"
                      style={{
                        padding: '2px',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        opacity: 0.4,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.4)}
                      title={`Add issue due on ${day.dateString}`}
                    >
                      <Plus size={12} color="#5E6C84" />
                    </button>
                  </div>

                  {/* Scheduled Issues in this Date Cell */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    {dateIssues.map((issue) => (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue)}
                        onClick={() => setSelectedIssueId(issue.id)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #DFE1E6',
                          borderLeft: `3px solid ${
                            issue.status === 'done'
                              ? '#00875A'
                              : issue.status === 'inprogress'
                              ? '#0052CC'
                              : '#42526E'
                          }`,
                          borderRadius: '3px',
                          padding: '4px 6px',
                          fontSize: '11px',
                          cursor: 'grab',
                          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.06)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(9, 30, 66, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(9, 30, 66, 0.06)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <IssueTypeBadge type={issue.type} size={12} />
                          <span style={{ fontWeight: 700, color: '#0052CC', fontSize: '10px' }}>
                            {issue.key}
                          </span>
                        </div>
                        <div
                          style={{
                            color: '#172B4D',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '120px',
                          }}
                          title={issue.summary}
                        >
                          {issue.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* === UNSCHEDULED WORK SIDE PANEL (RIGHT) === */}
        {isUnscheduledOpen && (
          <aside
            style={{
              width: '320px',
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #DFE1E6',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              boxShadow: '-2px 0 8px rgba(9, 30, 66, 0.04)',
            }}
          >
            {/* Panel Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #DFE1E6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
                  Unscheduled work
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUnscheduledOpen(false)}
                  className="jira-btn-ghost"
                  style={{ padding: '4px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  title="Close panel"
                >
                  <X size={16} color="#5E6C84" />
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#5E6C84', margin: 0, lineHeight: 1.4 }}>
                Drag each work item onto the calendar to set a due date for the work.
              </p>

              {/* Search input in Unscheduled Panel */}
              <div style={{ marginTop: '12px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search unscheduled items"
                  value={unscheduledSearch}
                  onChange={(e) => setUnscheduledSearch(e.target.value)}
                  className="jira-input"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '12px',
                    backgroundColor: '#FAFBFC',
                  }}
                />
              </div>

              {/* Sort selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#5E6C84' }}>
                  <span>Sort by:</span>
                  <select
                    value={unscheduledSort}
                    onChange={(e) => setUnscheduledSort(e.target.value)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      background: 'transparent',
                      color: '#172B4D',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="recent">Most recent</option>
                    <option value="priority">Priority</option>
                    <option value="key">Key</option>
                  </select>
                </div>
                <span style={{ fontSize: '11px', color: '#7A869A', fontWeight: 600 }}>
                  {unscheduledIssues.length} items
                </span>
              </div>
            </div>

            {/* Unscheduled Cards List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unscheduledIssues.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#7A869A', fontSize: '13px' }}>
                  No unscheduled issues found. All tickets have been scheduled or completed!
                </div>
              ) : (
                unscheduledIssues.map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    onClick={() => setSelectedIssueId(issue.id)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DFE1E6',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      cursor: 'grab',
                      boxShadow: '0 1px 3px rgba(9, 30, 66, 0.06)',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(9, 30, 66, 0.12)';
                      e.currentTarget.style.borderColor = '#4C9AFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(9, 30, 66, 0.06)';
                      e.currentTarget.style.borderColor = '#DFE1E6';
                    }}
                  >
                    {/* Top row: Summary + Assignee */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#172B4D',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {issue.summary}
                      </div>
                      {issue.assignee && <Avatar user={issue.assignee} size="sm" />}
                    </div>

                    {/* Bottom row: Type Icon + Key + Status badge + Priority arrow */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IssueTypeBadge type={issue.type} size={14} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84' }}>
                          {issue.key}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge status={issue.status} size="sm" />
                        {renderPriorityIcon(issue.priority)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
