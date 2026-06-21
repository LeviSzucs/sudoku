-- Harden the notification pipeline so app notifications immediately fan out
-- into pending push delivery rows, and the Edge Function only reserves/sends
-- already-queued work.

create index if not exists push_notification_deliveries_status_idx
  on public.push_notification_deliveries (status, attempted_at asc, created_at asc);

create or replace function public.enqueue_push_notification_deliveries(p_notification_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.app_notifications%rowtype;
  v_inserted integer := 0;
begin
  if p_notification_id is null then
    return 0;
  end if;

  select *
    into v_notification
  from public.app_notifications an
  where an.notification_id = p_notification_id;

  if v_notification.notification_id is null then
    return 0;
  end if;

  if not public.notification_preference_enabled(v_notification.user_id, v_notification.type) then
    return 0;
  end if;

  insert into public.push_notification_deliveries (
    notification_id,
    token_id,
    user_id,
    status,
    attempted_at
  )
  select
    v_notification.notification_id,
    pt.token_id,
    v_notification.user_id,
    'pending',
    coalesce(v_notification.created_at, now())
  from public.push_tokens pt
  where pt.user_id = v_notification.user_id
    and pt.is_active = true
  on conflict (notification_id, token_id) do nothing;

  get diagnostics v_inserted = row_count;
  return coalesce(v_inserted, 0);
end;
$$;

revoke all on function public.enqueue_push_notification_deliveries(uuid) from public;
revoke all on function public.enqueue_push_notification_deliveries(uuid) from authenticated;
grant execute on function public.enqueue_push_notification_deliveries(uuid) to service_role;

create or replace function public.enqueue_app_notification_pushes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.enqueue_push_notification_deliveries(new.notification_id);
  exception
    when others then
      raise warning 'enqueue_app_notification_pushes failed for notification %: %',
        new.notification_id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists enqueue_app_notification_pushes on public.app_notifications;
create trigger enqueue_app_notification_pushes
after insert
on public.app_notifications
for each row execute function public.enqueue_app_notification_pushes();

create or replace function public.reserve_pending_push_notification_deliveries(p_limit integer default 100)
returns table (
  notification_id uuid,
  token_id uuid,
  user_id uuid,
  expo_push_token text,
  type text,
  title text,
  body text,
  deep_link text,
  related_entity_type text,
  related_entity_id text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
begin
  with rows_to_skip as (
    select
      pnd.delivery_id,
      case
        when pt.token_id is null or coalesce(pt.is_active, false) = false
          then 'Push token is inactive.'
        else 'Push delivery skipped because notification preferences are disabled.'
      end as skip_message
    from public.push_notification_deliveries pnd
    join public.app_notifications an
      on an.notification_id = pnd.notification_id
    left join public.push_tokens pt
      on pt.token_id = pnd.token_id
    where pnd.status = 'pending'
      and (
        pt.token_id is null
        or coalesce(pt.is_active, false) = false
        or not public.notification_preference_enabled(an.user_id, an.type)
      )
  )
  update public.push_notification_deliveries pnd
  set
    status = 'skipped',
    error_message = rts.skip_message,
    attempted_at = now()
  from rows_to_skip rts
  where pnd.delivery_id = rts.delivery_id;

  return query
  with next_rows as (
    select
      pnd.delivery_id,
      an.notification_id,
      pnd.token_id,
      an.user_id,
      pt.expo_push_token,
      an.type,
      an.title,
      an.body,
      an.deep_link,
      an.related_entity_type,
      an.related_entity_id,
      an.created_at,
      pt.last_seen_at
    from public.push_notification_deliveries pnd
    join public.app_notifications an
      on an.notification_id = pnd.notification_id
    join public.push_tokens pt
      on pt.token_id = pnd.token_id
     and pt.is_active = true
    where pnd.status = 'pending'
      and public.notification_preference_enabled(an.user_id, an.type)
    order by an.created_at asc, pt.last_seen_at desc
    limit v_limit
    for update of pnd skip locked
  ),
  reserved_rows as (
    update public.push_notification_deliveries pnd
    set
      status = 'sending',
      attempted_at = now(),
      error_message = null
    from next_rows nr
    where pnd.delivery_id = nr.delivery_id
    returning pnd.delivery_id
  )
  select
    nr.notification_id,
    nr.token_id,
    nr.user_id,
    nr.expo_push_token,
    nr.type,
    nr.title,
    nr.body,
    nr.deep_link,
    nr.related_entity_type,
    nr.related_entity_id
  from next_rows nr
  join reserved_rows rr
    on rr.delivery_id = nr.delivery_id
  order by nr.created_at asc, nr.last_seen_at desc;
end;
$$;

revoke all on function public.reserve_pending_push_notification_deliveries(integer) from public;
revoke all on function public.reserve_pending_push_notification_deliveries(integer) from authenticated;
grant execute on function public.reserve_pending_push_notification_deliveries(integer) to service_role;

create or replace function public.repair_push_notification_deliveries(p_since timestamptz default now() - interval '30 days')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created integer := 0;
  v_added integer := 0;
  v_row record;
begin
  for v_row in
    select an.notification_id
    from public.app_notifications an
    where an.created_at >= p_since
    order by an.created_at asc
  loop
    v_added := public.enqueue_push_notification_deliveries(v_row.notification_id);
    v_created := v_created + coalesce(v_added, 0);
  end loop;

  return jsonb_build_object('created_pending_deliveries', v_created, 'since', p_since);
end;
$$;

revoke all on function public.repair_push_notification_deliveries(timestamptz) from public;
revoke all on function public.repair_push_notification_deliveries(timestamptz) from authenticated;
grant execute on function public.repair_push_notification_deliveries(timestamptz) to service_role;

create or replace function public.create_notification_self_test(
  p_type text default 'reminder',
  p_title text default 'Test notification',
  p_body text default 'This is a secure SudoDuel notification test.',
  p_deep_link text default '/settings-notifications'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_notification_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_type not in (
    'friend_request_received',
    'friend_request_accepted',
    'friend_challenge_received',
    'friend_challenge_accepted',
    'friend_challenge_completed',
    'daily_duel_match_found',
    'ranked_duel_match_found',
    'duel_ready',
    'reminder'
  ) then
    raise exception 'Unsupported notification test type.' using errcode = '22023';
  end if;

  v_notification_id := public.create_app_notification(
    v_user_id,
    p_type,
    coalesce(nullif(trim(p_title), ''), 'Test notification'),
    coalesce(nullif(trim(p_body), ''), 'This is a secure SudoDuel notification test.'),
    'notification_test',
    gen_random_uuid()::text,
    p_deep_link
  );

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification_self_test(text, text, text, text) from public;
grant execute on function public.create_notification_self_test(text, text, text, text) to authenticated;

-- Manual verification:
-- select public.create_notification_self_test();
-- select public.repair_push_notification_deliveries(now() - interval '30 days');
-- select status, count(*) from public.push_notification_deliveries group by status order by status;
