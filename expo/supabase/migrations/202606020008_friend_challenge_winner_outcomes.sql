-- Keep Friend Challenge result comparisons user-facing when failed attempts are final.
-- A failed side has game_results.won = false. Solved challenge completions may have
-- won = null because head-to-head outcome is determined after both sides finish.

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

grant execute on function public.get_friend_challenges() to authenticated;
