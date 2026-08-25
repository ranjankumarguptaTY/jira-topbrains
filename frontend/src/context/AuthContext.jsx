import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, orgAPI } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'jira_token';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Organization state
  const [currentOrg, setCurrentOrg] = useState(null);
  const [userOrgs, setUserOrgs] = useState([]);
  const [orgRoles, setOrgRoles] = useState([]); // Current user's roles in currentOrg

  const fetchUsers = async (orgId) => {
    try {
      const res = await authAPI.listUsers(orgId || currentOrg?.id);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await orgAPI.list();
      setUserOrgs(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to load organizations', err);
      return [];
    }
  }, []);

  const fetchMyOrg = useCallback(async () => {
    try {
      const res = await orgAPI.getMine();
      // If user is super admin, we keep currentOrg null by default unless explicitly switched
      return res.data;
    } catch (err) {
      // User may not be in any org — that's ok
      console.warn('No organization found for current user');
      return null;
    }
  }, []);

  const fetchOrgRoles = useCallback(async (orgId) => {
    if (!orgId) {
      setOrgRoles([]);
      return [];
    }
    try {
      const res = await orgAPI.listMembers(orgId);
      const members = res.data;
      const myMembership = members.find(m => m.user_id === currentUser?.id);
      const roles = myMembership?.roles || [];
      setOrgRoles(roles);
      return roles;
    } catch (err) {
      console.warn('Failed to fetch org roles', err);
      return [];
    }
  }, [currentUser]);

  const switchOrg = async (org) => {
    setCurrentOrg(org);
    if (org?.id) {
      await fetchOrgRoles(org.id);
      await fetchUsers(org.id);
    } else {
      setOrgRoles([]);
      await fetchUsers();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          setCurrentUser(res.data);
          await fetchUsers();
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          localStorage.removeItem(TOKEN_KEY);
          setToken('');
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Fetch orgs once user is authenticated
  useEffect(() => {
    if (currentUser) {
      fetchOrgs();
      if (currentUser.role !== 'super_admin') {
        fetchMyOrg().then((org) => {
          if (org?.id) {
            setCurrentOrg(org);
            fetchOrgRoles(org.id);
            fetchUsers(org.id);
          }
        });
      }
    }
  }, [currentUser, fetchOrgs, fetchMyOrg, fetchOrgRoles]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const data = res.data;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
    const org = await fetchMyOrg();
    if (org?.id) {
      await fetchOrgRoles(org.id);
      await fetchUsers(org.id);
    } else {
      await fetchUsers();
    }
    return data.user;
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const data = res.data;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
    const org = await fetchMyOrg();
    if (org?.id) {
      await fetchOrgRoles(org.id);
      await fetchUsers(org.id);
    } else {
      await fetchUsers();
    }
    return data.user;
  };

  const updateProfile = async (profileData) => {
    const res = await authAPI.updateProfile(profileData);
    const updatedUser = res.data;
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setCurrentOrg(null);
    setUserOrgs([]);
    setOrgRoles([]);
  };

  const switchUser = (user) => {
    setCurrentUser(user);
  };

  // =============================================
  // ROLE CHECKING HELPERS
  // =============================================

  /** Platform-level super admin (admin@topbrains.com or role=super_admin) */
  const isSuperAdmin = () => {
    const role = currentUser?.role;
    return role === 'super_admin' || role === 'admin'; // transition support
  };

  /** Is current user an admin within the current org? */
  const isOrgAdmin = (orgId) => {
    if (isSuperAdmin()) return true;
    return orgRoles.includes('admin');
  };

  /** Is current user a lead within the current org? */
  const isOrgLead = () => {
    if (isSuperAdmin()) return true;
    return orgRoles.includes('lead') || orgRoles.includes('admin');
  };

  /** Can current user manage users/teams within current org? */
  const canManageOrg = () => {
    return isSuperAdmin() || orgRoles.includes('admin');
  };

  const isAuthenticated = Boolean(currentUser && token);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        token,
        isAuthenticated,
        login,
        register,
        updateProfile,
        logout,
        switchUser,
        refreshUsers: fetchUsers,
        loading,
        // Organization
        currentOrg,
        userOrgs,
        orgRoles,
        fetchOrgs,
        fetchMyOrg,
        switchOrg,
        // Role helpers
        isSuperAdmin,
        isOrgAdmin,
        isOrgLead,
        canManageOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      currentUser: null,
      users: [],
      token: '',
      isAuthenticated: false,
      login: async () => {},
      register: async () => {},
      updateProfile: async () => {},
      logout: () => {},
      switchUser: () => {},
      refreshUsers: async () => {},
      loading: false,
      currentOrg: null,
      userOrgs: [],
      orgRoles: [],
      fetchOrgs: async () => {},
      fetchMyOrg: async () => {},
      switchOrg: async () => {},
      isSuperAdmin: () => false,
      isOrgAdmin: () => false,
      isOrgLead: () => false,
      canManageOrg: () => false,
    };
  }
  return context;
};
