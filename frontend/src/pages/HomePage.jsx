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
  Building,
  Radio,
  Briefcase,
  ShieldCheck,
  Layers,
  Calendar,
  Activity,
  Check,
  Eye,
  ExternalLink,
  ChevronRight,
  PieChart,
  Hash,
  Send,
  Search,
  ChevronLeft,
  Filter,
  Tag,
} from 'lucide-react';
import { issuesAPI, projectsAPI, teamsAPI, orgAPI, authAPI } from '../services/api';
import './HomePage.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { currentOrg, switchOrg, userOrgs } = useAuth();
  const [range, setRange] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrgModal, setSelectedOrgModal] = useState(null);
  const [orgTeams, setOrgTeams] = useState([]);
  const [orgProjects, setOrgProjects] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [loadingOrgDetails, setLoadingOrgDetails] = useState(false);

  // Paginated Card Detail View Modal
  const [cardModalType, setCardModalType] = useState(null); // 'orgs', 'users', 'projects', 'teams', 'issues'
  const [cardModalData, setCardModalData] = useState([]);
  const [cardModalLoading, setCardModalLoading] = useState(false);
  const [cardModalPage, setCardModalPage] = useState(1);
  const [cardModalSearch, setCardModalSearch] = useState('');
  const cardModalPageSize = 8;

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState('all'); // 'all' or orgId
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Refetch analytics when range OR currentOrg changes
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await orgAPI.getPlatformAnalytics(range, currentOrg?.id || null);
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load platform analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [range, currentOrg]);

  const handleOpenOrgDetails = async (org) => {
    setSelectedOrgModal(org);
    setLoadingOrgDetails(true);
    try {
      const [teamsRes, projsRes, membersRes] = await Promise.all([
        teamsAPI.list(org.id),
        projectsAPI.list({ org_id: org.id }),
        orgAPI.listMembers(org.id),
      ]);
      setOrgTeams(teamsRes.data || []);
      setOrgProjects(projsRes.data || []);
      setOrgMembers(membersRes.data || []);
    } catch (err) {
      console.error('Failed to load organization drilldown details', err);
    } finally {
      setLoadingOrgDetails(false);
    }
  };

  const handleCardClick = async (type) => {
    // If a specific organization is already selected, navigate directly to that section
    if (currentOrg) {
      if (type === 'orgs' || type === 'users' || type === 'teams') {
        navigate('/admin');
      } else if (type === 'projects') {
        navigate('/projects');
      } else if (type === 'issues') {
        navigate('/my-work');
      }
      return;
    }

    // When "All Organizations" is selected, open a paginated drilldown modal for overall platform content
    setCardModalType(type);
    setCardModalLoading(true);
    setCardModalPage(1);
    setCardModalSearch('');

    try {
      if (type === 'orgs') {
        const res = await orgAPI.list();
        setCardModalData(res.data || []);
      } else if (type === 'users') {
        const res = await authAPI.getUsers();
        setCardModalData(res.data || []);
      } else if (type === 'projects') {
        const res = await projectsAPI.list();
        setCardModalData(res.data || []);
      } else if (type === 'teams') {
        const res = await teamsAPI.list();
        setCardModalData(res.data || []);
      } else if (type === 'issues') {
        const projsRes = await projectsAPI.list();
        const projs = projsRes.data || [];
        let allIssues = [];
        for (const p of projs.slice(0, 10)) {
          try {
            const issRes = await issuesAPI.list(p.id);
            allIssues = [...allIssues, ...(issRes.data || [])];
          } catch (e) {}
        }
        setCardModalData(allIssues);
      }
    } catch (err) {
      console.error(`Failed to load data for ${type} drilldown`, err);
    } finally {
      setCardModalLoading(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      setSendingBroadcast(true);
      setBroadcastSuccess('');

      if (broadcastTarget === 'all') {
        const res = await orgAPI.broadcastToPlatform({ content: broadcastMessage.trim() });
        setBroadcastSuccess(res.data?.message || 'Broadcast delivered to all organizations!');
      } else {
        const res = await orgAPI.broadcastToOrg(broadcastTarget, { content: broadcastMessage.trim() });
        setBroadcastSuccess(res.data?.message || 'Broadcast delivered to organization!');
      }

      setBroadcastMessage('');
      setTimeout(() => {
        setShowBroadcastModal(false);
        setBroadcastSuccess('');
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send broadcast announcement');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const summary = analytics?.summary || {};
  const issuesStatus = analytics?.issues_by_status || {};
  const orgs = analytics?.organizations || [];
  const growth = analytics?.growth_trends || [];

  // Filter organizations if super admin selected a specific org in the workspace switcher
  const displayedOrgs = currentOrg
    ? orgs.filter((o) => o.id === currentOrg.id)
    : orgs;

  const maxGrowthValue = Math.max(
    ...growth.map((g) => Math.max(g.users || 0, g.orgs || 0, g.issues || 0, 1)),
    5
  );

  return (
    <div className="home-page" style={{ maxWidth: '1360px' }}>
      {/* Super Admin Hero */}
      <div className="home-hero" style={{ background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 60%, #172B4D 100%)', borderRadius: 8, padding: '24px 28px', marginBottom: 24, boxShadow: '0 4px 12px rgba(9,30,66,0.1)' }}>
        <div className="home-hero-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="home-greeting">
              <ShieldCheck size={24} className="greeting-icon" color="#FFE380" />
              <h1>Platform Management & Analytics Hub</h1>
            </div>
            <p className="home-subtitle" style={{ color: '#DEEBFF', marginTop: 6, fontSize: '13px' }}>
              Independent Product Owner Overview · Comprehensive Tenant Organizations, System Users & Activity Metrics
            </p>
          </div>

          {/* Action Buttons: Time Range, Broadcast & Admin Hub */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '3px 4px',
                borderRadius: 6,
                backdropFilter: 'blur(4px)',
              }}
            >
              <Calendar size={14} color="#DEEBFF" style={{ marginLeft: 6, marginRight: 4 }} />
              {[
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
                { id: '1y', label: '1 Year' },
                { id: 'all', label: 'All Time' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRange(tab.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: range === tab.id ? 700 : 500,
                    color: range === tab.id ? '#0052CC' : '#FFFFFF',
                    backgroundColor: range === tab.id ? '#FFFFFF' : 'transparent',
                    borderRadius: 4,
                    transition: 'all 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              className="jira-btn"
              style={{
                backgroundColor: '#FFE380',
                color: '#172B4D',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => {
                setBroadcastTarget(currentOrg ? currentOrg.id : 'all');
                setShowBroadcastModal(true);
              }}
            >
              <Radio size={14} color="#7A5E00" />
              Broadcast Message
            </button>

            <button
              className="jira-btn jira-btn-primary"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#0747A6',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
              onClick={() => navigate('/admin')}
            >
              Open Admin Hub →
            </button>
          </div>
        </div>
      </div>

      {/* Scope Alert if a specific org is filtered via sidebar */}
      {currentOrg && (
        <div
          style={{
            margin: '0 0 20px 0',
            padding: '12px 18px',
            backgroundColor: '#DEEBFF',
            border: '1px solid #B3D4FF',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', color: '#0747A6' }}>
            <Building size={16} />
            <span>
              Currently viewing scoped overview for <b>{currentOrg.name}</b>.
            </span>
          </div>
          <button
            onClick={() => switchOrg(null)}
            style={{
              fontSize: '12px',
              color: '#0052CC',
              fontWeight: 600,
              background: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid #B3D4FF',
              cursor: 'pointer',
            }}
          >
            Switch to Overall Platform View 🌐
          </button>
        </div>
      )}

      {/* Platform Summary KPI Metric Cards (Clickable to jump to specific management screens or view paginated directory) */}
      <div className="home-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div
          className="stat-card"
          style={{ borderLeft: '4px solid #0052CC', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => handleCardClick('orgs')}
          title={currentOrg ? 'Click to manage this Organization in Admin Hub' : 'Click to inspect all Organizations'}
        >
          <div className="stat-icon" style={{ background: '#DEEBFF', color: '#0052CC' }}>
            <Building size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : summary.total_orgs || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{currentOrg ? 'Organization' : 'Organizations Total'}</span>
              <ChevronRight size={14} color="#7A869A" />
            </div>
            <div style={{ fontSize: '11px', color: '#00875A', marginTop: 2, fontWeight: 600 }}>
              +{summary.new_orgs_count || 0} in selected {range}
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ borderLeft: '4px solid #6554C0', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => handleCardClick('users')}
          title={currentOrg ? 'Click to view & manage Organization Members' : 'Click to inspect all Platform Users'}
        >
          <div className="stat-icon" style={{ background: '#EAE6FF', color: '#6554C0' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : summary.total_users || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{currentOrg ? 'Org Members' : 'Platform Users'}</span>
              <ChevronRight size={14} color="#7A869A" />
            </div>
            <div style={{ fontSize: '11px', color: '#00875A', marginTop: 2, fontWeight: 600 }}>
              +{summary.new_users_count || 0} in selected {range}
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ borderLeft: '4px solid #00875A', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => handleCardClick('projects')}
          title="Click to view Project Boards"
        >
          <div className="stat-icon" style={{ background: '#E3FCEF', color: '#00875A' }}>
            <FolderKanban size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : summary.total_projects || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Active Projects</span>
              <ChevronRight size={14} color="#7A869A" />
            </div>
            <div style={{ fontSize: '11px', color: '#00875A', marginTop: 2, fontWeight: 600 }}>
              +{summary.new_projects_count || 0} in selected {range}
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ borderLeft: '4px solid #FF8B00', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => handleCardClick('teams')}
          title="Click to view Teams"
        >
          <div className="stat-icon" style={{ background: '#FFEBE6', color: '#DE350B' }}>
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : summary.total_teams || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Active Teams</span>
              <ChevronRight size={14} color="#7A869A" />
            </div>
            <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 2 }}>{currentOrg ? 'Organization pods' : 'Cross-tenant pods'}</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ borderLeft: '4px solid #00B8D9', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => handleCardClick('issues')}
          title="Click to inspect Jira Work Items & Tickets"
        >
          <div className="stat-icon" style={{ background: '#E6FCFF', color: '#00B8D9' }}>
            <Activity size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : summary.total_issues || 0}</div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{currentOrg ? 'Org Jira Issues' : 'Total Jira Issues'}</span>
              <ChevronRight size={14} color="#7A869A" />
            </div>
            <div style={{ fontSize: '11px', color: '#00875A', marginTop: 2, fontWeight: 600 }}>
              +{summary.new_issues_count || 0} in selected {range}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Graph & Issue Status Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, margin: '20px 0' }}>
        {/* Growth & Usage Chart */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 8,
            padding: 20,
            boxShadow: '0 1px 3px rgba(9,30,66,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} color="#0052CC" />
                Application Usage & Growth Trend ({range.toUpperCase()})
              </h3>
              <p style={{ fontSize: '12px', color: '#5E6C84', margin: '4px 0 0 0' }}>
                Daily activity progression across new users, organizations, and Jira work items
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0052CC', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0052CC' }} /> Users
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6554C0', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#6554C0' }} /> Issues
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div
            style={{
              height: '180px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: growth.length > 15 ? '4px' : '10px',
              paddingTop: '20px',
              borderBottom: '1px solid #EBECF0',
            }}
          >
            {growth.map((g, idx) => {
              const uHeight = Math.max(8, (g.users / maxGrowthValue) * 140);
              const iHeight = Math.max(8, (g.issues / maxGrowthValue) * 140);
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    position: 'relative',
                  }}
                  title={`${g.date}: ${g.users} users, ${g.issues} issues, ${g.orgs} orgs`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: growth.length > 15 ? '6px' : '12px',
                        height: `${uHeight}px`,
                        background: '#0052CC',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <div
                      style={{
                        width: growth.length > 15 ? '6px' : '12px',
                        height: `${iHeight}px`,
                        background: '#6554C0',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '9px',
                      color: '#7A869A',
                      marginTop: '6px',
                      whiteSpace: 'nowrap',
                      display: growth.length > 15 && idx % 3 !== 0 ? 'none' : 'block',
                    }}
                  >
                    {g.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Issue Status Breakdown */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 8,
            padding: 20,
            boxShadow: '0 1px 3px rgba(9,30,66,0.04)',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <PieChart size={16} color="#00875A" />
            Global Workflow Status
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                <span style={{ color: '#42526E', fontWeight: 600 }}>To Do</span>
                <span style={{ fontWeight: 700 }}>{issuesStatus.todo || 0}</span>
              </div>
              <div style={{ height: 6, background: '#EBECF0', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summary.total_issues ? ((issuesStatus.todo || 0) / summary.total_issues) * 100 : 0}%`,
                    height: '100%',
                    background: '#42526E',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                <span style={{ color: '#0052CC', fontWeight: 600 }}>In Progress</span>
                <span style={{ fontWeight: 700 }}>{issuesStatus.inprogress || 0}</span>
              </div>
              <div style={{ height: 6, background: '#EBECF0', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summary.total_issues ? ((issuesStatus.inprogress || 0) / summary.total_issues) * 100 : 0}%`,
                    height: '100%',
                    background: '#0052CC',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                <span style={{ color: '#FF8B00', fontWeight: 600 }}>In Review</span>
                <span style={{ fontWeight: 700 }}>{issuesStatus.inreview || 0}</span>
              </div>
              <div style={{ height: 6, background: '#EBECF0', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summary.total_issues ? ((issuesStatus.inreview || 0) / summary.total_issues) * 100 : 0}%`,
                    height: '100%',
                    background: '#FF8B00',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                <span style={{ color: '#00875A', fontWeight: 600 }}>Completed / Done</span>
                <span style={{ fontWeight: 700 }}>{issuesStatus.done || 0}</span>
              </div>
              <div style={{ height: 6, background: '#EBECF0', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summary.total_issues ? ((issuesStatus.done || 0) / summary.total_issues) * 100 : 0}%`,
                    height: '100%',
                    background: '#00875A',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Organizations Directory Cards with In-depth Drilldown */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(9,30,66,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#172B4D', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={18} color="#0052CC" />
              Tenant Organizations & Resource Distribution
            </h2>
            <p style={{ fontSize: '12px', color: '#5E6C84', margin: '4px 0 0 0' }}>
              Click any organization card to view its internal teams, projects, and member directory.
            </p>
          </div>
          <button
            className="jira-btn jira-btn-secondary"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate('/admin')}
          >
            <Plus size={14} />
            Create / Manage Organizations
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {displayedOrgs.map((org) => (
            <div
              key={org.id}
              onClick={() => handleOpenOrgDetails(org)}
              style={{
                border: '1px solid #DFE1E6',
                borderRadius: 8,
                padding: 16,
                background: '#FAFBFC',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0052CC';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(9,30,66,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#DFE1E6';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: '#DEEBFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0052CC',
                    }}
                  >
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', margin: 0 }}>{org.name}</h3>
                    <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 2 }}>
                      Admin: <b>{org.admin_user?.name || 'Assigned Org Admin'}</b> ({org.admin_user?.email || 'N/A'})
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="#7A869A" />
              </div>

              {org.description && (
                <p style={{ fontSize: '12px', color: '#6B778C', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  {org.description}
                </p>
              )}

              {/* Resource counts */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  background: '#FFFFFF',
                  padding: '10px',
                  borderRadius: 6,
                  border: '1px solid #EBECF0',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0052CC' }}>{org.member_count || 0}</div>
                  <div style={{ fontSize: '10px', color: '#7A869A', textTransform: 'uppercase' }}>Members</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#6554C0' }}>{org.team_count || 0}</div>
                  <div style={{ fontSize: '10px', color: '#7A869A', textTransform: 'uppercase' }}>Teams</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#00875A' }}>{org.project_count || 0}</div>
                  <div style={{ fontSize: '10px', color: '#7A869A', textTransform: 'uppercase' }}>Projects</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#0052CC', fontWeight: 600 }}>
                <span>Click to view Teams & Projects</span>
                <span>View Details →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Organization Drilldown Modal */}
      {selectedOrgModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSelectedOrgModal(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              maxWidth: '840px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 8px 32px rgba(9,30,66,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EBECF0', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0052CC' }}>
                  <Building size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', margin: 0 }}>{selectedOrgModal.name}</h2>
                  <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: 2 }}>
                    Organization Drilldown Details · Super Admin Management View
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrgModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#5E6C84' }}
              >
                ✕
              </button>
            </div>

            {loadingOrgDetails ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#5E6C84' }}>Loading organization resources...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Teams in Org */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} color="#FF8B00" />
                    Teams in Organization ({orgTeams.length})
                  </h3>
                  {orgTeams.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#7A869A', background: '#FAFBFC', padding: 12, borderRadius: 6 }}>No teams created yet in this organization.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                      {orgTeams.map((team) => (
                        <div key={team.id} style={{ border: '1px solid #DFE1E6', borderRadius: 6, padding: 10, background: '#FAFBFC' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#172B4D' }}>#{team.name}</div>
                          <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 4 }}>
                            {team.member_count || 0} members · Lead: {team.lead_name || 'Unassigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects in Org */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FolderKanban size={16} color="#00875A" />
                    Projects in Organization ({orgProjects.length})
                  </h3>
                  {orgProjects.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#7A869A', background: '#FAFBFC', padding: 12, borderRadius: 6 }}>No projects created yet in this organization.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                      {orgProjects.map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => {
                            setSelectedOrgModal(null);
                            navigate(`/projects/${proj.id}`);
                          }}
                          style={{
                            border: '1px solid #DFE1E6',
                            borderRadius: 6,
                            padding: 10,
                            background: '#FAFBFC',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#172B4D' }}>{proj.name}</span>
                            <span className="badge badge-neutral" style={{ fontSize: '9px' }}>{proj.key}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 4 }}>
                            {proj.issue_count || 0} issues · Lead: {proj.lead_name || 'Unassigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Members in Org */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={16} color="#0052CC" />
                    Organization Members ({orgMembers.length})
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, maxHeight: '180px', overflowY: 'auto' }}>
                    {orgMembers.map((m) => (
                      <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #EBECF0', borderRadius: 6, padding: 8, background: '#FFFFFF' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#0052CC' }}>
                          {m.user?.name?.[0] || 'U'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#172B4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.user?.name || m.name || 'Member'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#7A869A' }}>
                            {m.roles?.join(', ') || 'Member'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EBECF0', paddingTop: 16 }}>
                  <button
                    className="jira-btn"
                    style={{
                      backgroundColor: '#FFE380',
                      color: '#172B4D',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onClick={() => {
                      setBroadcastTarget(selectedOrgModal.id);
                      setSelectedOrgModal(null);
                      setShowBroadcastModal(true);
                    }}
                  >
                    <Radio size={14} color="#7A5E00" />
                    Broadcast to #{selectedOrgModal.name}
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="jira-btn jira-btn-secondary"
                      onClick={() => {
                        switchOrg(selectedOrgModal);
                        setSelectedOrgModal(null);
                      }}
                    >
                      Switch Workspace to {selectedOrgModal.name}
                    </button>
                    <button
                      className="jira-btn jira-btn-primary"
                      onClick={() => {
                        setSelectedOrgModal(null);
                        navigate('/admin');
                      }}
                    >
                      Manage in Admin Hub →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Super Admin Broadcast Modal */}
      {showBroadcastModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setShowBroadcastModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              maxWidth: '560px',
              width: '100%',
              padding: 24,
              boxShadow: '0 8px 32px rgba(9,30,66,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EBECF0', paddingBottom: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFE380', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A5E00' }}>
                  <Radio size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Super Admin Broadcast</h2>
                  <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 2 }}>
                    Post directly into Tenant Organization Broadcast Channels
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#5E6C84' }}
              >
                ✕
              </button>
            </div>

            {broadcastSuccess && (
              <div
                style={{
                  background: '#E3FCEF',
                  color: '#006644',
                  border: '1px solid #ABF5D1',
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Check size={16} />
                {broadcastSuccess}
              </div>
            )}

            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#172B4D', marginBottom: 6 }}>
                  Target Destination:
                </label>
                <select
                  className="jira-input"
                  style={{ width: '100%', fontSize: '13px' }}
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  disabled={sendingBroadcast}
                >
                  <option value="all">🌐 All Organizations (Entire Platform)</option>
                  <optgroup label="Specific Organization #org Broadcast">
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        🏢 {org.name} (#{org.name})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 4 }}>
                  {broadcastTarget === 'all'
                    ? 'The message will be published to the #org channel of every tenant organization.'
                    : `The message will be published only to the #${orgs.find(o => o.id === broadcastTarget)?.name || 'org'} broadcast channel.`}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#172B4D', marginBottom: 6 }}>
                  Announcement Message:
                </label>
                <textarea
                  className="jira-input"
                  style={{ width: '100%', minHeight: '110px', fontSize: '13px', resize: 'vertical' }}
                  placeholder="Type important platform announcement or organization notice..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  required
                  disabled={sendingBroadcast}
                />
              </div>

              <div
                style={{
                  background: '#FAFBFC',
                  border: '1px solid #EBECF0',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: '11px',
                  color: '#42526E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ShieldCheck size={16} color="#0052CC" style={{ flexShrink: 0 }} />
                <span>
                  Sender is displayed as <b>Super Admin</b> (Name and Role only · Email is protected).
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="jira-btn jira-btn-secondary"
                  onClick={() => setShowBroadcastModal(false)}
                  disabled={sendingBroadcast}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jira-btn jira-btn-primary"
                  style={{
                    backgroundColor: '#0052CC',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                >
                  <Send size={14} />
                  {sendingBroadcast ? 'Broadcasting...' : 'Send Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paginated Card Detail View Modal for Overall Platform Drilldown */}
      {cardModalType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            zIndex: 1040,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setCardModalType(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              maxWidth: '860px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(9,30,66,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #EBECF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAFBFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: cardModalType === 'orgs' ? '#DEEBFF' : cardModalType === 'users' ? '#EAE6FF' : cardModalType === 'projects' ? '#E3FCEF' : cardModalType === 'teams' ? '#FFEBE6' : '#E6FCFF',
                    color: cardModalType === 'orgs' ? '#0052CC' : cardModalType === 'users' ? '#6554C0' : cardModalType === 'projects' ? '#00875A' : cardModalType === 'teams' ? '#DE350B' : '#00B8D9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cardModalType === 'orgs' && <Building size={20} />}
                  {cardModalType === 'users' && <Users size={20} />}
                  {cardModalType === 'projects' && <FolderKanban size={20} />}
                  {cardModalType === 'teams' && <Layers size={20} />}
                  {cardModalType === 'issues' && <Activity size={20} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0, textTransform: 'capitalize' }}>
                    Overall Platform {cardModalType === 'orgs' ? 'Organizations Directory' : cardModalType === 'users' ? 'Registered Users' : cardModalType === 'projects' ? 'Platform Projects' : cardModalType === 'teams' ? 'Active Teams' : 'Jira Issues & Work Items'}
                  </h2>
                  <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: 2 }}>
                    Showing live aggregated platform records across all tenant workspaces
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCardModalType(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#5E6C84' }}
              >
                ✕
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #EBECF0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A869A' }} />
                <input
                  type="text"
                  placeholder={`Search ${cardModalType}...`}
                  value={cardModalSearch}
                  onChange={(e) => {
                    setCardModalSearch(e.target.value);
                    setCardModalPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 12px 6px 30px',
                    fontSize: '12px',
                    borderRadius: 4,
                    border: '1px solid #DFE1E6',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#5E6C84', fontWeight: 600 }}>
                Total: {cardModalData.length} records
              </span>
            </div>

            {/* Modal Body / Table / List */}
            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto', minHeight: '260px' }}>
              {cardModalLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#5E6C84' }}>Loading platform records...</div>
              ) : (
                (() => {
                  const filtered = cardModalData.filter((item) => {
                    if (!cardModalSearch.trim()) return true;
                    const query = cardModalSearch.toLowerCase();
                    if (cardModalType === 'orgs') return item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query);
                    if (cardModalType === 'users') return item.name?.toLowerCase().includes(query) || item.email?.toLowerCase().includes(query);
                    if (cardModalType === 'projects') return item.name?.toLowerCase().includes(query) || item.key?.toLowerCase().includes(query);
                    if (cardModalType === 'teams') return item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query);
                    if (cardModalType === 'issues') return item.summary?.toLowerCase().includes(query) || item.key?.toLowerCase().includes(query);
                    return true;
                  });

                  const totalPages = Math.max(1, Math.ceil(filtered.length / cardModalPageSize));
                  const paginated = filtered.slice((cardModalPage - 1) * cardModalPageSize, cardModalPage * cardModalPageSize);

                  if (paginated.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#7A869A' }}>
                        No matching records found.
                      </div>
                    );
                  }

                  return (
                    <div>
                      {/* Render type-specific table / rows */}
                      {cardModalType === 'orgs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {paginated.map((org) => (
                            <div
                              key={org.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: '1px solid #EBECF0',
                                borderRadius: 6,
                                padding: '10px 14px',
                                background: '#FFFFFF',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0052CC', fontWeight: 700 }}>
                                  🏢
                                </div>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>{org.name}</div>
                                  <div style={{ fontSize: '11px', color: '#5E6C84' }}>{org.description || 'No description provided'}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  className="jira-btn jira-btn-secondary"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={() => {
                                    switchOrg(org);
                                    setCardModalType(null);
                                  }}
                                >
                                  Switch Workspace
                                </button>
                                <button
                                  className="jira-btn jira-btn-primary"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={() => {
                                    setCardModalType(null);
                                    handleOpenOrgDetails(org);
                                  }}
                                >
                                  View Details →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {cardModalType === 'users' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                          {paginated.map((u) => (
                            <div
                              key={u.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                border: '1px solid #EBECF0',
                                borderRadius: 6,
                                padding: '10px 12px',
                                background: '#FFFFFF',
                              }}
                            >
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EAE6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6554C0', fontWeight: 700, fontSize: '12px' }}>
                                {u.name?.[0] || 'U'}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#172B4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                <div style={{ fontSize: '10px', color: '#7A869A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, background: u.role === 'super_admin' ? '#FFE380' : '#EBECF0', color: '#42526E', marginTop: 2, display: 'inline-block' }}>
                                  {u.role}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {cardModalType === 'projects' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {paginated.map((proj) => (
                            <div
                              key={proj.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: '1px solid #EBECF0',
                                borderRadius: 6,
                                padding: '10px 14px',
                                background: '#FFFFFF',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#E3FCEF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00875A', fontWeight: 700, fontSize: '11px' }}>
                                  {proj.key || 'PRJ'}
                                </div>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>{proj.name}</div>
                                  <div style={{ fontSize: '11px', color: '#5E6C84' }}>Key: <b>{proj.key}</b> · Lead: {proj.lead_name || 'Assigned Lead'}</div>
                                </div>
                              </div>
                              <button
                                className="jira-btn jira-btn-secondary"
                                style={{ fontSize: '11px', padding: '3px 8px' }}
                                onClick={() => {
                                  setCardModalType(null);
                                  navigate(`/projects/${proj.id}/board`);
                                }}
                              >
                                Open Board →
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {cardModalType === 'teams' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                          {paginated.map((team) => (
                            <div
                              key={team.id}
                              style={{
                                border: '1px solid #EBECF0',
                                borderRadius: 6,
                                padding: '12px',
                                background: '#FFFFFF',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <Layers size={16} color="#DE350B" />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>{team.name}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#5E6C84' }}>
                                Lead: <b>{team.lead_name || 'Team Lead'}</b>
                              </div>
                              <div style={{ fontSize: '10px', color: '#7A869A', marginTop: 4 }}>
                                {team.member_count || 0} Members · {team.project_count || 0} Projects
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {cardModalType === 'issues' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {paginated.map((iss) => (
                            <div
                              key={iss.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: '1px solid #EBECF0',
                                borderRadius: 6,
                                padding: '8px 12px',
                                background: '#FFFFFF',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0052CC', minWidth: '60px' }}>{iss.key}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {iss.summary}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '2px 6px',
                                    borderRadius: 3,
                                    background: iss.status === 'done' ? '#E3FCEF' : iss.status === 'inprogress' ? '#DEEBFF' : '#EBECF0',
                                    color: iss.status === 'done' ? '#006644' : iss.status === 'inprogress' ? '#0747A6' : '#42526E',
                                  }}
                                >
                                  {iss.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 16,
                            paddingTop: 12,
                            borderTop: '1px solid #EBECF0',
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#5E6C84' }}>
                            Page {cardModalPage} of {totalPages}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="jira-btn jira-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              disabled={cardModalPage <= 1}
                              onClick={() => setCardModalPage((p) => Math.max(1, p - 1))}
                            >
                              Previous
                            </button>
                            <button
                              className="jira-btn jira-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              disabled={cardModalPage >= totalPages}
                              onClick={() => setCardModalPage((p) => Math.min(totalPages, p + 1))}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 24px',
                borderTop: '1px solid #EBECF0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FAFBFC',
              }}
            >
              <button
                className="jira-btn jira-btn-secondary"
                onClick={() => {
                  setCardModalType(null);
                  navigate('/admin');
                }}
              >
                Manage All in Admin Hub →
              </button>
              <button
                className="jira-btn jira-btn-primary"
                onClick={() => setCardModalType(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RegularMemberDashboard = () => {
  const { currentUser, currentOrg } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    assignedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    projectCount: 0,
  });

  const [projects, setProjects] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const projectsRes = await projectsAPI.list();
        const projs = projectsRes.data || [];
        setProjects(projs);

        let allIssues = [];
        for (const project of projs.slice(0, 6)) {
          try {
            const issuesRes = await issuesAPI.list(project.id);
            allIssues = [...allIssues, ...issuesRes.data];
          } catch (err) {}
        }

        const myIssues = allIssues.filter((i) => i.assignee_id === currentUser?.id);

        setStats({
          assignedCount: myIssues.filter((i) => i.status !== 'done').length,
          inProgressCount: myIssues.filter((i) => i.status === 'inprogress').length,
          completedCount: myIssues.filter((i) => i.status === 'done').length,
          projectCount: projs.length,
        });

        setRecentIssues(
          myIssues
            .filter((i) => i.status !== 'done')
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .slice(0, 6)
        );
      } catch (err) {
        console.error('Failed to load member dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [currentUser, currentOrg]);

  const quickActions = [
    { icon: MessageCircle, label: 'Slack & Jira Chat', path: '/chat', color: '#0052CC' },
    { icon: FolderKanban, label: 'Project Boards', path: '/projects', color: '#00875A' },
    { icon: ClipboardList, label: 'My Assigned Work', path: '/my-work', color: '#6554C0' },
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
      <div className="home-hero">
        <div className="home-hero-content">
          <div className="home-greeting">
            <Sparkles size={20} className="greeting-icon" />
            <h1>Welcome back, {currentUser?.name?.split(' ')[0]}</h1>
          </div>
          <p className="home-subtitle">
            {currentOrg ? `Organization: ${currentOrg.name}` : 'Personal Workspace'} · Here is what is on your agenda today.
          </p>
        </div>
      </div>

      <div className="home-stats">
        <div
          className="stat-card stat-card-assigned"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => navigate('/my-work')}
          title="Click to view all tasks assigned to you"
        >
          <div className="stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.assignedCount}</div>
            <div className="stat-label">Assigned to You →</div>
          </div>
        </div>

        <div
          className="stat-card stat-card-progress"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => navigate('/my-work')}
          title="Click to view work currently In Progress"
        >
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.inProgressCount}</div>
            <div className="stat-label">In Progress →</div>
          </div>
        </div>

        <div
          className="stat-card stat-card-completed"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => navigate('/my-work')}
          title="Click to view completed work"
        >
          <div className="stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.completedCount}</div>
            <div className="stat-label">Completed →</div>
          </div>
        </div>

        <div
          className="stat-card stat-card-projects"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => navigate('/projects')}
          title="Click to explore active Project Boards"
        >
          <div className="stat-icon">
            <FolderKanban size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '-' : stats.projectCount}</div>
            <div className="stat-label">Projects Active →</div>
          </div>
        </div>
      </div>

      <div className="home-grid">
        <div className="home-card">
          <div className="home-card-header">
            <h2>Quick Navigation</h2>
          </div>
          <div className="quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.path} className="quick-action-btn" onClick={() => navigate(action.path)}>
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

        <div className="home-card home-card-wide">
          <div className="home-card-header">
            <h2>Your Assigned Work</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-work')}>
              View All Work <ArrowRight size={12} />
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

const HomePage = () => {
  const { isSuperAdmin } = useAuth();
  if (isSuperAdmin?.()) {
    return <SuperAdminDashboard />;
  }
  return <RegularMemberDashboard />;
};

export default HomePage;
