import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, Lock, Mail, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, completeMfaSetup } = useAuth();
  
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // MFA Setup state
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [mfaSetupToken, setMfaSetupToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secretCode, setSecretCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, pass, mfaRequired ? mfaCode : undefined);
      
      if (res.mfaRequired) {
        setMfaRequired(true);
        setMfaCode('');
      } else if (res.mfaSetupRequired) {
        setMfaSetupRequired(true);
        setMfaSetupToken(res.mfaSetupToken);
        setQrCode(res.qrCode);
        setSecretCode(res.secretCode);
        setMfaCode('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mfaSetupRequired) {
        await completeMfaSetup(mfaSetupToken, mfaCode);
      } else {
        await login(email, pass, mfaCode);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check code.');
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
          <h2 className="login-title">Targets & Timelines</h2>
          <p className="login-subtitle">
            {mfaRequired ? 'Enter MFA Code' : mfaSetupRequired ? 'Setup Multi-Factor Auth' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="badge red text-center w-full" style={{ padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
            <ShieldAlert size={16} style={{ marginRight: '8px' }} />
            <span>{error}</span>
          </div>
        )}

        {!mfaRequired && !mfaSetupRequired ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  style={{ paddingLeft: '38px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: '38px' }}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {mfaSetupRequired && (
              <div className="mfa-setup-box">
                <img src={qrCode} alt="MFA QR Code" className="qr-code-img" />
                <span className="form-label" style={{ fontSize: '11px' }}>Or enter code manually:</span>
                <span className="mfa-text-code">{secretCode}</span>
                <p className="user-role text-center" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Scan QR code with Google Authenticator or Microsoft Authenticator.
                </p>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="form-input text-center"
                placeholder="000000"
                maxLength={6}
                style={{ fontSize: '18px', letterSpacing: '8px', fontWeight: 'bold' }}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary w-full" 
              onClick={() => {
                setMfaRequired(false);
                setMfaSetupRequired(false);
                setError('');
              }}
            >
              Back to Login
            </button>
          </form>
        )}

        <div className="login-footer-info">
          <span>Protected by RS256 token encryption & multi-factor security.</span>
        </div>
      </div>
    </div>
  );
};
