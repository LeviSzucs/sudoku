# Ranked Season Foundation

This PR adds the backend/data foundation for safe ranked-season rollover and future first-open recap screens.

## Confirmed Current Behaviour

From the current migrations and app usage:

- `public.active_ranked_season()` creates a new season with the hardcoded name `Season 1`.
- `public.ranked_seasons` did not previously store a durable season number.
- `public.ranked_profiles` resets naturally by season because each profile row is keyed by `(user_id, season_id)`.
- Ranked Duel results apply RP deltas against the duel's stored `season_id`, so late duel completion already remains tied to the original season.
- There was no durable archived table that preserved a user's finished season standing before the next season started.
- The app had a defensive `Season 1` fallback in ranked-duel mapping.

## What This Migration Adds

- `ranked_seasons.season_number`
- deterministic backfill of existing seasons in `starts_at` order
- season-name normalisation to `Season <season_number>`
- `ranked_season_results` snapshot rows for completed seasons
- idempotent helpers:
  - `refresh_ranked_season_results(uuid)`
  - `finalize_ranked_season(uuid)`
- recap-readiness RPCs:
  - `current_ranked_season_info()`
  - `latest_unseen_ranked_season_recap()`
  - `mark_ranked_season_recap_viewed(uuid)`
- updated `active_ranked_season()` logic that:
  - finalises expired seasons first
  - creates the next season with `max(season_number) + 1`
  - names it `Season <n>`
  - serialises rollover creation with an advisory transaction lock
- updated `link_ranked_duel_result()` so a late ranked result for an already-completed season refreshes that season's archived snapshot instead of leaving recap data stale

## Snapshot Fields That Are Reliably Derivable Today

Stored in `ranked_season_results`:

- `season_id`
- `season_number`
- `season_name`
- `user_id`
- `final_rp`
- `final_tier`
- `peak_rp`
- `peak_tier`
- `matches_played`
- `wins`
- `losses`
- `draws`
- `best_win_streak`
- `final_rank_position`
- `total_ranked_players`
- `finalised_at`
- `recap_viewed_at`

Derivable later in the app or RPC layer:

- win rate
- top percentage / percentile

## Statistics Intentionally Not Invented Here

These are not stored because they are not currently tracked with durable certainty across the existing schema:

- true historical peak leaderboard position during a season
- rank changes over time within the season
- longest ranked survival streak beyond the tracked best win streak
- cosmetic/badge season awards

## Assumptions And Edge-Case Behaviour

- Players with `matches_played = 0` do not receive a season-result snapshot.
- Deleted users keep already-created season snapshots because `ranked_season_results.user_id` is nullable with `on delete set null`.
- If a user deletes their account before rollover and their `ranked_profiles` row is removed before snapshot finalisation, this migration cannot reconstruct a recap for that user retroactively.
- If a ranked duel completes just after the season boundary but is still tied to the old season, the archived snapshot for that completed season is refreshed idempotently so the recap reflects the true final result.
- This PR intentionally uses an advisory lock inside `active_ranked_season()` for concurrency safety. It does **not** add a broad unique partial index on `status = 'active'`, because that would be riskier against unknown legacy production data.

## Seasonal Badge Foundation

This PR does not create seasonal badge awards yet.

Recommended follow-up:

- consume `ranked_season_results` from the existing achievements/badge system
- award seasonal achievements from the archived snapshot rather than from live `ranked_profiles`
- use a unique season+badge grant key so repeated rollover/finalisation calls cannot duplicate awards

## Manual Production Rollout

Do **not** replay the full migration history against production.

Apply only this forward migration after the current production baseline:

- `expo/supabase/migrations/202607110001_ranked_season_foundation.sql`

Recommended manual process:

1. Open Supabase SQL Editor for the production project.
2. Paste the contents of `202607110001_ranked_season_foundation.sql`.
3. Run it once.
4. Run the verification queries below.

## Verification Queries

### 1. Seasons have unique sequential numbers

```sql
select
  season_id,
  season_number,
  name,
  starts_at,
  ends_at,
  status
from public.ranked_seasons
order by season_number asc, starts_at asc, created_at asc, season_id asc;
```

### 2. Check for gaps or duplicate season numbers

```sql
with ordered as (
  select
    season_id,
    season_number,
    row_number() over (order by season_number asc) as expected_number
  from public.ranked_seasons
)
select *
from ordered
where season_number <> expected_number;
```

Expected result: no rows.

### 3. Only one active season exists

```sql
select
  season_id,
  season_number,
  name,
  starts_at,
  ends_at,
  status
from public.ranked_seasons
where status = 'active'
order by starts_at desc, created_at desc, season_id desc;
```

Expected result: exactly one row.

### 4. Confirm the next season number/name that rollover will use

```sql
select
  coalesce(max(season_number), 0) + 1 as expected_next_season_number,
  'Season ' || (coalesce(max(season_number), 0) + 1) as expected_next_season_name
from public.ranked_seasons;
```

### 5. Snapshot rows are unique per user/season

```sql
select
  season_id,
  user_id,
  count(*) as row_count
from public.ranked_season_results
where user_id is not null
group by season_id, user_id
having count(*) > 1;
```

Expected result: no rows.

### 6. Inspect archived results for one completed season

```sql
select
  rsr.season_number,
  rsr.season_name,
  rsr.user_id,
  rsr.final_rp,
  rsr.final_tier,
  rsr.matches_played,
  rsr.wins,
  rsr.losses,
  rsr.draws,
  rsr.best_win_streak,
  rsr.final_rank_position,
  rsr.total_ranked_players,
  rsr.recap_viewed_at,
  rsr.finalised_at
from public.ranked_season_results rsr
where rsr.season_id = :season_id
order by rsr.final_rank_position asc nulls last, rsr.final_rp desc, rsr.user_id asc nulls last;
```

### 7. Repeating finalisation does not duplicate rows

```sql
select public.finalize_ranked_season(:season_id);

select
  season_id,
  user_id,
  count(*) as row_count
from public.ranked_season_results
where season_id = :season_id
  and user_id is not null
group by season_id, user_id
having count(*) > 1;
```

Expected result after re-running finalisation: no duplicate rows.

### 8. Verify current season info RPC

```sql
select * from public.current_ranked_season_info();
```

Expected result: one row with the live active season and the correct `season_number` / `season_name`.

### 9. Verify latest unseen recap RPC for an authenticated user

Run as an authenticated user session:

```sql
select * from public.latest_unseen_ranked_season_recap();
```

Expected result:

- zero rows if there is no unseen completed-season recap for that user
- otherwise one row for that user's latest unseen completed season only

### 10. Verify acknowledgement RPC

Run as an authenticated user session:

```sql
select public.mark_ranked_season_recap_viewed(:season_id);
```

Then:

```sql
select * from public.latest_unseen_ranked_season_recap();
```

Expected result: the acknowledged season should no longer be returned as unseen.
