-- Align game_results difficulty constraint with current production names.
-- Keep legacy Evil accepted so older rows or un-migrated environments do not break.

alter table public.game_results
  drop constraint if exists game_results_difficulty_check;

alter table public.game_results
  add constraint game_results_difficulty_check
  check (difficulty in ('Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Evil'));
