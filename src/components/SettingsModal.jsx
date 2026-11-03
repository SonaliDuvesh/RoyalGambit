import React from 'react';
import { X, Volume2, VolumeX, Eye, Clock, ArrowLeftRight, Download, Smartphone, Palette, Check } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import { sounds } from '../utils/audio';

const BACKGROUND_THEMES = [
  {
    id: 'rose-gold-silk',
    name: 'Rose Gold Silk',
    thumb: '/assets/theme/thumbs/rose-gold-silk.webp'
  },
  {
    id: 'pink-marble',
    name: 'Pink Marble',
    thumb: '/assets/theme/thumbs/pink-marble.webp'
  },
  {
    id: 'golden-stardust',
    name: 'Golden Stardust',
    thumb: '/assets/theme/thumbs/golden-stardust.webp'
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    thumb: '/assets/theme/thumbs/liquid-glass.webp'
  }
];

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onInstallApp,
  isStandalone
}) {
  if (!isOpen) return null;

  const currentTheme = settings.backgroundTheme || 'rose-gold-silk';

  const toggle = (key) => {
    onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  const setVal = (key, val) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" style={{ maxWidth: '460px' }} borderRadius={20}>
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

        <h2 className="modal-title">Game Preferences</h2>
        <p className="modal-subtitle">Saved locally in your browser.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          {/* Background Theme Selector */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(38, 16, 32, 0.6)',
            borderRadius: '10px',
            border: '1px solid var(--border-rose)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={16} color="var(--rose-gold)" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Background Theme</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--rose-gold-light)' }}>
                {BACKGROUND_THEMES.find(t => t.id === currentTheme)?.name || 'Rose Gold Silk'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {BACKGROUND_THEMES.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setVal('backgroundTheme', theme.id)}
                    style={{
                      position: 'relative',
                      height: '64px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid var(--rose-gold)' : '1px solid rgba(229, 169, 149, 0.25)',
                      boxShadow: isSelected ? '0 0 12px rgba(229, 169, 149, 0.4)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                      background: 'none',
                      textAlign: 'left'
                    }}
                  >
                    <img
                      src={theme.thumb}
                      alt={theme.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        filter: isSelected ? 'brightness(1.05)' : 'brightness(0.75)',
                        transition: 'filter 0.2s ease'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: isSelected
                        ? 'linear-gradient(to top, rgba(20, 8, 16, 0.85) 0%, rgba(20, 8, 16, 0.1) 60%)'
                        : 'linear-gradient(to top, rgba(15, 6, 12, 0.9) 0%, rgba(15, 6, 12, 0.3) 100%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      padding: '6px 8px'
                    }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                      }}>
                        {theme.name}
                      </span>
                      {isSelected && (
                        <span style={{
                          background: 'var(--rose-gold)',
                          color: '#261020',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                        }}>
                          <Check size={11} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Master Sound */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(38, 16, 32, 0.6)', borderRadius: '10px', border: '1px solid var(--border-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {settings.soundEnabled ? <Volume2 size={18} color="var(--rose-gold)" /> : <VolumeX size={18} color="var(--text-dim)" />}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Master Audio</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Enable sound effects</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={() => toggle('soundEnabled')}
              style={{ width: '18px', height: '18px', accentColor: 'var(--rose-gold)' }}
            />
          </div>

          {/* Sound Effects Preview */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(38, 16, 32, 0.6)',
            borderRadius: '10px',
            border: '1px solid var(--border-rose)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} color="var(--rose-gold)" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Sound Effects Preview</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--rose-gold-light)' }}>Click to test</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => sounds.preview('move')}
                title="Normal move sound"
              >
                <span>♟ Move</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '6px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #991e4a 0%, #e5a995 100%)' }}
                onClick={() => sounds.preview('capture')}
                title="Chess.com-style capture sound (heavier wooden impact)"
              >
                <span>⚔️ Capture</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => sounds.preview('check')}
                title="Check warning sound"
              >
                <span>⚠️ Check</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => sounds.preview('castle')}
                title="Castling sound"
              >
                <span>👑 Castle</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => sounds.preview('gameEnd')}
                title="Game completion sound"
              >
                <span>🏆 End Game</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => sounds.preview('notify')}
                title="Chat notification sound"
              >
                <span>💬 Notify</span>
              </button>
            </div>
          </div>

          {/* Legal Move Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(38, 16, 32, 0.6)', borderRadius: '10px', border: '1px solid var(--border-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Eye size={18} color="var(--rose-gold)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Legal Move Dots</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Show destination indicators</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showMoveDots}
              onChange={() => toggle('showMoveDots')}
              style={{ width: '18px', height: '18px', accentColor: 'var(--rose-gold)' }}
            />
          </div>

          {/* Preferred Time Control */}
          <div style={{ padding: '12px 14px', background: 'rgba(38, 16, 32, 0.6)', borderRadius: '10px', border: '1px solid var(--border-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Clock size={16} color="var(--rose-gold)" />
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Default Time Control</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[3, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`time-option-btn ${settings.preferredTime === mins ? 'selected' : ''}`}
                  style={{ padding: '6px' }}
                  onClick={() => setVal('preferredTime', mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Install Application */}
          {!isStandalone && onInstallApp && (
            <div style={{ padding: '12px 14px', background: 'rgba(82, 23, 51, 0.4)', borderRadius: '10px', border: '1px solid var(--border-rose)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Smartphone size={18} color="var(--rose-gold)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Install App</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Add to homescreen or desktop</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => {
                  onInstallApp();
                  onClose();
                }}
              >
                Install
              </button>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '22px' }}>
          <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Done
          </button>
        </div>
      </LiquidGlassContainer>
    </div>
  );
}

