import api from './api';

const detectReceiverRoleType = ({ receiverRoleType, relationshipRole }) => receiverRoleType || relationshipRole || null;

const connectionsService = {
  searchUsers: async (query) => (await api.get('/users/search', { params: { q: query } })).data,

  getConnections: async () => (await api.get('/connections')).data,

  getFriendRequests: async () => (await api.get('/friend-requests')).data,

  sendFriendRequest: async ({ receiverId, receiverUsername, message, relationshipRole, senderRoleType, receiverRoleType }) => (await api.post('/friend-requests', {
    receiverId,
    receiverUsername,
    message,
    relationshipRole,
    senderRoleType,
    receiverRoleType: detectReceiverRoleType({ receiverRoleType, relationshipRole })
  })).data,

  acceptFriendRequest: async (requestId) => (await api.patch(`/friend-requests/${requestId}/accept`)).data,

  declineFriendRequest: async (requestId) => (await api.patch(`/friend-requests/${requestId}/decline`)).data
};

export default connectionsService;
