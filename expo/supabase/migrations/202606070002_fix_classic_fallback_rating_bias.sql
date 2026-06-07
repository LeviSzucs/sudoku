-- Avoid rating_score ordering for live Classic fallback selection.
-- rating_score is not currently comparable across all generated puzzle sources.

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
set search_path = public
as $$
declare
  v_result record;
begin
  select p.puzzle_id, p.difficulty, p.givens, p.solution, p.rating_score
  into v_result
  from public.puzzles p
  where p.difficulty = p_difficulty
    and p.is_active = true
    and p.puzzle_id not in (
      select gr.puzzle_id
      from public.game_results gr
      where gr.user_id = p_user_id
        and gr.difficulty = p_difficulty
        and gr.completed = true
      order by gr.completed_at desc
      limit 10
    )
    and p.puzzle_id not in (
      select ps.puzzle_id
      from public.puzzle_sessions ps
      where ps.user_id = p_user_id
        and ps.status = 'in_progress'
    )
  order by random()
  limit 1;

  if found then
    return query select v_result.puzzle_id, v_result.difficulty, v_result.givens, v_result.solution, v_result.rating_score;
    return;
  end if;

  select p.puzzle_id, p.difficulty, p.givens, p.solution, p.rating_score
  into v_result
  from public.puzzles p
  where p.difficulty = p_difficulty
    and p.is_active = true
  order by random()
  limit 1;

  if found then
    return query select v_result.puzzle_id, v_result.difficulty, v_result.givens, v_result.solution, v_result.rating_score;
  end if;
end;
$$;

grant execute on function public.get_classic_puzzle(uuid, text) to authenticated;
