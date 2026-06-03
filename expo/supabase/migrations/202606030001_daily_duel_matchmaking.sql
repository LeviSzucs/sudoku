-- Daily Duel asynchronous matchmaking foundation.

create table if not exists public.daily_duels (
  duel_id uuid primary key default gen_random_uuid(),
  duel_date date not null,
  puzzle_id text not null references public.puzzles(puzzle_id) on delete cascade,
  player_a_id uuid not null references auth.users(id) on delete cascade,
  player_b_id uuid references auth.users(id) on delete cascade,
  player_a_session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  player_b_session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  player_a_result_id text references public.game_results(result_id) on delete set null,
  player_b_result_id text references public.game_results(result_id) on delete set null,
  status text not null default 'waiting_for_opponent',
  winner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  matched_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint daily_duels_no_self check (player_b_id is null or player_a_id <> player_b_id),
  constraint daily_duels_status_check check (status in (
    'waiting_for_opponent',
    'matched',
    'player_a_completed',
    'player_b_completed',
    'completed',
    'cancelled',
    'expired'
  ))
);

create index if not exists daily_duels_date_status_idx
  on public.daily_duels (duel_date, status, created_at);

create unique index if not exists daily_duels_player_a_date_unique
  on public.daily_duels (duel_date, player_a_id);

create unique index if not exists daily_duels_player_b_date_unique
  on public.daily_duels (duel_date, player_b_id)
  where player_b_id is not null;

alter table public.daily_duels enable row level security;

drop policy if exists "Users can read their daily duels" on public.daily_duels;
create policy "Users can read their daily duels"
on public.daily_duels
for select
using (auth.uid() = player_a_id or auth.uid() = player_b_id);

create or replace function public.daily_duels_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daily_duels_set_updated_at on public.daily_duels;
create trigger daily_duels_set_updated_at
before update on public.daily_duels
for each row execute function public.daily_duels_set_updated_at();

create or replace function public.daily_duel_one_per_user_per_day()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.daily_duels dd
    where dd.duel_date = new.duel_date
      and dd.duel_id <> coalesce(new.duel_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and dd.status <> 'cancelled'
      and (
        dd.player_a_id = new.player_a_id
        or dd.player_b_id = new.player_a_id
        or (new.player_b_id is not null and dd.player_a_id = new.player_b_id)
        or (new.player_b_id is not null and dd.player_b_id = new.player_b_id)
      )
  ) then
    raise exception 'Daily Duel already entered for this date.' using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists daily_duel_one_per_user_per_day_trigger on public.daily_duels;
create trigger daily_duel_one_per_user_per_day_trigger
before insert or update of player_a_id, player_b_id, duel_date, status on public.daily_duels
for each row execute function public.daily_duel_one_per_user_per_day();

create or replace function public.daily_duel_winner(
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_a_won boolean,
  p_b_won boolean,
  p_a_score integer,
  p_b_score integer,
  p_a_seconds integer,
  p_b_seconds integer,
  p_a_completed_at timestamptz,
  p_b_completed_at timestamptz
)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  if coalesce(p_a_won, false) = false and coalesce(p_b_won, false) = false then
    return null;
  end if;

  if coalesce(p_a_won, false) = true and coalesce(p_b_won, false) = false then
    return p_player_a_id;
  end if;

  if coalesce(p_b_won, false) = true and coalesce(p_a_won, false) = false then
    return p_player_b_id;
  end if;

  if coalesce(p_a_score, 0) > coalesce(p_b_score, 0) then
    return p_player_a_id;
  elsif coalesce(p_b_score, 0) > coalesce(p_a_score, 0) then
    return p_player_b_id;
  elsif coalesce(p_a_seconds, 999999) < coalesce(p_b_seconds, 999999) then
    return p_player_a_id;
  elsif coalesce(p_b_seconds, 999999) < coalesce(p_a_seconds, 999999) then
    return p_player_b_id;
  elsif p_a_completed_at is not null and p_b_completed_at is not null and p_a_completed_at < p_b_completed_at then
    return p_player_a_id;
  elsif p_a_completed_at is not null and p_b_completed_at is not null and p_b_completed_at < p_a_completed_at then
    return p_player_b_id;
  end if;

  return null;
end;
$$;

create or replace function public.daily_duel_result_won_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode = 'daily_duel'
    and new.completed = true
    and new.won is null
    and coalesce(new.final_score, 0) > 0 then
    new.won := true;
  end if;

  return new;
end;
$$;

drop trigger if exists daily_duel_result_won_default_trigger on public.game_results;
create trigger daily_duel_result_won_default_trigger
before insert or update on public.game_results
for each row execute function public.daily_duel_result_won_default();

create or replace function public.link_daily_duel_result(
  p_user_id uuid,
  p_session_id uuid,
  p_result_id text
)
returns table (
  duel_id uuid,
  status text,
  winner_user_id uuid,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.game_results%rowtype;
  v_duel public.daily_duels%rowtype;
  v_a_result public.game_results%rowtype;
  v_b_result public.game_results%rowtype;
  v_next_status text;
  v_winner uuid;
begin
  if p_user_id is null or p_result_id is null then
    raise exception 'Missing Daily Duel result link input.' using errcode = '22023';
  end if;

  select *
    into v_result
  from public.game_results gr
  where gr.result_id = p_result_id
    and gr.user_id = p_user_id
    and gr.mode = 'daily_duel'
    and gr.completed = true
  limit 1;

  if v_result.result_id is null then
    raise exception 'Completed Daily Duel result not found.' using errcode = '22023';
  end if;

  select *
    into v_duel
  from public.daily_duels dd
  where (
      p_session_id is not null
      and (
        (dd.player_a_session_id = p_session_id and dd.player_a_id = p_user_id)
        or (dd.player_b_session_id = p_session_id and dd.player_b_id = p_user_id)
      )
    )
  for update;

  if v_duel.duel_id is null then
    select *
      into v_duel
    from public.daily_duels dd
    where dd.puzzle_id = v_result.puzzle_id
      and dd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed', 'completed')
      and (
        (
          dd.player_a_id = p_user_id
          and (dd.player_a_result_id is null or dd.player_a_result_id = p_result_id)
          and (dd.player_a_session_id is null or dd.player_a_session_id = v_result.session_id)
        )
        or (
          dd.player_b_id = p_user_id
          and (dd.player_b_result_id is null or dd.player_b_result_id = p_result_id)
          and (dd.player_b_session_id is null or dd.player_b_session_id = v_result.session_id)
        )
      )
    order by dd.created_at desc
    limit 1
    for update;
  end if;

  if v_duel.duel_id is null then
    raise exception 'Daily Duel not found for result.' using errcode = '22023';
  end if;

  if p_user_id = v_duel.player_a_id then
    v_duel.player_a_session_id := coalesce(v_duel.player_a_session_id, v_result.session_id, p_session_id);
    v_duel.player_a_result_id := coalesce(v_duel.player_a_result_id, p_result_id);
  elsif p_user_id = v_duel.player_b_id then
    v_duel.player_b_session_id := coalesce(v_duel.player_b_session_id, v_result.session_id, p_session_id);
    v_duel.player_b_result_id := coalesce(v_duel.player_b_result_id, p_result_id);
  else
    raise exception 'Result user is not part of this Daily Duel.' using errcode = '42501';
  end if;

  if v_duel.player_a_result_id is not null then
    select * into v_a_result from public.game_results where result_id = v_duel.player_a_result_id limit 1;
  end if;
  if v_duel.player_b_result_id is not null then
    select * into v_b_result from public.game_results where result_id = v_duel.player_b_result_id limit 1;
  end if;

  v_next_status := case
    when v_duel.player_a_result_id is not null and v_duel.player_b_result_id is not null then 'completed'
    when v_duel.player_a_result_id is not null then 'player_a_completed'
    when v_duel.player_b_result_id is not null then 'player_b_completed'
    when v_duel.player_b_id is not null then 'matched'
    else 'waiting_for_opponent'
  end;

  v_winner := case
    when v_next_status = 'completed' then public.daily_duel_winner(
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

  update public.daily_duels dd
  set player_a_session_id = v_duel.player_a_session_id,
      player_b_session_id = v_duel.player_b_session_id,
      player_a_result_id = v_duel.player_a_result_id,
      player_b_result_id = v_duel.player_b_result_id,
      status = v_next_status,
      winner_user_id = v_winner,
      completed_at = case
        when v_next_status = 'completed' then coalesce(dd.completed_at, greatest(v_a_result.completed_at, v_b_result.completed_at), now())
        else dd.completed_at
      end,
      updated_at = now()
  where dd.duel_id = v_duel.duel_id
  returning * into v_duel;

  return query
  select v_duel.duel_id, v_duel.status, v_duel.winner_user_id, v_duel.completed_at;
end;
$$;

create or replace function public.daily_duel_result_link_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mode = 'daily_duel' and new.completed = true then
    begin
      perform public.link_daily_duel_result(new.user_id, new.session_id, new.result_id);
    exception
      when others then
        raise notice 'Could not link Daily Duel result %: %', new.result_id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists daily_duel_result_link_trigger on public.game_results;
create trigger daily_duel_result_link_trigger
after insert or update on public.game_results
for each row
when (new.mode = 'daily_duel' and new.completed = true)
execute function public.daily_duel_result_link_trigger();

create or replace function public.daily_duel_view(p_date date default current_date)
returns table (
  duel_id uuid,
  duel_date date,
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
  your_score integer,
  your_elapsed_seconds integer,
  your_mistakes integer,
  your_hints_used integer,
  opponent_score integer,
  opponent_elapsed_seconds integer,
  opponent_mistakes integer,
  opponent_hints_used integer,
  winner_user_id uuid,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  return query
  with mine as (
    select dd.*
    from public.daily_duels dd
    where dd.duel_date = p_date
      and (dd.player_a_id = v_user_id or dd.player_b_id = v_user_id)
    order by dd.created_at desc
    limit 1
  ),
  shaped as (
    select
      m.*,
      case when m.player_a_id = v_user_id then m.player_a_session_id else m.player_b_session_id end as my_session_id,
      case when m.player_a_id = v_user_id then m.player_a_result_id else m.player_b_result_id end as my_result_id,
      case when m.player_a_id = v_user_id then m.player_b_id else m.player_a_id end as opponent_id,
      case when m.player_a_id = v_user_id then m.player_b_result_id else m.player_a_result_id end as opponent_result_id
    from mine m
  )
  select
    s.duel_id,
    s.duel_date,
    s.status,
    s.puzzle_id,
    p.difficulty,
    s.my_session_id,
    s.my_result_id,
    s.opponent_id,
    coalesce(nullif(trim(prof.display_name), ''), prof.username_handle, 'Opponent'),
    prof.username_handle,
    coalesce(nullif(trim(prof.initials), ''), 'OP'),
    coalesce(prof.avatar_color, '#3F7D58'),
    my_result.final_score,
    my_result.elapsed_seconds,
    my_result.mistakes,
    my_result.hints_used,
    opp_result.final_score,
    opp_result.elapsed_seconds,
    opp_result.mistakes,
    opp_result.hints_used,
    s.winner_user_id,
    s.completed_at
  from shaped s
  join public.puzzles p on p.puzzle_id = s.puzzle_id
  left join public.profiles prof on prof.id = s.opponent_id
  left join public.game_results my_result on my_result.result_id = s.my_result_id
  left join public.game_results opp_result on opp_result.result_id = s.opponent_result_id;
end;
$$;

create or replace function public.enter_daily_duel(p_date date default current_date)
returns table (
  duel_id uuid,
  duel_date date,
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
  your_score integer,
  your_elapsed_seconds integer,
  your_mistakes integer,
  your_hints_used integer,
  opponent_score integer,
  opponent_elapsed_seconds integer,
  opponent_mistakes integer,
  opponent_hints_used integer,
  winner_user_id uuid,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_puzzle record;
  v_waiting public.daily_duels%rowtype;
  v_duel public.daily_duels%rowtype;
  v_session public.puzzle_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select * into v_daily_puzzle
  from public.get_daily_puzzle(p_date, 'daily_duel')
  limit 1;

  if v_daily_puzzle.puzzle_id is null then
    raise exception 'No Daily Duel puzzle is available.' using errcode = '22023';
  end if;

  select *
    into v_duel
  from public.daily_duels dd
  where dd.duel_date = p_date
    and (dd.player_a_id = v_user_id or dd.player_b_id = v_user_id)
  order by dd.created_at desc
  limit 1;

  if v_duel.duel_id is not null then
    return query select * from public.daily_duel_view(p_date);
    return;
  end if;

  select *
    into v_waiting
  from public.daily_duels dd
  where dd.duel_date = p_date
    and dd.puzzle_id = v_daily_puzzle.puzzle_id
    and dd.status = 'waiting_for_opponent'
    and dd.player_a_id <> v_user_id
    and dd.player_b_id is null
  order by dd.created_at asc
  limit 1
  for update skip locked;

  if v_waiting.duel_id is not null then
    insert into public.puzzle_sessions (
      user_id, puzzle_id, mode, difficulty, board_state, notes_state,
      elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
    )
    values (
      v_user_id, v_daily_puzzle.puzzle_id, 'daily_duel', v_daily_puzzle.difficulty,
      public.sudoku_givens_to_board(v_daily_puzzle.givens), public.empty_sudoku_notes(),
      0, 0, 0, 0, '[]'::jsonb, 'in_progress'
    )
    returning * into v_session;

    update public.daily_duels dd
    set player_b_id = v_user_id,
        player_b_session_id = v_session.session_id,
        status = 'matched',
        matched_at = now(),
        updated_at = now()
    where dd.duel_id = v_waiting.duel_id
    returning * into v_duel;

    return query select * from public.daily_duel_view(p_date);
    return;
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_user_id, v_daily_puzzle.puzzle_id, 'daily_duel', v_daily_puzzle.difficulty,
    public.sudoku_givens_to_board(v_daily_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  insert into public.daily_duels (
    duel_date, puzzle_id, player_a_id, player_a_session_id, status
  )
  values (
    p_date, v_daily_puzzle.puzzle_id, v_user_id, v_session.session_id, 'waiting_for_opponent'
  )
  returning * into v_duel;

  return query select * from public.daily_duel_view(p_date);
end;
$$;

grant execute on function public.daily_duel_winner(uuid, uuid, boolean, boolean, integer, integer, integer, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.link_daily_duel_result(uuid, uuid, text) to authenticated;
grant execute on function public.daily_duel_view(date) to authenticated;
grant execute on function public.enter_daily_duel(date) to authenticated;


-- Extend failed result finalisation to Daily Duel attempts.

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
    elsif v_existing.mode = 'daily_duel' then
      perform public.link_daily_duel_result(v_user_id, p_session_id, v_existing.result_id);
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

  if v_session.mode not in ('daily', 'daily_duel', 'friend_challenge') then
    raise exception 'Failed official finalisation is only supported for Daily, Daily Duel, and Friend Challenge attempts' using errcode = '22023';
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
    elsif v_existing.mode = 'daily_duel' then
      perform public.link_daily_duel_result(v_user_id, p_session_id, v_existing.result_id);
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
  elsif v_result.mode = 'daily_duel' then
    perform public.link_daily_duel_result(v_user_id, p_session_id, v_result.result_id);
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
