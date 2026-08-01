import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, Lock, Mail, ShieldAlert, Shield, AlertTriangle } from 'lucide-react';

interface LoginPageProps {
  portal?: 'user' | 'admin';
}

export const Login: React.FC<LoginPageProps> = ({ portal = 'user' }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const successMessage = (location.state as any)?.message;
  
  // This prop dictates whether this is the physically separate /admin/login page or the standard /login page.
  const isSuperAdminPortal = portal === 'admin';

  // If it's the standard /login page, we support a tab switcher between standard 'user' and standard 'admin_user' role log-in.
  const [activePortal, setActivePortal] = useState<'user' | 'admin_user'>('user');
  
  // Resolve current visual state
  const isCurrentlyAdmin = isSuperAdminPortal || activePortal === 'admin_user';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If we are on the /admin/login page, submit portal as 'admin' (strictly SUPER_ADMIN).
      // Otherwise, submit as 'user' or 'admin_user' depending on the active tab.
      const submitPortal = isSuperAdminPortal ? 'admin' : activePortal;
      const data = await login(email, pass, submitPortal);

      if (data?.mfaSetupRequired || data?.mfaRequired) return;

      // mustChangePassword gate — redirect before any landing page
      if (data?.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      // Portal-specific landing pages
      if (submitPortal === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Both standard 'user' and standard 'admin_user' roles redirect to the main app dashboard
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      // Show only the server's generic message — never leak more detail
      const serverMessage = err.response?.data?.message;
      setError(typeof serverMessage === 'string' ? serverMessage : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-container ${isCurrentlyAdmin ? 'admin-login-container' : ''}`}>
      {/* Background glows */}
      <div className={`login-glow ${isCurrentlyAdmin ? 'admin-glow' : ''}`}></div>
      <div className={`login-glow-secondary ${isCurrentlyAdmin ? 'admin-glow-secondary' : ''}`}></div>

      <div className={`login-card ${isCurrentlyAdmin ? 'admin-login-card' : ''}`}>

        {/* Admin badge — visually distinguishable at a glance */}
        {isCurrentlyAdmin && (
          <div className="admin-portal-badge">
            <AlertTriangle size={12} />
            <span>
              {isSuperAdminPortal ? 'SUPER ADMIN PORTAL — RESTRICTED ACCESS' : 'ADMIN PORTAL — RESTRICTED ACCESS'}
            </span>
          </div>
        )}

        <div className="login-header">
          <div className={`login-logo ${isCurrentlyAdmin ? 'admin-logo' : ''}`}>
            {isCurrentlyAdmin ? <Shield size={28} /> : <Target size={28} />}
          </div>
          <h2 className="login-title">
            {isSuperAdminPortal ? 'Super Admin Console' : (isCurrentlyAdmin ? 'Admin Portal' : 'Targets & Timelines')}
          </h2>
          <p className="login-subtitle">
            {isSuperAdminPortal ? 'Restricted access — authorized personnel only' : (isCurrentlyAdmin ? 'Sign in with admin credentials' : 'Sign in to your account')}
          </p>
        </div>

        {/* Portal Tabs Selector — ONLY show on the standard /login page */}
        {!isSuperAdminPortal && (
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '24px',
          }}>
            <button
              type="button"
              onClick={() => {
                setActivePortal('user');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: activePortal === 'user' ? 'var(--color-primary)' : 'transparent',
                color: activePortal === 'user' ? '#fff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              User Login
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePortal('admin_user');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: activePortal === 'admin_user' ? 'var(--color-primary)' : 'transparent',
                color: activePortal === 'admin_user' ? '#fff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              Admin Login
            </button>
          </div>
        )}

        {successMessage && (
          <div
            className="badge green"
            style={{ padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '8px', width: '100%' }}
          >
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div
            className="badge red text-center w-full"
            style={{ padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                id={isCurrentlyAdmin ? 'admin-email-input' : 'user-email-input'}
                type="email"
                className="form-input"
                placeholder="name@company.com"
                style={{ paddingLeft: '38px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                id={isCurrentlyAdmin ? 'admin-password-input' : 'user-password-input'}
                type="password"
                className="form-input"
                placeholder="••••••••"
                style={{ paddingLeft: '38px' }}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {!isCurrentlyAdmin && (
              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          <button
            id={isCurrentlyAdmin ? 'admin-login-btn' : 'user-login-btn'}
            type="submit"
            className={`btn ${isCurrentlyAdmin ? 'btn-admin' : 'btn-primary'} w-full`}
            style={{ padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : isCurrentlyAdmin ? 'Access Admin Console' : 'Sign In'}
          </button>
        </form>

        {isCurrentlyAdmin && (
          <div className="login-footer-info">
            <span>
              <Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              All admin access is audited and logged.
            </span>
          </div>
        )}

        {isSuperAdminPortal ? (
          <div className="login-portal-switch" style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link to="/login" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>← Back to main app login</Link>
          </div>
        ) : (
          <div className="login-portal-switch" style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {isCurrentlyAdmin ? (
              <>
                Need an admin account?{' '}
                <Link to="/admin/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  Request admin access →
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  Request access →
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
