-- Fix solo solved-result semantics and duplicate-safe solo leaderboards.
-- Historic Classic/Daily completed rows represented solved completions before
-- won was consistently written. This backfill only marks positive-score
-- completed solo rows as solved.

update public.game_results gr
set won = true
where gr.mode in ('classic', 'daily')
  and gr.completed = true
  and gr.won is null
  and gr.elapsed_seconds is not null
  and gr.final_score is not null
  and gr.final_score > 0
  and right(gr.result_id, 7) <> '_failed';

create or replace function public.solo_result_won_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode in ('classic', 'daily')
    and new.completed = true
    and new.won is null
    and coalesce(new.final_score, 0) > 0
    and coalesce(new.elapsed_seconds, 0) > 0
    and right(new.result_id, 7) <> '_failed' then
    new.won := true;
  end if;
  return new;
end;
$$;

drop trigger if exists solo_result_won_default_trigger on public.game_results;
create trigger solo_result_won_default_trigger
before insert or update of mode, completed, won, final_score, elapsed_seconds, result_id
on public.game_results
for each row
execute function public.solo_result_won_default();

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
  deduped as (
    select *
    from (
      select gr.*,
        row_number() over (
          partition by gr.user_id, gr.mode, gr.difficulty, coalesce(gr.puzzle_id, ''),
                       gr.completed_at, coalesce(gr.elapsed_seconds, 0), coalesce(gr.final_score, 0)
          order by (gr.session_id is null), gr.result_id
        ) as duplicate_rank
      from public.game_results gr
      join assigned a on a.puzzle_id = gr.puzzle_id
      where gr.mode = 'daily'
        and gr.completed = true
    ) rows
    where duplicate_rank = 1
  ),
  ranked as (
    select
      row_number() over (
        order by coalesce(d.final_score, 0) desc,
                 coalesce(d.elapsed_seconds, 0) asc,
                 d.completed_at asc nulls last
      )::integer as rank,
      d.result_id,
      d.user_id,
      coalesce(nullif(trim(p.display_name), ''), p.username_handle, p.username, 'Player') as username,
      coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
      coalesce(p.avatar_color, '#A8A294') as avatar_color,
      d.puzzle_id,
      coalesce(d.final_score, 0)::integer as final_score,
      coalesce(d.elapsed_seconds, 0)::integer as elapsed_seconds,
      coalesce(d.mistakes, 0)::integer as mistakes,
      coalesce(d.hints_used, 0)::integer as hints_used,
      coalesce(d.undo_count, 0)::integer as undo_count,
      d.completed_at
    from deduped d
    left join public.profiles p on p.id = d.user_id
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
  deduped as (
    select *
    from (
      select gr.*,
        row_number() over (
          partition by gr.user_id, gr.mode, gr.difficulty, coalesce(gr.puzzle_id, ''),
                       gr.completed_at, coalesce(gr.elapsed_seconds, 0), coalesce(gr.final_score, 0)
          order by (gr.session_id is null), gr.result_id
        ) as duplicate_rank
      from public.game_results gr
      cross join bounds b
      where gr.completed = true
        and gr.completed_at >= b.week_start
        and gr.completed_at < b.week_end
        and gr.mode in ('classic', 'daily')
    ) rows
    where duplicate_rank = 1
  ),
  user_scores as (
    select
      d.user_id,
      sum(coalesce(d.final_score, 0))::integer as total_score,
      count(*)::integer as puzzles_completed,
      max(coalesce(d.final_score, 0))::integer as best_score,
      sum(coalesce(d.elapsed_seconds, 0))::integer as total_time,
      max(d.completed_at) as latest_completed_at
    from deduped d
    group by d.user_id
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
  deduped as (
    select *
    from (
      select gr.*,
        row_number() over (
          partition by gr.user_id, gr.mode, gr.difficulty, coalesce(gr.puzzle_id, ''),
                       gr.completed_at, coalesce(gr.elapsed_seconds, 0), coalesce(gr.final_score, 0)
          order by (gr.session_id is null), gr.result_id
        ) as duplicate_rank
      from public.game_results gr
      join eligible_users eu on eu.user_id = gr.user_id
      cross join bounds b
      where gr.completed = true
        and gr.completed_at >= b.week_start
        and gr.completed_at < b.week_end
        and gr.mode in ('classic', 'daily')
    ) rows
    where duplicate_rank = 1
  ),
  user_scores as (
    select
      d.user_id,
      sum(coalesce(d.final_score, 0))::integer as total_score,
      count(*)::integer as puzzles_completed,
      max(coalesce(d.final_score, 0))::integer as best_score,
      sum(coalesce(d.elapsed_seconds, 0))::integer as total_time,
      max(d.completed_at) as latest_completed_at
    from deduped d
    group by d.user_id
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
