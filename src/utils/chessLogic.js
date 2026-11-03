import { Chess } from 'chess.js';

/**
 * Official standard chess piece material values.
 * Pawn: 1, Knight: 3, Bishop: 3, Rook: 5, Queen: 9, King: 0 (not capturable)
 */
export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

export const PIECE_NAME_MAP = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king'
};

export const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

/**
 * Computes authoritative captured pieces by replaying move history through chess.js.
 * Correctly attributes captured pieces (including promotions, multiple queens, and en passant).
 *
 * @param {Array} history Array of moves (SAN, UCI, or move objects)
 * @param {number} [maxIndex] Optional index to replay up to (for history navigation)
 * @returns {{ white: string[], black: string[] }} Pieces captured by White and Black
 */
export function calculateAuthoritativeCaptured(history = [], maxIndex = -1) {
  const whiteCaptured = []; // Pieces captured by White (Black pieces taken)
  const blackCaptured = []; // Pieces captured by Black (White pieces taken)

  if (!history || history.length === 0 || maxIndex === -1 && history.length === 0) {
    return { white: [], black: [] };
  }

  const limit = maxIndex >= 0 ? Math.min(maxIndex + 1, history.length) : history.length;
  const runner = new Chess();

  for (let i = 0; i < limit; i++) {
    const m = history[i];
    if (!m) continue;

    let res = null;
    try {
      if (typeof m === 'string') {
        res = runner.move(m);
      } else if (m.from && m.to) {
        res = runner.move({
          from: m.from,
          to: m.to,
          promotion: m.promotion || (m.san && m.san.includes('=') ? m.san.split('=')[1][0]?.toLowerCase() : undefined)
        });
      } else if (m.san) {
        res = runner.move(m.san);
      }
    } catch {
      // Fallback: If move could not be applied via runner, use move's own capture field if present
      if (m.captured) {
        if (m.color === 'w') whiteCaptured.push(m.captured);
        else if (m.color === 'b') blackCaptured.push(m.captured);
      }
      continue;
    }

    if (res && res.captured) {
      if (res.color === 'w') {
        whiteCaptured.push(res.captured);
      } else {
        blackCaptured.push(res.captured);
      }
    }
  }

  const sortFn = (a, b) => {
    const valDiff = (PIECE_VALUES[b] || 0) - (PIECE_VALUES[a] || 0);
    if (valDiff !== 0) return valDiff;
    return PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b);
  };

  return {
    white: whiteCaptured.sort(sortFn),
    black: blackCaptured.sort(sortFn)
  };
}

/**
 * Groups an array of captured piece characters (e.g. ['q', 'q', 'p', 'p', 'p'])
 * into structured objects with count and total value for clean, accurate display.
 *
 * @param {string[]} pieces
 * @returns {Array<{ piece: string, count: number, value: number, totalValue: number }>}
 */
export function groupCapturedPieces(pieces = []) {
  if (!pieces || pieces.length === 0) return [];

  const counts = {};
  for (const p of pieces) {
    counts[p] = (counts[p] || 0) + 1;
  }

  const groups = [];
  for (const type of PIECE_ORDER) {
    if (counts[type]) {
      const count = counts[type];
      const singleVal = PIECE_VALUES[type] || 0;
      groups.push({
        piece: type,
        count,
        value: singleVal,
        totalValue: singleVal * count
      });
    }
  }

  return groups;
}

/**
 * Calculates current on-board material score and net material advantage.
 * Authoritative: reflects actual pieces on the board including all promotions.
 *
 * @param {Array<Array<{ type: string, color: string } | null>>} board
 * @returns {{ whiteScore: number, blackScore: number, whiteAdvantage: number, blackAdvantage: number }}
 */
export function calculateBoardMaterial(board) {
  let whiteScore = 0;
  let blackScore = 0;

  if (!board || !Array.isArray(board)) {
    return { whiteScore: 0, blackScore: 0, whiteAdvantage: 0, blackAdvantage: 0 };
  }

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r]?.[f];
      if (piece && piece.type !== 'k') {
        const val = PIECE_VALUES[piece.type] || 0;
        if (piece.color === 'w') whiteScore += val;
        else if (piece.color === 'b') blackScore += val;
      }
    }
  }

  const whiteAdvantage = whiteScore - blackScore;
  const blackAdvantage = blackScore - whiteScore;

  return {
    whiteScore,
    blackScore,
    whiteAdvantage: Math.max(0, whiteAdvantage),
    blackAdvantage: Math.max(0, blackAdvantage),
    rawDifference: whiteScore - blackScore
  };
}

/**
 * Determines exact game over status and descriptive reason from a chess.js instance.
 * Covers checkmate, stalemate, threefold repetition, insufficient material, and 50-move rule.
 *
 * @param {Chess} gameInstance
 * @param {string} [lastMoveColor]
 * @returns {{ isOver: boolean, winner: 'white' | 'black' | 'draw' | null, reason: string | null }}
 */
export function getGameEndDetails(gameInstance, lastMoveColor) {
  if (!gameInstance || !gameInstance.isGameOver()) {
    return { isOver: false, winner: null, reason: null };
  }

  if (gameInstance.isCheckmate()) {
    const winner = lastMoveColor === 'w' ? 'white' : lastMoveColor === 'b' ? 'black' : (gameInstance.turn() === 'w' ? 'black' : 'white');
    return {
      isOver: true,
      winner,
      reason: `Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`
    };
  }

  if (gameInstance.isStalemate()) {
    return { isOver: true, winner: 'draw', reason: 'Draw by Stalemate' };
  }

  if (gameInstance.isThreefoldRepetition()) {
    return { isOver: true, winner: 'draw', reason: 'Draw by Threefold Repetition' };
  }

  if (gameInstance.isInsufficientMaterial()) {
    return { isOver: true, winner: 'draw', reason: 'Draw by Insufficient Material' };
  }

  if (typeof gameInstance.isDrawByFiftyMoves === 'function' && gameInstance.isDrawByFiftyMoves()) {
    return { isOver: true, winner: 'draw', reason: 'Draw by 50-Move Rule' };
  }

  if (gameInstance.isDraw()) {
    return { isOver: true, winner: 'draw', reason: 'Draw' };
  }

  return { isOver: true, winner: null, reason: 'Game Over' };
}

