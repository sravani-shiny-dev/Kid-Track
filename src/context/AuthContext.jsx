import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/auth';
import { AUTH_CLEARED_EVENT, clearStoredAuth, getStoredAuth, setStoredAuth } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let ignore = false;

    const syncStoredSession = async () => {
      const stored = getStoredAuth();

      if (!stored) {
        if (!ignore) {
          setHydrated(true);
          setLoading(false);
        }
        return;
      }

      try {
        const parsed = JSON.parse(stored);

        if (!parsed.token) {
          clearStoredAuth();
          if (!ignore) {
            setLoading(false);
          }
          return;
        }

        if (!ignore) {
          setToken(parsed.token);
        }

        const currentUser = await authService.me();

        if (!ignore) {
          setUser(currentUser);
          setToken(parsed.token);
        }
      } catch (error) {
        clearStoredAuth();
        if (!ignore) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!ignore) {
          setHydrated(true);
          setLoading(false);
        }
      }
    };

    const handleAuthCleared = () => {
      if (!ignore) {
        setUser(null);
        setToken(null);
        setHydrated(true);
        setLoading(false);
      }
    };

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    syncStoredSession();

    return () => {
      ignore = true;
      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (user && token) {
      setStoredAuth({ user, token });
    } else {
      setStoredAuth(null);
    }
  }, [hydrated, token, user]);

  const login = async ({ email, password, role }) => {
    const response = await authService.login(email, password, role);
    setStoredAuth({ user: response.user, token: response.token });
    setUser(response.user);
    setToken(response.token);
    return response;
  };

  const register = async (payload) => {
    const response = await authService.register(payload);
    setStoredAuth({ user: response.user, token: response.token });
    setUser(response.user);
    setToken(response.token);
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    setStoredAuth(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout,
    setUser,
    setToken
  }), [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthContext;
