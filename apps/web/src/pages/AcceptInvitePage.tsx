import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, Lock, CheckCircle, ShieldAlert, User, Eye, EyeOff } from 'lucide-react';

export const AcceptInvitePage: React.FC = () => {
  const { acceptInvite, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPass, setNewPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [confirmPass, setConfirmPass] = useState('');
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect away
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!token) {
      setError('Invite link is invalid or missing. Please request a new one from your administrator.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) return;

    if (newPass.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await acceptInvite(token, newPass);
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        typeof msg === 'string'
          ? msg
          : 'Invite link has expired or has already been used. Contact your administrator.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glow"></div>
      <div className="login-glow-secondary"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Target size={28} />
          </div>
          <h2 className="login-title">Set Up Your Account</h2>
          <p className="login-subtitle">
            Welcome! Choose a password to activate your account and get started.
          </p>
        </div>

        {error && (
          <div
            className="badge red text-center w-full"
            style={{ padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {!error || token ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  id="invite-password-input"
                  type={showNewPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Choose a strong password (min. 8 chars)"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                  title={showNewPass ? 'Hide password' : 'Show password'}
                  disabled={!token}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <CheckCircle
                  size={16}
                  style={{
                    position: 'absolute', left: '12px', top: '14px',
                    color: confirmPass && confirmPass === newPass ? '#10b981' : 'var(--text-muted)',
                  }}
                />
                <input
                  id="invite-confirm-password-input"
                  type={showConfirmPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter your password"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                  title={showConfirmPass ? 'Hide password' : 'Show password'}
                  disabled={!token}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="accept-invite-btn"
              type="submit"
              className="btn btn-primary w-full"
              style={{ padding: '12px' }}
              disabled={loading || !token}
            >
              {loading ? 'Activating...' : 'Activate Account & Sign In'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            <User size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>Please request a new invite from your administrator.</p>
          </div>
        )}

        <div className="login-footer-info">
          <span>This invite link is single-use and expires after 48 hours.</span>
        </div>
      </div>
    </div>
  );
};
