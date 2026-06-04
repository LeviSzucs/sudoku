-- Ranked Duel MVP: seasons, RP profiles, async matchmaking, RP finalisation.

alter table public.puzzle_sessions drop constraint if exists puzzle_sessions_mode_check;
alter table public.puzzle_sessions
  add constraint puzzle_sessions_mode_check
  check (mode in ('classic', 'daily', 'daily_duel', 'duel', 'friend_challenge', 'ranked', 'ranked_duel'));

alter table public.game_results drop constraint if exists game_results_mode_check;
alter table public.game_results
  add constraint game_results_mode_check
  check (mode in ('classic', 'daily', 'daily_duel', 'duel', 'friend_challenge', 'ranked', 'ranked_duel'));

create table if not exists public.ranked_seasons (
  season_id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint ranked_seasons_status_check check (status in ('upcoming', 'active', 'completed')),
  constraint ranked_seasons_dates_check check (ends_at > starts_at)
);

create index if not exists ranked_seasons_status_dates_idx
  on public.ranked_seasons (status, starts_at, ends_at);

insert into public.ranked_seasons (name, starts_at, ends_at, status)
select 'Season 1', now(), now() + interval '28 days', 'active'
where not exists (
  select 1 from public.ranked_seasons where status = 'active'
);

create table if not exists public.ranked_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.ranked_seasons(season_id) on delete cascade,
  rp integer not null default 0 check (rp >= 0),
  peak_rp integer not null default 0 check (peak_rp >= 0),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  win_streak integer not null default 0 check (win_streak >= 0),
  best_win_streak integer not null default 0 check (best_win_streak >= 0),
  current_tier text not null default 'Bronze III',
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

create index if not exists ranked_profiles_season_rp_idx
  on public.ranked_profiles (season_id, rp desc, wins desc, matches_played asc, updated_at asc);

create table if not exists public.ranked_duels (
  ranked_duel_id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ranked_seasons(season_id) on delete cascade,
  puzzle_id text not null references public.puzzles(puzzle_id) on delete cascade,
  player_a_id uuid not null references auth.users(id) on delete cascade,
  player_b_id uuid references auth.users(id) on delete cascade,
  player_a_rp_before integer,
  player_b_rp_before integer,
  player_a_rp_after integer,
  player_b_rp_after integer,
  player_a_rp_change integer,
  player_b_rp_change integer,
  player_a_session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  player_b_session_id uuid references public.puzzle_sessions(session_id) on delete set null,
  player_a_result_id text references public.game_results(result_id) on delete set null,
  player_b_result_id text references public.game_results(result_id) on delete set null,
  status text not null default 'waiting_for_opponent',
  winner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  matched_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ranked_duels_no_self check (player_b_id is null or player_a_id <> player_b_id),
  constraint ranked_duels_status_check check (status in (
    'waiting_for_opponent',
    'matched',
    'player_a_completed',
    'player_b_completed',
    'completed',
    'cancelled',
    'expired'
  ))
);

create index if not exists ranked_duels_season_status_idx
  on public.ranked_duels (season_id, status, created_at);

create index if not exists ranked_duels_player_a_idx
  on public.ranked_duels (player_a_id, season_id, status);

create index if not exists ranked_duels_player_b_idx
  on public.ranked_duels (player_b_id, season_id, status)
  where player_b_id is not null;

alter table public.ranked_profiles enable row level security;
alter table public.ranked_duels enable row level security;
alter table public.ranked_seasons enable row level security;

drop policy if exists "Ranked seasons are readable" on public.ranked_seasons;
create policy "Ranked seasons are readable"
on public.ranked_seasons
for select
using (true);

drop policy if exists "Ranked profiles are readable" on public.ranked_profiles;
create policy "Ranked profiles are readable"
on public.ranked_profiles
for select
using (true);

drop policy if exists "Users can read their ranked duels" on public.ranked_duels;
create policy "Users can read their ranked duels"
on public.ranked_duels
for select
using (auth.uid() = player_a_id or auth.uid() = player_b_id);

create or replace function public.ranked_tier_for_rp(p_rp integer)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_rp integer := greatest(coalesce(p_rp, 0), 0);
begin
  return case
    when v_rp >= 3500 then 'Master'
    when v_rp >= 3050 then 'Diamond I'
    when v_rp >= 2700 then 'Diamond II'
    when v_rp >= 2350 then 'Diamond III'
    when v_rp >= 2000 then 'Platinum I'
    when v_rp >= 1750 then 'Platinum II'
    when v_rp >= 1500 then 'Platinum III'
    when v_rp >= 1250 then 'Gold I'
    when v_rp >= 1050 then 'Gold II'
    when v_rp >= 850 then 'Gold III'
    when v_rp >= 650 then 'Silver I'
    when v_rp >= 500 then 'Silver II'
    when v_rp >= 350 then 'Silver III'
    when v_rp >= 200 then 'Bronze I'
    when v_rp >= 100 then 'Bronze II'
    else 'Bronze III'
  end;
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
begin
  select *
    into v_season
  from public.ranked_seasons
  where status = 'active'
    and starts_at <= now()
    and ends_at > now()
  order by starts_at desc
  limit 1;

  if v_season.season_id is null then
    insert into public.ranked_seasons (name, starts_at, ends_at, status)
    values ('Season 1', now(), now() + interval '28 days', 'active')
    returning * into v_season;
  end if;

  return v_season;
end;
$$;

create or replace function public.ensure_ranked_profile(p_user_id uuid, p_season_id uuid)
returns public.ranked_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.ranked_profiles%rowtype;
begin
  if p_user_id is null or p_season_id is null then
    raise exception 'Missing ranked profile input.' using errcode = '22023';
  end if;

  insert into public.ranked_profiles (user_id, season_id, current_tier)
  values (p_user_id, p_season_id, public.ranked_tier_for_rp(0))
  on conflict (user_id, season_id) do nothing;

  select *
    into v_profile
  from public.ranked_profiles
  where user_id = p_user_id
    and season_id = p_season_id;

  return v_profile;
end;
$$;

create or replace function public.ranked_duels_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ranked_duels_set_updated_at on public.ranked_duels;
create trigger ranked_duels_set_updated_at
before update on public.ranked_duels
for each row execute function public.ranked_duels_set_updated_at();

create or replace function public.ranked_result_winner(
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_a_won boolean,
  p_b_won boolean,
  p_a_score integer,
  p_b_score integer,
  p_a_seconds integer,
  p_b_seconds integer,
  p_a_completed_at timestamptz,
  p_b_completed_at timestamptz
)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  if coalesce(p_a_won, false) = false and coalesce(p_b_won, false) = false then
    return null;
  end if;
  if coalesce(p_a_won, false) = true and coalesce(p_b_won, false) = false then
    return p_player_a_id;
  end if;
  if coalesce(p_b_won, false) = true and coalesce(p_a_won, false) = false then
    return p_player_b_id;
  end if;
  if coalesce(p_a_score, 0) > coalesce(p_b_score, 0) then
    return p_player_a_id;
  elsif coalesce(p_b_score, 0) > coalesce(p_a_score, 0) then
    return p_player_b_id;
  elsif coalesce(p_a_seconds, 999999) < coalesce(p_b_seconds, 999999) then
    return p_player_a_id;
  elsif coalesce(p_b_seconds, 999999) < coalesce(p_a_seconds, 999999) then
    return p_player_b_id;
  elsif p_a_completed_at is not null and p_b_completed_at is not null and p_a_completed_at < p_b_completed_at then
    return p_player_a_id;
  elsif p_a_completed_at is not null and p_b_completed_at is not null and p_b_completed_at < p_a_completed_at then
    return p_player_b_id;
  end if;
  return null;
end;
$$;

create or replace function public.ranked_rp_delta(
  p_player_rp integer,
  p_opponent_rp integer,
  p_outcome text
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_diff integer := coalesce(p_opponent_rp, 0) - coalesce(p_player_rp, 0);
begin
  if p_outcome = 'win' then
    return least(40, greatest(15, 25 + floor(v_diff::numeric / 30)::integer));
  elsif p_outcome = 'loss' then
    return greatest(-30, least(-5, -15 + floor(v_diff::numeric / 40)::integer));
  elsif p_outcome = 'draw' then
    return least(8, greatest(0, 5 + floor(v_diff::numeric / 100)::integer));
  end if;
  return 0;
end;
$$;

create or replace function public.apply_ranked_profile_delta(
  p_user_id uuid,
  p_season_id uuid,
  p_delta integer,
  p_outcome text
)
returns public.ranked_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.ranked_profiles%rowtype;
  v_new_rp integer;
  v_new_streak integer;
begin
  perform public.ensure_ranked_profile(p_user_id, p_season_id);

  select *
    into v_profile
  from public.ranked_profiles
  where user_id = p_user_id
    and season_id = p_season_id
  for update;

  v_new_rp := greatest(0, coalesce(v_profile.rp, 0) + coalesce(p_delta, 0));
  v_new_streak := case when p_outcome = 'win' then coalesce(v_profile.win_streak, 0) + 1 else 0 end;

  update public.ranked_profiles
  set rp = v_new_rp,
      peak_rp = greatest(coalesce(peak_rp, 0), v_new_rp),
      matches_played = matches_played + 1,
      wins = wins + case when p_outcome = 'win' then 1 else 0 end,
      losses = losses + case when p_outcome = 'loss' then 1 else 0 end,
      draws = draws + case when p_outcome = 'draw' then 1 else 0 end,
      win_streak = v_new_streak,
      best_win_streak = greatest(best_win_streak, v_new_streak),
      current_tier = public.ranked_tier_for_rp(v_new_rp),
      updated_at = now()
  where user_id = p_user_id
    and season_id = p_season_id
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.ranked_result_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode = 'ranked_duel' and new.completed = true then
    new.eligible_for_ranked := true;
    new.eligible_for_leaderboard := false;
    if new.won is null and coalesce(new.final_score, 0) > 0 then
      new.won := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ranked_result_defaults_trigger on public.game_results;
create trigger ranked_result_defaults_trigger
before insert or update on public.game_results
for each row execute function public.ranked_result_defaults();

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
  v_a_result public.game_results%rowtype;
  v_b_result public.game_results%rowtype;
  v_next_status text;
  v_winner uuid;
  v_a_outcome text;
  v_b_outcome text;
  v_a_delta integer := 0;
  v_b_delta integer := 0;
  v_a_profile public.ranked_profiles%rowtype;
  v_b_profile public.ranked_profiles%rowtype;
  v_current_change integer := 0;
  v_current_after integer := null;
begin
  select *
    into v_result
  from public.game_results
  where result_id = p_result_id
    and user_id = p_user_id
    and mode = 'ranked_duel'
    and completed = true
  limit 1;

  if v_result.result_id is null then
    raise exception 'Completed Ranked Duel result not found.' using errcode = '22023';
  end if;

  select *
    into v_duel
  from public.ranked_duels rd
  where (
    p_session_id is not null
    and (
      (rd.player_a_session_id = p_session_id and rd.player_a_id = p_user_id)
      or (rd.player_b_session_id = p_session_id and rd.player_b_id = p_user_id)
    )
  )
  for update;

  if v_duel.ranked_duel_id is null then
    select *
      into v_duel
    from public.ranked_duels rd
    where rd.puzzle_id = v_result.puzzle_id
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed', 'completed')
      and (
        (
          rd.player_a_id = p_user_id
          and (rd.player_a_result_id is null or rd.player_a_result_id = p_result_id)
          and (rd.player_a_session_id is null or rd.player_a_session_id = v_result.session_id)
        )
        or (
          rd.player_b_id = p_user_id
          and (rd.player_b_result_id is null or rd.player_b_result_id = p_result_id)
          and (rd.player_b_session_id is null or rd.player_b_session_id = v_result.session_id)
        )
      )
    order by rd.created_at desc
    limit 1
    for update;
  end if;

  if v_duel.ranked_duel_id is null then
    raise exception 'Ranked Duel not found for result.' using errcode = '22023';
  end if;

  if p_user_id = v_duel.player_a_id then
    v_duel.player_a_session_id := coalesce(v_duel.player_a_session_id, v_result.session_id, p_session_id);
    v_duel.player_a_result_id := coalesce(v_duel.player_a_result_id, p_result_id);
  elsif p_user_id = v_duel.player_b_id then
    v_duel.player_b_session_id := coalesce(v_duel.player_b_session_id, v_result.session_id, p_session_id);
    v_duel.player_b_result_id := coalesce(v_duel.player_b_result_id, p_result_id);
  else
    raise exception 'Result user is not part of this Ranked Duel.' using errcode = '42501';
  end if;

  if v_duel.player_a_result_id is not null then
    select * into v_a_result from public.game_results where result_id = v_duel.player_a_result_id limit 1;
  end if;
  if v_duel.player_b_result_id is not null then
    select * into v_b_result from public.game_results where result_id = v_duel.player_b_result_id limit 1;
  end if;

  v_next_status := case
    when v_duel.player_a_result_id is not null and v_duel.player_b_result_id is not null then 'completed'
    when v_duel.player_a_result_id is not null then 'player_a_completed'
    when v_duel.player_b_result_id is not null then 'player_b_completed'
    when v_duel.player_b_id is not null then 'matched'
    else 'waiting_for_opponent'
  end;

  v_winner := case
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

  if v_next_status = 'completed' and v_duel.status <> 'completed' then
    v_a_outcome := case when v_winner is null then 'draw' when v_winner = v_duel.player_a_id then 'win' else 'loss' end;
    v_b_outcome := case when v_winner is null then 'draw' when v_winner = v_duel.player_b_id then 'win' else 'loss' end;
    v_a_delta := public.ranked_rp_delta(coalesce(v_duel.player_a_rp_before, 0), coalesce(v_duel.player_b_rp_before, 0), v_a_outcome);
    v_b_delta := public.ranked_rp_delta(coalesce(v_duel.player_b_rp_before, 0), coalesce(v_duel.player_a_rp_before, 0), v_b_outcome);

    v_a_profile := public.apply_ranked_profile_delta(v_duel.player_a_id, v_duel.season_id, v_a_delta, v_a_outcome);
    v_b_profile := public.apply_ranked_profile_delta(v_duel.player_b_id, v_duel.season_id, v_b_delta, v_b_outcome);

    update public.game_results
    set rp_change = case
          when result_id = v_duel.player_a_result_id then v_a_delta
          when result_id = v_duel.player_b_result_id then v_b_delta
          else rp_change
        end,
        eligible_for_ranked = true,
        eligible_for_leaderboard = false
    where result_id in (v_duel.player_a_result_id, v_duel.player_b_result_id);
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

  return query
  select v_duel.ranked_duel_id, v_duel.status, v_duel.winner_user_id, v_current_change, v_current_after;
end;
$$;

create or replace function public.ranked_result_link_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mode = 'ranked_duel' and new.completed = true then
    begin
      perform public.link_ranked_duel_result(new.user_id, new.session_id, new.result_id);
    exception
      when others then
        raise notice 'Could not link Ranked Duel result %: %', new.result_id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists ranked_result_link_trigger on public.game_results;
create trigger ranked_result_link_trigger
after insert or update on public.game_results
for each row
when (new.mode = 'ranked_duel' and new.completed = true)
execute function public.ranked_result_link_trigger();

create or replace function public.ranked_duel_view(p_ranked_duel_id uuid default null)
returns table (
  ranked_duel_id uuid,
  season_id uuid,
  season_name text,
  season_ends_at timestamptz,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid,
  current_user_result_id text,
  opponent_user_id uuid,
  opponent_display_name text,
  opponent_username_handle text,
  opponent_initials text,
  opponent_avatar_color text,
  opponent_tier text,
  your_score integer,
  your_elapsed_seconds integer,
  opponent_score integer,
  opponent_elapsed_seconds integer,
  winner_user_id uuid,
  rp_before integer,
  rp_after integer,
  rp_change integer,
  current_rp integer,
  current_tier text,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.ranked_seasons%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_season := public.active_ranked_season();
  perform public.ensure_ranked_profile(v_user_id, v_season.season_id);

  return query
  with mine as (
    select rd.*
    from public.ranked_duels rd
    where (p_ranked_duel_id is null or rd.ranked_duel_id = p_ranked_duel_id)
      and rd.season_id = v_season.season_id
      and (rd.player_a_id = v_user_id or rd.player_b_id = v_user_id)
    order by case when rd.status in ('waiting_for_opponent','matched','player_a_completed','player_b_completed') then 0 else 1 end,
             rd.updated_at desc
    limit 1
  ),
  shaped as (
    select
      m.*,
      case when m.player_a_id = v_user_id then m.player_a_session_id else m.player_b_session_id end as my_session_id,
      case when m.player_a_id = v_user_id then m.player_a_result_id else m.player_b_result_id end as my_result_id,
      case when m.player_a_id = v_user_id then m.player_b_id else m.player_a_id end as opponent_id,
      case when m.player_a_id = v_user_id then m.player_b_result_id else m.player_a_result_id end as opponent_result_id,
      case when m.player_a_id = v_user_id then m.player_a_rp_before else m.player_b_rp_before end as my_rp_before,
      case when m.player_a_id = v_user_id then m.player_a_rp_after else m.player_b_rp_after end as my_rp_after,
      case when m.player_a_id = v_user_id then m.player_a_rp_change else m.player_b_rp_change end as my_rp_change
    from mine m
  )
  select
    s.ranked_duel_id,
    rs.season_id,
    rs.name,
    rs.ends_at,
    s.status,
    s.puzzle_id,
    p.difficulty,
    s.my_session_id,
    s.my_result_id,
    s.opponent_id,
    coalesce(nullif(trim(prof.display_name), ''), prof.username_handle, 'Opponent'),
    prof.username_handle,
    coalesce(nullif(trim(prof.initials), ''), 'OP'),
    coalesce(prof.avatar_color, '#3F7D58'),
    opponent_profile.current_tier,
    my_result.final_score,
    my_result.elapsed_seconds,
    opp_result.final_score,
    opp_result.elapsed_seconds,
    s.winner_user_id,
    s.my_rp_before,
    s.my_rp_after,
    s.my_rp_change,
    current_profile.rp,
    current_profile.current_tier,
    current_profile.matches_played,
    current_profile.wins,
    current_profile.losses,
    current_profile.draws,
    s.completed_at
  from shaped s
  join public.ranked_seasons rs on rs.season_id = s.season_id
  join public.puzzles p on p.puzzle_id = s.puzzle_id
  join public.ranked_profiles current_profile on current_profile.user_id = v_user_id and current_profile.season_id = s.season_id
  left join public.profiles prof on prof.id = s.opponent_id
  left join public.ranked_profiles opponent_profile on opponent_profile.user_id = s.opponent_id and opponent_profile.season_id = s.season_id
  left join public.game_results my_result on my_result.result_id = s.my_result_id
  left join public.game_results opp_result on opp_result.result_id = s.opponent_result_id;
end;
$$;

create or replace function public.enter_ranked_duel()
returns table (
  ranked_duel_id uuid,
  season_id uuid,
  season_name text,
  season_ends_at timestamptz,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid,
  current_user_result_id text,
  opponent_user_id uuid,
  opponent_display_name text,
  opponent_username_handle text,
  opponent_initials text,
  opponent_avatar_color text,
  opponent_tier text,
  your_score integer,
  your_elapsed_seconds integer,
  opponent_score integer,
  opponent_elapsed_seconds integer,
  winner_user_id uuid,
  rp_before integer,
  rp_after integer,
  rp_change integer,
  current_rp integer,
  current_tier text,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.ranked_seasons%rowtype;
  v_profile public.ranked_profiles%rowtype;
  v_waiting public.ranked_duels%rowtype;
  v_duel public.ranked_duels%rowtype;
  v_session public.puzzle_sessions%rowtype;
  v_puzzle public.puzzles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_season := public.active_ranked_season();
  v_profile := public.ensure_ranked_profile(v_user_id, v_season.season_id);

  select *
    into v_duel
  from public.ranked_duels rd
  where rd.season_id = v_season.season_id
    and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
    and (rd.player_a_id = v_user_id or rd.player_b_id = v_user_id)
  order by rd.updated_at desc
  limit 1;

  if v_duel.ranked_duel_id is not null then
    return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
    return;
  end if;

  select *
    into v_waiting
  from public.ranked_duels rd
  where rd.season_id = v_season.season_id
    and rd.status = 'waiting_for_opponent'
    and rd.player_a_id <> v_user_id
    and rd.player_b_id is null
    and abs(coalesce(rd.player_a_rp_before, 0) - coalesce(v_profile.rp, 0)) <= 300
  order by abs(coalesce(rd.player_a_rp_before, 0) - coalesce(v_profile.rp, 0)) asc, rd.created_at asc
  limit 1
  for update skip locked;

  if v_waiting.ranked_duel_id is not null then
    insert into public.puzzle_sessions (
      user_id, puzzle_id, mode, difficulty, board_state, notes_state,
      elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
    )
    select
      v_user_id, p.puzzle_id, 'ranked_duel', p.difficulty,
      public.sudoku_givens_to_board(p.givens), public.empty_sudoku_notes(),
      0, 0, 0, 0, '[]'::jsonb, 'in_progress'
    from public.puzzles p
    where p.puzzle_id = v_waiting.puzzle_id
    returning * into v_session;

    update public.ranked_duels rd
    set player_b_id = v_user_id,
        player_b_session_id = v_session.session_id,
        player_b_rp_before = v_profile.rp,
        status = 'matched',
        matched_at = now(),
        updated_at = now()
    where rd.ranked_duel_id = v_waiting.ranked_duel_id
    returning * into v_duel;

    return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
    return;
  end if;

  select *
    into v_puzzle
  from public.puzzles
  where is_active = true
    and difficulty in ('Medium', 'Hard')
  order by random()
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'No active Ranked Duel puzzle is available.' using errcode = '22023';
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_user_id, v_puzzle.puzzle_id, 'ranked_duel', v_puzzle.difficulty,
    public.sudoku_givens_to_board(v_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  insert into public.ranked_duels (
    season_id, puzzle_id, player_a_id, player_a_rp_before, player_a_session_id, status
  )
  values (
    v_season.season_id, v_puzzle.puzzle_id, v_user_id, v_profile.rp, v_session.session_id, 'waiting_for_opponent'
  )
  returning * into v_duel;

  return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
end;
$$;

create or replace function public.get_ranked_leaderboard()
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  current_tier text,
  rp integer,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  updated_at timestamptz
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
    row_number() over (order by rp.rp desc, rp.wins desc, rp.matches_played asc, rp.updated_at asc) as rank,
    rp.user_id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as display_name,
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
    coalesce(p.avatar_color, '#A8A294') as avatar_color,
    rp.current_tier,
    rp.rp,
    rp.matches_played,
    rp.wins,
    rp.losses,
    rp.draws,
    rp.updated_at
  from public.ranked_profiles rp
  left join public.profiles p on p.id = rp.user_id
  where rp.season_id = v_season.season_id
  order by rp.rp desc, rp.wins desc, rp.matches_played asc, rp.updated_at asc
  limit 100;
end;
$$;

grant execute on function public.ranked_tier_for_rp(integer) to anon, authenticated;
grant execute on function public.active_ranked_season() to authenticated;
grant execute on function public.ensure_ranked_profile(uuid, uuid) to authenticated;
grant execute on function public.link_ranked_duel_result(uuid, uuid, text) to authenticated;
grant execute on function public.ranked_duel_view(uuid) to authenticated;
grant execute on function public.enter_ranked_duel() to authenticated;
grant execute on function public.get_ranked_leaderboard() to anon, authenticated;

-- Extend failed result finalisation to Ranked Duel attempts.

create or replace function public.submit_failed_puzzle_result(
  p_session_id uuid,
  p_elapsed_seconds integer,
  p_mistakes integer,
  p_hints_used integer,
  p_undo_count integer,
  p_completed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.puzzle_sessions%rowtype;
  v_puzzle public.puzzles%rowtype;
  v_existing public.game_results%rowtype;
  v_result public.game_results%rowtype;
  v_result_id text;
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_stats jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_session_id is null then
    raise exception 'Missing session_id' using errcode = '22023';
  end if;

  if coalesce(p_elapsed_seconds, -1) < 0
    or coalesce(p_mistakes, -1) < 0
    or coalesce(p_hints_used, -1) < 0
    or coalesce(p_undo_count, -1) < 0 then
    raise exception 'Elapsed seconds, mistakes, hints, and undo counts must be non-negative' using errcode = '22023';
  end if;

  select *
    into v_session
  from public.puzzle_sessions
  where session_id = p_session_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Puzzle session not found or not owned by user' using errcode = '42501';
  end if;

  select *
    into v_existing
  from public.game_results
  where session_id = p_session_id
    and user_id = v_user_id
  limit 1;

  if found then
    update public.puzzle_sessions
    set status = case when status = 'in_progress' then 'failed' else status end,
        elapsed_seconds = greatest(coalesce(p_elapsed_seconds, 0), elapsed_seconds),
        mistakes = greatest(coalesce(p_mistakes, 0), mistakes),
        hints_used = greatest(coalesce(p_hints_used, 0), hints_used),
        undo_count = greatest(coalesce(p_undo_count, 0), undo_count),
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id;

    if v_existing.mode = 'friend_challenge' then
      perform public.complete_friend_challenge_result(p_session_id, v_existing.result_id);
    elsif v_existing.mode = 'daily_duel' then
      perform public.link_daily_duel_result(v_user_id, p_session_id, v_existing.result_id);
    elsif v_existing.mode = 'ranked_duel' then
      perform public.link_ranked_duel_result(v_user_id, p_session_id, v_existing.result_id);
    end if;

    return jsonb_build_object(
      'result_id', v_existing.result_id,
      'session_id', v_existing.session_id,
      'puzzle_id', v_existing.puzzle_id,
      'mode', v_existing.mode,
      'difficulty', v_existing.difficulty,
      'elapsed_seconds', v_existing.elapsed_seconds,
      'mistakes', v_existing.mistakes,
      'hints_used', v_existing.hints_used,
      'undo_count', v_existing.undo_count,
      'final_score', v_existing.final_score,
      'xp_earned', v_existing.xp_earned,
      'leaderboard_eligible', v_existing.eligible_for_leaderboard,
      'ranked_eligible', v_existing.eligible_for_ranked,
      'completed_at', v_existing.completed_at,
      'badges_unlocked', '[]'::jsonb,
      'updated_profile_stats', (
        select to_jsonb(ps)
        from public.player_stats ps
        where ps.user_id = v_user_id
      ),
      'already_finalized', true,
      'won', v_existing.won
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Puzzle session is not in progress' using errcode = '22023';
  end if;

  if v_session.mode not in ('daily', 'daily_duel', 'friend_challenge', 'ranked_duel') then
    raise exception 'Failed official finalisation is only supported for Daily, Daily Duel, Friend Challenge, and Ranked Duel attempts' using errcode = '22023';
  end if;

  if v_session.puzzle_id is null then
    raise exception 'Puzzle session has no puzzle_id' using errcode = '22023';
  end if;

  select *
    into v_puzzle
  from public.puzzles
  where puzzle_id = v_session.puzzle_id;

  if not found then
    raise exception 'Puzzle not found' using errcode = '22023';
  end if;

  insert into public.player_stats (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  v_result_id := v_user_id::text || '_' || p_session_id::text || '_failed';

  insert into public.game_results (
    result_id,
    user_id,
    session_id,
    puzzle_id,
    mode,
    difficulty,
    completed,
    won,
    elapsed_seconds,
    mistakes,
    hints_used,
    undo_count,
    final_score,
    xp_earned,
    rp_change,
    eligible_for_leaderboard,
    eligible_for_ranked,
    completed_at
  )
  values (
    v_result_id,
    v_user_id,
    p_session_id,
    v_session.puzzle_id,
    v_session.mode,
    v_puzzle.difficulty,
    true,
    false,
    greatest(coalesce(p_elapsed_seconds, 0), 0),
    greatest(coalesce(p_mistakes, 0), 0),
    greatest(coalesce(p_hints_used, 0), 0),
    greatest(coalesce(p_undo_count, 0), 0),
    0,
    0,
    0,
    false,
    v_session.mode = 'ranked_duel',
    v_completed_at
  )
  on conflict do nothing
  returning * into v_result;

  if v_result.result_id is null then
    select *
      into v_existing
    from public.game_results
    where user_id = v_user_id
      and (
        session_id = p_session_id
        or (
          v_session.mode = 'daily'
          and mode = 'daily'
          and puzzle_id = v_session.puzzle_id
          and completed = true
        )
      )
    order by completed_at asc nulls last, final_score desc, result_id asc
    limit 1;

    if v_existing.result_id is null then
      raise exception 'Duplicate failed result could not be reused' using errcode = '23505';
    end if;

    update public.puzzle_sessions
    set status = 'failed',
        elapsed_seconds = greatest(coalesce(p_elapsed_seconds, 0), elapsed_seconds),
        mistakes = greatest(coalesce(p_mistakes, 0), mistakes),
        hints_used = greatest(coalesce(p_hints_used, 0), hints_used),
        undo_count = greatest(coalesce(p_undo_count, 0), undo_count),
        updated_at = now()
    where session_id = p_session_id
      and user_id = v_user_id;

    if v_existing.mode = 'friend_challenge' then
      perform public.complete_friend_challenge_result(p_session_id, v_existing.result_id);
    elsif v_existing.mode = 'daily_duel' then
      perform public.link_daily_duel_result(v_user_id, p_session_id, v_existing.result_id);
    elsif v_existing.mode = 'ranked_duel' then
      perform public.link_ranked_duel_result(v_user_id, p_session_id, v_existing.result_id);
    end if;

    return jsonb_build_object(
      'result_id', v_existing.result_id,
      'session_id', v_existing.session_id,
      'puzzle_id', v_existing.puzzle_id,
      'mode', v_existing.mode,
      'difficulty', v_existing.difficulty,
      'elapsed_seconds', v_existing.elapsed_seconds,
      'mistakes', v_existing.mistakes,
      'hints_used', v_existing.hints_used,
      'undo_count', v_existing.undo_count,
      'final_score', v_existing.final_score,
      'xp_earned', v_existing.xp_earned,
      'leaderboard_eligible', v_existing.eligible_for_leaderboard,
      'ranked_eligible', v_existing.eligible_for_ranked,
      'completed_at', v_existing.completed_at,
      'badges_unlocked', '[]'::jsonb,
      'updated_profile_stats', (
        select to_jsonb(ps)
        from public.player_stats ps
        where ps.user_id = v_user_id
      ),
      'already_finalized', true,
      'won', v_existing.won
    );
  end if;

  update public.puzzle_sessions
  set status = 'failed',
      elapsed_seconds = greatest(coalesce(p_elapsed_seconds, 0), elapsed_seconds),
      mistakes = greatest(coalesce(p_mistakes, 0), mistakes),
      hints_used = greatest(coalesce(p_hints_used, 0), hints_used),
      undo_count = greatest(coalesce(p_undo_count, 0), undo_count),
      updated_at = now()
  where session_id = p_session_id
    and user_id = v_user_id;

  if v_result.mode = 'friend_challenge' then
    perform public.complete_friend_challenge_result(p_session_id, v_result.result_id);
  elsif v_result.mode = 'daily_duel' then
    perform public.link_daily_duel_result(v_user_id, p_session_id, v_result.result_id);
  elsif v_result.mode = 'ranked_duel' then
    perform public.link_ranked_duel_result(v_user_id, p_session_id, v_result.result_id);
  end if;

  select to_jsonb(ps)
    into v_stats
  from public.player_stats ps
  where ps.user_id = v_user_id;

  return jsonb_build_object(
    'result_id', v_result.result_id,
    'session_id', v_result.session_id,
    'puzzle_id', v_result.puzzle_id,
    'mode', v_result.mode,
    'difficulty', v_result.difficulty,
    'elapsed_seconds', v_result.elapsed_seconds,
    'mistakes', v_result.mistakes,
    'hints_used', v_result.hints_used,
    'undo_count', v_result.undo_count,
    'final_score', v_result.final_score,
    'xp_earned', v_result.xp_earned,
    'leaderboard_eligible', v_result.eligible_for_leaderboard,
    'ranked_eligible', v_result.eligible_for_ranked,
    'completed_at', v_result.completed_at,
    'badges_unlocked', '[]'::jsonb,
    'updated_profile_stats', v_stats,
    'already_finalized', false,
    'won', v_result.won
  );
end;
$$;

grant execute on function public.submit_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz) to authenticated;
