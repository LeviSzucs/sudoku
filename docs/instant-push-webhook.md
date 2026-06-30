# Instant Push Webhook Setup

SudoDuel already has a working push pipeline:

`app_notifications` -> `push_notification_deliveries` -> `send-push-notifications` Edge Function -> Expo push

The remaining delay comes from the scheduled GitHub Actions fallback runner:

`.github/workflows/run-push-notifications.yml`

To make push delivery near-instant, add a **Supabase Database Webhook** that invokes the
existing `send-push-notifications` Edge Function as soon as a new `app_notifications` row is inserted.

This is intentionally a **manual dashboard/infrastructure step**, not an app or client secret change.

## Why use a Database Webhook

- keeps `send-push-notifications` as the **single sender**
- does not expose `PUSH_DELIVERY_SECRET` to the mobile app
- stays best-effort: if the webhook call fails, queued rows remain `pending`
- the 5-minute GitHub Actions workflow still retries/falls back safely
- avoids adding new SQL-side secret storage or `pg_net`/HTTP dependencies

## Recommended trigger target

Use the webhook on:

- schema: `public`
- table: `app_notifications`
- event: `INSERT`

Triggering from `app_notifications` is preferred over `push_notification_deliveries` because:

- one gameplay/social event should usually cause one webhook invoke
- the existing SQL fan-out trigger already creates `pending` delivery rows inside the same transaction
- `send-push-notifications` will reserve only queued `pending` rows and ignore duplicates safely

## Supabase Dashboard Setup

In Supabase:

1. Open your project.
2. Go to **Database** -> **Webhooks**.
3. Create a new webhook.
4. Configure:

   - **Name**: `instant-push-notifications`
   - **Table**: `public.app_notifications`
   - **Events**: `Insert`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://<PROJECT_REF>.supabase.co/functions/v1/send-push-notifications`

5. Add headers:

   - `Authorization: Bearer <PUSH_DELIVERY_SECRET>`
   - `Content-Type: application/json`

6. Set the request body to a small batch invoke:

```json
{"limit":100}
```

If the webhook editor requires templated payload fields, keep them minimal. The Edge Function
does not need the notification row body to send; it only needs to be invoked.

## Required secrets

These must already exist for the Edge Function and GitHub fallback runner:

- `PUSH_DELIVERY_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `EXPO_ACCESS_TOKEN`

The webhook must use the same `PUSH_DELIVERY_SECRET` that the Edge Function expects.

## Failure behaviour

This instant path is intentionally **best-effort**:

- if the webhook call succeeds, delivery should usually happen within seconds
- if the webhook call fails, gameplay must continue normally
- queued rows in `public.push_notification_deliveries` remain `pending`
- the scheduled GitHub Actions runner should still pick them up within 5 minutes

Because `send-push-notifications` reserves queued rows through
`reserve_pending_push_notification_deliveries(...)`, duplicate webhook/cron invocations are safe.

## End-to-end verification

1. Ensure:
   - device has granted notification permission
   - `public.push_tokens` contains an active row
   - `send-push-notifications` Edge Function is deployed
   - GitHub fallback workflow still exists

2. Trigger a real event, such as:
   - friend request
   - Friend Challenge send
   - Friend Challenge result
   - Daily Duel match found
   - Ranked Duel match found

3. Verify:

```sql
select notification_id, type, title, created_at
from public.app_notifications
order by created_at desc
limit 10;
```

```sql
select delivery_id, notification_id, status, attempted_at, created_at
from public.push_notification_deliveries
order by created_at desc
limit 20;
```

Expected near-instant behaviour:

- row appears in `app_notifications`
- matching delivery row moves from `pending` -> `sending` -> `sent` within seconds
- device receives a push promptly

## Fallback verification

Temporarily disable or remove the database webhook and repeat a test notification:

- delivery rows should remain `pending` initially
- GitHub Actions **Run Push Notifications** should still process them within 5 minutes

This confirms the fallback path remains intact.
