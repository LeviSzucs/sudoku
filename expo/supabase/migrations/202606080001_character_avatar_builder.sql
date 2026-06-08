-- Character avatar builder foundation.
-- Adds modular avatar config fields while preserving existing initials/colour/symbol columns.

alter table public.profiles
  add column if not exists avatar_style_version text not null default 'character_v1',
  add column if not exists avatar_bg_color text,
  add column if not exists avatar_initials text,
  add column if not exists avatar_hair_style text,
  add column if not exists avatar_hair_color text,
  add column if not exists avatar_top_style text,
  add column if not exists avatar_top_color text,
  add column if not exists avatar_accessory text,
  add column if not exists avatar_frame text;

update public.profiles
set
  avatar_style_version = coalesce(avatar_style_version, 'character_v1'),
  avatar_bg_color = coalesce(avatar_bg_color, avatar_color),
  avatar_initials = coalesce(avatar_initials, initials),
  avatar_hair_style = coalesce(avatar_hair_style, 'short'),
  avatar_hair_color = coalesce(avatar_hair_color, '#6E432D'),
  avatar_top_style = coalesce(avatar_top_style, 'tee'),
  avatar_top_color = coalesce(avatar_top_color, '#1E1B4B')
where avatar_bg_color is null
   or avatar_initials is null
   or avatar_hair_style is null
   or avatar_hair_color is null
   or avatar_top_style is null
   or avatar_top_color is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_style_version_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_style_version_check
      check (avatar_style_version in ('character_v1'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_initials_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_initials_length_check
      check (avatar_initials is null or char_length(avatar_initials) between 1 and 3);
  end if;
end $$;

-- Verification helpers:
-- select avatar_style_version, count(*) from public.profiles group by avatar_style_version;
-- select count(*) from public.profiles where avatar_bg_color is null or avatar_initials is null;
