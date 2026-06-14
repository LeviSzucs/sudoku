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
