import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jira_token') || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await authApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load team users', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('jira_token');
      if (storedToken) {
        try {
          const user = await authApi.getMe();
          setCurrentUser(user);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          localStorage.removeItem('jira_token');
          setToken('');
          setCurrentUser(null);
        }
      }
      await fetchUsers();
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('jira_token', data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
    await fetchUsers();
    return data.user;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    localStorage.setItem('jira_token', data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
    await fetchUsers();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('jira_token');
    setToken('');
    setCurrentUser(null);
  };

  const switchUser = (user) => {
    setCurrentUser(user);
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
        logout,
        switchUser,
        refreshUsers: fetchUsers,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
