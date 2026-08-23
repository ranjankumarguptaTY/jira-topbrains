import client from './client';

export const sprintsApi = {
  listByProject: async (projectId) => {
    const res = await client.get(`/api/sprints/project/${projectId}`);
    return res.data;
  },
  create: async (data) => {
    const res = await client.post('/api/sprints', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await client.put(`/api/sprints/${id}`, data);
    return res.data;
  },
  start: async (id, startData) => {
    const res = await client.post(`/api/sprints/${id}/start`, startData);
    return res.data;
  },
  complete: async (id, completeData) => {
    const res = await client.post(`/api/sprints/${id}/complete`, completeData);
    return res.data;
  },
  delete: async (id) => {
    const res = await client.delete(`/api/sprints/${id}`);
    return res.data;
  }
};
