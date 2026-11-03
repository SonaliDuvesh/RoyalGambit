import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function fetchLeaderboardWins() {
  if (!isSupabaseConfigured()) {
    // Only return legitimate local user statistics if games have actually been played
    try {
      const stored = localStorage.getItem('royal_gambit_user') || localStorage.getItem('royalgambit_user') || localStorage.getItem('cherry_chess_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && (u.matches_played > 0 || u.wins > 0)) {
          const played = u.matches_played || 0;
          const wins = u.wins || 0;
          const winPercentage = played > 0 ? Math.round((wins / played) * 100) : 0;
          return [{
            rank: 1,
            id: u.id,
            username: u.username || 'Player',
            avatar: u.avatar || 'queen',
            wins,
            matches_played: played,
            win_percentage: winPercentage,
            losses: u.losses || 0,
            draws: u.draws || 0,
            brilliant_moves: u.brilliant_moves || 0
          }];
        }
      }
    } catch {}
    return [];
  }

  const { data, error } = await supabase
    .from('player_statistics')
    .select(`
      player_id,
      matches_played,
      wins,
      losses,
      draws,
      brilliant_moves,
      analyzed_games,
      profile:profiles!player_statistics_player_id_fkey(username, avatar)
    `)
    .order('wins', { ascending: false })
    .order('matches_played', { ascending: true })
    .limit(50);

  if (error || !data) {
    console.error('Error fetching wins leaderboard:', error);
    return [];
  }

  return data
    .filter(item => (item.matches_played > 0 || item.wins > 0) && item.profile?.username)
    .map((item, index) => {
      const played = item.matches_played || 0;
      const wins = item.wins || 0;
      const winPercentage = played > 0 ? Math.round((wins / played) * 100) : 0;

      return {
        rank: index + 1,
        id: item.player_id,
        username: item.profile?.username || 'Player',
        avatar: item.profile?.avatar || 'queen',
        wins,
        matches_played: played,
        win_percentage: winPercentage,
        losses: item.losses || 0,
        draws: item.draws || 0,
        brilliant_moves: item.brilliant_moves || 0
      };
    });
}

export async function fetchLeaderboardBrilliant() {
  if (!isSupabaseConfigured()) {
    try {
      const stored = localStorage.getItem('royal_gambit_user') || localStorage.getItem('royalgambit_user') || localStorage.getItem('cherry_chess_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && (u.brilliant_moves > 0)) {
          return [{
            rank: 1,
            id: u.id,
            username: u.username || 'Player',
            avatar: u.avatar || 'queen',
            brilliant_moves: u.brilliant_moves || 0,
            analyzed_games: u.analyzed_games || 0,
            matches_played: u.matches_played || 0
          }];
        }
      }
    } catch {}
    return [];
  }

  const { data, error } = await supabase
    .from('player_statistics')
    .select(`
      player_id,
      brilliant_moves,
      analyzed_games,
      matches_played,
      profile:profiles!player_statistics_player_id_fkey(username, avatar)
    `)
    .order('brilliant_moves', { ascending: false })
    .order('analyzed_games', { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error('Error fetching brilliant leaderboard:', error);
    return [];
  }

  return data
    .filter(item => item.brilliant_moves > 0 && item.profile?.username)
    .map((item, index) => ({
      rank: index + 1,
      id: item.player_id,
      username: item.profile?.username || 'Player',
      avatar: item.profile?.avatar || 'queen',
      brilliant_moves: item.brilliant_moves || 0,
      analyzed_games: item.analyzed_games || 0,
      matches_played: item.matches_played || 0
    }));
}

export async function fetchPlayerProfile(playerId) {
  if (!isSupabaseConfigured() || !playerId) {
    // Local fallback for guest or local testing
    try {
      const stored = localStorage.getItem('royal_gambit_user') || localStorage.getItem('royalgambit_user') || localStorage.getItem('cherry_chess_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id === playerId || !playerId) {
          return {
            id: u.id,
            username: u.username,
            avatar: u.avatar || 'queen',
            created_at: new Date().toISOString(),
            stats: {
              points: u.points || 0,
              matches_played: u.matches_played || 0,
              wins: u.wins || 0,
              losses: u.losses || 0,
              draws: u.draws || 0,
              brilliant_moves: 0,
              analyzed_games: 0
            }
          };
        }
      }
    } catch {}
    return {
      id: playerId || 'player',
      username: 'Player',
      avatar: 'queen',
      stats: { points: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, brilliant_moves: 0, analyzed_games: 0 }
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  const { data: stats } = await supabase
    .from('player_statistics')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  return {
    ...profile,
    stats: stats || { points: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, brilliant_moves: 0, analyzed_games: 0 }
  };
}

export async function updatePlayerAvatar(playerId, avatarKey) {
  if (!isSupabaseConfigured() || !playerId) return;

  await supabase
    .from('profiles')
    .update({ avatar: avatarKey })
    .eq('id', playerId);
}

