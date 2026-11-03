import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';

export default function GameOverModal({
  isOpen,
  winner, // 'white' | 'black' | 'draw'
  reason,
  whitePlayerName,
  blackPlayerName,
  onRestart,
  onClose
}) {
  useEffect(() => {
    if (isOpen && winner !== 'draw') {
      // Rose gold and royal petal celebration
      const colors = ['#f7b2c9', '#e5a995', '#991e4a', '#fae2d9', '#ffffff'];
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors
        });
      }, 250);
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  const isWhiteWin = winner === 'white';
  const isBlackWin = winner === 'black';
  const isDraw = winner === 'draw';

  // Resolve genuine player usernames cleanly with sensible fallbacks
  const cleanName = (val, fallback) => {
    if (!val || typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === 'waiting...' || trimmed.toLowerCase() === fallback.toLowerCase()) {
      return fallback;
    }
    return trimmed;
  };

  const whiteDisplayName = cleanName(whitePlayerName, 'White');
  const blackDisplayName = cleanName(blackPlayerName, 'Black');

  const winnerDisplayName = isWhiteWin ? whiteDisplayName : isBlackWin ? blackDisplayName : null;
  const loserDisplayName = isWhiteWin ? blackDisplayName : isBlackWin ? whiteDisplayName : null;

  // Title: prominently reflects the winning player
  const title = isDraw
    ? 'Game Drawn'
    : `${winnerDisplayName} Victory!`;

  // Subtitle / Reason: explicitly state who won and who lost using real usernames
  let displayReason = '';
  const rawReason = (reason ? String(reason).trim() : '').toLowerCase();

  if (isDraw) {
    if (rawReason.includes('stalemate')) {
      displayReason = `Stalemate — ${whiteDisplayName} and ${blackDisplayName} drew the match.`;
    } else if (rawReason.includes('threefold')) {
      displayReason = `Threefold repetition — draw between ${whiteDisplayName} and ${blackDisplayName}.`;
    } else if (rawReason.includes('insufficient')) {
      displayReason = `Insufficient material — draw between ${whiteDisplayName} and ${blackDisplayName}.`;
    } else if (rawReason.includes('agreement') || rawReason.includes('mutual')) {
      displayReason = `Draw by mutual agreement between ${whiteDisplayName} and ${blackDisplayName}.`;
    } else if (rawReason.includes('50') || rawReason.includes('fifty')) {
      displayReason = `50-move rule — draw between ${whiteDisplayName} and ${blackDisplayName}.`;
    } else {
      displayReason = `The match between ${whiteDisplayName} and ${blackDisplayName} ended in a draw.`;
    }
  } else {
    // Winner decided: clearly state who won and who lost
    if (rawReason.includes('time') || rawReason.includes('timeout')) {
      displayReason = `${loserDisplayName} ran out of time — ${winnerDisplayName} won!`;
    } else if (rawReason.includes('resign')) {
      displayReason = `${loserDisplayName} resigned — ${winnerDisplayName} won!`;
    } else if (rawReason.includes('checkmate')) {
      displayReason = `Checkmate! ${winnerDisplayName} defeated ${loserDisplayName}!`;
    } else if (rawReason.includes('disconnect') || rawReason.includes('abandon')) {
      displayReason = `${loserDisplayName} disconnected — ${winnerDisplayName} won!`;
    } else if (reason) {
      let r = String(reason).trim();
      r = r.replace(/\bWhite\b/g, whiteDisplayName).replace(/\bBlack\b/g, blackDisplayName);
      displayReason = r;
      if (!displayReason.endsWith('.') && !displayReason.endsWith('!')) {
        displayReason += '.';
      }
    } else {
      displayReason = `${winnerDisplayName} defeated ${loserDisplayName}.`;
    }
  }

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" borderRadius={20}>
        <div style={{ marginBottom: '16px' }}>
          {winner !== 'draw' ? (
            <div style={{
              width: '70px',
              height: '70px',
              margin: '0 auto',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229, 169, 149, 0.4) 0%, rgba(153, 30, 74, 0.2) 80%)',
              border: '2px solid var(--rose-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(229, 169, 149, 0.4)'
            }}>
              <Trophy size={36} color="var(--rose-gold-light)" />
            </div>
          ) : (
            <div style={{
              width: '70px',
              height: '70px',
              margin: '0 auto',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={32} color="var(--text-muted)" />
            </div>
          )}
        </div>

        <h2 className="modal-title">
          {title}
        </h2>

        {/* Match Result Breakdown explicitly reflecting who won and who lost */}
        <div className="game-over-players-summary" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          margin: '0 auto 16px',
          padding: '10px 16px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(229, 169, 149, 0.25)',
          maxWidth: '380px'
        }}>
          {!isDraw ? (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.05rem' }}>👑</span>
                <span style={{ color: 'var(--rose-gold-light)', fontWeight: 700, fontSize: '0.96rem' }}>
                  {winnerDisplayName}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(74, 222, 128, 0.2)',
                  color: '#4ade80',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Won
                </span>
              </div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600 }}>vs</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.96rem' }}>
                  {loserDisplayName}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Lost
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--rose-gold-light)', fontWeight: 600, fontSize: '0.96rem' }}>
                  {whiteDisplayName}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  Draw
                </span>
              </div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>vs</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--rose-gold-light)', fontWeight: 600, fontSize: '0.96rem' }}>
                  {blackDisplayName}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  Draw
                </span>
              </div>
            </>
          )}
        </div>

        <p className="modal-subtitle" style={{ marginBottom: '22px' }}>
          {displayReason}
        </p>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onRestart}>
            Play Again
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Review Board
          </button>
        </div>
      </LiquidGlassContainer>
    </div>
  );
}
