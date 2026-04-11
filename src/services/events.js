import api from './api';

/**
 * Events Service
 * event calls
 * TODO: Implement events service methods
 */

const eventsService = {
  /**
   * Get upcoming events
   * @returns {Promise}
   */
  getEvents: async (role = 'child') => (await api.get('/events/upcoming', { params: { role } })).data,

  /**
   * Teacher: Create event
   * @param {Object} eventData
   * @returns {Promise}
   */
  createEvent: async (eventData) => (await api.post('/events', eventData)).data,

  /**
   * Teacher: Update event
   * @param {string} eventId
   * @param {Object} eventData
   * @returns {Promise}
   */
  updateEvent: async (eventId, eventData) => (await api.put(`/events/${eventId}`, eventData)).data,

  /**
   * Teacher: Delete event
   * @param {string} eventId
   * @returns {Promise}
   */
  deleteEvent: async (eventId) => (await api.delete(`/events/${eventId}`)).data,

  /**
   * Parent: RSVP to event
   * @param {string} eventId
   * @param {string} rsvpStatus
   * @returns {Promise}
   */
  rsvpEvent: async (eventId, rsvpStatus) => (await api.patch(`/events/${eventId}/rsvp`, { status: rsvpStatus })).data,
};

export default eventsService;
