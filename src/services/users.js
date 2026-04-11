import api from './api';

export const normalizeUserProfile = (profile, fallbackUser = null) => {
  const resolvedId = profile?.linkedChildId || profile?.childId || profile?.id || fallbackUser?.linkedChildId || String(fallbackUser?.id || '');
  const resolvedName = profile?.linkedChildName || profile?.childName || fallbackUser?.linkedChildName || fallbackUser?.name || '';
  const resolvedUsername = profile?.username || profile?.email || fallbackUser?.username || fallbackUser?.email || '';

  return {
    id: profile?.id || String(fallbackUser?.id || ''),
    name: profile?.name || fallbackUser?.name || '',
    username: resolvedUsername,
    email: profile?.email || fallbackUser?.email || '',
    role: profile?.role || fallbackUser?.role || '',
    linkedChildId: resolvedId,
    linkedChildName: resolvedName,
    parentName: profile?.parentName || '',
    teacherName: profile?.teacherName || ''
  };
};

const usersService = {
  getProfile: async () => (await api.get('/users/profile')).data
};

export default usersService;
