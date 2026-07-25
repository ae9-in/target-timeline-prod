import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  verticalScope: string[];
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, pass: string, portal?: 'user' | 'admin', mfaCode?: string) => Promise<any>;
  completeMfaSetup: (token: string, code: string) => Promise<any>;
  logout: () => Promise<void>;
  acceptInvite: (token: string, newPassword: string) => Promise<any>;
  changePassword: (newPassword: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ message: string }>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Axios Instance ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ─── Singleton Refresh Promise ──────────────────────────────────────────────────
// React 18 StrictMode double-invokes effects in development causing two
// simultaneous POST /auth/refresh calls. The server rotates the token on the
// first call; the second arrives with the revoked token → entire token family
// killed → user logged out.
// Fix: all concurrent callers share the SAME promise, only ONE HTTP request
// ever reaches the server. The promise is cleared after it settles.
let pendingRefresh: Promise<string> | null = null;

const callRefresh = (): Promise<string> => {
  if (!pendingRefresh) {
    pendingRefresh = axios
      .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
      .then((res) => res.data.accessToken)
      .finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
};

// ─── Auth Provider ──────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tokenRef = React.useRef<string | null>(null);

  // Keep the axios default header and the ref in sync with state
  useEffect(() => {
    tokenRef.current = accessToken;
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Request / response interceptors: bearer token injection + 401 auto-retry
  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use((config) => {
      if (tokenRef.current) {
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${tokenRef.current}`);
        } else if (config.headers) {
          config.headers['Authorization'] = `Bearer ${tokenRef.current}`;
        }
      }
      return config;
    });

    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          originalRequest.url !== '/auth/refresh'
        ) {
          originalRequest._retry = true;
          try {
            const token = await callRefresh();
            tokenRef.current = token;
            setAccessToken(token);

            if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
            } else if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          } catch (refreshError) {
            tokenRef.current = null;
            setAccessToken(null);
            setUser(null);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Restore session on page load / refresh
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await callRefresh();
        setAccessToken(token);

        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          roles: payload.roles,
          verticalScope: payload.verticalScope,
          mustChangePassword: payload.mustChangePassword ?? false,
        });
      } catch {
        // No valid session — stay logged out
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, pass: string, portal: 'user' | 'admin' = 'user', mfaCode?: string) => {
    const res = await api.post('/auth/login', { email, pass, mfaCode, portal });
    const data = res.data;

    if (data.mfaSetupRequired || data.mfaRequired) {
      return data;
    }

    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const completeMfaSetup = async (token: string, code: string) => {
    const res = await api.post('/auth/mfa/setup', { token, code });
    const data = res.data;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const acceptInvite = async (token: string, newPassword: string) => {
    const res = await api.post('/auth/accept-invite', { token, newPassword });
    const data = res.data;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const changePassword = async (newPassword: string) => {
    await api.post('/auth/change-password', { newPassword });
    // Clear the flag locally without a full token refresh
    setUser((prev) => prev ? { ...prev, mustChangePassword: false } : prev);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const signUp = async (name: string, email: string, password: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/signup', { name, email, password });
    return res.data;
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    await api.post('/auth/reset-password/request', { email });
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password/confirm', { token, newPass: newPassword });
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, completeMfaSetup, logout, acceptInvite, changePassword, signUp, requestPasswordReset, resetPassword, api }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
