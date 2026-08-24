import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'jira_token';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await authAPI.listUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load team users', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          setCurrentUser(res.data);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          localStorage.removeItem(TOKEN_KEY);
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
    const res = await authAPI.login({ email, password });
    const data = res.data;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
    await fetchUsers();
    return data.user;
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const data = res.data;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
    await fetchUsers();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
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
