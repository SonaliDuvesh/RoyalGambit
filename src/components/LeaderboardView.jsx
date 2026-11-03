import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, ArrowLeft, Loader2, Award, User } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import { fetchLeaderboardWins, fetchLeaderboardBrilliant } from '../services/leaderboardService';
import { getAvatarSrc } from '../utils/avatars';

export default function LeaderboardView({ onBack, onSelectPlayer }) {
  const [tab, setTab] = useState('wins'); // 'wins' | 'brilliant'
  const [winsList, setWinsList] = useState([]);
  const [brilliantList, setBrilliantList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [w, b] = await Promise.all([
          fetchLeaderboardWins(),
          fetchLeaderboardBrilliant()
        ]);
        setWinsList(w);
        setBrilliantList(b);
      } catch (err) {
        console.error('Leaderboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span style={{ color: '#fbbf24', fontWeight: 800 }}>🥇 1</span>;
    if (rank === 2) return <span style={{ color: '#cbd5e1', fontWeight: 800 }}>🥈 2</span>;
    if (rank === 3) return <span style={{ color: '#d97706', fontWeight: 800 }}>🥉 3</span>;
    return <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>#{rank}</span>;
  };

  return (
    <LiquidGlassContainer className="luxury-card" style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }} borderRadius={16}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <button
          className="btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={onBack}
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </button>
        <h2 className="modal-title" style={{ fontSize: '1.4rem', margin: 0 }}>
          Leaderboards
        </h2>
        <div style={{ width: '60px' }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`time-option-btn ${tab === 'wins' ? 'selected' : ''}`}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: tab === 'wins' ? '#ffffff' : '#fae2d9',
            background: tab === 'wins' ? 'linear-gradient(135deg, rgba(168, 32, 80, 0.95) 0%, rgba(229, 169, 149, 0.85) 100%)' : 'rgba(42, 16, 34, 0.82)',
            border: tab === 'wins' ? '1px solid var(--rose-gold-light)' : '1px solid rgba(229, 169, 149, 0.35)',
            boxShadow: tab === 'wins' ? '0 4px 14px rgba(168, 32, 80, 0.45)' : 'none'
          }}
          onClick={() => setTab('wins')}
        >
          <Trophy size={18} color={tab === 'wins' ? '#ffffff' : '#fca282'} />
          <span>Most Wins</span>
        </button>
        <button
          className={`time-option-btn ${tab === 'brilliant' ? 'selected' : ''}`}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: tab === 'brilliant' ? '#ffffff' : '#fae2d9',
            background: tab === 'brilliant' ? 'linear-gradient(135deg, rgba(168, 32, 80, 0.95) 0%, rgba(229, 169, 149, 0.85) 100%)' : 'rgba(42, 16, 34, 0.82)',
            border: tab === 'brilliant' ? '1px solid var(--rose-gold-light)' : '1px solid rgba(229, 169, 149, 0.35)',
            boxShadow: tab === 'brilliant' ? '0 4px 14px rgba(168, 32, 80, 0.45)' : 'none'
          }}
          onClick={() => setTab('brilliant')}
        >
          <Sparkles size={18} color={tab === 'brilliant' ? '#ffffff' : '#fca282'} />
          <span>Brilliant Moves</span>
        </button>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#fca282' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading leaderboards...</div>
        </div>
      ) : tab === 'wins' ? (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr 80px 80px 70px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#f8c2b4',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: '1px solid var(--border-rose)'
          }}>
            <span>Rank</span>
            <span>Player</span>
            <span style={{ textAlign: 'center' }}>Wins</span>
            <span style={{ textAlign: 'center' }}>Matches</span>
            <span style={{ textAlign: 'center' }}>Win %</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {winsList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#fadcd2' }}>
                No completed matches recorded yet.
              </div>
            ) : (
              winsList.map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 80px 80px 70px',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(48, 18, 38, 0.72)',
                    border: '1px solid var(--border-rose)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onSelectPlayer(player.id)}
                  title="Click to view player profile"
                >
                  <div>{getRankBadge(player.rank)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(229, 169, 149, 0.4) 0%, rgba(153, 30, 74, 0.3) 100%)',
                      border: '1px solid var(--border-rose)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      flexShrink: 0
                    }}>
                      <img
                        src={getAvatarSrc(player.avatar)}
                        alt={player.username}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                      {player.username}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', fontWeight: 700, color: '#4ade80' }}>
                    {player.wins}
                  </div>
                  <div style={{ textAlign: 'center', color: '#fae2d9', fontWeight: 600 }}>
                    {player.matches_played}
                  </div>
                  <div style={{ textAlign: 'center', fontWeight: 700, color: '#fca282' }}>
                    {player.win_percentage}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr 100px 100px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#f8c2b4',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: '1px solid var(--border-rose)'
          }}>
            <span>Rank</span>
            <span>Player</span>
            <span style={{ textAlign: 'center' }}>Brilliant (!!)</span>
            <span style={{ textAlign: 'center' }}>Analyzed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {brilliantList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#fadcd2' }}>
                No brilliant moves recorded yet.
              </div>
            ) : (
              brilliantList.map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 100px 100px',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(48, 18, 38, 0.72)',
                    border: '1px solid var(--border-rose)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onSelectPlayer(player.id)}
                  title="Click to view player profile"
                >
                  <div>{getRankBadge(player.rank)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(229, 169, 149, 0.4) 0%, rgba(153, 30, 74, 0.3) 100%)',
                      border: '1px solid var(--border-rose)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      flexShrink: 0
                    }}>
                      <img
                        src={getAvatarSrc(player.avatar)}
                        alt={player.username}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                      {player.username}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#fca282', letterSpacing: '0.02em' }}>
                    {player.brilliant_moves} !!
                  </div>
                  <div style={{ textAlign: 'center', color: '#fae2d9', fontWeight: 600 }}>
                    {player.analyzed_games}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </LiquidGlassContainer>
  );
}

