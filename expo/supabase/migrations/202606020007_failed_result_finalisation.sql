-- Finalise failed official attempts without replacing submit_puzzle_result.
-- Daily and Friend Challenge failures become one recorded attempt so they
-- cannot be replayed after the mistake limit is reached.

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
  v_puzzle public.puzzles%rowtype;
  v_existing public.game_results%rowtype;
  v_result public.game_results%rowtype;
  v_result_id text;
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_stats jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_session_id is null then
    raise exception 'Missing session_id' using errcode = '22023';
  end if;

  if coalesce(p_elapsed_seconds, -1) < 0
    or coalesce(p_mistakes, -1) < 0
    or coalesce(p_hints_used, -1) < 0
    or coalesce(p_undo_count, -1) < 0 then
    raise exception 'Elapsed seconds, mistakes, hints, and undo counts must be non-negative' using errcode = '22023';
  end if;

  select *
    into v_session
  from public.puzzle_sessions
  where session_id = p_session_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Puzzle session not found or not owned by user' using errcode = '42501';
  end if;

  select *
    into v_existing
  from public.game_results
  where session_id = p_session_id
    and user_id = v_user_id
  limit 1;

  if found then
    update public.puzzle_sessions
    set status = case when status = 'in_progress' then 'failed' else status end,
        elapsed_seconds = greatest(coalesce(p_elapsed_seconds, 0), elapsed_seconds),
        mistakes = greatest(coalesce(p_mistakes, 0), mistakes),
        hints_used = greatest(coalesce(p_hints_used, 0), hints_used),
        undo_count = greatest(coalesce(p_undo_count, 0), undo_count),
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id;

    if v_existing.mode = 'friend_challenge' then
      perform public.complete_friend_challenge_result(p_session_id, v_existing.result_id);
    end if;

    return jsonb_build_object(
      'result_id', v_existing.result_id,
      'session_id', v_existing.session_id,
      'puzzle_id', v_existing.puzzle_id,
      'mode', v_existing.mode,
      'difficulty', v_existing.difficulty,
      'elapsed_seconds', v_existing.elapsed_seconds,
      'mistakes', v_existing.mistakes,
      'hints_used', v_existing.hints_used,
      'undo_count', v_existing.undo_count,
      'final_score', v_existing.final_score,
      'xp_earned', v_existing.xp_earned,
      'leaderboard_eligible', v_existing.eligible_for_leaderboard,
      'ranked_eligible', v_existing.eligible_for_ranked,
      'completed_at', v_existing.completed_at,
      'badges_unlocked', '[]'::jsonb,
      'updated_profile_stats', (
        select to_jsonb(ps)
        from public.player_stats ps
        where ps.user_id = v_user_id
      ),
      'already_finalized', true,
      'won', v_existing.won
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Puzzle session is not in progress' using errcode = '22023';
  end if;

  if v_session.mode not in ('daily', 'friend_challenge') then
    raise exception 'Failed official finalisation is only supported for Daily and Friend Challenge attempts' using errcode = '22023';
  end if;

  if v_session.puzzle_id is null then
    raise exception 'Puzzle session has no puzzle_id' using errcode = '22023';
  end if;

  select *
    into v_puzzle
  from public.puzzles
  where puzzle_id = v_session.puzzle_id;

  if not found then
    raise exception 'Puzzle not found' using errcode = '22023';
  end if;

  insert into public.player_stats (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  v_result_id := v_user_id::text || '_' || p_session_id::text || '_failed';

  insert into public.game_results (
    result_id,
    user_id,
    session_id,
    puzzle_id,
    mode,
    difficulty,
    completed,
    won,
    elapsed_seconds,
    mistakes,
    hints_used,
    undo_count,
    final_score,
    xp_earned,
    rp_change,
    eligible_for_leaderboard,
    eligible_for_ranked,
    completed_at
  )
  values (
    v_result_id,
    v_user_id,
    p_session_id,
    v_session.puzzle_id,
    v_session.mode,
    v_puzzle.difficulty,
    true,
    false,
    greatest(coalesce(p_elapsed_seconds, 0), 0),
    greatest(coalesce(p_mistakes, 0), 0),
    greatest(coalesce(p_hints_used, 0), 0),
    greatest(coalesce(p_undo_count, 0), 0),
    0,
    0,
    0,
    false,
    false,
    v_completed_at
  )
  on conflict do nothing
  returning * into v_result;

  if v_result.result_id is null then
    select *
      into v_existing
    from public.game_results
    where user_id = v_user_id
      and (
        session_id = p_session_id
        or (
          v_session.mode = 'daily'
          and mode = 'daily'
          and puzzle_id = v_session.puzzle_id
          and completed = true
        )
      )
    order by completed_at asc nulls last, final_score desc, result_id asc
    limit 1;

    if v_existing.result_id is null then
      raise exception 'Duplicate failed result could not be reused' using errcode = '23505';
    end if;

    update public.puzzle_sessions
    set status = 'failed',
        elapsed_seconds = greatest(coalesce(p_elapsed_seconds, 0), elapsed_seconds),
        mistakes = greatest(coalesce(p_mistakes, 0), mistakes),
        hints_used = greatest(coalesce(p_hints_used, 0), hints_used),
        undo_count = greatest(coalesce(p_undo_count, 0), undo_count),
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id;

    if v_existing.mode = 'friend_challenge' then
      perform public.complete_friend_challenge_result(p_session_id, v_existing.result_id);
    end if;

    return jsonb_build_object(
      'result_id', v_existing.result_id,
      'session_id', v_existing.session_id,
      'puzzle_id', v_existing.puzzle_id,
      'mode', v_existing.mode,
      'difficulty', v_existing.difficulty,
      'elapsed_seconds', v_existing.elapsed_seconds,
      'mistakes', v_existing.mistakes,
      'hints_used', v_existing.hints_used,
      'undo_count', v_existing.undo_count,
      'final_score', v_existing.final_score,
      'xp_earned', v_existing.xp_earned,
      'leaderboard_eligible', v_existing.eligible_for_leaderboard,
      'ranked_eligible', v_existing.eligible_for_ranked,
      'completed_at', v_existing.completed_at,
      'badges_unlocked', '[]'::jsonb,
      'updated_profile_stats', (
        select to_jsonb(ps)
        from public.player_stats ps
        where ps.user_id = v_user_id
      ),
      'already_finalized', true,
      'won', v_existing.won
    );
  end if;

  update public.puzzle_sessions
  set status = 'failed',
      elapsed_seconds = greatest(coalesce(p_elapsed_seconds, 0), elapsed_seconds),
      mistakes = greatest(coalesce(p_mistakes, 0), mistakes),
      hints_used = greatest(coalesce(p_hints_used, 0), hints_used),
      undo_count = greatest(coalesce(p_undo_count, 0), undo_count),
      updated_at = now()
  where session_id = p_session_id
    and user_id = v_user_id;

  if v_result.mode = 'friend_challenge' then
    perform public.complete_friend_challenge_result(p_session_id, v_result.result_id);
  end if;

  select to_jsonb(ps)
    into v_stats
  from public.player_stats ps
  where ps.user_id = v_user_id;

  return jsonb_build_object(
    'result_id', v_result.result_id,
    'session_id', v_result.session_id,
    'puzzle_id', v_result.puzzle_id,
    'mode', v_result.mode,
    'difficulty', v_result.difficulty,
    'elapsed_seconds', v_result.elapsed_seconds,
    'mistakes', v_result.mistakes,
    'hints_used', v_result.hints_used,
    'undo_count', v_result.undo_count,
    'final_score', v_result.final_score,
    'xp_earned', v_result.xp_earned,
    'leaderboard_eligible', v_result.eligible_for_leaderboard,
    'ranked_eligible', v_result.eligible_for_ranked,
    'completed_at', v_result.completed_at,
    'badges_unlocked', '[]'::jsonb,
    'updated_profile_stats', v_stats,
    'already_finalized', false,
    'won', v_result.won
  );
end;
$$;

grant execute on function public.submit_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz) to authenticated;
