# Ranked Duel stuck-match repair

Use these queries in the Supabase SQL Editor when a specific ranked duel keeps reopening after it should have been cleared.

Replace `levi_handle` and `ellie_handle` with the real `profiles.username_handle` values for the two affected players, or replace the `target_users` CTE with explicit user IDs.

## Read-only inspection

```sql
with target_users as (
  select id, username_handle, coalesce(nullif(trim(display_name), ''), username_handle, 'Player') as label
  from public.profiles
  where username_handle in ('levi_handle', 'ellie_handle')
),
stuck_duels as (
  select
    rd.ranked_duel_id,
    rd.status,
    rd.puzzle_id,
    rd.created_at,
    rd.updated_at,
    rd.completed_at,
    rd.player_a_id,
    pa.username_handle as player_a_handle,
    rd.player_a_session_id,
    psa.mode as player_a_session_mode,
    psa.status as player_a_session_status,
    psa.puzzle_id as player_a_session_puzzle_id,
    rd.player_a_result_id,
    rd.player_b_id,
    pb.username_handle as player_b_handle,
    rd.player_b_session_id,
    psb.mode as player_b_session_mode,
    psb.status as player_b_session_status,
    psb.puzzle_id as player_b_session_puzzle_id,
    rd.player_b_result_id,
    rd.winner_user_id
  from public.ranked_duels rd
  left join public.profiles pa on pa.id = rd.player_a_id
  left join public.profiles pb on pb.id = rd.player_b_id
  left join public.puzzle_sessions psa on psa.session_id = rd.player_a_session_id
  left join public.puzzle_sessions psb on psb.session_id = rd.player_b_session_id
  where rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
    and rd.player_a_id in (select id from target_users)
    and coalesce(rd.player_b_id, rd.player_a_id) in (select id from target_users)
)
select *
from stuck_duels
order by updated_at desc, created_at desc;
```

## Read-only results linked to those sessions

```sql
with target_users as (
  select id
  from public.profiles
  where username_handle in ('levi_handle', 'ellie_handle')
),
target_sessions as (
  select rd.player_a_session_id as session_id
  from public.ranked_duels rd
  where rd.player_a_id in (select id from target_users)
    and coalesce(rd.player_b_id, rd.player_a_id) in (select id from target_users)
  union
  select rd.player_b_session_id as session_id
  from public.ranked_duels rd
  where rd.player_a_id in (select id from target_users)
    and coalesce(rd.player_b_id, rd.player_a_id) in (select id from target_users)
)
select
  gr.result_id,
  gr.user_id,
  gr.session_id,
  gr.mode,
  gr.puzzle_id,
  gr.completed,
  gr.won,
  gr.final_score,
  gr.elapsed_seconds,
  gr.completed_at
from public.game_results gr
where gr.session_id in (select session_id from target_sessions where session_id is not null)
order by gr.completed_at desc nulls last, gr.result_id desc;
```

## Targeted repair for only the stuck active duel(s)

This updates only active ranked duels between the two named users and abandons only their linked in-progress puzzle sessions.

```sql
begin;

with target_users as (
  select id
  from public.profiles
  where username_handle in ('levi_handle', 'ellie_handle')
),
stuck_duels as (
  select
    rd.ranked_duel_id,
    rd.status,
    rd.player_a_session_id,
    rd.player_b_session_id
  from public.ranked_duels rd
  where rd.status in ('waiting_for_opponent', 'matched', 'player_a_completed', 'player_b_completed')
    and rd.player_a_id in (select id from target_users)
    and coalesce(rd.player_b_id, rd.player_a_id) in (select id from target_users)
)
update public.ranked_duels rd
set status = case when rd.status = 'waiting_for_opponent' then 'cancelled' else 'expired' end,
    updated_at = now()
from stuck_duels sd
where rd.ranked_duel_id = sd.ranked_duel_id;

with target_users as (
  select id
  from public.profiles
  where username_handle in ('levi_handle', 'ellie_handle')
),
stuck_sessions as (
  select rd.player_a_session_id as session_id
  from public.ranked_duels rd
  where rd.status in ('cancelled', 'expired')
    and rd.player_a_id in (select id from target_users)
    and coalesce(rd.player_b_id, rd.player_a_id) in (select id from target_users)
  union
  select rd.player_b_session_id as session_id
  from public.ranked_duels rd
  where rd.status in ('cancelled', 'expired')
    and rd.player_a_id in (select id from target_users)
    and coalesce(rd.player_b_id, rd.player_a_id) in (select id from target_users)
)
update public.puzzle_sessions ps
set status = 'abandoned',
    updated_at = now()
where ps.status = 'in_progress'
  and ps.session_id in (select session_id from stuck_sessions where session_id is not null);

commit;
```

## Why this happens

The most likely stuck state is an active `ranked_duels` row that still points at a stale `puzzle_sessions` row. Before the latest server patch, `enter_ranked_duel()` could still restore or rematch against that row. The new SQL patch hardens both behaviours:

- it expires or cancels active ranked duels whose linked session is no longer resumable for the current user
- it skips orphaned `waiting_for_opponent` rows during matchmaking so a stale queue entry cannot be reused
