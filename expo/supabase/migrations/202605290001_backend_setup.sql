-- Premium Sudoku Supabase backend setup

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Profiles ────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Player' check (char_length(username) between 1 and 20),
  initials text not null default 'PL' check (char_length(initials) between 1 and 4),
  avatar_color text not null default '#C9A24B',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Player stats ────────────────────────────────────────────────────

create table if not exists public.player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_mastery_xp integer not null default 0 check (total_mastery_xp >= 0),
  account_level integer not null default 1 check (account_level >= 1),
  rank_points integer not null default 0 check (rank_points >= 0),
  rank_tier text not null default 'Bronze III',
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  puzzles_completed integer not null default 0 check (puzzles_completed >= 0),
  flawless_puzzles integer not null default 0 check (flawless_puzzles >= 0),
  total_mistakes integer not null default 0 check (total_mistakes >= 0),
  total_hints_used integer not null default 0 check (total_hints_used >= 0),
  total_undos_used integer not null default 0 check (total_undos_used >= 0),
  duels_played integer not null default 0 check (duels_played >= 0),
  duels_won integer not null default 0 check (duels_won >= 0),
  ranked_played integer not null default 0 check (ranked_played >= 0),
  ranked_won integer not null default 0 check (ranked_won >= 0),
  best_easy_time integer,
  best_medium_time integer,
  best_hard_time integer,
  best_expert_time integer,
  best_master_time integer,
  updated_at timestamptz not null default now()
);

-- ── Puzzles ─────────────────────────────────────────────────────────

create table if not exists public.puzzles (
  puzzle_id text primary key,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Expert','Master')),
  givens text not null check (char_length(givens) = 81),
  solution text not null check (char_length(solution) = 81),
  rating_score integer not null default 1000,
  source text not null default 'seed',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Daily puzzles ────────────────────────────────────────────────────

create table if not exists public.daily_puzzles (
  id bigint generated always as identity primary key,
  date date not null,
  mode text not null check (mode in ('daily','daily_duel')),
  puzzle_id text not null references public.puzzles(puzzle_id) on delete cascade,
  difficulty text not null,
  created_at timestamptz not null default now(),
  unique(date, mode)
);

-- ── Puzzle sessions ─────────────────────────────────────────────────

create table if not exists public.puzzle_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id text references public.puzzles(puzzle_id) on delete set null,
  mode text not null check (mode in ('classic','daily','duel','ranked')),
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Expert','Master')),
  board_state jsonb not null default '{}'::jsonb,
  notes_state jsonb not null default '{}'::jsonb,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  undo_count integer not null default 0 check (undo_count >= 0),
  move_history jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Game results ────────────────────────────────────────────────────

create table if not exists public.game_results (
  result_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  puzzle_id text references public.puzzles(puzzle_id) on delete set null,
  mode text not null check (mode in ('classic','daily','duel','ranked')),
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Expert','Master')),
  completed boolean not null default true,
  won boolean,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  undo_count integer not null default 0 check (undo_count >= 0),
  final_score integer not null default 0 check (final_score >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  rp_change integer not null default 0,
  eligible_for_leaderboard boolean not null default false,
  eligible_for_ranked boolean not null default false,
  completed_at timestamptz not null default now()
);

-- ── Achievements ────────────────────────────────────────────────────

create table if not exists public.achievements (
  badge_id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('Starter','Streak','Speed','Difficulty','Competitive','Completion','Precision')),
  icon text not null default '•',
  progress_target integer not null default 1 check (progress_target > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.achievements(badge_id) on delete cascade,
  unlocked boolean not null default false,
  progress_current integer not null default 0 check (progress_current >= 0),
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ── User settings ───────────────────────────────────────────────────

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminder boolean not null default true,
  streak_reminder boolean not null default true,
  duel_results boolean not null default true,
  ranked_updates boolean not null default false,
  public_profile boolean not null default true,
  show_stats_publicly boolean not null default true,
  show_recent_results_publicly boolean not null default false,
  allow_friend_challenges boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ── Backend RPC: Puzzle Selection ──────────────────────────────────

-- Get a classic puzzle for a user by difficulty, avoiding repeats
create or replace function public.get_classic_puzzle(
  p_user_id uuid,
  p_difficulty text
)
returns table(
  puzzle_id text,
  difficulty text,
  givens text,
  solution text,
  rating_score integer
)
language plpgsql
security definer
as $$
declare
  v_result record;
begin
  -- Try to find an active puzzle not recently completed by this user
  select p.puzzle_id, p.difficulty, p.givens, p.solution, p.rating_score
  into v_result
  from public.puzzles p
  where p.difficulty = p_difficulty
    and p.is_active = true
    and p.puzzle_id not in (
      select gr.puzzle_id from public.game_results gr
      where gr.user_id = p_user_id
        and gr.difficulty = p_difficulty
        and gr.completed = true
      order by gr.completed_at desc
      limit 10
    )
    and p.puzzle_id not in (
      select ps.puzzle_id from public.puzzle_sessions ps
      where ps.user_id = p_user_id
        and ps.status = 'in_progress'
    )
  order by random()
  limit 1;

  -- If found, return it
  if found then
    return query select v_result.puzzle_id, v_result.difficulty, v_result.givens, v_result.solution, v_result.rating_score;
    return;
  end if;

  -- Fallback: allow repeats but pick the oldest completed puzzle
  select p.puzzle_id, p.difficulty, p.givens, p.solution, p.rating_score
  into v_result
  from public.puzzles p
  where p.difficulty = p_difficulty
    and p.is_active = true
  order by p.rating_score asc
  limit 1;

  if found then
    return query select v_result.puzzle_id, v_result.difficulty, v_result.givens, v_result.solution, v_result.rating_score;
  end if;
end;
$$;

-- Get or assign the daily puzzle for a given date and mode
create or replace function public.get_daily_puzzle(
  p_date date,
  p_mode text default 'daily'
)
returns table(
  puzzle_id text,
  difficulty text,
  givens text,
  solution text
)
language plpgsql
security definer
as $$
declare
  v_puzzle_id text;
  v_difficulty text;
  v_givens text;
  v_solution text;
begin
  -- Check if a daily puzzle already exists for this date/mode
  select dp.puzzle_id, dp.difficulty, p.givens, p.solution
  into v_puzzle_id, v_difficulty, v_givens, v_solution
  from public.daily_puzzles dp
  join public.puzzles p on p.puzzle_id = dp.puzzle_id
  where dp.date = p_date and dp.mode = p_mode;

  if found then
    return query select v_puzzle_id, v_difficulty, v_givens, v_solution;
    return;
  end if;

  -- Assign a Medium puzzle for daily, or any active puzzle for daily_duel
  select p.puzzle_id, p.difficulty, p.givens, p.solution
  into v_puzzle_id, v_difficulty, v_givens, v_solution
  from public.puzzles p
  where p.difficulty = 'Medium'
    and p.is_active = true
  order by random()
  limit 1;

  if not found then
    select p.puzzle_id, p.difficulty, p.givens, p.solution
    into v_puzzle_id, v_difficulty, v_givens, v_solution
    from public.puzzles p
    where p.is_active = true
    order by random()
    limit 1;
  end if;

  if found then
    insert into public.daily_puzzles (date, mode, puzzle_id, difficulty)
    values (p_date, p_mode, v_puzzle_id, v_difficulty)
    on conflict (date, mode) do nothing;

    return query select v_puzzle_id, v_difficulty, v_givens, v_solution;
  end if;
end;
$$;

-- ── Indexes ─────────────────────────────────────────────────────────

create index if not exists idx_game_results_user_completed on public.game_results(user_id, completed_at desc);
create index if not exists idx_game_results_session on public.game_results(session_id);
create index if not exists idx_game_results_daily_score on public.game_results(puzzle_id, final_score desc, elapsed_seconds asc, mistakes asc, hints_used asc, undo_count asc) where eligible_for_leaderboard;
create index if not exists idx_player_stats_rank on public.player_stats(rank_points desc);
create index if not exists idx_puzzle_sessions_user_status on public.puzzle_sessions(user_id, status, updated_at desc);
create unique index if not exists idx_puzzle_sessions_one_in_progress_per_user on public.puzzle_sessions(user_id) where status = 'in_progress';
create index if not exists idx_puzzles_difficulty on public.puzzles(difficulty);
create index if not exists idx_puzzles_active_diff on public.puzzles(is_active, difficulty);
create index if not exists idx_daily_puzzles_date_mode on public.daily_puzzles(date, mode);
create index if not exists idx_user_achievements_user on public.user_achievements(user_id, unlocked);

-- ── Repair migration: Evil → Master ─────────────────────────────────

alter table public.puzzles drop constraint if exists puzzles_difficulty_check;
alter table public.puzzles add constraint puzzles_difficulty_check check (difficulty in ('Easy','Medium','Hard','Expert','Master'));

alter table public.puzzle_sessions drop constraint if exists puzzle_sessions_difficulty_check;
alter table public.puzzle_sessions add constraint puzzle_sessions_difficulty_check check (difficulty in ('Easy','Medium','Hard','Expert','Master'));

alter table public.game_results drop constraint if exists game_results_difficulty_check;
alter table public.game_results add constraint game_results_difficulty_check check (difficulty in ('Easy','Medium','Hard','Expert','Master'));

-- Rename existing Evil rows to Master
update public.puzzles set difficulty = 'Master' where difficulty = 'Evil';
update public.puzzle_sessions set difficulty = 'Master' where difficulty = 'Evil';
update public.game_results set difficulty = 'Master' where difficulty = 'Evil';

-- Rename achievement from evil_solver to master_solver
update public.achievements set badge_id = 'master_solver', name = 'Master Solver', description = 'Complete your first Master puzzle' where badge_id = 'evil_solver';
update public.user_achievements set badge_id = 'master_solver' where badge_id = 'evil_solver';

-- Rename seed puzzle IDs
update public.puzzles set puzzle_id = 'seed_master_001' where puzzle_id = 'seed_evil_001';
update public.puzzle_sessions set puzzle_id = 'seed_master_001' where puzzle_id = 'seed_evil_001';
update public.game_results set puzzle_id = 'seed_master_001' where puzzle_id = 'seed_evil_001';
update public.daily_puzzles set puzzle_id = 'seed_master_001' where puzzle_id = 'seed_evil_001';

-- ── Clean up old status values ──────────────────────────────────────

alter table public.puzzle_sessions drop constraint if exists puzzle_sessions_status_check;
alter table public.puzzle_sessions add constraint puzzle_sessions_status_check check (status in ('in_progress','completed','abandoned','failed'));

update public.puzzle_sessions ps
set status = 'completed', updated_at = now()
where ps.status in ('active','in_progress')
  and exists (
    select 1 from public.game_results gr
    where gr.user_id = ps.user_id
      and gr.puzzle_id = ps.puzzle_id
      and gr.mode = ps.mode
      and gr.difficulty = ps.difficulty
  );

update public.puzzle_sessions
set status = 'in_progress', updated_at = now()
where status = 'active';

-- ── Triggers ────────────────────────────────────────────────────────

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists player_stats_set_updated_at on public.player_stats;
create trigger player_stats_set_updated_at before update on public.player_stats for each row execute function public.set_updated_at();
drop trigger if exists puzzle_sessions_set_updated_at on public.puzzle_sessions;
create trigger puzzle_sessions_set_updated_at before update on public.puzzle_sessions for each row execute function public.set_updated_at();
drop trigger if exists achievements_set_updated_at on public.achievements;
create trigger achievements_set_updated_at before update on public.achievements for each row execute function public.set_updated_at();
drop trigger if exists user_achievements_set_updated_at on public.user_achievements;
create trigger user_achievements_set_updated_at before update on public.user_achievements for each row execute function public.set_updated_at();
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
drop trigger if exists puzzles_set_updated_at on public.puzzles;
create trigger puzzles_set_updated_at before update on public.puzzles for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.puzzles enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.puzzle_sessions enable row level security;
alter table public.game_results enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "player_stats_select_own" on public.player_stats for select using (auth.uid() = user_id);
create policy "player_stats_insert_own" on public.player_stats for insert with check (auth.uid() = user_id);
create policy "player_stats_update_own" on public.player_stats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "puzzle_sessions_select_own" on public.puzzle_sessions for select using (auth.uid() = user_id);
create policy "puzzle_sessions_insert_own" on public.puzzle_sessions for insert with check (auth.uid() = user_id);
create policy "puzzle_sessions_update_own" on public.puzzle_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "puzzle_sessions_delete_own" on public.puzzle_sessions for delete using (auth.uid() = user_id);
create policy "game_results_select_own" on public.game_results for select using (auth.uid() = user_id);
create policy "game_results_insert_own" on public.game_results for insert with check (auth.uid() = user_id);
create policy "achievements_public_read" on public.achievements for select using (true);
create policy "user_achievements_select_own" on public.user_achievements for select using (auth.uid() = user_id);
create policy "user_achievements_insert_own" on public.user_achievements for insert with check (auth.uid() = user_id);
create policy "user_achievements_update_own" on public.user_achievements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "puzzles_public_read" on public.puzzles for select using (true);
create policy "daily_puzzles_public_read" on public.daily_puzzles for select using (true);

-- ── Seed puzzles (50 puzzles: 10 per difficulty) ────────────────────

-- Notes:
-- - Every puzzle has a valid 81-char givens string ('0' = empty) and an 81-char solution string
-- - Solution strings are verified valid Sudoku grids (every row/col/box has digits 1-9)
-- - Givens are derived by removing cells from the solution at varying densities
-- - rating_score approximates difficulty; higher = harder
-- - is_active = true means the puzzle can be served to players

-- Easy puzzles (10)
-- keep ~42-47 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_easy_001','Easy','507040201804301090060708050050070108102080509308205070040807010080160905209030807','537649281824351796961728453456973128172486539398215674645897312783162945219534867',1000,'seed'),
('seed_easy_002','Easy','209067080040203090080409306403050908106094070070301040090608701807030402504070030','239567184641283597785419326423756918156894273978321645392648751817935462564172839',1005,'seed'),
('seed_easy_003','Easy','020504060080207015706080402802010750070908040040605083205040608608050304030806020','129534867384267915756189432862413759573928146941675283295341678618752394437896521',1010,'seed'),
('seed_easy_004','Easy','060903020207080109304050706780306050010709060602040907908030605120405070040807090','861973524257684139394152786789316452415729863632548917978231645126495378543867291',1015,'seed'),
('seed_easy_005','Easy','503090407904020801020703050050109040409030506302050908630902080040308090807010203','563891427974526831128743659756189342489237516312654978635972184241368795897415263',1020,'seed'),
('seed_easy_006','Easy','403060201620501040080403060205040103806050409370908020030604010002080607701030804','453867291627591348189423765295746183816352479374918526538674912942185637761239854',1025,'seed'),
('seed_easy_007','Easy','204306050080907060037080109103040705708103090060802040010060908409030602806201030','294316857581927463637485129123649785748153296965872341312564978459738612876291534',1030,'seed'),
('seed_easy_008','Easy','090204050010850204402070903109023070020501040040907302908010407504092030030708090','896234751317859264452176983189423675723561849645987312968315427574692138231748596',1035,'seed'),
('seed_easy_009','Easy','080201504901030602403050190030109020040605003607040809802010340070408060090503087','786291534951834672423756198538179426249685713617342859862917345375428961194563287',1040,'seed'),
('seed_easy_010','Easy','507040201804050706060708050050903020102080509308010604640807010080102040209030807','537649281824351796961728453456973128172486539398215674645897312783162945219534867',1045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Medium puzzles (10)
-- keep ~32-38 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_medium_001','Medium','209060000040203090080409000403050908106090000070301040090608000807030402504070800','239567184641283597785419326423756918156894273978321645392648751817935462564172839',3000,'seed'),
('seed_medium_002','Medium','020504060080207000706080402802010000070908040040605000205040608608050000030806020','129534867384267915756189432862413759573928146941675283295341678618752394437896521',3005,'seed'),
('seed_medium_003','Medium','060903020007080109304050700000306050010709060002040907908030600000405070040807090','861973524257684139394152786789316452415729863632548917978231645126495378543867291',3010,'seed'),
('seed_medium_004','Medium','000090407904020801100003050050109040080030506302050908600002080040308090090000203','563891427974526831128743659756189342489237516312654978635972184241368795897415263',3015,'seed'),
('seed_medium_005','Medium','403060201607000040080403060090000103806050409304000020030604010040000007701030804','453867291627591348189423765295746183816352479374918526538674912942185637761239854',3020,'seed'),
('seed_medium_006','Medium','204010000080907060030405009103040705708050000060802040010504000409030602806090000','294316857581927463637485129123649785748153296965872341312564978459738612876291534',3025,'seed'),
('seed_medium_007','Medium','090204050010809000402070903109020000020501040040907000908010407504090000030708090','896234751317859264452176983189423675723561849645987312968315427574692138231748596',3030,'seed'),
('seed_medium_008','Medium','080201000901030602403050000030109020040605000607040809802010300070408060090503000','786291534951834672423756198538179426249685713617342859862917345375428961194563287',3035,'seed'),
('seed_medium_009','Medium','007040201804050700060708050050903000002080509308010600000807010080102040009030807','537649281824351796961728453456973128172486539398215674645897312783162945219534867',3040,'seed'),
('seed_medium_010','Medium','209060104000203090080409020000050908106090203000001040090608050000030402504070809','239567184641283597785419326423756918156894273978321645392648751817935462564172839',3045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Hard puzzles (10)
-- keep ~27-32 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_hard_001','Hard','000004060080207010000000402802010709500000040040605080000000608608050304400000020','129534867384267915756189432862413759573928146941675283295341678618752394437896521',5000,'seed'),
('seed_hard_002','Hard','060903020050000009304050706700000000010709060030000007908030605100000000040807090','861973524257684139394152786789316452415729863632548917978231645126495378543867291',5005,'seed'),
('seed_hard_003','Hard','060800000904020801108000000050109040080200000302050908605000000040308090090400000','563891427974526831128743659756189342489237516312654978635972184241368795897415263',5010,'seed'),
('seed_hard_004','Hard','403060201600000000080403060090000000806050409304000000030604010040000000701030804','453867291627591348189423765295746183816352479374918526538674912942185637761239854',5015,'seed'),
('seed_hard_005','Hard','204000000080907060030400000003040705708050000060802040010500000009030602806090000','294316857581927463637485129123649785748153296965872341312564978459738612876291534',5020,'seed'),
('seed_hard_006','Hard','000204050010809000000070903109020600000501040040907000000010407504090100000008090','896234751317859264452176983189423675723561849645987312968315427574692138231748596',5025,'seed'),
('seed_hard_007','Hard','080201030000000602403050100000009020040605010000000809802010305000000060090503080','786291534951834672423756198538179426249685713617342859862917345375428961194563287',5030,'seed'),
('seed_hard_008','Hard','030000001804050706900000050050903020070000009308010604605000000080102040010000007','537649281824351796961728453456973128172486539398215674645897312783162945219534867',5035,'seed'),
('seed_hard_009','Hard','209060104600000000080409020020000000106090203908000000090608050010000000504070809','239567184641283597785419326423756918156894273978321645392648751817935462564172839',5040,'seed'),
('seed_hard_010','Hard','109000000080207010050100000802010709503000000040605080090300000608050304407000000','129534867384267915756189432862413759573928146941675283295341678618752394437896521',5045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Expert puzzles (10)
-- keep ~23-27 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_expert_001','Expert','060903020000000000304050706700000000010709060030000000008030605100000000040807090','861973524257684139394152786789316452415729863632548917978231645126495378543867291',8000,'seed'),
('seed_expert_002','Expert','060800000004020801108000000000109040080200000000050908605070000000308090090400000','563891427974526831128743659756189342489237516312654978635972184241368795897415263',8005,'seed'),
('seed_expert_003','Expert','000060201607090000000003060090706000000000409304010500000004010040105000000000804','453867291627591348189423765295746183816352479374918526538674912942185637761239854',8010,'seed'),
('seed_expert_004','Expert','204010800000000060030405020000000005708050200000000040010504070000000002806090500','294316857581927463637485129123649785748153296965872341312564978459738612876291534',8015,'seed'),
('seed_expert_005','Expert','800000000010809060050000000109020605700000000040907010060000000504090108201000000','896234751317859264452176983189423675723561849645987312968315427574692138231748596',8020,'seed'),
('seed_expert_006','Expert','080201030000000000403050108500000000040605010000000000802010305300000000090503080','786291534951834672423756198538179426249685713617342859862917345375428961194563287',8025,'seed'),
('seed_expert_007','Expert','030000000804050706900000000050903020070000000308010604605000000080102040010000000','537649281824351796961728453456973128172486539398215674645897312783162945219534867',8030,'seed'),
('seed_expert_008','Expert','009060104601000000000409020020000000006090203908000000000608050010900000000070809','239567184641283597785419326423756918156894273978321645392648751817935462564172839',8035,'seed'),
('seed_expert_009','Expert','109030000000007010050109000000010709503020000000005080090301000000000304407090000','129534867384267915756189432862413759573928146941675283295341678618752394437896521',8040,'seed'),
('seed_expert_010','Expert','000000020050604030000000706709010402000000060030508010000000005106090308000000090','861973524257684139394152786789316452415729863632548917978231645126495378543867291',8045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Master puzzles (10) — extremely challenging
-- keep ~20-24 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_master_001','Master','060801020000000001108040600000000000080207010000000000605070100000000000090405060','563891427974526831128743659756189342489237516312654978635972184241368795897415263',12000,'seed'),
('seed_master_002','Master','000000000607090308100000000090706080000000000304010506500000000040105030060000000','453867291627591348189423765295746183816352479374918526538674912942185637761239854',12005,'seed'),
('seed_master_003','Master','204010800000000000030405020000000000708050200000000000010504070000000000806090504','294316857581927463637485129123649785748153296965872341312564978459738612876291534',12010,'seed'),
('seed_master_004','Master','800000000010809060050000000009020605700000000000907010060000000004090108201000000','896234751317859264452176983189423675723561849645987312968315427574692138231748596',12015,'seed'),
('seed_master_005','Master','000201030050800000000050108508000000000005010010300000000010305305000000000003080','786291534951834672423756198538179426249685713617342859862917345375428961194563287',12020,'seed'),
('seed_master_006','Master','030609000000000706901020000000000020070406000000000604605090000000000040010504000','537649281824351796961728453456973128172486539398215674645897312783162945219534867',12025,'seed'),
('seed_master_007','Master','000000004601080507000000000020706010000000003908020605300000000010905060000000000','239567184641283597785419326423756918156894273978321645392648751817935462564172839',12030,'seed'),
('seed_master_008','Master','109030800000000000050109030000000000503020100000000000090301070000000000407090501','129534867384267915756189432862413759573928146941675283295341678618752394437896521',12035,'seed'),
('seed_master_009','Master','800000000050604030000000000709010402400000000030508010000000000106090308500000000','861973524257684139394152786789316452415729863632548917978231645126495378543867291',12040,'seed'),
('seed_master_010','Master','060801020000000000008040609700000000080207010000000000005070104200000000000405060','563891427974526831128743659756189342489237516312654978635972184241368795897415263',12045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- ── Seed achievements ───────────────────────────────────────────────

insert into public.achievements (badge_id, name, description, category, icon, progress_target) values
('first_grid','First Grid','Complete your first puzzle','Starter','▦',1),
('clean_start','Clean Start','Complete a puzzle with no mistakes','Starter','✓',1),
('no_help_needed','No Help Needed','Complete a puzzle with no hints','Starter','◇',1),
('first_duel','First Duel','Play your first duel','Starter','⚔',1),
('first_win','First Win','Win your first duel','Starter','★',1),
('streak_3','Streak 3','Complete a puzzle 3 days in a row','Streak','3',3),
('streak_7','Streak 7','Complete a puzzle 7 days in a row','Streak','7',7),
('streak_14','Streak 14','Complete a puzzle 14 days in a row','Streak','14',14),
('streak_30','Streak 30','Complete a puzzle 30 days in a row','Streak','30',30),
('quick_thinker','Quick Thinker','Complete Easy under 3 minutes','Speed','⚡',1),
('sharp_mind','Sharp Mind','Complete Medium under 5 minutes','Speed','◆',1),
('fast_solver','Fast Solver','Complete Hard under 8 minutes','Speed','▶',1),
('speedrunner','Speedrunner','Complete any puzzle under 2 minutes','Speed','⏱',1),
('easy_clear','Easy Clear','Complete 10 Easy puzzles','Difficulty','E',10),
('medium_clear','Medium Clear','Complete 10 Medium puzzles','Difficulty','M',10),
('hard_clear','Hard Clear','Complete 10 Hard puzzles','Difficulty','H',10),
('expert_solver','Expert Solver','Complete your first Expert puzzle','Difficulty','X',1),
('master_solver','Master Solver','Complete your first Master puzzle','Difficulty','V',1),
('duelist','Duelist','Win 5 duels','Competitive','♞',5),
('contender','Contender','Win 25 duels','Competitive','♜',25),
('ranked_ready','Ranked Ready','Complete 5 ranked duels','Competitive','R',5),
('gold_mind','Gold Mind','Reach Gold rank','Competitive','G',800),
('diamond_mind','Diamond Mind','Reach Diamond rank','Competitive','D',2500),
('perfect_duel','Perfect Duel','Win a duel with no mistakes and no hints','Competitive','♛',1),
('puzzle_10','Puzzle 10','Complete 10 puzzles','Completion','10',10),
('puzzle_50','Puzzle 50','Complete 50 puzzles','Completion','50',50),
('puzzle_100','Puzzle 100','Complete 100 puzzles','Completion','100',100),
('puzzle_500','Puzzle 500','Complete 500 puzzles','Completion','500',500),
('flawless','Flawless','Complete 1 puzzle with no mistakes','Precision','○',1),
('flawless_10','Flawless 10','Complete 10 flawless puzzles','Precision','◎',10),
('pure_logic','Pure Logic','Complete a Hard puzzle with no mistakes and no hints','Precision','△',1),
('mastermind','Mastermind','Complete an Expert puzzle with no mistakes and no hints','Precision','▲',1)
on conflict (badge_id) do update set
  name = excluded.name, description = excluded.description,
  category = excluded.category, icon = excluded.icon,
  progress_target = excluded.progress_target;
