# Global Leaderboard Opt-In Rollout

## Goal

Global leaderboard participation is opt-in. Users only appear on public Daily, Weekly, and Ranked leaderboards when `show_on_global_leaderboards = true`.

Defaults after rollout:

- existing users: `false`
- new users: `false`

Friends-only leaderboard behaviour is unchanged.

## Manual Supabase SQL Editor rollout

Apply the forward migration:

- `expo/supabase/migrations/202607130001_global_leaderboard_opt_in.sql`

Recommended process:

1. Open Supabase SQL Editor for production.
2. Paste the migration contents exactly.
3. Run the migration once.
4. Run the verification queries below before shipping a build that depends on the new setting.

Do not replay the whole migration chain and do not run `supabase db push` against production for this change.

## Verification queries

### 1. Column exists and defaults to false

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_settings'
  and column_name = 'show_on_global_leaderboards';
```

Expected:

- `data_type = boolean`
- `is_nullable = NO`
- `column_default` contains `false`

### 2. Existing users were backfilled to false

```sql
select
  count(*) as total_rows,
  count(*) filter (where show_on_global_leaderboards = true) as opted_in_rows,
  count(*) filter (where show_on_global_leaderboards = false) as opted_out_rows
from public.user_settings;
```

Expected immediately after rollout:

- `opted_in_rows = 0`
- all existing rows counted in `opted_out_rows`

### 3. Daily leaderboard hides opted-out users

```sql
select *
from public.get_daily_leaderboard(current_date)
limit 20;
```

Expected:

- only users with `show_on_global_leaderboards = true` appear

### 4. Weekly leaderboard hides opted-out users

```sql
select *
from public.get_weekly_leaderboard(current_date)
limit 20;
```

Expected:

- only users with `show_on_global_leaderboards = true` appear

### 5. Ranked leaderboard hides opted-out users

```sql
select *
from public.get_ranked_leaderboard()
limit 20;
```

Expected:

- only users with `show_on_global_leaderboards = true` appear

### 6. Inspect current user visibility state

```sql
select
  us.user_id,
  p.username_handle,
  p.display_name,
  us.show_on_global_leaderboards,
  us.public_profile,
  us.show_stats_publicly,
  us.show_recent_results_publicly
from public.user_settings us
left join public.profiles p on p.id = us.user_id
where p.username_handle in ('levi', 'ellie_b')
order by p.username_handle;
```

### 7. Toggle-on verification

```sql
update public.user_settings
set show_on_global_leaderboards = true
where user_id = '<target-user-id>';
```

Then rerun:

```sql
select *
from public.get_ranked_leaderboard()
where user_id = '<target-user-id>';
```

Expected:

- the user appears in the global ranked leaderboard query if they have ranked profile data for the active season

### 8. Toggle-off verification

```sql
update public.user_settings
set show_on_global_leaderboards = false
where user_id = '<target-user-id>';
```

Then rerun:

```sql
select *
from public.get_ranked_leaderboard()
where user_id = '<target-user-id>';
```

Expected:

- zero rows returned

## Notes

- This rollout only changes global/public leaderboard visibility.
- It does not delete or alter RP, scores, ranked profiles, results, streaks, or season snapshots.
- It does not affect friends-only leaderboard comparisons.
