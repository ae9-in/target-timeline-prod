import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, Mail, ShieldAlert, Clock } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-container">
        <div className="login-glow" />
        <div className="login-glow-secondary" />
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '2px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <Clock size={32} color="#f59e0b" />
          </div>
          <h2 className="login-title" style={{ fontSize: '22px' }}>Request Sent</h2>
          <p className="login-subtitle" style={{ marginBottom: '28px', lineHeight: '1.6' }}>
            If an account with that email exists, your password reset request has been submitted for admin review.
          </p>
          <div style={{
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '28px',
            fontSize: '13px',
            color: '#f59e0b',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            textAlign: 'left',
          }}>
            <Clock size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              An administrator must approve your request before a reset link is generated.
              Please wait for approval — this typically takes a few hours during business hours.
            </span>
          </div>
          <Link to="/login" className="btn btn-secondary w-full" style={{ padding: '12px', justifyContent: 'center' }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-glow" />
      <div className="login-glow-secondary" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Target size={28} />
          </div>
          <h2 className="login-title">Forgot Password?</h2>
          <p className="login-subtitle">
            Enter your email to request a password reset. An admin will review and approve the request.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                id="forgot-email-input"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                style={{ paddingLeft: '38px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <button
            id="forgot-submit-btn"
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Request Password Reset'}
          </button>
        </form>

        <div className="login-footer-info">
          <span>Reset requests require admin approval before a link is generated.</span>
        </div>

        <div className="login-portal-switch" style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
