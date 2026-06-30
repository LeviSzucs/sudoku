# Deploy Push Notifications Edge Function

SudoDuel sends phone push notifications from the Supabase Edge Function:

`expo/supabase/functions/send-push-notifications`

The mobile app must not send push notifications directly.

## Automatic Invocation

Queued `pending` rows in `public.push_notification_deliveries` are sent automatically
by the GitHub Actions workflow:

`.github/workflows/run-push-notifications.yml`

The workflow:

- runs every 5 minutes
- can also be started manually with `workflow_dispatch`
- calls the existing protected Edge Function with `limit: 100`
- is safe to run repeatedly because the Edge Function only processes queued
  `pending` rows and marks them `sending`, `sent`, `failed`, or `skipped`

## GitHub Repository Secrets

Add these repository secrets before running the manual workflow:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `PUSH_DELIVERY_SECRET`

The workflow is manual and lives at:

`.github/workflows/deploy-push-notifications.yml`

Run it from GitHub Actions with **Deploy Push Notifications Function**.

The automatic runner lives at:

`.github/workflows/run-push-notifications.yml`

It appears in GitHub Actions as **Run Push Notifications**.

## What Is Live Today

SudoDuel currently creates in-app notifications and queued push deliveries for:

- friend request received
- friend request accepted
- Friend Challenge received
- Friend Challenge accepted
- Friend Challenge completed
- Daily Duel match found
- Ranked Duel match found

These event rows should fan out into `public.push_notification_deliveries` automatically.

The following notification categories exist in schema/preferences but are not currently
created by normal gameplay flows:

- `duel_ready`
- `reminder`
- `marketing`

Treat those as reserved/manual test types unless a later PR adds live producers for them.

## Supabase Edge Function Secrets

Set these in Supabase as Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUSH_DELIVERY_SECRET`
- `EXPO_ACCESS_TOKEN` optional, only if the Expo project requires one

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side as a Supabase Edge Function secret. Do not commit it to the app, GitHub, or any client-visible config.

## Manual Debug Invocation

Replace `<PROJECT_REF>` and `<PUSH_DELIVERY_SECRET>` with the real values:

```bash
curl -X POST \
  -H "Authorization: Bearer <PUSH_DELIVERY_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"limit":100}' \
  "https://<PROJECT_REF>.supabase.co/functions/v1/send-push-notifications"
```

Expected empty response when there is nothing queued:

```json
{"processed":0,"sent":0,"failed":0,"deactivatedTokens":0}
```

If notifications are queued, the response should show processed delivery counts. Delivery rows are recorded in `public.push_notification_deliveries`.

## Recommended verification order

1. Confirm device tokens exist:

```sql
select user_id, platform, is_active, count(*) as token_count
from public.push_tokens
group by user_id, platform, is_active
order by user_id, platform;
```

2. Create a safe self-test notification.

Authenticated app/client self-test for the currently signed-in user:

```sql
select public.create_notification_self_test();
```

Supabase SQL Editor or service-role admin self-test for a specific user:

```sql
select public.create_notification_admin_test_for_user(
  '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
);
```

3. Confirm the notification and queued deliveries exist before push send runs:

```sql
select notification_id, type, title, created_at
from public.app_notifications
order by created_at desc
limit 10;
```

```sql
select status, count(*) as delivery_count
from public.push_notification_deliveries
group by status
order by status;
```

4. Wait for the scheduled workflow or invoke the Edge Function manually, then re-check delivery statuses:

```sql
select delivery_id, status, provider_message_id, left(error_message, 160) as error_preview, attempted_at
from public.push_notification_deliveries
order by attempted_at desc
limit 20;
```

## How To Verify Automation

1. Create an in-app notification or a self-test notification.
2. Confirm matching rows exist in `public.push_notification_deliveries` with `status = 'pending'`.
3. Wait up to 5 minutes for the **Run Push Notifications** workflow, or run it manually from GitHub Actions.
4. Re-run the delivery-status query.
5. Confirm pending rows become `sent`, `failed`, or `skipped`.
