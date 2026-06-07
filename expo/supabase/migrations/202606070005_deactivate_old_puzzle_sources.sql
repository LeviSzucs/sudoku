-- Stop serving the old clue-count puzzle banks for new games.
-- Rows are kept for existing sessions, challenges, duels, results, and history.

update public.puzzles
set is_active = false
where source in (
  'generated_unique_20260602',
  'generated/puzzle-bank/generated-puzzles-20260602.json'
);

-- Keep the technique-calibrated source active for new puzzle selection.
update public.puzzles
set is_active = true
where source = 'technique_calibrated_20260607';

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
set search_path = public
as $$
declare
  v_assigned record;
  v_candidate record;
begin
  if p_mode not in ('daily', 'daily_duel') then
    raise exception 'Invalid daily puzzle mode: %', p_mode using errcode = '22023';
  end if;

  select dp.puzzle_id, dp.difficulty, p.givens, p.solution
  into v_assigned
  from public.daily_puzzles dp
  join public.puzzles p on p.puzzle_id = dp.puzzle_id
  where dp.date = p_date
    and dp.mode = p_mode
  limit 1;

  if found then
    return query select v_assigned.puzzle_id, v_assigned.difficulty, v_assigned.givens, v_assigned.solution;
    return;
  end if;

  select p.puzzle_id, p.difficulty, p.givens, p.solution
  into v_candidate
  from public.puzzles p
  where p.difficulty = 'Medium'
    and p.is_active = true
    and not exists (
      select 1
      from public.daily_puzzles dp
      where dp.date = p_date
        and dp.mode = p_mode
        and dp.puzzle_id = p.puzzle_id
    )
  order by
    case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
    random()
  limit 1;

  if not found then
    select p.puzzle_id, p.difficulty, p.givens, p.solution
    into v_candidate
    from public.puzzles p
    where p.is_active = true
    order by
      case when p.source = 'technique_calibrated_20260607' then 0 else 1 end,
      random()
    limit 1;
  end if;

  if not found then
    return;
  end if;

  insert into public.daily_puzzles (date, mode, puzzle_id, difficulty)
  values (p_date, p_mode, v_candidate.puzzle_id, v_candidate.difficulty)
  on conflict (date, mode) do nothing;

  select dp.puzzle_id, dp.difficulty, p.givens, p.solution
  into v_assigned
  from public.daily_puzzles dp
  join public.puzzles p on p.puzzle_id = dp.puzzle_id
  where dp.date = p_date
    and dp.mode = p_mode
  limit 1;

  if found then
    return query select v_assigned.puzzle_id, v_assigned.difficulty, v_assigned.givens, v_assigned.solution;
  end if;
end;
$$;

grant execute on function public.get_daily_puzzle(date, text) to anon, authenticated;

-- Verification queries:
-- Active technique-calibrated count by difficulty should be 50 each.
-- select difficulty, count(*) as active_count
-- from public.puzzles
-- where source = 'technique_calibrated_20260607'
--   and is_active = true
-- group by difficulty
-- order by difficulty;

-- Old clue-count sources should have 0 active rows.
-- select source, count(*) filter (where is_active = true) as active_count, count(*) as total_count
-- from public.puzzles
-- where source in (
--   'generated_unique_20260602',
--   'generated/puzzle-bank/generated-puzzles-20260602.json'
-- )
-- group by source
-- order by source;

-- Old rows should still exist for historical references.
-- select source, count(*) as total_count
-- from public.puzzles
-- where source in (
--   'generated_unique_20260602',
--   'generated/puzzle-bank/generated-puzzles-20260602.json'
-- )
-- group by source
-- order by source;

-- Active puzzle rows should only come from the technique-calibrated source.
-- select source, count(*) as active_count
-- from public.puzzles
-- where is_active = true
-- group by source
-- order by source;

-- No invalid active difficulty values.
-- select puzzle_id, source, difficulty
-- from public.puzzles
-- where is_active = true
--   and difficulty not in ('Easy', 'Medium', 'Hard', 'Expert', 'Master');

-- All active puzzles should have canonical 81-character givens and solutions.
-- select puzzle_id, source, length(givens) as givens_length, length(solution) as solution_length
-- from public.puzzles
-- where is_active = true
--   and (length(givens) <> 81 or length(solution) <> 81);

-- No duplicate active givens.
-- select givens, count(*) as duplicate_count
-- from public.puzzles
-- where is_active = true
-- group by givens
-- having count(*) > 1;
