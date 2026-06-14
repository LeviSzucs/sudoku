-- Server-side Expo push delivery foundation.
-- Pushes are sent by a Supabase Edge Function using service-role credentials.
-- The client never sends pushes and cannot create delivery log rows for other users.

create table if not exists public.push_notification_deliveries (
  delivery_id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.app_notifications(notification_id) on delete cascade,
  token_id uuid not null references public.push_tokens(token_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint push_notification_deliveries_status_check check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  constraint push_notification_deliveries_unique unique (notification_id, token_id)
);

create index if not exists push_notification_deliveries_notification_idx
  on public.push_notification_deliveries (notification_id, status, attempted_at desc);

create index if not exists push_notification_deliveries_user_idx
  on public.push_notification_deliveries (user_id, attempted_at desc);

alter table public.push_notification_deliveries enable row level security;

drop policy if exists "push_notification_deliveries_select_own" on public.push_notification_deliveries;
create policy "push_notification_deliveries_select_own"
on public.push_notification_deliveries
for select
to authenticated
using (auth.uid() = user_id);

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
language sql
volatile
security definer
set search_path = public
as $$
  with candidate_rows as (
    select
      an.notification_id,
      pt.token_id,
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
    from public.app_notifications an
    join public.push_tokens pt
      on pt.user_id = an.user_id
     and pt.is_active = true
    left join public.notification_preferences np
      on np.user_id = an.user_id
    where coalesce(np.push_enabled, true) = true
      and case an.type
        when 'friend_request_received' then coalesce(np.friend_requests, true)
        when 'friend_request_accepted' then coalesce(np.friend_requests, true)
        when 'friend_challenge_received' then coalesce(np.friend_challenges, true)
        when 'friend_challenge_accepted' then coalesce(np.friend_challenges, true)
        when 'friend_challenge_completed' then coalesce(np.challenge_results, true)
        when 'daily_duel_match_found' then coalesce(np.daily_duel_matches, true)
        when 'ranked_duel_match_found' then coalesce(np.ranked_duel_matches, true)
        when 'duel_ready' then coalesce(np.daily_duel_matches, true) or coalesce(np.ranked_duel_matches, true)
        when 'reminder' then coalesce(np.reminders, true)
        when 'marketing' then coalesce(np.marketing, false)
        else false
      end
      and not exists (
        select 1
        from public.push_notification_deliveries pnd
        where pnd.notification_id = an.notification_id
          and pnd.token_id = pt.token_id
      )
  ),
  ordered_candidates as (
    select *
    from candidate_rows cr
    order by cr.created_at asc, cr.last_seen_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ),
  reserved_rows as (
    insert into public.push_notification_deliveries (
      notification_id, token_id, user_id, status, attempted_at
    )
    select
      oc.notification_id,
      oc.token_id,
      oc.user_id,
      'sending',
      now()
    from ordered_candidates oc
    on conflict (notification_id, token_id) do nothing
    returning notification_id, token_id, user_id
  )
  select
    cr.notification_id,
    cr.token_id,
    cr.user_id,
    cr.expo_push_token,
    cr.type,
    cr.title,
    cr.body,
    cr.deep_link,
    cr.related_entity_type,
    cr.related_entity_id
  from ordered_candidates cr
  join reserved_rows rr
    on rr.notification_id = cr.notification_id
   and rr.token_id = cr.token_id
  order by cr.created_at asc, cr.last_seen_at desc;
$$;

revoke all on function public.reserve_pending_push_notification_deliveries(integer) from public;
revoke all on function public.reserve_pending_push_notification_deliveries(integer) from authenticated;
grant execute on function public.reserve_pending_push_notification_deliveries(integer) to service_role;
grant select on public.push_notification_deliveries to authenticated;
grant select, insert, update on public.push_notification_deliveries to service_role;
grant select, update on public.push_tokens to service_role;

-- Verification:
-- select status, count(*) from public.push_notification_deliveries group by status order by status;
-- select * from public.reserve_pending_push_notification_deliveries(20);
