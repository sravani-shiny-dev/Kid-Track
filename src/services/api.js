import axios from 'axios';

export const AUTH_STORAGE_KEY = 'kidtrack_auth';
export const AUTH_CLEARED_EVENT = 'kidtrack:auth-cleared';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

const getBrowserStorage = (storageName) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[storageName];
  } catch (error) {
    return null;
  }
};

export const getStoredAuth = () => {
  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');
  const sessionAuth = sessionStorage?.getItem(AUTH_STORAGE_KEY);

  if (sessionAuth) {
    return sessionAuth;
  }

  const legacyAuth = localStorage?.getItem(AUTH_STORAGE_KEY);

  if (legacyAuth) {
    sessionStorage?.setItem(AUTH_STORAGE_KEY, legacyAuth);
    localStorage?.removeItem(AUTH_STORAGE_KEY);
  }

  return legacyAuth;
};

export const setStoredAuth = (auth) => {
  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');

  if (auth) {
    sessionStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    localStorage?.removeItem(AUTH_STORAGE_KEY);
  } else {
    sessionStorage?.removeItem(AUTH_STORAGE_KEY);
    localStorage?.removeItem(AUTH_STORAGE_KEY);
  }
};

export const clearStoredAuth = () => {
  setStoredAuth(null);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_CLEARED_EVENT));
  }
};

api.interceptors.request.use((config) => {
  const storedAuth = getStoredAuth();

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
