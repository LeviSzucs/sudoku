-- Make completed session result saves idempotent.
-- This migration is intentionally ordered so game_results.session_id is
-- guaranteed to exist before any statement reads, deduplicates, or indexes it.

do $$
declare
  puzzle_session_id_type text;
  game_result_session_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into puzzle_session_id_type
  from pg_attribute attribute
  join pg_class table_class on table_class.oid = attribute.attrelid
  join pg_namespace table_namespace on table_namespace.oid = table_class.relnamespace
  where table_namespace.nspname = 'public'
    and table_class.relname = 'puzzle_sessions'
    and attribute.attname = 'session_id'
    and not attribute.attisdropped;

  if puzzle_session_id_type is null then
    raise exception 'public.puzzle_sessions.session_id does not exist';
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
    into game_result_session_id_type
  from pg_attribute attribute
  join pg_class table_class on table_class.oid = attribute.attrelid
  join pg_namespace table_namespace on table_namespace.oid = table_class.relnamespace
  where table_namespace.nspname = 'public'
    and table_class.relname = 'game_results'
    and attribute.attname = 'session_id'
    and not attribute.attisdropped;

  if game_result_session_id_type is null then
    execute format(
      'alter table public.game_results add column session_id %s',
      puzzle_session_id_type
    );
  elsif game_result_session_id_type <> puzzle_session_id_type then
    raise exception
      'public.game_results.session_id type (%) does not match public.puzzle_sessions.session_id type (%)',
      game_result_session_id_type,
      puzzle_session_id_type;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_results'::regclass
      and conname = 'game_results_session_id_fkey'
  ) then
    alter table public.game_results
      add constraint game_results_session_id_fkey
      foreign key (session_id)
      references public.puzzle_sessions(session_id)
      on delete set null;
  end if;
end $$;

-- Keep the earliest row for any historical duplicate completed session result.
delete from public.game_results result_to_delete
using public.game_results result_to_keep
where result_to_delete.session_id is not null
  and result_to_keep.session_id = result_to_delete.session_id
  and (
    result_to_keep.completed_at < result_to_delete.completed_at
    or (
      result_to_keep.completed_at = result_to_delete.completed_at
      and result_to_keep.result_id < result_to_delete.result_id
    )
  );

create unique index if not exists idx_game_results_unique_session
  on public.game_results(session_id)
  where session_id is not null;

drop policy if exists "game_results_update_own" on public.game_results;

create policy "game_results_update_own"
  on public.game_results
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
