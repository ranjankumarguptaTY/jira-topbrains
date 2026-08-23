import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projects';
import { sprintsApi } from '../api/sprints';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { currentUser } = useAuth();
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
      const data = await projectsApi.list();
      setProjects(data);
      if (data.length > 0) {
        const defaultProj = currentProject || data[0];
        if (!currentProject || !data.some((p) => p.id === currentProject.id)) {
          setCurrentProject(defaultProj);
        }
        // Load sprints immediately for the active project
        const sprintData = await sprintsApi.listByProject(defaultProj.id);
        setSprints(sprintData);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
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
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadSprints(currentProject.id);
    }
  }, [currentProject, refreshKey]);

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
