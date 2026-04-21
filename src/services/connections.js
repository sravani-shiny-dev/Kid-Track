import api from './api';

export const getConnectionErrorMessage = (error, fallback = 'Unable to send connection request.') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const isIncomingRequestForUser = (request, userId) => {
  if (!request || userId == null) {
    return false;
  }
  return String(request.receiverId) === String(userId) && (!request.status || request.status === 'PENDING');
};

const connectionsService = {
  searchUsers: async (query) => (await api.get('/users/search', { params: { q: query } })).data,

  getConnections: async () => (await api.get('/connections')).data,

  getFriendRequests: async () => (await api.get('/friend-requests')).data,

  sendFriendRequest: async ({ receiverId, receiverUsername, message, relationshipRole, senderRoleType, receiverRoleType }) => {
    const payload = {
      message,
      senderRoleType
    };

    if (relationshipRole) {
      payload.relationshipRole = relationshipRole;
    }

    if (receiverRoleType) {
      payload.receiverRoleType = receiverRoleType;
    }

    if (receiverId) {
      payload.receiverId = receiverId;
    } else if (receiverUsername) {
      payload.receiverUsername = receiverUsername;
    }

    return (await api.post('/friend-requests', payload)).data;
  },

  acceptFriendRequest: async (requestId) => (await api.patch(`/friend-requests/${requestId}/accept`)).data,

  declineFriendRequest: async (requestId) => (await api.patch(`/friend-requests/${requestId}/decline`)).data
};

export default connectionsService;
