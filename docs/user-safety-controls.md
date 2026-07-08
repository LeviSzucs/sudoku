# User Safety Controls

This pass adds the minimum App Store Guideline 1.2 safety controls for SudoDuel's social surfaces:

- user blocking
- user reporting
- conservative profile-name filtering

## What Blocking Does

When user A blocks user B:

- existing friendship rows between the pair are removed
- pending friend requests between the pair are removed
- active Friend Challenges between the pair are cancelled
- linked in-progress Friend Challenge puzzle sessions are marked `abandoned`
- future friend requests between the pair are rejected
- future Friend Challenges between the pair are rejected
- friend-request and Friend Challenge notification triggers are suppressed for the pair

Blocking is currently focused on social loops. It does not rewrite completed historic duel records.

## Reports Review Query

Use this in the Supabase SQL Editor to inspect open reports with readable handles:

```sql
select
  ur.report_id,
  ur.reason,
  ur.details,
  ur.source,
  ur.status,
  ur.created_at,
  coalesce(nullif(trim(reporter.display_name), ''), reporter.username_handle, reporter.username, 'Player') as reporter_name,
  reporter.username_handle as reporter_handle,
  coalesce(nullif(trim(reported.display_name), ''), reported.username_handle, reported.username, 'Player') as reported_name,
  reported.username_handle as reported_handle
from public.user_reports ur
left join public.profiles reporter on reporter.id = ur.reporter_user_id
left join public.profiles reported on reported.id = ur.reported_user_id
where ur.status = 'open'
order by ur.created_at desc;
```

## Name Filtering

Profile-name filtering is intentionally conservative and currently enforced in the app on:

- username setup
- username availability checks
- profile display-name edits

Rejected names show:

`Please choose a different name.`

This keeps obviously offensive names out of normal flows without risking a late-cycle backend schema change. Server-side enforcement is a follow-up if we want stronger guarantees across every write path.
