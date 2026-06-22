# SudoDuel Supabase Production Migration Audit

This note captures the current migration risk around SudoDuel production before the next TestFlight build.

## Executive Summary

Do **not** run `npx supabase db push` against production right now.

The local migration chain is not a clean, append-only history yet. It contains a mix of:

- initial bootstrap DDL
- historical data repair updates
- duplicate-cleanup deletes
- large puzzle-bank imports and activation/deactivation passes
- trigger and function replacements

That is workable for a fresh local database, but risky against a production project whose schema and data were built incrementally and may already include some manual fixes.

## What We Can Confirm From The Repo

From the repo alone, we can audit the migration chain, but we cannot prove the exact contents of the production migration ledger without querying the live project.

What we **can** say:

- the current migration chain starts with a large bootstrap file: [`expo/supabase/migrations/202605290001_backend_setup.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605290001_backend_setup.sql)
- later migrations include production-data cleanup steps such as `delete from public.game_results ...`
- later migrations also replace functions in place with `drop function if exists ...`
- notification, public profile, ranked hardening, and push-delivery migrations appear to correspond to features that are already live or already tested against production

That combination strongly suggests production is already in a **partially-applied / manually-shaped** state rather than a pristine replay of every local SQL file in order.

## Why `db push` Failed

The reported failure:

```text
could not create unique index "idx_puzzle_sessions_one_in_progress_per_user"
```

comes from [`expo/supabase/migrations/202605290001_backend_setup.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605290001_backend_setup.sql), which contains:

```sql
create unique index if not exists idx_puzzle_sessions_one_in_progress_per_user
on public.puzzle_sessions(user_id) where status = 'in_progress';
```

That partial unique index can only be created if **each user has at most one** row in `public.puzzle_sessions` where `status = 'in_progress'`.

It failed because production already had duplicate rows matching that predicate for at least one user.

In other words, the migration was replaying a historical assumption that is no longer true on live data.

## The Specific Replay Hazard In The Puzzle Session Chain

There are two early files that both try to normalise puzzle session status:

- [`202605290001_backend_setup.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605290001_backend_setup.sql)
- [`202605300004_align_puzzle_sessions_constraints.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605300004_align_puzzle_sessions_constraints.sql)

Those files:

- rewrite old `active` rows to `in_progress`
- rewrite old `Evil` difficulty rows to `Master`
- recreate check constraints

But they do **not** guarantee production no longer has multiple unfinished Classic/Solo sessions per user. That means the later unique index assumption can still fail even though the migration is syntactically valid.

## Migrations That Look Especially Risky To Replay On Production

These are the highest-risk files in the current chain:

1. [`202605290001_backend_setup.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605290001_backend_setup.sql)
   - large bootstrap migration
   - includes data rewrites
   - includes the failing `idx_puzzle_sessions_one_in_progress_per_user` partial unique index
   - assumes historical status cleanup is sufficient

2. [`202605300001_idempotent_game_results.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605300001_idempotent_game_results.sql)
   - deletes duplicate `game_results` rows by `session_id`
   - creates a unique session index
   - safe-looking for a known duplicate shape, but still destructive on live data

3. [`202605300006_daily_result_duplicate_protection.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202605300006_daily_result_duplicate_protection.sql)
   - deletes duplicate completed Daily rows
   - adds a unique daily result index
   - replaces `submit_puzzle_result(...)`

4. [`202606010004_unique_username_setup.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606010004_unique_username_setup.sql)
   - adds `username_handle`
   - creates a case-insensitive unique index on `lower(username_handle)`
   - can fail if production has conflicting historical usernames

5. Puzzle bank activation/deactivation/import migrations:
   - [`202606020009_enforce_unique_puzzle_bank.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606020009_enforce_unique_puzzle_bank.sql)
   - [`202606020010_append_generated_puzzle_bank.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606020010_append_generated_puzzle_bank.sql)
   - [`202606070003_import_inactive_technique_puzzle_bank.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606070003_import_inactive_technique_puzzle_bank.sql)
   - [`202606070004_activate_technique_puzzle_bank.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606070004_activate_technique_puzzle_bank.sql)
   - [`202606070005_deactivate_old_puzzle_sources.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606070005_deactivate_old_puzzle_sources.sql)
   - [`202606130001_expand_calibrated_puzzle_bank.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606130001_expand_calibrated_puzzle_bank.sql)
   - these are not “bad”, but replaying them blindly against production can change active puzzle-bank state in bulk

6. [`202606110001_fix_solo_won_and_dedupe_leaderboards.sql`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo\supabase\migrations\202606110001_fix_solo_won_and_dedupe_leaderboards.sql)
   - backfills legacy solo rows
   - replaces leaderboard RPCs
   - safe as a one-time targeted fix, but still a production data rewrite

## Migrations That Appear Likely Already Reflected In Production

Based on current shipped behaviour and recent production testing, these migration families appear to already be represented in the live project in some form:

- settings/auth/legal support foundations
- avatar builder / avatar profile exposure
- notification preferences, push tokens, app notifications, and delivery queue
- public player profiles
- ranked hardening / ranked result validation

That does **not** mean the production migration ledger is correct. It means production likely has the underlying schema objects and functions already, whether from the migration files themselves or from manual SQL/application.

## Commands That Are Safe Right Now

Run these from [`expo/`](C:\Users\LeviS\Documents\Codex\2026-05-30\github-plugin-github-openai-curated-can\sudoku-supabase-migration-audit\expo) or from the Supabase SQL Editor as noted.

### Local repo validation

```bash
npm.cmd run qa:preflight
git diff --check
```

### Read-only production inspection SQL

Check duplicate in-progress sessions:

```sql
select
  user_id,
  count(*) as in_progress_count,
  array_agg(session_id order by updated_at desc) as session_ids
from public.puzzle_sessions
where status = 'in_progress'
group by user_id
having count(*) > 1
order by in_progress_count desc, user_id;
```

Check whether the partial unique index already exists:

```sql
select
  schemaname,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname = 'idx_puzzle_sessions_one_in_progress_per_user';
```

Check migration ledger entries if the project uses the standard Supabase history table:

```sql
select *
from supabase_migrations.schema_migrations
order by version;
```

Check for duplicate daily results that the historical dedupe migration would target:

```sql
select
  user_id,
  mode,
  puzzle_id,
  count(*) as duplicate_count
from public.game_results
where mode = 'daily'
  and completed = true
  and puzzle_id is not null
group by user_id, mode, puzzle_id
having count(*) > 1
order by duplicate_count desc, user_id;
```

### Safe manual application style

If a forward-only fix is needed before history is repaired, the safe approach is:

1. write a **new** targeted SQL script
2. review it against live data first with read-only queries
3. apply it manually in the Supabase SQL Editor or another controlled admin path
4. capture exactly what was applied

## Commands To Avoid For Now

Avoid these against production until history is reconciled:

```bash
npx supabase db push
npx supabase db push --linked
npx supabase db reset
```

Also avoid:

- replaying the full contents of `expo/supabase/migrations/` against production in timestamp order
- manually rerunning the old bootstrap migration
- assuming “if not exists” makes a migration safe when the file also contains data rewrites or deletes

## Recommended Safe Reconciliation Plan

### Phase 1: Inspect production state

1. Export the live migration ledger from `supabase_migrations.schema_migrations`.
2. Run read-only duplicate checks for:
   - `puzzle_sessions` where `status = 'in_progress'`
   - `game_results` daily duplicates
   - any username-handle collisions before relying on the unique index
3. Compare live objects against the repo:
   - key indexes
   - key RPCs
   - key notification functions/triggers

### Phase 2: One-time production data cleanup

Do **not** do this from a blind replay.

Create a one-time reviewed cleanup script for only the live issues actually found, for example:

- closing or deduplicating duplicate `in_progress` puzzle sessions
- resolving any username-handle collisions before relying on the unique index
- deduplicating live Daily result rows if they still exist

This cleanup should be explicit, recorded, and separately reviewed.

### Phase 3: Baseline or repair migration history

Before using `db push` again, choose one of these approaches:

1. **Migration ledger repair**
   - mark already-applied historical migrations as applied in the production migration history table
   - only after confirming the live schema/function state actually matches what those migrations intend

2. **Fresh baseline migration for future work**
   - create a new baseline snapshot representing the current production schema/state
   - archive the older bootstrap-era migrations as historical reference
   - apply only new forward migrations after that point

For this repo, a fresh baseline is likely the less error-prone long-term option.

### Phase 4: Resume forward-only migrations

After history is reconciled:

- use new append-only migrations only
- keep cleanup and backfill logic narrowly scoped
- avoid putting large bootstrap, repair, and seed-bank replacement logic into the same file

## What Can Be Applied Manually vs What Should Not Be Replayed

### Usually reasonable as targeted manual forward fixes

- additive new tables
- additive new columns
- additive new read-only helper functions
- trigger/function replacements when reviewed against current live schema

### Should not be replayed blindly

- bootstrap migrations that both create schema and rewrite historical data
- migrations that delete duplicate rows as part of setup
- migrations that bulk activate/deactivate large puzzle banks
- migrations that add unique indexes on tables with known live duplicates

## Recommended Next Step Before The Next TestFlight Build

Do a production baseline pass first:

1. inspect migration ledger
2. inspect duplicate `in_progress` sessions
3. inspect any remaining duplicate Daily rows
4. decide baseline-vs-history-repair
5. only then resume production `supabase` deploy work

Until then, treat production DB changes as **manual, targeted, and reviewed**, not “push the whole folder”.
