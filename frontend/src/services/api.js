import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'jira_token';

// --- Request interceptor: attach JWT token ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response interceptor: handle auth errors ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============================================
// AUTH API
// =============================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  listUsers: (orgId) => api.get('/auth/users', { params: orgId ? { org_id: orgId } : {} }),
  searchUsers: (query, orgId, limit = 10, includeSelf = false) =>
    api.get('/auth/search', {
      params: {
        q: query,
        ...(orgId ? { org_id: orgId } : {}),
        limit,
        include_self: includeSelf,
      },
    }),
  adminCreateUser: (data) => api.post('/auth/admin/create-user', data),
  adminUpdateRole: (userId, role) => api.patch(`/auth/admin/users/${userId}/role`, { role }),
  adminUpdateStatus: (userId, isActive) => api.patch(`/auth/admin/users/${userId}/status`, { is_active: isActive }),
  adminResetPasswordDefault: (userId) => api.post(`/auth/admin/users/${userId}/reset-password-default`),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

// =============================================
// ORGANIZATION API
// =============================================
export const orgAPI = {
  list: () => api.get('/organizations'),
  create: (data) => api.post('/organizations', data),
  getMine: () => api.get('/organizations/mine'),
  get: (orgId) => api.get(`/organizations/${orgId}`),
  update: (orgId, data) => api.patch(`/organizations/${orgId}`, data),
  delete: (orgId) => api.delete(`/organizations/${orgId}`),
  // Org membership management
  listMembers: (orgId) => api.get(`/organizations/${orgId}/members`),
  addMember: (orgId, userId, roles) => api.post(`/organizations/${orgId}/members`, { user_id: userId, roles }),
  updateMemberRoles: (orgId, userId, roles) => api.patch(`/organizations/${orgId}/members/${userId}`, { roles }),
  removeMember: (orgId, userId) => api.delete(`/organizations/${orgId}/members/${userId}`),
  // Org custom roles
  listRoles: (orgId) => api.get(`/organizations/${orgId}/roles`),
  createRole: (orgId, data) => api.post(`/organizations/${orgId}/roles`, data),
  updateRole: (orgId, roleId, data) => api.put(`/organizations/${orgId}/roles/${roleId}`, data),
  deleteRole: (orgId, roleId) => api.delete(`/organizations/${orgId}/roles/${roleId}`),
  // Platform analytics
  getPlatformAnalytics: (range = '30d', orgId = null) => {
    const params = new URLSearchParams({ range_filter: range });
    if (orgId) params.append('org_id', orgId);
    return api.get(`/organizations/analytics/platform?${params.toString()}`);
  },
  // Organization Broadcasts
  broadcastToPlatform: (data) => api.post('/organizations/broadcast/platform', data),
  broadcastToOrg: (orgId, data) => api.post(`/organizations/${orgId}/broadcast`, data),
};

// =============================================
// TEAMS API
// =============================================
export const teamsAPI = {
  list: (orgId) => api.get('/teams', { params: orgId ? { org_id: orgId } : {} }),
  create: (data) => api.post('/teams', data),
  get: (teamId) => api.get(`/teams/${teamId}`),
  update: (teamId, data) => api.patch(`/teams/${teamId}`, data),
  delete: (teamId) => api.delete(`/teams/${teamId}`),
  listMembers: (teamId) => api.get(`/teams/${teamId}/members`),
  addMember: (teamId, userId, role) => api.post(`/teams/${teamId}/members`, { user_id: userId, role }),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
};

// =============================================
// PROJECTS API
// =============================================
export const projectsAPI = {
  list: (params = {}) => api.get('/projects', { params }),
  create: (data) => api.post('/projects', data),
  get: (projectId) => api.get(`/projects/${projectId}`),
  update: (projectId, data) => api.put(`/projects/${projectId}`, data),
  delete: (projectId) => api.delete(`/projects/${projectId}`),
  // Project membership
  listMembers: (projectId) => api.get(`/projects/${projectId}/members`),
  addMember: (projectId, userId, role) => api.post(`/projects/${projectId}/members`, { user_id: userId, role }),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
};

// =============================================
// SPRINTS API
// =============================================
export const sprintsAPI = {
  list: (projectId) => api.get(`/sprints?project_id=${projectId}`),
  create: (data) => api.post('/sprints', data),
  start: (sprintId, data) => api.post(`/sprints/${sprintId}/start`, data),
  complete: (sprintId, data) => api.post(`/sprints/${sprintId}/complete`, data),
  delete: (sprintId) => api.delete(`/sprints/${sprintId}`),
};

// =============================================
// ISSUES API
// =============================================
export const issuesAPI = {
  list: (projectId, params = {}) => api.get(`/issues?project_id=${projectId}`, { params }),
  create: (data) => api.post('/issues', data),
  get: (issueId) => api.get(`/issues/${issueId}`),
  update: (issueId, data) => api.patch(`/issues/${issueId}`, data),
  updateStatus: (issueId, data) => api.patch(`/issues/${issueId}/status`, data),
  reorder: (issueId, data) => api.patch(`/issues/${issueId}/reorder`, data),
  delete: (issueId) => api.delete(`/issues/${issueId}`),
  getMyWork: (params = {}) => api.get('/issues/my-work', { params }),
};

// =============================================
// COMMENTS API
// =============================================
export const commentsAPI = {
  list: (issueId) => api.get(`/comments?issue_id=${issueId}`),
  create: (data) => api.post('/comments', data),
  update: (commentId, data) => api.patch(`/comments/${commentId}`, data),
  delete: (commentId) => api.delete(`/comments/${commentId}`),
};

// =============================================
// CONVERSATIONS API (Chat)
// =============================================
export const conversationsAPI = {
  list: () => api.get('/conversations'),
  create: (data) => api.post('/conversations', data),
  get: (conversationId) => api.get(`/conversations/${conversationId}`),
  update: (conversationId, data) => api.patch(`/conversations/${conversationId}`, data),
  getMessages: (conversationId, params = {}) => api.get(`/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, data) => api.post(`/conversations/${conversationId}/messages`, data),
  addMember: (conversationId, userId) => api.post(`/conversations/${conversationId}/members`, { user_id: userId }),
  removeMember: (conversationId, userId) => api.delete(`/conversations/${conversationId}/members/${userId}`),
  markRead: (conversationId) => api.post(`/conversations/${conversationId}/read`),
  clearMessages: (conversationId) => api.delete(`/conversations/${conversationId}/messages`),
};

// =============================================
// GUEST REQUESTS API
// =============================================
export const guestRequestsAPI = {
  list: () => api.get('/chat-requests'),
  send: (data) => api.post('/chat-requests', data),
  accept: (requestId) => api.post(`/chat-requests/${requestId}/accept`),
  decline: (requestId) => api.post(`/chat-requests/${requestId}/decline`),
  block: (requestId) => api.post(`/chat-requests/${requestId}/block`),
};

// =============================================
// NOTIFICATIONS API
// =============================================
export const notificationsAPI = {
  list: (params = {}) => api.get('/notifications', { params }),
  markRead: (notifId) => api.patch(`/notifications/${notifId}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  subscribePush: (sub) => api.post('/notifications/subscribe', sub),
};

// =============================================
// FILE TRANSFERS API
// =============================================
export const fileTransfersAPI = {
  initiate: (data) => api.post('/file-transfers/initiate', data),
  getStatus: (transferId) => api.get(`/file-transfers/${transferId}/status`),
  uploadChunk: (transferId, chunk, offset) =>
    api.put(`/file-transfers/${transferId}/upload`, chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Offset': offset,
      },
    }),
  completeUpload: (transferId) => api.post(`/file-transfers/${transferId}/upload/complete`),
  download: (transferId) => api.get(`/file-transfers/${transferId}/download`, { responseType: 'blob' }),
  completeDownload: (transferId) => api.post(`/file-transfers/${transferId}/download/complete`),
  cancel: (transferId) => api.post(`/file-transfers/${transferId}/cancel`),
};

// =============================================
// MIGRATION API
// =============================================
export const migrateAPI = {
  run: () => api.post('/migrate'),
  status: () => api.get('/migrate/status'),
};

export default api;
