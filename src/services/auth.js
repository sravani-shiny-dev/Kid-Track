import api from './api';

const authService = {
  async login(email, password, role) {
    try {
      const response = await api.post('/auth/login', { email, password, role });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Unable to sign in. Please check your database user account.'
      );
    }
  },

  async me() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async register(payload) {
    try {
      const response = await api.post('/auth/register', payload);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Unable to register account.'
      );
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (error.response?.status !== 401) {
        throw error;
      }
    }
  }
};

export default authService;
