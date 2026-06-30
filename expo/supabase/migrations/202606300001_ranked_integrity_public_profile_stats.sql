-- Tighten ranked/duel input hardening and make public profile duel stats
-- come from authoritative completed match tables instead of stale counters.
--
-- Important:
-- - This is a targeted patch only.
-- - Do not replay the full migration chain against production.
-- - Apply manually after reviewing against the live project state.

create or replace function public.submit_ranked_puzzle_result(
  p_session_id uuid,
  p_final_board jsonb,
  p_elapsed_seconds integer,
  p_mistakes integer,
  p_hints_used integer,
  p_undo_count integer,
  p_completed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.puzzle_sessions%rowtype;
  v_received_at timestamptz := clock_timestamp();
  v_completed_at timestamptz := clock_timestamp();
  v_server_elapsed_seconds integer;
  v_effective_elapsed_seconds integer;
  v_effective_mistakes integer;
  v_effective_hints integer;
  v_effective_undos integer;
  v_wrong_entries integer := 0;
  v_hint_moves integer := 0;
  v_undo_moves integer := 0;
  v_minimum_ranked_seconds constant integer := 20;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
    into v_session
  from public.puzzle_sessions
  where session_id = p_session_id
    and user_id = v_user_id
  for update;

  if v_session.session_id is null then
    raise exception 'Puzzle session not found or not owned by user' using errcode = '42501';
  end if;

  if v_session.mode not in ('ranked', 'ranked_duel') then
    raise exception 'Secure ranked submission is only available for ranked sessions.' using errcode = '22023';
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Puzzle session is not in progress' using errcode = '22023';
  end if;

  if v_session.created_at is null then
    raise exception 'Ranked session is missing a server start time.' using errcode = '22023';
  end if;

  -- Use the earlier of client-submitted completion time and the server receipt time,
  -- then clamp it so a broken client cannot complete before the session existed.
  v_completed_at := least(coalesce(p_completed_at, v_received_at), v_received_at);
  if v_completed_at < v_session.created_at then
    v_completed_at := v_session.created_at;
  end if;

  v_server_elapsed_seconds := greatest(
    1,
    ceil(extract(epoch from (v_completed_at - v_session.created_at)))::integer
  );

  -- move_history is still client-submitted in this architecture, so it is only used
  -- as a lower-bound anti-abuse signal that can increase trusted penalties, never lower them.
  v_wrong_entries := public.session_wrong_entry_count(v_session.move_history);
  v_hint_moves := public.session_move_type_count(v_session.move_history, 'hint');
  v_undo_moves := public.session_move_type_count(v_session.move_history, 'undo');

  v_effective_elapsed_seconds := greatest(
    v_server_elapsed_seconds,
    coalesce(v_session.elapsed_seconds, 0),
    coalesce(p_elapsed_seconds, 0)
  );
  v_effective_mistakes := greatest(coalesce(v_session.mistakes, 0), coalesce(p_mistakes, 0), v_wrong_entries);
  v_effective_hints := greatest(coalesce(v_session.hints_used, 0), coalesce(p_hints_used, 0), v_hint_moves);
  v_effective_undos := greatest(coalesce(v_session.undo_count, 0), coalesce(p_undo_count, 0), v_undo_moves);

  if v_effective_elapsed_seconds < v_minimum_ranked_seconds then
    raise exception 'Ranked result rejected: elapsed time is implausibly low.' using errcode = '22023';
  end if;

  if v_effective_hints > 0 then
    raise exception 'Ranked result rejected: hints are not allowed in ranked play.' using errcode = '22023';
  end if;

  return public.submit_puzzle_result_core(
    p_session_id,
    p_final_board,
    v_effective_elapsed_seconds,
    v_effective_mistakes,
    v_effective_hints,
    v_effective_undos,
    v_completed_at
  );
end;
$$;

create or replace function public.submit_ranked_failed_puzzle_result(
  p_session_id uuid,
  p_elapsed_seconds integer,
  p_mistakes integer,
  p_hints_used integer,
  p_undo_count integer,
  p_completed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.puzzle_sessions%rowtype;
  v_received_at timestamptz := clock_timestamp();
  v_completed_at timestamptz := clock_timestamp();
  v_server_elapsed_seconds integer;
  v_effective_elapsed_seconds integer;
  v_effective_mistakes integer;
  v_effective_hints integer;
  v_effective_undos integer;
  v_wrong_entries integer := 0;
  v_hint_moves integer := 0;
  v_undo_moves integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
    into v_session
  from public.puzzle_sessions
  where session_id = p_session_id
    and user_id = v_user_id
  for update;

  if v_session.session_id is null then
    raise exception 'Puzzle session not found or not owned by user' using errcode = '42501';
  end if;

  if v_session.mode not in ('ranked', 'ranked_duel') then
    raise exception 'Secure ranked failed submission is only available for ranked sessions.' using errcode = '22023';
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Puzzle session is not in progress' using errcode = '22023';
  end if;

  if v_session.created_at is null then
    raise exception 'Ranked session is missing a server start time.' using errcode = '22023';
  end if;

  v_completed_at := least(coalesce(p_completed_at, v_received_at), v_received_at);
  if v_completed_at < v_session.created_at then
    v_completed_at := v_session.created_at;
  end if;

  v_server_elapsed_seconds := greatest(
    1,
    ceil(extract(epoch from (v_completed_at - v_session.created_at)))::integer
  );

  -- move_history is still client-submitted here too, so only use it to raise penalties.
  v_wrong_entries := public.session_wrong_entry_count(v_session.move_history);
  v_hint_moves := public.session_move_type_count(v_session.move_history, 'hint');
  v_undo_moves := public.session_move_type_count(v_session.move_history, 'undo');

  v_effective_elapsed_seconds := greatest(
    v_server_elapsed_seconds,
    coalesce(v_session.elapsed_seconds, 0),
    coalesce(p_elapsed_seconds, 0)
  );
  v_effective_mistakes := greatest(coalesce(v_session.mistakes, 0), coalesce(p_mistakes, 0), v_wrong_entries);
  v_effective_hints := greatest(coalesce(v_session.hints_used, 0), coalesce(p_hints_used, 0), v_hint_moves);
  v_effective_undos := greatest(coalesce(v_session.undo_count, 0), coalesce(p_undo_count, 0), v_undo_moves);

  return public.submit_failed_puzzle_result_core(
    p_session_id,
    v_effective_elapsed_seconds,
    v_effective_mistakes,
    v_effective_hints,
    v_effective_undos,
    v_completed_at
  );
end;
$$;

create or replace function public.get_public_player_profile(p_user_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  avatar_symbol text,
  avatar_style_version text,
  avatar_bg_color text,
  avatar_initials text,
  avatar_skin_tone text,
  avatar_hair_style text,
  avatar_hair_color text,
  avatar_top_style text,
  avatar_top_color text,
  avatar_accessory text,
  avatar_frame text,
  public_profile boolean,
  show_stats_publicly boolean,
  show_recent_results_publicly boolean,
  rank_tier text,
  current_streak integer,
  longest_streak integer,
  puzzles_completed integer,
  duels_played integer,
  duels_won integer,
  ranked_played integer,
  ranked_won integer,
  best_easy_time integer,
  best_medium_time integer,
  best_hard_time integer,
  best_expert_time integer,
  best_master_time integer
)
language sql
security definer
set search_path = public
as $$
  with duel_totals as (
    select
      count(*)::integer as duels_played,
      count(*) filter (where winner_user_id = p_user_id)::integer as duels_won
    from (
      select dd.winner_user_id
      from public.daily_duels dd
      where dd.status = 'completed'
        and (dd.player_a_id = p_user_id or dd.player_b_id = p_user_id)

      union all

      select rd.winner_user_id
      from public.ranked_duels rd
      where rd.status = 'completed'
        and (rd.player_a_id = p_user_id or rd.player_b_id = p_user_id)

      union all

      select fc.winner_user_id
      from public.friend_challenges fc
      where fc.status = 'completed'
        and (fc.challenger_id = p_user_id or fc.challenged_id = p_user_id)
    ) completed_duels
  ),
  ranked_totals as (
    select
      count(*)::integer as ranked_played,
      count(*) filter (where rd.winner_user_id = p_user_id)::integer as ranked_won
    from public.ranked_duels rd
    where rd.status = 'completed'
      and (rd.player_a_id = p_user_id or rd.player_b_id = p_user_id)
  )
  select
    p.id as user_id,
    p.username,
    p.display_name,
    p.username_handle,
    p.initials,
    p.avatar_color,
    p.avatar_symbol,
    p.avatar_style_version,
    p.avatar_bg_color,
    p.avatar_initials,
    p.avatar_skin_tone,
    p.avatar_hair_style,
    p.avatar_hair_color,
    p.avatar_top_style,
    p.avatar_top_color,
    p.avatar_accessory,
    p.avatar_frame,
    coalesce(us.public_profile, true) as public_profile,
    coalesce(us.show_stats_publicly, true) as show_stats_publicly,
    coalesce(us.show_recent_results_publicly, false) as show_recent_results_publicly,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.rank_tier
      else null
    end as rank_tier,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.current_streak
      else null
    end as current_streak,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.longest_streak
      else null
    end as longest_streak,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.puzzles_completed
      else null
    end as puzzles_completed,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then coalesce(dt.duels_played, 0)
      else null
    end as duels_played,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then coalesce(dt.duels_won, 0)
      else null
    end as duels_won,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then coalesce(rt.ranked_played, 0)
      else null
    end as ranked_played,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then coalesce(rt.ranked_won, 0)
      else null
    end as ranked_won,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_easy_time
      else null
    end as best_easy_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_medium_time
      else null
    end as best_medium_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_hard_time
      else null
    end as best_hard_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_expert_time
      else null
    end as best_expert_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_master_time
      else null
    end as best_master_time
  from public.profiles p
  left join public.user_settings us on us.user_id = p.id
  left join public.player_stats ps on ps.user_id = p.id
  left join duel_totals dt on true
  left join ranked_totals rt on true
  where p.id = p_user_id;
$$;

grant execute on function public.submit_ranked_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.submit_ranked_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.get_public_player_profile(uuid) to authenticated;
