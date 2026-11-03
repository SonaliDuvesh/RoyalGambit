import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles, Calendar, Check, Loader2 } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import { fetchPlayerProfile, updatePlayerAvatar } from '../services/leaderboardService';
import { AVATAR_OPTIONS, getAvatarSrc } from '../utils/avatars';

export default function ProfileModal({
  isOpen,
  onClose,
  playerId,
  isCurrentUser = false,
  onAvatarUpdated
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState('queen');

  useEffect(() => {
    if (!isOpen || !playerId) return;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchPlayerProfile(playerId);
        setProfile(data);
        if (data?.avatar) setSelectedAvatar(data.avatar);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, playerId]);

  if (!isOpen) return null;

  const handleSelectAvatar = async (avatarId) => {
    if (!isCurrentUser) return;
    setSelectedAvatar(avatarId);
    await updatePlayerAvatar(playerId, avatarId);
    if (onAvatarUpdated) onAvatarUpdated(avatarId);
  };

  const stats = profile?.stats || {};
  const played = stats.matches_played || 0;
  const wins = stats.wins || 0;
  const winPercent = played > 0 ? Math.round((wins / played) * 100) : 0;

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" style={{ maxWidth: '480px' }} borderRadius={20}>
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

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--rose-gold)' }} />
            <div>Loading player profile...</div>
          </div>
        ) : (
          <div>
            {/* Avatar & Username */}
            <div style={{
              width: '76px',
              height: '76px',
              margin: '0 auto 12px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229, 169, 149, 0.45) 0%, rgba(153, 30, 74, 0.3) 100%)',
              border: '2px solid var(--rose-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              boxShadow: '0 0 20px rgba(229, 169, 149, 0.35)'
            }}>
              <img
                src={getAvatarSrc(selectedAvatar)}
                alt={selectedAvatar}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5))'
                }}
              />
            </div>

            <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              {profile?.username}
            </h2>

            {profile?.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '18px' }}>
                <Calendar size={13} />
                <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            )}

            {/* Avatar Selector for current user */}
            {isCurrentUser && (
              <div style={{ marginBottom: '20px', background: 'rgba(25, 10, 20, 0.6)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-rose)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--rose-gold-light)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  Choose Avatar
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectAvatar(av.id)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: selectedAvatar === av.id ? 'linear-gradient(135deg, rgba(229, 169, 149, 0.45) 0%, rgba(153, 30, 74, 0.5) 100%)' : 'rgba(255, 255, 255, 0.05)',
                        border: selectedAvatar === av.id ? '2px solid var(--rose-gold)' : '1px solid var(--border-rose)',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedAvatar === av.id ? '0 0 12px rgba(229, 169, 149, 0.5)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={av.name}
                    >
                      <img
                        src={av.img}
                        alt={av.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))'
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Player Points Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(153, 30, 74, 0.45) 0%, rgba(229, 169, 149, 0.25) 100%)',
              border: '1px solid var(--rose-gold)',
              borderRadius: '14px',
              padding: '12px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--rose-gold-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Player Rating Points
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Win: +3 pts • Draw: +1 pt • Loss: 0 pts
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'Cinzel, serif', color: 'var(--rose-gold-light)' }}>
                {stats.points || 0} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>pts</span>
              </div>
            </div>

            {/* Lifetime Statistics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(38, 16, 32, 0.65)', border: '1px solid var(--border-rose)', borderRadius: '12px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>{played}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Matches</div>
              </div>

              <div style={{ background: 'rgba(38, 16, 32, 0.65)', border: '1px solid var(--border-rose)', borderRadius: '12px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80' }}>{wins}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Wins</div>
              </div>

              <div style={{ background: 'rgba(38, 16, 32, 0.65)', border: '1px solid var(--border-rose)', borderRadius: '12px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--rose-gold-light)' }}>{winPercent}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Win Rate</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
              <div style={{ background: 'rgba(38, 16, 32, 0.65)', border: '1px solid var(--border-rose)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#22d3ee" />
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22d3ee' }}>
                    {stats.brilliant_moves || 0}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Brilliant Moves (!!)
                </div>
              </div>

              <div style={{ background: 'rgba(38, 16, 32, 0.65)', border: '1px solid var(--border-rose)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  {stats.draws || 0} / {stats.losses || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Draws / Losses
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </LiquidGlassContainer>
    </div>
  );
}

