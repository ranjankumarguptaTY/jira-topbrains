import client from './client';

export const commentsApi = {
  getByIssue: async (issueId) => {
    const res = await client.get(`/api/comments/issue/${issueId}`);
    return res.data;
  },
  create: async (data) => {
    const res = await client.post('/api/comments', data);
    return res.data;
  },
  delete: async (id) => {
    const res = await client.delete(`/api/comments/${id}`);
    return res.data;
  },
  getActivity: async (issueId) => {
    const res = await client.get(`/api/comments/activity/${issueId}`);
    return res.data;
  }
};
