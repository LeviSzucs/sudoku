-- Public avatar/display profile lookup for social surfaces.
-- Exposes only non-sensitive profile fields needed to render usernames and avatars.

create or replace function public.get_public_profiles(p_user_ids uuid[])
returns table (
  id uuid,
  username text,
  display_name text,
  username_handle text,
  initials text,
  avatar_color text,
  avatar_symbol text,
  avatar_style_version text,
  avatar_bg_color text,
  avatar_initials text,
  avatar_skin_tone text,
  avatar_hair_style text,
  avatar_hair_color text,
  avatar_top_style text,
  avatar_top_color text,
  avatar_accessory text,
  avatar_frame text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.username_handle,
    p.initials,
    p.avatar_color,
    p.avatar_symbol,
    p.avatar_style_version,
    p.avatar_bg_color,
    p.avatar_initials,
    p.avatar_skin_tone,
    p.avatar_hair_style,
    p.avatar_hair_color,
    p.avatar_top_style,
    p.avatar_top_color,
    p.avatar_accessory,
    p.avatar_frame
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'::uuid[]));
$$;

grant execute on function public.get_public_profiles(uuid[]) to authenticated;

