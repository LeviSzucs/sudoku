-- Positive Sudoku scoring model.
-- Official scores remain backend-owned. The client submits observable result
-- data, while the server replays saved move_history for placement, streak,
-- row/column/box, completion, speed, and penalty scoring.

create or replace function public.calculate_sudoku_score(
  p_difficulty text,
  p_givens text,
  p_solution text,
  p_move_history jsonb,
  p_elapsed_seconds integer,
  p_mistakes integer,
  p_hints_used integer,
  p_undo_count integer,
  p_completed boolean default true,
  p_failed boolean default false
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_board text[] := array[]::text[];
  v_move jsonb;
  v_type text;
  v_row integer;
  v_col integer;
  v_idx integer;
  v_value integer;
  v_value_text text;
  v_correct boolean;
  v_streak integer := 0;
  v_subtotal numeric := 0;
  v_placement_points integer := 0;
  v_streak_bonus integer := 0;
  v_unit_bonus integer := 0;
  v_completion_bonus integer := 0;
  v_speed_bonus integer := 0;
  v_slow_penalty integer := 0;
  v_mistake_penalty integer := 0;
  v_hint_penalty integer := 0;
  v_undo_penalty integer := 0;
  v_final_score integer := 0;
  v_starting_score integer := case p_difficulty
    when 'Easy' then 500
    when 'Medium' then 800
    when 'Hard' then 1200
    when 'Expert' then 1600
    when 'Master' then 2200
    else 800
  end;
  v_placement_value integer := case p_difficulty
    when 'Easy' then 25
    when 'Medium' then 40
    when 'Hard' then 60
    when 'Expert' then 85
    when 'Master' then 115
    else 40
  end;
  v_completion_value integer := case p_difficulty
    when 'Easy' then 600
    when 'Medium' then 1000
    when 'Hard' then 1500
    when 'Expert' then 2200
    when 'Master' then 3000
    else 1000
  end;
  v_target_seconds integer := case p_difficulty
    when 'Easy' then 300
    when 'Medium' then 540
    when 'Hard' then 900
    when 'Expert' then 1440
    when 'Master' then 2100
    else 540
  end;
  v_completed_rows boolean[] := array_fill(false, array[9]);
  v_completed_cols boolean[] := array_fill(false, array[9]);
  v_completed_boxes boolean[] := array_fill(false, array[9]);
  v_scored_cells boolean[] := array_fill(false, array[81]);
  v_is_complete boolean;
  v_box integer;
  v_empty_cells integer;
  v_candidate_count integer;
  v_candidate integer;
  v_candidate_valid boolean;
  v_candidate_multiplier numeric;
  v_progress_multiplier numeric;
  v_streak_multiplier numeric;
  v_base_without_streak integer;
  v_gain integer;
  v_penalty integer;
  v_replayed_mistakes integer := 0;
  v_replayed_hints integer := 0;
  v_speed_multiplier numeric := 1;
  v_speed_adjusted integer;
  r integer;
  c integer;
begin
  if p_failed or coalesce(p_mistakes, 0) >= 3 then
    return jsonb_build_object(
      'baseScore', 0,
      'placementPoints', 0,
      'streakBonus', 0,
      'unitBonus', 0,
      'completionBonus', 0,
      'speedBonus', 0,
      'slowPenalty', 0,
      'speedMultiplier', 1,
      'mistakePenalty', 0,
      'hintPenalty', 0,
      'undoPenalty', 0,
      'finalScore', 0
    );
  end if;

  if length(coalesce(p_givens, '')) <> 81 or length(coalesce(p_solution, '')) <> 81 then
    raise exception 'Scoring requires 81-character givens and solution' using errcode = '22023';
  end if;

  v_subtotal := v_starting_score;

  for v_idx in 1..81 loop
    v_value_text := substr(p_givens, v_idx, 1);
    if v_value_text ~ '^[1-9]$' then
      v_board := array_append(v_board, v_value_text);
    else
      v_board := array_append(v_board, '0');
    end if;
  end loop;

  for v_move in
    select value from jsonb_array_elements(coalesce(p_move_history, '[]'::jsonb))
  loop
    v_type := coalesce(v_move->>'type', '');
    v_row := nullif(v_move->>'row', '')::integer;
    v_col := nullif(v_move->>'column', '')::integer;

    if v_row is null or v_col is null or v_row < 0 or v_row > 8 or v_col < 0 or v_col > 8 then
      continue;
    end if;

    v_idx := (v_row * 9) + v_col + 1;
    v_value_text := v_move->>'new_value';
    v_value := case when v_value_text ~ '^[1-9]$' then v_value_text::integer else null end;

    if v_type = 'hint' then
      v_penalty := round(v_subtotal * 0.15)::integer;
      v_subtotal := greatest(0, v_subtotal - v_penalty);
      v_hint_penalty := v_hint_penalty + v_penalty;
      v_replayed_hints := v_replayed_hints + 1;
      if v_value is not null and v_value::text = substr(p_solution, v_idx, 1) then
        v_board[v_idx] := v_value::text;
      end if;
      v_streak := 0;
      continue;
    end if;

    if v_type = 'undo' then
      v_board[v_idx] := coalesce(v_value::text, '0');
      continue;
    end if;

    if v_type = 'erase' then
      v_board[v_idx] := '0';
      continue;
    end if;

    if v_type <> 'entry' then
      continue;
    end if;

    v_correct := coalesce((v_move->>'was_correct')::boolean, false)
      and v_value is not null
      and v_value::text = substr(p_solution, v_idx, 1);

    if not v_correct then
      if v_value is not null then
        v_board[v_idx] := v_value::text;
      end if;
      v_replayed_mistakes := v_replayed_mistakes + 1;
      v_penalty := round(v_subtotal * case when v_replayed_mistakes = 1 then 0.08 else 0.12 end)::integer;
      v_subtotal := greatest(0, v_subtotal - v_penalty);
      v_mistake_penalty := v_mistake_penalty + v_penalty;
      v_streak := 0;
      continue;
    end if;

    v_empty_cells := 0;
    for r in 1..81 loop
      if v_board[r] !~ '^[1-9]$' then
        v_empty_cells := v_empty_cells + 1;
      end if;
    end loop;

    v_candidate_count := 0;
    for v_candidate in 1..9 loop
      v_candidate_valid := true;
      for c in 0..8 loop
        if c <> v_col and v_board[(v_row * 9) + c + 1] = v_candidate::text then
          v_candidate_valid := false;
        end if;
      end loop;
      for r in 0..8 loop
        if r <> v_row and v_board[(r * 9) + v_col + 1] = v_candidate::text then
          v_candidate_valid := false;
        end if;
      end loop;
      for r in (floor(v_row / 3)::integer * 3)..(floor(v_row / 3)::integer * 3 + 2) loop
        for c in (floor(v_col / 3)::integer * 3)..(floor(v_col / 3)::integer * 3 + 2) loop
          if (r <> v_row or c <> v_col) and v_board[(r * 9) + c + 1] = v_candidate::text then
            v_candidate_valid := false;
          end if;
        end loop;
      end loop;
      if v_candidate_valid then
        v_candidate_count := v_candidate_count + 1;
      end if;
    end loop;
    v_candidate_count := greatest(1, v_candidate_count);

    if v_board[v_idx] = substr(p_solution, v_idx, 1) then
      v_board[v_idx] := v_value::text;
      continue;
    end if;

    v_board[v_idx] := v_value::text;
    if v_scored_cells[v_idx] then
      continue;
    end if;
    v_scored_cells[v_idx] := true;
    v_streak := v_streak + 1;

    v_candidate_multiplier := case
      when v_candidate_count <= 1 then 0.75
      when v_candidate_count = 2 then 1.00
      when v_candidate_count = 3 then 1.15
      else 1.30
    end;
    v_progress_multiplier := case
      when (v_empty_cells::numeric / 81) >= 0.70 then 1.20
      when (v_empty_cells::numeric / 81) >= 0.40 then 1.10
      when (v_empty_cells::numeric / 81) >= 0.15 then 1.00
      else 0.85
    end;
    v_streak_multiplier := case
      when v_streak >= 20 then 1.35
      when v_streak >= 10 then 1.22
      when v_streak >= 5 then 1.12
      when v_streak >= 3 then 1.05
      else 1.00
    end;

    v_base_without_streak := greatest(1, round(v_placement_value * v_candidate_multiplier * v_progress_multiplier)::integer);
    v_gain := greatest(1, round(v_placement_value * v_candidate_multiplier * v_progress_multiplier * v_streak_multiplier)::integer);
    v_placement_points := v_placement_points + v_gain;
    v_streak_bonus := v_streak_bonus + greatest(0, v_gain - v_base_without_streak);
    v_subtotal := v_subtotal + v_gain;

    if not v_completed_rows[v_row + 1] then
      v_is_complete := true;
      for c in 0..8 loop
        if v_board[(v_row * 9) + c + 1] <> substr(p_solution, (v_row * 9) + c + 1, 1) then
          v_is_complete := false;
          exit;
        end if;
      end loop;
      if v_is_complete then
        v_completed_rows[v_row + 1] := true;
        v_unit_bonus := v_unit_bonus + 150;
        v_subtotal := v_subtotal + 150;
      end if;
    end if;

    if not v_completed_cols[v_col + 1] then
      v_is_complete := true;
      for r in 0..8 loop
        if v_board[(r * 9) + v_col + 1] <> substr(p_solution, (r * 9) + v_col + 1, 1) then
          v_is_complete := false;
          exit;
        end if;
      end loop;
      if v_is_complete then
        v_completed_cols[v_col + 1] := true;
        v_unit_bonus := v_unit_bonus + 150;
        v_subtotal := v_subtotal + 150;
      end if;
    end if;

    v_box := (floor(v_row / 3)::integer * 3) + floor(v_col / 3)::integer;
    if not v_completed_boxes[v_box + 1] then
      v_is_complete := true;
      for r in (floor(v_row / 3)::integer * 3)..(floor(v_row / 3)::integer * 3 + 2) loop
        for c in (floor(v_col / 3)::integer * 3)..(floor(v_col / 3)::integer * 3 + 2) loop
          if v_board[(r * 9) + c + 1] <> substr(p_solution, (r * 9) + c + 1, 1) then
            v_is_complete := false;
            exit;
          end if;
        end loop;
        exit when not v_is_complete;
      end loop;
      if v_is_complete then
        v_completed_boxes[v_box + 1] := true;
        v_unit_bonus := v_unit_bonus + 200;
        v_subtotal := v_subtotal + 200;
      end if;
    end if;
  end loop;

  for r in v_replayed_mistakes..(greatest(coalesce(p_mistakes, 0), 0) - 1) loop
    v_penalty := round(v_subtotal * case when r = 0 then 0.08 else 0.12 end)::integer;
    v_subtotal := greatest(0, v_subtotal - v_penalty);
    v_mistake_penalty := v_mistake_penalty + v_penalty;
  end loop;

  for r in v_replayed_hints..(greatest(coalesce(p_hints_used, 0), 0) - 1) loop
    v_penalty := round(v_subtotal * 0.15)::integer;
    v_subtotal := greatest(0, v_subtotal - v_penalty);
    v_hint_penalty := v_hint_penalty + v_penalty;
  end loop;

  if coalesce(p_undo_count, 0) > 3 then
    for r in 4..coalesce(p_undo_count, 0) loop
      v_penalty := round(v_subtotal * 0.02)::integer;
      v_subtotal := greatest(0, v_subtotal - v_penalty);
      v_undo_penalty := v_undo_penalty + v_penalty;
    end loop;
  end if;

  if p_completed then
    v_completion_bonus := v_completion_value;
    v_subtotal := v_subtotal + v_completion_bonus;
    v_speed_multiplier := case
      when greatest(coalesce(p_elapsed_seconds, 1), 1) <= v_target_seconds then
        1 + ((v_target_seconds - greatest(coalesce(p_elapsed_seconds, 1), 1))::numeric / v_target_seconds) * 0.35
      else
        1 - least((greatest(coalesce(p_elapsed_seconds, 1), 1) - v_target_seconds)::numeric / v_target_seconds, 1) * 0.25
    end;
    v_speed_multiplier := greatest(0.75, least(1.35, v_speed_multiplier));
  end if;

  v_speed_adjusted := greatest(0, round(v_subtotal * v_speed_multiplier)::integer);
  if v_speed_adjusted >= round(v_subtotal)::integer then
    v_speed_bonus := v_speed_adjusted - round(v_subtotal)::integer;
  else
    v_slow_penalty := round(v_subtotal)::integer - v_speed_adjusted;
  end if;
  v_final_score := v_speed_adjusted;

  return jsonb_build_object(
    'baseScore', v_starting_score,
    'placementPoints', v_placement_points,
    'streakBonus', v_streak_bonus,
    'unitBonus', v_unit_bonus,
    'completionBonus', v_completion_bonus,
    'speedBonus', v_speed_bonus,
    'slowPenalty', v_slow_penalty,
    'speedMultiplier', round(v_speed_multiplier, 4),
    'mistakePenalty', v_mistake_penalty,
    'hintPenalty', v_hint_penalty,
    'undoPenalty', v_undo_penalty,
    'finalScore', v_final_score
  );
end;
$$;

grant execute on function public.calculate_sudoku_score(text, text, text, jsonb, integer, integer, integer, integer, boolean, boolean) to authenticated;

drop function if exists public.submit_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz);

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
  v_puzzle public.puzzles%rowtype;
  v_existing public.game_results%rowtype;
  v_result public.game_results%rowtype;
  v_result_id text;
  v_flat_board text := '';
  v_row jsonb;
  v_cell jsonb;
  v_cell_text text;
  v_row_index integer;
  v_cell_index integer;
  v_final_score integer;
  v_base_xp integer;
  v_target_seconds integer;
  v_completed_day date;
  v_last_completed_day date;
  v_previous_level integer;
  v_new_total_xp integer;
  v_new_level integer := 1;
  v_level_threshold integer := 0;
  v_level_needed integer;
  v_new_streak integer;
  v_streak_bonus integer := 0;
  v_leaderboard_eligible boolean;
  v_ranked_eligible boolean := false;
  v_was_flawless integer;
  v_unlocked_badges jsonb := '[]'::jsonb;
  v_stats jsonb;
  v_score_breakdown jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_session_id is null then
    raise exception 'Missing session_id' using errcode = '22023';
  end if;

  if p_elapsed_seconds is null or p_elapsed_seconds <= 0 then
    raise exception 'Invalid elapsed_seconds' using errcode = '22023';
  end if;

  if coalesce(p_mistakes, -1) < 0 or coalesce(p_hints_used, -1) < 0 or coalesce(p_undo_count, -1) < 0 then
    raise exception 'Mistakes, hints, and undo counts must be non-negative' using errcode = '22023';
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
    set status = 'completed',
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id
      and status = 'in_progress';

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
      'score_breakdown', null,
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
      'already_finalized', true
    );
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

  if v_session.mode = 'daily' then
    select *
      into v_existing
    from public.game_results
    where user_id = v_user_id
      and mode = 'daily'
      and puzzle_id = v_session.puzzle_id
      and completed = true
    order by completed_at asc nulls last, final_score desc, result_id asc
    limit 1;

    if found then
      update public.puzzle_sessions
      set status = 'completed',
          board_state = p_final_board,
          elapsed_seconds = p_elapsed_seconds,
          mistakes = p_mistakes,
          hints_used = p_hints_used,
          undo_count = p_undo_count,
          updated_at = now()
      where session_id = p_session_id
        and user_id = v_user_id;

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
        'score_breakdown', null,
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
        'already_finalized', true
      );
    end if;
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Puzzle session is not in progress' using errcode = '22023';
  end if;

  if jsonb_typeof(p_final_board) <> 'array' or jsonb_array_length(p_final_board) <> 9 then
    raise exception 'Final board must be a 9x9 array' using errcode = '22023';
  end if;

  for v_row_index in 0..8 loop
    v_row := p_final_board -> v_row_index;
    if jsonb_typeof(v_row) <> 'array' or jsonb_array_length(v_row) <> 9 then
      raise exception 'Final board row % must contain 9 cells', v_row_index + 1 using errcode = '22023';
    end if;

    for v_cell_index in 0..8 loop
      v_cell := v_row -> v_cell_index;
      v_cell_text := trim(both '"' from v_cell::text);
      if v_cell_text !~ '^[1-9]$' then
        raise exception 'Final board has invalid value at row %, col %', v_row_index + 1, v_cell_index + 1 using errcode = '22023';
      end if;
      v_flat_board := v_flat_board || v_cell_text;
    end loop;
  end loop;

  if v_flat_board <> v_puzzle.solution then
    raise exception 'Final board does not match puzzle solution' using errcode = '22023';
  end if;

  v_target_seconds := case v_puzzle.difficulty
    when 'Easy' then 300
    when 'Medium' then 540
    when 'Hard' then 900
    when 'Expert' then 1440
    when 'Master' then 2100
    else 999999
  end;

  v_base_xp := case v_puzzle.difficulty
    when 'Easy' then 40
    when 'Medium' then 70
    when 'Hard' then 110
    when 'Expert' then 160
    when 'Master' then 220
    else 0
  end;

  v_score_breakdown := public.calculate_sudoku_score(
    v_puzzle.difficulty,
    v_puzzle.givens,
    v_puzzle.solution,
    v_session.move_history,
    p_elapsed_seconds,
    p_mistakes,
    p_hints_used,
    p_undo_count,
    true,
    false
  );
  v_final_score := (v_score_breakdown->>'finalScore')::integer;

  v_base_xp := v_base_xp
    + floor(v_final_score::numeric / 120)::integer
    + case when p_mistakes = 0 and p_hints_used = 0 then 25 else 0 end
    + case when p_elapsed_seconds < v_target_seconds then 25 else 0 end
    + case when v_session.mode = 'daily' then 50 else 0 end;

  v_completed_day := coalesce(p_completed_at, now())::date;

  insert into public.player_stats (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select account_level
    into v_previous_level
  from public.player_stats
  where user_id = v_user_id
  for update;

  select max(completed_at::date)
    into v_last_completed_day
  from public.game_results
  where user_id = v_user_id;

  select current_streak
    into v_new_streak
  from public.player_stats
  where user_id = v_user_id;

  if v_last_completed_day = v_completed_day then
    v_new_streak := coalesce(v_new_streak, 0);
  elsif v_last_completed_day = v_completed_day - 1 then
    v_new_streak := coalesce(v_new_streak, 0) + 1;
    v_streak_bonus := 20;
  else
    v_new_streak := 1;
    v_streak_bonus := 20;
  end if;

  v_base_xp := v_base_xp + v_streak_bonus;
  v_leaderboard_eligible := v_session.mode in ('classic','daily','duel');
  v_was_flawless := case when p_mistakes = 0 then 1 else 0 end;
  v_result_id := v_user_id::text || '_' || p_session_id::text;

  select total_mastery_xp + v_base_xp
    into v_new_total_xp
  from public.player_stats
  where user_id = v_user_id;

  loop
    v_level_needed := (round((100 + v_new_level * 55 + power(v_new_level, 2) * 12) / 25.0) * 25)::integer;
    exit when v_new_total_xp < v_level_threshold + v_level_needed;
    v_level_threshold := v_level_threshold + v_level_needed;
    v_new_level := v_new_level + 1;
  end loop;

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
    null,
    p_elapsed_seconds,
    p_mistakes,
    p_hints_used,
    p_undo_count,
    v_final_score,
    v_base_xp,
    0,
    v_leaderboard_eligible,
    v_ranked_eligible,
    coalesce(p_completed_at, now())
  )
  on conflict do nothing
  returning * into v_result;

  if v_result.result_id is null then
    select *
      into v_existing
    from public.game_results
    where user_id = v_user_id
      and (
        result_id = v_result_id
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
      raise exception 'Duplicate result could not be reused' using errcode = '23505';
    end if;

    update public.puzzle_sessions
    set status = 'completed',
        board_state = p_final_board,
        elapsed_seconds = p_elapsed_seconds,
        mistakes = p_mistakes,
        hints_used = p_hints_used,
        undo_count = p_undo_count,
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id;

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
      'score_breakdown', null,
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
      'already_finalized', true
    );
  end if;

  update public.puzzle_sessions
  set status = 'completed',
      board_state = p_final_board,
      elapsed_seconds = p_elapsed_seconds,
      mistakes = p_mistakes,
      hints_used = p_hints_used,
      undo_count = p_undo_count,
      updated_at = now()
  where session_id = p_session_id
    and user_id = v_user_id;

  update public.player_stats
  set total_mastery_xp = total_mastery_xp + v_base_xp,
      account_level = v_new_level,
      current_streak = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      puzzles_completed = puzzles_completed + 1,
      flawless_puzzles = flawless_puzzles + v_was_flawless,
      total_mistakes = total_mistakes + p_mistakes,
      total_hints_used = total_hints_used + p_hints_used,
      total_undos_used = total_undos_used + p_undo_count,
      duels_played = duels_played + case when v_session.mode in ('duel','friend_challenge') then 1 else 0 end,
      best_easy_time = case when v_puzzle.difficulty = 'Easy' then least(coalesce(best_easy_time, p_elapsed_seconds), p_elapsed_seconds) else best_easy_time end,
      best_medium_time = case when v_puzzle.difficulty = 'Medium' then least(coalesce(best_medium_time, p_elapsed_seconds), p_elapsed_seconds) else best_medium_time end,
      best_hard_time = case when v_puzzle.difficulty = 'Hard' then least(coalesce(best_hard_time, p_elapsed_seconds), p_elapsed_seconds) else best_hard_time end,
      best_expert_time = case when v_puzzle.difficulty = 'Expert' then least(coalesce(best_expert_time, p_elapsed_seconds), p_elapsed_seconds) else best_expert_time end,
      best_master_time = case when v_puzzle.difficulty = 'Master' then least(coalesce(best_master_time, p_elapsed_seconds), p_elapsed_seconds) else best_master_time end,
      updated_at = now()
  where user_id = v_user_id;

  select to_jsonb(ps)
    into v_stats
  from public.player_stats ps
  where ps.user_id = v_user_id;

  insert into public.user_achievements (user_id, badge_id, unlocked, progress_current)
  select v_user_id, badge_id, false, 0
  from public.achievements
  on conflict (user_id, badge_id) do nothing;

  with stats as (
    select ps.*
    from public.player_stats ps
    where ps.user_id = v_user_id
  ),
  progress as (
    select ua.badge_id,
      least(a.progress_target, case ua.badge_id
        when 'first_grid' then stats.puzzles_completed
        when 'clean_start' then stats.flawless_puzzles
        when 'flawless' then stats.flawless_puzzles
        when 'no_help_needed' then case when exists (select 1 from public.game_results gr where gr.user_id = v_user_id and gr.hints_used = 0) then 1 else 0 end
        when 'streak_3' then stats.current_streak
        when 'streak_7' then stats.current_streak
        when 'streak_14' then stats.current_streak
        when 'streak_30' then stats.current_streak
        when 'quick_thinker' then case when coalesce(stats.best_easy_time, 999999) < 180 then 1 else 0 end
        when 'sharp_mind' then case when coalesce(stats.best_medium_time, 999999) < 300 then 1 else 0 end
        when 'fast_solver' then case when coalesce(stats.best_hard_time, 999999) < 480 then 1 else 0 end
        when 'speedrunner' then case when least(coalesce(stats.best_easy_time, 999999), coalesce(stats.best_medium_time, 999999), coalesce(stats.best_hard_time, 999999), coalesce(stats.best_expert_time, 999999), coalesce(stats.best_master_time, 999999)) < 120 then 1 else 0 end
        when 'easy_clear' then (select count(*)::integer from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Easy')
        when 'medium_clear' then (select count(*)::integer from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Medium')
        when 'hard_clear' then (select count(*)::integer from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Hard')
        when 'expert_solver' then (select count(*)::integer from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Expert')
        when 'master_solver' then (select count(*)::integer from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Master')
        when 'puzzle_10' then stats.puzzles_completed
        when 'puzzle_50' then stats.puzzles_completed
        when 'puzzle_100' then stats.puzzles_completed
        when 'puzzle_500' then stats.puzzles_completed
        when 'flawless_10' then stats.flawless_puzzles
        when 'pure_logic' then case when exists (select 1 from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Hard' and gr.mistakes = 0 and gr.hints_used = 0) then 1 else 0 end
        when 'mastermind' then case when exists (select 1 from public.game_results gr where gr.user_id = v_user_id and gr.difficulty = 'Expert' and gr.mistakes = 0 and gr.hints_used = 0) then 1 else 0 end
        else ua.progress_current
      end) as next_progress
    from public.user_achievements ua
    join public.achievements a on a.badge_id = ua.badge_id
    cross join stats
    where ua.user_id = v_user_id
  ),
  changed as (
    update public.user_achievements ua
    set progress_current = progress.next_progress,
        unlocked = ua.unlocked or progress.next_progress >= a.progress_target,
        unlocked_at = case
          when not ua.unlocked and progress.next_progress >= a.progress_target then now()
          else ua.unlocked_at
        end,
        updated_at = now()
    from progress
    join public.achievements a on a.badge_id = progress.badge_id
    where ua.user_id = v_user_id
      and ua.badge_id = progress.badge_id
    returning ua.badge_id, ua.unlocked_at, a.name, a.icon, a.description, a.category, a.progress_target, ua.progress_current
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'badge_id', changed.badge_id,
    'name', changed.name,
    'icon', changed.icon,
    'description', changed.description,
    'category', changed.category,
    'progress_target', changed.progress_target,
    'progress_current', changed.progress_current,
    'unlocked', true,
    'unlocked_at', changed.unlocked_at
  )), '[]'::jsonb)
    into v_unlocked_badges
  from changed
  where changed.unlocked_at is not null
    and changed.unlocked_at >= now() - interval '5 seconds';

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
    'score_breakdown', v_score_breakdown,
    'xp_earned', v_result.xp_earned,
    'leaderboard_eligible', v_result.eligible_for_leaderboard,
    'ranked_eligible', v_result.eligible_for_ranked,
    'completed_at', v_result.completed_at,
    'badges_unlocked', v_unlocked_badges,
    'updated_profile_stats', v_stats,
    'already_finalized', false
  );
end;
$$;

grant execute on function public.submit_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz) to authenticated;
