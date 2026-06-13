-- Notification preferences, push token storage, and in-app notification events.
-- Push delivery is intentionally not sent from the client. A secure server/Edge
-- Function should deliver Expo push notifications using these tables.

create extension if not exists pgcrypto;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  friend_requests boolean not null default true,
  friend_challenges boolean not null default true,
  challenge_results boolean not null default true,
  daily_duel_matches boolean not null default true,
  ranked_duel_matches boolean not null default true,
  reminders boolean not null default true,
  marketing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  token_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  device_id text,
  platform text not null default 'unknown',
  app_version text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint push_tokens_platform_check check (platform in ('ios', 'android', 'web', 'unknown')),
  constraint push_tokens_user_token_unique unique (user_id, expo_push_token)
);

create table if not exists public.app_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_entity_type text,
  related_entity_id text,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint app_notifications_type_check check (type in (
    'friend_request_received',
    'friend_request_accepted',
    'friend_challenge_received',
    'friend_challenge_accepted',
    'friend_challenge_completed',
    'daily_duel_match_found',
    'ranked_duel_match_found',
    'duel_ready',
    'reminder'
  ))
);

create index if not exists push_tokens_user_active_idx
  on public.push_tokens (user_id, is_active, last_seen_at desc);

create index if not exists app_notifications_user_created_idx
  on public.app_notifications (user_id, created_at desc);

create index if not exists app_notifications_user_unread_idx
  on public.app_notifications (user_id, created_at desc)
  where read_at is null;

create unique index if not exists app_notifications_event_unique_idx
  on public.app_notifications (user_id, type, related_entity_type, related_entity_id)
  where related_entity_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.app_notifications enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "app_notifications_select_own" on public.app_notifications;
create policy "app_notifications_select_own"
on public.app_notifications
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.get_notification_preferences()
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_preferences public.notification_preferences%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  insert into public.notification_preferences (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
    into v_preferences
  from public.notification_preferences np
  where np.user_id = v_user_id;

  return v_preferences;
end;
$$;

create or replace function public.mark_app_notification_read(p_notification_id uuid)
returns table (
  notification_id uuid,
  read_at timestamptz
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

  update public.app_notifications an
  set read_at = coalesce(an.read_at, now())
  where an.notification_id = p_notification_id
    and an.user_id = v_user_id
  returning an.notification_id, an.read_at
  into notification_id, read_at;

  if notification_id is null then
    raise exception 'Notification not found.' using errcode = '22023';
  end if;

  return next;
end;
$$;

create or replace function public.notification_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player')
  from public.profiles p
  where p.id = p_user_id
  limit 1;
$$;

create or replace function public.notification_preference_enabled(p_user_id uuid, p_type text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_preferences public.notification_preferences%rowtype;
begin
  if p_user_id is null then
    return false;
  end if;

  select *
    into v_preferences
  from public.notification_preferences np
  where np.user_id = p_user_id;

  if v_preferences.user_id is null then
    return true;
  end if;

  return case p_type
    when 'friend_request_received' then v_preferences.friend_requests
    when 'friend_request_accepted' then v_preferences.friend_requests
    when 'friend_challenge_received' then v_preferences.friend_challenges
    when 'friend_challenge_accepted' then v_preferences.friend_challenges
    when 'friend_challenge_completed' then v_preferences.challenge_results
    when 'daily_duel_match_found' then v_preferences.daily_duel_matches
    when 'ranked_duel_match_found' then v_preferences.ranked_duel_matches
    when 'duel_ready' then v_preferences.daily_duel_matches or v_preferences.ranked_duel_matches
    when 'reminder' then v_preferences.reminders
    else true
  end;
end;
$$;

create or replace function public.create_app_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_related_entity_type text default null,
  p_related_entity_id text default null,
  p_deep_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  if p_user_id is null
    or p_type is null
    or nullif(trim(p_title), '') is null
    or nullif(trim(p_body), '') is null then
    return null;
  end if;

  if not public.notification_preference_enabled(p_user_id, p_type) then
    return null;
  end if;

  if p_related_entity_id is not null then
    select an.notification_id
      into v_notification_id
    from public.app_notifications an
    where an.user_id = p_user_id
      and an.type = p_type
      and an.related_entity_type is not distinct from p_related_entity_type
      and an.related_entity_id = p_related_entity_id
    limit 1;

    if v_notification_id is not null then
      return v_notification_id;
    end if;
  end if;

  insert into public.app_notifications (
    user_id, type, title, body, related_entity_type, related_entity_id, deep_link
  )
  values (
    p_user_id, p_type, p_title, p_body, p_related_entity_type, p_related_entity_id, p_deep_link
  )
  returning notification_id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.notify_friend_request_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_receiver_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    v_sender_name := public.notification_display_name(new.sender_id);
    perform public.create_app_notification(
      new.receiver_id,
      'friend_request_received',
      'New friend request',
      coalesce(v_sender_name, 'Someone') || ' wants to add you on SudoDuel.',
      'friend_request',
      new.request_id::text,
      '/friends?source=notifications'
    );
  elsif tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status = 'accepted' then
    v_receiver_name := public.notification_display_name(new.receiver_id);
    perform public.create_app_notification(
      new.sender_id,
      'friend_request_accepted',
      'Friend request accepted',
      coalesce(v_receiver_name, 'Your friend') || ' accepted your friend request.',
      'friend_request',
      new.request_id::text,
      '/friends?source=notifications'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_friend_request_events on public.friend_requests;
create trigger notify_friend_request_events
after insert or update of status
on public.friend_requests
for each row execute function public.notify_friend_request_events();

create or replace function public.notify_friend_challenge_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenger_name text;
  v_challenged_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    v_challenger_name := public.notification_display_name(new.challenger_id);
    perform public.create_app_notification(
      new.challenged_id,
      'friend_challenge_received',
      'New Friend Challenge',
      coalesce(v_challenger_name, 'A friend') || ' has challenged you to a Sudoku duel.',
      'friend_challenge',
      new.challenge_id::text,
      '/friends?mode=challenge&source=notifications'
    );
  elsif tg_op = 'UPDATE'
    and old.accepted_at is null
    and new.accepted_at is not null then
    v_challenged_name := public.notification_display_name(new.challenged_id);
    perform public.create_app_notification(
      new.challenger_id,
      'friend_challenge_accepted',
      'Friend Challenge accepted',
      coalesce(v_challenged_name, 'Your friend') || ' accepted your Friend Challenge.',
      'friend_challenge',
      new.challenge_id::text,
      '/friends?mode=challenge&source=notifications'
    );
  end if;

  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status = 'completed' then
    perform public.create_app_notification(
      new.challenger_id,
      'friend_challenge_completed',
      'Challenge result ready',
      'Your Friend Challenge result is ready.',
      'friend_challenge',
      new.challenge_id::text,
      '/friends?mode=challenge&source=notifications'
    );
    perform public.create_app_notification(
      new.challenged_id,
      'friend_challenge_completed',
      'Challenge result ready',
      'Your Friend Challenge result is ready.',
      'friend_challenge',
      new.challenge_id::text,
      '/friends?mode=challenge&source=notifications'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_friend_challenge_events on public.friend_challenges;
create trigger notify_friend_challenge_events
after insert or update of status, accepted_at, completed_at
on public.friend_challenges
for each row execute function public.notify_friend_challenge_events();

create or replace function public.notify_daily_duel_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status = 'matched'
    and new.player_b_id is not null then
    perform public.create_app_notification(
      new.player_a_id,
      'daily_duel_match_found',
      'Daily Duel ready',
      'We found your opponent. Your Daily Duel is ready to play.',
      'daily_duel',
      new.duel_id::text,
      '/(tabs)/versus'
    );
    perform public.create_app_notification(
      new.player_b_id,
      'daily_duel_match_found',
      'Daily Duel ready',
      'We found your opponent. Your Daily Duel is ready to play.',
      'daily_duel',
      new.duel_id::text,
      '/(tabs)/versus'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_daily_duel_events on public.daily_duels;
create trigger notify_daily_duel_events
after update of status, player_b_id
on public.daily_duels
for each row execute function public.notify_daily_duel_events();

create or replace function public.notify_ranked_duel_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status = 'matched'
    and new.player_b_id is not null then
    perform public.create_app_notification(
      new.player_a_id,
      'ranked_duel_match_found',
      'Ranked match ready',
      'We found your opponent. Your Ranked Duel is ready.',
      'ranked_duel',
      new.ranked_duel_id::text,
      '/(tabs)/versus'
    );
    perform public.create_app_notification(
      new.player_b_id,
      'ranked_duel_match_found',
      'Ranked match ready',
      'We found your opponent. Your Ranked Duel is ready.',
      'ranked_duel',
      new.ranked_duel_id::text,
      '/(tabs)/versus'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_ranked_duel_events on public.ranked_duels;
create trigger notify_ranked_duel_events
after update of status, player_b_id
on public.ranked_duels
for each row execute function public.notify_ranked_duel_events();

grant execute on function public.get_notification_preferences() to authenticated;
grant execute on function public.mark_app_notification_read(uuid) to authenticated;
grant execute on function public.notification_display_name(uuid) to authenticated;
grant execute on function public.notification_preference_enabled(uuid, text) to authenticated;

-- Manual verification:
-- select * from public.get_notification_preferences();
-- select type, count(*) from public.app_notifications group by type order by type;
-- select user_id, count(*) filter (where read_at is null) as unread from public.app_notifications group by user_id;
