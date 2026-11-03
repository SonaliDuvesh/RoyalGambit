import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, X, Loader2, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import { analyzeCompletedGame } from '../services/analysisService';

export default function GameReviewModal({
  isOpen,
  onClose,
  moveHistory = [],
  whitePlayerName,
  blackPlayerName,
  winner,
  endReason,
  onSelectReviewPosition,
  onExplorePosition
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);

  useEffect(() => {
    if (!isOpen || moveHistory.length === 0) return;

    async function runAnalysis() {
      setAnalyzing(true);
      setProgress(0);
      try {
        const result = await analyzeCompletedGame(moveHistory, (p) => setProgress(p));
        setAnalysisResult(result);
        setSelectedMoveIdx(0);
        if (result.moves.length > 0 && onSelectReviewPosition) {
          onSelectReviewPosition(result.moves[0].fenAfter);
        }
      } catch (err) {
        console.error('Analysis error:', err);
      } finally {
        setAnalyzing(false);
      }
    }

    runAnalysis();
  }, [isOpen, moveHistory.length]);

  if (!isOpen) return null;

  const currentMove = analysisResult?.moves[selectedMoveIdx];

  const handleMoveClick = (idx) => {
    setSelectedMoveIdx(idx);
    if (analysisResult?.moves[idx] && onSelectReviewPosition) {
      onSelectReviewPosition(analysisResult.moves[idx].fenAfter);
    }
  };

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }} borderRadius={20}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sparkles size={20} color="#22d3ee" />
          <h2 className="modal-title" style={{ fontSize: '1.5rem', margin: 0 }}>
            Game Review & Analysis
          </h2>
        </div>

        <p className="modal-subtitle" style={{ marginBottom: '16px' }}>
          {winner === 'draw' ? 'Match drawn' : `${winner === 'white' ? whitePlayerName : blackPlayerName} victory`} • {endReason}
        </p>

        {analyzing ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--rose-gold)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '8px' }}>
              Stockfish Engine Analyzing Moves... {progress}%
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #991e4a, #22d3ee)', transition: 'width 0.2s ease' }} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              Scanning for tactical sacrifices, brilliant moves, and accuracy metrics.
            </div>
          </div>
        ) : analysisResult ? (
          <div>
            {/* Accuracy Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '18px'
            }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.22)', border: '1px solid rgba(138, 30, 68, 0.3)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '0.82rem', color: '#2b0b1c', fontWeight: 700 }}>{whitePlayerName} (White)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
                  {analysisResult.whiteAccuracy}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#5c2441', fontWeight: 600 }}>Accuracy Score</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.22)', border: '1px solid rgba(138, 30, 68, 0.3)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '0.82rem', color: '#2b0b1c', fontWeight: 700 }}>{blackPlayerName} (Black)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
                  {analysisResult.blackAccuracy}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#5c2441', fontWeight: 600 }}>Accuracy Score</div>
              </div>
            </div>

            {/* Highlights Count */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '18px' }}>
              {analysisResult.brilliantCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(34, 211, 238, 0.2)', border: '1.5px solid #0891b2', borderRadius: '8px', color: '#0e7490', fontSize: '0.82rem', fontWeight: 800 }}>
                  <Sparkles size={14} />
                  <span>{analysisResult.brilliantCount} Brilliant (!!)</span>
                </div>
              )}
              {analysisResult.greatCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(96, 165, 250, 0.2)', border: '1.5px solid #2563eb', borderRadius: '8px', color: '#1d4ed8', fontSize: '0.82rem', fontWeight: 800 }}>
                  <span>{analysisResult.greatCount} Great (!)</span>
                </div>
              )}
            </div>

            {/* Move Explanation Card */}
            {currentMove && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.28)',
                border: `1.5px solid ${currentMove.color}`,
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: currentMove.color,
                      color: '#000',
                      fontWeight: 800,
                      fontSize: '0.78rem'
                    }}>
                      {currentMove.symbol} {currentMove.label}
                    </span>
                    <span style={{ fontWeight: 800, color: '#2b0b1c', fontSize: '1rem' }}>
                      Move {currentMove.moveNumber}: {currentMove.san}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#5c2441', fontWeight: 700 }}>
                    Best: {currentMove.bestMove}
                  </span>
                </div>

                {currentMove.explanation ? (
                  <div style={{ fontSize: '0.86rem', color: '#2b0b1c', marginTop: '6px', fontWeight: 500 }}>
                    {currentMove.explanation}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#4a1532', marginTop: '6px', fontWeight: 500 }}>
                    Engine evaluation: {currentMove.evalAfter > 0 ? `+${(currentMove.evalAfter / 100).toFixed(1)}` : (currentMove.evalAfter / 100).toFixed(1)}. Continuation: {currentMove.pv.slice(0, 30)}
                  </div>
                )}

                {/* Explore / Practice Mode Trigger */}
                <button
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    marginTop: '12px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (onExplorePosition && currentMove) {
                      onExplorePosition(currentMove.fenAfter);
                    }
                  }}
                >
                  <Sparkles size={16} />
                  <span>Practice & Explore This Position</span>
                </button>
              </div>
            )}

            {/* Moves List with Badges */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginBottom: '18px' }}>
              {analysisResult.moves.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => handleMoveClick(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: selectedMoveIdx === idx ? 'rgba(122, 21, 59, 0.22)' : 'rgba(255, 255, 255, 0.18)',
                    border: selectedMoveIdx === idx ? '1.5px solid #8b1d44' : '1px solid rgba(138, 30, 68, 0.15)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#5c2441', fontSize: '0.8rem', fontWeight: 700, width: '28px' }}>
                      {m.moveNumber}.
                    </span>
                    <span style={{ fontWeight: 700, color: '#2b0b1c' }}>
                      {m.san}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: m.color
                  }}>
                    {m.symbol} {m.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
                Close Review
              </button>
            </div>
          </div>
        ) : null}
      </LiquidGlassContainer>
    </div>
  );
}

