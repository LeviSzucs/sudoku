-- Harden ranked result submission so RP-impacting rows do not trust client-side
-- timing and penalty inputs. Classic and Daily keep the existing casual flow.

create or replace function public.session_move_type_count(
  p_move_history jsonb,
  p_move_type text
)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_move_history, '[]'::jsonb)) as entry
  where jsonb_typeof(entry) = 'object'
    and entry->>'type' = p_move_type;
$$;

create or replace function public.session_wrong_entry_count(
  p_move_history jsonb
)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_move_history, '[]'::jsonb)) as entry
  where jsonb_typeof(entry) = 'object'
    and entry->>'type' = 'entry'
    and coalesce(entry->>'accepted', 'true') = 'true'
    and coalesce(entry->>'was_correct', 'true') = 'false';
$$;

do $$
begin
  if to_regprocedure('public.submit_puzzle_result(uuid,jsonb,integer,integer,integer,integer,timestamptz)') is not null
     and to_regprocedure('public.submit_puzzle_result_core(uuid,jsonb,integer,integer,integer,integer,timestamptz)') is null then
    alter function public.submit_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz)
      rename to submit_puzzle_result_core;
  end if;

  if to_regprocedure('public.submit_failed_puzzle_result(uuid,integer,integer,integer,integer,timestamptz)') is not null
     and to_regprocedure('public.submit_failed_puzzle_result_core(uuid,integer,integer,integer,integer,timestamptz)') is null then
    alter function public.submit_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz)
      rename to submit_failed_puzzle_result_core;
  end if;
end $$;

revoke all on function public.submit_puzzle_result_core(uuid, jsonb, integer, integer, integer, integer, timestamptz) from anon, authenticated;
revoke all on function public.submit_failed_puzzle_result_core(uuid, integer, integer, integer, integer, timestamptz) from anon, authenticated;

create or replace function public.submit_puzzle_result(
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
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
    into v_session
  from public.puzzle_sessions
  where session_id = p_session_id
    and user_id = v_user_id
  limit 1;

  if v_session.session_id is null then
    raise exception 'Puzzle session not found or not owned by user' using errcode = '42501';
  end if;

  if v_session.mode in ('ranked', 'ranked_duel') then
    raise exception 'Ranked results must use the secure ranked submission path.' using errcode = '42501';
  end if;

  return public.submit_puzzle_result_core(
    p_session_id,
    p_final_board,
    p_elapsed_seconds,
    p_mistakes,
    p_hints_used,
    p_undo_count,
    p_completed_at
  );
end;
$$;

create or replace function public.submit_failed_puzzle_result(
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
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
    into v_session
  from public.puzzle_sessions
  where session_id = p_session_id
    and user_id = v_user_id
  limit 1;

  if v_session.session_id is null then
    raise exception 'Puzzle session not found or not owned by user' using errcode = '42501';
  end if;

  if v_session.mode in ('ranked', 'ranked_duel') then
    raise exception 'Ranked failed results must use the secure ranked submission path.' using errcode = '42501';
  end if;

  return public.submit_failed_puzzle_result_core(
    p_session_id,
    p_elapsed_seconds,
    p_mistakes,
    p_hints_used,
    p_undo_count,
    p_completed_at
  );
end;
$$;

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

  v_server_elapsed_seconds := greatest(
    1,
    ceil(extract(epoch from (v_completed_at - v_session.created_at)))::integer
  );

  v_wrong_entries := public.session_wrong_entry_count(v_session.move_history);
  v_hint_moves := public.session_move_type_count(v_session.move_history, 'hint');
  v_undo_moves := public.session_move_type_count(v_session.move_history, 'undo');

  v_effective_elapsed_seconds := greatest(v_server_elapsed_seconds, coalesce(v_session.elapsed_seconds, 0), coalesce(p_elapsed_seconds, 0));
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

  v_server_elapsed_seconds := greatest(
    1,
    ceil(extract(epoch from (v_completed_at - v_session.created_at)))::integer
  );

  v_wrong_entries := public.session_wrong_entry_count(v_session.move_history);
  v_hint_moves := public.session_move_type_count(v_session.move_history, 'hint');
  v_undo_moves := public.session_move_type_count(v_session.move_history, 'undo');

  v_effective_elapsed_seconds := greatest(v_server_elapsed_seconds, coalesce(v_session.elapsed_seconds, 0), coalesce(p_elapsed_seconds, 0));
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

grant execute on function public.submit_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.submit_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.submit_ranked_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.submit_ranked_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz) to authenticated;

drop policy if exists "game_results_insert_own" on public.game_results;
create policy "game_results_insert_own"
  on public.game_results
  for insert
  with check (
    auth.uid() = user_id
    and mode not in ('ranked', 'ranked_duel')
    and coalesce(eligible_for_ranked, false) = false
  );

drop policy if exists "game_results_update_own" on public.game_results;
create policy "game_results_update_own"
  on public.game_results
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and mode not in ('ranked', 'ranked_duel')
    and coalesce(eligible_for_ranked, false) = false
  );
