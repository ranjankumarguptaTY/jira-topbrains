import client from './client';

export const authApi = {
  login: async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    return res.data;
  },
  register: async (userData) => {
    const res = await client.post('/api/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await client.get('/api/auth/me');
    return res.data;
  },
  getUsers: async () => {
    const res = await client.get('/api/auth/users');
    return res.data;
  },
  adminCreateUser: async (userData) => {
    const res = await client.post('/api/auth/admin/create-user', userData);
    return res.data;
  },
  adminUpdateRole: async (userId, role) => {
    const res = await client.patch(`/api/auth/admin/users/${userId}/role`, { role });
    return res.data;
  },
  adminUpdateUserStatus: async (userId, isActive) => {
    const res = await client.patch(`/api/auth/admin/users/${userId}/status`, { is_active: isActive });
    return res.data;
  }
};
