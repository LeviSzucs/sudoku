-- Fix solo leaderboard backend functions.
-- These functions intentionally include completed Classic/Daily solo results
-- even when eligible_for_leaderboard is false or final_score is 0.

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
        order by coalesce(gr.final_score, 0) desc,
                 coalesce(gr.elapsed_seconds, 0) asc,
                 gr.completed_at asc nulls last
      )::integer as rank,
      gr.result_id,
      gr.user_id,
      coalesce(nullif(trim(p.display_name), ''), p.username_handle, p.username, 'Player') as username,
      coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
      coalesce(p.avatar_color, '#A8A294') as avatar_color,
      gr.puzzle_id,
      coalesce(gr.final_score, 0)::integer as final_score,
      coalesce(gr.elapsed_seconds, 0)::integer as elapsed_seconds,
      coalesce(gr.mistakes, 0)::integer as mistakes,
      coalesce(gr.hints_used, 0)::integer as hints_used,
      coalesce(gr.undo_count, 0)::integer as undo_count,
      gr.completed_at
    from public.game_results gr
    join assigned a on a.puzzle_id = gr.puzzle_id
    left join public.profiles p on p.id = gr.user_id
    where gr.mode = 'daily'
      and gr.completed = true
  )
  select *
  from ranked
  order by rank asc;
$$;

grant execute on function public.get_daily_leaderboard(date) to anon, authenticated;

create or replace function public.get_weekly_leaderboard(
  p_date date default current_date
)
returns table(
  rank integer,
  user_id uuid,
  username text,
  initials text,
  avatar_color text,
  total_score integer,
  puzzles_completed integer,
  best_score integer,
  total_time integer,
  latest_completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select
      (date_trunc('week', p_date::timestamp) at time zone 'UTC') as week_start,
      ((date_trunc('week', p_date::timestamp) + interval '7 days') at time zone 'UTC') as week_end
  ),
  user_scores as (
    select
      gr.user_id,
      sum(coalesce(gr.final_score, 0))::integer as total_score,
      count(*)::integer as puzzles_completed,
      max(coalesce(gr.final_score, 0))::integer as best_score,
      sum(coalesce(gr.elapsed_seconds, 0))::integer as total_time,
      max(gr.completed_at) as latest_completed_at
    from public.game_results gr
    cross join bounds b
    where gr.completed = true
      and gr.completed_at >= b.week_start
      and gr.completed_at < b.week_end
      and gr.mode in ('classic', 'daily')
    group by gr.user_id
  ),
  ranked as (
    select
      row_number() over (
        order by us.total_score desc,
                 us.puzzles_completed desc,
                 us.best_score desc,
                 us.total_time asc
      )::integer as rank,
      us.user_id,
      coalesce(nullif(trim(p.display_name), ''), p.username_handle, p.username, 'Player') as username,
      coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
      coalesce(p.avatar_color, '#A8A294') as avatar_color,
      us.total_score,
      us.puzzles_completed,
      us.best_score,
      us.total_time,
      us.latest_completed_at
    from user_scores us
    left join public.profiles p on p.id = us.user_id
  )
  select *
  from ranked
  order by rank asc;
$$;

grant execute on function public.get_weekly_leaderboard(date) to anon, authenticated;
