-- Supabase Migration: Add Player Points and Chat Read Receipts
-- Supports Bug Fixes: Player Point System & Chat Seen Status

-- 1. Add points column to player_statistics if not exists
alter table if exists public.player_statistics
  add column if not exists points integer default 0 not null;

-- 2. Add points_awarded flag to game_rooms to guarantee points are awarded only once
alter table if exists public.game_rooms
  add column if not exists points_awarded boolean default false not null;

-- 3. Add read_at timestamp to game_messages
alter table if exists public.game_messages
  add column if not exists read_at timestamptz default null;

-- 4. Secure server-side function to award points for completed games
create or replace function public.award_game_points(
  p_game_id uuid,
  p_winner text
)
returns json as $$
declare
  v_room record;
  v_white_pts integer := 0;
  v_black_pts integer := 0;
begin
  -- Fetch and lock the room
  select * into v_room
  from public.game_rooms
  where id = p_game_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Room not found');
  end if;

  -- Ensure points have not already been awarded
  if v_room.points_awarded then
    return json_build_object('success', false, 'message', 'Points already awarded');
  end if;

  -- Calculate points based on winner
  -- Win = +3, Draw = +1, Loss = 0
  if p_winner = 'white' then
    v_white_pts := 3;
    v_black_pts := 0;
    -- Update white player stats
    if v_room.white_player_id is not null then
      update public.player_statistics
      set points = points + 3,
          wins = wins + 1,
          matches_played = matches_played + 1,
          updated_at = now()
      where player_id = v_room.white_player_id;
    end if;
    -- Update black player stats
    if v_room.black_player_id is not null then
      update public.player_statistics
      set losses = losses + 1,
          matches_played = matches_played + 1,
          updated_at = now()
      where player_id = v_room.black_player_id;
    end if;

  elsif p_winner = 'black' then
    v_white_pts := 0;
    v_black_pts := 3;
    if v_room.black_player_id is not null then
      update public.player_statistics
      set points = points + 3,
          wins = wins + 1,
          matches_played = matches_played + 1,
          updated_at = now()
      where player_id = v_room.black_player_id;
    end if;
    if v_room.white_player_id is not null then
      update public.player_statistics
      set losses = losses + 1,
          matches_played = matches_played + 1,
          updated_at = now()
      where player_id = v_room.white_player_id;
    end if;

  elsif p_winner = 'draw' then
    v_white_pts := 1;
    v_black_pts := 1;
    if v_room.white_player_id is not null then
      update public.player_statistics
      set points = points + 1,
          draws = draws + 1,
          matches_played = matches_played + 1,
          updated_at = now()
      where player_id = v_room.white_player_id;
    end if;
    if v_room.black_player_id is not null then
      update public.player_statistics
      set points = points + 1,
          draws = draws + 1,
          matches_played = matches_played + 1,
          updated_at = now()
      where player_id = v_room.black_player_id;
    end if;
  end if;

  -- Mark points awarded on the room
  update public.game_rooms
  set points_awarded = true,
      status = 'finished',
      finished_at = now(),
      updated_at = now()
  where id = p_game_id;

  return json_build_object(
    'success', true,
    'white_points', v_white_pts,
    'black_points', v_black_pts,
    'winner', p_winner
  );
end;
$$ language plpgsql security definer;

-- 5. Secure function to mark messages as read
create or replace function public.mark_chat_messages_read(
  p_game_id uuid,
  p_reader_id uuid
)
returns integer as $$
declare
  v_count integer;
begin
  -- Mark all messages not sent by reader as read
  update public.game_messages
  set read_at = now()
  where game_id = p_game_id
    and sender_id != p_reader_id
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql security definer;

