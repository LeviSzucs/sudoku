# Deploy Push Notifications Edge Function

SudoDuel sends phone push notifications from the Supabase Edge Function:

`expo/supabase/functions/send-push-notifications`

The mobile app must not send push notifications directly.

## GitHub Repository Secrets

Add these repository secrets before running the manual workflow:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

The workflow is manual and lives at:

`.github/workflows/deploy-push-notifications.yml`

Run it from GitHub Actions with **Deploy Push Notifications Function**.

## Supabase Edge Function Secrets

Set these in Supabase as Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUSH_DELIVERY_SECRET`
- `EXPO_ACCESS_TOKEN` optional, only if the Expo project requires one

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side as a Supabase Edge Function secret. Do not commit it to the app, GitHub, or any client-visible config.

## Test After Deployment

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

4. Invoke the Edge Function and then re-check delivery statuses:

```sql
select delivery_id, status, provider_message_id, left(error_message, 160) as error_preview, attempted_at
from public.push_notification_deliveries
order by attempted_at desc
limit 20;
```
