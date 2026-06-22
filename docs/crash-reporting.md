# SudoDuel Crash And Runtime Error Reporting

SudoDuel now includes a small first-party runtime error reporting foundation for beta builds.

This is intentionally lightweight:

- no Sentry dependency
- no third-party crash SDK
- no new secrets or DSNs
- no puzzle-board or auth-token capture

## What existed before

Before this change, the app had:

- manual feedback submission from Settings
- local console errors during development
- no app-wide React error boundary
- no uncaught JavaScript error capture
- no automatic runtime error visibility in TestFlight

## What this adds

The app now includes:

1. A top-level React error boundary
   - catches React tree crashes
   - shows a calm fallback screen instead of leaving the user stranded

2. A global JavaScript error handler
   - captures uncaught JS runtime errors
   - queues them safely if the app cannot upload immediately

3. A pending-report queue in local storage
   - if the user is not signed in yet, the app stores a small pending error report locally
   - once the user is signed in and Supabase is available, the app flushes queued reports

4. Sanitised upload into the existing `public.feedback` flow
   - category: `bug_report`
   - no new client-visible secrets
   - uses the existing authenticated Supabase path

## Data captured

Automatic runtime error reports are intentionally limited to:

- app version
- platform
- route or screen path when available
- whether the error was fatal
- error name
- error message
- truncated JS stack when available
- truncated React component stack when available

## Data not intentionally captured

The automatic report path is designed **not** to include:

- puzzle boards
- notes state
- move history
- passwords
- auth tokens
- full push tokens
- payment details

## Environment variables

No new environment variables are required for this foundation.

It relies on the same client configuration the app already uses:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

If Supabase is unavailable or the user is not signed in yet, reports stay queued locally until they can be flushed safely.

## Verification

### Local/dev verification

1. Run the app locally.
2. Trigger a deliberate React render error or uncaught JS error in development.
3. Confirm the fallback screen appears for React-tree crashes.
4. Confirm the app does not enter a broken blank state.

### TestFlight verification

1. Sign in with a test account.
2. Reproduce a real runtime crash or navigation/runtime failure.
3. Reopen the app and sign in again if needed.
4. Check `public.feedback` for a new `bug_report` row whose message begins with:

```text
[Automatic runtime error report]
```

### Example verification SQL

```sql
select
  created_at,
  user_id,
  category,
  left(message, 160) as message_preview,
  app_version
from public.feedback
where category = 'bug_report'
  and message like '[Automatic runtime error report]%'
order by created_at desc
limit 20;
```

## Privacy note

This is not a full native-crash observability platform.

It improves visibility for JavaScript/runtime failures and React render crashes during beta, while keeping the app simple and privacy-conscious.

## Follow-up ideas

If SudoDuel later needs stronger production observability, the next step would be a carefully reviewed third-party crash provider such as Sentry, added only when:

- DSN/environment management is ready
- privacy review is complete
- the team wants native crash visibility beyond this lightweight beta foundation
