-- Public player profile route support.
-- Exposes a privacy-aware read-only player profile shell plus optional recent results.
-- This is limited to non-sensitive public display fields and respects user_settings privacy flags.

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
    coalesce(us.show_stats_publicly, true) as show_stats_publicly,
    coalesce(us.show_recent_results_publicly, false) as show_recent_results_publicly,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.rank_tier
      else null
    end as rank_tier,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.current_streak
      else null
    end as current_streak,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.longest_streak
      else null
    end as longest_streak,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.puzzles_completed
      else null
    end as puzzles_completed,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.duels_played
      else null
    end as duels_played,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.duels_won
      else null
    end as duels_won,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.ranked_played
      else null
    end as ranked_played,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.ranked_won
      else null
    end as ranked_won,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_easy_time
      else null
    end as best_easy_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_medium_time
      else null
    end as best_medium_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_hard_time
      else null
    end as best_hard_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_expert_time
      else null
    end as best_expert_time,
    case
      when coalesce(us.public_profile, true) and coalesce(us.show_stats_publicly, true)
        then ps.best_master_time
      else null
    end as best_master_time
  from public.profiles p
  left join public.user_settings us on us.user_id = p.id
  left join public.player_stats ps on ps.user_id = p.id
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
  order by gr.completed_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$$;

grant execute on function public.get_public_player_profile(uuid) to authenticated;
grant execute on function public.get_public_player_recent_results(uuid, integer) to authenticated;
