-- Friend Challenge foundation.

create extension if not exists pgcrypto;

alter table public.puzzle_sessions
  drop constraint if exists puzzle_sessions_mode_check;

alter table public.puzzle_sessions
  add constraint puzzle_sessions_mode_check
  check (mode in ('classic', 'daily', 'daily_duel', 'duel', 'friend_challenge', 'ranked', 'ranked_duel'));

alter table public.game_results
  drop constraint if exists game_results_mode_check;

alter table public.game_results
  add constraint game_results_mode_check
  check (mode in ('classic', 'daily', 'daily_duel', 'duel', 'friend_challenge', 'ranked', 'ranked_duel'));

create table if not exists public.friend_challenges (
  challenge_id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users(id) on delete cascade,
  challenged_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id text not null references public.puzzles(puzzle_id),
  difficulty text not null,
  status text not null default 'pending',
  challenger_session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  challenged_session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  challenger_result_id text references public.game_results(result_id) on delete set null,
  challenged_result_id text references public.game_results(result_id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint friend_challenges_no_self check (challenger_id <> challenged_id),
  constraint friend_challenges_difficulty_check check (difficulty in ('Easy', 'Medium', 'Hard', 'Expert', 'Master')),
  constraint friend_challenges_status_check check (status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed', 'completed', 'declined', 'cancelled', 'expired'))
);

create index if not exists friend_challenges_challenger_status_idx
  on public.friend_challenges (challenger_id, status, created_at desc);

create index if not exists friend_challenges_challenged_status_idx
  on public.friend_challenges (challenged_id, status, created_at desc);

create unique index if not exists friend_challenges_active_pair_puzzle_unique
  on public.friend_challenges (least(challenger_id, challenged_id), greatest(challenger_id, challenged_id), puzzle_id)
  where status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists friend_challenges_set_updated_at on public.friend_challenges;
create trigger friend_challenges_set_updated_at
before update on public.friend_challenges
for each row execute function public.set_updated_at();

alter table public.friend_challenges enable row level security;

drop policy if exists "Users can read their friend challenges" on public.friend_challenges;
create policy "Users can read their friend challenges"
on public.friend_challenges
for select
to authenticated
using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create or replace function public.sudoku_givens_to_board(p_givens text)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_row jsonb;
  v_char text;
  v_digit integer;
  r integer;
  c integer;
begin
  if p_givens is null or length(p_givens) <> 81 then
    raise exception 'Puzzle givens must be 81 characters.';
  end if;

  for r in 0..8 loop
    v_row := '[]'::jsonb;
    for c in 0..8 loop
      v_char := substr(p_givens, r * 9 + c + 1, 1);
      v_digit := case when v_char ~ '^[1-9]$' then v_char::integer else 0 end;
      v_row := v_row || jsonb_build_array(v_digit);
    end loop;
    v_rows := v_rows || jsonb_build_array(v_row);
  end loop;

  return v_rows;
end;
$$;

create or replace function public.empty_sudoku_notes()
returns jsonb
language plpgsql
immutable
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_row jsonb;
  r integer;
  c integer;
begin
  for r in 0..8 loop
    v_row := '[]'::jsonb;
    for c in 0..8 loop
      v_row := v_row || jsonb_build_array('[]'::jsonb);
    end loop;
    v_rows := v_rows || jsonb_build_array(v_row);
  end loop;

  return v_rows;
end;
$$;

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

  select p.id into v_friend_id
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

  select * into v_puzzle
  from public.puzzles p
  where p.difficulty = v_difficulty
    and p.is_active = true
  order by random()
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'No active puzzle is available for this difficulty.';
  end if;

  if exists (
    select 1 from public.friend_challenges fc
    where fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed')
      and fc.puzzle_id = v_puzzle.puzzle_id
      and least(fc.challenger_id, fc.challenged_id) = least(v_challenger_id, v_friend_id)
      and greatest(fc.challenger_id, fc.challenged_id) = greatest(v_challenger_id, v_friend_id)
  ) then
    raise exception 'An active challenge already exists for this puzzle.';
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
end;
$$;

create or replace function public.accept_friend_challenge(p_challenge_id uuid)
returns table (
  challenge_id uuid,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.friend_challenges%rowtype;
  v_puzzle public.puzzles%rowtype;
  v_session public.puzzle_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_challenge
  from public.friend_challenges fc
  where fc.challenge_id = p_challenge_id
    and fc.challenged_id = v_user_id
    and fc.status in ('pending', 'challenger_completed')
  for update;

  if v_challenge.challenge_id is null then
    raise exception 'Challenge not found.';
  end if;

  select * into v_puzzle
  from public.puzzles p
  where p.puzzle_id = v_challenge.puzzle_id
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'Challenge puzzle not found.';
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_user_id, v_puzzle.puzzle_id, 'friend_challenge', v_puzzle.difficulty,
    public.sudoku_givens_to_board(v_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  update public.friend_challenges fc
  set status = case when fc.challenger_result_id is not null then 'challenger_completed' else 'accepted' end,
      accepted_at = coalesce(fc.accepted_at, now()),
      challenged_session_id = v_session.session_id,
      updated_at = now()
  where fc.challenge_id = v_challenge.challenge_id
  returning * into v_challenge;

  return query
  select v_challenge.challenge_id, v_challenge.status, v_challenge.puzzle_id, v_challenge.difficulty, v_session.session_id;
end;
$$;

create or replace function public.decline_friend_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.friend_challenges fc
  set status = 'declined',
      updated_at = now()
  where fc.challenge_id = p_challenge_id
    and fc.challenged_id = v_user_id
    and fc.status = 'pending';

  if not found then
    raise exception 'Challenge not found.';
  end if;
end;
$$;

create or replace function public.cancel_friend_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.friend_challenges fc
  set status = 'cancelled',
      updated_at = now()
  where fc.challenge_id = p_challenge_id
    and fc.challenger_id = v_user_id
    and fc.status in ('pending', 'accepted');

  if not found then
    raise exception 'Challenge cannot be cancelled.';
  end if;
end;
$$;

create or replace function public.complete_friend_challenge_result(p_session_id uuid, p_result_id text)
returns table (
  challenge_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.friend_challenges%rowtype;
  v_next_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_challenge
  from public.friend_challenges fc
  where (fc.challenger_session_id = p_session_id and fc.challenger_id = v_user_id)
     or (fc.challenged_session_id = p_session_id and fc.challenged_id = v_user_id)
  for update;

  if v_challenge.challenge_id is null then
    raise exception 'Friend challenge not found for session.';
  end if;

  if not exists (
    select 1 from public.game_results gr
    where gr.result_id = p_result_id
      and gr.session_id = p_session_id
      and gr.user_id = v_user_id
      and gr.mode = 'friend_challenge'
      and gr.completed = true
  ) then
    raise exception 'Completed friend challenge result not found.';
  end if;

  if v_user_id = v_challenge.challenger_id then
    v_challenge.challenger_result_id := coalesce(v_challenge.challenger_result_id, p_result_id);
  elsif v_user_id = v_challenge.challenged_id then
    v_challenge.challenged_result_id := coalesce(v_challenge.challenged_result_id, p_result_id);
  end if;

  v_next_status := case
    when v_challenge.challenger_result_id is not null and v_challenge.challenged_result_id is not null then 'completed'
    when v_challenge.challenger_result_id is not null then 'challenger_completed'
    when v_challenge.challenged_result_id is not null then 'challenged_completed'
    else v_challenge.status
  end;

  update public.friend_challenges fc
  set challenger_result_id = v_challenge.challenger_result_id,
      challenged_result_id = v_challenge.challenged_result_id,
      status = v_next_status,
      completed_at = case when v_next_status = 'completed' then coalesce(fc.completed_at, now()) else fc.completed_at end,
      updated_at = now()
  where fc.challenge_id = v_challenge.challenge_id
  returning * into v_challenge;

  return query
  select v_challenge.challenge_id, v_challenge.status, v_challenge.completed_at;
end;
$$;

create or replace function public.get_friend_challenges()
returns table (
  challenge_id uuid,
  direction text,
  status text,
  puzzle_id text,
  difficulty text,
  challenger_id uuid,
  challenged_id uuid,
  friend_user_id uuid,
  friend_display_name text,
  friend_username_handle text,
  friend_initials text,
  friend_avatar_color text,
  challenger_session_id uuid,
  challenged_session_id uuid,
  current_user_session_id uuid,
  challenger_result_id text,
  challenged_result_id text,
  challenger_score integer,
  challenged_score integer,
  challenger_elapsed_seconds integer,
  challenged_elapsed_seconds integer,
  challenger_mistakes integer,
  challenged_mistakes integer,
  challenger_hints_used integer,
  challenged_hints_used integer,
  challenger_undo_count integer,
  challenged_undo_count integer,
  challenger_completed_at timestamptz,
  challenged_completed_at timestamptz,
  winner_user_id uuid,
  created_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with visible as (
    select
      fc.*,
      case when fc.challenger_id = auth.uid() then fc.challenged_id else fc.challenger_id end as friend_id,
      case when fc.challenger_id = auth.uid() then 'outgoing' else 'incoming' end as direction,
      case when fc.challenger_id = auth.uid() then fc.challenger_session_id else fc.challenged_session_id end as current_session_id
    from public.friend_challenges fc
    where fc.challenger_id = auth.uid() or fc.challenged_id = auth.uid()
  ),
  scored as (
    select
      v.*,
      cr.final_score as challenger_score,
      tr.final_score as challenged_score,
      cr.elapsed_seconds as challenger_elapsed_seconds,
      tr.elapsed_seconds as challenged_elapsed_seconds,
      cr.mistakes as challenger_mistakes,
      tr.mistakes as challenged_mistakes,
      cr.hints_used as challenger_hints_used,
      tr.hints_used as challenged_hints_used,
      cr.undo_count as challenger_undo_count,
      tr.undo_count as challenged_undo_count,
      cr.completed_at as challenger_completed_at,
      tr.completed_at as challenged_completed_at
    from visible v
    left join public.game_results cr on cr.result_id = v.challenger_result_id
    left join public.game_results tr on tr.result_id = v.challenged_result_id
  )
  select
    s.challenge_id,
    s.direction,
    s.status,
    s.puzzle_id,
    s.difficulty,
    s.challenger_id,
    s.challenged_id,
    p.id as friend_user_id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as friend_display_name,
    p.username_handle as friend_username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL') as friend_initials,
    coalesce(p.avatar_color, '#A8A294') as friend_avatar_color,
    s.challenger_session_id,
    s.challenged_session_id,
    s.current_session_id,
    s.challenger_result_id,
    s.challenged_result_id,
    s.challenger_score,
    s.challenged_score,
    s.challenger_elapsed_seconds,
    s.challenged_elapsed_seconds,
    s.challenger_mistakes,
    s.challenged_mistakes,
    s.challenger_hints_used,
    s.challenged_hints_used,
    s.challenger_undo_count,
    s.challenged_undo_count,
    s.challenger_completed_at,
    s.challenged_completed_at,
    case
      when s.challenger_result_id is null or s.challenged_result_id is null then null
      when s.challenger_score > s.challenged_score then s.challenger_id
      when s.challenged_score > s.challenger_score then s.challenged_id
      when s.challenger_elapsed_seconds < s.challenged_elapsed_seconds then s.challenger_id
      when s.challenged_elapsed_seconds < s.challenger_elapsed_seconds then s.challenged_id
      when s.challenger_completed_at < s.challenged_completed_at then s.challenger_id
      when s.challenged_completed_at < s.challenger_completed_at then s.challenged_id
      else null
    end as winner_user_id,
    s.created_at,
    s.accepted_at,
    s.completed_at
  from scored s
  join public.profiles p on p.id = s.friend_id
  order by
    case when s.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed') then 0 else 1 end,
    s.created_at desc;
$$;

grant execute on function public.create_friend_challenge(text, text) to authenticated;
grant execute on function public.accept_friend_challenge(uuid) to authenticated;
grant execute on function public.decline_friend_challenge(uuid) to authenticated;
grant execute on function public.cancel_friend_challenge(uuid) to authenticated;
grant execute on function public.complete_friend_challenge_result(uuid, text) to authenticated;
grant execute on function public.get_friend_challenges() to authenticated;
grant select on public.friend_challenges to authenticated;
