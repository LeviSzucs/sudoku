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

  -- Cancel or expire any active duel rows that still point at a missing or no-longer
  -- resumable session for the current user before we try to restore or match again.
  with stale_mine as (
    select
      rd.ranked_duel_id,
      case when rd.status = 'waiting_for_opponent' then 'cancelled' else 'expired' end as next_status
    from public.ranked_duels rd
    where rd.season_id = v_season.season_id
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
      and (
        (
          rd.player_a_id = v_user_id
          and (
            rd.player_a_session_id is null
            or not exists (
              select 1
              from public.puzzle_sessions ps
              where ps.session_id = rd.player_a_session_id
                and ps.user_id = rd.player_a_id
                and ps.puzzle_id = rd.puzzle_id
                and ps.status = 'in_progress'
                and ps.mode in ('ranked', 'ranked_duel')
            )
          )
        )
        or (
          rd.player_b_id = v_user_id
          and (
            rd.player_b_session_id is null
            or not exists (
              select 1
              from public.puzzle_sessions ps
              where ps.session_id = rd.player_b_session_id
                and ps.user_id = rd.player_b_id
                and ps.puzzle_id = rd.puzzle_id
                and ps.status = 'in_progress'
                and ps.mode in ('ranked', 'ranked_duel')
            )
          )
        )
      )
  )
  update public.ranked_duels rd
  set status = stale_mine.next_status,
      updated_at = now()
  from stale_mine
  where rd.ranked_duel_id = stale_mine.ranked_duel_id;

  with stale_mine_sessions as (
    select rd.player_a_session_id as session_id
    from public.ranked_duels rd
    where rd.season_id = v_season.season_id
      and rd.player_a_id = v_user_id
      and rd.status in ('cancelled', 'expired')
      and rd.updated_at >= now() - interval '1 minute'
    union
    select rd.player_b_session_id as session_id
    from public.ranked_duels rd
    where rd.season_id = v_season.season_id
      and rd.player_b_id = v_user_id
      and rd.status in ('cancelled', 'expired')
      and rd.updated_at >= now() - interval '1 minute'
  )
  update public.puzzle_sessions ps
  set status = 'abandoned',
      updated_at = now()
  where ps.status = 'in_progress'
    and ps.session_id in (select session_id from stale_mine_sessions where session_id is not null);

  -- Also cancel orphaned waiting rows from other users so matchmaking cannot pair into
  -- an old broken queue entry and reopen the same puzzle again.
  with stale_waiting as (
    select rd.ranked_duel_id
    from public.ranked_duels rd
    where rd.season_id = v_season.season_id
      and rd.status = 'waiting_for_opponent'
      and rd.player_b_id is null
      and (
        rd.player_a_session_id is null
        or not exists (
          select 1
          from public.puzzle_sessions ps
          where ps.session_id = rd.player_a_session_id
            and ps.user_id = rd.player_a_id
            and ps.puzzle_id = rd.puzzle_id
            and ps.status = 'in_progress'
            and ps.mode in ('ranked', 'ranked_duel')
        )
      )
  )
  update public.ranked_duels rd
  set status = 'cancelled',
      updated_at = now()
  from stale_waiting
  where rd.ranked_duel_id = stale_waiting.ranked_duel_id;

  select *
    into v_duel
  from public.ranked_duels rd
  where rd.season_id = v_season.season_id
    and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
    and (rd.player_a_id = v_user_id or rd.player_b_id = v_user_id)
  order by rd.updated_at desc
  limit 1;

  if v_duel.ranked_duel_id is not null then
    if v_duel.player_a_id = v_user_id and v_duel.player_a_session_id is not null then
      update public.puzzle_sessions
      set mode = 'ranked_duel',
          updated_at = now()
      where session_id = v_duel.player_a_session_id
        and mode = 'ranked';
    elsif v_duel.player_b_id = v_user_id and v_duel.player_b_session_id is not null then
      update public.puzzle_sessions
      set mode = 'ranked_duel',
          updated_at = now()
      where session_id = v_duel.player_b_session_id
        and mode = 'ranked';
    end if;

    return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
    return;
  end if;

  select rd.*
    into v_waiting
  from public.ranked_duels rd
  join public.puzzle_sessions ps on ps.session_id = rd.player_a_session_id
  where rd.season_id = v_season.season_id
    and rd.status = 'waiting_for_opponent'
    and rd.player_a_id <> v_user_id
    and rd.player_b_id is null
    and abs(coalesce(rd.player_a_rp_before, 0) - coalesce(v_profile.rp, 0)) <= 300
    and ps.user_id = rd.player_a_id
    and ps.puzzle_id = rd.puzzle_id
    and ps.status = 'in_progress'
    and ps.mode in ('ranked', 'ranked_duel')
  order by abs(coalesce(rd.player_a_rp_before, 0) - coalesce(v_profile.rp, 0)) asc, rd.created_at asc
  limit 1
  for update skip locked;

  if v_waiting.ranked_duel_id is not null then
    update public.puzzle_sessions
    set mode = 'ranked_duel',
        updated_at = now()
    where session_id = v_waiting.player_a_session_id
      and mode = 'ranked';

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
