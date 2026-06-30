-- Fix stuck Ranked Duel state after failed or unrestorable matches.
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

  if v_session.mode = 'ranked' and exists (
    select 1
    from public.ranked_duels rd
    where (
        (rd.player_a_session_id = p_session_id and rd.player_a_id = v_user_id)
        or (rd.player_b_session_id = p_session_id and rd.player_b_id = v_user_id)
      )
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed', 'completed')
  ) then
    update public.puzzle_sessions
    set mode = 'ranked_duel',
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id
      and mode = 'ranked';

    select *
      into v_session
    from public.puzzle_sessions
    where session_id = p_session_id
      and user_id = v_user_id
    for update;
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

  v_completed_at := least(coalesce(p_completed_at, v_received_at), v_received_at);
  if v_completed_at < v_session.created_at then
    v_completed_at := v_session.created_at;
  end if;

  v_server_elapsed_seconds := greatest(
    1,
    ceil(extract(epoch from (v_completed_at - v_session.created_at)))::integer
  );

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

  if v_session.mode = 'ranked' and exists (
    select 1
    from public.ranked_duels rd
    where (
        (rd.player_a_session_id = p_session_id and rd.player_a_id = v_user_id)
        or (rd.player_b_session_id = p_session_id and rd.player_b_id = v_user_id)
      )
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed', 'completed')
  ) then
    update public.puzzle_sessions
    set mode = 'ranked_duel',
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id
      and mode = 'ranked';

    select *
      into v_session
    from public.puzzle_sessions
    where session_id = p_session_id
      and user_id = v_user_id
    for update;
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

create or replace function public.link_ranked_duel_result(
  p_user_id uuid,
  p_session_id uuid,
  p_result_id text
)
returns table (
  ranked_duel_id uuid,
  status text,
  winner_user_id uuid,
  rp_change integer,
  rp_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.game_results%rowtype;
  v_duel public.ranked_duels%rowtype;
  v_side_result public.game_results%rowtype;
  v_a_result public.game_results%rowtype;
  v_b_result public.game_results%rowtype;
  v_next_status text;
  v_winner uuid;
  v_forfeit_winner uuid;
  v_a_outcome text;
  v_b_outcome text;
  v_a_delta integer := 0;
  v_b_delta integer := 0;
  v_a_profile public.ranked_profiles%rowtype;
  v_b_profile public.ranked_profiles%rowtype;
  v_current_change integer := 0;
  v_current_after integer := null;
  v_matched_by_session boolean := false;
  v_current_is_player_a boolean := false;
  v_apply_rp boolean := false;
begin
  select *
    into v_result
  from public.game_results gr
  where gr.result_id = p_result_id
    and gr.user_id = p_user_id
    and gr.mode = 'ranked_duel'
    and gr.completed = true
  limit 1;

  if v_result.result_id is null then
    raise exception 'Completed Ranked Duel result not found.' using errcode = '22023';
  end if;

  select *
    into v_duel
  from public.ranked_duels rd
  where p_session_id is not null
    and (
      (rd.player_a_session_id = p_session_id and rd.player_a_id = p_user_id)
      or (rd.player_b_session_id = p_session_id and rd.player_b_id = p_user_id)
    )
  order by rd.created_at desc
  limit 1
  for update;

  v_matched_by_session := v_duel.ranked_duel_id is not null;

  if v_duel.ranked_duel_id is null then
    select *
      into v_duel
    from public.ranked_duels rd
    where rd.puzzle_id = v_result.puzzle_id
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed', 'completed')
      and (
        rd.player_a_id = p_user_id
        or rd.player_b_id = p_user_id
      )
    order by
      case
        when rd.player_a_session_id = v_result.session_id or rd.player_b_session_id = v_result.session_id then 0
        else 1
      end,
      rd.created_at desc
    limit 1
    for update;
  end if;

  if v_duel.ranked_duel_id is null then
    raise exception 'Ranked Duel not found for result.' using errcode = '22023';
  end if;

  v_current_is_player_a := p_user_id = v_duel.player_a_id;
  if not v_current_is_player_a and p_user_id <> v_duel.player_b_id then
    raise exception 'Result user is not part of this Ranked Duel.' using errcode = '42501';
  end if;

  if v_current_is_player_a then
    if v_duel.player_a_result_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.result_id = v_duel.player_a_result_id
      limit 1;
    end if;

    if v_side_result.result_id is null and v_duel.player_a_session_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.user_id = v_duel.player_a_id
        and gr.session_id = v_duel.player_a_session_id
        and gr.mode = 'ranked_duel'
        and gr.completed = true
      order by gr.completed_at asc nulls last, gr.result_id asc
      limit 1;
    end if;

    if v_side_result.result_id is null
      and (v_duel.player_a_session_id is null or v_duel.player_a_session_id = v_result.session_id or v_matched_by_session) then
      v_side_result := v_result;
    end if;

    if v_side_result.result_id is null then
      raise exception 'Ranked Duel player A session mismatch.' using errcode = '22023';
    end if;

    v_duel.player_a_session_id := coalesce(v_duel.player_a_session_id, v_side_result.session_id, p_session_id);
    v_duel.player_a_result_id := v_side_result.result_id;
  else
    if v_duel.player_b_result_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.result_id = v_duel.player_b_result_id
      limit 1;
    end if;

    if v_side_result.result_id is null and v_duel.player_b_session_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.user_id = v_duel.player_b_id
        and gr.session_id = v_duel.player_b_session_id
        and gr.mode = 'ranked_duel'
        and gr.completed = true
      order by gr.completed_at asc nulls last, gr.result_id asc
      limit 1;
    end if;

    if v_side_result.result_id is null
      and (v_duel.player_b_session_id is null or v_duel.player_b_session_id = v_result.session_id or v_matched_by_session) then
      v_side_result := v_result;
    end if;

    if v_side_result.result_id is null then
      raise exception 'Ranked Duel player B session mismatch.' using errcode = '22023';
    end if;

    v_duel.player_b_session_id := coalesce(v_duel.player_b_session_id, v_side_result.session_id, p_session_id);
    v_duel.player_b_result_id := v_side_result.result_id;
  end if;

  if v_duel.player_a_result_id is not null then
    select * into v_a_result from public.game_results gr where gr.result_id = v_duel.player_a_result_id limit 1;
  end if;
  if v_duel.player_b_result_id is not null then
    select * into v_b_result from public.game_results gr where gr.result_id = v_duel.player_b_result_id limit 1;
  end if;

  v_forfeit_winner := case
    when v_a_result.result_id is not null and v_b_result.result_id is null and coalesce(v_a_result.won, true) = false then v_duel.player_b_id
    when v_b_result.result_id is not null and v_a_result.result_id is null and coalesce(v_b_result.won, true) = false then v_duel.player_a_id
    else null::uuid
  end;

  v_next_status := case
    when v_forfeit_winner is not null then 'completed'
    when v_duel.player_a_result_id is not null and v_duel.player_b_result_id is not null then 'completed'
    when v_duel.player_a_result_id is not null then 'player_a_completed'
    when v_duel.player_b_result_id is not null then 'player_b_completed'
    when v_duel.player_b_id is not null then 'matched'
    else 'waiting_for_opponent'
  end;

  v_winner := case
    when v_forfeit_winner is not null then v_forfeit_winner
    when v_next_status = 'completed' then public.ranked_result_winner(
      v_duel.player_a_id,
      v_duel.player_b_id,
      coalesce(v_a_result.won, false),
      coalesce(v_b_result.won, false),
      coalesce(v_a_result.final_score, 0),
      coalesce(v_b_result.final_score, 0),
      coalesce(v_a_result.elapsed_seconds, 999999),
      coalesce(v_b_result.elapsed_seconds, 999999),
      v_a_result.completed_at,
      v_b_result.completed_at
    )
    else v_duel.winner_user_id
  end;

  if v_forfeit_winner = v_duel.player_a_id and v_duel.player_b_session_id is not null then
    update public.puzzle_sessions
    set status = 'abandoned',
        updated_at = now()
    where session_id = v_duel.player_b_session_id
      and status = 'in_progress';
  elsif v_forfeit_winner = v_duel.player_b_id and v_duel.player_a_session_id is not null then
    update public.puzzle_sessions
    set status = 'abandoned',
        updated_at = now()
    where session_id = v_duel.player_a_session_id
      and status = 'in_progress';
  end if;

  v_apply_rp := v_next_status = 'completed'
    and (
      v_duel.status <> 'completed'
      or v_duel.player_a_rp_change is null
      or v_duel.player_b_rp_change is null
      or v_duel.player_a_rp_after is null
      or v_duel.player_b_rp_after is null
    );

  if v_apply_rp then
    v_a_outcome := case when v_winner is null then 'draw' when v_winner = v_duel.player_a_id then 'win' else 'loss' end;
    v_b_outcome := case when v_winner is null then 'draw' when v_winner = v_duel.player_b_id then 'win' else 'loss' end;
    v_a_delta := public.ranked_rp_delta(coalesce(v_duel.player_a_rp_before, 0), coalesce(v_duel.player_b_rp_before, 0), v_a_outcome);
    v_b_delta := public.ranked_rp_delta(coalesce(v_duel.player_b_rp_before, 0), coalesce(v_duel.player_a_rp_before, 0), v_b_outcome);

    v_a_profile := public.apply_ranked_profile_delta(v_duel.player_a_id, v_duel.season_id, v_a_delta, v_a_outcome);
    v_b_profile := public.apply_ranked_profile_delta(v_duel.player_b_id, v_duel.season_id, v_b_delta, v_b_outcome);
  else
    select * into v_a_profile from public.ensure_ranked_profile(v_duel.player_a_id, v_duel.season_id);
    if v_duel.player_b_id is not null then
      select * into v_b_profile from public.ensure_ranked_profile(v_duel.player_b_id, v_duel.season_id);
    end if;
    v_a_delta := coalesce(v_duel.player_a_rp_change, 0);
    v_b_delta := coalesce(v_duel.player_b_rp_change, 0);
  end if;

  update public.ranked_duels rd
  set player_a_session_id = v_duel.player_a_session_id,
      player_b_session_id = v_duel.player_b_session_id,
      player_a_result_id = v_duel.player_a_result_id,
      player_b_result_id = v_duel.player_b_result_id,
      status = v_next_status,
      winner_user_id = v_winner,
      player_a_rp_change = case when v_next_status = 'completed' then coalesce(rd.player_a_rp_change, v_a_delta) else rd.player_a_rp_change end,
      player_b_rp_change = case when v_next_status = 'completed' then coalesce(rd.player_b_rp_change, v_b_delta) else rd.player_b_rp_change end,
      player_a_rp_after = case when v_next_status = 'completed' then coalesce(rd.player_a_rp_after, v_a_profile.rp) else rd.player_a_rp_after end,
      player_b_rp_after = case when v_next_status = 'completed' then coalesce(rd.player_b_rp_after, v_b_profile.rp) else rd.player_b_rp_after end,
      completed_at = case when v_next_status = 'completed' then coalesce(rd.completed_at, greatest(v_a_result.completed_at, v_b_result.completed_at), now()) else rd.completed_at end,
      updated_at = now()
  where rd.ranked_duel_id = v_duel.ranked_duel_id
  returning * into v_duel;

  if p_user_id = v_duel.player_a_id then
    v_current_change := coalesce(v_duel.player_a_rp_change, v_a_delta, 0);
    v_current_after := coalesce(v_duel.player_a_rp_after, v_a_profile.rp);
  else
    v_current_change := coalesce(v_duel.player_b_rp_change, v_b_delta, 0);
    v_current_after := coalesce(v_duel.player_b_rp_after, v_b_profile.rp);
  end if;

  return query
  select v_duel.ranked_duel_id, v_duel.status, v_duel.winner_user_id, v_current_change, v_current_after;
end;
$$;

create or replace function public.clear_stale_ranked_duel(
  p_ranked_duel_id uuid default null,
  p_session_id uuid default null,
  p_reason text default 'restore_failed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duel public.ranked_duels%rowtype;
  v_next_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select *
    into v_duel
  from public.ranked_duels rd
  where (p_ranked_duel_id is null or rd.ranked_duel_id = p_ranked_duel_id)
    and (p_session_id is null or rd.player_a_session_id = p_session_id or rd.player_b_session_id = p_session_id)
    and (rd.player_a_id = v_user_id or rd.player_b_id = v_user_id)
    and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
  order by rd.updated_at desc
  limit 1
  for update;

  if v_duel.ranked_duel_id is null then
    return jsonb_build_object(
      'cleared', false,
      'reason', 'not_found'
    );
  end if;

  v_next_status := case
    when v_duel.status = 'waiting_for_opponent' then 'cancelled'
    else 'expired'
  end;

  update public.ranked_duels rd
  set status = v_next_status,
      updated_at = now()
  where rd.ranked_duel_id = v_duel.ranked_duel_id
  returning * into v_duel;

  update public.puzzle_sessions
  set status = 'abandoned',
      updated_at = now()
  where session_id in (v_duel.player_a_session_id, v_duel.player_b_session_id)
    and status = 'in_progress';

  return jsonb_build_object(
    'cleared', true,
    'reason', coalesce(nullif(trim(p_reason), ''), 'restore_failed'),
    'ranked_duel_id', v_duel.ranked_duel_id,
    'status', v_duel.status
  );
end;
$$;

grant execute on function public.submit_ranked_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.submit_ranked_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.link_ranked_duel_result(uuid, uuid, text) to authenticated;
grant execute on function public.clear_stale_ranked_duel(uuid, uuid, text) to authenticated;
