-- Friends system foundation.

create extension if not exists pgcrypto;

create table if not exists public.friend_requests (
  request_id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (sender_id <> receiver_id),
  constraint friend_requests_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create table if not exists public.friends (
  friendship_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friends_no_self check (user_id <> friend_id),
  constraint friends_user_friend_unique unique (user_id, friend_id)
);

create unique index if not exists friend_requests_pending_pair_unique
  on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status = 'pending';

create index if not exists friend_requests_receiver_status_idx
  on public.friend_requests (receiver_id, status, created_at desc);

create index if not exists friend_requests_sender_status_idx
  on public.friend_requests (sender_id, status, created_at desc);

create index if not exists friends_user_created_idx
  on public.friends (user_id, created_at desc);

create index if not exists friends_friend_idx
  on public.friends (friend_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists friend_requests_set_updated_at on public.friend_requests;
create trigger friend_requests_set_updated_at
before update on public.friend_requests
for each row execute function public.set_updated_at();

alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;

drop policy if exists "Users can read their friend requests" on public.friend_requests;
create policy "Users can read their friend requests"
on public.friend_requests
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can read their friends" on public.friends;
create policy "Users can read their friends"
on public.friends
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

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
  order by fr.created_at desc;
$$;

grant execute on function public.search_users_by_username(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.get_pending_friend_requests() to authenticated;
grant select on public.friend_requests to authenticated;
grant select on public.friends to authenticated;
