-- Expand launch achievements and centralise server-side badge progress.
-- Existing badge_ids are preserved; user_achievements rows are not deleted.

alter table public.achievements
  drop constraint if exists achievements_category_check;

alter table public.achievements
  add constraint achievements_category_check
  check (category in (
    'Starter',
    'Streak',
    'Speed',
    'Difficulty',
    'Competitive',
    'Completion',
    'Precision',
    'Daily',
    'Daily Duel',
    'Ranked',
    'Friend Challenge',
    'Consistency',
    'Social',
    'Mastery'
  ));

alter table public.achievements
  add column if not exists rarity text not null default 'common';

alter table public.achievements
  drop constraint if exists achievements_rarity_check;

alter table public.achievements
  add constraint achievements_rarity_check
  check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary'));

insert into public.achievements (badge_id, name, description, category, icon, progress_target, rarity) values
('first_grid','First Grid','Solve your first puzzle','Starter','1',1,'common'),
('clean_start','Clean Start','Solve a puzzle with no mistakes','Starter','C',1,'common'),
('no_help_needed','No Help Needed','Solve a puzzle with no hints','Starter','N',1,'common'),
('first_duel','First Duel','Complete your first duel','Starter','D',1,'common'),
('first_win','First Win','Win your first duel','Starter','W',1,'common'),
('first_daily','Daily Debut','Solve your first Daily Sudoku','Daily','D',1,'common'),
('first_daily_duel','Duel Debut','Complete your first Daily Duel','Daily Duel','DD',1,'common'),
('first_ranked_duel','Ranked Debut','Complete your first Ranked Duel','Ranked','R',1,'common'),
('first_friend_challenge','Friendly Rival','Complete your first Friend Challenge','Friend Challenge','F',1,'common'),
('first_ranked_win','Ranked Winner','Win your first Ranked Duel','Ranked','RW',1,'common'),
('streak_3','Streak 3','Build a 3-day Daily Sudoku streak','Streak','3',3,'common'),
('streak_7','Streak 7','Build a 7-day Daily Sudoku streak','Streak','7',7,'uncommon'),
('streak_14','Streak 14','Build a 14-day Daily Sudoku streak','Streak','14',14,'rare'),
('streak_30','Streak 30','Build a 30-day Daily Sudoku streak','Streak','30',30,'epic'),
('daily_streak_60','Streak 60','Build a 60-day Daily Sudoku streak','Streak','60',60,'legendary'),
('quick_thinker','Quick Thinker','Solve Easy under 3 minutes','Speed','E',1,'common'),
('sharp_mind','Sharp Mind','Solve Medium under 5 minutes','Speed','M',1,'uncommon'),
('fast_solver','Fast Solver','Solve Hard under 8 minutes','Speed','H',1,'rare'),
('speedrunner','Speedrunner','Solve any puzzle under 2 minutes','Speed','S',1,'rare'),
('speed_expert','Expert Sprint','Solve Expert under 20 minutes','Speed','EX',1,'epic'),
('speed_master','Master Sprint','Solve Master under 30 minutes','Speed','MA',1,'legendary'),
('fast_solve_5','Fast Five','Solve 5 puzzles faster than their target time','Speed','5',5,'rare'),
('easy_clear','Easy Clear','Solve 10 Easy puzzles','Difficulty','E',10,'common'),
('easy_25','Easy 25','Solve 25 Easy puzzles','Difficulty','25',25,'uncommon'),
('easy_100','Easy 100','Solve 100 Easy puzzles','Difficulty','100',100,'epic'),
('medium_clear','Medium Clear','Solve 10 Medium puzzles','Difficulty','M',10,'common'),
('medium_25','Medium 25','Solve 25 Medium puzzles','Difficulty','25',25,'uncommon'),
('medium_100','Medium 100','Solve 100 Medium puzzles','Difficulty','100',100,'epic'),
('hard_clear','Hard Clear','Solve 10 Hard puzzles','Difficulty','H',10,'uncommon'),
('hard_25','Hard 25','Solve 25 Hard puzzles','Difficulty','25',25,'rare'),
('hard_100','Hard 100','Solve 100 Hard puzzles','Difficulty','100',100,'legendary'),
('expert_solver','Expert Solver','Solve your first Expert puzzle','Difficulty','X',1,'uncommon'),
('expert_10','Expert 10','Solve 10 Expert puzzles','Difficulty','10',10,'rare'),
('expert_25','Expert 25','Solve 25 Expert puzzles','Difficulty','25',25,'epic'),
('master_solver','Master Solver','Solve your first Master puzzle','Difficulty','M',1,'rare'),
('master_10','Master 10','Solve 10 Master puzzles','Difficulty','10',10,'epic'),
('master_25','Master 25','Solve 25 Master puzzles','Difficulty','25',25,'legendary'),
('duelist','Duelist','Win 5 duels','Competitive','D',5,'uncommon'),
('contender','Contender','Win 25 duels','Competitive','C',25,'rare'),
('ranked_ready','Ranked Ready','Complete 5 Ranked Duels','Competitive','R',5,'uncommon'),
('gold_mind','Gold Mind','Reach Gold rank','Competitive','G',850,'epic'),
('diamond_mind','Diamond Mind','Reach Diamond rank','Competitive','D',2350,'legendary'),
('perfect_duel','Perfect Duel','Win a duel with no mistakes and no hints','Competitive','P',1,'rare'),
('bronze_rank','Bronze Badge','Reach Bronze rank','Ranked','B',1,'common'),
('silver_rank','Silver Badge','Reach Silver rank','Ranked','S',350,'uncommon'),
('platinum_rank','Platinum Badge','Reach Platinum rank','Ranked','P',1500,'epic'),
('master_rank','Master Badge','Reach Master rank','Ranked','M',3500,'legendary'),
('ranked_win_5','Ranked 5 Wins','Win 5 Ranked Duels','Ranked','5',5,'uncommon'),
('ranked_win_10','Ranked 10 Wins','Win 10 Ranked Duels','Ranked','10',10,'rare'),
('ranked_win_25','Ranked 25 Wins','Win 25 Ranked Duels','Ranked','25',25,'epic'),
('ranked_win_50','Ranked 50 Wins','Win 50 Ranked Duels','Ranked','50',50,'legendary'),
('ranked_match_10','Ranked 10','Complete 10 Ranked Duels','Ranked','10',10,'uncommon'),
('ranked_match_25','Ranked 25','Complete 25 Ranked Duels','Ranked','25',25,'rare'),
('ranked_match_50','Ranked 50','Complete 50 Ranked Duels','Ranked','50',50,'epic'),
('ranked_clean_win','Clean Ranked Win','Win a Ranked Duel with no mistakes and no hints','Ranked','CR',1,'rare'),
('puzzle_10','Puzzle 10','Solve 10 puzzles','Completion','10',10,'common'),
('puzzle_50','Puzzle 50','Solve 50 puzzles','Completion','50',50,'uncommon'),
('puzzle_100','Puzzle 100','Solve 100 puzzles','Completion','100',100,'rare'),
('puzzle_500','Puzzle 500','Solve 500 puzzles','Completion','500',500,'legendary'),
('classic_5','Classic 5','Solve 5 Classic puzzles','Completion','5',5,'common'),
('classic_25','Classic 25','Solve 25 Classic puzzles','Completion','25',25,'uncommon'),
('classic_50','Classic 50','Solve 50 Classic puzzles','Completion','50',50,'rare'),
('classic_100','Classic 100','Solve 100 Classic puzzles','Completion','100',100,'epic'),
('classic_250','Classic 250','Solve 250 Classic puzzles','Completion','250',250,'legendary'),
('daily_3','Daily 3','Solve 3 Daily Sudokus','Daily','3',3,'common'),
('daily_7','Daily 7','Solve 7 Daily Sudokus','Daily','7',7,'uncommon'),
('daily_14','Daily 14','Solve 14 Daily Sudokus','Daily','14',14,'rare'),
('daily_30','Daily 30','Solve 30 Daily Sudokus','Daily','30',30,'epic'),
('daily_50','Daily 50','Solve 50 Daily Sudokus','Daily','50',50,'legendary'),
('daily_duel_5','Daily Duel 5','Complete 5 Daily Duels','Daily Duel','5',5,'common'),
('daily_duel_10','Daily Duel 10','Complete 10 Daily Duels','Daily Duel','10',10,'uncommon'),
('daily_duel_25','Daily Duel 25','Complete 25 Daily Duels','Daily Duel','25',25,'rare'),
('daily_duel_50','Daily Duel 50','Complete 50 Daily Duels','Daily Duel','50',50,'epic'),
('daily_duel_win_5','Daily Duel 5 Wins','Win 5 Daily Duels','Daily Duel','5W',5,'uncommon'),
('daily_duel_win_10','Daily Duel 10 Wins','Win 10 Daily Duels','Daily Duel','10',10,'rare'),
('daily_duel_win_25','Daily Duel 25 Wins','Win 25 Daily Duels','Daily Duel','25',25,'epic'),
('daily_duel_clean_win','Clean Daily Duel','Win a Daily Duel with no mistakes and no hints','Daily Duel','CD',1,'rare'),
('friend_challenge_5','Challenge 5','Complete 5 Friend Challenges','Friend Challenge','5',5,'common'),
('friend_challenge_10','Challenge 10','Complete 10 Friend Challenges','Friend Challenge','10',10,'uncommon'),
('friend_challenge_25','Challenge 25','Complete 25 Friend Challenges','Friend Challenge','25',25,'rare'),
('friend_challenge_win_5','Friend Wins 5','Win 5 Friend Challenges','Friend Challenge','5W',5,'uncommon'),
('friend_challenge_win_10','Friend Wins 10','Win 10 Friend Challenges','Friend Challenge','10',10,'rare'),
('friend_challenge_win_25','Friend Wins 25','Win 25 Friend Challenges','Friend Challenge','25',25,'epic'),
('first_h2h_win','Head-to-Head Win','Win your first Friend Challenge','Friend Challenge','H2',1,'common'),
('flawless','Flawless','Solve 1 puzzle with no mistakes','Precision','F',1,'common'),
('flawless_10','Flawless 10','Solve 10 flawless puzzles','Precision','10',10,'uncommon'),
('flawless_25','Flawless 25','Solve 25 flawless puzzles','Precision','25',25,'rare'),
('flawless_50','Flawless 50','Solve 50 flawless puzzles','Precision','50',50,'epic'),
('no_hint_5','No-Hint 5','Solve 5 puzzles with no hints','Precision','5',5,'common'),
('no_hint_10','No-Hint 10','Solve 10 puzzles with no hints','Precision','10',10,'uncommon'),
('no_hint_25','No-Hint 25','Solve 25 puzzles with no hints','Precision','25',25,'rare'),
('no_hint_50','No-Hint 50','Solve 50 puzzles with no hints','Precision','50',50,'epic'),
('pure_logic','Pure Logic','Solve a Hard puzzle with no mistakes and no hints','Precision','H',1,'rare'),
('mastermind','Mastermind','Solve an Expert puzzle with no mistakes and no hints','Precision','X',1,'epic'),
('flawless_expert','Flawless Expert','Solve an Expert puzzle with no mistakes','Precision','FX',1,'rare'),
('flawless_master','Flawless Master','Solve a Master puzzle with no mistakes','Precision','FM',1,'epic'),
('no_hint_expert','No-Hint Expert','Solve an Expert puzzle with no hints','Precision','NX',1,'rare'),
('no_hint_master','No-Hint Master','Solve a Master puzzle with no hints','Precision','NM',1,'epic'),
('hard_clean_10','Hard Clean 10','Solve 10 Hard puzzles with no mistakes and no hints','Precision','10',10,'epic'),
('expert_clean_5','Expert Clean 5','Solve 5 Expert puzzles with no mistakes and no hints','Precision','5',5,'epic'),
('master_clean','Clean Master','Solve a Master puzzle with no mistakes and no hints','Precision','CM',1,'legendary'),
('consistency_day_3','Triple Day','Solve 3 puzzles in one day','Consistency','3',3,'common'),
('consistency_day_5','Five in a Day','Solve 5 puzzles in one day','Consistency','5',5,'uncommon'),
('active_days_3','Three Active Days','Solve puzzles on 3 different days','Consistency','3D',3,'common'),
('active_days_7','Seven Active Days','Solve puzzles on 7 different days','Consistency','7D',7,'uncommon'),
('active_days_30','Thirty Active Days','Solve puzzles on 30 different days','Consistency','30',30,'epic'),
('profile_complete','Profile Ready','Complete your profile setup','Social','P',1,'common'),
('avatar_customized','Fresh Look','Customize your avatar','Social','A',1,'common'),
('first_friend','First Friend','Add your first friend','Social','F',1,'common'),
('friends_5','Circle of Five','Add 5 friends','Social','5',5,'uncommon'),
('level_5','Level 5','Reach Mastery Level 5','Mastery','L5',5,'common'),
('level_10','Level 10','Reach Mastery Level 10','Mastery','L10',10,'uncommon'),
('level_25','Level 25','Reach Mastery Level 25','Mastery','L25',25,'epic'),
('xp_10000','10K XP','Earn 10,000 total Mastery XP','Mastery','10K',10000,'rare'),
('xp_50000','50K XP','Earn 50,000 total Mastery XP','Mastery','50K',50000,'legendary')
on conflict (badge_id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  progress_target = excluded.progress_target,
  rarity = excluded.rarity,
  updated_at = now();

create or replace function public.refresh_user_achievements(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    return v_changed;
  end if;

  insert into public.user_achievements (user_id, badge_id, unlocked, progress_current)
  select p_user_id, a.badge_id, false, 0
  from public.achievements a
  on conflict (user_id, badge_id) do nothing;

  with deduped_results as (
    select *
    from (
      select gr.*,
        row_number() over (
          partition by gr.user_id, gr.mode, gr.difficulty, coalesce(gr.puzzle_id, ''),
                       gr.completed_at, coalesce(gr.elapsed_seconds, 0), coalesce(gr.final_score, 0)
          order by (gr.session_id is null), gr.result_id
        ) as duplicate_rank
      from public.game_results gr
      where gr.user_id = p_user_id
        and gr.completed = true
    ) rows
    where duplicate_rank = 1
  ),
  solved_results as (
    select *
    from deduped_results dr
    where dr.won is true
  ),
  daily_days as (
    select distinct sr.completed_at::date as solved_day
    from solved_results sr
    where sr.mode = 'daily'
      and sr.completed_at is not null
  ),
  daily_streak_groups as (
    select solved_day,
      solved_day - (row_number() over (order by solved_day))::integer as streak_group
    from daily_days
  ),
  daily_streak as (
    select coalesce(max(day_count), 0)::integer as longest_daily_streak
    from (
      select count(*)::integer as day_count
      from daily_streak_groups
      group by streak_group
    ) grouped
  ),
  daily_duel_matches as (
    select dd.duel_id,
      dd.winner_user_id,
      dd.completed_at,
      case when dd.player_a_id = p_user_id then dd.player_a_result_id else dd.player_b_result_id end as result_id
    from public.daily_duels dd
    where dd.status = 'completed'
      and (dd.player_a_id = p_user_id or dd.player_b_id = p_user_id)
  ),
  ranked_matches as (
    select rd.ranked_duel_id,
      rd.winner_user_id,
      rd.completed_at,
      case when rd.player_a_id = p_user_id then rd.player_a_result_id else rd.player_b_result_id end as result_id
    from public.ranked_duels rd
    where rd.status = 'completed'
      and (rd.player_a_id = p_user_id or rd.player_b_id = p_user_id)
  ),
  friend_matches as (
    select fc.challenge_id,
      fc.completed_at,
      case
        when coalesce(cr.won, coalesce(cr.final_score, 0) > 0) = false
          and coalesce(rr.won, coalesce(rr.final_score, 0) > 0) = false then null::uuid
        when coalesce(cr.won, coalesce(cr.final_score, 0) > 0) = true
          and coalesce(rr.won, coalesce(rr.final_score, 0) > 0) = false then fc.challenger_id
        when coalesce(cr.won, coalesce(cr.final_score, 0) > 0) = false
          and coalesce(rr.won, coalesce(rr.final_score, 0) > 0) = true then fc.challenged_id
        when coalesce(cr.final_score, 0) > coalesce(rr.final_score, 0) then fc.challenger_id
        when coalesce(rr.final_score, 0) > coalesce(cr.final_score, 0) then fc.challenged_id
        when coalesce(cr.elapsed_seconds, 999999) < coalesce(rr.elapsed_seconds, 999999) then fc.challenger_id
        when coalesce(rr.elapsed_seconds, 999999) < coalesce(cr.elapsed_seconds, 999999) then fc.challenged_id
        when cr.completed_at < rr.completed_at then fc.challenger_id
        when rr.completed_at < cr.completed_at then fc.challenged_id
        else null::uuid
      end as winner_user_id,
      case when fc.challenger_id = p_user_id then fc.challenger_result_id else fc.challenged_result_id end as result_id
    from public.friend_challenges fc
    left join public.game_results cr on cr.result_id = fc.challenger_result_id
    left join public.game_results rr on rr.result_id = fc.challenged_result_id
    where fc.status = 'completed'
      and (fc.challenger_id = p_user_id or fc.challenged_id = p_user_id)
  ),
  solved_by_day as (
    select sr.completed_at::date as solved_day, count(*)::integer as solved_count
    from solved_results sr
    where sr.completed_at is not null
    group by sr.completed_at::date
  ),
  ranked_profile as (
    select coalesce(max(rp), 0)::integer as rp
    from public.ranked_profiles
    where user_id = p_user_id
  ),
  profile_metrics as (
    select
      case when p.profile_setup_completed = true and nullif(trim(coalesce(p.username_handle, '')), '') is not null then 1 else 0 end as profile_complete,
      case when coalesce(p.avatar_style_version, '') = 'character_v1'
             and (
               p.avatar_bg_color is not null
               or p.avatar_symbol is not null
               or p.avatar_hair_style is not null
               or p.avatar_accessory is not null
               or p.avatar_frame is not null
               or nullif(trim(coalesce(p.avatar_initials, '')), '') is not null
             )
           then 1 else 0 end as avatar_customized
    from public.profiles p
    where p.id = p_user_id
  ),
  friend_metrics as (
    select count(*)::integer as friend_count
    from public.friends f
    where f.user_id = p_user_id
  ),
  metrics as (
    select
      (select count(*)::integer from solved_results) as solved_count,
      (select count(*)::integer from solved_results where mode = 'classic') as classic_count,
      (select count(*)::integer from solved_results where mode = 'daily') as daily_count,
      (select count(*)::integer from solved_results where difficulty = 'Easy') as easy_count,
      (select count(*)::integer from solved_results where difficulty = 'Medium') as medium_count,
      (select count(*)::integer from solved_results where difficulty = 'Hard') as hard_count,
      (select count(*)::integer from solved_results where difficulty = 'Expert') as expert_count,
      (select count(*)::integer from solved_results where difficulty = 'Master') as master_count,
      (select count(*)::integer from solved_results where mistakes = 0) as flawless_count,
      (select count(*)::integer from solved_results where hints_used = 0) as no_hint_count,
      (select count(*)::integer from solved_results where mistakes = 0 and hints_used = 0 and difficulty = 'Hard') as hard_clean_count,
      (select count(*)::integer from solved_results where mistakes = 0 and hints_used = 0 and difficulty = 'Expert') as expert_clean_count,
      (select count(*)::integer from solved_results where mistakes = 0 and hints_used = 0 and difficulty = 'Master') as master_clean_count,
      (select count(*)::integer from solved_results where elapsed_seconds < case difficulty when 'Easy' then 300 when 'Medium' then 540 when 'Hard' then 900 when 'Expert' then 1440 when 'Master' then 2100 else 999999 end) as fast_target_count,
      (select count(*)::integer from daily_duel_matches) as daily_duel_count,
      (select count(*)::integer from daily_duel_matches where winner_user_id = p_user_id) as daily_duel_win_count,
      (select count(*)::integer from ranked_matches) as ranked_match_count,
      (select count(*)::integer from ranked_matches where winner_user_id = p_user_id) as ranked_win_count,
      (select count(*)::integer from friend_matches) as friend_challenge_count,
      (select count(*)::integer from friend_matches where winner_user_id = p_user_id) as friend_challenge_win_count,
      (select coalesce(max(solved_count), 0)::integer from solved_by_day) as max_solves_in_day,
      (select count(*)::integer from solved_by_day) as active_days,
      (select longest_daily_streak from daily_streak) as longest_daily_streak,
      (select rp from ranked_profile) as current_rp,
      coalesce((select profile_complete from profile_metrics), 0) as profile_complete,
      coalesce((select avatar_customized from profile_metrics), 0) as avatar_customized,
      coalesce((select friend_count from friend_metrics), 0) as friend_count,
      coalesce((select account_level from public.player_stats where user_id = p_user_id), 1)::integer as account_level,
      coalesce((select total_mastery_xp from public.player_stats where user_id = p_user_id), 0)::integer as total_mastery_xp,
      exists (select 1 from solved_results where difficulty = 'Easy' and elapsed_seconds < 180) as fast_easy,
      exists (select 1 from solved_results where difficulty = 'Medium' and elapsed_seconds < 300) as fast_medium,
      exists (select 1 from solved_results where difficulty = 'Hard' and elapsed_seconds < 480) as fast_hard,
      exists (select 1 from solved_results where difficulty = 'Expert' and elapsed_seconds < 1200) as fast_expert,
      exists (select 1 from solved_results where difficulty = 'Master' and elapsed_seconds < 1800) as fast_master,
      exists (select 1 from solved_results where elapsed_seconds < 120) as any_sub_2,
      exists (select 1 from daily_duel_matches dd join public.game_results gr on gr.result_id = dd.result_id where dd.winner_user_id = p_user_id and gr.mistakes = 0 and gr.hints_used = 0) as daily_duel_clean_win,
      exists (select 1 from ranked_matches rm join public.game_results gr on gr.result_id = rm.result_id where rm.winner_user_id = p_user_id and gr.mistakes = 0 and gr.hints_used = 0) as ranked_clean_win,
      exists (select 1 from friend_matches fm join public.game_results gr on gr.result_id = fm.result_id where fm.winner_user_id = p_user_id and gr.mistakes = 0 and gr.hints_used = 0) as friend_clean_win,
      exists (select 1 from solved_results where difficulty = 'Expert' and mistakes = 0) as flawless_expert,
      exists (select 1 from solved_results where difficulty = 'Master' and mistakes = 0) as flawless_master,
      exists (select 1 from solved_results where difficulty = 'Expert' and hints_used = 0) as no_hint_expert,
      exists (select 1 from solved_results where difficulty = 'Master' and hints_used = 0) as no_hint_master
  ),
  progress as (
    select ua.badge_id,
      least(a.progress_target, greatest(0, case ua.badge_id
        when 'first_grid' then metrics.solved_count
        when 'clean_start' then metrics.flawless_count
        when 'no_help_needed' then metrics.no_hint_count
        when 'first_duel' then metrics.daily_duel_count + metrics.friend_challenge_count + metrics.ranked_match_count
        when 'first_win' then metrics.daily_duel_win_count + metrics.friend_challenge_win_count + metrics.ranked_win_count
        when 'first_daily' then metrics.daily_count
        when 'first_daily_duel' then metrics.daily_duel_count
        when 'first_ranked_duel' then metrics.ranked_match_count
        when 'first_friend_challenge' then metrics.friend_challenge_count
        when 'first_ranked_win' then metrics.ranked_win_count
        when 'streak_3' then metrics.longest_daily_streak
        when 'streak_7' then metrics.longest_daily_streak
        when 'streak_14' then metrics.longest_daily_streak
        when 'streak_30' then metrics.longest_daily_streak
        when 'daily_streak_60' then metrics.longest_daily_streak
        when 'quick_thinker' then case when metrics.fast_easy then 1 else 0 end
        when 'sharp_mind' then case when metrics.fast_medium then 1 else 0 end
        when 'fast_solver' then case when metrics.fast_hard then 1 else 0 end
        when 'speedrunner' then case when metrics.any_sub_2 then 1 else 0 end
        when 'speed_expert' then case when metrics.fast_expert then 1 else 0 end
        when 'speed_master' then case when metrics.fast_master then 1 else 0 end
        when 'fast_solve_5' then metrics.fast_target_count
        when 'easy_clear' then metrics.easy_count
        when 'easy_25' then metrics.easy_count
        when 'easy_100' then metrics.easy_count
        when 'medium_clear' then metrics.medium_count
        when 'medium_25' then metrics.medium_count
        when 'medium_100' then metrics.medium_count
        when 'hard_clear' then metrics.hard_count
        when 'hard_25' then metrics.hard_count
        when 'hard_100' then metrics.hard_count
        when 'expert_solver' then metrics.expert_count
        when 'expert_10' then metrics.expert_count
        when 'expert_25' then metrics.expert_count
        when 'master_solver' then metrics.master_count
        when 'master_10' then metrics.master_count
        when 'master_25' then metrics.master_count
        when 'duelist' then metrics.daily_duel_win_count + metrics.friend_challenge_win_count + metrics.ranked_win_count
        when 'contender' then metrics.daily_duel_win_count + metrics.friend_challenge_win_count + metrics.ranked_win_count
        when 'ranked_ready' then metrics.ranked_match_count
        when 'gold_mind' then case when metrics.current_rp >= 850 then a.progress_target else metrics.current_rp end
        when 'diamond_mind' then case when metrics.current_rp >= 2350 then a.progress_target else metrics.current_rp end
        when 'perfect_duel' then case when metrics.daily_duel_clean_win or metrics.ranked_clean_win or metrics.friend_clean_win then 1 else 0 end
        when 'bronze_rank' then 1
        when 'silver_rank' then case when metrics.current_rp >= 350 then a.progress_target else metrics.current_rp end
        when 'platinum_rank' then case when metrics.current_rp >= 1500 then a.progress_target else metrics.current_rp end
        when 'master_rank' then case when metrics.current_rp >= 3500 then a.progress_target else metrics.current_rp end
        when 'ranked_win_5' then metrics.ranked_win_count
        when 'ranked_win_10' then metrics.ranked_win_count
        when 'ranked_win_25' then metrics.ranked_win_count
        when 'ranked_win_50' then metrics.ranked_win_count
        when 'ranked_match_10' then metrics.ranked_match_count
        when 'ranked_match_25' then metrics.ranked_match_count
        when 'ranked_match_50' then metrics.ranked_match_count
        when 'ranked_clean_win' then case when metrics.ranked_clean_win then 1 else 0 end
        when 'puzzle_10' then metrics.solved_count
        when 'puzzle_50' then metrics.solved_count
        when 'puzzle_100' then metrics.solved_count
        when 'puzzle_500' then metrics.solved_count
        when 'classic_5' then metrics.classic_count
        when 'classic_25' then metrics.classic_count
        when 'classic_50' then metrics.classic_count
        when 'classic_100' then metrics.classic_count
        when 'classic_250' then metrics.classic_count
        when 'daily_3' then metrics.daily_count
        when 'daily_7' then metrics.daily_count
        when 'daily_14' then metrics.daily_count
        when 'daily_30' then metrics.daily_count
        when 'daily_50' then metrics.daily_count
        when 'daily_duel_5' then metrics.daily_duel_count
        when 'daily_duel_10' then metrics.daily_duel_count
        when 'daily_duel_25' then metrics.daily_duel_count
        when 'daily_duel_50' then metrics.daily_duel_count
        when 'daily_duel_win_5' then metrics.daily_duel_win_count
        when 'daily_duel_win_10' then metrics.daily_duel_win_count
        when 'daily_duel_win_25' then metrics.daily_duel_win_count
        when 'daily_duel_clean_win' then case when metrics.daily_duel_clean_win then 1 else 0 end
        when 'friend_challenge_5' then metrics.friend_challenge_count
        when 'friend_challenge_10' then metrics.friend_challenge_count
        when 'friend_challenge_25' then metrics.friend_challenge_count
        when 'friend_challenge_win_5' then metrics.friend_challenge_win_count
        when 'friend_challenge_win_10' then metrics.friend_challenge_win_count
        when 'friend_challenge_win_25' then metrics.friend_challenge_win_count
        when 'first_h2h_win' then metrics.friend_challenge_win_count
        when 'flawless' then metrics.flawless_count
        when 'flawless_10' then metrics.flawless_count
        when 'flawless_25' then metrics.flawless_count
        when 'flawless_50' then metrics.flawless_count
        when 'no_hint_5' then metrics.no_hint_count
        when 'no_hint_10' then metrics.no_hint_count
        when 'no_hint_25' then metrics.no_hint_count
        when 'no_hint_50' then metrics.no_hint_count
        when 'pure_logic' then case when metrics.hard_clean_count > 0 then 1 else 0 end
        when 'mastermind' then case when metrics.expert_clean_count > 0 then 1 else 0 end
        when 'flawless_expert' then case when metrics.flawless_expert then 1 else 0 end
        when 'flawless_master' then case when metrics.flawless_master then 1 else 0 end
        when 'no_hint_expert' then case when metrics.no_hint_expert then 1 else 0 end
        when 'no_hint_master' then case when metrics.no_hint_master then 1 else 0 end
        when 'hard_clean_10' then metrics.hard_clean_count
        when 'expert_clean_5' then metrics.expert_clean_count
        when 'master_clean' then case when metrics.master_clean_count > 0 then 1 else 0 end
        when 'consistency_day_3' then metrics.max_solves_in_day
        when 'consistency_day_5' then metrics.max_solves_in_day
        when 'active_days_3' then metrics.active_days
        when 'active_days_7' then metrics.active_days
        when 'active_days_30' then metrics.active_days
        when 'profile_complete' then metrics.profile_complete
        when 'avatar_customized' then metrics.avatar_customized
        when 'first_friend' then metrics.friend_count
        when 'friends_5' then metrics.friend_count
        when 'level_5' then metrics.account_level
        when 'level_10' then metrics.account_level
        when 'level_25' then metrics.account_level
        when 'xp_10000' then metrics.total_mastery_xp
        when 'xp_50000' then metrics.total_mastery_xp
        else ua.progress_current
      end))::integer as next_progress
    from public.user_achievements ua
    join public.achievements a on a.badge_id = ua.badge_id
    cross join metrics
    where ua.user_id = p_user_id
  ),
  changed as (
    update public.user_achievements ua
    set progress_current = progress.next_progress,
        unlocked = ua.unlocked or progress.next_progress >= a.progress_target,
        unlocked_at = case
          when not ua.unlocked and progress.next_progress >= a.progress_target then now()
          else ua.unlocked_at
        end,
        updated_at = now()
    from progress
    join public.achievements a on a.badge_id = progress.badge_id
    where ua.user_id = p_user_id
      and ua.badge_id = progress.badge_id
    returning ua.badge_id, ua.unlocked_at, a.name, a.icon, a.description, a.category, a.rarity, a.progress_target, ua.progress_current, ua.unlocked
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'badge_id', changed.badge_id,
    'name', changed.name,
    'icon', changed.icon,
    'description', changed.description,
    'category', changed.category,
    'rarity', changed.rarity,
    'progress_target', changed.progress_target,
    'progress_current', changed.progress_current,
    'unlocked', changed.unlocked,
    'unlocked_at', changed.unlocked_at
  )), '[]'::jsonb)
    into v_changed
  from changed
  where changed.unlocked = true
    and changed.unlocked_at is not null
    and changed.unlocked_at >= now() - interval '5 seconds';

  return v_changed;
end;
$$;

grant execute on function public.refresh_user_achievements(uuid) to authenticated;

create or replace function public.refresh_user_achievements_from_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_game_results on public.game_results;
create trigger refresh_user_achievements_game_results
after insert or update of completed, won, mode, difficulty, elapsed_seconds, mistakes, hints_used, final_score, completed_at
on public.game_results
for each row execute function public.refresh_user_achievements_from_result();

create or replace function public.refresh_user_achievements_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_profiles on public.profiles;
create trigger refresh_user_achievements_profiles
after insert or update of profile_setup_completed, username_handle, avatar_bg_color, avatar_initials, avatar_hair_style, avatar_accessory, avatar_frame
on public.profiles
for each row execute function public.refresh_user_achievements_from_profile();

create or replace function public.refresh_user_achievements_from_friends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.refresh_user_achievements(old.user_id);
    perform public.refresh_user_achievements(old.friend_id);
    return old;
  end if;

  perform public.refresh_user_achievements(new.user_id);
  perform public.refresh_user_achievements(new.friend_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_friends on public.friends;
create trigger refresh_user_achievements_friends
after insert or update or delete
on public.friends
for each row execute function public.refresh_user_achievements_from_friends();

create or replace function public.refresh_user_achievements_from_daily_duel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.player_a_id);
  perform public.refresh_user_achievements(new.player_b_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_daily_duels on public.daily_duels;
create trigger refresh_user_achievements_daily_duels
after insert or update of status, winner_user_id, player_a_result_id, player_b_result_id, completed_at
on public.daily_duels
for each row execute function public.refresh_user_achievements_from_daily_duel();

create or replace function public.refresh_user_achievements_from_friend_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.challenger_id);
  perform public.refresh_user_achievements(new.challenged_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_friend_challenges on public.friend_challenges;
create trigger refresh_user_achievements_friend_challenges
after insert or update of status, challenger_result_id, challenged_result_id, completed_at
on public.friend_challenges
for each row execute function public.refresh_user_achievements_from_friend_challenge();

create or replace function public.refresh_user_achievements_from_ranked_duel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.player_a_id);
  perform public.refresh_user_achievements(new.player_b_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_ranked_duels on public.ranked_duels;
create trigger refresh_user_achievements_ranked_duels
after insert or update of status, winner_user_id, player_a_result_id, player_b_result_id, completed_at
on public.ranked_duels
for each row execute function public.refresh_user_achievements_from_ranked_duel();

create or replace function public.refresh_user_achievements_from_ranked_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_ranked_profiles on public.ranked_profiles;
create trigger refresh_user_achievements_ranked_profiles
after insert or update of rp, current_tier, wins, matches_played
on public.ranked_profiles
for each row execute function public.refresh_user_achievements_from_ranked_profile();

create or replace function public.refresh_user_achievements_from_player_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists refresh_user_achievements_player_stats on public.player_stats;
create trigger refresh_user_achievements_player_stats
after insert or update of total_mastery_xp, account_level
on public.player_stats
for each row execute function public.refresh_user_achievements_from_player_stats();

insert into public.user_achievements (user_id, badge_id, unlocked, progress_current)
select u.id, a.badge_id, false, 0
from auth.users u
cross join public.achievements a
on conflict (user_id, badge_id) do nothing;

do $$
declare
  v_user record;
begin
  for v_user in select id from auth.users loop
    perform public.refresh_user_achievements(v_user.id);
  end loop;
end;
$$;
