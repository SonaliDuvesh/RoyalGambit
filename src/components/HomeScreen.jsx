import React from 'react';
import { Play, Trophy, User, Settings, LogOut, LogIn, Sparkles, Download } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import { getAvatarSrc } from '../utils/avatars';

export default function HomeScreen({
  currentUser,
  onNavigate, // 'create_join' | 'leaderboard' | 'profile' | 'settings'
  onOpenAuth,
  onLogout,
  onInstallApp,
  isStandalone
}) {
  return (
    <div style={{
      maxWidth: '520px',
      margin: '0 auto',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      alignItems: 'center',
      textAlign: 'center'
    }}>
      {/* Brand Hero */}
      <div style={{ position: 'relative', marginTop: '10px' }}>
        <img
          src="/assets/pieces/white/king.png"
          alt="RoyalGambit"
          style={{
            height: '110px',
            maxHeight: '120px',
            width: 'auto',
            objectFit: 'contain',
            display: 'inline-block',
            filter: 'drop-shadow(0 4px 14px rgba(35, 10, 24, 0.6))'
          }}
        />
        <h1
          className="brand-title"
          style={{
            fontSize: '2.5rem',
            marginTop: '12px',
            letterSpacing: '0.04em',
            textTransform: 'none',
            fontVariant: 'normal',
            filter: 'drop-shadow(0 3px 12px rgba(28, 6, 18, 0.9)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.95))'
          }}
        >
          RoyalGambit
        </h1>
        <div
          className="brand-subtitle"
          style={{
            fontSize: '0.96rem',
            marginTop: '6px',
            color: '#f8c7b8',
            textShadow: '0 1px 5px rgba(20, 5, 14, 0.95), 0 0 10px rgba(229, 169, 149, 0.35)',
            fontWeight: 500,
            letterSpacing: '0.04em'
          }}
        >
          The Grandmaster's Art of Strategic Brilliance
        </div>
      </div>

      {/* User Card */}
      <LiquidGlassContainer className="luxury-card" style={{ width: '100%', padding: '16px 20px' }} borderRadius={16}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={() => onNavigate('profile')}
              title="View Profile"
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(229, 169, 149, 0.4) 0%, rgba(153, 30, 74, 0.3) 100%)',
                border: '1px solid var(--rose-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                boxShadow: '0 0 10px rgba(229, 169, 149, 0.3)'
              }}>
                <img
                  src={getAvatarSrc(currentUser?.avatar)}
                  alt={currentUser?.username || 'avatar'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))'
                  }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                  {currentUser.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--rose-gold-light)', fontWeight: 600 }}>
                  <span style={{ color: '#e5a995' }}>{currentUser.points || 0} pts</span>
                  <span style={{ margin: '0 6px', color: 'var(--text-dim)' }}>•</span>
                  <span style={{ color: '#4ade80' }}>● Active</span>
                </div>
              </div>
            </div>

            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onLogout}
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Guest Player</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Log in to track wins & rank</div>
            </div>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onOpenAuth}
            >
              <LogIn size={15} />
              <span>Log In / Register</span>
            </button>
          </div>
        )}
      </LiquidGlassContainer>

      {/* Main Navigation Actions */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Play Chess Button */}
        <button
          className="btn-primary"
          style={{
            padding: '18px 24px',
            fontSize: '1.25rem',
            fontFamily: 'Cinzel, serif',
            fontWeight: 700,
            letterSpacing: '0.08em',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 8px 28px rgba(153, 30, 74, 0.55)'
          }}
          onClick={() => onNavigate('create_join')}
        >
          <Play size={24} fill="#fff" />
          <span>PLAY CHESS</span>
        </button>

        {/* Leaderboard Button */}
        <button
          className="home-action-btn"
          onClick={() => onNavigate('leaderboard')}
        >
          <Trophy size={20} color="#fca282" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fae2d9' }}>
            Leaderboards & Brilliant Moves
          </span>
        </button>

        {/* Install PWA Button (when running in browser) */}
        {!isStandalone && (
          <button
            className="home-action-btn"
            style={{
              padding: '12px 18px',
              background: 'linear-gradient(135deg, rgba(88, 24, 55, 0.92), rgba(42, 16, 35, 0.94))',
              border: '1px solid var(--rose-gold)'
            }}
            onClick={onInstallApp}
          >
            <Download size={18} color="#fca282" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fae2d9' }}>
              Install Application (Desktop / Mobile)
            </span>
          </button>
        )}

        {/* Profile & Settings row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
          <button
            className="home-action-btn"
            style={{ padding: '12px 16px', gap: '8px', fontSize: '0.92rem' }}
            onClick={() => onNavigate('profile')}
          >
            <User size={18} color="#fca282" />
            <span style={{ color: '#fae2d9', fontWeight: 600 }}>My Profile</span>
          </button>

          <button
            className="home-action-btn"
            style={{ padding: '12px 16px', gap: '8px', fontSize: '0.92rem' }}
            onClick={() => onNavigate('settings')}
          >
            <Settings size={18} color="#fca282" />
            <span style={{ color: '#fae2d9', fontWeight: 600 }}>Settings</span>
          </button>
        </div>
      </div>

      {/* Brand Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: '8px', textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Marcellus', serif",
          fontSize: '0.96rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'none',
          fontVariant: 'normal',
          color: '#3d0f28',
          textShadow: '0 1px 1px rgba(255, 255, 255, 0.4)',
          marginBottom: '2px'
        }}>
          RoyalGambit
        </p>
        <p style={{
          fontFamily: 'Marcellus, serif',
          fontStyle: 'italic',
          fontSize: '0.78rem',
          color: '#6e2343',
          letterSpacing: '0.04em'
        }}>
          The Grandmaster's Art of Strategic Brilliance
        </p>
      </footer>
    </div>
  );
}

