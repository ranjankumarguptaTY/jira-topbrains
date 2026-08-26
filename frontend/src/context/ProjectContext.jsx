import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projects';
import { sprintsApi } from '../api/sprints';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { currentUser, currentOrg } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [activeTab, setActiveTab] = useState('board'); // board, backlog, roadmap, issues
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);

  // Modals
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false);
  const [isStartSprintOpen, setIsStartSprintOpen] = useState(false);
  const [isCompleteSprintOpen, setIsCompleteSprintOpen] = useState(false);
  const [targetSprint, setTargetSprint] = useState(null);

  // Refresh counters
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshBoard = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.list(currentOrg?.id);
      setProjects(data || []);
      if (data && data.length > 0) {
        const defaultProj = (currentProject && data.some((p) => p.id === currentProject.id)) ? currentProject : data[0];
        setCurrentProject(defaultProj);
        const sprintData = await sprintsApi.listByProject(defaultProj.id);
        setSprints(sprintData || []);
      } else {
        setCurrentProject(null);
        setSprints([]);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
      setProjects([]);
      setCurrentProject(null);
      setSprints([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSprints = async (projectId) => {
    if (!projectId) return;
    try {
      const data = await sprintsApi.listByProject(projectId);
      setSprints(data);
    } catch (err) {
      console.error('Failed to load sprints', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [currentOrg?.id]);

  useEffect(() => {
    if (currentProject) {
      loadSprints(currentProject.id);
    }
  }, [currentProject, refreshKey]);

  // Auto-sync project selection from URL path (/projects/:projectId)
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const pIndex = pathParts.indexOf('projects');
    if (pIndex !== -1 && pathParts[pIndex + 1]) {
      const urlProjId = pathParts[pIndex + 1];
      const matched = projects.find((p) => p.id === urlProjId || p.key?.toLowerCase() === urlProjId.toLowerCase());
      if (matched && (!currentProject || currentProject.id !== matched.id)) {
        setCurrentProject(matched);
      }
    }
  }, [window.location.pathname, projects]);

  // Auto-open IssueDetailModal if ?issue=id is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const issueIdFromUrl = params.get('issue');
    if (issueIdFromUrl) {
      setSelectedIssueId(issueIdFromUrl);
    }
  }, [window.location.search]);

  const selectProject = (project) => {
    setCurrentProject(project);
    // Reset filters
    setSearchQuery('');
    setSelectedAssignees([]);
    setSelectedTypes([]);
  };

  const activeSprint = sprints.find((s) => s.status === 'active') || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        selectProject,
        loadProjects,
        sprints,
        activeSprint,
        loadSprints,
        activeTab,
        setActiveTab,
        refreshBoard,
        refreshKey,
        loading,

        // Filters
        searchQuery,
        setSearchQuery,
        selectedAssignees,
        setSelectedAssignees,
        selectedTypes,
        setSelectedTypes,
        onlyMyIssues,
        setOnlyMyIssues,

        // Modals
        selectedIssueId,
        setSelectedIssueId,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isCreateProjectOpen,
        setIsCreateProjectOpen,
        isCreateSprintOpen,
        setIsCreateSprintOpen,
        isEditSprintOpen,
        setIsEditSprintOpen,
        isStartSprintOpen,
        setIsStartSprintOpen,
        isCompleteSprintOpen,
        setIsCompleteSprintOpen,
        targetSprint,
        setTargetSprint,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
