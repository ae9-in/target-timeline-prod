import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, Lock, CheckCircle, ShieldAlert } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Reset link is invalid or missing. Please request a new one.');
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
      await resetPassword(token, newPass);
      navigate('/login', { replace: true, state: { message: 'Password reset successfully. Please sign in.' } });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Reset link has expired or is invalid. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glow" />
      <div className="login-glow-secondary" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>
            <Target size={28} />
          </div>
          <h2 className="login-title">Reset Password</h2>
          <p className="login-subtitle">
            Choose a new strong password for your account.
          </p>
        </div>

        {error && (
          <div
            className="badge red"
            style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '8px', width: '100%' }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {token ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  id="reset-password-input"
                  type="password"
                  className="form-input"
                  placeholder="Minimum 8 characters"
                  style={{ paddingLeft: '38px' }}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <CheckCircle
                  size={16}
                  style={{
                    position: 'absolute', left: '12px', top: '13px',
                    color: confirmPass && confirmPass === newPass ? '#10b981' : 'var(--text-muted)',
                  }}
                />
                <input
                  id="reset-confirm-input"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter new password"
                  style={{ paddingLeft: '38px' }}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              id="reset-submit-btn"
              type="submit"
              className="btn btn-primary w-full"
              style={{ padding: '12px' }}
              disabled={loading || !token}
            >
              {loading ? 'Resetting...' : 'Reset Password & Sign In'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Link to="/forgot-password" className="btn btn-primary" style={{ padding: '12px 24px' }}>
              Request a New Reset Link
            </Link>
          </div>
        )}

        <div className="login-footer-info">
          <span>This reset link expires 15 minutes after admin approval.</span>
        </div>

        <div className="login-portal-switch" style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
