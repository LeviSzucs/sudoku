create or replace function public.has_completed_daily(
  p_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_puzzle_id text;
  v_completed boolean := false;
begin
  if v_user_id is null then
    return false;
  end if;

  select dp.puzzle_id
    into v_puzzle_id
  from public.daily_puzzles dp
  where dp.date = p_date
    and dp.mode = 'daily'
  limit 1;

  if v_puzzle_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.game_results gr
    where gr.user_id = v_user_id
      and gr.mode = 'daily'
      and gr.puzzle_id = v_puzzle_id
      and gr.completed = true
  )
  into v_completed;

  return coalesce(v_completed, false);
end;
$$;

grant execute on function public.has_completed_daily(date) to authenticated;

create or replace function public.get_daily_leaderboard(
  p_date date
)
returns table(
  rank integer,
  result_id text,
  user_id uuid,
  username text,
  initials text,
  avatar_color text,
  puzzle_id text,
  final_score integer,
  elapsed_seconds integer,
  mistakes integer,
  hints_used integer,
  undo_count integer,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with assigned as (
    select dp.puzzle_id
    from public.daily_puzzles dp
    where dp.date = p_date
      and dp.mode = 'daily'
    limit 1
  ),
  ranked as (
    select
      row_number() over (
        order by gr.final_score desc, gr.elapsed_seconds asc, gr.completed_at asc
      )::integer as rank,
      gr.result_id,
      gr.user_id,
      coalesce(p.username, 'Player') as username,
      coalesce(p.initials, 'PL') as initials,
      coalesce(p.avatar_color, '#A8A294') as avatar_color,
      gr.puzzle_id,
      gr.final_score,
      gr.elapsed_seconds,
      gr.mistakes,
      gr.hints_used,
      gr.undo_count,
      gr.completed_at
    from public.game_results gr
    join assigned a on a.puzzle_id = gr.puzzle_id
    left join public.profiles p on p.id = gr.user_id
    where gr.mode = 'daily'
      and gr.completed = true
      and gr.eligible_for_leaderboard = true
      and gr.completed_at is not null
  )
  select *
  from ranked
  order by rank asc;
$$;

grant execute on function public.get_daily_leaderboard(date) to anon, authenticated;
