alter table public.user_settings
  add column if not exists show_on_global_leaderboards boolean;

update public.user_settings
set show_on_global_leaderboards = false
where show_on_global_leaderboards is distinct from false;

alter table public.user_settings
  alter column show_on_global_leaderboards set default false;

alter table public.user_settings
  alter column show_on_global_leaderboards set not null;

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
  visible_results as (
    select
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
    left join public.user_settings us on us.user_id = gr.user_id
    where gr.mode = 'daily'
      and gr.completed = true
      and coalesce(us.show_on_global_leaderboards, false) = true
  ),
  ranked as (
    select
      row_number() over (
        order by vr.final_score desc,
                 vr.elapsed_seconds asc,
                 vr.completed_at asc nulls last
      )::integer as rank,
      vr.*
    from visible_results vr
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
    left join public.user_settings us on us.user_id = gr.user_id
    where gr.completed = true
      and gr.completed_at >= b.week_start
      and gr.completed_at < b.week_end
      and gr.mode in ('classic', 'daily')
      and coalesce(us.show_on_global_leaderboards, false) = true
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

create or replace function public.get_ranked_leaderboard()
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  current_tier text,
  rp integer,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.ranked_seasons%rowtype;
begin
  v_season := public.active_ranked_season();

  return query
  select
    row_number() over (order by rp.rp desc, rp.wins desc, rp.matches_played asc, rp.updated_at asc) as rank,
    rp.user_id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as display_name,
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
    coalesce(p.avatar_color, '#A8A294') as avatar_color,
    rp.current_tier,
    rp.rp,
    rp.matches_played,
    rp.wins,
    rp.losses,
    rp.draws,
    rp.updated_at
  from public.ranked_profiles rp
  left join public.profiles p on p.id = rp.user_id
  left join public.user_settings us on us.user_id = rp.user_id
  where rp.season_id = v_season.season_id
    and coalesce(us.show_on_global_leaderboards, false) = true
  order by rp.rp desc, rp.wins desc, rp.matches_played asc, rp.updated_at asc
  limit 100;
end;
$$;

grant execute on function public.get_ranked_leaderboard() to anon, authenticated;
