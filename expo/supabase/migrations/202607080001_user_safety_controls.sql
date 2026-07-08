-- App Store Guideline 1.2 safety controls: blocks, reports, and social suppression.

create extension if not exists pgcrypto;

create table if not exists public.user_blocks (
  block_id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint user_blocks_unique_pair unique (blocker_user_id, blocked_user_id),
  constraint user_blocks_no_self check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.user_reports (
  report_id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  source text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  constraint user_reports_no_self check (reporter_user_id <> reported_user_id),
  constraint user_reports_status_check check (status in ('open', 'reviewed', 'closed'))
);

create index if not exists user_blocks_blocker_created_idx
  on public.user_blocks (blocker_user_id, created_at desc);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_user_id, created_at desc);

create index if not exists user_reports_reporter_created_idx
  on public.user_reports (reporter_user_id, created_at desc);

create index if not exists user_reports_reported_status_created_idx
  on public.user_reports (reported_user_id, status, created_at desc);

alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
on public.user_blocks
for select
to authenticated
using (auth.uid() = blocker_user_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
on public.user_blocks
for insert
to authenticated
with check (auth.uid() = blocker_user_id and blocker_user_id <> blocked_user_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
on public.user_blocks
for delete
to authenticated
using (auth.uid() = blocker_user_id);

drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own"
on public.user_reports
for select
to authenticated
using (auth.uid() = reporter_user_id);

drop policy if exists "user_reports_insert_own" on public.user_reports;
create policy "user_reports_insert_own"
on public.user_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id and reporter_user_id <> reported_user_id);

create or replace function public.users_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_user_id = p_user_a and ub.blocked_user_id = p_user_b)
       or (ub.blocker_user_id = p_user_b and ub.blocked_user_id = p_user_a)
  );
$$;

create or replace function public.cleanup_blocked_social_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_ids uuid[];
begin
  delete from public.friends f
  where (f.user_id = new.blocker_user_id and f.friend_id = new.blocked_user_id)
     or (f.user_id = new.blocked_user_id and f.friend_id = new.blocker_user_id);

  delete from public.friend_requests fr
  where (fr.sender_id = new.blocker_user_id and fr.receiver_id = new.blocked_user_id)
     or (fr.sender_id = new.blocked_user_id and fr.receiver_id = new.blocker_user_id);

  select array_remove(array_agg(distinct session_id), null)
    into v_session_ids
  from (
    select fc.challenger_session_id as session_id
    from public.friend_challenges fc
    where least(fc.challenger_id, fc.challenged_id) = least(new.blocker_user_id, new.blocked_user_id)
      and greatest(fc.challenger_id, fc.challenged_id) = greatest(new.blocker_user_id, new.blocked_user_id)
      and fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed')
    union all
    select fc.challenged_session_id as session_id
    from public.friend_challenges fc
    where least(fc.challenger_id, fc.challenged_id) = least(new.blocker_user_id, new.blocked_user_id)
      and greatest(fc.challenger_id, fc.challenged_id) = greatest(new.blocker_user_id, new.blocked_user_id)
      and fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed')
  ) session_rows;

  update public.friend_challenges fc
  set status = 'cancelled',
      completed_at = coalesce(fc.completed_at, now()),
      updated_at = now()
  where least(fc.challenger_id, fc.challenged_id) = least(new.blocker_user_id, new.blocked_user_id)
    and greatest(fc.challenger_id, fc.challenged_id) = greatest(new.blocker_user_id, new.blocked_user_id)
    and fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed');

  if coalesce(array_length(v_session_ids, 1), 0) > 0 then
    update public.puzzle_sessions ps
    set status = 'abandoned',
        updated_at = now()
    where ps.session_id = any(v_session_ids)
      and ps.status = 'in_progress';
  end if;

  return new;
end;
$$;

drop trigger if exists user_blocks_cleanup_social_state on public.user_blocks;
create trigger user_blocks_cleanup_social_state
after insert on public.user_blocks
for each row execute function public.cleanup_blocked_social_state();

create or replace function public.get_user_block_state(p_other_user_id uuid)
returns table (
  blocked_by_current_user boolean,
  blocked_by_other_user boolean
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

  if p_other_user_id is null or p_other_user_id = v_user_id then
    return query
    select false, false;
    return;
  end if;

  return query
  select
    exists(
      select 1 from public.user_blocks ub
      where ub.blocker_user_id = v_user_id
        and ub.blocked_user_id = p_other_user_id
    ) as blocked_by_current_user,
    exists(
      select 1 from public.user_blocks ub
      where ub.blocker_user_id = p_other_user_id
        and ub.blocked_user_id = v_user_id
    ) as blocked_by_other_user;
end;
$$;

create or replace function public.block_user(p_blocked_user_id uuid, p_reason text default null)
returns public.user_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_block public.user_blocks%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_blocked_user_id is null or p_blocked_user_id = v_user_id then
    raise exception 'You cannot block this user.' using errcode = '22023';
  end if;

  insert into public.user_blocks (blocker_user_id, blocked_user_id, reason)
  values (v_user_id, p_blocked_user_id, nullif(trim(coalesce(p_reason, '')), ''))
  on conflict (blocker_user_id, blocked_user_id)
  do update set reason = excluded.reason
  returning * into v_block;

  return v_block;
end;
$$;

create or replace function public.unblock_user(p_blocked_user_id uuid)
returns void
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

  delete from public.user_blocks ub
  where ub.blocker_user_id = v_user_id
    and ub.blocked_user_id = p_blocked_user_id;
end;
$$;

create or replace function public.report_user(
  p_reported_user_id uuid,
  p_reason text,
  p_details text default null,
  p_source text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_reported_user_id is null or p_reported_user_id = v_user_id then
    raise exception 'You cannot report this user.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Choose a reason.' using errcode = '22023';
  end if;

  insert into public.user_reports (
    reporter_user_id,
    reported_user_id,
    reason,
    details,
    source
  )
  values (
    v_user_id,
    p_reported_user_id,
    trim(p_reason),
    nullif(trim(coalesce(p_details, '')), ''),
    nullif(trim(coalesce(p_source, '')), '')
  )
  returning report_id into v_report_id;

  return v_report_id;
end;
$$;

create or replace function public.search_users_by_username(query text)
returns table (
  user_id uuid,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  relationship_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := lower(trim(leading '@' from trim(coalesce(query, ''))));
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if length(v_query) < 2 then
    return;
  end if;

  return query
  select
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as display_name,
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
    coalesce(p.avatar_color, '#A8A294') as avatar_color,
    case
      when exists (
        select 1 from public.friends f
        where f.user_id = v_user_id and f.friend_id = p.id
      ) then 'friends'
      when exists (
        select 1 from public.friend_requests fr
        where fr.sender_id = v_user_id and fr.receiver_id = p.id and fr.status = 'pending'
      ) then 'request_sent'
      when exists (
        select 1 from public.friend_requests fr
        where fr.sender_id = p.id and fr.receiver_id = v_user_id and fr.status = 'pending'
      ) then 'request_received'
      else 'none'
    end as relationship_status
  from public.profiles p
  where p.profile_setup_completed = true
    and p.username_handle is not null
    and p.id <> v_user_id
    and not public.users_are_blocked(v_user_id, p.id)
    and lower(p.username_handle) like v_query || '%'
  order by lower(p.username_handle)
  limit 20;
end;
$$;

create or replace function public.send_friend_request(receiver_username text)
returns table (
  request_id uuid,
  receiver_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_receiver_id uuid;
  v_username text := lower(trim(leading '@' from trim(coalesce(receiver_username, ''))));
  v_request public.friend_requests%rowtype;
begin
  if v_sender_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Enter a valid username.';
  end if;

  select p.id into v_receiver_id
  from public.profiles p
  where lower(p.username_handle) = v_username
    and p.profile_setup_completed = true
  limit 1;

  if v_receiver_id is null then
    raise exception 'User not found.';
  end if;

  if v_receiver_id = v_sender_id then
    raise exception 'You cannot add yourself.';
  end if;

  if public.users_are_blocked(v_sender_id, v_receiver_id) then
    raise exception 'You cannot send a friend request to this user.';
  end if;

  if exists (
    select 1 from public.friends f
    where f.user_id = v_sender_id and f.friend_id = v_receiver_id
  ) then
    raise exception 'You are already friends.';
  end if;

  if exists (
    select 1 from public.friend_requests fr
    where fr.status = 'pending'
      and ((fr.sender_id = v_sender_id and fr.receiver_id = v_receiver_id)
        or (fr.sender_id = v_receiver_id and fr.receiver_id = v_sender_id))
  ) then
    raise exception 'Friend request already pending.';
  end if;

  insert into public.friend_requests (sender_id, receiver_id, status)
  values (v_sender_id, v_receiver_id, 'pending')
  returning * into v_request;

  return query
  select v_request.request_id, v_request.receiver_id, v_request.status, v_request.created_at;
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_response text)
returns table (
  request_id uuid,
  sender_id uuid,
  receiver_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_response text := lower(trim(coalesce(p_response, '')));
  v_request public.friend_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined.';
  end if;

  select * into v_request
  from public.friend_requests fr
  where fr.request_id = p_request_id
    and fr.receiver_id = v_user_id
    and fr.status = 'pending'
  for update;

  if v_request.request_id is null then
    raise exception 'Friend request not found.';
  end if;

  if public.users_are_blocked(v_request.sender_id, v_request.receiver_id) then
    delete from public.friend_requests fr where fr.request_id = v_request.request_id;
    raise exception 'This friend request is no longer available.';
  end if;

  update public.friend_requests fr
  set status = v_response,
      updated_at = now()
  where fr.request_id = v_request.request_id;

  if v_response = 'accepted' then
    insert into public.friends (user_id, friend_id)
    values (v_request.receiver_id, v_request.sender_id)
    on conflict (user_id, friend_id) do nothing;

    insert into public.friends (user_id, friend_id)
    values (v_request.sender_id, v_request.receiver_id)
    on conflict (user_id, friend_id) do nothing;
  end if;

  return query
  select v_request.request_id, v_request.sender_id, v_request.receiver_id, v_response;
end;
$$;

create or replace function public.get_friends()
returns table (
  user_id uuid,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as display_name,
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
    coalesce(p.avatar_color, '#A8A294') as avatar_color,
    f.created_at
  from public.friends f
  join public.profiles p on p.id = f.friend_id
  where f.user_id = auth.uid()
    and p.profile_setup_completed = true
    and not public.users_are_blocked(auth.uid(), p.id)
  order by lower(coalesce(p.display_name, p.username_handle, 'player'));
$$;

create or replace function public.get_pending_friend_requests()
returns table (
  request_id uuid,
  user_id uuid,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    fr.request_id,
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player') as display_name,
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL') as initials,
    coalesce(p.avatar_color, '#A8A294') as avatar_color,
    fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = fr.sender_id
  where fr.receiver_id = auth.uid()
    and fr.status = 'pending'
    and p.profile_setup_completed = true
    and not public.users_are_blocked(auth.uid(), p.id)
  order by fr.created_at desc;
$$;

create or replace function public.create_friend_challenge(p_friend_username text, p_difficulty text)
returns table (
  challenge_id uuid,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid,
  friend_user_id uuid,
  friend_display_name text,
  friend_username_handle text,
  friend_initials text,
  friend_avatar_color text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenger_id uuid := auth.uid();
  v_friend_id uuid;
  v_friend_display_name text;
  v_username text := lower(trim(leading '@' from trim(coalesce(p_friend_username, ''))));
  v_difficulty text := initcap(lower(trim(coalesce(p_difficulty, ''))));
  v_puzzle public.puzzles%rowtype;
  v_challenge public.friend_challenges%rowtype;
  v_session public.puzzle_sessions%rowtype;
begin
  if v_challenger_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_difficulty not in ('Easy', 'Medium', 'Hard', 'Expert', 'Master') then
    raise exception 'Choose a valid difficulty.';
  end if;

  select
    p.id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player')
  into v_friend_id, v_friend_display_name
  from public.profiles p
  where lower(p.username_handle) = v_username
    and p.profile_setup_completed = true
  limit 1;

  if v_friend_id is null then
    raise exception 'Friend not found.';
  end if;

  if v_friend_id = v_challenger_id then
    raise exception 'You cannot challenge yourself.';
  end if;

  if public.users_are_blocked(v_challenger_id, v_friend_id) then
    raise exception 'You cannot challenge this user.';
  end if;

  if not exists (
    select 1 from public.friends f
    where f.user_id = v_challenger_id and f.friend_id = v_friend_id
  ) then
    raise exception 'You can only challenge accepted friends.';
  end if;

  if exists (
    select 1 from public.friend_challenges fc
    where fc.status in ('pending', 'accepted', 'challenger_completed', 'challenged_completed')
      and fc.difficulty = v_difficulty
      and least(fc.challenger_id, fc.challenged_id) = least(v_challenger_id, v_friend_id)
      and greatest(fc.challenger_id, fc.challenged_id) = greatest(v_challenger_id, v_friend_id)
  ) then
    raise exception 'You already have an active % challenge with %.', v_difficulty, v_friend_display_name;
  end if;

  select * into v_puzzle
  from public.puzzles p
  where p.difficulty = v_difficulty
    and p.is_active = true
  order by
    case
      when p.source = 'technique_calibrated_20260613' then 0
      when p.source = 'technique_calibrated_20260607' then 1
      else 2
    end,
    random()
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'No active puzzle is available for this difficulty.';
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_challenger_id, v_puzzle.puzzle_id, 'friend_challenge', v_puzzle.difficulty,
    public.sudoku_givens_to_board(v_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  insert into public.friend_challenges (
    challenger_id, challenged_id, puzzle_id, difficulty, status, challenger_session_id
  )
  values (
    v_challenger_id, v_friend_id, v_puzzle.puzzle_id, v_puzzle.difficulty, 'pending', v_session.session_id
  )
  returning * into v_challenge;

  return query
  select
    v_challenge.challenge_id,
    v_challenge.status,
    v_challenge.puzzle_id,
    v_challenge.difficulty,
    v_session.session_id,
    p.id,
    coalesce(nullif(trim(p.display_name), ''), p.username_handle, 'Player'),
    p.username_handle,
    coalesce(nullif(trim(p.initials), ''), 'PL'),
    coalesce(p.avatar_color, '#A8A294')
  from public.profiles p
  where p.id = v_friend_id;
exception
  when unique_violation then
    raise exception 'You already have an active % challenge with %.', v_difficulty, coalesce(v_friend_display_name, 'this friend');
end;
$$;

create or replace function public.accept_friend_challenge(p_challenge_id uuid)
returns table (
  challenge_id uuid,
  status text,
  puzzle_id text,
  difficulty text,
  session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.friend_challenges%rowtype;
  v_puzzle public.puzzles%rowtype;
  v_session public.puzzle_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_challenge
  from public.friend_challenges fc
  where fc.challenge_id = p_challenge_id
    and fc.challenged_id = v_user_id
    and fc.status in ('pending', 'challenger_completed')
  for update;

  if v_challenge.challenge_id is null then
    raise exception 'Challenge not found.';
  end if;

  if public.users_are_blocked(v_challenge.challenger_id, v_challenge.challenged_id) then
    raise exception 'This challenge is no longer available.';
  end if;

  select * into v_puzzle
  from public.puzzles p
  where p.puzzle_id = v_challenge.puzzle_id
  limit 1;

  if v_puzzle.puzzle_id is null then
    raise exception 'Challenge puzzle not found.';
  end if;

  insert into public.puzzle_sessions (
    user_id, puzzle_id, mode, difficulty, board_state, notes_state,
    elapsed_seconds, mistakes, hints_used, undo_count, move_history, status
  )
  values (
    v_user_id, v_puzzle.puzzle_id, 'friend_challenge', v_puzzle.difficulty,
    public.sudoku_givens_to_board(v_puzzle.givens), public.empty_sudoku_notes(),
    0, 0, 0, 0, '[]'::jsonb, 'in_progress'
  )
  returning * into v_session;

  update public.friend_challenges fc
  set status = case when fc.challenger_result_id is not null then 'challenger_completed' else 'accepted' end,
      accepted_at = coalesce(fc.accepted_at, now()),
      challenged_session_id = v_session.session_id,
      updated_at = now()
  where fc.challenge_id = v_challenge.challenge_id
  returning * into v_challenge;

  return query
  select v_challenge.challenge_id, v_challenge.status, v_challenge.puzzle_id, v_challenge.difficulty, v_session.session_id;
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
  if public.users_are_blocked(new.sender_id, new.receiver_id) then
    return new;
  end if;

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
  if public.users_are_blocked(new.challenger_id, new.challenged_id) then
    return new;
  end if;

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

grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;
grant execute on function public.get_user_block_state(uuid) to authenticated;
grant execute on function public.block_user(uuid, text) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.report_user(uuid, text, text, text) to authenticated;

-- Admin review query:
-- select
--   ur.report_id,
--   ur.reason,
--   ur.details,
--   ur.source,
--   ur.status,
--   ur.created_at,
--   coalesce(nullif(trim(reporter.display_name), ''), reporter.username_handle, reporter.username, 'Player') as reporter_name,
--   reporter.username_handle as reporter_handle,
--   coalesce(nullif(trim(reported.display_name), ''), reported.username_handle, reported.username, 'Player') as reported_name,
--   reported.username_handle as reported_handle
-- from public.user_reports ur
-- left join public.profiles reporter on reporter.id = ur.reporter_user_id
-- left join public.profiles reported on reported.id = ur.reported_user_id
-- where ur.status = 'open'
-- order by ur.created_at desc;
