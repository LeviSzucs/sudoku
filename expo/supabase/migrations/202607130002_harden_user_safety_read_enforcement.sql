-- Harden user safety read paths so blocked users cannot keep interacting
-- through public/social surfaces after block state changes.

create or replace function public.get_public_player_profile(p_user_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  avatar_symbol text,
  avatar_style_version text,
  avatar_bg_color text,
  avatar_initials text,
  avatar_skin_tone text,
  avatar_hair_style text,
  avatar_hair_color text,
  avatar_top_style text,
  avatar_top_color text,
  avatar_accessory text,
  avatar_frame text,
  public_profile boolean,
  show_stats_publicly boolean,
  show_recent_results_publicly boolean,
  rank_tier text,
  current_streak integer,
  longest_streak integer,
  puzzles_completed integer,
  duels_played integer,
  duels_won integer,
  ranked_played integer,
  ranked_won integer,
  best_easy_time integer,
  best_medium_time integer,
  best_hard_time integer,
  best_expert_time integer,
  best_master_time integer
)
language sql
security definer
set search_path = public
as $$
  with viewer_block_state as (
    select coalesce(public.users_are_blocked(auth.uid(), p_user_id), false) as blocked
  ),
  duel_totals as (
    select
      count(*)::integer as duels_played,
      count(*) filter (where winner_user_id = p_user_id)::integer as duels_won
    from (
      select dd.winner_user_id
      from public.daily_duels dd
      where dd.status = 'completed'
        and (dd.player_a_id = p_user_id or dd.player_b_id = p_user_id)

      union all

      select rd.winner_user_id
      from public.ranked_duels rd
      where rd.status = 'completed'
        and (rd.player_a_id = p_user_id or rd.player_b_id = p_user_id)

      union all

      select
        case
          when cr.won = false and tr.won = false then null::uuid
          when cr.won = false and tr.won is distinct from false then fc.challenged_id
          when tr.won = false and cr.won is distinct from false then fc.challenger_id
          when coalesce(cr.final_score, 0) > coalesce(tr.final_score, 0) then fc.challenger_id
          when coalesce(tr.final_score, 0) > coalesce(cr.final_score, 0) then fc.challenged_id
          when coalesce(cr.elapsed_seconds, 2147483647) < coalesce(tr.elapsed_seconds, 2147483647) then fc.challenger_id
          when coalesce(tr.elapsed_seconds, 2147483647) < coalesce(cr.elapsed_seconds, 2147483647) then fc.challenged_id
          when cr.completed_at < tr.completed_at then fc.challenger_id
          when tr.completed_at < cr.completed_at then fc.challenged_id
          else null::uuid
        end as winner_user_id
      from public.friend_challenges fc
      join public.game_results cr on cr.result_id = fc.challenger_result_id
      join public.game_results tr on tr.result_id = fc.challenged_result_id
      where fc.status = 'completed'
        and fc.challenger_result_id is not null
        and fc.challenged_result_id is not null
        and cr.mode = 'friend_challenge'
        and tr.mode = 'friend_challenge'
        and cr.completed = true
        and tr.completed = true
        and (fc.challenger_id = p_user_id or fc.challenged_id = p_user_id)
    ) completed_duels
  ),
  ranked_totals as (
    select
      count(*)::integer as ranked_played,
      count(*) filter (where rd.winner_user_id = p_user_id)::integer as ranked_won
    from public.ranked_duels rd
    where rd.status = 'completed'
      and (rd.player_a_id = p_user_id or rd.player_b_id = p_user_id)
  )
  select
    p.id as user_id,
    p.username,
    p.display_name,
    p.username_handle,
    p.initials,
    p.avatar_color,
    p.avatar_symbol,
    p.avatar_style_version,
    p.avatar_bg_color,
    p.avatar_initials,
    p.avatar_skin_tone,
    p.avatar_hair_style,
    p.avatar_hair_color,
    p.avatar_top_style,
    p.avatar_top_color,
    p.avatar_accessory,
    p.avatar_frame,
    coalesce(us.public_profile, true) as public_profile,
    case
      when vbs.blocked then false
      else coalesce(us.show_stats_publicly, true)
    end as show_stats_publicly,
    case
      when vbs.blocked then false
      else coalesce(us.show_recent_results_publicly, false)
    end as show_recent_results_publicly,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.rank_tier
      else null
    end as rank_tier,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.current_streak
      else null
    end as current_streak,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.longest_streak
      else null
    end as longest_streak,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.puzzles_completed
      else null
    end as puzzles_completed,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then coalesce(dt.duels_played, 0)
      else null
    end as duels_played,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then coalesce(dt.duels_won, 0)
      else null
    end as duels_won,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then coalesce(rt.ranked_played, 0)
      else null
    end as ranked_played,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then coalesce(rt.ranked_won, 0)
      else null
    end as ranked_won,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.best_easy_time
      else null
    end as best_easy_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.best_medium_time
      else null
    end as best_medium_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.best_hard_time
      else null
    end as best_hard_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.best_expert_time
      else null
    end as best_expert_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true) and not vbs.blocked
        then ps.best_master_time
      else null
    end as best_master_time
  from public.profiles p
  left join public.user_settings us on us.user_id = p.id
  left join public.player_stats ps on ps.user_id = p.id
  left join duel_totals dt on true
  left join ranked_totals rt on true
  cross join viewer_block_state vbs
  where p.id = p_user_id;
$$;

create or replace function public.get_public_player_recent_results(
  p_user_id uuid,
  p_limit integer default 8
)
returns table (
  result_id text,
  session_id uuid,
  puzzle_id text,
  mode text,
  difficulty text,
  won boolean,
  elapsed_seconds integer,
  mistakes integer,
  hints_used integer,
  undo_count integer,
  final_score integer,
  xp_earned integer,
  rp_change integer,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    gr.result_id,
    gr.session_id,
    gr.puzzle_id,
    gr.mode,
    gr.difficulty,
    gr.won,
    gr.elapsed_seconds,
    gr.mistakes,
    gr.hints_used,
    gr.undo_count,
    gr.final_score,
    gr.xp_earned,
    gr.rp_change,
    gr.completed_at
  from public.game_results gr
  left join public.user_settings us on us.user_id = gr.user_id
  where gr.user_id = p_user_id
    and gr.completed = true
    and coalesce(us.public_profile, true)
    and coalesce(us.show_recent_results_publicly, false)
    and not public.users_are_blocked(auth.uid(), gr.user_id)
  order by gr.completed_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 20));
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
    where (fc.challenger_id = auth.uid() or fc.challenged_id = auth.uid())
      and not public.users_are_blocked(
        auth.uid(),
        case when fc.challenger_id = auth.uid() then fc.challenged_id else fc.challenger_id end
      )
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
      tr.completed_at as challenged_completed_at,
      cr.won as challenger_won,
      tr.won as challenged_won
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
      when s.challenger_won = false and s.challenged_won = false then null
      when s.challenger_won = false and s.challenged_won is distinct from false then s.challenged_id
      when s.challenged_won = false and s.challenger_won is distinct from false then s.challenger_id
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
      and not public.users_are_blocked(auth.uid(), p_friend_id)
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
