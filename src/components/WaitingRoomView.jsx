import React, { useState } from 'react';
import { Copy, Check, Share2, Users, ArrowLeft, Play, Globe, ExternalLink } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';

export default function WaitingRoomView({
  room,
  currentUser,
  isHost,
  whitePlayerName,
  blackPlayerName,
  isOpponentConnected,
  isReady,
  onToggleReady,
  onStartMatch,
  onCancelRoom
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customOrigin, setCustomOrigin] = useState(() => {
    try {
      return localStorage.getItem('royal_gambit_ngrok_url') || localStorage.getItem('royalgambit_ngrok_url') || localStorage.getItem('cherry_ngrok_url') || '';
    } catch {
      return '';
    }
  });
  const [showNgrokInput, setShowNgrokInput] = useState(false);

  // Auto-detect ngrok public URL if running
  React.useEffect(() => {
    if (!customOrigin) {
      fetch('/api/public-url', { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then((r) => r.json())
        .then((data) => {
          if (data?.publicUrl) {
            setCustomOrigin(data.publicUrl);
          }
        })
        .catch(() => {});
    }
  }, [customOrigin]);

  const roomCode = room?.room_code || room?.id || 'ROOM';
  const effectiveOrigin = (customOrigin.trim() ? customOrigin.trim().replace(/\/$/, '') : window.location.origin);
  const basePath = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
  const inviteUrl = `${effectiveOrigin}${basePath}?room=${roomCode}`;

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const copyUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveNgrok = (val) => {
    setCustomOrigin(val);
    try {
      localStorage.setItem('royal_gambit_ngrok_url', val.trim());
      localStorage.setItem('royalgambit_ngrok_url', val.trim());
    } catch {}
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RoyalGambit',
          text: `RoyalGambit – The Grandmaster's Art of Strategic Brilliance. Room code: ${roomCode}`,
          url: inviteUrl
        });
      } catch {
        copyUrl();
      }
    } else {
      copyUrl();
    }
  };

  return (
    <LiquidGlassContainer className="luxury-card" style={{ maxWidth: '560px', margin: '0 auto', width: '100%', textAlign: 'center' }} borderRadius={16}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={onCancelRoom}
        >
          <ArrowLeft size={14} />
          <span>Leave Room</span>
        </button>
        <span style={{ fontSize: '0.82rem', color: 'var(--rose-gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Time: {room.initial_time || room.timeControl || 10} min
        </span>
      </div>

      <h2 className="modal-title" style={{ fontSize: '1.7rem', marginBottom: '8px' }}>
        Game Waiting Room
      </h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
        Share this invitation link or 6-character room code with your opponent.
      </p>

      {/* Room code display */}
      <div className="room-code-badge" style={{ margin: '14px 0' }}>
        <span>{roomCode}</span>
        <button className="copy-icon-btn" onClick={copyCode} title="Copy Room Code">
          {copiedCode ? <Check size={20} color="#4ade80" /> : <Copy size={20} />}
        </button>
      </div>

      {/* Share / Copy buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <button className="btn-primary" onClick={copyUrl} style={{ padding: '10px' }}>
          {copiedLink ? '✓ Link Copied!' : 'Copy Invite Link'}
        </button>
        <button className="btn-secondary" onClick={shareLink} style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Share2 size={16} />
          <span>Share Link</span>
        </button>
      </div>

      {/* ngrok public URL helper if running on localhost */}
      {isLocalhost && (
        <div style={{
          background: 'rgba(38, 16, 32, 0.5)',
          border: '1px dashed var(--border-rose)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '18px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--rose-gold-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} />
              <span>Playing with friends outside your network (ngrok)?</span>
            </span>
            <button
              onClick={() => setShowNgrokInput(!showNgrokInput)}
              style={{ background: 'none', border: 'none', color: 'var(--rose-gold)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {showNgrokInput ? 'Hide' : customOrigin ? 'Change URL' : 'Set ngrok URL'}
            </button>
          </div>

          {showNgrokInput && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                placeholder="e.g. https://1a2b-3c4d.ngrok-free.app"
                value={customOrigin}
                onChange={(e) => handleSaveNgrok(e.target.value)}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Paste your ngrok URL above so the generated link sends your friend to your public tunnel.
              </div>
            </div>
          )}

          {customOrigin && !showNgrokInput && (
            <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '4px', wordBreak: 'break-all' }}>
              ✓ Public link: {inviteUrl}
            </div>
          )}
        </div>
      )}

      {/* Players Status Box */}
      <div style={{
        background: 'rgba(25, 10, 20, 0.7)',
        borderRadius: '14px',
        border: '1px solid var(--border-rose)',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229, 169, 149, 0.25) 0%, rgba(38, 16, 32, 0.7) 100%)',
              border: '1px solid var(--border-rose)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '2px'
            }}>
              <img
                src="/assets/pieces/white/king.png"
                alt="White Player"
                style={{
                  height: '28px',
                  width: 'auto',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {whitePlayerName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--rose-gold-light)' }}>
                White Player
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}>
            Connected
          </span>
        </div>

        <div style={{ height: '1px', background: 'rgba(229, 169, 149, 0.15)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(153, 30, 74, 0.3) 0%, rgba(38, 16, 32, 0.7) 100%)',
              border: '1px solid var(--border-rose)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '2px'
            }}>
              <img
                src="/assets/pieces/black/king.png"
                alt="Black Player"
                style={{
                  height: '28px',
                  width: 'auto',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {isOpponentConnected ? blackPlayerName : 'Waiting for player...'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Black Player
              </div>
            </div>
          </div>
          {isOpponentConnected ? (
            <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}>
              Connected
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--rose-gold-light)', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e5a995', animation: 'dot-glow 1s infinite alternate' }} />
              Waiting...
            </div>
          )}
        </div>
      </div>

      {/* Start Match button */}
      {isOpponentConnected ? (
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={onStartMatch}
        >
          <Play size={18} fill="#fff" />
          <span>START GAME NOW</span>
        </button>
      ) : (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          The match will start automatically once your opponent joins the room.
        </div>
      )}
    </LiquidGlassContainer>
  );
}
