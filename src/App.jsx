import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import io from 'socket.io-client';
import Chessboard from './components/Chessboard';
import GamePanel from './components/GamePanel';
import PawnPromotionModal from './components/PawnPromotionModal';
import GameOverModal from './components/GameOverModal';
import ConfirmationModal from './components/ConfirmationModal';
import DrawOfferModal from './components/DrawOfferModal';
import AuthModal from './components/AuthModal';
import UserSearchModal from './components/UserSearchModal';
import HomeScreen from './components/HomeScreen';
import LobbyView from './components/LobbyView';
import WaitingRoomView from './components/WaitingRoomView';
import LeaderboardView from './components/LeaderboardView';
import ProfileModal from './components/ProfileModal';
import SettingsModal from './components/SettingsModal';
import ChatPanel from './components/ChatPanel';
import GameReviewModal from './components/GameReviewModal';
import { Download, WifiOff, Wifi, ChevronDown, Palette } from 'lucide-react';
import { LiquidGlassContainer, Container } from './lib/liquid-glass';
import { sounds } from './utils/audio';
import { isSupabaseConfigured } from './lib/supabase';
import { getCurrentUserProfile, logoutUser, getOrCreateGuestUser, updateLocalUserStats } from './services/authService';
import {
  createGameRoom,
  fetchRoomByCode,
  fetchRoomMoves,
  joinGameRoom,
  submitGameMove,
  subscribeToRoom,
  awardGamePointsSupabase
} from './services/gameService';
import { fetchGameMessages, sendGameMessage, markMessagesAsReadSupabase } from './services/chatService';
import { persistGameAnalysis } from './services/analysisService';
import { getAvatarSrc } from './utils/avatars';
import { calculateAuthoritativeCaptured, getGameEndDetails } from './utils/chessLogic';

const BACKGROUND_THEMES = [
  {
    id: 'rose-gold-silk',
    name: 'Rose Gold Silk',
    shortName: 'Silk',
    thumb: '/assets/theme/thumbs/rose-gold-silk.webp'
  },
  {
    id: 'pink-marble',
    name: 'Pink Marble',
    shortName: 'Marble',
    thumb: '/assets/theme/thumbs/pink-marble.webp'
  },
  {
    id: 'golden-stardust',
    name: 'Golden Stardust',
    shortName: 'Stardust',
    thumb: '/assets/theme/thumbs/golden-stardust.webp'
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    shortName: 'Glass',
    thumb: '/assets/theme/thumbs/liquid-glass.webp'
  }
];

export default function App() {
  // Navigation: 'home' | 'create_join' | 'waiting' | 'game' | 'leaderboard'
  const [currentScreen, setCurrentScreen] = useState('home');

  // User & Auth
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authCustomMessage, setAuthCustomMessage] = useState(null);
  const [profileModalUserId, setProfileModalUserId] = useState(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setThemeDropdownOpen(false);
      }
    }
    if (themeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [themeDropdownOpen]);

  // Settings state (saved in localStorage)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('royal_gambit_settings') || localStorage.getItem('royalgambit_settings') || localStorage.getItem('cherry_chess_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.backgroundTheme) {
          parsed.backgroundTheme = localStorage.getItem('royal_gambit_theme') || localStorage.getItem('royalgambit_theme') || localStorage.getItem('cherry_chess_theme') || 'rose-gold-silk';
        }
        return parsed;
      }
    } catch {}
    return {
      soundEnabled: true,
      showMoveDots: true,
      preferredTime: 10,
      backgroundTheme: localStorage.getItem('royal_gambit_theme') || localStorage.getItem('royalgambit_theme') || localStorage.getItem('cherry_chess_theme') || 'rose-gold-silk'
    };
  });

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    sounds.enabled = newSettings.soundEnabled;
    try {
      localStorage.setItem('royal_gambit_settings', JSON.stringify(newSettings));
      localStorage.setItem('royalgambit_settings', JSON.stringify(newSettings));
      if (newSettings.backgroundTheme) {
        localStorage.setItem('royal_gambit_theme', newSettings.backgroundTheme);
        localStorage.setItem('royalgambit_theme', newSettings.backgroundTheme);
        Container.updateThemeBackground(newSettings.backgroundTheme);
      }
    } catch {}
  };

  const currentTheme = settings.backgroundTheme || 'rose-gold-silk';

  useEffect(() => {
    Container.updateThemeBackground(currentTheme);
  }, [currentTheme]);

  const handleCycleTheme = () => {
    const idx = BACKGROUND_THEMES.findIndex(t => t.id === currentTheme);
    const nextIdx = (idx + 1) % BACKGROUND_THEMES.length;
    updateSettings({ ...settings, backgroundTheme: BACKGROUND_THEMES[nextIdx].id });
  };

  // Game Mode & Logic
  const [gameMode, setGameMode] = useState('online'); // 'online' | 'local'
  const [game, setGame] = useState(() => new Chess());
  const [board, setBoard] = useState(() => game.board());
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  // Clocks
  const [timeControlMinutes, setTimeControlMinutes] = useState(10);
  const [whiteTime, setWhiteTime] = useState(10 * 60 * 1000);
  const [blackTime, setBlackTime] = useState(10 * 60 * 1000);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverInfo, setGameOverInfo] = useState(null);

  // Online Room State
  const [activeRoom, setActiveRoom] = useState(null);
  const [myColor, setMyColor] = useState('w'); // 'w' | 'b' | 'both'
  const [whitePlayer, setWhitePlayer] = useState({ name: 'White' });
  const [blackPlayer, setBlackPlayer] = useState({ name: 'Black' });
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [pendingInviteCode, setPendingInviteCode] = useState(null);

  // Move history
  const [moveHistory, setMoveHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // In-Game Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Premove State
  const [premove, setPremove] = useState(null);
  const [premoveSelectedSquare, setPremoveSelectedSquare] = useState(null);
  const pointsAwardedRef = useRef(false);

  // Free Analysis / Practice Mode State (completely separate from saved game)
  const [isExploring, setIsExploring] = useState(false);
  const [explorationBaseFen, setExplorationBaseFen] = useState(null);
  const [explorationGame, setExplorationGame] = useState(null);
  const [explorationMoves, setExplorationMoves] = useState([]);
  const [explorationSelectedSquare, setExplorationSelectedSquare] = useState(null);
  const [explorationLegalMoves, setExplorationLegalMoves] = useState([]);
  const [explorationLastMove, setExplorationLastMove] = useState(null);

  // Authoritatively computed captured pieces derived from moveHistory and historyIndex
  const capturedPieces = useMemo(() => {
    if (isExploring && explorationMoves?.length > 0) {
      return calculateAuthoritativeCaptured(explorationMoves, -1);
    }
    return calculateAuthoritativeCaptured(moveHistory, historyIndex);
  }, [moveHistory, historyIndex, isExploring, explorationMoves]);

  // Modals & Review
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [incomingDrawOffer, setIncomingDrawOffer] = useState(null);
  const [incomingRematchRequest, setIncomingRematchRequest] = useState(false);
  const [gameReviewOpen, setGameReviewOpen] = useState(false);

  // PWA Installation & Offline State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);

  useEffect(() => {
    // Detect if running in standalone mode (installed PWA)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandalone(true);
      console.log('RoyalGambit installed successfully as PWA!');
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnectedBanner(true);
      setTimeout(() => setShowReconnectedBanner(false), 4000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) {
      alert('To install RoyalGambit on your device, use your browser menu:\n- Chrome / Edge: Click "Install app" or the icon in address bar.\n- Safari (iOS / macOS): Tap Share -> "Add to Home Screen".');
      return;
    }
    try {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  };

  const realtimeChannelRef = useRef(null);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const myColorRef = useRef(myColor);
  myColorRef.current = myColor;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const activeRoomRef = useRef(activeRoom);
  activeRoomRef.current = activeRoom;

  // Single-award points helper for completed games
  const awardPointsOnGameOver = useCallback((winner, endReason) => {
    if (pointsAwardedRef.current) return;
    pointsAwardedRef.current = true;

    const user = currentUserRef.current;
    const color = myColorRef.current;
    if (!user) return;

    let delta = 0;
    let resultType = 'loss';
    if (winner === 'draw') {
      delta = 1;
      resultType = 'draw';
    } else if ((winner === 'white' && color === 'w') || (winner === 'black' && color === 'b')) {
      delta = 3;
      resultType = 'win';
    } else {
      delta = 0;
      resultType = 'loss';
    }

    const updated = updateLocalUserStats(delta, resultType);
    if (updated) {
      setCurrentUser(prev => prev ? {
        ...prev,
        points: updated.points,
        wins: updated.wins,
        losses: updated.losses,
        draws: updated.draws,
        matches_played: updated.matches_played
      } : prev);
    }

    const room = activeRoomRef.current;
    if (room?.id && isSupabaseConfigured()) {
      awardGamePointsSupabase(room.id, winner);
    }
  }, []);

  // Init Socket.IO (instant ngrok & server.js real-time support)
  useEffect(() => {
    let socket;
    try {
      socket = io({
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        timeout: 5000,
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      socketRef.current = socket;

      socket.on('room_created', ({ roomId, playerColor, timeControl, roomState }) => {
        setGameMode('online');
        setActiveRoom(roomState || { id: roomId, room_code: roomId });
        setMyColor(playerColor);
        setIsFlipped(playerColor === 'b');
        setTimeControlMinutes(timeControl);
        setCurrentScreen('waiting');
        if (roomState?.players) {
          if (roomState.players.white?.name) setWhitePlayer({ name: roomState.players.white.name });
          if (roomState.players.black?.name) setBlackPlayer({ name: roomState.players.black.name });
        } else {
          const myName = currentUserRef.current?.username || 'Player 1';
          if (playerColor === 'w') {
            setWhitePlayer({ name: myName });
            setBlackPlayer({ name: 'Waiting...' });
          } else {
            setWhitePlayer({ name: 'Waiting...' });
            setBlackPlayer({ name: myName });
          }
        }
        sounds.playNotify();
      });

      socket.on('player_joined', ({ roomState }) => {
        setActiveRoom(roomState);
        if (roomState.players?.white?.name && roomState.players.white.name !== 'White') {
          setWhitePlayer(prev => ({ ...prev, name: roomState.players.white.name }));
        }
        if (roomState.players?.black?.name && roomState.players.black.name !== 'Black') {
          setBlackPlayer(prev => ({ ...prev, name: roomState.players.black.name }));
        }
        if (roomState.status === 'playing') {
          setIsGameActive(true);
          setCurrentScreen('game');
          sounds.playNotify();
        }
      });

      socket.on('joined_successfully', ({ playerColor, roomState }) => {
        setGameMode('online');
        setActiveRoom(roomState);
        setMyColor(playerColor);
        setIsFlipped(playerColor === 'b');
        if (roomState.players?.white?.name && roomState.players.white.name !== 'White') {
          setWhitePlayer(prev => ({ ...prev, name: roomState.players.white.name }));
        }
        if (roomState.players?.black?.name && roomState.players.black.name !== 'Black') {
          setBlackPlayer(prev => ({ ...prev, name: roomState.players.black.name }));
        }
        if (roomState.status === 'playing') {
          setIsGameActive(true);
          setCurrentScreen('game');
        } else {
          setCurrentScreen('waiting');
        }
        sounds.playNotify();
      });

      socket.on('move_made', ({ move, fen, whiteTime: wt, blackTime: bt, gameOver, moveId }) => {
        const newGame = new Chess(fen);
        setGame(newGame);
        setBoard(newGame.board());
        setLastMove({ from: move.from, to: move.to });
        if (wt !== undefined) setWhiteTime(wt);
        if (bt !== undefined) setBlackTime(bt);

        setMoveHistory((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (last.from === move.from && last.to === move.to && last.san === move.san) {
              return prev;
            }
          }
          const updated = [...prev, move];
          setHistoryIndex(updated.length - 1);
          return updated;
        });

        // Only play sound if this wasn't our own move that already played optimistically
        const isMyOwnMove = move.color === myColorRef.current;
        const token = moveId || `${move.from}-${move.to}-${move.color}-${fen}`;
        if (!isMyOwnMove) {
          if (move.captured) {
            sounds.playCapture(token);
          } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q') || move.san === 'O-O' || move.san === 'O-O-O')) {
            sounds.playCastle(token);
          } else if (newGame.inCheck()) {
            sounds.playCheck(token);
          } else {
            sounds.playMove(token);
          }
        }

        if (gameOver) {
          setIsGameOver(true);
          setIsGameActive(false);
          if (gameOver.whitePlayerName && gameOver.whitePlayerName !== 'White') {
            setWhitePlayer(prev => ({ ...prev, name: gameOver.whitePlayerName }));
          }
          if (gameOver.blackPlayerName && gameOver.blackPlayerName !== 'Black') {
            setBlackPlayer(prev => ({ ...prev, name: gameOver.blackPlayerName }));
          }
          setGameOverInfo(gameOver);
          sounds.playGameOver();
          awardPointsOnGameOver(gameOver.winner, gameOver.reason);
        }
      });

      socket.on('timer_sync', ({ whiteTime: wt, blackTime: bt }) => {
        setWhiteTime(wt);
        setBlackTime(bt);
      });

      socket.on('chat_message', (msg) => {
        setChatMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        const currentId = currentUserRef.current?.id || socketRef.current?.id;
        const isMe = msg.sender_id === currentId;
        if (!chatOpenRef.current && !isMe) {
          setUnreadChatCount((prev) => prev + 1);
          sounds.playNotify();
        }
      });

      socket.on('messages_read', ({ readerId, readAt }) => {
        setChatMessages((prev) =>
          prev.map((m) => {
            if (m.sender_id !== readerId && !m.read_at) {
              return { ...m, read_at: readAt };
            }
            return m;
          })
        );
      });

      socket.on('draw_offered', ({ fromColor }) => {
        if (fromColor !== myColorRef.current) {
          setIncomingDrawOffer(fromColor);
          sounds.playNotify();
        }
      });

      socket.on('draw_declined', () => {
        alert('Opponent declined the draw offer.');
      });

      socket.on('game_over', ({ winner, reason, whiteTime: wt, blackTime: bt, whitePlayerName, blackPlayerName }) => {
        setIsGameOver(true);
        setIsGameActive(false);
        if (whitePlayerName && whitePlayerName !== 'White') {
          setWhitePlayer(prev => ({ ...prev, name: whitePlayerName }));
        }
        if (blackPlayerName && blackPlayerName !== 'Black') {
          setBlackPlayer(prev => ({ ...prev, name: blackPlayerName }));
        }
        setGameOverInfo({ winner, reason });
        if (wt !== undefined) setWhiteTime(wt);
        if (bt !== undefined) setBlackTime(bt);
        sounds.playGameOver();
        awardPointsOnGameOver(winner, reason);
      });

      socket.on('room_restarted', () => {
        resetBoardAndStartGame(null, null);
      });

      socket.on('join_error', ({ message }) => {
        alert(`Error joining room: ${message}`);
      });
    } catch (e) {
      console.warn('Socket.IO connection notice:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [awardPointsOnGameOver]);

  // Init session & check URL invitation
  useEffect(() => {
    async function initSession() {
      const profile = await getCurrentUserProfile();
      if (profile) {
        setCurrentUser(profile);
      } else {
        const guest = getOrCreateGuestUser();
        setCurrentUser(guest);
      }
    }
    initSession();

    const searchParams = new URLSearchParams(window.location.search);
    let codeFromUrl = searchParams.get('room');
    if (!codeFromUrl && window.location.hash) {
      const match = window.location.hash.match(/game\/([A-Za-z0-9]+)/);
      if (match) codeFromUrl = match[1];
    }

    if (codeFromUrl) {
      setPendingInviteCode(codeFromUrl.toUpperCase());
    }
  }, []);

  // Handle invitation URL
  useEffect(() => {
    if (!pendingInviteCode) return;
    const user = currentUser || getOrCreateGuestUser();
    if (!currentUser) {
      setCurrentUser(user);
    }
    handleJoinByCode(pendingInviteCode);
    setPendingInviteCode(null);
  }, [currentUser, pendingInviteCode]);

  // Timer loop
  useEffect(() => {
    if (!isGameActive || isGameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const turn = game.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1000) {
            handleTimeout('w');
            return 0;
          }
          return prev - 1000;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1000) {
            handleTimeout('b');
            return 0;
          }
          return prev - 1000;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameActive, isGameOver, game]);

  const handleTimeout = (timedOutColor) => {
    setIsGameOver(true);
    setIsGameActive(false);
    const winner = timedOutColor === 'w' ? 'black' : 'white';
    const loserName = timedOutColor === 'w' ? (whitePlayer?.name || 'White') : (blackPlayer?.name || 'Black');
    const winnerName = timedOutColor === 'w' ? (blackPlayer?.name || 'Black') : (whitePlayer?.name || 'White');
    setGameOverInfo({
      winner,
      reason: `${loserName} ran out of time — ${winnerName} won!`
    });
    sounds.playGameOver();
  };

  // Connect to room Realtime channel
  const connectRoomRealtime = (room) => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.unsubscribe();
    }

    const channel = subscribeToRoom(room.id, (event, payload) => {
      if (event === 'chess_move') {
        const { move, fen, whiteTime: wt, blackTime: bt, isGameOver: over, winner, endReason, senderColor, senderName } = payload;
        const newGame = new Chess(fen);
        setGame(newGame);
        setBoard(newGame.board());
        setLastMove({ from: move.from, to: move.to });
        if (wt !== undefined) setWhiteTime(wt);
        if (bt !== undefined) setBlackTime(bt);

        if (senderColor && senderName) {
          if (senderColor === 'w' && senderName !== 'White') {
            setWhitePlayer(prev => ({ ...prev, name: senderName }));
          } else if (senderColor === 'b' && senderName !== 'Black') {
            setBlackPlayer(prev => ({ ...prev, name: senderName }));
          }
        }

        setMoveHistory((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (last.from === move.from && last.to === move.to && last.san === move.san) {
              return prev;
            }
          }
          const updated = [...prev, move];
          setHistoryIndex(updated.length - 1);
          return updated;
        });

        // Only play sound if this wasn't our own move that already played optimistically
        const isMyOwnMove = move.color === myColorRef.current;
        const token = `${move.from}-${move.to}-${move.color}-${fen}`;
        if (!isMyOwnMove) {
          if (move.captured) {
            sounds.playCapture(token);
          } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q') || move.san === 'O-O' || move.san === 'O-O-O')) {
            sounds.playCastle(token);
          } else if (newGame.inCheck()) {
            sounds.playCheck(token);
          } else {
            sounds.playMove(token);
          }
        }

        if (over) {
          setIsGameOver(true);
          setIsGameActive(false);
          setGameOverInfo({ winner, reason: endReason });
          sounds.playGameOver();
          awardPointsOnGameOver(winner, endReason);
        }
      } else if (event === 'player_presence') {
        const { color, username, avatar } = payload;
        if (color === 'w' && username && username !== 'White') {
          setWhitePlayer(prev => ({ ...prev, name: username, avatar: avatar || prev.avatar }));
        } else if (color === 'b' && username && username !== 'Black') {
          setBlackPlayer(prev => ({ ...prev, name: username, avatar: avatar || prev.avatar }));
        }
      } else if (event === 'chat_message') {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        const currentId = currentUserRef.current?.id || socketRef.current?.id;
        const isMe = payload.sender_id === currentId;
        if (!chatOpenRef.current && !isMe) {
          setUnreadChatCount(prev => prev + 1);
          sounds.playNotify();
        }
      } else if (event === 'draw_offer') {
        if (payload.fromColor !== myColorRef.current) {
          setIncomingDrawOffer(payload.fromColor);
          sounds.playNotify();
        }
      } else if (event === 'draw_response') {
        if (payload.accepted) {
          setIsGameOver(true);
          setIsGameActive(false);
          setGameOverInfo({ winner: 'draw', reason: 'Draw by mutual agreement' });
          sounds.playGameOver();
          awardPointsOnGameOver('draw', 'Draw by mutual agreement');
        } else {
          alert('Draw offer was declined.');
        }
      } else if (event === 'resign') {
        const winner = payload.resigningColor === 'w' ? 'black' : 'white';
        const resignerName = payload.resigningColor === 'w' ? (whitePlayer?.name || 'White') : (blackPlayer?.name || 'Black');
        const winnerName = payload.resigningColor === 'w' ? (blackPlayer?.name || 'Black') : (whitePlayer?.name || 'White');
        setIsGameOver(true);
        setIsGameActive(false);
        setGameOverInfo({
          winner,
          reason: `${resignerName} resigned — ${winnerName} won!`
        });
        sounds.playGameOver();
        awardPointsOnGameOver(winner, `${resignerName} resigned — ${winnerName} won!`);
      } else if (event === 'rematch_request') {
        setIncomingRematchRequest(true);
        sounds.playNotify();
      } else if (event === 'room_restart') {
        resetBoardAndStartGame(payload.newWhiteId, payload.newBlackId);
      } else if (event === 'room_updated') {
        // Opponent connected or status changed
        const targetCode = activeRoomRef.current?.room_code || room.room_code || room.id;
        if (targetCode) {
          fetchRoomByCode(targetCode).then((refreshed) => {
            if (refreshed) {
              setActiveRoom(refreshed);
              if (refreshed.white_player?.username) {
                setWhitePlayer(prev => ({ ...prev, name: refreshed.white_player.username, avatar: refreshed.white_player.avatar || prev.avatar }));
              }
              if (refreshed.black_player?.username) {
                setBlackPlayer(prev => ({ ...prev, name: refreshed.black_player.username, avatar: refreshed.black_player.avatar || prev.avatar }));
              }
            }
          }).catch(console.warn);
        }
        if (payload.status === 'playing') {
          setIsGameActive(true);
          setCurrentScreen('game');
          sounds.playNotify();
        }
      }
    });

    realtimeChannelRef.current = channel;

    // Proactively broadcast presence to ensure peer knows our username immediately
    setTimeout(() => {
      try {
        const user = currentUserRef.current || getOrCreateGuestUser();
        const myName = user?.username;
        if (myName && channel?.send) {
          channel.send({
            type: 'broadcast',
            event: 'player_presence',
            payload: {
              color: myColorRef.current,
              username: myName,
              avatar: user?.avatar || 'king'
            }
          });
        }
      } catch (e) {}
    }, 350);
  };

  // Reset board
  const resetBoardAndStartGame = (whiteId, blackId) => {
    pointsAwardedRef.current = false;
    setPremove(null);
    setPremoveSelectedSquare(null);
    const fresh = new Chess();
    setGame(fresh);
    setBoard(fresh.board());
    setMoveHistory([]);
    setHistoryIndex(-1);
    setLastMove(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    const ms = timeControlMinutes * 60 * 1000;
    setWhiteTime(ms);
    setBlackTime(ms);
    setIsGameActive(true);
    setIsGameOver(false);
    setGameOverInfo(null);
    setChatMessages([]);
    setUnreadChatCount(0);

    if (currentUser) {
      const amIWhite = whiteId ? whiteId === currentUser.id : myColor === 'w';
      setMyColor(amIWhite ? 'w' : 'b');
      setIsFlipped(!amIWhite);
    }
  };

  // Create room
  const handleCreateRoom = async ({ timeControlMinutes: tc, preferredColor }) => {
    const user = currentUser || getOrCreateGuestUser();
    const pName = user?.username || 'Player 1';
    if (socketRef.current) {
      socketRef.current.emit('create_room', {
        playerName: pName,
        timeControlMinutes: tc,
        preferredColor
      });
    }

    try {
      const room = await createGameRoom({
        hostUser: user,
        timeControlMinutes: tc,
        preferredColor
      });

      const hostIsWhite = room.white_player_id === user?.id;
      const assignedColor = hostIsWhite ? 'w' : 'b';

      setActiveRoom(room);
      setGameMode('online');
      setMyColor(assignedColor);
      setIsFlipped(assignedColor === 'b');
      setTimeControlMinutes(tc);
      const ms = tc * 60 * 1000;
      setWhiteTime(ms);
      setBlackTime(ms);

      setWhitePlayer({ name: hostIsWhite ? pName : 'Waiting...', avatar: user?.avatar || 'king' });
      setBlackPlayer({ name: !hostIsWhite ? pName : 'Waiting...', avatar: user?.avatar || 'queen' });

      setCurrentScreen('waiting');
      connectRoomRealtime(room);
    } catch (err) {
      console.warn('Fallback room creation:', err);
      setCurrentScreen('waiting');
    }
  };

  // Invite selected player
  const handleInvitePlayer = async (player) => {
    setSearchModalOpen(false);
    if (!currentUser) return;
    try {
      const room = await createGameRoom({
        hostUser: currentUser,
        timeControlMinutes: 10,
        preferredColor: 'random',
        invitedUserId: player.id
      });

      const hostIsWhite = room.white_player_id === currentUser.id;
      const assignedColor = hostIsWhite ? 'w' : 'b';

      setActiveRoom(room);
      setGameMode('online');
      setMyColor(assignedColor);
      setIsFlipped(assignedColor === 'b');
      setWhitePlayer({ name: hostIsWhite ? currentUser.username : player.username, avatar: hostIsWhite ? currentUser.avatar : player.avatar });
      setBlackPlayer({ name: !hostIsWhite ? currentUser.username : player.username, avatar: !hostIsWhite ? currentUser.avatar : player.avatar });

      setCurrentScreen('waiting');
      connectRoomRealtime(room);
    } catch (err) {
      alert(`Could not send invite: ${err.message}`);
    }
  };

  // Join by room code
  const handleJoinByCode = async (code) => {
    if (!code) return;
    const user = currentUser || getOrCreateGuestUser();
    const pName = user?.username || 'Player 2';
    if (socketRef.current) {
      socketRef.current.emit('join_room', {
        roomId: code,
        playerName: pName
      });
    }

    try {
      const room = await fetchRoomByCode(code);
      if (room) {
        const updated = await joinGameRoom(room, user);
        setActiveRoom(updated);
        setGameMode('online');

        const isWhite = (updated.white_player_id === user?.id) || (room.white_player_id === user?.id);
        const assignedColor = isWhite ? 'w' : 'b';
        setMyColor(assignedColor);
        setIsFlipped(assignedColor === 'b');

        const whiteUsername = isWhite ? pName : (room.white_player?.username || updated.white_player?.username || 'White');
        const blackUsername = !isWhite ? pName : (room.black_player?.username || updated.black_player?.username || 'Black');

        setWhitePlayer(prev => ({
          name: whiteUsername !== 'White' ? whiteUsername : (prev?.name && prev.name !== 'White' ? prev.name : 'White'),
          avatar: isWhite ? (user?.avatar || 'king') : (room.white_player?.avatar || 'king')
        }));
        setBlackPlayer(prev => ({
          name: blackUsername !== 'Black' ? blackUsername : (prev?.name && prev.name !== 'Black' ? prev.name : 'Black'),
          avatar: !isWhite ? (user?.avatar || 'queen') : (room.black_player?.avatar || 'queen')
        }));

        const moves = await fetchRoomMoves(room.id);
        if (moves.length > 0) {
          const runner = new Chess();
          const parsedHistory = [];
          for (const m of moves) {
            try {
              const from = m.move_uci ? m.move_uci.slice(0, 2) : undefined;
              const to = m.move_uci ? m.move_uci.slice(2, 4) : undefined;
              const promotion = m.move_uci ? (m.move_uci.slice(4) || undefined) : undefined;
              const res = (from && to ? runner.move({ from, to, promotion }) : null) || runner.move(m.move_san);
              if (res) {
                parsedHistory.push({
                  san: res.san,
                  from: res.from,
                  to: res.to,
                  color: res.color,
                  piece: res.piece,
                  captured: res.captured,
                  promotion: res.promotion,
                  fen: runner.fen()
                });
              } else {
                parsedHistory.push({ san: m.move_san, from, to, fen: m.fen_after_move });
              }
            } catch {
              parsedHistory.push({ san: m.move_san, from: m.move_uci?.slice(0, 2), to: m.move_uci?.slice(2, 4), fen: m.fen_after_move });
            }
          }
          const restoredGame = new Chess(runner.fen());
          setGame(restoredGame);
          setBoard(restoredGame.board());
          setMoveHistory(parsedHistory);
          setHistoryIndex(parsedHistory.length - 1);
          if (parsedHistory.length > 0) {
            const last = parsedHistory[parsedHistory.length - 1];
            setLastMove({ from: last.from, to: last.to });
          }
        }

        setWhiteTime(Number(updated.white_remaining_time));
        setBlackTime(Number(updated.black_remaining_time));
        setIsGameActive(updated.status === 'playing');

        const msgs = await fetchGameMessages(updated.id);
        setChatMessages(msgs);

        setCurrentScreen(updated.status === 'playing' ? 'game' : 'waiting');
        connectRoomRealtime(updated);
      }
    } catch (err) {
      console.warn('Room join notice:', err);
    }
  };

  // Local Practice
  const handleStartLocalPractice = () => {
    setGameMode('local');
    setMyColor('both');
    setIsFlipped(false);
    setActiveRoom(null);
    setWhitePlayer({ name: 'White', avatar: 'king' });
    setBlackPlayer({ name: 'Black', avatar: 'queen' });
    resetBoardAndStartGame(null, null);
    setCurrentScreen('game');
  };

  // Square selection
  const handleSelectSquare = useCallback((square) => {
    if (!square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }
    if (historyIndex !== moveHistory.length - 1 && moveHistory.length > 0) {
      setBoard(game.board());
      setHistoryIndex(moveHistory.length - 1);
    }
    setSelectedSquare(square);
    const moves = game.moves({ square, verbose: true });
    setLegalMoves(moves);
  }, [game, historyIndex, moveHistory.length]);

  // Execute chess move
  const executeMove = useCallback(async (from, to, promotion = 'q') => {
    try {
      const move = game.move({ from, to, promotion });
      if (!move) return;

      if (!isGameActive) setIsGameActive(true);

      setBoard(game.board());
      setLastMove({ from: move.from, to: move.to });

      const newHistory = [
        ...moveHistory,
        {
          san: move.san,
          from: move.from,
          to: move.to,
          piece: move.piece,
          color: move.color,
          captured: move.captured,
          fen: game.fen()
        }
      ];
      setMoveHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      const token = `${move.from}-${move.to}-${move.color}-${game.fen()}`;
      if (move.captured) {
        sounds.playCapture(token);
      } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q') || move.san === 'O-O' || move.san === 'O-O-O')) {
        sounds.playCastle(token);
      } else if (game.inCheck()) {
        sounds.playCheck(token);
      } else {
        sounds.playMove(token);
      }

      let gameOverFlag = false;
      let winner = null;
      let reason = null;

      const endDetails = getGameEndDetails(game, move.color);
      if (endDetails.isOver) {
        gameOverFlag = true;
        setIsGameOver(true);
        setIsGameActive(false);
        winner = endDetails.winner;
        reason = endDetails.reason;
        if (winner && winner !== 'draw' && reason && reason.includes('Checkmate!')) {
          const winnerName = winner === 'white' ? (whitePlayer?.name || 'White') : (blackPlayer?.name || 'Black');
          const loserName = winner === 'white' ? (blackPlayer?.name || 'Black') : (whitePlayer?.name || 'White');
          reason = `Checkmate! ${winnerName} defeated ${loserName}!`;
        }

        setGameOverInfo({ winner, reason });
        sounds.playGameOver();
        awardPointsOnGameOver(winner, reason);
      }

      if (socketRef.current) {
        socketRef.current.emit('make_move', {
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q'
        });
      }

      if (gameMode === 'online' && activeRoom) {
        await submitGameMove({
          roomId: activeRoom.id,
          move,
          moveNumber: newHistory.length,
          playerId: currentUser?.id,
          fen: game.fen(),
          whiteTime,
          blackTime,
          turn: game.turn(),
          isGameOver: gameOverFlag,
          winner,
          endReason: reason,
          channel: realtimeChannelRef.current,
          senderColor: myColor,
          senderName: currentUser?.username || (myColor === 'w' ? whitePlayer?.name : blackPlayer?.name)
        });
      }
    } catch (err) {
      console.error('Move error:', err);
    }
  }, [game, isGameActive, moveHistory, gameMode, activeRoom, currentUser, whiteTime, blackTime, awardPointsOnGameOver]);

  // Premove auto-execution effect when it becomes our turn
  useEffect(() => {
    if (!premove || isGameOver) return;
    const currentMyColor = myColorRef.current || myColor;
    const isMyTurn = gameMode === 'online' && game.turn() === currentMyColor;
    if (isMyTurn) {
      const queued = premove;
      setPremove(null);
      setPremoveSelectedSquare(null);

      // Validate legality of queued premove in current board state
      const legalMovesList = game.moves({ verbose: true });
      const matched = legalMovesList.find(m => m.from === queued.from && m.to === queued.to);
      if (matched) {
        const piece = game.get(queued.from);
        let promo = 'q';
        if (piece && piece.type === 'p') {
          const isWhitePromoting = piece.color === 'w' && queued.to[1] === '8';
          const isBlackPromoting = piece.color === 'b' && queued.to[1] === '1';
          if (isWhitePromoting || isBlackPromoting) {
            promo = queued.promotion || 'q';
          }
        }
        executeMove(queued.from, queued.to, promo);
      } else {
        console.warn('Premove canceled: move illegal in new position');
      }
    }
  }, [board, game, myColor, gameMode, isGameOver, premove, executeMove]);

  const handleMakeMove = useCallback((from, to) => {
    const piece = game.get(from);
    if (piece && piece.type === 'p') {
      const isWhitePromoting = piece.color === 'w' && to[1] === '8';
      const isBlackPromoting = piece.color === 'b' && to[1] === '1';
      if (isWhitePromoting || isBlackPromoting) {
        const legal = game.moves({ square: from, verbose: true });
        if (legal.some(m => m.to === to)) {
          setPendingPromotion({ from, to, color: piece.color });
          return;
        }
      }
    }
    executeMove(from, to, 'q');
  }, [game, executeMove]);

  const handlePromotionSelect = (promotedPiece) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    executeMove(from, to, promotedPiece);
  };

  // Free Analysis Mode Handlers (isolated practice & learning)
  const handleStartExploration = useCallback((targetFen) => {
    let startFen = null;
    if (typeof targetFen === 'string' && targetFen.length > 10) {
      startFen = targetFen;
    } else if (historyIndex >= 0 && historyIndex < moveHistory.length) {
      startFen = moveHistory[historyIndex].fen;
    } else {
      startFen = game.fen();
    }
    setExplorationBaseFen(startFen);
    const eg = new Chess(startFen);
    setExplorationGame(eg);
    setExplorationMoves([]);
    setExplorationLastMove(null);
    setExplorationSelectedSquare(null);
    setExplorationLegalMoves([]);
    setIsExploring(true);
    setGameReviewOpen(false);
  }, [historyIndex, moveHistory, game]);

  const handleSelectExplorationSquare = useCallback((square) => {
    if (!explorationGame) return;
    if (!square) {
      setExplorationSelectedSquare(null);
      setExplorationLegalMoves([]);
      return;
    }
    setExplorationSelectedSquare(square);
    const moves = explorationGame.moves({ square, verbose: true });
    setExplorationLegalMoves(moves);
  }, [explorationGame]);

  const handleMakeExplorationMove = useCallback((from, to) => {
    if (!explorationGame) return;
    try {
      const piece = explorationGame.get(from);
      let promo = 'q';
      const move = explorationGame.move({ from, to, promotion: promo });
      if (!move) return;

      const token = `explore-${move.from}-${move.to}-${move.color}-${explorationGame.fen()}`;
      if (move.captured) {
        sounds.playCapture(token);
      } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q') || move.san === 'O-O' || move.san === 'O-O-O')) {
        sounds.playCastle(token);
      } else if (explorationGame.inCheck()) {
        sounds.playCheck(token);
      } else {
        sounds.playMove(token);
      }

      setExplorationGame(new Chess(explorationGame.fen()));
      setExplorationMoves(prev => [...prev, move]);
      setExplorationLastMove({ from: move.from, to: move.to });
      setExplorationSelectedSquare(null);
      setExplorationLegalMoves([]);
    } catch (e) {
      console.warn('Exploration move error:', e);
    }
  }, [explorationGame]);

  const handleUndoExplorationMove = useCallback(() => {
    if (!explorationGame || explorationMoves.length === 0) return;
    explorationGame.undo();
    const newHistory = explorationMoves.slice(0, -1);
    setExplorationMoves(newHistory);
    setExplorationGame(new Chess(explorationGame.fen()));
    if (newHistory.length > 0) {
      const prevMove = newHistory[newHistory.length - 1];
      setExplorationLastMove({ from: prevMove.from, to: prevMove.to });
    } else {
      setExplorationLastMove(null);
    }
    setExplorationSelectedSquare(null);
    setExplorationLegalMoves([]);
    sounds.playMove();
  }, [explorationGame, explorationMoves]);

  const handleResetExploration = useCallback(() => {
    if (!explorationBaseFen) return;
    const resetG = new Chess(explorationBaseFen);
    setExplorationGame(resetG);
    setExplorationMoves([]);
    setExplorationLastMove(null);
    setExplorationSelectedSquare(null);
    setExplorationLegalMoves([]);
    sounds.playMove();
  }, [explorationBaseFen]);

  const handleExitExploration = useCallback(() => {
    setIsExploring(false);
    setExplorationGame(null);
    setExplorationMoves([]);
    setExplorationLastMove(null);
    setExplorationSelectedSquare(null);
    setExplorationLegalMoves([]);
    if (historyIndex >= 0 && historyIndex < moveHistory.length) {
      const past = moveHistory[historyIndex];
      const g = new Chess(past.fen);
      setBoard(g.board());
    } else {
      setBoard(game.board());
    }
  }, [historyIndex, moveHistory, game]);

  // In-Game Chat Send
  const handleSendChatMessage = async (content) => {
    if (!activeRoom && gameMode !== 'local') return;
    const sName = currentUser?.username || (myColor === 'w' ? 'White' : 'Black');
    const myId = currentUser?.id || socketRef.current?.id || 'guest';

    if (socketRef.current) {
      socketRef.current.emit('chat_message', {
        content,
        senderName: sName,
        senderId: myId
      });
    }

    if (activeRoom && (!socketRef.current || !socketRef.current.connected)) {
      const sent = await sendGameMessage({
        gameId: activeRoom.id,
        senderId: myId,
        senderName: sName,
        content,
        channel: realtimeChannelRef.current
      });
      if (sent) {
        setChatMessages(prev => {
          const tempId = `local_${Date.now()}`;
          return [
            ...prev,
            {
              id: tempId,
              sender_id: myId,
              sender_name: sName,
              content: sent,
              created_at: new Date().toISOString(),
              read_at: null
            }
          ];
        });
      }
    }
  };

  // Mark chat messages as read
  const handleMarkChatRead = useCallback(() => {
    setUnreadChatCount(0);
    const myId = currentUser?.id || socketRef.current?.id || 'guest';
    if (socketRef.current) {
      socketRef.current.emit('mark_messages_read', { readerId: myId });
    }
    if (activeRoom) {
      markMessagesAsReadSupabase(activeRoom.id, myId);
    }
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.sender_id !== myId && !m.read_at) {
          return { ...m, read_at: new Date().toISOString() };
        }
        return m;
      })
    );
  }, [currentUser?.id, activeRoom]);

  // Rematch
  const handleRequestRematch = () => {
    if (socketRef.current) {
      socketRef.current.emit('restart_room');
    }
    if (gameMode === 'online' && realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'rematch_request',
        payload: { fromColor: myColor }
      });
      alert('Rematch request sent to opponent.');
    } else {
      resetBoardAndStartGame(null, null);
    }
  };

  const handleAcceptRematch = (swapColors = true) => {
    setIncomingRematchRequest(false);
    if (socketRef.current) {
      socketRef.current.emit('restart_room');
    }
    if (activeRoom && realtimeChannelRef.current) {
      const newWhiteId = swapColors ? activeRoom.black_player_id : activeRoom.white_player_id;
      const newBlackId = swapColors ? activeRoom.white_player_id : activeRoom.black_player_id;

      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'room_restart',
        payload: { newWhiteId, newBlackId }
      });
      resetBoardAndStartGame(newWhiteId, newBlackId);
    }
  };

  // Resign
  const handleResign = () => {
    if (isGameOver) return;
    const resignerColor = gameMode === 'online' ? myColor : game.turn();
    const resignerName = resignerColor === 'w' ? (whitePlayer?.name || 'White') : (blackPlayer?.name || 'Black');
    const winnerName = resignerColor === 'w' ? (blackPlayer?.name || 'Black') : (whitePlayer?.name || 'White');

    setConfirmDialog({
      title: 'Resign Match',
      message: `Are you sure you want to resign as ${resignerName}? Your opponent will win.`,
      confirmLabel: 'Resign',
      isDanger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        const winner = resignerColor === 'w' ? 'black' : 'white';
        setIsGameOver(true);
        setIsGameActive(false);
        setGameOverInfo({ winner, reason: `${resignerName} resigned — ${winnerName} won!` });
        sounds.playGameOver();

        if (socketRef.current) {
          socketRef.current.emit('resign');
        }

        if (gameMode === 'online' && realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'resign',
            payload: { resigningColor: resignerColor }
          });
        }
      }
    });
  };

  // Draw offer
  const handleOfferDraw = () => {
    if (isGameOver) return;
    if (socketRef.current) {
      socketRef.current.emit('offer_draw');
    }
    if (gameMode === 'online' && realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'draw_offer',
        payload: { fromColor: myColor }
      });
      alert('Draw offer sent to opponent.');
    } else {
      setConfirmDialog({
        title: 'Draw Offer',
        message: 'Do both players agree to end the match in a draw?',
        confirmLabel: 'Agree to Draw',
        onConfirm: () => {
          setConfirmDialog(null);
          setIsGameOver(true);
          setIsGameActive(false);
          setGameOverInfo({ winner: 'draw', reason: 'Draw by mutual agreement.' });
          sounds.playGameOver();
        }
      });
    }
  };

  // Status message derived authoritatively from game state
  let statusMessage = '';
  if (isGameOver && gameOverInfo) {
    let r = gameOverInfo.reason || (game.isCheckmate() ? 'Checkmate' : 'Game Over');
    if (whitePlayer?.name && whitePlayer.name !== 'White') r = r.replace(/\bWhite\b/g, whitePlayer.name);
    if (blackPlayer?.name && blackPlayer.name !== 'Black') r = r.replace(/\bBlack\b/g, blackPlayer.name);
    statusMessage = r;
  } else if (connectionStatus === 'disconnected' || connectionStatus === 'opponent_disconnected') {
    statusMessage = 'Opponent disconnected';
  } else if (activeRoom && activeRoom.status === 'waiting') {
    statusMessage = 'Waiting for opponent';
  } else if (game.inCheck()) {
    const turnName = game.turn() === 'w' ? (whitePlayer?.name || 'White') : (blackPlayer?.name || 'Black');
    statusMessage = `Check! ${turnName} to move`;
  } else {
    const turnName = game.turn() === 'w' ? (whitePlayer?.name || 'White') : (blackPlayer?.name || 'Black');
    statusMessage = `${turnName} to move`;
  }

  const playerColorAllowed = gameMode === 'local' ? 'both' : myColor;

  return (
    <div className={`app-root ${currentScreen === 'game' ? 'in-game-layout' : ''}`}>
      {/* Full-Viewport Background with Smooth Crossfade */}
      <div className="app-theme-background-container" aria-hidden="true">
        {BACKGROUND_THEMES.map((th) => (
          <div
            key={th.id}
            className={`app-theme-background-layer ${currentTheme === th.id ? 'active' : ''}`}
            style={{
              backgroundImage: `url(/assets/theme/${th.id}.webp)`
            }}
          />
        ))}
        {/* Ambient luxury vignette for high readability & UI contrast */}
        <div className="app-theme-background-overlay" />
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div style={{
          background: 'linear-gradient(90deg, #991e4a 0%, #461226 100%)',
          color: '#fff',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          fontWeight: 500,
          borderBottom: '1px solid rgba(229, 169, 149, 0.4)',
          position: 'sticky',
          top: 0,
          zIndex: 60,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          textAlign: 'center'
        }}>
          <WifiOff size={18} color="#ffebee" />
          <span>You are currently offline. Local board practice is available; online matches require an active connection.</span>
          {gameMode !== 'local' && (
            <button
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#fff', color: '#fff' }}
              onClick={handleStartLocalPractice}
            >
              Start Local Game
            </button>
          )}
        </div>
      )}

      {/* Online Restored Banner */}
      {showReconnectedBanner && !isOffline && (
        <div style={{
          background: 'linear-gradient(90deg, #2e7d32 0%, #1b5e20 100%)',
          color: '#fff',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.86rem',
          fontWeight: 600,
          position: 'sticky',
          top: 0,
          zIndex: 60,
          textAlign: 'center'
        }}>
          <Wifi size={16} />
          <span>Connection restored! Online multiplayer is ready. 🌸</span>
        </div>
      )}

      {/* App Header with Real Liquid Glass */}
      <LiquidGlassContainer as="header" className="app-header" borderRadius={0}>
        <div className="brand" onClick={() => setCurrentScreen('home')} style={{ cursor: 'pointer' }}>
          <img src="/assets/pieces/white/king.png" alt="RoyalGambit" className="brand-icon" />
          <div>
            <h1 className="brand-title">RoyalGambit</h1>
            <div className="brand-subtitle">The Grandmaster's Art of Strategic Brilliance</div>
          </div>
        </div>

        {/* Center: Username Reflection in the Middle */}
        {currentUser ? (
          <div
            className="header-user-badge"
            onClick={() => setProfileModalUserId(currentUser.id)}
            title="View Profile & Statistics"
          >
            <span className="header-user-avatar">
              <img src={getAvatarSrc(currentUser.avatar)} alt={currentUser.username} />
            </span>
            <span className="header-user-name">
              {currentUser.username}
            </span>
            <span className="header-user-points">
              ({currentUser.points || 0} pts)
            </span>
          </div>
        ) : (
          <div
            className="header-user-badge guest"
            onClick={() => {
              setAuthCustomMessage(null);
              setAuthModalOpen(true);
            }}
            title="Log In / Register"
          >
            <span className="header-user-name">Guest Player</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Theme Switcher with Palette Icon beside Settings */}
          <div className="theme-dropdown-container" ref={themeDropdownRef}>
            <button
              type="button"
              className={`theme-icon-btn ${themeDropdownOpen ? 'open' : ''}`}
              onClick={() => setThemeDropdownOpen(prev => !prev)}
              aria-expanded={themeDropdownOpen}
              aria-haspopup="listbox"
              title="Change Background Theme"
            >
              <Palette size={16} color="var(--rose-gold-light)" />
            </button>

            {themeDropdownOpen && (
              <div className="theme-dropdown-menu" role="listbox" aria-label="Select Background Theme">
                <div className="theme-dropdown-header">Select Theme</div>
                {BACKGROUND_THEMES.map((th) => {
                  const isActive = currentTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      className={`theme-dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        updateSettings({ ...settings, backgroundTheme: th.id });
                        setThemeDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={isActive}
                    >
                      <img
                        src={th.thumb}
                        alt={th.name}
                        className="theme-dropdown-thumb"
                      />
                      <span className="theme-dropdown-name">{th.name}</span>
                      {isActive && (
                        <span className="theme-dropdown-active-dot">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Settings Button */}
          <button
            className="theme-icon-btn"
            onClick={() => setSettingsOpen(true)}
            title="Game Preferences & Settings"
          >
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>⚙️</span>
          </button>

          {/* PWA Install Button */}
          {!isStandalone && (
            <button
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'var(--rose-gold)',
                color: 'var(--rose-gold-light)'
              }}
              onClick={handleInstallApp}
              title="Install RoyalGambit as a standalone App"
            >
              <Download size={14} />
              <span>Install App</span>
            </button>
          )}

          {currentScreen !== 'home' && (
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setCurrentScreen('home')}
            >
              Home
            </button>
          )}

          {currentUser ? (
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={async () => {
                await logoutUser();
                setCurrentUser(null);
                setCurrentScreen('home');
              }}
              title="Log Out"
            >
              Log Out
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => {
                setAuthCustomMessage(null);
                setAuthModalOpen(true);
              }}
            >
              Log In
            </button>
          )}
        </div>
      </LiquidGlassContainer>

      {/* Main Container */}
      <div className={`app-main-content ${currentScreen === 'game' ? 'game-viewport-mode' : ''}`}>
        {/* Screen 1: Home */}
        {currentScreen === 'home' && (
          <HomeScreen
            currentUser={currentUser}
            isStandalone={isStandalone}
            onInstallApp={handleInstallApp}
            onNavigate={(screen) => {
              if (screen === 'profile') setProfileModalUserId(currentUser?.id);
              else if (screen === 'settings') setSettingsOpen(true);
              else setCurrentScreen(screen);
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={async () => {
              await logoutUser();
              setCurrentUser(null);
            }}
          />
        )}

        {/* Screen 2: Create or Join Game */}
        {currentScreen === 'create_join' && (
          <LobbyView
            currentUser={currentUser}
            onOpenAuth={(msg) => {
              setAuthCustomMessage(msg);
              setAuthModalOpen(true);
            }}
            onLogout={async () => {
              await logoutUser();
              setCurrentUser(null);
            }}
            onOpenSearch={() => setSearchModalOpen(true)}
            onCreateRoom={handleCreateRoom}
            onJoinRoomCode={handleJoinByCode}
            onStartLocalPractice={handleStartLocalPractice}
          />
        )}

        {/* Screen 3: Waiting Room */}
        {currentScreen === 'waiting' && activeRoom && (
          <WaitingRoomView
            room={activeRoom}
            currentUser={currentUser}
            isHost={activeRoom.white_player_id === currentUser?.id || activeRoom.black_player_id === currentUser?.id}
            whitePlayerName={whitePlayer.name}
            blackPlayerName={blackPlayer.name}
            isOpponentConnected={activeRoom.status === 'playing' || (activeRoom.white_player_id && activeRoom.black_player_id)}
            isReady={isGameActive}
            onToggleReady={() => {}}
            onStartMatch={() => setCurrentScreen('game')}
            onCancelRoom={() => setCurrentScreen('create_join')}
          />
        )}

        {/* Screen 4: Chess Game */}
        {currentScreen === 'game' && (
          <main className="game-viewport">
            <div className="board-stage">
              <Chessboard
                game={isExploring ? explorationGame : game}
                board={isExploring ? (explorationGame ? explorationGame.board() : board) : board}
                isFlipped={isFlipped}
                selectedSquare={isExploring ? explorationSelectedSquare : selectedSquare}
                legalMoves={isExploring ? explorationLegalMoves : legalMoves}
                lastMove={isExploring ? explorationLastMove : lastMove}
                inCheckColor={isExploring ? (explorationGame?.inCheck() ? explorationGame.turn() : null) : (game.inCheck() ? game.turn() : null)}
                playerColor={isExploring ? 'both' : playerColorAllowed}
                showMoveDots={settings.showMoveDots}
                onSelectSquare={isExploring ? handleSelectExplorationSquare : handleSelectSquare}
                onMakeMove={isExploring ? handleMakeExplorationMove : handleMakeMove}
                premove={isExploring ? null : premove}
                premoveSelectedSquare={isExploring ? null : premoveSelectedSquare}
                onSelectPremoveSquare={(sq) => setPremoveSelectedSquare(sq)}
                onSetPremove={(from, to) => setPremove({ from, to })}
                onClearPremove={() => {
                  setPremove(null);
                  setPremoveSelectedSquare(null);
                }}
                disabled={isExploring ? false : (isGameOver || (historyIndex !== moveHistory.length - 1 && moveHistory.length > 0))}
              />
            </div>

            <GamePanel
              gameMode={gameMode}
              turn={isExploring ? (explorationGame?.turn() || 'w') : game.turn()}
              board={isExploring ? (explorationGame ? explorationGame.board() : board) : board}
              isFlipped={isFlipped}
              whiteTime={whiteTime}
              blackTime={blackTime}
              whitePlayer={whitePlayer}
              blackPlayer={blackPlayer}
              capturedPieces={capturedPieces}
              moveHistory={moveHistory}
              historyIndex={historyIndex}
              inCheck={isExploring ? explorationGame?.inCheck() : game.inCheck()}
              statusMessage={isExploring ? 'Free Analysis Mode (move both sides)' : statusMessage}
              connectionStatus={connectionStatus}
              unreadChatCount={unreadChatCount}
              premove={premove}
              isExploring={isExploring}
              explorationMoves={explorationMoves}
              onStartExploration={() => handleStartExploration()}
              onUndoExploration={handleUndoExplorationMove}
              onResetExploration={handleResetExploration}
              onExitExploration={handleExitExploration}
              onOpenChat={() => {
                setChatOpen(true);
                setUnreadChatCount(0);
              }}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenReview={() => setGameReviewOpen(true)}
              onRequestRematch={handleRequestRematch}
              onFlipBoard={() => setIsFlipped(prev => !prev)}
              onUndoMove={() => {
                if (gameMode !== 'local' || moveHistory.length === 0 || isGameOver) return;
                game.undo();
                const newHistory = moveHistory.slice(0, -1);
                setMoveHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
                setBoard(game.board());
                setSelectedSquare(null);
                setLegalMoves([]);
                if (newHistory.length > 0) setLastMove({ from: newHistory[newHistory.length - 1].from, to: newHistory[newHistory.length - 1].to });
                else setLastMove(null);
                sounds.playMove();
              }}
              onRestartGame={() => {
                setConfirmDialog({
                  title: 'Restart Match',
                  message: 'Reset match and timers?',
                  confirmLabel: 'Restart',
                  onConfirm: () => {
                    setConfirmDialog(null);
                    resetBoardAndStartGame(null, null);
                  }
                });
              }}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onNavigateHistory={(index) => {
                if (isExploring) handleExitExploration();
                if (index === -1) {
                  const fresh = new Chess();
                  setBoard(fresh.board());
                  setHistoryIndex(-1);
                } else if (index >= 0 && index < moveHistory.length) {
                  const past = moveHistory[index];
                  const pastGame = new Chess(past.fen);
                  setBoard(pastGame.board());
                  setHistoryIndex(index);
                }
              }}
              isGameOver={isGameOver}
              currentTheme={currentTheme}
              onCycleTheme={handleCycleTheme}
            />
          </main>
        )}

        {/* Leaderboards */}
        {currentScreen === 'leaderboard' && (
          <LeaderboardView
            onBack={() => setCurrentScreen('home')}
            onSelectPlayer={(id) => setProfileModalUserId(id)}
          />
        )}
      </div>

      {/* In-Game Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        currentUserId={currentUser?.id || socketRef.current?.id}
        onSendMessage={handleSendChatMessage}
        onMarkRead={handleMarkChatRead}
      />

      {/* Game Review Modal */}
      <GameReviewModal
        isOpen={gameReviewOpen}
        onClose={() => setGameReviewOpen(false)}
        moveHistory={moveHistory}
        whitePlayerName={whitePlayer.name}
        blackPlayerName={blackPlayer.name}
        winner={gameOverInfo?.winner}
        endReason={gameOverInfo?.reason}
        onSelectReviewPosition={(fen) => {
          const revGame = new Chess(fen);
          setBoard(revGame.board());
        }}
        onExplorePosition={(fen) => handleStartExploration(fen)}
      />

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PawnPromotionModal
          color={pendingPromotion.color}
          onSelect={handlePromotionSelect}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setAuthModalOpen(false);
        }}
        customMessage={authCustomMessage}
      />

      {/* Search Modal */}
      <UserSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        currentUser={currentUser}
        onSelectPlayerToInvite={handleInvitePlayer}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={Boolean(profileModalUserId)}
        onClose={() => setProfileModalUserId(null)}
        playerId={profileModalUserId}
        isCurrentUser={profileModalUserId === currentUser?.id}
        onAvatarUpdated={(av) => {
          if (currentUser) setCurrentUser({ ...currentUser, avatar: av });
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onInstallApp={handleInstallApp}
        isStandalone={isStandalone}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        winner={gameOverInfo?.winner}
        reason={gameOverInfo?.reason}
        whitePlayerName={whitePlayer?.name}
        blackPlayerName={blackPlayer?.name}
        onRestart={() => {
          setIsGameOver(false);
          handleRequestRematch();
        }}
        onClose={() => setIsGameOver(false)}
      />

      {/* Confirmation Modal */}
      {confirmDialog && (
        <ConfirmationModal
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          isDanger={confirmDialog.isDanger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Incoming Rematch Request Modal */}
      {incomingRematchRequest && (
        <ConfirmationModal
          isOpen={true}
          title="Rematch Request"
          message="Your opponent wants a rematch! Would you like to swap colors and play again?"
          confirmLabel="Accept & Swap Colors"
          cancelLabel="Decline"
          onConfirm={() => handleAcceptRematch(true)}
          onCancel={() => setIncomingRematchRequest(false)}
        />
      )}

      {/* Draw Offer Modal */}
      {incomingDrawOffer && (
        <DrawOfferModal
          isOpen={true}
          fromColor={incomingDrawOffer}
          onAccept={() => {
            if (realtimeChannelRef.current) {
              realtimeChannelRef.current.send({
                type: 'broadcast',
                event: 'draw_response',
                payload: { accepted: true }
              });
            }
            setIsGameOver(true);
            setIsGameActive(false);
            setGameOverInfo({ winner: 'draw', reason: 'Draw by mutual agreement.' });
            setIncomingDrawOffer(null);
          }}
          onDecline={() => {
            if (realtimeChannelRef.current) {
              realtimeChannelRef.current.send({
                type: 'broadcast',
                event: 'draw_response',
                payload: { accepted: false }
              });
            }
            setIncomingDrawOffer(null);
          }}
        />
      )}
    </div>
  );
}
