import React, { useEffect, useRef } from 'react';
import { LiquidGlassContainer } from '../lib/liquid-glass';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Flag,
  Handshake,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCw,
  MessageSquare,
  Sparkles,
  Settings,
  RefreshCw,
  Palette,
  ArrowLeft
} from 'lucide-react';
import { getAvatarSrc } from '../utils/avatars';
import {
  PIECE_VALUES,
  PIECE_NAME_MAP,
  groupCapturedPieces,
  calculateBoardMaterial
} from '../utils/chessLogic';

function formatTime(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function GamePanel({
  gameMode, // 'local' | 'online'
  turn,
  board,
  isFlipped,
  whiteTime,
  blackTime,
  whitePlayer,
  blackPlayer,
  capturedPieces,
  moveHistory,
  historyIndex,
  inCheck,
  statusMessage,
  connectionStatus = 'connected', // 'connected' | 'reconnecting' | 'opponent_disconnected'
  unreadChatCount = 0,
  onOpenChat,
  onOpenSettings,
  onOpenReview,
  onRequestRematch,
  onFlipBoard,
  onUndoMove,
  onRestartGame,
  onResign,
  onOfferDraw,
  onNavigateHistory,
  isGameOver,
  currentTheme,
  onCycleTheme,
  premove,
  isExploring,
  explorationMoves = [],
  onStartExploration,
  onUndoExploration,
  onResetExploration,
  onExitExploration
}) {
  const movesContainerRef = useRef(null);

  // Auto-scroll moves table to bottom when new move is added
  useEffect(() => {
    if (movesContainerRef.current) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moveHistory.length]);

  // Calculate material scores & net advantages
  const boardMaterial = board ? calculateBoardMaterial(board) : null;
  const whiteCapturedScore = (capturedPieces?.white || []).reduce((acc, p) => acc + (PIECE_VALUES[p] || 0), 0);
  const blackCapturedScore = (capturedPieces?.black || []).reduce((acc, p) => acc + (PIECE_VALUES[p] || 0), 0);
  const whiteAdvantage = boardMaterial ? boardMaterial.whiteAdvantage : Math.max(0, whiteCapturedScore - blackCapturedScore);
  const blackAdvantage = boardMaterial ? boardMaterial.blackAdvantage : Math.max(0, blackCapturedScore - whiteCapturedScore);

  // Prepare move rows
  const moveRows = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    moveRows.push({
      num: Math.floor(i / 2) + 1,
      whiteMove: moveHistory[i],
      whiteIdx: i,
      blackMove: moveHistory[i + 1] || null,
      blackIdx: i + 1
    });
  }

  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';

  const renderPlayerCard = (color) => {
    const isWhite = color === 'w';
    const player = isWhite ? whitePlayer : blackPlayer;
    const timeMs = isWhite ? whiteTime : blackTime;
    const isTurn = turn === color && !isGameOver;
    const isPlayerInCheck = isTurn && inCheck;
    const isLowTime = timeMs < 30000 && !isGameOver;
    const advantage = isWhite ? whiteAdvantage : blackAdvantage;
    const captured = isWhite ? (capturedPieces?.white || []) : (capturedPieces?.black || []);
    const opponentPieceColor = isWhite ? 'black' : 'white';
    const groupedCaptured = groupCapturedPieces(captured);

    let cardClasses = 'player-card';
    if (isPlayerInCheck) cardClasses += ' in-check-turn active-turn';
    else if (isTurn) cardClasses += ' active-turn';

    return (
      <LiquidGlassContainer className={cardClasses} borderRadius={12}>
        <div className="player-info">
          <div className="player-avatar">
            <img
              src={getAvatarSrc(player?.avatar || (isWhite ? 'king' : 'queen'))}
              alt={player?.name || 'player'}
            />
          </div>
          <div className="player-name-wrapper">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="player-title">
                {player.name}
              </div>
              {isPlayerInCheck ? (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  color: '#991b1b',
                  border: '1px solid #ef4444',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em'
                }}>
                  IN CHECK
                </span>
              ) : isTurn ? (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(122, 21, 59, 0.18)',
                  color: '#3b0a22',
                  border: '1px solid rgba(138, 30, 68, 0.45)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#991e4a', boxShadow: '0 0 6px #991e4a' }} />
                  {isWhite ? "White's Turn" : "Black's Turn"}
                </span>
              ) : null}
            </div>
            <div className="captured-pieces-list">
              {groupedCaptured.map(({ piece, count }) => (
                <div
                  key={piece}
                  className="captured-piece-group"
                  style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                >
                  <img
                    src={`/assets/pieces/${opponentPieceColor}/${PIECE_NAME_MAP[piece]}.png`}
                    alt={piece}
                    className="captured-piece-icon"
                    title={`${count} ${PIECE_NAME_MAP[piece]}${count > 1 ? 's' : ''} (value: ${PIECE_VALUES[piece] * count})`}
                  />
                  {count > 1 && (
                    <span
                      className="captured-piece-multiplier"
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#fca282',
                        marginLeft: '1px',
                        marginRight: '3px',
                        lineHeight: 1
                      }}
                      title={`${count} captured`}
                    >
                      {count}
                    </span>
                  )}
                </div>
              ))}
              {advantage > 0 && (
                <span className="material-advantage" title={`Material advantage: +${advantage}`}>+{advantage}</span>
              )}
            </div>
          </div>
        </div>

        <div className={`timer-badge ${isTurn ? 'active' : ''} ${isLowTime ? 'low-time' : ''}`}>
          {formatTime(timeMs)}
        </div>
      </LiquidGlassContainer>
    );
  };

  return (
    <div className="side-panel">
      {/* Top Player */}
      {renderPlayerCard(topColor)}

      {/* Connection & status banner */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {connectionStatus !== 'connected' && (
          <div style={{
            fontSize: '0.78rem',
            textAlign: 'center',
            padding: '4px 10px',
            borderRadius: '8px',
            background: connectionStatus === 'reconnecting' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: connectionStatus === 'reconnecting' ? '#fde047' : '#fca5a5',
            border: '1px solid currentColor'
          }}>
            {connectionStatus === 'reconnecting' ? 'Reconnecting to match...' : 'Opponent disconnected. Waiting to reconnect...'}
          </div>
        )}

        <div className={`status-badge ${inCheck ? 'check' : ''}`}>
          {statusMessage}
        </div>
      </div>

      {/* Move History Table */}
      <LiquidGlassContainer className="luxury-card moves-container" borderRadius={14}>
        <div className="moves-header">
          <span className="moves-title">Move History</span>
          <span style={{ fontSize: '0.8rem', color: '#5c2441', fontWeight: 700 }}>
            {moveHistory.length} {moveHistory.length === 1 ? 'move' : 'moves'}
          </span>
        </div>

        <div className="moves-table" ref={movesContainerRef}>
          {moveRows.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#5c2441', margin: 'auto', fontSize: '0.85rem', fontWeight: 600 }}>
              Game in progress. Make your move!
            </div>
          ) : (
            moveRows.map((row) => (
              <div key={row.num} className="move-row">
                <span className="move-num">{row.num}.</span>
                <span
                  className={`move-cell ${historyIndex === row.whiteIdx ? 'active-history-move' : ''}`}
                  onClick={() => onNavigateHistory(row.whiteIdx)}
                >
                  {row.whiteMove.san}
                </span>
                {row.blackMove ? (
                  <span
                    className={`move-cell ${historyIndex === row.blackIdx ? 'active-history-move' : ''}`}
                    onClick={() => onNavigateHistory(row.blackIdx)}
                  >
                    {row.blackMove.san}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))
          )}
        </div>

        {/* History step navigation */}
        <div className="history-controls">
          <button
            className="nav-btn"
            title="First Move"
            disabled={historyIndex <= -1 || moveHistory.length === 0}
            onClick={() => onNavigateHistory(-1)}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            className="nav-btn"
            title="Previous Move"
            disabled={historyIndex <= -1 || moveHistory.length === 0}
            onClick={() => onNavigateHistory(Math.max(-1, historyIndex - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="nav-btn"
            title="Next Move"
            disabled={historyIndex >= moveHistory.length - 1}
            onClick={() => onNavigateHistory(Math.min(moveHistory.length - 1, historyIndex + 1))}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="nav-btn"
            title="Current Move"
            disabled={historyIndex >= moveHistory.length - 1}
            onClick={() => onNavigateHistory(moveHistory.length - 1)}
          >
            <ChevronsRight size={16} />
          </button>
          {isGameOver && !isExploring && (
            <button
              className="nav-btn"
              title="Practice & Explore Position Freely"
              onClick={onStartExploration}
              style={{
                background: 'linear-gradient(135deg, rgba(153, 30, 74, 0.25), rgba(229, 169, 149, 0.35))',
                borderColor: '#8b1d44',
                color: '#2b0b1c',
                fontWeight: 800,
                gap: '4px',
                fontSize: '0.78rem'
              }}
            >
              <Sparkles size={14} color="#8b1d44" />
              <span>Explore</span>
            </button>
          )}
        </div>
      </LiquidGlassContainer>

      {/* Free Analysis Mode Card */}
      {isExploring && (
        <LiquidGlassContainer className="luxury-card" borderRadius={12} style={{ padding: '8px 12px', border: '1.5px solid #0891b2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#0891b2" />
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0e7490' }}>
                Free Analysis Mode
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#5c2441', fontWeight: 700 }}>
              {explorationMoves.length} {explorationMoves.length === 1 ? 'move' : 'moves'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="nav-btn"
              onClick={onUndoExploration}
              disabled={explorationMoves.length === 0}
              style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700 }}
              title="Undo experimental move"
            >
              <RotateCcw size={14} /> Undo
            </button>
            <button
              className="nav-btn"
              onClick={onResetExploration}
              style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700 }}
              title="Reset to reviewed position"
            >
              <RefreshCw size={14} /> Reset
            </button>
            <button
              className="btn-secondary"
              onClick={onExitExploration}
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', fontWeight: 800 }}
              title="Return to actual game review"
            >
              <ArrowLeft size={14} /> Exit
            </button>
          </div>
        </LiquidGlassContainer>
      )}

      {/* Queued Premove Banner */}
      {premove && (
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          background: 'rgba(225, 29, 72, 0.18)',
          border: '1.5px solid #e11d48',
          color: '#881337',
          fontSize: '0.78rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '2px 0'
        }}>
          <span>Premove: {premove.from} → {premove.to}</span>
          <span style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: 600 }}>Right-click / click to cancel</span>
        </div>
      )}

      {/* Bottom Player */}
      {renderPlayerCard(bottomColor)}

      {/* Action Controls */}
      <LiquidGlassContainer className="luxury-card controls-card" borderRadius={14}>
        {/* If Game is Over, show Rematch & Review prominently */}
        {isGameOver ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <button
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
              onClick={onOpenReview}
            >
              <Sparkles size={16} />
              <span>Game Review</span>
            </button>
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
              onClick={onRequestRematch}
            >
              <RefreshCw size={16} />
              <span>Rematch</span>
            </button>
          </div>
        ) : null}

        <div className="controls-grid">
          {gameMode === 'online' && (
            <button
              className="control-btn"
              onClick={onOpenChat}
              title="Open Chat"
              style={{ position: 'relative' }}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
              {unreadChatCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '8px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 800
                }}>
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          <button
            className="control-btn"
            onClick={onFlipBoard}
            title="Flip board orientation"
          >
            <ArrowLeftRight size={18} />
            <span>Flip</span>
          </button>

          {gameMode === 'local' ? (
            <button
              className="control-btn"
              onClick={onUndoMove}
              disabled={moveHistory.length === 0 || isGameOver}
              title="Undo last move"
            >
              <RotateCcw size={18} />
              <span>Undo</span>
            </button>
          ) : (
            <button
              className="control-btn"
              onClick={onOfferDraw}
              disabled={isGameOver || moveHistory.length < 2}
              title="Offer a draw"
            >
              <Handshake size={18} />
              <span>Draw</span>
            </button>
          )}

          <button
            className="control-btn"
            onClick={onCycleTheme}
            title="Change background theme midway through the game"
          >
            <Palette size={18} color="var(--rose-gold-light)" />
            <span>Theme</span>
          </button>

          <button
            className="control-btn danger"
            onClick={onResign}
            disabled={isGameOver}
            title="Resign game"
          >
            <Flag size={18} />
            <span>Resign</span>
          </button>

          <button
            className="control-btn"
            onClick={onOpenSettings}
            title="Settings & Audio"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </LiquidGlassContainer>
    </div>
  );
}
