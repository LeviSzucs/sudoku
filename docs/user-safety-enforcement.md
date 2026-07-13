# User Safety Enforcement

This rollout hardens SudoDuel's existing block/report system so blocking is enforced on read paths as well as write RPCs.

## What Was Already Enforced

`202607080001_user_safety_controls.sql` already added the core safety model:

- `public.user_blocks`
- `public.user_reports`
- `public.users_are_blocked(uuid, uuid)`
- `public.block_user(...)`
- `public.unblock_user(...)`
- `public.report_user(...)`

That migration already enforced block state in the most important mutation paths:

- `search_users_by_username`
- `send_friend_request`
- `respond_friend_request`
- `get_friends`
- `get_pending_friend_requests`
- `create_friend_challenge`
- `accept_friend_challenge`
- friend request / friend challenge notification triggers
- cleanup trigger that removes friendships, removes pending friend requests, cancels active friend challenges, and abandons linked in-progress puzzle sessions

## What This Follow-Up Adds

`202607130002_harden_user_safety_read_enforcement.sql` closes the remaining read-side gaps:

- blocked viewers no longer receive public stats or recent results from `get_public_player_profile` / `get_public_player_recent_results`
- blocked pairs no longer appear in `get_friend_challenges`
- blocked pairs no longer expose friend head-to-head history through `get_friend_head_to_head`

This keeps the write enforcement intact while making the "mutual cut-off" feel real in the app.

## Manual Supabase SQL Editor Rollout

Apply this file manually in production:

- [expo/supabase/migrations/202607130002_harden_user_safety_read_enforcement.sql](C:/Users/LeviS/Documents/Codex/2026-05-30/github-plugin-github-openai-curated-can/sudoku-audit-avatar-showcase/expo/supabase/migrations/202607130002_harden_user_safety_read_enforcement.sql)

Do not run the full historical migration chain against production for this change.

## Verification Queries

These SQL Editor checks confirm the data/model side safely, but note that the auth-scoped RPC behaviour still needs app-side QA because `auth.uid()` is user-context dependent.

### 1. Confirm the block relationship exists

```sql
select
  blocker_user_id,
  blocked_user_id,
  reason,
  created_at
from public.user_blocks
order by created_at desc
limit 20;
```

### 2. Confirm a blocked friendship/request pair has been cleaned up

```sql
select *
from public.friends
where (user_id = '<user-a-uuid>' and friend_id = '<user-b-uuid>')
   or (user_id = '<user-b-uuid>' and friend_id = '<user-a-uuid>');

select *
from public.friend_requests
where (sender_id = '<user-a-uuid>' and receiver_id = '<user-b-uuid>')
   or (sender_id = '<user-b-uuid>' and receiver_id = '<user-a-uuid>');
```

### 3. Confirm active friend challenges were cancelled

```sql
select
  challenge_id,
  status,
  challenger_id,
  challenged_id,
  challenger_session_id,
  challenged_session_id,
  updated_at
from public.friend_challenges
where least(challenger_id, challenged_id) = least('<user-a-uuid>'::uuid, '<user-b-uuid>'::uuid)
  and greatest(challenger_id, challenged_id) = greatest('<user-a-uuid>'::uuid, '<user-b-uuid>'::uuid)
order by created_at desc;
```

### 4. Confirm linked active sessions were abandoned

```sql
select
  session_id,
  user_id,
  mode,
  status,
  updated_at
from public.puzzle_sessions
where session_id in (
  select challenger_session_id
  from public.friend_challenges
  where least(challenger_id, challenged_id) = least('<user-a-uuid>'::uuid, '<user-b-uuid>'::uuid)
    and greatest(challenger_id, challenged_id) = greatest('<user-a-uuid>'::uuid, '<user-b-uuid>'::uuid)
  union
  select challenged_session_id
  from public.friend_challenges
  where least(challenger_id, challenged_id) = least('<user-a-uuid>'::uuid, '<user-b-uuid>'::uuid)
    and greatest(challenger_id, challenged_id) = greatest('<user-a-uuid>'::uuid, '<user-b-uuid>'::uuid)
)
order by updated_at desc;
```

### 5. Confirm report rows are durable

```sql
select
  ur.report_id,
  ur.reason,
  ur.details,
  ur.source,
  ur.status,
  ur.created_at,
  reporter.username_handle as reporter_handle,
  reported.username_handle as reported_handle
from public.user_reports ur
left join public.profiles reporter on reporter.id = ur.reporter_user_id
left join public.profiles reported on reported.id = ur.reported_user_id
order by ur.created_at desc
limit 20;
```

## App-Side QA Focus

After the SQL is applied, verify in the app:

- blocked public profiles do not show stats or recent results
- blocked users do not appear in Friend Challenge lists or head-to-head history
- blocked users cannot send new friend requests or Friend Challenges in either direction
- unblocking restores normal friend/challenge behaviour
- reporting still creates durable `user_reports` rows
