import axios from 'axios';

export const AUTH_STORAGE_KEY = 'kidtrack_auth';
export const AUTH_CLEARED_EVENT = 'kidtrack:auth-cleared';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

const clearStoredAuth = () => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_CLEARED_EVENT));
};

api.interceptors.request.use((config) => {
  const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (storedAuth) {
    try {
      const parsed = JSON.parse(storedAuth);
      if (parsed.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch (error) {
      clearStoredAuth();
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
    }

    return Promise.reject(error);
  }
);

export default api;
