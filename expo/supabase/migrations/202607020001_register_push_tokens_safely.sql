-- Register push tokens through a single server-side path so duplicate Expo
-- tokens are deactivated when they move between users or devices.

create or replace function public.register_push_token(
  p_user_id uuid,
  p_expo_push_token text,
  p_platform text default 'unknown',
  p_app_version text default null,
  p_device_id text default null
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_row public.push_tokens%rowtype;
  v_platform text := lower(coalesce(nullif(trim(p_platform), ''), 'unknown'));
  v_device_id text := nullif(trim(p_device_id), '');
  v_token text := nullif(trim(p_expo_push_token), '');
begin
  if v_auth_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_auth_user_id then
    raise exception 'Push tokens can only be registered for the signed-in user.' using errcode = '42501';
  end if;

  if v_token is null then
    raise exception 'Push token is required.' using errcode = '22023';
  end if;

  if v_platform not in ('ios', 'android', 'web', 'unknown') then
    raise exception 'Invalid push token platform.' using errcode = '22023';
  end if;

  update public.push_tokens
  set
    is_active = false,
    last_seen_at = now()
  where expo_push_token = v_token
    and user_id <> p_user_id
    and is_active = true;

  if v_device_id is not null then
    update public.push_tokens
    set
      is_active = false,
      last_seen_at = now()
    where user_id = p_user_id
      and device_id = v_device_id
      and expo_push_token <> v_token
      and is_active = true;
  end if;

  insert into public.push_tokens (
    user_id,
    expo_push_token,
    device_id,
    platform,
    app_version,
    is_active,
    last_seen_at
  )
  values (
    p_user_id,
    v_token,
    v_device_id,
    v_platform,
    nullif(trim(p_app_version), ''),
    true,
    now()
  )
  on conflict (user_id, expo_push_token) do update
  set
    device_id = excluded.device_id,
    platform = excluded.platform,
    app_version = excluded.app_version,
    is_active = true,
    last_seen_at = excluded.last_seen_at
  returning *
  into v_row;

  return v_row;
end;
$$;

revoke all on function public.register_push_token(uuid, text, text, text, text) from public;
revoke all on function public.register_push_token(uuid, text, text, text, text) from anon;
grant execute on function public.register_push_token(uuid, text, text, text, text) to authenticated;
grant execute on function public.register_push_token(uuid, text, text, text, text) to service_role;
