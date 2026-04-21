import api from './api';

export const getNotes = async (childId) => {
  const response = await api.get('/notes', childId ? { params: { childId } } : undefined);
  return response.data;
};

export const createNote = async (body) => {
  const response = await api.post('/notes', body);
  return response.data;
};
