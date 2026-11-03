import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function normalizeUsername(username) {
  return (username || '').trim().toLowerCase();
}

export function validateUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized || normalized.length < 3) {
    return 'Username must be at least 3 characters long.';
  }
  if (normalized.length > 20) {
    return 'Username must be at most 20 characters long.';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return 'Username can only contain letters, numbers, and underscores.';
  }
  return null;
}

export function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
}

// Synthesize internal unique email from username for Supabase Auth
function usernameToEmail(normalizedUsername) {
  return `${normalizedUsername}@chess.app.internal`;
}

export async function checkUsernameAvailable(username) {
  if (!isSupabaseConfigured()) return true;
  const normalized = normalizeUsername(username);
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('normalized_username', normalized)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking username:', error);
  }
  return !data;
}

export async function registerUser({ username, password }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }

  const uError = validateUsername(username);
  if (uError) throw new Error(uError);

  const pError = validatePassword(password);
  if (pError) throw new Error(pError);

  const normalized = normalizeUsername(username);
  const isAvailable = await checkUsernameAvailable(normalized);
  if (!isAvailable) {
    throw new Error(`The username "${username}" is already taken. Please choose another.`);
  }

  const email = usernameToEmail(normalized);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.trim(),
        normalized_username: normalized
      }
    }
  });

  if (authError) throw authError;

  const user = authData.user;
  if (!user) throw new Error('Registration failed. Please try again.');

  // Create or upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      username: username.trim(),
      normalized_username: normalized
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Profile creation error:', profileError);
  }

  return {
    id: user.id,
    username: username.trim(),
    normalized_username: normalized
  };
}

export async function loginUser({ username, password }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }

  const normalized = normalizeUsername(username);
  if (!normalized) throw new Error('Please enter your username.');
  if (!password) throw new Error('Please enter your password.');

  const email = usernameToEmail(normalized);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      throw new Error('Invalid username or password.');
    }
    throw authError;
  }

  const user = authData.user;
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, normalized_username')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    username: profile?.username || username.trim(),
    normalized_username: profile?.normalized_username || normalized
  };
}

export async function logoutUser() {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

export function getOrCreateGuestUser(customName) {
  let stored = null;
  try {
    stored = localStorage.getItem('royal_gambit_user') || localStorage.getItem('royalgambit_user') || localStorage.getItem('cherry_chess_user');
    if (stored) {
      const u = JSON.parse(stored);
      if (customName && customName.trim()) {
        u.username = customName.trim();
        localStorage.setItem('royal_gambit_user', JSON.stringify(u));
        localStorage.setItem('royalgambit_user', JSON.stringify(u));
        localStorage.setItem('cherry_chess_user', JSON.stringify(u));
      }
      return u;
    }
  } catch (e) {}

  const guestNum = Math.floor(1000 + Math.random() * 9000);
  const name = customName?.trim() || `Player-${guestNum}`;
  const guestUser = {
    id: `guest_${Date.now()}_${guestNum}`,
    username: name,
    avatar: 'queen',
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    matches_played: 0,
    is_guest: true
  };
  try {
    localStorage.setItem('royal_gambit_user', JSON.stringify(guestUser));
    localStorage.setItem('royalgambit_user', JSON.stringify(guestUser));
    localStorage.setItem('cherry_chess_user', JSON.stringify(guestUser));
  } catch (e) {}
  return guestUser;
}

export function updateLocalUserStats(pointDelta, resultType) {
  try {
    const stored = localStorage.getItem('royal_gambit_user') || localStorage.getItem('royalgambit_user') || localStorage.getItem('cherry_chess_user');
    if (!stored) return null;
    const u = JSON.parse(stored);
    u.points = Math.max(0, (u.points || 0) + pointDelta);
    u.matches_played = (u.matches_played || 0) + 1;
    if (resultType === 'win') u.wins = (u.wins || 0) + 1;
    else if (resultType === 'loss') u.losses = (u.losses || 0) + 1;
    else if (resultType === 'draw') u.draws = (u.draws || 0) + 1;
    localStorage.setItem('royal_gambit_user', JSON.stringify(u));
    localStorage.setItem('royalgambit_user', JSON.stringify(u));
    localStorage.setItem('cherry_chess_user', JSON.stringify(u));
    return u;
  } catch (e) {
    return null;
  }
}

export async function getCurrentUserProfile() {
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, normalized_username, avatar')
          .eq('id', session.user.id)
          .maybeSingle();

        const { data: stats } = await supabase
          .from('player_statistics')
          .select('points, wins, losses, draws, matches_played')
          .eq('player_id', session.user.id)
          .maybeSingle();

        const points = stats?.points || 0;

        if (profile) {
          return {
            ...profile,
            points,
            stats: stats || { points: 0, wins: 0, losses: 0, draws: 0, matches_played: 0 }
          };
        }

        return {
          id: session.user.id,
          username: session.user.user_metadata?.username || 'Player',
          normalized_username: session.user.user_metadata?.normalized_username || 'player',
          points,
          stats: stats || { points: 0, wins: 0, losses: 0, draws: 0, matches_played: 0 }
        };
      }
    } catch (e) {
      console.warn('Supabase profile retrieval notice:', e);
    }
  }

  // Fallback to local guest user
  return getOrCreateGuestUser();
}

