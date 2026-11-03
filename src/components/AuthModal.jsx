import React, { useState } from 'react';
import { User, Lock, X, AlertCircle, Play } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import { registerUser, loginUser, validateUsername, validatePassword, getOrCreateGuestUser } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = 'login',
  customMessage = null
}) {
  const [tab, setTab] = useState(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleGuestPlay = () => {
    const guestUser = getOrCreateGuestUser(username || undefined);
    onAuthSuccess(guestUser);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // If Supabase is not configured, seamlessly create/use local player profile
    if (!isSupabaseConfigured()) {
      const guestUser = getOrCreateGuestUser(username || undefined);
      onAuthSuccess(guestUser);
      onClose();
      return;
    }

    const uError = validateUsername(username);
    if (uError) {
      setError(uError);
      return;
    }

    const pError = validatePassword(password);
    if (pError) {
      setError(pError);
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'register') {
        const user = await registerUser({ username, password });
        onAuthSuccess(user);
      } else {
        const user = await loginUser({ username, password });
        onAuthSuccess(user);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" style={{ maxWidth: '440px' }} borderRadius={20}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h2 className="modal-title" style={{ textTransform: 'none', fontVariant: 'normal' }}>
          {tab === 'login' ? 'RoyalGambit Login' : 'Join RoyalGambit'}
        </h2>

        {customMessage ? (
          <p className="modal-subtitle" style={{ color: 'var(--rose-gold-light)' }}>
            {customMessage}
          </p>
        ) : (
          <p className="modal-subtitle" style={{ fontStyle: 'italic', color: '#5c2441', marginBottom: '8px' }}>
            The Grandmaster's Art of Strategic Brilliance
          </p>
        )}

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            className={`time-option-btn ${tab === 'login' ? 'selected' : ''}`}
            style={{ flex: 1, padding: '10px' }}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`time-option-btn ${tab === 'register' ? 'selected' : ''}`}
            style={{ flex: 1, padding: '10px' }}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : !isSupabaseConfigured()
                ? 'Play as Guest'
                : tab === 'login'
                ? 'Log In'
                : 'Create Account'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={handleGuestPlay}
            >
              <Play size={16} />
              <span>Continue as Instant Guest</span>
            </button>
          </div>
        </form>
      </LiquidGlassContainer>
    </div>
  );
}

