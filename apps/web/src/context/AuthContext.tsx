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

// Create Axios Instance
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Crucial: sends cookie (refreshToken) to server
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tokenRef = React.useRef<string | null>(null);

  // Set Authorization Header whenever accessToken changes
  useEffect(() => {
    tokenRef.current = accessToken;
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Handle Token Interceptors for Request Authorization & Response 401 Retries
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
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
          originalRequest._retry = true;
          try {
            const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
            const token = res.data.accessToken;
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
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Check login state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(res.data.accessToken);
        
        // Fetch current user details or parse them from JWT token
        const payload = JSON.parse(atob(res.data.accessToken.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          roles: payload.roles,
          verticalScope: payload.verticalScope,
        });
      } catch (err) {
        // No valid session, do nothing
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, pass: string, mfaCode?: string) => {
    const res = await api.post('/auth/login', { email, pass, mfaCode });
    const data = res.data;

    // Handle MFA Setup or MFA Verification required
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
