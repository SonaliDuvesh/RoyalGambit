import React, { useState } from 'react';
import Piece from './Piece';
import { FILES, RANKS, getSquareStyle } from '../utils/boardCoords';

export default function Chessboard({
  game,
  board,
  isFlipped,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheckColor,
  playerColor, // 'w', 'b', or 'both' for local
  showMoveDots = true,
  onSelectSquare,
  onMakeMove,
  premove,
  premoveSelectedSquare,
  onSelectPremoveSquare,
  onSetPremove,
  onClearPremove,
  disabled
}) {
  const [draggingSquare, setDraggingSquare] = useState(null);

  // Find king square if in check
  let checkSquare = null;
  if (inCheckColor) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === inCheckColor) {
          checkSquare = `${FILES[f]}${RANKS[7 - r]}`;
          break;
        }
      }
      if (checkSquare) break;
    }
  }

  const handleSquareClick = (square, piece) => {
    if (disabled) return;

    const isMyTurn = playerColor === 'both' || playerColor === game.turn();

    if (isMyTurn) {
      // Normal turn move flow
      if (selectedSquare) {
        if (selectedSquare === square) {
          onSelectSquare(null);
          return;
        }
        const isLegal = legalMoves.some(m => m.to === square);
        if (isLegal) {
          onMakeMove(selectedSquare, square);
          onSelectSquare(null);
          return;
        }
      }

      // Select piece if it belongs to current player
      if (piece && piece.color === game.turn()) {
        const isAllowedPlayer = playerColor === 'both' || playerColor === piece.color;
        if (isAllowedPlayer) {
          onSelectSquare(square);
          return;
        }
      }

      onSelectSquare(null);
    } else {
      // Premove flow (when opponent is thinking in online mode)
      // 1. If clicking player's own piece: select or switch piece
      if (piece && piece.color === playerColor) {
        if (premoveSelectedSquare === square) {
          // Clicked same piece again -> unselect and clear
          onSelectPremoveSquare?.(null);
          onClearPremove?.();
        } else {
          // Select or re-select this piece for premove
          onSelectPremoveSquare?.(square);
          onClearPremove?.();
        }
        return;
      }

      // 2. If a piece is selected and clicking another square (empty or opponent piece)
      if (premoveSelectedSquare) {
        onSetPremove?.(premoveSelectedSquare, square);
        onSelectPremoveSquare?.(null);
        return;
      }

      // 3. Clicked elsewhere -> cancel any queued premove
      onClearPremove?.();
      onSelectPremoveSquare?.(null);
    }
  };

  const handleDragStart = (e, square, piece) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const isMyTurn = playerColor === 'both' || playerColor === game.turn();
    const isPieceTurn = piece && piece.color === game.turn();
    const isAllowedPlayer = playerColor === 'both' || playerColor === piece?.color;

    // Normal dragging during turn OR premove dragging for player's own piece during opponent's turn
    const canDrag = isMyTurn ? (isPieceTurn && isAllowedPlayer) : (piece && piece.color === playerColor);

    if (!canDrag) {
      e.preventDefault();
      return;
    }

    setDraggingSquare(square);
    if (isMyTurn) {
      onSelectSquare(square);
    } else {
      onSelectPremoveSquare?.(square);
    }
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';

    // Center piece preview cleanly under pointer maintaining exact proportions
    if (e.currentTarget && e.dataTransfer.setDragImage) {
      const rect = e.currentTarget.getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, rect.height / 2);
    }
  };

  const handleDragEnd = () => {
    setDraggingSquare(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetSquare) => {
    e.preventDefault();
    const fromSquare = e.dataTransfer.getData('text/plain') || draggingSquare;
    if (!fromSquare || fromSquare === targetSquare) {
      setDraggingSquare(null);
      return;
    }

    const isMyTurn = playerColor === 'both' || playerColor === game.turn();
    if (isMyTurn) {
      const activeLegal = legalMoves.length > 0 && legalMoves[0]?.from === fromSquare
        ? legalMoves
        : game.moves({ square: fromSquare, verbose: true });
      const isLegal = activeLegal.some(m => m.from === fromSquare && m.to === targetSquare);
      if (isLegal) {
        onMakeMove(fromSquare, targetSquare);
        onSelectSquare(null);
      }
    } else {
      // Queue premove on drop (verify piece belongs to player)
      const piece = game.get(fromSquare);
      if (piece && piece.color === playerColor) {
        onSetPremove?.(fromSquare, targetSquare);
        onSelectPremoveSquare?.(null);
      }
    }
    setDraggingSquare(null);
  };

  // Render 64 squares
  const squares = [];
  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const square = `${FILES[fileIdx]}${RANKS[rankIdx]}`;
      // Note: chess.js board[0] is rank 8, board[7] is rank 1
      const piece = board[7 - rankIdx][fileIdx];

      const isSelected = selectedSquare === square;
      const isLegalDestination = legalMoves.some(m => m.to === square);
      const isLastMoveSrc = lastMove && lastMove.from === square;
      const isLastMoveDst = lastMove && lastMove.to === square;
      const isPremoveSrc = (premove && premove.from === square) || premoveSelectedSquare === square;
      const isPremoveDst = premove && premove.to === square;
      const isInCheck = checkSquare === square;

      const style = getSquareStyle(fileIdx, rankIdx, isFlipped);

      let squareClasses = 'chess-square';
      if (isSelected) squareClasses += ' selected';
      if (isLastMoveSrc) squareClasses += ' last-move-src';
      if (isLastMoveDst) squareClasses += ' last-move-dst';
      if (isPremoveSrc) squareClasses += ' premove-src';
      if (isPremoveDst) squareClasses += ' premove-dst';
      if (isInCheck) squareClasses += ' in-check';

      squares.push(
        <div
          key={square}
          className={squareClasses}
          style={style}
          onClick={() => handleSquareClick(square, piece)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, square)}
        >
          {showMoveDots && isLegalDestination && (
            piece ? (
              <div className="move-indicator-ring" />
            ) : (
              <div className="move-indicator-dot" />
            )
          )}

          {piece && (
            <Piece
              piece={piece}
              isDragging={draggingSquare === square}
              onDragStart={(e) => handleDragStart(e, square, piece)}
              onDragEnd={handleDragEnd}
            />
          )}
        </div>
      );
    }
  }

  return (
    <div
      className="board-wrapper"
      onContextMenu={(e) => {
        e.preventDefault();
        onClearPremove?.();
        onSelectPremoveSquare?.(null);
      }}
    >
      <div className="board-outer-frame">
        <img
          src="/assets/board/chessboard.png"
          alt="Luxury RoyalGambit Chessboard"
          className="board-image-bg"
        />
        <div className="board-interactive-overlay">
          {squares}
        </div>
      </div>
    </div>
  );
}

