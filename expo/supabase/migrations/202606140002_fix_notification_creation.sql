-- Fix notification trigger coverage and add an admin-only repair helper for real missed events.
-- This migration does not send push notifications. It only creates in-app notification rows
-- from authoritative social and duel records.

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

  begin
    insert into public.app_notifications (
      user_id, type, title, body, related_entity_type, related_entity_id, deep_link
    )
    values (
      p_user_id, p_type, p_title, p_body, p_related_entity_type, p_related_entity_id, p_deep_link
    )
    returning notification_id into v_notification_id;
  exception
    when unique_violation then
      select an.notification_id
        into v_notification_id
      from public.app_notifications an
      where an.user_id = p_user_id
        and an.type = p_type
        and an.related_entity_type is not distinct from p_related_entity_type
        and an.related_entity_id is not distinct from p_related_entity_id
      limit 1;
  end;

  return v_notification_id;
end;
$$;

revoke all on function public.create_app_notification(uuid, text, text, text, text, text, text) from public;

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
  exception
    when others then
      raise warning 'notify_friend_request_events failed for request %, status %: %',
        new.request_id, new.status, sqlerrm;
  end;

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
  v_was_accepted boolean := false;
  v_was_completed boolean := false;
begin
  begin
    if tg_op = 'UPDATE' then
      v_was_accepted :=
        (old.accepted_at is null and new.accepted_at is not null)
        or (old.status = 'pending' and new.status in ('accepted', 'challenger_completed', 'challenged_completed', 'completed'));

      v_was_completed :=
        new.status = 'completed'
        and (
          old.status is distinct from new.status
          or (old.completed_at is null and new.completed_at is not null)
        );
    end if;

    if tg_op = 'INSERT'
      and new.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed') then
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
    end if;

    if v_was_accepted then
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

    if v_was_completed then
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
  exception
    when others then
      raise warning 'notify_friend_challenge_events failed for challenge %, status %: %',
        new.challenge_id, new.status, sqlerrm;
  end;

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
  begin
    if tg_op = 'UPDATE'
      and new.status = 'matched'
      and new.player_b_id is not null
      and (
        old.status is distinct from new.status
        or old.player_b_id is distinct from new.player_b_id
      ) then
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
  exception
    when others then
      raise warning 'notify_daily_duel_events failed for duel %, status %: %',
        new.duel_id, new.status, sqlerrm;
  end;

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
  begin
    if tg_op = 'UPDATE'
      and new.status = 'matched'
      and new.player_b_id is not null
      and (
        old.status is distinct from new.status
        or old.player_b_id is distinct from new.player_b_id
      ) then
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
  exception
    when others then
      raise warning 'notify_ranked_duel_events failed for ranked duel %, status %: %',
        new.ranked_duel_id, new.status, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists notify_ranked_duel_events on public.ranked_duels;
create trigger notify_ranked_duel_events
after update of status, player_b_id
on public.ranked_duels
for each row execute function public.notify_ranked_duel_events();

create or replace function public.repair_notification_events(p_since timestamptz default now() - interval '30 days')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created integer := 0;
  v_result uuid;
  v_row record;
  v_name text;
begin
  for v_row in
    select fr.*
    from public.friend_requests fr
    where fr.created_at >= p_since
      and fr.status in ('pending', 'accepted')
  loop
    if v_row.status = 'pending' then
      v_name := public.notification_display_name(v_row.sender_id);
      v_result := public.create_app_notification(
        v_row.receiver_id,
        'friend_request_received',
        'New friend request',
        coalesce(v_name, 'Someone') || ' wants to add you on SudoDuel.',
        'friend_request',
        v_row.request_id::text,
        '/friends?source=notifications'
      );
      if v_result is not null then v_created := v_created + 1; end if;
    elsif v_row.status = 'accepted' then
      v_name := public.notification_display_name(v_row.receiver_id);
      v_result := public.create_app_notification(
        v_row.sender_id,
        'friend_request_accepted',
        'Friend request accepted',
        coalesce(v_name, 'Your friend') || ' accepted your friend request.',
        'friend_request',
        v_row.request_id::text,
        '/friends?source=notifications'
      );
      if v_result is not null then v_created := v_created + 1; end if;
    end if;
  end loop;

  for v_row in
    select fc.*
    from public.friend_challenges fc
    where fc.created_at >= p_since
      and fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed', 'completed')
  loop
    v_name := public.notification_display_name(v_row.challenger_id);
    v_result := public.create_app_notification(
      v_row.challenged_id,
      'friend_challenge_received',
      'New Friend Challenge',
      coalesce(v_name, 'A friend') || ' has challenged you to a Sudoku duel.',
      'friend_challenge',
      v_row.challenge_id::text,
      '/friends?mode=challenge&source=notifications'
    );
    if v_result is not null then v_created := v_created + 1; end if;

    if v_row.status in ('accepted', 'challenger_completed', 'challenged_completed', 'completed')
      or v_row.accepted_at is not null then
      v_name := public.notification_display_name(v_row.challenged_id);
      v_result := public.create_app_notification(
        v_row.challenger_id,
        'friend_challenge_accepted',
        'Friend Challenge accepted',
        coalesce(v_name, 'Your friend') || ' accepted your Friend Challenge.',
        'friend_challenge',
        v_row.challenge_id::text,
        '/friends?mode=challenge&source=notifications'
      );
      if v_result is not null then v_created := v_created + 1; end if;
    end if;

    if v_row.status = 'completed' then
      v_result := public.create_app_notification(
        v_row.challenger_id,
        'friend_challenge_completed',
        'Challenge result ready',
        'Your Friend Challenge result is ready.',
        'friend_challenge',
        v_row.challenge_id::text,
        '/friends?mode=challenge&source=notifications'
      );
      if v_result is not null then v_created := v_created + 1; end if;

      v_result := public.create_app_notification(
        v_row.challenged_id,
        'friend_challenge_completed',
        'Challenge result ready',
        'Your Friend Challenge result is ready.',
        'friend_challenge',
        v_row.challenge_id::text,
        '/friends?mode=challenge&source=notifications'
      );
      if v_result is not null then v_created := v_created + 1; end if;
    end if;
  end loop;

  return jsonb_build_object('created_or_existing_count', v_created, 'since', p_since);
end;
$$;

revoke all on function public.repair_notification_events(timestamptz) from public;
revoke all on function public.repair_notification_events(timestamptz) from authenticated;

-- Manual repair from the Supabase SQL editor, if needed:
-- select public.repair_notification_events(now() - interval '30 days');

-- Verification:
-- select type, count(*) from public.app_notifications group by type order by type;
-- select trigger_name, event_object_table from information_schema.triggers where trigger_name like 'notify_%_events' order by event_object_table, trigger_name;
