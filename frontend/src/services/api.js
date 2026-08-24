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
  listUsers: () => api.get('/auth/users'),
  searchUsers: (query) => api.get('/auth/search', { params: { q: query } }),
  adminCreateUser: (data) => api.post('/auth/admin/create-user', data),
  adminUpdateRole: (userId, role) => api.patch(`/auth/admin/users/${userId}/role`, { role }),
  adminUpdateStatus: (userId, isActive) => api.patch(`/auth/admin/users/${userId}/status`, { is_active: isActive }),
};

// =============================================
// ORGANIZATION API
// =============================================
export const orgAPI = {
  getMine: () => api.get('/organizations/mine'),
  update: (orgId, data) => api.patch(`/organizations/${orgId}`, data),
};

// =============================================
// TEAMS API
// =============================================
export const teamsAPI = {
  list: () => api.get('/teams'),
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
  list: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  get: (projectId) => api.get(`/projects/${projectId}`),
  update: (projectId, data) => api.patch(`/projects/${projectId}`, data),
  delete: (projectId) => api.delete(`/projects/${projectId}`),
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

export default api;
