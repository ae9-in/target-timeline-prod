import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  verticalScope: string[];
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, pass: string, mfaCode?: string) => Promise<any>;
  completeMfaSetup: (token: string, code: string) => Promise<any>;
  logout: () => Promise<void>;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Axios Instance ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ─── Singleton Refresh Promise ──────────────────────────────────────────────────
// React 18 StrictMode double-invokes effects in development. This causes two
// simultaneous POST /auth/refresh calls with the same cookie. The server rotates
// the token on the first call, then the second call arrives with the now-revoked
// token → "reuse detected" → entire token family killed → user logged out on
// every page refresh.
//
// Fix: maintain a module-level in-flight promise. All concurrent callers (StrictMode
// second invoke, multiple 401 retries, etc.) share the SAME promise, so only ONE
// HTTP request ever reaches the server. The promise is cleared after it settles so
// the next legitimate refresh (e.g. after the 15-min access token expires) works.
let pendingRefresh: Promise<string> | null = null;

const callRefresh = (): Promise<string> => {
  if (!pendingRefresh) {
    pendingRefresh = axios
      .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
      .then((res) => res.data.accessToken)
      .finally(() => {
        pendingRefresh = null;
      });
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
            // Use the singleton so multiple concurrent 401s share one refresh call
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
        });
      } catch {
        // No valid session — stay logged out
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, pass: string, mfaCode?: string) => {
    const res = await api.post('/auth/login', { email, pass, mfaCode });
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

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, completeMfaSetup, logout, api }}>
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
