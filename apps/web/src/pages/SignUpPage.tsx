import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, User, Mail, Lock, CheckCircle, ShieldAlert, ArrowRight, CheckCheck } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (pass.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pass !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), pass);
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
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
            background: 'rgba(16, 185, 129, 0.12)',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCheck size={32} color="#10b981" />
          </div>
          <h2 className="login-title" style={{ fontSize: '22px' }}>Request Submitted!</h2>
          <p className="login-subtitle" style={{ marginBottom: '28px', lineHeight: '1.6' }}>
            Your account request is now awaiting admin approval.
            You'll be able to sign in once an administrator reviews and approves your registration.
          </p>
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '28px',
            fontSize: '13px',
            color: '#10b981',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            textAlign: 'left',
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>This typically takes up to 24 hours. You can try logging in after approval.</span>
          </div>
          <Link to="/login" className="btn btn-primary w-full" style={{ padding: '12px', justifyContent: 'center' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-glow" />
      <div className="login-glow-secondary" />

      <div className="login-card" style={{ maxWidth: '440px' }}>
        <div className="login-header">
          <div className="login-logo">
            <Target size={28} />
          </div>
          <h2 className="login-title">Request Access</h2>
          <p className="login-subtitle">
            Create an account — requires admin approval to activate.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                id="signup-name-input"
                type="text"
                className="form-input"
                placeholder="Your full name"
                style={{ paddingLeft: '38px' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Work Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                id="signup-email-input"
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                id="signup-password-input"
                type="password"
                className="form-input"
                placeholder="Minimum 8 characters"
                style={{ paddingLeft: '38px' }}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <CheckCircle
                size={16}
                style={{
                  position: 'absolute', left: '12px', top: '13px',
                  color: confirmPass && confirmPass === pass ? '#10b981' : 'var(--text-muted)',
                }}
              />
              <input
                id="signup-confirm-input"
                type="password"
                className="form-input"
                placeholder="Re-enter your password"
                style={{ paddingLeft: '38px' }}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '12px', marginTop: '4px' }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : (
              <>Request Access <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="login-footer-info" style={{ marginTop: '20px' }}>
          <span>Your account will be reviewed by an administrator before activation.</span>
        </div>

        <div className="login-portal-switch" style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have access?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
