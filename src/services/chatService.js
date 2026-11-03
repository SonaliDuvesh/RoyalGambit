import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function fetchGameMessages(gameId) {
  if (!isSupabaseConfigured() || !gameId) return [];

  const { data, error } = await supabase
    .from('game_messages')
    .select(`
      id,
      content,
      created_at,
      read_at,
      sender_id,
      sender:profiles!game_messages_sender_id_fkey(id, username, avatar)
    `)
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });

  if (error) {
    const { data: plain, error: plainErr } = await supabase
      .from('game_messages')
      .select('id, sender_id, content, created_at, read_at')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (plainErr) {
      console.error('Error fetching game messages:', plainErr);
      return [];
    }
    return plain || [];
  }

  return data || [];
}

export async function markMessagesAsReadSupabase(gameId, readerId) {
  if (!isSupabaseConfigured() || !gameId || !readerId) return;
  try {
    await supabase.rpc('mark_chat_messages_read', {
      p_game_id: gameId,
      p_reader_id: readerId
    });
  } catch (err) {
    console.error('Error marking messages as read in Supabase:', err);
  }
}

export async function sendGameMessage({ gameId, senderId, senderName, content, channel }) {
  if (!content || !content.trim()) return null;

  const sanitized = content.trim().slice(0, 500); // 500 char length limit

  const msgObj = {
    game_id: gameId,
    sender_id: senderId,
    content: sanitized
  };

  // Broadcast in real time
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: {
        id: `temp_${Date.now()}`,
        sender_id: senderId,
        sender_name: senderName,
        content: sanitized,
        created_at: new Date().toISOString()
      }
    });
  }

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('game_messages').insert(msgObj);
    } catch (err) {
      console.error('Error saving chat message to Supabase:', err);
    }
  }

  return sanitized;
}

