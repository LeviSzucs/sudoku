-- Solo leaderboard inclusion rules.
-- Daily, Weekly, and Friends leaderboards include completed Classic/Daily
-- results regardless of eligible_for_leaderboard. Ranked rules stay separate.

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
      coalesce(nullif(trim(p.display_name), ''), p.username_handle, p.username, 'Player') as username,
      coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
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
      and gr.completed_at is not null
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
      sum(gr.final_score)::integer as total_score,
      count(*)::integer as puzzles_completed,
      max(gr.final_score)::integer as best_score,
      sum(gr.elapsed_seconds)::integer as total_time,
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
        order by us.total_score desc, us.puzzles_completed desc, us.best_score desc, us.total_time asc
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

create or replace function public.get_friends_weekly_leaderboard(
  p_date date default current_date
)
returns table(
  rank integer,
  user_id uuid,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  total_score integer,
  puzzles_completed integer,
  best_score integer,
  total_time integer,
  latest_completed_at timestamptz,
  is_current_user boolean
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
  eligible_users as (
    select auth.uid() as user_id
    where auth.uid() is not null
    union
    select f.friend_id as user_id
    from public.friends f
    where f.user_id = auth.uid()
  ),
  user_scores as (
    select
      gr.user_id,
      sum(gr.final_score)::integer as total_score,
      count(*)::integer as puzzles_completed,
      max(gr.final_score)::integer as best_score,
      sum(gr.elapsed_seconds)::integer as total_time,
      max(gr.completed_at) as latest_completed_at
    from public.game_results gr
    join eligible_users eu on eu.user_id = gr.user_id
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
        order by us.total_score desc, us.puzzles_completed desc, us.best_score desc, us.total_time asc
      )::integer as rank,
      us.user_id,
      coalesce(nullif(trim(p.display_name), ''), p.username_handle, p.username, 'Player') as display_name,
      p.username_handle,
      coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
      coalesce(p.avatar_color, '#A8A294') as avatar_color,
      us.total_score,
      us.puzzles_completed,
      us.best_score,
      us.total_time,
      us.latest_completed_at,
      us.user_id = auth.uid() as is_current_user
    from user_scores us
    left join public.profiles p on p.id = us.user_id
  )
  select *
  from ranked
  order by rank asc;
$$;

grant execute on function public.get_friends_weekly_leaderboard(date) to authenticated;
