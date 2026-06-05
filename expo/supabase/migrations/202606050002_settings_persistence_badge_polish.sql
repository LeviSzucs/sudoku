-- Settings polish follow-up: keep avatar cosmetics safe and expand feedback categories.

alter table public.profiles
  add column if not exists avatar_symbol text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_symbol_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_symbol_length_check
      check (avatar_symbol is null or char_length(avatar_symbol) <= 8);
  end if;
end $$;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  message text not null,
  app_version text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.feedback
  drop constraint if exists feedback_category_check;

alter table public.feedback
  add constraint feedback_category_check
  check (category in ('general_feedback', 'bug_report', 'account_issue', 'gameplay_issue', 'other', 'feedback', 'problem'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feedback_status_check'
      and conrelid = 'public.feedback'::regclass
  ) then
    alter table public.feedback
      add constraint feedback_status_check
      check (status in ('open', 'reviewed', 'closed'));
  end if;
end $$;

alter table public.feedback enable row level security;

drop policy if exists "Users can submit own feedback" on public.feedback;
create policy "Users can submit own feedback"
on public.feedback
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own feedback" on public.feedback;
create policy "Users can read own feedback"
on public.feedback
for select
to authenticated
using (auth.uid() = user_id);
