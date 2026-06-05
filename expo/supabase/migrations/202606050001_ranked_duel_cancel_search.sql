-- Allow a player to cancel an unmatched Ranked Duel queue entry.

create or replace function public.cancel_ranked_duel(p_ranked_duel_id uuid)
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
  v_duel public.ranked_duels%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select *
    into v_duel
  from public.ranked_duels rd
  where rd.ranked_duel_id = p_ranked_duel_id
  for update;

  if v_duel.ranked_duel_id is null then
    raise exception 'Ranked Duel not found.' using errcode = '22023';
  end if;

  if v_duel.player_a_id <> v_user_id then
    raise exception 'Only the searching player can cancel this Ranked Duel.' using errcode = '42501';
  end if;

  if v_duel.status <> 'waiting_for_opponent'
    or v_duel.player_b_id is not null
    or v_duel.player_a_result_id is not null
    or v_duel.player_b_result_id is not null then
    raise exception 'Opponent found. This match is now locked.' using errcode = '55000';
  end if;

  update public.ranked_duels rd
  set status = 'cancelled',
      updated_at = now()
  where rd.ranked_duel_id = v_duel.ranked_duel_id;

  if v_duel.player_a_session_id is not null then
    update public.puzzle_sessions ps
    set status = 'abandoned',
        updated_at = now()
    where ps.session_id = v_duel.player_a_session_id
      and ps.user_id = v_user_id
      and ps.status = 'in_progress';
  end if;

  return query select * from public.ranked_duel_view(v_duel.ranked_duel_id);
end;
$$;

grant execute on function public.cancel_ranked_duel(uuid) to authenticated;
