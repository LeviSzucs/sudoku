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
('seed_easy_001','Easy','530070000600195000098000060800060003400803001700020006060000280000419005000080079','534678912672195348198342567859761423426853791713924856961537284287419635345286179',1000,'seed'),
('seed_easy_002','Easy','020048600009300004700060200100004050070000010040920006004050002800006700005170040','126348675589317462743569238192634857678245913354921786417853629832496571965172348',1005,'seed'),
('seed_easy_003','Easy','100509080000080091080041000800004010040000050010700004000120040490070000050806002','176529384524387691389641275837254916642193758915768423268912547491375862753486192',1010,'seed'),
('seed_easy_004','Easy','070010000600005079000000030080004000304000807000800020050000000210900005000020090','473618952628395179591247638782534216364192857915876324859463721217983546346721893',1015,'seed'),
('seed_easy_005','Easy','000184000026000910008000700460000002090000070800000054003000400045000230000732000','579184326426357918138296745461579862392648571857123694783961452945812637216734189',1020,'seed'),
('seed_easy_006','Easy','800610000300025009500000120400069030009040200020380005017000006900230008000094007','852617493364925719591483126475269831189346572623871945217958364946237158738194267',1025,'seed'),
('seed_easy_007','Easy','000030000005000430100007026600740000050801070000095004210600007098000300000080000','746239815825616439139457826683742951954861372712395684281963547598174263367528149',1030,'seed'),
('seed_easy_008','Easy','070200040200050007060001020000000500600040003001900600700002080050060001040897060','375218946219456837468731529937625418684149753521973642796312485852364197143897265',1035,'seed'),
('seed_easy_009','Easy','000005000002003408100940200010506004070000180300104750004008003508700600000400000','483615972692273458157948236219536847576892184834164759964728315528713694341459627',1040,'seed'),
('seed_easy_010','Easy','160000000507000602080000005000000890000706400420000500009800100000005904800200006','164527839537498612289613745653172894918736428472984561395861277726345918841259376',1045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Medium puzzles (10)
-- keep ~32-38 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_medium_001','Medium','000260701680070090190004500820100040004602900050003028009300074040050036703018000','435269781682571493197834562826195347374682915951743628519326874248957136763418259',3000,'seed'),
('seed_medium_002','Medium','020000000000600003074000931080001060600080004010200080537000620200004000000000070','926417835851639473374852961482371569659788214713246958537198622248963157169524787',3005,'seed'),
('seed_medium_003','Medium','000003017000020000018400060006005030080000020050300100020009650000080000860500000','549673817673128594218495763196742538384956229752381149427839651935264478861517392',3010,'seed'),
('seed_medium_004','Medium','300080000000700005005000070020009010000304000080100090090000200500002000000060003','371285649649731825825496371723859416156344798984172593497613282538927164216548937',3015,'seed'),
('seed_medium_005','Medium','000500480080009600020030100400302008000060000700804003009050040001400070032008000','913526487584719632627438195456372818298165754731894263869257341145943876372681529',3020,'seed'),
('seed_medium_006','Medium','800700006009000010000058009700060050501003040044000020200000090005004001100080200','852719436469322817317458269728961354591273648644835129286147593975326481143598762',3025,'seed'),
('seed_medium_007','Medium','006000108300800004500000360700002001008070600200300005053000009600001004104000700','426753198319826574587149362735462981848571623291384715153297849672915834964838172',3030,'seed'),
('seed_medium_008','Medium','040010000100600070007000800020300610000090000071002030006000100010003008000040050','845719326192634875367258849528376614634891592471562738986427153215933768743185429',3035,'seed'),
('seed_medium_009','Medium','010000700005000090630004052070110030000050000080092040390400065060000200008000010','214536789845729396639814552476113938921458674583692147392471865167385422458269713',3040,'seed'),
('seed_medium_010','Medium','000004000200000030000590700350060480008000100026070053001043000040000005000800000','815724369274683539963591742351962487798435126426178953182347695649259873537816294',3045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Hard puzzles (10)
-- keep ~27-32 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_hard_001','Hard','000000907000420180000705026100904000050000040000507009920108000034059000507000000','462831957795426183381795426173984265659312748248567319926178534834259671517643892',5000,'seed'),
('seed_hard_002','Hard','000007000006800010200050000000006053900070400000400070030900008009000500400100000','184237695756894312293651784872146253961573428345428179637912548129384567458769231',5005,'seed'),
('seed_hard_003','Hard','000030000500090003400600010800006200000000000032100008040002007900080001000010000','786231495521794863493658712859476231174329586632185948348962157917583624265147839',5010,'seed'),
('seed_hard_004','Hard','009000000400500108010060000800030050070080020090050001000070080601002004000000300','289713546463529178715468239826134957174986325397255861548671893631892714972345612',5015,'seed'),
('seed_hard_005','Hard','000100200340060000006000800000080400800000006005030000001000500000050041003007000','587149263342768159196523874639581427814279356275436988761892535428356741953714682',5020,'seed'),
('seed_hard_006','Hard','000004000600080005000005106005060900000201000070000520807300000040000037000700000','231654798659782314784395166315268949426571883978143522867329451142859637593716284',5025,'seed'),
('seed_hard_007','Hard','080000001000705040700040006001006500004010700002900100400060002050102000300000090','285634971619785243732149856871326594564811729392954187448567312956172438127398665',5030,'seed'),
('seed_hard_008','Hard','050080200000900004016000008009040006000100000080005020400000690100003000002050040','957384261238961754416527938529748316643219875781635429475812693164393587892576142',5035,'seed'),
('seed_hard_009','Hard','000010002000600030050200700100004200008030400006900008003008060070005000500060000','437819562289657134651243789195384277748236415326971958813528697974165823562799341',5040,'seed'),
('seed_hard_010','Hard','300000008000004650020050010006040000500000004000010200010080040042300000700000003','369172458187534652524956817296743185531829764478615239915287346642391578753468921',5045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Expert puzzles (10)
-- keep ~23-27 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_expert_001','Expert','100007090030020008009600500005300900010080002600004000300000010040000007007000300','162857493534129678879643521425316789913785642687294135356478912241935867798261354',8000,'seed'),
('seed_expert_002','Expert','000050000040000106080300070000002000500800000009060004000004090070020300400100000','623951487745288196981346572864732951537819628219565834158473299376298345492165783',8005,'seed'),
('seed_expert_003','Expert','060400000300001009005020000000000180004030006120000000000040500500600008000003060','867439251342851769915726843659274188754138926128965374283647595571692438496383162',8010,'seed'),
('seed_expert_004','Expert','200000000000430800050091006001005090080000040070300200500120060006074000000000002','283756419169432875754891326621545798398217645475369281547128963916674532832983174',8015,'seed'),
('seed_expert_005','Expert','000003400400000009002600080000800300090000040006001000010007200500000008008500000','685793421437128569192645887241859376893276145756431892319867254524319687678542931',8020,'seed'),
('seed_expert_006','Expert','000200000008006400070050000100000003006040800400000005000080060009300500000001000','543269718918736452672158349125897633396542871487613925251984167839376514764125893',8025,'seed'),
('seed_expert_007','Expert','200000030030060000400005009000002010080100600000050300050309008001400000300000050','295741836738269145416835729563972411982134657147658392654397288871426593329518574',8030,'seed'),
('seed_expert_008','Expert','010300002006000070090050010500000200000609000009000004020010040050000700600007080','415376892286194573793852316568731249147629835329485164922518647854263791631947528',8035,'seed'),
('seed_expert_009','Expert','000040500000000206009020040080000002600803001300000070010050400807000000005010000','176349528453781296289526147584197632629834751331265879918652473847973215765418963',8040,'seed'),
('seed_expert_010','Expert','500098000000005300010000008002000900600701002004000600100000090009500000000310007','536298471827145369914637258752864913643791582194253786178426895369587124485319627',8045,'seed')
on conflict (puzzle_id) do update set
  difficulty = excluded.difficulty, givens = excluded.givens,
  solution = excluded.solution, rating_score = excluded.rating_score,
  source = excluded.source, is_active = excluded.is_active;

-- Master puzzles (10) — extremely challenging
-- keep ~20-24 givens per puzzle
insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source) values
('seed_master_001','Master','000000010400000000020000000000050407008000300001090000300400200050100000000806000','693784512487512936125963874932651487568247391741398625319475268856129743274836159',12000,'seed'),
('seed_master_002','Master','010000000000500060000009807006000070090000004040300000300040000080000050500000002','815637429973524168624189857236451978198276534547398216352749681489162753761983492',12005,'seed'),
('seed_master_003','Master','200600000000090040800003070000050000000000088060000009005009600100000002000000050','249687315673195248851243976924358761517962483368471529735829694196534872482716155',12010,'seed'),
('seed_master_004','Master','300080000002000014500600030070200000001000500000003090080002007610000800000050003','346589721792831614518647239973265148821974565654123978489312597617498352235756483',12015,'seed'),
('seed_master_005','Master','000010004007002000900000050010500009000040006040009000000000780400300020005000400','583617294617952348924833651716528439398746512145199863259461787461375928872893145',12020,'seed'),
('seed_master_006','Master','800000000003600000070090200050007000000045700000100030001000068008500010090000400','812753649943682175675491283154237896369845721287169534521974368438526917796318452',12025,'seed'),
('seed_master_007','Master','000003000300006000006700030450000070000500200000100004002600700600080000007040000','271463859389256147546718932458329671913574286726198354132695728694287513867341429',12030,'seed'),
('seed_master_008','Master','000207000400000019010000000008005009700000002600100800000000030590000007000904000','956217483473856219812349756328465971749683125665172894184597632592138647237964518',12035,'seed'),
('seed_master_009','Master','000004000000089001070000080009020000001800000050001600008090500400100009300000000','893514276542689731176342985689723154721856493354971628218497567465138829937265841',12040,'seed'),
('seed_master_010','Master','600000080090408070000000600200000001000030000807000004004000000080209010050000003','645327189193458276728196645239864751416735928857912364974681532382549617561273893',12045,'seed')
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
