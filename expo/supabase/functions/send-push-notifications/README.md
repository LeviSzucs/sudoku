# send-push-notifications

Supabase Edge Function for SudoDuel phone push delivery.

This function sends Expo push notifications for existing rows in `public.app_notifications`.
It must run server-side only. The mobile app must not call Expo push delivery directly.

## Required environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Optional environment variables

- `PUSH_DELIVERY_SECRET`: if set, callers must use `Authorization: Bearer <secret>`.
- `EXPO_ACCESS_TOKEN`: optional Expo push access token if the Expo project requires one.

## Invocation

Use a Supabase schedule or a secure backend webhook to invoke:

```bash
curl -X POST \
  -H "Authorization: Bearer $PUSH_DELIVERY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":100}' \
  "$SUPABASE_FUNCTION_URL/send-push-notifications"
```

The function:

- reserves unsent notification/token pairs atomically,
- honours `notification_preferences`,
- sends to all active devices for the user,
- records each attempt in `push_notification_deliveries`,
- deactivates Expo tokens rejected as `DeviceNotRegistered`,
- never creates app notifications itself.

## Notes

If push delivery fails, in-app notifications still remain available in SudoDuel.
Failed delivery rows are not automatically retried, which prevents duplicate push spam.
