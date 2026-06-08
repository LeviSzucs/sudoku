-- Premium entitlement placeholder.
-- Payments are not implemented; this table gives the app a safe, central source
-- for future entitlement reads while every current user remains on the Free plan.

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_type text not null,
  status text not null default 'inactive',
  source text,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_entitlements_type_check'
      and conrelid = 'public.user_entitlements'::regclass
  ) then
    alter table public.user_entitlements
      add constraint user_entitlements_type_check
      check (entitlement_type in ('sudoduel_premium'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_entitlements_status_check'
      and conrelid = 'public.user_entitlements'::regclass
  ) then
    alter table public.user_entitlements
      add constraint user_entitlements_status_check
      check (status in ('active', 'inactive', 'expired', 'trialing'));
  end if;
end $$;

create index if not exists user_entitlements_user_type_status_idx
  on public.user_entitlements (user_id, entitlement_type, status);

drop trigger if exists user_entitlements_set_updated_at on public.user_entitlements;
create trigger user_entitlements_set_updated_at
before update on public.user_entitlements
for each row execute function public.set_updated_at();

alter table public.user_entitlements enable row level security;

drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
on public.user_entitlements
for select
to authenticated
using (auth.uid() = user_id);

grant select on public.user_entitlements to authenticated;
revoke insert, update, delete on public.user_entitlements from anon;
revoke insert, update, delete on public.user_entitlements from authenticated;

-- Verification queries:
-- select entitlement_type, status, count(*) from public.user_entitlements group by entitlement_type, status;
-- select * from public.user_entitlements where user_id = auth.uid();
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'user_entitlements';
