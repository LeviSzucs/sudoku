-- Activate the staged technique-rated puzzle bank and prefer it for new puzzle selection.
-- Existing puzzle references remain valid; older active puzzles stay available as fallback.

update public.puzzles
set is_active = true
where source = 'technique_calibrated_20260607'
  and is_active = false;

create or replace function public.get_classic_puzzle(
  p_user_id uuid,
  p_difficulty text
)
returns table(
  puzzle_id text,
  difficulty text,
  givens text,
  solution text,
  rating_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
begin
  select p.puzzle_id, p.difficulty, p.givens, p.solution, p.rating_score
  into v_result
  from public.puzzles p
  where p.difficulty = p_difficulty
    and p.is_active = true
    and p.puzzle_id not in (
      select gr.puzzle_id
      from public.game_results gr
      where gr.user_id = p_user_id
        and gr.difficulty = p_difficulty
        and gr.completed = true
      order by gr.completed_at desc
      limit 10
    )
    and p.puzzle_id not in (
      select ps.puzzle_id
      from public.puzzle_sessions ps
      where ps.user_id = p_user_id
        and ps.status = 'in_progress'
    )
  order by
    case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
    random()
  limit 1;

  if found then
    return query select v_result.puzzle_id, v_result.difficulty, v_result.givens, v_result.solution, v_result.rating_score;
    return;
  end if;

  select p.puzzle_id, p.difficulty, p.givens, p.solution, p.rating_score
  into v_result
  from public.puzzles p
  where p.difficulty = p_difficulty
    and p.is_active = true
  order by
    case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
    random()
  limit 1;

  if found then
    return query select v_result.puzzle_id, v_result.difficulty, v_result.givens, v_result.solution, v_result.rating_score;
  end if;
end;
$$;

grant execute on function public.get_classic_puzzle(uuid, text) to authenticated;

create or replace function public.get_daily_puzzle(
  p_date date,
  p_mode text default 'daily'
)
returns table(
  puzzle_id text,
  difficulty text,
  givens text,
  solution text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned record;
  v_candidate record;
begin
  if p_mode not in ('daily', 'daily_duel') then
    raise exception 'Invalid daily puzzle mode: %', p_mode using errcode = '22023';
  end if;

  select dp.puzzle_id, dp.difficulty, p.givens, p.solution
  into v_assigned
  from public.daily_puzzles dp
  join public.puzzles p on p.puzzle_id = dp.puzzle_id
  where dp.date = p_date
    and dp.mode = p_mode
    and p.is_active = true
  limit 1;

  if found then
    return query select v_assigned.puzzle_id, v_assigned.difficulty, v_assigned.givens, v_assigned.solution;
    return;
  end if;

  select p.puzzle_id, p.difficulty, p.givens, p.solution
  into v_candidate
  from public.puzzles p
  where p.difficulty = 'Medium'
    and p.is_active = true
    and not exists (
      select 1
      from public.daily_puzzles dp
      where dp.date = p_date
        and dp.mode = p_mode
        and dp.puzzle_id = p.puzzle_id
    )
  order by
    case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
    random()
  limit 1;

  if not found then
    select p.puzzle_id, p.difficulty, p.givens, p.solution
    into v_candidate
    from public.puzzles p
    where p.is_active = true
    order by
      case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
      random()
    limit 1;
  end if;

  if not found then
    return;
  end if;

  insert into public.daily_puzzles (date, mode, puzzle_id, difficulty)
  values (p_date, p_mode, v_candidate.puzzle_id, v_candidate.difficulty)
  on conflict (date, mode) do update
  set
    puzzle_id = excluded.puzzle_id,
    difficulty = excluded.difficulty
  where not exists (
    select 1
    from public.puzzles p
    where p.puzzle_id = public.daily_puzzles.puzzle_id
      and p.is_active = true
  );

  select dp.puzzle_id, dp.difficulty, p.givens, p.solution
  into v_assigned
  from public.daily_puzzles dp
  join public.puzzles p on p.puzzle_id = dp.puzzle_id
  where dp.date = p_date
    and dp.mode = p_mode
    and p.is_active = true
  limit 1;

  if found then
    return query select v_assigned.puzzle_id, v_assigned.difficulty, v_assigned.givens, v_assigned.solution;
  end if;
end;
$$;

grant execute on function public.get_daily_puzzle(date, text) to anon, authenticated;

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
  order by
    case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
    random()
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

create or replace function public.enter_ranked_duel()
returns table (
  ranked_duel_id uuid,
  season_id uuid,
  season_name text,
  season_ends_at timestamptz,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid,
  current_user_result_id text,
  opponent_user_id uuid,
  opponent_display_name text,
  opponent_username_handle text,
  opponent_initials text,
  opponent_avatar_color text,
  opponent_tier text,
  your_score integer,
  your_elapsed_seconds integer,
  opponent_score integer,
  opponent_elapsed_seconds integer,
  winner_user_id uuid,
  rp_before integer,
  rp_after integer,
  rp_change integer,
  current_rp integer,
  current_tier text,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.ranked_seasons%rowtype;
  v_profile public.ranked_profiles%rowtype;
  v_waiting public.ranked_duels%rowtype;
  v_duel public.ranked_duels%rowtype;
  v_session public.puzzle_sessions%rowtype;
  v_puzzle public.puzzles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_season := public.active_ranked_season();
  v_profile := public.ensure_ranked_profile(v_user_id, v_season.season_id);

  select *
    into v_duel
  from public.ranked_duels rd
  where rd.season_id = v_season.season_id
    and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
    and (rd.player_a_id = v_user_id or rd.player_b_id = v_user_id)
  order by rd.updated_at desc
  limit 1;

  if v_duel.ranked_duel_id is not null then
    return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
    return;
  end if;

  select *
    into v_waiting
  from public.ranked_duels rd
  where rd.season_id = v_season.season_id
    and rd.status = 'waiting_for_opponent'
    and rd.player_a_id <> v_user_id
    and rd.player_b_id is null
    and abs(coalesce(rd.player_a_rp_before, 0) - coalesce(v_profile.rp, 0)) <= 300
  order by abs(coalesce(rd.player_a_rp_before, 0) - coalesce(v_profile.rp, 0)) asc, rd.created_at asc
  limit 1
  for update skip locked;

  if v_waiting.ranked_duel_id is not null then
    insert into public.puzzle_sessions (
      user_id, puzzle_id, mode, difficulty, board_state, notes_state,
      elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
    )
    select
      v_user_id, p.puzzle_id, 'ranked_duel', p.difficulty,
      public.sudoku_givens_to_board(p.givens), public.empty_sudoku_notes(),
      0, 0, 0, 0, '[]'::jsonb, 'in_progress'
    from public.puzzles p
    where p.puzzle_id = v_waiting.puzzle_id
    returning * into v_session;

    update public.ranked_duels rd
    set player_b_id = v_user_id,
        player_b_session_id = v_session.session_id,
        player_b_rp_before = v_profile.rp,
        status = 'matched',
        matched_at = now(),
        updated_at = now()
    where rd.ranked_duel_id = v_waiting.ranked_duel_id
    returning * into v_duel;

    return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
    return;
  end if;

  select p.*
    into v_puzzle
  from public.puzzles p
  where p.is_active = true
    and p.difficulty in ('Medium', 'Hard')
  order by
    case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
    random()
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'No active Ranked Duel puzzle is available.' using errcode = '22023';
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_user_id, v_puzzle.puzzle_id, 'ranked_duel', v_puzzle.difficulty,
    public.sudoku_givens_to_board(v_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  insert into public.ranked_duels (
    season_id, puzzle_id, player_a_id, player_a_rp_before, player_a_session_id, status
  )
  values (
    v_season.season_id, v_puzzle.puzzle_id, v_user_id, v_profile.rp, v_session.session_id, 'waiting_for_opponent'
  )
  returning * into v_duel;

  return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
end;
$$;

grant execute on function public.enter_ranked_duel() to authenticated;

-- Verification queries:
-- select source, difficulty, count(*) as active_count
-- from public.puzzles
-- where source = 'technique_calibrated_20260607' and is_active = true
-- group by source, difficulty
-- order by difficulty;

-- select puzzle_id, difficulty
-- from public.puzzles
-- where source = 'technique_calibrated_20260607'
--   and difficulty not in ('Easy', 'Medium', 'Hard', 'Expert', 'Master');

-- select puzzle_id, length(givens) as givens_length, length(solution) as solution_length
-- from public.puzzles
-- where source = 'technique_calibrated_20260607'
--   and (length(givens) <> 81 or length(solution) <> 81);

-- select givens, count(*) as duplicate_count
-- from public.puzzles
-- where is_active = true
-- group by givens
-- having count(*) > 1;

-- select count(*) as active_technique_rows
-- from public.puzzles
-- where source = 'technique_calibrated_20260607'
--   and is_active = true;

-- select source, count(*) as active_fallback_rows
-- from public.puzzles
-- where source <> 'technique_calibrated_20260607'
--   and is_active = true
-- group by source
-- order by source;
