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
      and gr.eligible_for_leaderboard = true
      and gr.mode in ('classic', 'daily')
    group by gr.user_id
  ),
  ranked as (
    select
      row_number() over (
        order by us.total_score desc, us.puzzles_completed desc, us.best_score desc, us.total_time asc
      )::integer as rank,
      us.user_id,
      coalesce(p.username, 'Player') as username,
      coalesce(p.initials, 'PL') as initials,
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
