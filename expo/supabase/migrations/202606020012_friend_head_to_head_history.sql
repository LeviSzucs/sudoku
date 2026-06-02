-- Friend head-to-head history for completed Friend Challenge matches.

create or replace function public.friend_challenge_winner(
  p_challenger_id uuid,
  p_challenged_id uuid,
  p_challenger_won boolean,
  p_challenged_won boolean,
  p_challenger_score integer,
  p_challenged_score integer,
  p_challenger_elapsed_seconds integer,
  p_challenged_elapsed_seconds integer,
  p_challenger_completed_at timestamptz,
  p_challenged_completed_at timestamptz
)
returns uuid
language sql
stable
as $$
  select case
    when p_challenger_won = false and p_challenged_won = false then null::uuid
    when p_challenger_won = false and p_challenged_won is distinct from false then p_challenged_id
    when p_challenged_won = false and p_challenger_won is distinct from false then p_challenger_id
    when coalesce(p_challenger_score, 0) > coalesce(p_challenged_score, 0) then p_challenger_id
    when coalesce(p_challenged_score, 0) > coalesce(p_challenger_score, 0) then p_challenged_id
    when coalesce(p_challenger_elapsed_seconds, 2147483647) < coalesce(p_challenged_elapsed_seconds, 2147483647) then p_challenger_id
    when coalesce(p_challenged_elapsed_seconds, 2147483647) < coalesce(p_challenger_elapsed_seconds, 2147483647) then p_challenged_id
    when p_challenger_completed_at < p_challenged_completed_at then p_challenger_id
    when p_challenged_completed_at < p_challenger_completed_at then p_challenged_id
    else null::uuid
  end;
$$;

create or replace function public.get_friend_head_to_head(p_friend_id uuid)
returns table (
  friend_user_id uuid,
  friend_display_name text,
  friend_username_handle text,
  friend_initials text,
  friend_avatar_color text,
  total_completed integer,
  current_user_wins integer,
  friend_wins integer,
  draws integer,
  current_user_average_score numeric,
  friend_average_score numeric,
  current_user_best_score integer,
  friend_best_score integer,
  current_user_fastest_win integer,
  friend_fastest_win integer,
  recent_completed_challenges jsonb
)
language sql
security definer
set search_path = public
as $$
  with friend_profile as (
    select
      p.id,
      coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as display_name,
      p.username_handle,
      coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
      coalesce(p.avatar_color, '#A8A294') as avatar_color
    from public.profiles p
    where p.id = p_friend_id
      and p.profile_setup_completed = true
      and exists (
        select 1
        from public.friends f
        where f.user_id = auth.uid()
          and f.friend_id = p_friend_id
      )
  ),
  completed as (
    select
      fc.challenge_id,
      fc.difficulty,
      fc.challenger_id,
      fc.challenged_id,
      fc.completed_at,
      cr.result_id as challenger_result_id,
      tr.result_id as challenged_result_id,
      coalesce(cr.final_score, 0) as challenger_score,
      coalesce(tr.final_score, 0) as challenged_score,
      cr.elapsed_seconds as challenger_elapsed_seconds,
      tr.elapsed_seconds as challenged_elapsed_seconds,
      cr.mistakes as challenger_mistakes,
      tr.mistakes as challenged_mistakes,
      cr.hints_used as challenger_hints_used,
      tr.hints_used as challenged_hints_used,
      cr.undo_count as challenger_undo_count,
      tr.undo_count as challenged_undo_count,
      cr.completed_at as challenger_completed_at,
      tr.completed_at as challenged_completed_at,
      cr.won as challenger_won,
      tr.won as challenged_won,
      public.friend_challenge_winner(
        fc.challenger_id,
        fc.challenged_id,
        cr.won,
        tr.won,
        cr.final_score,
        tr.final_score,
        cr.elapsed_seconds,
        tr.elapsed_seconds,
        cr.completed_at,
        tr.completed_at
      ) as winner_user_id
    from public.friend_challenges fc
    join friend_profile fp on true
    join public.game_results cr on cr.result_id = fc.challenger_result_id
    join public.game_results tr on tr.result_id = fc.challenged_result_id
    where fc.status = 'completed'
      and fc.challenger_result_id is not null
      and fc.challenged_result_id is not null
      and ((fc.challenger_id = auth.uid() and fc.challenged_id = p_friend_id)
        or (fc.challenger_id = p_friend_id and fc.challenged_id = auth.uid()))
      and cr.mode = 'friend_challenge'
      and tr.mode = 'friend_challenge'
      and cr.completed = true
      and tr.completed = true
  ),
  perspective as (
    select
      c.*,
      case when c.challenger_id = auth.uid() then c.challenger_score else c.challenged_score end as current_user_score,
      case when c.challenger_id = auth.uid() then c.challenged_score else c.challenger_score end as friend_score,
      case when c.challenger_id = auth.uid() then c.challenger_elapsed_seconds else c.challenged_elapsed_seconds end as current_user_elapsed_seconds,
      case when c.challenger_id = auth.uid() then c.challenged_elapsed_seconds else c.challenger_elapsed_seconds end as friend_elapsed_seconds,
      case when c.challenger_id = auth.uid() then c.challenger_mistakes else c.challenged_mistakes end as current_user_mistakes,
      case when c.challenger_id = auth.uid() then c.challenged_mistakes else c.challenger_mistakes end as friend_mistakes,
      case when c.challenger_id = auth.uid() then c.challenger_hints_used else c.challenged_hints_used end as current_user_hints_used,
      case when c.challenger_id = auth.uid() then c.challenged_hints_used else c.challenger_hints_used end as friend_hints_used,
      case when c.challenger_id = auth.uid() then c.challenger_undo_count else c.challenged_undo_count end as current_user_undo_count,
      case when c.challenger_id = auth.uid() then c.challenged_undo_count else c.challenger_undo_count end as friend_undo_count,
      case when c.challenger_id = auth.uid() then c.challenger_completed_at else c.challenged_completed_at end as current_user_completed_at,
      case when c.challenger_id = auth.uid() then c.challenged_completed_at else c.challenger_completed_at end as friend_completed_at,
      case
        when c.winner_user_id is null then 'draw'
        when c.winner_user_id = auth.uid() then 'won'
        else 'lost'
      end as outcome
    from completed c
  ),
  aggregate_stats as (
    select
      count(*)::integer as total_completed,
      count(*) filter (where outcome = 'won')::integer as current_user_wins,
      count(*) filter (where outcome = 'lost')::integer as friend_wins,
      count(*) filter (where outcome = 'draw')::integer as draws,
      round(avg(current_user_score), 1) as current_user_average_score,
      round(avg(friend_score), 1) as friend_average_score,
      max(current_user_score)::integer as current_user_best_score,
      max(friend_score)::integer as friend_best_score,
      min(current_user_elapsed_seconds) filter (where outcome = 'won')::integer as current_user_fastest_win,
      min(friend_elapsed_seconds) filter (where outcome = 'lost')::integer as friend_fastest_win
    from perspective
  ),
  recent as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'challenge_id', challenge_id,
        'difficulty', difficulty,
        'outcome', outcome,
        'winner_user_id', winner_user_id,
        'current_user_score', current_user_score,
        'friend_score', friend_score,
        'current_user_elapsed_seconds', current_user_elapsed_seconds,
        'friend_elapsed_seconds', friend_elapsed_seconds,
        'current_user_mistakes', current_user_mistakes,
        'friend_mistakes', friend_mistakes,
        'current_user_hints_used', current_user_hints_used,
        'friend_hints_used', friend_hints_used,
        'current_user_undo_count', current_user_undo_count,
        'friend_undo_count', friend_undo_count,
        'current_user_completed_at', current_user_completed_at,
        'friend_completed_at', friend_completed_at,
        'completed_at', completed_at
      )
      order by completed_at desc
    ), '[]'::jsonb) as rows
    from (
      select *
      from perspective
      order by completed_at desc
      limit 20
    ) latest
  )
  select
    fp.id as friend_user_id,
    fp.display_name as friend_display_name,
    fp.username_handle as friend_username_handle,
    fp.initials as friend_initials,
    fp.avatar_color as friend_avatar_color,
    coalesce(a.total_completed, 0) as total_completed,
    coalesce(a.current_user_wins, 0) as current_user_wins,
    coalesce(a.friend_wins, 0) as friend_wins,
    coalesce(a.draws, 0) as draws,
    coalesce(a.current_user_average_score, 0) as current_user_average_score,
    coalesce(a.friend_average_score, 0) as friend_average_score,
    coalesce(a.current_user_best_score, 0) as current_user_best_score,
    coalesce(a.friend_best_score, 0) as friend_best_score,
    a.current_user_fastest_win,
    a.friend_fastest_win,
    coalesce(r.rows, '[]'::jsonb) as recent_completed_challenges
  from friend_profile fp
  cross join aggregate_stats a
  cross join recent r;
$$;

grant execute on function public.friend_challenge_winner(uuid, uuid, boolean, boolean, integer, integer, integer, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_friend_head_to_head(uuid) to authenticated;
