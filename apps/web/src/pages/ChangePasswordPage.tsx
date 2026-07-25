import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldAlert, CheckCircle } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

  // If user doesn't need to change password, redirect to appropriate landing
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      navigate(isSuperAdmin ? '/admin/dashboard' : '/', { replace: true });
    }
  }, [user, isSuperAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      await changePassword(newPass);
      // Redirect based on role
      navigate(isSuperAdmin ? '/admin/dashboard' : '/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
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
          <div className="login-logo" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber-accent, #f59e0b)' }}>
            <Lock size={28} />
          </div>
          <h2 className="login-title">Set a New Password</h2>
          <p className="login-subtitle">
            Your account requires a new password before you can continue.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                id="new-password-input"
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

          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <CheckCircle
                size={16}
                style={{
                  position: 'absolute', left: '12px', top: '14px',
                  color: confirmPass && confirmPass === newPass ? '#10b981' : 'var(--text-muted)',
                }}
              />
              <input
                id="confirm-password-input"
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
            id="change-password-btn"
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Set New Password & Continue'}
          </button>
        </form>

        <div className="login-footer-info">
          <span>This step is required before accessing the application.</span>
        </div>
      </div>
    </div>
  );
};
