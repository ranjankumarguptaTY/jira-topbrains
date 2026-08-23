import client from './client';

export const issuesApi = {
  list: async (params = {}) => {
    const res = await client.get('/api/issues', { params });
    return res.data;
  },
  get: async (idOrKey) => {
    const res = await client.get(`/api/issues/${idOrKey}`);
    return res.data;
  },
  create: async (data) => {
    const res = await client.post('/api/issues', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await client.put(`/api/issues/${id}`, data);
    return res.data;
  },
  updateStatus: async (id, status, order = null, sprintId = null) => {
    const res = await client.patch(`/api/issues/${id}/status`, {
      status,
      order,
      sprint_id: sprintId
    });
    return res.data;
  },
  reorder: async (id, reorderData) => {
    const res = await client.patch(`/api/issues/${id}/reorder`, reorderData);
    return res.data;
  },
  getSubtasks: async (id) => {
    const res = await client.get(`/api/issues/${id}/subtasks`);
    return res.data;
  },
  delete: async (id) => {
    const res = await client.delete(`/api/issues/${id}`);
    return res.data;
  }
};
