import { supabase, isSupabaseConfigured } from '../lib/supabase';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function searchPlayers(query, currentUserId) {
  if (!isSupabaseConfigured() || !query || query.trim().length === 0) return [];

  const trimmed = query.trim();
  let dbQuery = supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${trimmed}%`)
    .limit(8);

  if (currentUserId) {
    dbQuery = dbQuery.neq('id', currentUserId);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Error searching players:', error);
    return [];
  }
  return data || [];
}

export async function createGameRoom({
  hostUser,
  timeControlMinutes = 10,
  preferredColor = 'random',
  invitedUserId = null
}) {
  const roomCode = generateRoomCode();
  const initialTimeMs = Math.max(1, timeControlMinutes) * 60 * 1000;

  let hostColor = 'w';
  if (preferredColor === 'black') hostColor = 'b';
  else if (preferredColor === 'random') hostColor = Math.random() < 0.5 ? 'w' : 'b';

  if (!isSupabaseConfigured()) {
    return {
      id: roomCode,
      room_code: roomCode,
      white_player_id: hostColor === 'w' ? (hostUser?.id || 'host') : null,
      black_player_id: hostColor === 'b' ? (hostUser?.id || 'host') : null,
      status: 'waiting',
      current_turn: 'w',
      initial_time: timeControlMinutes,
      increment: 0,
      white_remaining_time: initialTimeMs,
      black_remaining_time: initialTimeMs,
      current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    };
  }

  const roomData = {
    room_code: roomCode,
    white_player_id: hostColor === 'w' ? hostUser.id : null,
    black_player_id: hostColor === 'b' ? hostUser.id : null,
    status: 'waiting',
    current_turn: 'w',
    initial_time: timeControlMinutes,
    increment: 0,
    white_remaining_time: initialTimeMs,
    black_remaining_time: initialTimeMs,
    current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  };

  const { data: createdRoom, error } = await supabase
    .from('game_rooms')
    .insert(roomData)
    .select()
    .single();

  if (error) {
    console.error('Error creating game room:', error);
    throw error;
  }

  // Create invitation if invited user provided
  if (invitedUserId) {
    await supabase.from('game_invitations').insert({
      game_id: createdRoom.id,
      inviter_id: hostUser.id,
      invited_player_id: invitedUserId,
      status: 'pending'
    });
  }

  return createdRoom;
}

export async function fetchRoomByCode(code) {
  if (!code) return null;
  const upper = code.trim().toUpperCase();

  if (!isSupabaseConfigured()) {
    return {
      id: upper,
      room_code: upper,
      status: 'waiting',
      current_turn: 'w',
      initial_time: 10,
      white_remaining_time: 10 * 60 * 1000,
      black_remaining_time: 10 * 60 * 1000,
      current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    };
  }
  const { data: room, error } = await supabase
    .from('game_rooms')
    .select(`
      *,
      white_player:profiles!game_rooms_white_player_id_fkey(id, username),
      black_player:profiles!game_rooms_black_player_id_fkey(id, username)
    `)
    .eq('room_code', upper)
    .maybeSingle();

  if (error) {
    // If foreign key naming differs, try simple select
    const { data: simpleRoom, error: simpleError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', upper)
      .maybeSingle();

    if (simpleError) {
      console.error('Error fetching room:', simpleError);
      return null;
    }
    return simpleRoom;
  }

  return room;
}

export async function fetchRoomMoves(roomId) {
  if (!isSupabaseConfigured() || !roomId) return [];

  const { data: moves, error } = await supabase
    .from('game_moves')
    .select('*')
    .eq('game_id', roomId)
    .order('move_number', { ascending: true });

  if (error) {
    console.error('Error fetching room moves:', error);
    return [];
  }
  return moves || [];
}

export async function joinGameRoom(room, user) {
  if (!isSupabaseConfigured() || !room || !user) return room;

  // Check if user is already one of the players
  if (room.white_player_id === user.id || room.black_player_id === user.id) {
    return room;
  }

  // Check vacant slot
  const updateData = {};
  if (!room.white_player_id) {
    updateData.white_player_id = user.id;
  } else if (!room.black_player_id) {
    updateData.black_player_id = user.id;
  } else {
    throw new Error('This game room is already full.');
  }

  // If both players present, status is 'playing'
  updateData.status = 'playing';

  const { data: updatedRoom, error } = await supabase
    .from('game_rooms')
    .update(updateData)
    .eq('id', room.id)
    .select()
    .single();

  if (error) {
    console.error('Error joining game room:', error);
    throw error;
  }

  return updatedRoom;
}

export async function submitGameMove({
  roomId,
  move,
  moveNumber,
  playerId,
  fen,
  whiteTime,
  blackTime,
  turn,
  isGameOver = false,
  winner = null,
  endReason = null,
  channel = null
}) {
  if (!isSupabaseConfigured()) return;

  // Insert into game_moves
  await supabase.from('game_moves').insert({
    game_id: roomId,
    move_number: moveNumber,
    player_id: playerId,
    move_uci: `${move.from}${move.to}${move.promotion || ''}`,
    move_san: move.san,
    fen_after_move: fen
  });

  // Update game_rooms
  const updateData = {
    current_fen: fen,
    current_turn: turn,
    white_remaining_time: whiteTime,
    black_remaining_time: blackTime,
    status: isGameOver ? 'finished' : 'playing'
  };

  if (isGameOver) {
    updateData.finished_at = new Date().toISOString();
  }

  await supabase
    .from('game_rooms')
    .update(updateData)
    .eq('id', roomId);

  // Broadcast via Supabase Realtime channel
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'chess_move',
      payload: {
        move,
        fen,
        turn,
        whiteTime,
        blackTime,
        isGameOver,
        winner,
        endReason
      }
    });
  }
}

export function subscribeToRoom(roomId, onEvent) {
  if (!isSupabaseConfigured() || !roomId) {
    return {
      send: () => {},
      unsubscribe: () => {}
    };
  }

  const channel = supabase.channel(`game:${roomId}`, {
    config: {
      broadcast: { ack: true }
    }
  });

  channel
    .on('broadcast', { event: 'chess_move' }, ({ payload }) => {
      onEvent('chess_move', payload);
    })
    .on('broadcast', { event: 'draw_offer' }, ({ payload }) => {
      onEvent('draw_offer', payload);
    })
    .on('broadcast', { event: 'draw_response' }, ({ payload }) => {
      onEvent('draw_response', payload);
    })
    .on('broadcast', { event: 'resign' }, ({ payload }) => {
      onEvent('resign', payload);
    })
    .on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      onEvent('timer_sync', payload);
    })
    .on('broadcast', { event: 'room_restart' }, ({ payload }) => {
      onEvent('room_restart', payload);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_rooms',
      filter: `id=eq.${roomId}`
    }, (payload) => {
      onEvent('room_updated', payload.new);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onEvent('subscribed', channel);
      }
    });

  return channel;
}

export async function awardGamePointsSupabase(roomId, winner) {
  if (!isSupabaseConfigured() || !roomId) return null;
  try {
    const { data, error } = await supabase.rpc('award_game_points', {
      p_game_id: roomId,
      p_winner: winner
    });
    if (error) console.error('Error awarding game points in Supabase:', error);
    return data;
  } catch (err) {
    console.error('awardGamePoints error:', err);
    return null;
  }
}

