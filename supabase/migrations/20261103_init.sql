-- Supabase Migration: RoyalGambit Chess
-- Full Schema: Profiles, Game Rooms, Moves, Chat Messages, Game Analysis, and Player Statistics with RLS

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Profiles table (mapped to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  normalized_username text not null unique,
  avatar text default 'queen' not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_profiles_normalized on public.profiles(normalized_username);

-- 3. Game Rooms table
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  white_player_id uuid references public.profiles(id) on delete set null,
  black_player_id uuid references public.profiles(id) on delete set null,
  status text not null default 'waiting', -- 'waiting' | 'playing' | 'finished'
  current_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  current_turn text not null default 'w',
  initial_time integer not null default 10,
  increment integer not null default 0,
  white_remaining_time bigint not null,
  black_remaining_time bigint not null,
  last_move_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  finished_at timestamptz
);

create index if not exists idx_game_rooms_code on public.game_rooms(room_code);
create index if not exists idx_game_rooms_status on public.game_rooms(status);

-- 4. Game Moves table
create table if not exists public.game_moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_rooms(id) on delete cascade,
  move_number integer not null,
  player_id uuid references public.profiles(id) on delete set null,
  move_uci text not null,
  move_san text not null,
  fen_after_move text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_game_moves_game_id on public.game_moves(game_id);

-- 5. Game Messages table (In-Game Chat)
create table if not exists public.game_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_game_messages_game_id on public.game_messages(game_id);

-- 6. Game Analysis table (Stockfish Brilliant Move & Classification records)
create table if not exists public.game_analysis (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_rooms(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete set null,
  move_number integer not null,
  classification text not null, -- 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
  evaluation_before integer,
  evaluation_after integer,
  engine_best_move text,
  principal_variation text,
  sacrifice_detected boolean default false,
  analysis_status text default 'completed',
  created_at timestamptz default now() not null,
  unique (game_id, move_number)
);

create index if not exists idx_game_analysis_game_id on public.game_analysis(game_id);

-- 7. Player Statistics table (Leaderboard Data)
create table if not exists public.player_statistics (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  matches_played integer default 0 not null,
  wins integer default 0 not null,
  losses integer default 0 not null,
  draws integer default 0 not null,
  brilliant_moves integer default 0 not null,
  analyzed_games integer default 0 not null,
  updated_at timestamptz default now() not null
);

-- 8. Game Invitations table
create table if not exists public.game_invitations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_rooms(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '1 day') not null
);

-- 9. Automatic profile and statistics creation trigger on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, normalized_username, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'normalized_username', lower(split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'avatar', 'queen')
  )
  on conflict (id) do update
  set username = excluded.username,
      normalized_username = excluded.normalized_username;

  insert into public.player_statistics (player_id)
  values (new.id)
  on conflict (player_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.game_rooms enable row level security;
alter table public.game_moves enable row level security;
alter table public.game_messages enable row level security;
alter table public.game_analysis enable row level security;
alter table public.player_statistics enable row level security;
alter table public.game_invitations enable row level security;

-- Profiles: Public read, owner update
create policy "Public read profiles" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Insert profile" on public.profiles for insert with check (auth.uid() = id);

-- Game Rooms: Anyone can read, authenticated can create, players can update
create policy "Public read game rooms" on public.game_rooms for select using (true);
create policy "Auth create rooms" on public.game_rooms for insert with check (auth.role() = 'authenticated');
create policy "Players update rooms" on public.game_rooms for update using (
  auth.uid() = white_player_id or auth.uid() = black_player_id or white_player_id is null or black_player_id is null
);

-- Moves: Read moves, participants can insert
create policy "Public read game moves" on public.game_moves for select using (true);
create policy "Players insert moves" on public.game_moves for insert with check (
  exists (
    select 1 from public.game_rooms
    where id = game_moves.game_id
    and (white_player_id = auth.uid() or black_player_id = auth.uid())
  )
);

-- Messages: Only participants in the game can read and send messages
create policy "Participants read messages" on public.game_messages for select using (
  exists (
    select 1 from public.game_rooms
    where id = game_messages.game_id
    and (white_player_id = auth.uid() or black_player_id = auth.uid())
  )
);
create policy "Participants send messages" on public.game_messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.game_rooms
    where id = game_messages.game_id
    and (white_player_id = auth.uid() or black_player_id = auth.uid())
  )
);

-- Analysis: Public read, authenticated players can save analysis
create policy "Public read analysis" on public.game_analysis for select using (true);
create policy "Auth insert analysis" on public.game_analysis for insert with check (auth.role() = 'authenticated');

-- Statistics: Public read for leaderboard, updated through functions or secure operations
create policy "Public read player statistics" on public.player_statistics for select using (true);
create policy "Users update own statistics" on public.player_statistics for update using (auth.uid() = player_id);
create policy "Users insert own statistics" on public.player_statistics for insert with check (auth.uid() = player_id);

-- Enable Realtime replication for game_rooms and game_messages
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.game_messages;
