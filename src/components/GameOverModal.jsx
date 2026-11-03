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

  // Resolve genuine player usernames (falling back gracefully to 'White' / 'Black' if not set)
  const whiteName = (whitePlayerName && typeof whitePlayerName === 'string' && whitePlayerName.trim() && whitePlayerName.trim().toLowerCase() !== 'white')
    ? whitePlayerName.trim()
    : null;
  const blackName = (blackPlayerName && typeof blackPlayerName === 'string' && blackPlayerName.trim() && blackPlayerName.trim().toLowerCase() !== 'black')
    ? blackPlayerName.trim()
    : null;

  const winnerDisplayName = isWhiteWin ? (whiteName || 'White') : isBlackWin ? (blackName || 'Black') : null;
  const loserDisplayName = isWhiteWin ? (blackName || 'Black') : isBlackWin ? (whiteName || 'White') : null;

  // Title: reflects username of the winner
  const title = winner === 'draw'
    ? 'Game Drawn'
    : `${winnerDisplayName} Victory!`;

  // Subtitle / Reason: dynamically replaces generic color terms with actual usernames
  let displayReason = reason ? String(reason).trim() : '';
  if (displayReason) {
    if (whiteName) {
      displayReason = displayReason.replace(/\bWhite\b/g, whiteName);
    }
    if (blackName) {
      displayReason = displayReason.replace(/\bBlack\b/g, blackName);
    }
    if (!displayReason.endsWith('.') && !displayReason.endsWith('!')) {
      displayReason += '.';
    }
  } else {
    displayReason = winner === 'draw'
      ? 'The game ended in a draw.'
      : `${winnerDisplayName} won the match.`;
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

        <p className="modal-subtitle">
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
