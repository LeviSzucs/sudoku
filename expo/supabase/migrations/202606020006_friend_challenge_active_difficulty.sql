-- Friend Challenge duplicate protection by active pair + difficulty.

drop index if exists public.friend_challenges_active_pair_puzzle_unique;

create unique index if not exists friend_challenges_active_pair_difficulty_unique
  on public.friend_challenges (least(challenger_id, challenged_id), greatest(challenger_id, challenged_id), difficulty)
  where status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed');

create or replace function public.create_friend_challenge(p_friend_username text, p_difficulty text)
returns table (
  challenge_id uuid,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid,
  friend_user_id uuid,
  friend_display_name text,
  friend_username_handle text,
  friend_initials text,
  friend_avatar_color text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenger_id uuid := auth.uid();
  v_friend_id uuid;
  v_friend_display_name text;
  v_username text := lower(trim(leading '@' from trim(coalesce(p_friend_username, ''))));
  v_difficulty text := initcap(lower(trim(coalesce(p_difficulty, ''))));
  v_puzzle public.puzzles%rowtype;
  v_challenge public.friend_challenges%rowtype;
  v_session public.puzzle_sessions%rowtype;
begin
  if v_challenger_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_difficulty not in ('Easy', 'Medium', 'Hard', 'Expert', 'Master') then
    raise exception 'Choose a valid difficulty.';
  end if;

  select
    p.id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player')
  into v_friend_id, v_friend_display_name
  from public.profiles p
  where lower(p.username_handle) = v_username
    and p.profile_setup_completed = true
  limit 1;

  if v_friend_id is null then
    raise exception 'Friend not found.';
  end if;

  if v_friend_id = v_challenger_id then
    raise exception 'You cannot challenge yourself.';
  end if;

  if not exists (
    select 1 from public.friends f
    where f.user_id = v_challenger_id and f.friend_id = v_friend_id
  ) then
    raise exception 'You can only challenge accepted friends.';
  end if;

  if exists (
    select 1 from public.friend_challenges fc
    where fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed')
      and fc.difficulty = v_difficulty
      and least(fc.challenger_id, fc.challenged_id) = least(v_challenger_id, v_friend_id)
      and greatest(fc.challenger_id, fc.challenged_id) = greatest(v_challenger_id, v_friend_id)
  ) then
    raise exception 'You already have an active % challenge with %.', v_difficulty, v_friend_display_name;
  end if;

  select * into v_puzzle
  from public.puzzles p
  where p.difficulty = v_difficulty
    and p.is_active = true
  order by random()
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'No active puzzle is available for this difficulty.';
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_challenger_id, v_puzzle.puzzle_id, 'friend_challenge', v_puzzle.difficulty,
    public.sudoku_givens_to_board(v_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  insert into public.friend_challenges (
    challenger_id, challenged_id, puzzle_id, difficulty, status, challenger_session_id
  )
  values (
    v_challenger_id, v_friend_id, v_puzzle.puzzle_id, v_puzzle.difficulty, 'pending', v_session.session_id
  )
  returning * into v_challenge;

  return query
  select
    v_challenge.challenge_id,
    v_challenge.status,
    v_challenge.puzzle_id,
    v_challenge.difficulty,
    v_session.session_id,
    p.id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player'),
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL'),
    coalesce(p.avatar_color, '#A8A294')
  from public.profiles p
  where p.id = v_friend_id;
exception
  when unique_violation then
    raise exception 'You already have an active % challenge with %.', v_difficulty, coalesce(v_friend_display_name, 'this friend');
end;
$$;

grant execute on function public.create_friend_challenge(text, text) to authenticated;
