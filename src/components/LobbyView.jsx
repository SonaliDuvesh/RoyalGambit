import React, { useState } from 'react';
import { Users, Link2, KeyRound, UserPlus, Play, LogIn, LogOut } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';

const TIME_OPTIONS = [
  { label: '1 min', value: 1 },
  { label: '3 min', value: 3 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: 'Custom', value: 'custom' }
];

export default function LobbyView({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSearch,
  onCreateRoom,
  onJoinRoomCode,
  onStartLocalPractice
}) {
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [timeControl, setTimeControl] = useState(10);
  const [customMinutes, setCustomMinutes] = useState(20);
  const [colorPref, setColorPref] = useState('random');

  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const handleCreateRoomSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('Please log in or create an account to start an online game.');
      return;
    }
    const finalMinutes = timeControl === 'custom' ? parseInt(customMinutes) || 10 : timeControl;
    onCreateRoom({
      timeControlMinutes: finalMinutes,
      preferredColor: colorPref
    });
    setShowCreateLink(false);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (!currentUser) {
      onOpenAuth('Please log in or create an account to join an online game.');
      return;
    }
    onJoinRoomCode(joinCode.trim().toUpperCase());
    setShowJoinCode(false);
  };

  return (
    <LiquidGlassContainer className="luxury-card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }} borderRadius={16}>
      {/* User profile header / Login button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-rose)',
        marginBottom: '20px'
      }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229, 169, 149, 0.4) 0%, rgba(153, 30, 74, 0.3) 100%)',
              border: '1px solid var(--rose-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontWeight: 800, color: 'var(--rose-gold-light)', fontSize: '1.1rem' }}>
                {currentUser.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                {currentUser.username}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#4ade80' }}>
                ● Online
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              Playing as Guest
            </span>
          </div>
        )}

        {currentUser ? (
          <button
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={onLogout}
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        ) : (
          <button
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onOpenAuth()}
          >
            <LogIn size={15} />
            <span>Log In / Register</span>
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <h2 className="modal-title" style={{ fontSize: '1.6rem', marginBottom: '6px' }}>
          Play Chess
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Select a mode to begin your game with another player.
        </p>
      </div>

      {/* Main Options Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Play with a Friend */}
        <button
          className="control-btn"
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            padding: '16px 20px',
            borderRadius: '14px',
            gap: '16px',
            background: 'linear-gradient(135deg, rgba(52, 18, 40, 0.88), rgba(30, 10, 24, 0.92))',
            border: '1px solid rgba(229, 169, 149, 0.4)',
            color: '#fae2d9'
          }}
          onClick={() => {
            if (!currentUser) {
              onOpenAuth('Please log in or register to search and invite friends.');
            } else {
              onOpenSearch();
            }
          }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(153, 30, 74, 0.6) 0%, rgba(229, 169, 149, 0.4) 100%)',
            border: '1px solid var(--rose-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={22} color="var(--rose-gold-light)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              Play with a Friend
            </div>
            <div style={{ fontSize: '0.82rem', color: '#f8c2b4' }}>
              Search registered players by username and send a match invitation
            </div>
          </div>
        </button>

        {/* Invite Using Link */}
        <button
          className="control-btn"
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            padding: '16px 20px',
            borderRadius: '14px',
            gap: '16px',
            background: 'linear-gradient(135deg, rgba(52, 18, 40, 0.88), rgba(30, 10, 24, 0.92))',
            border: '1px solid rgba(229, 169, 149, 0.4)',
            color: '#fae2d9'
          }}
          onClick={() => setShowCreateLink(true)}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(153, 30, 74, 0.6) 0%, rgba(229, 169, 149, 0.4) 100%)',
            border: '1px solid var(--rose-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Link2 size={22} color="var(--rose-gold-light)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              Invite Using Link
            </div>
            <div style={{ fontSize: '0.82rem', color: '#f8c2b4' }}>
              Create a private room and share a custom invite link
            </div>
          </div>
        </button>

        {/* Enter Room Code */}
        <button
          className="control-btn"
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            padding: '16px 20px',
            borderRadius: '14px',
            gap: '16px',
            background: 'linear-gradient(135deg, rgba(52, 18, 40, 0.88), rgba(30, 10, 24, 0.92))',
            border: '1px solid rgba(229, 169, 149, 0.4)',
            color: '#fae2d9'
          }}
          onClick={() => setShowJoinCode(true)}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(153, 30, 74, 0.6) 0%, rgba(229, 169, 149, 0.4) 100%)',
            border: '1px solid var(--rose-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <KeyRound size={22} color="var(--rose-gold-light)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              Enter Room Code
            </div>
            <div style={{ fontSize: '0.82rem', color: '#f8c2b4' }}>
              Join a friend's room using a 6-character game code
            </div>
          </div>
        </button>

        {/* Local Solo Practice */}
        <button
          className="control-btn"
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            padding: '14px 20px',
            borderRadius: '14px',
            gap: '16px',
            background: 'linear-gradient(135deg, rgba(38, 14, 28, 0.75), rgba(22, 8, 18, 0.82))',
            border: '1px solid rgba(229, 169, 149, 0.3)',
            color: '#fae2d9'
          }}
          onClick={onStartLocalPractice}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Play size={18} color="#fca282" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
              Local Practice Mode
            </div>
            <div style={{ fontSize: '0.78rem', color: '#f8c2b4' }}>
              Play both sides locally on this device
            </div>
          </div>
        </button>
      </div>

      {/* Create Link Room Modal */}
      {showCreateLink && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h2 className="modal-title">Create Chess Room</h2>
            <p className="modal-subtitle">Configure your game settings:</p>

            <form onSubmit={handleCreateRoomSubmit}>
              <div className="form-group">
                <label className="form-label">Time Control</label>
                <div className="time-select-grid">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`time-option-btn ${timeControl === opt.value ? 'selected' : ''}`}
                      onClick={() => setTimeControl(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {timeControl === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Custom Minutes (Per Player)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    className="form-input"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Play As</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Random', val: 'random' },
                    { label: 'White', val: 'white' },
                    { label: 'Black', val: 'black' }
                  ].map((c) => (
                    <button
                      key={c.val}
                      type="button"
                      className={`time-option-btn ${colorPref === c.val ? 'selected' : ''}`}
                      onClick={() => setColorPref(c.val)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Generate Room & Link
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateLink(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Room Code Modal */}
      {showJoinCode && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h2 className="modal-title">Enter Room Code</h2>
            <p className="modal-subtitle">Enter the 6-character room code from your friend:</p>

            <form onSubmit={handleJoinSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="e.g. BLOSSM"
                  style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '1.4rem' }}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Join Match
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowJoinCode(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LiquidGlassContainer>
  );
}

