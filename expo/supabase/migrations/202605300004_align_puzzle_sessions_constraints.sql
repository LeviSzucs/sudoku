begin;

-- Drop first so this migration can repair rows even if the existing checks
-- still allow Evil/active but do not yet allow Master/in_progress.
alter table public.puzzle_sessions
  drop constraint if exists puzzle_sessions_difficulty_check;

alter table public.puzzle_sessions
  drop constraint if exists puzzle_sessions_status_check;

alter table public.puzzle_sessions
  drop constraint if exists puzzle_sessions_mode_check;

update public.puzzle_sessions
set status = 'in_progress',
    updated_at = now()
where status = 'active';

update public.puzzle_sessions
set difficulty = 'Master',
    updated_at = now()
where difficulty = 'Evil';

alter table public.puzzle_sessions
  alter column status set default 'in_progress';

alter table public.puzzle_sessions
  add constraint puzzle_sessions_difficulty_check
  check (difficulty in ('Easy', 'Medium', 'Hard', 'Expert', 'Master'));

alter table public.puzzle_sessions
  add constraint puzzle_sessions_status_check
  check (status in ('in_progress', 'completed', 'failed', 'abandoned'));

alter table public.puzzle_sessions
  add constraint puzzle_sessions_mode_check
  check (mode in ('classic', 'daily', 'daily_duel', 'duel', 'friend_challenge', 'ranked', 'ranked_duel'));

commit;
