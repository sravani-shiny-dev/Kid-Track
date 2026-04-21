import api from './api';

const meetingsService = {
  getTeacherMeetings: async () => (await api.get('/meeting-requests')).data,

  getMeetingRequests: async (status = 'PENDING') => (await api.get('/meeting-requests', { params: { status } })).data,

  createMeetingRequest: async (payload) => (await api.post('/meeting-requests', payload)).data,

  scheduleMeetingByTeacher: async (payload) => (await api.post('/teacher/schedule-meeting', payload)).data,

  acceptMeetingRequest: async (requestId) => (await api.patch(`/meeting-requests/${requestId}/accept`)).data,

  declineMeetingRequest: async (requestId) => (await api.patch(`/meeting-requests/${requestId}/decline`)).data,

  getMeetingsAsTeacher: async () => (await api.get('/meeting-requests')).data,

  getMeetingsAsParent: async () => (await api.get('/meeting-requests')).data,

  requestMeeting: async (body) => (await api.post('/meeting-requests', {
    title: body.title || 'Parent meeting request',
    childId: body.childId,
    requestedAt: body.preferredDatetime || body.requestedAt,
    detail: body.reason || body.detail || ''
  })).data,

  scheduleMeeting: async (id, body) => (await api.patch(`/meeting-requests/${id}/accept`, {
    confirmedDatetime: body.confirmedDatetime,
    notes: body.notes || ''
  })).data
};

export default meetingsService;
