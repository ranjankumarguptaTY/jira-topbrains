import client from './client';

export const projectsApi = {
  list: async (orgId) => {
    const res = await client.get('/api/projects', { params: orgId ? { org_id: orgId } : {} });
    return res.data;
  },
  get: async (idOrKey) => {
    const res = await client.get(`/api/projects/${idOrKey}`);
    return res.data;
  },
  create: async (data) => {
    const res = await client.post('/api/projects', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await client.put(`/api/projects/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await client.delete(`/api/projects/${id}`);
    return res.data;
  },
  listMembers: async (projectId) => {
    const res = await client.get(`/api/projects/${projectId}/members`);
    return res.data;
  },
  getBoardConfig: async (projectId) => {
    const res = await client.get(`/api/projects/${projectId}/board-config`);
    return res.data;
  },
  updateBoardConfig: async (projectId, data) => {
    const res = await client.put(`/api/projects/${projectId}/board-config`, data);
    return res.data;
  },
  addTag: async (projectId, data) => {
    const res = await client.post(`/api/projects/${projectId}/tags`, data);
    return res.data;
  },
  deleteTag: async (projectId, tagId) => {
    const res = await client.delete(`/api/projects/${projectId}/tags/${tagId}`);
    return res.data;
  },
  addColumn: async (projectId, data) => {
    const res = await client.post(`/api/projects/${projectId}/columns`, data);
    return res.data;
  },
  deleteColumn: async (projectId, columnId) => {
    const res = await client.delete(`/api/projects/${projectId}/columns/${columnId}`);
    return res.data;
  },
  seed: async () => {
    const res = await client.post('/api/seed');
    return res.data;
  },
  importJiraData: async (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post(`/api/projects/${projectId}/import-jira-data`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  exportJiraCsvUrl: (projectId) => `/api/projects/${projectId}/export-jira-csv`,
  exportJsonUrl: (projectId) => `/api/projects/${projectId}/export-json`,
};
