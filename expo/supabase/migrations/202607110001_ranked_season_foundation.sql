-- Ranked season rollover foundation:
-- - durable season numbering
-- - archived per-user season results
-- - recap-readiness RPCs
-- - concurrency-safe active season creation

alter table public.ranked_seasons
  add column if not exists season_number integer;

with ordered_seasons as (
  select
    rs.season_id,
    row_number() over (
      order by rs.starts_at asc, rs.created_at asc, rs.season_id asc
    )::integer as next_season_number
  from public.ranked_seasons rs
)
update public.ranked_seasons rs
set season_number = ordered_seasons.next_season_number
from ordered_seasons
where rs.season_id = ordered_seasons.season_id
  and rs.season_number is distinct from ordered_seasons.next_season_number;

update public.ranked_seasons
set name = 'Season ' || season_number
where season_number is not null
  and name is distinct from ('Season ' || season_number);

alter table public.ranked_seasons
  alter column season_number set not null;

create unique index if not exists ranked_seasons_season_number_idx
  on public.ranked_seasons (season_number);

create table if not exists public.ranked_season_results (
  season_result_id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ranked_seasons(season_id) on delete cascade,
  season_number integer not null,
  season_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  final_rp integer not null check (final_rp >= 0),
  final_tier text not null,
  peak_rp integer not null check (peak_rp >= 0),
  peak_tier text not null,
  matches_played integer not null check (matches_played >= 0),
  wins integer not null check (wins >= 0),
  losses integer not null check (losses >= 0),
  draws integer not null check (draws >= 0),
  best_win_streak integer not null check (best_win_streak >= 0),
  final_rank_position integer check (final_rank_position is null or final_rank_position > 0),
  total_ranked_players integer check (total_ranked_players is null or total_ranked_players > 0),
  recap_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  finalised_at timestamptz not null default now()
);

create unique index if not exists ranked_season_results_season_user_idx
  on public.ranked_season_results (season_id, user_id)
  where user_id is not null;

create index if not exists ranked_season_results_user_unseen_idx
  on public.ranked_season_results (user_id, recap_viewed_at, season_number desc)
  where user_id is not null;

alter table public.ranked_season_results enable row level security;

drop policy if exists "Users can read their own ranked season results" on public.ranked_season_results;
create policy "Users can read their own ranked season results"
on public.ranked_season_results
for select
using (auth.uid() = user_id);

grant select on public.ranked_season_results to authenticated;

create or replace function public.refresh_ranked_season_results(
  p_season_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.ranked_seasons%rowtype;
  v_rows integer := 0;
begin
  if p_season_id is null then
    raise exception 'Missing season_id.' using errcode = '22023';
  end if;

  select *
    into v_season
  from public.ranked_seasons rs
  where rs.season_id = p_season_id
  limit 1;

  if v_season.season_id is null then
    raise exception 'Ranked season not found.' using errcode = '22023';
  end if;

  if v_season.name is distinct from ('Season ' || v_season.season_number) then
    update public.ranked_seasons
    set name = 'Season ' || v_season.season_number
    where season_id = v_season.season_id;

    select *
      into v_season
    from public.ranked_seasons rs
    where rs.season_id = p_season_id
    limit 1;
  end if;

  with ranked_rows as (
    select
      rp.user_id,
      rp.rp as final_rp,
      rp.current_tier as final_tier,
      rp.peak_rp,
      public.ranked_tier_for_rp(rp.peak_rp) as peak_tier,
      rp.matches_played,
      rp.wins,
      rp.losses,
      rp.draws,
      rp.best_win_streak,
      row_number() over (
        order by rp.rp desc, rp.wins desc, rp.matches_played asc, rp.updated_at asc, rp.user_id asc
      )::integer as final_rank_position,
      count(*) over ()::integer as total_ranked_players
    from public.ranked_profiles rp
    where rp.season_id = p_season_id
      and coalesce(rp.matches_played, 0) > 0
  )
  insert into public.ranked_season_results (
    season_id,
    season_number,
    season_name,
    user_id,
    final_rp,
    final_tier,
    peak_rp,
    peak_tier,
    matches_played,
    wins,
    losses,
    draws,
    best_win_streak,
    final_rank_position,
    total_ranked_players,
    finalised_at
  )
  select
    v_season.season_id,
    v_season.season_number,
    v_season.name,
    ranked_rows.user_id,
    ranked_rows.final_rp,
    ranked_rows.final_tier,
    ranked_rows.peak_rp,
    ranked_rows.peak_tier,
    ranked_rows.matches_played,
    ranked_rows.wins,
    ranked_rows.losses,
    ranked_rows.draws,
    ranked_rows.best_win_streak,
    ranked_rows.final_rank_position,
    ranked_rows.total_ranked_players,
    now()
  from ranked_rows
  on conflict (season_id, user_id)
    where user_id is not null
  do update
  set season_number = excluded.season_number,
      season_name = excluded.season_name,
      final_rp = excluded.final_rp,
      final_tier = excluded.final_tier,
      peak_rp = excluded.peak_rp,
      peak_tier = excluded.peak_tier,
      matches_played = excluded.matches_played,
      wins = excluded.wins,
      losses = excluded.losses,
      draws = excluded.draws,
      best_win_streak = excluded.best_win_streak,
      final_rank_position = excluded.final_rank_position,
      total_ranked_players = excluded.total_ranked_players,
      finalised_at = excluded.finalised_at,
      recap_viewed_at = public.ranked_season_results.recap_viewed_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

create or replace function public.finalize_ranked_season(
  p_season_id uuid
)
returns public.ranked_seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.ranked_seasons%rowtype;
begin
  if p_season_id is null then
    raise exception 'Missing season_id.' using errcode = '22023';
  end if;

  select *
    into v_season
  from public.ranked_seasons rs
  where rs.season_id = p_season_id
  for update;

  if v_season.season_id is null then
    raise exception 'Ranked season not found.' using errcode = '22023';
  end if;

  update public.ranked_seasons
  set status = 'completed',
      name = 'Season ' || v_season.season_number
  where season_id = v_season.season_id
    and (
      status is distinct from 'completed'
      or name is distinct from ('Season ' || v_season.season_number)
    )
  returning * into v_season;

  if v_season.season_id is null then
    select *
      into v_season
    from public.ranked_seasons rs
    where rs.season_id = p_season_id
    limit 1;
  end if;

  perform public.refresh_ranked_season_results(v_season.season_id);
  return v_season;
end;
$$;

create or replace function public.active_ranked_season()
returns public.ranked_seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.ranked_seasons%rowtype;
  v_expired public.ranked_seasons%rowtype;
  v_upcoming public.ranked_seasons%rowtype;
  v_last_season public.ranked_seasons%rowtype;
  v_next_number integer;
  v_next_start timestamptz;
begin
  perform pg_advisory_xact_lock(20260711, 1);

  for v_expired in
    select *
    from public.ranked_seasons rs
    where rs.ends_at <= now()
      and rs.status <> 'completed'
    order by rs.ends_at asc, rs.starts_at asc, rs.created_at asc, rs.season_id asc
    for update
  loop
    perform public.finalize_ranked_season(v_expired.season_id);
  end loop;

  select *
    into v_season
  from public.ranked_seasons rs
  where rs.status = 'active'
    and rs.starts_at <= now()
    and rs.ends_at > now()
  order by rs.starts_at desc, rs.created_at desc, rs.season_id desc
  limit 1
  for update;

  if v_season.season_id is not null then
    if v_season.name is distinct from ('Season ' || v_season.season_number) then
      update public.ranked_seasons
      set name = 'Season ' || v_season.season_number
      where season_id = v_season.season_id
      returning * into v_season;
    end if;
    return v_season;
  end if;

  select *
    into v_upcoming
  from public.ranked_seasons rs
  where rs.status = 'upcoming'
  order by rs.starts_at asc, rs.created_at asc, rs.season_id asc
  limit 1
  for update;

  if v_upcoming.season_id is not null then
    update public.ranked_seasons
    set status = 'active',
        starts_at = least(starts_at, now()),
        ends_at = greatest(ends_at, least(starts_at, now()) + interval '28 days'),
        name = 'Season ' || season_number
    where season_id = v_upcoming.season_id
    returning * into v_season;

    return v_season;
  end if;

  select *
    into v_last_season
  from public.ranked_seasons rs
  order by rs.season_number desc, rs.starts_at desc, rs.created_at desc, rs.season_id desc
  limit 1;

  if v_last_season.season_id is null then
    v_next_number := 1;
    v_next_start := now();
  else
    v_next_number := coalesce(v_last_season.season_number, 0) + 1;
    v_next_start := coalesce(v_last_season.ends_at, now());
  end if;

  insert into public.ranked_seasons (
    season_number,
    name,
    starts_at,
    ends_at,
    status
  )
  values (
    v_next_number,
    'Season ' || v_next_number,
    v_next_start,
    v_next_start + interval '28 days',
    'active'
  )
  returning * into v_season;

  return v_season;
end;
$$;

create or replace function public.current_ranked_season_info()
returns table (
  season_id uuid,
  season_number integer,
  season_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.ranked_seasons%rowtype;
begin
  v_season := public.active_ranked_season();

  return query
  select
    v_season.season_id,
    v_season.season_number,
    v_season.name,
    v_season.starts_at,
    v_season.ends_at,
    v_season.status;
end;
$$;

create or replace function public.latest_unseen_ranked_season_recap()
returns table (
  season_id uuid,
  season_number integer,
  season_name text,
  season_starts_at timestamptz,
  season_ends_at timestamptz,
  final_rp integer,
  final_tier text,
  peak_rp integer,
  peak_tier text,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  best_win_streak integer,
  final_rank_position integer,
  total_ranked_players integer,
  top_percent numeric,
  recap_viewed_at timestamptz,
  finalised_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  return query
  select
    rsr.season_id,
    rsr.season_number,
    rsr.season_name,
    rs.starts_at,
    rs.ends_at,
    rsr.final_rp,
    rsr.final_tier,
    rsr.peak_rp,
    rsr.peak_tier,
    rsr.matches_played,
    rsr.wins,
    rsr.losses,
    rsr.draws,
    rsr.best_win_streak,
    rsr.final_rank_position,
    rsr.total_ranked_players,
    case
      when rsr.total_ranked_players is null
        or rsr.total_ranked_players <= 0
        or rsr.final_rank_position is null
      then null::numeric
      else round((100.0 * rsr.final_rank_position::numeric) / rsr.total_ranked_players::numeric, 1)
    end as top_percent,
    rsr.recap_viewed_at,
    rsr.finalised_at
  from public.ranked_season_results rsr
  join public.ranked_seasons rs on rs.season_id = rsr.season_id
  where rsr.user_id = v_user_id
    and rs.status = 'completed'
    and rsr.recap_viewed_at is null
  order by rsr.season_number desc, rsr.finalised_at desc
  limit 1;
end;
$$;

create or replace function public.mark_ranked_season_recap_viewed(
  p_season_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_viewed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_season_id is null then
    raise exception 'Missing season_id.' using errcode = '22023';
  end if;

  update public.ranked_season_results
  set recap_viewed_at = coalesce(recap_viewed_at, now())
  where season_id = p_season_id
    and user_id = v_user_id
  returning recap_viewed_at into v_viewed_at;

  return jsonb_build_object(
    'season_id', p_season_id,
    'acknowledged', v_viewed_at is not null,
    'recap_viewed_at', v_viewed_at
  );
end;
$$;

create or replace function public.link_ranked_duel_result(
  p_user_id uuid,
  p_session_id uuid,
  p_result_id text
)
returns table (
  ranked_duel_id uuid,
  status text,
  winner_user_id uuid,
  rp_change integer,
  rp_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.game_results%rowtype;
  v_duel public.ranked_duels%rowtype;
  v_side_result public.game_results%rowtype;
  v_a_result public.game_results%rowtype;
  v_b_result public.game_results%rowtype;
  v_next_status text;
  v_winner uuid;
  v_forfeit_winner uuid;
  v_a_outcome text;
  v_b_outcome text;
  v_a_delta integer := 0;
  v_b_delta integer := 0;
  v_a_profile public.ranked_profiles%rowtype;
  v_b_profile public.ranked_profiles%rowtype;
  v_current_change integer := 0;
  v_current_after integer := null;
  v_matched_by_session boolean := false;
  v_current_is_player_a boolean := false;
  v_apply_rp boolean := false;
  v_season_status text := null;
begin
  select *
    into v_result
  from public.game_results gr
  where gr.result_id = p_result_id
    and gr.user_id = p_user_id
    and gr.mode = 'ranked_duel'
    and gr.completed = true
  limit 1;

  if v_result.result_id is null then
    raise exception 'Completed Ranked Duel result not found.' using errcode = '22023';
  end if;

  select *
    into v_duel
  from public.ranked_duels rd
  where p_session_id is not null
    and (
      (rd.player_a_session_id = p_session_id and rd.player_a_id = p_user_id)
      or (rd.player_b_session_id = p_session_id and rd.player_b_id = p_user_id)
    )
  order by rd.created_at desc
  limit 1
  for update;

  v_matched_by_session := v_duel.ranked_duel_id is not null;

  if v_duel.ranked_duel_id is null then
    select *
      into v_duel
    from public.ranked_duels rd
    where rd.puzzle_id = v_result.puzzle_id
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed', 'completed')
      and (
        rd.player_a_id = p_user_id
        or rd.player_b_id = p_user_id
      )
    order by
      case
        when rd.player_a_session_id = v_result.session_id or rd.player_b_session_id = v_result.session_id then 0
        else 1
      end,
      rd.created_at desc
    limit 1
    for update;
  end if;

  if v_duel.ranked_duel_id is null then
    raise exception 'Ranked Duel not found for result.' using errcode = '22023';
  end if;

  v_current_is_player_a := p_user_id = v_duel.player_a_id;
  if not v_current_is_player_a and p_user_id <> v_duel.player_b_id then
    raise exception 'Result user is not part of this Ranked Duel.' using errcode = '42501';
  end if;

  if v_current_is_player_a then
    if v_duel.player_a_result_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.result_id = v_duel.player_a_result_id
      limit 1;
    end if;

    if v_side_result.result_id is null and v_duel.player_a_session_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.user_id = v_duel.player_a_id
        and gr.session_id = v_duel.player_a_session_id
        and gr.mode = 'ranked_duel'
        and gr.completed = true
      order by gr.completed_at asc nulls last, gr.result_id asc
      limit 1;
    end if;

    if v_side_result.result_id is null
      and (v_duel.player_a_session_id is null or v_duel.player_a_session_id = v_result.session_id or v_matched_by_session) then
      v_side_result := v_result;
    end if;

    if v_side_result.result_id is null then
      raise exception 'Ranked Duel player A session mismatch.' using errcode = '22023';
    end if;

    v_duel.player_a_session_id := coalesce(v_duel.player_a_session_id, v_side_result.session_id, p_session_id);
    v_duel.player_a_result_id := v_side_result.result_id;
  else
    if v_duel.player_b_result_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.result_id = v_duel.player_b_result_id
      limit 1;
    end if;

    if v_side_result.result_id is null and v_duel.player_b_session_id is not null then
      select *
        into v_side_result
      from public.game_results gr
      where gr.user_id = v_duel.player_b_id
        and gr.session_id = v_duel.player_b_session_id
        and gr.mode = 'ranked_duel'
        and gr.completed = true
      order by gr.completed_at asc nulls last, gr.result_id asc
      limit 1;
    end if;

    if v_side_result.result_id is null
      and (v_duel.player_b_session_id is null or v_duel.player_b_session_id = v_result.session_id or v_matched_by_session) then
      v_side_result := v_result;
    end if;

    if v_side_result.result_id is null then
      raise exception 'Ranked Duel player B session mismatch.' using errcode = '22023';
    end if;

    v_duel.player_b_session_id := coalesce(v_duel.player_b_session_id, v_side_result.session_id, p_session_id);
    v_duel.player_b_result_id := v_side_result.result_id;
  end if;

  if v_duel.player_a_result_id is not null then
    select * into v_a_result from public.game_results gr where gr.result_id = v_duel.player_a_result_id limit 1;
  end if;
  if v_duel.player_b_result_id is not null then
    select * into v_b_result from public.game_results gr where gr.result_id = v_duel.player_b_result_id limit 1;
  end if;

  v_forfeit_winner := case
    when v_a_result.result_id is not null and v_b_result.result_id is null and coalesce(v_a_result.won, true) = false then v_duel.player_b_id
    when v_b_result.result_id is not null and v_a_result.result_id is null and coalesce(v_b_result.won, true) = false then v_duel.player_a_id
    else null::uuid
  end;

  v_next_status := case
    when v_forfeit_winner is not null then 'completed'
    when v_duel.player_a_result_id is not null and v_duel.player_b_result_id is not null then 'completed'
    when v_duel.player_a_result_id is not null then 'player_a_completed'
    when v_duel.player_b_result_id is not null then 'player_b_completed'
    when v_duel.player_b_id is not null then 'matched'
    else 'waiting_for_opponent'
  end;

  v_winner := case
    when v_forfeit_winner is not null then v_forfeit_winner
    when v_next_status = 'completed' then public.ranked_result_winner(
      v_duel.player_a_id,
      v_duel.player_b_id,
      coalesce(v_a_result.won, false),
      coalesce(v_b_result.won, false),
      coalesce(v_a_result.final_score, 0),
      coalesce(v_b_result.final_score, 0),
      coalesce(v_a_result.elapsed_seconds, 999999),
      coalesce(v_b_result.elapsed_seconds, 999999),
      v_a_result.completed_at,
      v_b_result.completed_at
    )
    else v_duel.winner_user_id
  end;

  if v_forfeit_winner = v_duel.player_a_id and v_duel.player_b_session_id is not null then
    update public.puzzle_sessions
    set status = 'abandoned',
        updated_at = now()
    where session_id = v_duel.player_b_session_id
      and status = 'in_progress';
  elsif v_forfeit_winner = v_duel.player_b_id and v_duel.player_a_session_id is not null then
    update public.puzzle_sessions
    set status = 'abandoned',
        updated_at = now()
    where session_id = v_duel.player_a_session_id
      and status = 'in_progress';
  end if;

  v_apply_rp := v_next_status = 'completed'
    and (
      v_duel.status <> 'completed'
      or v_duel.player_a_rp_change is null
      or v_duel.player_b_rp_change is null
      or v_duel.player_a_rp_after is null
      or v_duel.player_b_rp_after is null
    );

  if v_apply_rp then
    v_a_outcome := case when v_winner is null then 'draw' when v_winner = v_duel.player_a_id then 'win' else 'loss' end;
    v_b_outcome := case when v_winner is null then 'draw' when v_winner = v_duel.player_b_id then 'win' else 'loss' end;
    v_a_delta := public.ranked_rp_delta(coalesce(v_duel.player_a_rp_before, 0), coalesce(v_duel.player_b_rp_before, 0), v_a_outcome);
    v_b_delta := public.ranked_rp_delta(coalesce(v_duel.player_b_rp_before, 0), coalesce(v_duel.player_a_rp_before, 0), v_b_outcome);

    v_a_profile := public.apply_ranked_profile_delta(v_duel.player_a_id, v_duel.season_id, v_a_delta, v_a_outcome);
    v_b_profile := public.apply_ranked_profile_delta(v_duel.player_b_id, v_duel.season_id, v_b_delta, v_b_outcome);
  else
    select * into v_a_profile from public.ensure_ranked_profile(v_duel.player_a_id, v_duel.season_id);
    if v_duel.player_b_id is not null then
      select * into v_b_profile from public.ensure_ranked_profile(v_duel.player_b_id, v_duel.season_id);
    end if;
    v_a_delta := coalesce(v_duel.player_a_rp_change, 0);
    v_b_delta := coalesce(v_duel.player_b_rp_change, 0);
  end if;

  update public.ranked_duels rd
  set player_a_session_id = v_duel.player_a_session_id,
      player_b_session_id = v_duel.player_b_session_id,
      player_a_result_id = v_duel.player_a_result_id,
      player_b_result_id = v_duel.player_b_result_id,
      status = v_next_status,
      winner_user_id = v_winner,
      player_a_rp_change = case when v_next_status = 'completed' then coalesce(rd.player_a_rp_change, v_a_delta) else rd.player_a_rp_change end,
      player_b_rp_change = case when v_next_status = 'completed' then coalesce(rd.player_b_rp_change, v_b_delta) else rd.player_b_rp_change end,
      player_a_rp_after = case when v_next_status = 'completed' then coalesce(rd.player_a_rp_after, v_a_profile.rp) else rd.player_a_rp_after end,
      player_b_rp_after = case when v_next_status = 'completed' then coalesce(rd.player_b_rp_after, v_b_profile.rp) else rd.player_b_rp_after end,
      completed_at = case when v_next_status = 'completed' then coalesce(rd.completed_at, greatest(v_a_result.completed_at, v_b_result.completed_at), now()) else rd.completed_at end,
      updated_at = now()
  where rd.ranked_duel_id = v_duel.ranked_duel_id
  returning * into v_duel;

  if p_user_id = v_duel.player_a_id then
    v_current_change := coalesce(v_duel.player_a_rp_change, v_a_delta, 0);
    v_current_after := coalesce(v_duel.player_a_rp_after, v_a_profile.rp);
  else
    v_current_change := coalesce(v_duel.player_b_rp_change, v_b_delta, 0);
    v_current_after := coalesce(v_duel.player_b_rp_after, v_b_profile.rp);
  end if;

  select rs.status
    into v_season_status
  from public.ranked_seasons rs
  where rs.season_id = v_duel.season_id
  limit 1;

  if v_next_status = 'completed' and v_season_status = 'completed' then
    perform public.refresh_ranked_season_results(v_duel.season_id);
  end if;

  return query
  select v_duel.ranked_duel_id, v_duel.status, v_duel.winner_user_id, v_current_change, v_current_after;
end;
$$;

grant execute on function public.current_ranked_season_info() to authenticated;
grant execute on function public.latest_unseen_ranked_season_recap() to authenticated;
grant execute on function public.mark_ranked_season_recap_viewed(uuid) to authenticated;
