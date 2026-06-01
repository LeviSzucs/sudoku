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
  order by random()
  limit 1;

  if not found then
    select p.puzzle_id, p.difficulty, p.givens, p.solution
    into v_candidate
    from public.puzzles p
    where p.is_active = true
    order by random()
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
