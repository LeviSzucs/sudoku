-- Repair and harden Friend Challenge session/result linking.
-- The positive scoring migration saves friend_challenge game_results correctly,
-- but challenge rows must also be linked and advanced to completed.

create or replace function public.link_friend_challenge_result(
  p_user_id uuid,
  p_session_id uuid,
  p_result_id text
)
returns table (
  challenge_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.game_results%rowtype;
  v_challenge public.friend_challenges%rowtype;
  v_next_status text;
begin
  if p_user_id is null or p_result_id is null then
    raise exception 'Missing friend challenge result link input.' using errcode = '22023';
  end if;

  select *
    into v_result
  from public.game_results gr
  where gr.result_id = p_result_id
    and gr.user_id = p_user_id
    and gr.mode = 'friend_challenge'
    and gr.completed = true
  limit 1;

  if v_result.result_id is null then
    raise exception 'Completed friend challenge result not found.' using errcode = '22023';
  end if;

  select *
    into v_challenge
  from public.friend_challenges fc
  where (
      p_session_id is not null
      and (
        (fc.challenger_session_id = p_session_id and fc.challenger_id = p_user_id)
        or (fc.challenged_session_id = p_session_id and fc.challenged_id = p_user_id)
      )
    )
  for update;

  if v_challenge.challenge_id is null then
    select *
      into v_challenge
    from public.friend_challenges fc
    where fc.puzzle_id = v_result.puzzle_id
      and fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed', 'completed')
      and (
        (
          fc.challenger_id = p_user_id
          and (fc.challenger_result_id is null or fc.challenger_result_id = p_result_id)
          and (fc.challenger_session_id is null or fc.challenger_session_id = v_result.session_id)
        )
        or (
          fc.challenged_id = p_user_id
          and (fc.challenged_result_id is null or fc.challenged_result_id = p_result_id)
          and (fc.challenged_session_id is null or fc.challenged_session_id = v_result.session_id)
        )
      )
    order by
      case when fc.status = 'completed' then 1 else 0 end,
      fc.created_at desc
    limit 1
    for update;
  end if;

  if v_challenge.challenge_id is null then
    raise exception 'Friend challenge not found for result.' using errcode = '22023';
  end if;

  if p_user_id = v_challenge.challenger_id then
    v_challenge.challenger_session_id := coalesce(v_challenge.challenger_session_id, v_result.session_id, p_session_id);
    v_challenge.challenger_result_id := coalesce(v_challenge.challenger_result_id, p_result_id);
  elsif p_user_id = v_challenge.challenged_id then
    v_challenge.challenged_session_id := coalesce(v_challenge.challenged_session_id, v_result.session_id, p_session_id);
    v_challenge.challenged_result_id := coalesce(v_challenge.challenged_result_id, p_result_id);
  else
    raise exception 'Result user is not part of this friend challenge.' using errcode = '42501';
  end if;

  v_next_status := case
    when v_challenge.challenger_result_id is not null and v_challenge.challenged_result_id is not null then 'completed'
    when v_challenge.challenger_result_id is not null then 'challenger_completed'
    when v_challenge.challenged_result_id is not null then 'challenged_completed'
    else coalesce(v_challenge.status, 'accepted')
  end;

  update public.friend_challenges fc
  set challenger_session_id = v_challenge.challenger_session_id,
      challenged_session_id = v_challenge.challenged_session_id,
      challenger_result_id = v_challenge.challenger_result_id,
      challenged_result_id = v_challenge.challenged_result_id,
      status = v_next_status,
      completed_at = case
        when v_next_status = 'completed' then coalesce(
          fc.completed_at,
          (
            select greatest(cr.completed_at, tr.completed_at)
            from public.game_results cr
            join public.game_results tr on tr.result_id = v_challenge.challenged_result_id
            where cr.result_id = v_challenge.challenger_result_id
          ),
          now()
        )
        else fc.completed_at
      end,
      updated_at = now()
  where fc.challenge_id = v_challenge.challenge_id
  returning * into v_challenge;

  return query
  select v_challenge.challenge_id, v_challenge.status, v_challenge.completed_at;
end;
$$;

create or replace function public.complete_friend_challenge_result(p_session_id uuid, p_result_id text)
returns table (
  challenge_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result public.game_results%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select *
    into v_result
  from public.game_results gr
  where gr.result_id = p_result_id
    and gr.user_id = v_user_id
    and gr.mode = 'friend_challenge'
    and gr.completed = true
    and (p_session_id is null or gr.session_id = p_session_id)
  limit 1;

  if v_result.result_id is null then
    raise exception 'Completed friend challenge result not found.' using errcode = '22023';
  end if;

  return query
  select *
  from public.link_friend_challenge_result(v_user_id, coalesce(p_session_id, v_result.session_id), p_result_id);
end;
$$;

create or replace function public.friend_challenge_result_won_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode = 'friend_challenge'
    and new.completed = true
    and new.won is null
    and coalesce(new.final_score, 0) > 0 then
    new.won := true;
  end if;

  return new;
end;
$$;

drop trigger if exists friend_challenge_result_won_default_trigger on public.game_results;
create trigger friend_challenge_result_won_default_trigger
before insert or update on public.game_results
for each row
execute function public.friend_challenge_result_won_default();

create or replace function public.friend_challenge_result_link_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mode = 'friend_challenge' and new.completed = true then
    begin
      perform public.link_friend_challenge_result(new.user_id, new.session_id, new.result_id);
    exception
      when others then
        raise notice 'Could not link friend challenge result %: %', new.result_id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists friend_challenge_result_link_trigger on public.game_results;
create trigger friend_challenge_result_link_trigger
after insert or update on public.game_results
for each row
when (new.mode = 'friend_challenge' and new.completed = true)
execute function public.friend_challenge_result_link_trigger();

update public.game_results gr
set won = true
where gr.mode = 'friend_challenge'
  and gr.completed = true
  and gr.won is null
  and coalesce(gr.final_score, 0) > 0;

with candidate_results as (
  select
    fc.challenge_id,
    challenger_result.result_id as challenger_result_id,
    challenger_result.session_id as challenger_session_id,
    challenged_result.result_id as challenged_result_id,
    challenged_result.session_id as challenged_session_id,
    greatest(challenger_result.completed_at, challenged_result.completed_at) as completed_at
  from public.friend_challenges fc
  left join lateral (
    select gr.result_id, gr.session_id, gr.completed_at
    from public.game_results gr
    where gr.user_id = fc.challenger_id
      and gr.puzzle_id = fc.puzzle_id
      and gr.mode = 'friend_challenge'
      and gr.completed = true
    order by gr.completed_at asc nulls last, gr.result_id asc
    limit 1
  ) challenger_result on true
  left join lateral (
    select gr.result_id, gr.session_id, gr.completed_at
    from public.game_results gr
    where gr.user_id = fc.challenged_id
      and gr.puzzle_id = fc.puzzle_id
      and gr.mode = 'friend_challenge'
      and gr.completed = true
    order by gr.completed_at asc nulls last, gr.result_id asc
    limit 1
  ) challenged_result on true
  where fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed')
    and (fc.challenger_result_id is null or fc.challenged_result_id is null)
)
update public.friend_challenges fc
set challenger_result_id = coalesce(fc.challenger_result_id, cr.challenger_result_id),
    challenged_result_id = coalesce(fc.challenged_result_id, cr.challenged_result_id),
    challenger_session_id = coalesce(fc.challenger_session_id, cr.challenger_session_id),
    challenged_session_id = coalesce(fc.challenged_session_id, cr.challenged_session_id),
    status = case
      when coalesce(fc.challenger_result_id, cr.challenger_result_id) is not null
       and coalesce(fc.challenged_result_id, cr.challenged_result_id) is not null then 'completed'
      when coalesce(fc.challenger_result_id, cr.challenger_result_id) is not null then 'challenger_completed'
      when coalesce(fc.challenged_result_id, cr.challenged_result_id) is not null then 'challenged_completed'
      else fc.status
    end,
    completed_at = case
      when coalesce(fc.challenger_result_id, cr.challenger_result_id) is not null
       and coalesce(fc.challenged_result_id, cr.challenged_result_id) is not null then coalesce(fc.completed_at, cr.completed_at, now())
      else fc.completed_at
    end,
    updated_at = now()
from candidate_results cr
where fc.challenge_id = cr.challenge_id
  and (cr.challenger_result_id is not null or cr.challenged_result_id is not null);

grant execute on function public.link_friend_challenge_result(uuid, uuid, text) to authenticated;
grant execute on function public.complete_friend_challenge_result(uuid, text) to authenticated;
