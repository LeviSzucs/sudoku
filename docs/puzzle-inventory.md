# Puzzle inventory and batch readiness

This document describes the repository-derived SudoDuel puzzle inventory and the read-only process for validating future puzzle batches. It does not assert that production migration history is fully reconciled; compare the verification queries below with production before importing content.

## Audited inventory

Audit date: 1 August 2026.

Source: puzzle rows reconstructed from `expo/supabase/migrations` in filename order, including later `is_active` updates by source. The audit scans 1,650 historical insert tuples and resolves them to 1,550 effective puzzle IDs.

| Difficulty | Active | Inactive | Preferred active source | Active clue range | Planning target | Gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | 250 | 60 | 200 | 40-40 | 200 | 0 |
| Medium | 250 | 60 | 200 | 34-34 | 300 | 50 |
| Hard | 250 | 60 | 200 | 30-30 | 300 | 50 |
| Expert | 250 | 60 | 200 | 27-27 | 200 | 0 |
| Master | 250 | 60 | 200 | 24-24 | 150 | 0 |

Preferred source: `technique_calibrated_20260613`.

| Source | Active | Inactive |
| --- | ---: | ---: |
| `technique_calibrated_20260613` | 1,000 | 0 |
| `technique_calibrated_20260607` | 250 | 0 |
| `generated/puzzle-bank/generated-puzzles-20260602.json` | 0 | 250 |
| `generated_unique_20260602` | 0 | 50 |

Repository-derived integrity findings: zero invalid effective rows, duplicate effective IDs, duplicate givens fingerprints, or duplicate full-solution fingerprints. All five difficulties are represented and every active puzzle has exactly one solution under the bounded counter.

Targets are planning warnings, not audit failures. The next content PR should add at least 50 validated Medium and 50 validated Hard puzzles. Any larger batch must retain technique-based calibration and independent review; clue count alone is not a difficulty rating.

## Commands

Run from `expo/`:

```powershell
npm.cmd run puzzles:audit
npm.cmd run puzzles:test-tooling
npm.cmd run puzzles:validate-batch -- path/to/proposed-batch.json
```

These commands are deterministic, local, read-only, require no Supabase credentials, and never print environment variables. `puzzles:audit` exits non-zero for invalid rows, duplicate effective IDs, or duplicate active givens. Shared full solutions with different givens are curation warnings rather than structural failures.

## Batch contract

Use the existing JSON envelope:

```json
{
  "batch": "descriptive_batch_name",
  "puzzles": [
    {
      "puzzle_id": "unique_stable_id",
      "difficulty": "Medium",
      "givens": "81 digits using 0 for blanks",
      "solution": "81 digits from 1 through 9",
      "rating_score": 2000,
      "source": "reviewed_source_name",
      "is_active": false
    }
  ]
}
```

Every row requires an immutable ID; an allowed difficulty; 81 givens digits with `0` for blanks; 81 solution digits from `1` through `9`; an integer calibration rating; a non-empty source; and an explicit active status. Validation requires valid rows, columns and boxes, givens matching the solution, exactly one solution, and no duplicate ID or givens fingerprint within the batch or canonical inventory.

The solution counter uses minimum-candidate backtracking and stops after two solutions, distinguishing zero, one, and multiple solutions. Full-solution duplicates are surfaced as warnings for review.

## Import and rollback

1. Keep a proposed batch inactive while reviewed and calibrated.
2. Run the audit, tooling tests, and batch validator.
3. Review every warning, especially shared solutions.
4. Export vetted rows into one append-only forward SQL migration using existing `public.puzzles` columns.
5. Use immutable IDs and `on conflict (puzzle_id) do nothing`; never silently rewrite existing givens, solutions, or difficulty labels.
6. Apply targeted SQL only after checking production migration history and counts. Do not use a blind production `supabase db push`.
7. Re-run read-only verification and activate only the reviewed source.

Rollback is deactivation, not deletion:

```sql
update public.puzzles
set is_active = false
where source = 'the_exact_batch_source';
```

This preserves sessions and result history. Never broadly delete rows referenced by sessions, dailies, challenges, duels, or results.

## Production verification

```sql
select difficulty, count(*) filter (where is_active) as active_count, count(*) as total_count
from public.puzzles group by difficulty order by difficulty;

select source, is_active, difficulty, count(*) as puzzle_count
from public.puzzles group by source, is_active, difficulty
order by source, is_active desc, difficulty;

select puzzle_id, count(*) from public.puzzles
group by puzzle_id having count(*) > 1;

select givens, count(*) from public.puzzles where is_active
group by givens having count(*) > 1;

select solution, count(*) from public.puzzles where is_active
group by solution having count(*) > 1;
```

## Repeat-risk findings

The latest repository `get_classic_puzzle(uuid, text)` excludes the user's 50 most recent completed Classic puzzle IDs for the selected difficulty and all in-progress session puzzle IDs. It randomly selects eligible rows while preferring `technique_calibrated_20260613`, then `technique_calibrated_20260607`. It removes completed-history exclusion only when the first query is exhausted, then finally falls back to any active row.

Within each source tier, PostgreSQL `random()` makes eligible rows uniformly selectable. With 200 preferred active rows per difficulty, the normal RPC path should not repeat within the recent-50 window.

The client direct-query fallback accepts only one optional previous puzzle ID. If the RPC is unavailable and this fallback is used, a puzzle can repeat after one intervening game. `puzzle_sessions` and `game_results` already expose user, puzzle, mode, difficulty, status, and timestamps, so a future hardening can share a bounded recent-ID exclusion without one request per excluded puzzle.

Verify that production has the latest RPC definition before changing selection. This PR intentionally leaves live selection unchanged.

