import api from './api';

const meetingsService = {
  getTeacherMeetings: async () => (await api.get('/meetings', { params: { role: 'teacher' } })).data,

  getMeetingRequests: async (status = 'PENDING') => (await api.get('/meeting-requests', { params: { status } })).data,

  createMeetingRequest: async (payload) => (await api.post('/meeting-requests', payload)).data,

  scheduleMeetingByTeacher: async (payload) => (await api.post('/teacher/schedule-meeting', payload)).data,

  acceptMeetingRequest: async (requestId) => (await api.patch(`/meeting-requests/${requestId}/accept`)).data,

  declineMeetingRequest: async (requestId) => (await api.patch(`/meeting-requests/${requestId}/decline`)).data
};

export default meetingsService;
