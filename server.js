import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Chess } from 'chess.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Support ngrok: bypass ngrok free tier browser warning
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auto-detect public ngrok tunnel
app.get('/api/public-url', async (req, res) => {
  try {
    const ngrokRes = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (ngrokRes.ok) {
      const data = await ngrokRes.json();
      const httpsTunnel = data.tunnels?.find(t => t.proto === 'https');
      if (httpsTunnel) {
        return res.json({ publicUrl: httpsTunnel.public_url });
      }
    }
  } catch {}
  res.json({ publicUrl: null });
});

// Serve static assets from public, dist, and theme
app.use('/theme', express.static(path.join(__dirname, 'theme')));
app.use('/assets/theme', express.static(path.join(__dirname, 'public/assets/theme')));
app.use('/assets/backgrounds', express.static(path.join(__dirname, 'public/assets/theme')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(express.static(path.join(__dirname, 'dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Rooms state
// roomId -> {
//   id,
//   chess: Chess(),
//   timeControl: minutes,
//   whiteTime: ms,
//   blackTime: ms,
//   lastMoveTime: timestamp or null,
//   turn: 'w' or 'b',
//   status: 'waiting' | 'playing' | 'game_over',
//   winner: null | 'white' | 'black' | 'draw',
//   endReason: null | string,
//   drawOfferedBy: null | 'w' | 'b',
//   players: {
//     white: { socketId, name, connected: true },
//     black: { socketId, name, connected: true }
//   },
//   moveHistory: []
// }
const rooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(id) ? generateRoomId() : id;
}

function updateRoomTimer(room) {
  if (room.status !== 'playing' || !room.lastMoveTime) return;
  const now = Date.now();
  const elapsed = now - room.lastMoveTime;
  if (room.turn === 'w') {
    room.whiteTime = Math.max(0, room.whiteTime - elapsed);
    if (room.whiteTime === 0) {
      room.status = 'game_over';
      room.winner = 'black';
      room.endReason = 'timeout';
      let ptsAwarded = false;
      if (!room.pointsAwarded) {
        room.pointsAwarded = true;
        ptsAwarded = true;
      }
      const whiteName = room.players?.white?.name || 'White';
      const blackName = room.players?.black?.name || 'Black';
      io.to(room.id).emit('game_over', {
        winner: 'black',
        reason: `${whiteName} ran out of time`,
        whitePlayerName: whiteName,
        blackPlayerName: blackName,
        whiteTime: 0,
        blackTime: room.blackTime,
        points: { white: 0, black: 3 },
        pointsAwarded: ptsAwarded
      });
    }
  } else {
    room.blackTime = Math.max(0, room.blackTime - elapsed);
    if (room.blackTime === 0) {
      room.status = 'game_over';
      room.winner = 'white';
      room.endReason = 'timeout';
      let ptsAwarded = false;
      if (!room.pointsAwarded) {
        room.pointsAwarded = true;
        ptsAwarded = true;
      }
      const whiteName = room.players?.white?.name || 'White';
      const blackName = room.players?.black?.name || 'Black';
      io.to(room.id).emit('game_over', {
        winner: 'white',
        reason: `${blackName} ran out of time`,
        whitePlayerName: whiteName,
        blackPlayerName: blackName,
        whiteTime: room.whiteTime,
        blackTime: 0,
        points: { white: 3, black: 0 },
        pointsAwarded: ptsAwarded
      });
    }
  }
  room.lastMoveTime = now;
}

// Timer tick loop every 500ms
setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.status === 'playing') {
      updateRoomTimer(room);
      if (room.status === 'playing') {
        io.to(roomId).emit('timer_sync', {
          whiteTime: room.whiteTime,
          blackTime: room.blackTime,
          turn: room.turn
        });
      }
    }
  }
}, 500);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('create_room', ({ playerName, timeControlMinutes, preferredColor }) => {
    const roomId = generateRoomId();
    const minutes = Math.max(1, parseInt(timeControlMinutes) || 10);
    const initialTimeMs = minutes * 60 * 1000;

    let hostColor = 'w';
    if (preferredColor === 'black') hostColor = 'b';
    else if (preferredColor === 'random') hostColor = Math.random() < 0.5 ? 'w' : 'b';

    const room = {
      id: roomId,
      chess: new Chess(),
      timeControl: minutes,
      whiteTime: initialTimeMs,
      blackTime: initialTimeMs,
      lastMoveTime: null,
      turn: 'w',
      status: 'waiting',
      winner: null,
      endReason: null,
      drawOfferedBy: null,
      players: {
        white: hostColor === 'w' ? { socketId: socket.id, name: playerName || 'White', connected: true } : null,
        black: hostColor === 'b' ? { socketId: socket.id, name: playerName || 'Black', connected: true } : null
      },
      moveHistory: [],
      lastMove: null,
      pointsAwarded: false,
      messages: []
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerColor = hostColor;

    socket.emit('room_created', {
      roomId,
      playerColor: hostColor,
      timeControl: minutes,
      roomState: getPublicRoomState(room)
    });
    console.log(`Room ${roomId} created by ${socket.id} as ${hostColor}`);
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const id = (roomId || '').trim().toUpperCase();
    const room = rooms.get(id);

    if (!room) {
      return socket.emit('join_error', { message: 'Room not found. Please check the code.' });
    }

    if (room.status !== 'waiting') {
      // Check if it is a reconnecting player
      const isWhite = room.players.white?.socketId === socket.id;
      const isBlack = room.players.black?.socketId === socket.id;
      if (!isWhite && !isBlack && room.players.white && room.players.black) {
        return socket.emit('join_error', { message: 'Game room is already full.' });
      }
    }

    let assignedColor = null;
    if (!room.players.white) {
      assignedColor = 'w';
      room.players.white = { socketId: socket.id, name: playerName || 'White', connected: true };
    } else if (!room.players.black) {
      assignedColor = 'b';
      room.players.black = { socketId: socket.id, name: playerName || 'Black', connected: true };
    } else {
      // Reconnection
      if (room.players.white.socketId === socket.id) {
        assignedColor = 'w';
        room.players.white.connected = true;
      } else if (room.players.black.socketId === socket.id) {
        assignedColor = 'b';
        room.players.black.connected = true;
      }
    }

    socket.join(id);
    socket.roomId = id;
    socket.playerColor = assignedColor;

    // If both players present, start game
    if (room.players.white && room.players.black && room.status === 'waiting') {
      room.status = 'playing';
      room.lastMoveTime = Date.now();
    }

    io.to(id).emit('player_joined', {
      roomId: id,
      roomState: getPublicRoomState(room)
    });

    socket.emit('joined_successfully', {
      roomId: id,
      playerColor: assignedColor,
      roomState: getPublicRoomState(room)
    });
    console.log(`Socket ${socket.id} joined ${id} as ${assignedColor}`);
  });

  socket.on('make_move', ({ from, to, promotion }) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    // Verify it is this player's turn
    const expectedColor = room.turn;
    if (socket.playerColor !== expectedColor) {
      return socket.emit('move_error', { message: "It is not your turn" });
    }

    updateRoomTimer(room);

    try {
      const move = room.chess.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (!move) {
        return socket.emit('move_error', { message: 'Illegal move' });
      }

      // Record move
      room.moveHistory.push({
        san: move.san,
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        flags: move.flags,
        captured: move.captured,
        fen: room.chess.fen()
      });

      room.lastMove = { from: move.from, to: move.to };
      room.turn = room.chess.turn();
      room.lastMoveTime = Date.now();
      room.drawOfferedBy = null; // Clear pending draw offer

      // Check game over
      let gameOverInfo = null;
      if (room.chess.isGameOver()) {
        room.status = 'game_over';
        let winner = null;
        let endReason = null;
        let points = { white: 0, black: 0 };
        if (room.chess.isCheckmate()) {
          winner = move.color === 'w' ? 'white' : 'black';
          const whiteName = room.players?.white?.name || 'White';
          const blackName = room.players?.black?.name || 'Black';
          const winnerName = winner === 'white' ? whiteName : blackName;
          const loserName = winner === 'white' ? blackName : whiteName;
          endReason = 'checkmate';
          points = winner === 'white' ? { white: 3, black: 0 } : { white: 0, black: 3 };
          gameOverInfo = {
            winner,
            reason: `Checkmate! ${winnerName} defeated ${loserName}!`,
            whitePlayerName: whiteName,
            blackPlayerName: blackName
          };
        } else if (room.chess.isDraw()) {
          winner = 'draw';
          let reason = 'Draw';
          if (room.chess.isStalemate()) reason = 'Draw by Stalemate';
          else if (room.chess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
          else if (room.chess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
          else if (typeof room.chess.isDrawByFiftyMoves === 'function' && room.chess.isDrawByFiftyMoves()) reason = 'Draw by 50-Move Rule';
          endReason = reason;
          points = { white: 1, black: 1 };
          gameOverInfo = { winner: 'draw', reason };
        }
        room.winner = winner;
        room.endReason = endReason;
        let ptsAwarded = false;
        if (!room.pointsAwarded) {
          room.pointsAwarded = true;
          ptsAwarded = true;
        }
        gameOverInfo.points = points;
        gameOverInfo.pointsAwarded = ptsAwarded;
      }

      io.to(roomId).emit('move_made', {
        move: {
          from: move.from,
          to: move.to,
          san: move.san,
          color: move.color,
          flags: move.flags,
          captured: move.captured,
          promotion: move.promotion
        },
        fen: room.chess.fen(),
        turn: room.turn,
        inCheck: room.chess.inCheck(),
        whiteTime: room.whiteTime,
        blackTime: room.blackTime,
        moveHistory: room.moveHistory,
        lastMove: room.lastMove,
        gameOver: gameOverInfo
      });

    } catch (err) {
      console.error('Move error:', err);
      socket.emit('move_error', { message: 'Invalid move' });
    }
  });

  socket.on('offer_draw', () => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    room.drawOfferedBy = socket.playerColor;
    socket.to(roomId).emit('draw_offered', { fromColor: socket.playerColor });
  });

  socket.on('respond_draw', ({ accept }) => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    if (accept && room.drawOfferedBy && room.drawOfferedBy !== socket.playerColor) {
      room.status = 'game_over';
      room.winner = 'draw';
      room.endReason = 'agreement';
      let ptsAwarded = false;
      if (!room.pointsAwarded) {
        room.pointsAwarded = true;
        ptsAwarded = true;
      }
      io.to(roomId).emit('game_over', {
        winner: 'draw',
        reason: 'Draw by mutual agreement',
        whiteTime: room.whiteTime,
        blackTime: room.blackTime,
        points: { white: 1, black: 1 },
        pointsAwarded: ptsAwarded
      });
    } else {
      room.drawOfferedBy = null;
      socket.to(roomId).emit('draw_declined');
    }
  });

  socket.on('resign', () => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const winner = socket.playerColor === 'w' ? 'black' : 'white';
    room.status = 'game_over';
    room.winner = winner;
    room.endReason = 'resignation';
    let ptsAwarded = false;
    if (!room.pointsAwarded) {
      room.pointsAwarded = true;
      ptsAwarded = true;
    }

    const whiteName = room.players?.white?.name || 'White';
    const blackName = room.players?.black?.name || 'Black';
    const resignerName = socket.playerColor === 'w' ? whiteName : blackName;
    const winnerName = socket.playerColor === 'w' ? blackName : whiteName;

    io.to(roomId).emit('game_over', {
      winner,
      reason: `${resignerName} resigned`,
      whitePlayerName: whiteName,
      blackPlayerName: blackName,
      whiteTime: room.whiteTime,
      blackTime: room.blackTime,
      points: winner === 'white' ? { white: 3, black: 0 } : { white: 0, black: 3 },
      pointsAwarded: ptsAwarded
    });
  });

  socket.on('chat_message', ({ content, senderName, senderId }) => {
    const roomId = socket.roomId;
    if (!roomId || !content) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg = {
      id: msgId,
      game_id: roomId,
      sender_id: senderId || socket.id,
      sender_name: senderName || (socket.playerColor === 'w' ? 'White' : 'Black'),
      content: String(content).slice(0, 500),
      created_at: new Date().toISOString(),
      read_at: null
    };

    if (!room.messages) room.messages = [];
    room.messages.push(msg);

    io.to(roomId).emit('chat_message', msg);
  });

  socket.on('mark_messages_read', ({ readerId }) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || !room.messages) return;

    const now = new Date().toISOString();
    const reader = readerId || socket.id;
    let markedCount = 0;

    room.messages.forEach((m) => {
      if (m.sender_id !== reader && !m.read_at) {
        m.read_at = now;
        markedCount++;
      }
    });

    if (markedCount > 0) {
      io.to(roomId).emit('messages_read', {
        readerId: reader,
        readAt: now
      });
    }
  });

  socket.on('restart_room', () => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const initialTimeMs = room.timeControl * 60 * 1000;
    room.chess = new Chess();
    room.whiteTime = initialTimeMs;
    room.blackTime = initialTimeMs;
    room.turn = 'w';
    room.winner = null;
    room.endReason = null;
    room.drawOfferedBy = null;
    room.moveHistory = [];
    room.lastMove = null;
    room.pointsAwarded = false;
    room.status = (room.players.white && room.players.black) ? 'playing' : 'waiting';
    room.lastMoveTime = room.status === 'playing' ? Date.now() : null;

    io.to(roomId).emit('room_restarted', {
      roomState: getPublicRoomState(room)
    });
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players.white?.socketId === socket.id) {
      room.players.white.connected = false;
    }
    if (room.players.black?.socketId === socket.id) {
      room.players.black.connected = false;
    }

    socket.to(roomId).emit('player_disconnected', {
      color: socket.playerColor
    });
    console.log(`Socket ${socket.id} disconnected from room ${roomId}`);
  });
});

function getPublicRoomState(room) {
  return {
    id: room.id,
    fen: room.chess.fen(),
    turn: room.turn,
    status: room.status,
    winner: room.winner,
    endReason: room.endReason,
    whiteTime: room.whiteTime,
    blackTime: room.blackTime,
    timeControl: room.timeControl,
    inCheck: room.chess.inCheck(),
    players: {
      white: room.players.white ? { name: room.players.white.name, connected: room.players.white.connected } : null,
      black: room.players.black ? { name: room.players.black.name, connected: room.players.black.connected } : null
    },
    moveHistory: room.moveHistory,
    lastMove: room.lastMove || null,
    pointsAwarded: Boolean(room.pointsAwarded),
    messages: room.messages || []
  };
}

// Any other route serves index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`RoyalGambit – The Grandmaster's Art of Strategic Brilliance`);
  console.log(`RoyalGambit Server running on http://localhost:${PORT}`);
});
