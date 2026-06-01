-- Require explicit profile setup with a unique username handle.

alter table public.profiles
  add column if not exists username_handle text,
  add column if not exists display_name text,
  add column if not exists profile_setup_completed boolean not null default false;

update public.profiles
set
  display_name = nullif(trim(coalesce(display_name, username)), ''),
  profile_setup_completed = case
    when username_handle is not null and username_handle ~ '^[a-z0-9_]{3,20}$' then profile_setup_completed
    else false
  end;

create unique index if not exists profiles_username_handle_lower_unique
  on public.profiles (lower(username_handle))
  where username_handle is not null;

create or replace function public.check_username_available(p_username text)
returns table (
  normalized_username text,
  available boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_reserved text[] := array['player', 'admin', 'support', 'sudoku', 'ranked', 'daily', 'guest'];
begin
  if v_username = '' then
    return query select v_username, false, 'Username is required';
    return;
  end if;

  if char_length(v_username) < 3 or char_length(v_username) > 20 then
    return query select v_username, false, 'Username must be 3-20 characters';
    return;
  end if;

  if v_username !~ '^[a-z0-9_]+$' then
    return query select v_username, false, 'Use lowercase letters, numbers, and underscores only';
    return;
  end if;

  if v_username = any(v_reserved) then
    return query select v_username, false, 'That username is reserved';
    return;
  end if;

  return query
    select
      v_username,
      not exists (
        select 1
        from public.profiles
        where lower(username_handle) = v_username
          and id <> auth.uid()
      ),
      case
        when exists (
          select 1
          from public.profiles
          where lower(username_handle) = v_username
            and id <> auth.uid()
        ) then 'Username is already taken'
        else 'Username is available'
      end;
end;
$$;

grant execute on function public.check_username_available(text) to authenticated;
