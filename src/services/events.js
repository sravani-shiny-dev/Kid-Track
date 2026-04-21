import api from './api';

const eventsService = {
  getEvents: async (teacherId) => {
    const response = await api.get('/events', teacherId ? { params: { teacherId } } : undefined);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post('/events', {
      title: eventData.title,
      childId: eventData.childId || eventData.audience || null,
      scheduledAt: eventData.scheduledAt || eventData.eventDate,
      endAt: eventData.endAt,
      detail: eventData.detail || eventData.description || ''
    });
    return response.data;
  }
};

export default eventsService;
