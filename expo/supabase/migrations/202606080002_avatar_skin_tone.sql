-- Character avatar polish: add selectable skin tone.

alter table public.profiles
  add column if not exists avatar_skin_tone text;

update public.profiles
set avatar_skin_tone = coalesce(avatar_skin_tone, '#D19A6E')
where avatar_skin_tone is null;

-- Verification helper:
-- select avatar_skin_tone, count(*) from public.profiles group by avatar_skin_tone order by count(*) desc;
