import React, { useState } from 'react';
import { Copy, Check, Users, Globe, X } from 'lucide-react';

const TIME_OPTIONS = [
  { label: '1 min', value: 1 },
  { label: '3 min', value: 3 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: 'Custom', value: 'custom' }
];

export default function OnlineLobbyModal({
  isOpen,
  onClose,
  onlineRoom,
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom
}) {
  const [activeTab, setActiveTab] = useState(initialRoomCode ? 'join' : 'create');
  const [playerName, setPlayerName] = useState('');
  const [timeControl, setTimeControl] = useState(10);
  const [customMinutes, setCustomMinutes] = useState(20);
  const [colorPref, setColorPref] = useState('random');
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Update joinCode when initialRoomCode changes
  React.useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(initialRoomCode);
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    const finalMinutes = timeControl === 'custom' ? parseInt(customMinutes) || 10 : timeControl;
    onCreateRoom({
      playerName: playerName.trim() || 'Player 1',
      timeControlMinutes: finalMinutes,
      preferredColor: colorPref
    });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom({
      roomId: joinCode.trim().toUpperCase(),
      playerName: playerName.trim() || 'Player 2'
    });
  };

  const copyRoomCode = () => {
    if (!onlineRoom?.id) return;
    navigator.clipboard.writeText(onlineRoom.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    if (!onlineRoom?.id) return;
    const url = `${window.location.origin}?room=${onlineRoom.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
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

        <h2 className="modal-title">Online Two-Player</h2>
        <p className="modal-subtitle">
          Play chess in real time against another human player anywhere in the world.
        </p>

        {/* If room already active */}
        {onlineRoom ? (
          <div>
            <div style={{ color: 'var(--rose-gold-light)', marginBottom: '8px', fontSize: '0.9rem' }}>
              Room Active:
            </div>
            <div className="room-code-badge">
              <span>{onlineRoom.id}</span>
              <button className="copy-icon-btn" onClick={copyRoomCode} title="Copy Room Code">
                {copiedCode ? <Check size={20} color="#4ade80" /> : <Copy size={20} />}
              </button>
            </div>

            <div style={{ margin: '14px 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {onlineRoom.status === 'waiting' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#e5a995', animation: 'dot-glow 1s infinite alternate' }} />
                  Waiting for opponent to connect...
                </div>
              ) : (
                <div style={{ color: '#4ade80' }}>
                  ✓ Both players connected! Game in progress.
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
              <button className="btn-primary" onClick={copyInviteLink}>
                {copiedLink ? '✓ Link Copied!' : 'Copy Invitation Link'}
              </button>
              <button className="btn-secondary" onClick={onClose}>
                Back to Game
              </button>
              <button
                className="btn-secondary"
                style={{ color: '#f87171' }}
                onClick={() => {
                  onLeaveRoom();
                  onClose();
                }}
              >
                Leave Room & Play Local
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                className={`time-option-btn ${activeTab === 'create' ? 'selected' : ''}`}
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setActiveTab('create')}
              >
                Create Room
              </button>
              <button
                className={`time-option-btn ${activeTab === 'join' ? 'selected' : ''}`}
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setActiveTab('join')}
              >
                Join with Code
              </button>
            </div>

            {activeTab === 'create' ? (
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Duvesh"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>

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
                    Create Game Room
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoin}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Guest"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">6-Character Room Code</label>
                  <input
                    type="text"
                    className="form-input"
                    maxLength={6}
                    placeholder="e.g. BLOSSM"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.2rem', textAlign: 'center' }}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    Join Room
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
