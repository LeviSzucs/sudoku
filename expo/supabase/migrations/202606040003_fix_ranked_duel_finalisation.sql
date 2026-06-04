-- Repair and harden Ranked Duel result linking/finalisation.

create unique index if not exists game_results_ranked_duel_session_once_idx
  on public.game_results (user_id, session_id)
  where mode = 'ranked_duel'
    and completed = true
    and session_id is not null
    and eligible_for_ranked = true;

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
      and rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
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
    update public.game_results
    set eligible_for_ranked = false,
        eligible_for_leaderboard = false,
        rp_change = 0
    where result_id = v_result.result_id;

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
      update public.game_results
      set eligible_for_ranked = false,
          eligible_for_leaderboard = false,
          rp_change = 0
      where result_id = v_result.result_id;
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
      update public.game_results
      set eligible_for_ranked = false,
          eligible_for_leaderboard = false,
          rp_change = 0
      where result_id = v_result.result_id;
      raise exception 'Ranked Duel player B session mismatch.' using errcode = '22023';
    end if;

    v_duel.player_b_session_id := coalesce(v_duel.player_b_session_id, v_side_result.session_id, p_session_id);
    v_duel.player_b_result_id := v_side_result.result_id;
  end if;

  if v_result.result_id <> v_side_result.result_id then
    update public.game_results
    set eligible_for_ranked = false,
        eligible_for_leaderboard = false,
        rp_change = 0
    where result_id = v_result.result_id
      and result_id <> v_side_result.result_id;
  end if;

  if v_duel.player_a_result_id is not null then
    select * into v_a_result from public.game_results gr where gr.result_id = v_duel.player_a_result_id limit 1;
  end if;
  if v_duel.player_b_result_id is not null then
    select * into v_b_result from public.game_results gr where gr.result_id = v_duel.player_b_result_id limit 1;
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

  update public.game_results gr
  set rp_change = case
        when gr.result_id = v_duel.player_a_result_id then coalesce(v_duel.player_a_rp_change, v_a_delta)
        when gr.result_id = v_duel.player_b_result_id then coalesce(v_duel.player_b_rp_change, v_b_delta)
        else gr.rp_change
      end,
      eligible_for_ranked = true,
      eligible_for_leaderboard = false
  where gr.result_id in (v_duel.player_a_result_id, v_duel.player_b_result_id);

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

grant execute on function public.link_ranked_duel_result(uuid, uuid, text) to authenticated;

do $$
begin
  perform 1
  from public.link_ranked_duel_result(
    '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'::uuid,
    'b234d86c-0ba8-4509-94c1-c5551ab874b5'::uuid,
    '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0_b234d86c-0ba8-4509-94c1-c5551ab874b5'
  );
exception
  when others then
    raise notice 'Ranked Duel targeted repair skipped: %', sqlerrm;
end;
$$;

update public.game_results gr
set eligible_for_ranked = false,
    eligible_for_leaderboard = false,
    rp_change = 0
where gr.result_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0_e59d8ab7-79dc-4838-8b29-69c664cb580c'
  and not exists (
    select 1
    from public.ranked_duels rd
    where rd.player_a_result_id = gr.result_id
       or rd.player_b_result_id = gr.result_id
  );
