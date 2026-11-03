import { Chess } from 'chess.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/**
 * Calculates win probability from centipawn evaluation
 */
function winPercent(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Material count for a FEN position
 */
function getMaterialCount(chessInstance, color) {
  const board = chessInstance.board();
  let total = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        total += PIECE_VALUES[piece.type] || 0;
      }
    }
  }
  return total;
}

/**
 * Communicates with Stockfish Web Worker
 */
class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
  }

  async init() {
    if (this.worker) return;
    try {
      this.worker = new Worker('/stockfish.js');
      await this.sendCommand('uci', 'uciok');
      await this.sendCommand('isready', 'readyok');
      this.isReady = true;
    } catch (err) {
      console.warn('Stockfish Web Worker initialization failed; using tactical evaluator.', err);
      this.worker = null;
      this.isReady = false;
    }
  }

  sendCommand(cmd, expectedResponse) {
    return new Promise((resolve) => {
      if (!this.worker) return resolve(null);
      const handler = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (expectedResponse && line.includes(expectedResponse)) {
          this.worker.removeEventListener('message', handler);
          resolve(line);
        }
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage(cmd);
      // Timeout fallback
      setTimeout(() => {
        if (this.worker) this.worker.removeEventListener('message', handler);
        resolve(null);
      }, 4000);
    });
  }

  async evaluatePosition(fen, depth = 9) {
    if (!this.isReady || !this.worker) {
      return this.heuristicEval(fen);
    }

    return new Promise((resolve) => {
      let bestMove = null;
      let scoreCp = 0;
      let pv = '';

      const handler = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';

        if (line.startsWith('info') && line.includes('score')) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const pvMatch = line.match(/pv (.+)/);

          if (cpMatch) scoreCp = parseInt(cpMatch[1], 10);
          if (mateMatch) {
            const mateIn = parseInt(mateMatch[1], 10);
            scoreCp = mateIn > 0 ? 10000 - mateIn * 100 : -10000 - mateIn * 100;
          }
          if (pvMatch) pv = pvMatch[1];
        }

        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          bestMove = parts[1];
          this.worker.removeEventListener('message', handler);
          resolve({ score: scoreCp, bestMove, pv });
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);

      // Fallback timeout
      setTimeout(() => {
        if (this.worker) this.worker.removeEventListener('message', handler);
        resolve({ score: scoreCp, bestMove: bestMove || 'unknown', pv });
      }, 3500);
    });
  }

  heuristicEval(fen) {
    try {
      const c = new Chess(fen);
      const whiteMat = getMaterialCount(c, 'w');
      const blackMat = getMaterialCount(c, 'b');
      let score = whiteMat - blackMat;
      if (c.turn() === 'b') score = -score;
      const moves = c.moves({ verbose: true });
      const best = moves.length > 0 ? `${moves[0].from}${moves[0].to}` : 'none';
      return Promise.resolve({ score, bestMove: best, pv: best });
    } catch {
      return Promise.resolve({ score: 0, bestMove: 'none', pv: '' });
    }
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

/**
 * Classifies a move according to the official criteria:
 * - Brilliant (!!)
 * - Great (!)
 * - Best
 * - Excellent
 * - Good
 * - Inaccuracy
 * - Mistake
 * - Blunder
 * - Missed Opportunity
 * - Forced
 * - Checkmate
 */
export function classifyMove({
  evalBefore,
  evalAfter,
  move,
  bestMove,
  isSacrifice,
  legalMovesCount,
  isMate
}) {
  if (isMate) {
    return {
      classification: 'checkmate',
      label: 'Checkmate',
      symbol: '#',
      color: '#4ade80'
    };
  }

  if (legalMovesCount === 1) {
    return {
      classification: 'forced',
      label: 'Forced',
      symbol: '□',
      color: '#94a3b8'
    };
  }

  // Delta from perspective of player who moved:
  // evalAfter is from opponent's view after the move in standard UCI, so moving player's score is -evalAfter
  const movingPlayerEvalAfter = -evalAfter;
  const delta = movingPlayerEvalAfter - evalBefore;

  const isEngineBest = (
    move.from + move.to === bestMove ||
    bestMove.startsWith(move.from + move.to) ||
    delta >= -10
  );

  // Brilliant Move Criteria:
  // 1. Engine best or close
  // 2. Meaningful piece sacrifice
  // 3. Voluntary rather than forced
  // 4. Resulting position remains objectively sound (eval >= -50)
  // 5. Player was not already in completely winning position (evalBefore <= +400)
  if (isEngineBest && isSacrifice && movingPlayerEvalAfter >= -50 && evalBefore <= 400) {
    return {
      classification: 'brilliant',
      label: 'Brilliant',
      symbol: '!!',
      color: '#22d3ee',
      explanation: `Voluntarily sacrificed material to gain decisive positional coordination and tactical control.`
    };
  }

  // Great Move: critical turning move or only move to keep initiative
  if (isEngineBest && (evalBefore < 0 && movingPlayerEvalAfter >= 80 || delta >= 120)) {
    return {
      classification: 'great',
      label: 'Great',
      symbol: '!',
      color: '#60a5fa',
      explanation: `Found the key tactical continuation that turned the game in your favor.`
    };
  }

  if (isEngineBest) {
    return {
      classification: 'best',
      label: 'Best',
      symbol: '★',
      color: '#34d399'
    };
  }

  if (delta >= -30) {
    return {
      classification: 'excellent',
      label: 'Excellent',
      symbol: '✓',
      color: '#4ade80'
    };
  }

  if (delta >= -70) {
    return {
      classification: 'good',
      label: 'Good',
      symbol: '•',
      color: '#a3e635'
    };
  }

  if (delta >= -140) {
    return {
      classification: 'inaccuracy',
      label: 'Inaccuracy',
      symbol: '?!',
      color: '#facc15'
    };
  }

  if (delta >= -280) {
    // Check if missed win
    if (evalBefore >= 200) {
      return {
        classification: 'missed',
        label: 'Missed Opportunity',
        symbol: '✖',
        color: '#fb923c'
      };
    }
    return {
      classification: 'mistake',
      label: 'Mistake',
      symbol: '?',
      color: '#f87171'
    };
  }

  return {
    classification: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#ef4444'
  };
}

/**
 * Asynchronous Full Game Analysis
 */
export async function analyzeCompletedGame(moveHistory, onProgress) {
  const engine = new StockfishEngine();
  await engine.init();

  const game = new Chess();
  const analysisResults = [];
  let prevEval = 0; // Starts equal (0 cp)

  for (let i = 0; i < moveHistory.length; i++) {
    const moveItem = moveHistory[i];
    const fenBefore = game.fen();
    const legalMoves = game.moves({ verbose: true });
    const movingColor = game.turn();
    const matBefore = getMaterialCount(game, movingColor);

    // Get Stockfish evaluation before move
    const engineData = await engine.evaluatePosition(fenBefore, 9);
    const evalBefore = engineData.score;
    const bestMove = engineData.bestMove;
    const pv = engineData.pv;

    // Apply move
    const playedMove = game.move({
      from: moveItem.from,
      to: moveItem.to,
      promotion: moveItem.promotion || 'q'
    });

    const fenAfter = game.fen();
    const matAfter = getMaterialCount(game, movingColor);
    const pieceLost = matBefore - matAfter;

    // A sacrifice is detected if moving player lost material without equal capture
    const isSacrifice = pieceLost >= 300 && (!moveItem.captured || PIECE_VALUES[moveItem.captured] < pieceLost);

    // Get evaluation after move
    const afterData = await engine.evaluatePosition(fenAfter, 9);
    const evalAfter = afterData.score;

    const classified = classifyMove({
      evalBefore,
      evalAfter,
      move: moveItem,
      bestMove,
      isSacrifice,
      legalMovesCount: legalMoves.length,
      isMate: game.isCheckmate()
    });

    analysisResults.push({
      moveNumber: i + 1,
      san: moveItem.san,
      color: movingColor,
      from: moveItem.from,
      to: moveItem.to,
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      bestMove,
      pv,
      isSacrifice,
      ...classified
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / moveHistory.length) * 100));
    }
  }

  engine.terminate();

  // Compute accuracy for both players
  const whiteMoves = analysisResults.filter(m => m.color === 'w');
  const blackMoves = analysisResults.filter(m => m.color === 'b');

  const calcAcc = (moves) => {
    if (moves.length === 0) return 85;
    let totalScore = 0;
    moves.forEach((m) => {
      if (m.classification === 'brilliant') totalScore += 100;
      else if (m.classification === 'great' || m.classification === 'best') totalScore += 100;
      else if (m.classification === 'excellent') totalScore += 90;
      else if (m.classification === 'good') totalScore += 75;
      else if (m.classification === 'inaccuracy') totalScore += 50;
      else if (m.classification === 'mistake') totalScore += 25;
      else if (m.classification === 'blunder' || m.classification === 'missed') totalScore += 0;
      else totalScore += 80;
    });
    return Math.round(totalScore / moves.length);
  };

  return {
    moves: analysisResults,
    whiteAccuracy: calcAcc(whiteMoves),
    blackAccuracy: calcAcc(blackMoves),
    brilliantCount: analysisResults.filter(m => m.classification === 'brilliant').length,
    greatCount: analysisResults.filter(m => m.classification === 'great').length,
    blunderCount: analysisResults.filter(m => m.classification === 'blunder').length
  };
}

/**
 * Saves completed game analysis and updates player statistics
 */
export async function persistGameAnalysis({
  roomId,
  whitePlayerId,
  blackPlayerId,
  winner,
  analysisData
}) {
  if (!isSupabaseConfigured()) return;

  try {
    // 1. Insert analysis records
    const analysisRows = analysisData.moves.map(m => ({
      game_id: roomId,
      move_number: m.moveNumber,
      player_id: m.color === 'w' ? whitePlayerId : blackPlayerId,
      classification: m.classification,
      evaluation_before: m.evalBefore,
      evaluation_after: m.evalAfter,
      engine_best_move: m.bestMove,
      principal_variation: m.pv,
      sacrifice_detected: m.isSacrifice,
      analysis_status: 'completed'
    }));

    await supabase.from('game_analysis').upsert(analysisRows, { onConflict: 'game_id,move_number' });

    // 2. Update player statistics for White
    if (whitePlayerId) {
      const whiteBrilliant = analysisData.moves.filter(m => m.color === 'w' && m.classification === 'brilliant').length;
      await updatePlayerStats({
        playerId: whitePlayerId,
        isWin: winner === 'white',
        isLoss: winner === 'black',
        isDraw: winner === 'draw',
        brilliantMoves: whiteBrilliant
      });
    }

    // 3. Update player statistics for Black
    if (blackPlayerId) {
      const blackBrilliant = analysisData.moves.filter(m => m.color === 'b' && m.classification === 'brilliant').length;
      await updatePlayerStats({
        playerId: blackPlayerId,
        isWin: winner === 'black',
        isLoss: winner === 'white',
        isDraw: winner === 'draw',
        brilliantMoves: blackBrilliant
      });
    }
  } catch (err) {
    console.error('Error persisting game analysis:', err);
  }
}

async function updatePlayerStats({ playerId, isWin, isLoss, isDraw, brilliantMoves }) {
  const { data: stats } = await supabase
    .from('player_statistics')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  const prevPlayed = stats?.matches_played || 0;
  const prevWins = stats?.wins || 0;
  const prevLosses = stats?.losses || 0;
  const prevDraws = stats?.draws || 0;
  const prevBrilliant = stats?.brilliant_moves || 0;
  const prevAnalyzed = stats?.analyzed_games || 0;

  await supabase.from('player_statistics').upsert({
    player_id: playerId,
    matches_played: prevPlayed + 1,
    wins: prevWins + (isWin ? 1 : 0),
    losses: prevLosses + (isLoss ? 1 : 0),
    draws: prevDraws + (isDraw ? 1 : 0),
    brilliant_moves: prevBrilliant + brilliantMoves,
    analyzed_games: prevAnalyzed + 1,
    updated_at: new Date().toISOString()
  });
}

