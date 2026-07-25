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

  const isAdmin = portal === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, pass, portal);

      if (data?.mfaSetupRequired || data?.mfaRequired) return;

      // mustChangePassword gate — redirect before any landing page
      if (data?.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      // Portal-specific landing pages
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
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
    <div className={`login-container ${isAdmin ? 'admin-login-container' : ''}`}>
      {/* Background glows */}
      <div className={`login-glow ${isAdmin ? 'admin-glow' : ''}`}></div>
      <div className={`login-glow-secondary ${isAdmin ? 'admin-glow-secondary' : ''}`}></div>

      <div className={`login-card ${isAdmin ? 'admin-login-card' : ''}`}>

        {/* Admin badge — visually distinguishable at a glance */}
        {isAdmin && (
          <div className="admin-portal-badge">
            <AlertTriangle size={12} />
            <span>ADMIN PORTAL — RESTRICTED ACCESS</span>
          </div>
        )}

        <div className="login-header">
          <div className={`login-logo ${isAdmin ? 'admin-logo' : ''}`}>
            {isAdmin ? <Shield size={28} /> : <Target size={28} />}
          </div>
          <h2 className="login-title">
            {isAdmin ? 'Admin Console' : 'Targets & Timelines'}
          </h2>
          <p className="login-subtitle">
            {isAdmin ? 'Restricted access — authorized personnel only' : 'Sign in to your account'}
          </p>
        </div>

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
                id={isAdmin ? 'admin-email-input' : 'user-email-input'}
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
                id={isAdmin ? 'admin-password-input' : 'user-password-input'}
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
            {!isAdmin && (
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
            id={isAdmin ? 'admin-login-btn' : 'user-login-btn'}
            type="submit"
            className={`btn ${isAdmin ? 'btn-admin' : 'btn-primary'} w-full`}
            style={{ padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : isAdmin ? 'Access Admin Console' : 'Sign In'}
          </button>
        </form>

        {isAdmin && (
          <div className="login-footer-info">
            <span>
              <Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              All admin access is audited and logged.
            </span>
          </div>
        )}

        {isAdmin ? (
          <div className="login-portal-switch">
            <a href="/login">← Back to main app login</a>
          </div>
        ) : (
          <div className="login-portal-switch" style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Request access →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Default export alias so App.tsx import is backwards compatible
export default Login;
