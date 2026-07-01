# Ranked Result SQL Readiness

Do not use `supabase db push` against production to fix ranked result submission drift. Apply the targeted SQL patch manually when production has the ranked wrappers but is missing their core dependencies.

## Required Functions

These functions must exist in production for ranked and duel result saving to work end to end:

- `public.session_move_type_count(jsonb, text)`
- `public.session_wrong_entry_count(jsonb)`
- `public.submit_puzzle_result_core(uuid, jsonb, integer, integer, integer, integer, timestamptz)`
- `public.submit_failed_puzzle_result_core(uuid, integer, integer, integer, integer, timestamptz)`
- `public.submit_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz)`
- `public.submit_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz)`
- `public.submit_ranked_puzzle_result(uuid, jsonb, integer, integer, integer, integer, timestamptz)`
- `public.submit_ranked_failed_puzzle_result(uuid, integer, integer, integer, integer, timestamptz)`

## Readiness Check

Run this in the Supabase SQL Editor:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as signature
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'session_move_type_count',
    'session_wrong_entry_count',
    'submit_puzzle_result_core',
    'submit_failed_puzzle_result_core',
    'submit_puzzle_result',
    'submit_failed_puzzle_result',
    'submit_ranked_puzzle_result',
    'submit_ranked_failed_puzzle_result'
  )
order by p.proname, signature;
```

## Manual Fix

If either core function is missing, apply:

- [202606300005_restore_ranked_result_core_functions.sql](C:/Users/LeviS/Documents/Codex/2026-05-30/github-plugin-github-openai-curated-can/sudoku-onboarding-empty-state/expo/supabase/migrations/202606300005_restore_ranked_result_core_functions.sql)

This patch:

- recreates the missing helper count functions
- recreates `submit_puzzle_result_core`
- recreates `submit_failed_puzzle_result_core`
- keeps result payload keys compatible with the app
- preserves session close/failure updates
- preserves daily duel, friend challenge, and ranked duel linking hooks
- treats null or non-array `move_history` as empty
