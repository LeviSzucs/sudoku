# send-push-notifications

Supabase Edge Function for SudoDuel phone push delivery.

This function sends Expo push notifications for already-queued rows in `public.push_notification_deliveries`.
It must run server-side only. The mobile app must not call Expo push delivery directly.

In production, SudoDuel should invoke this function from:

- an immediate Supabase Database Webhook on `public.app_notifications` insert
- the scheduled GitHub Actions workflow `run-push-notifications.yml` as fallback/retry

Manual HTTP invocation is still supported for debugging and backfills.

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

- reserves queued `pending` delivery rows atomically,
- honours `notification_preferences`,
- sends to all active devices for the user,
- records each attempt in `push_notification_deliveries`,
- deactivates Expo tokens rejected as `DeviceNotRegistered`,
- never creates app notifications itself.

## Recommended production invocation model

- **Immediate path**: Supabase Database Webhook -> this Edge Function
- **Fallback path**: GitHub Actions every 5 minutes -> this Edge Function

Both paths are safe together because reservation happens inside
`reserve_pending_push_notification_deliveries(...)`.

## Pipeline overview

1. Social or duel triggers create rows in `public.app_notifications`.
2. An `after insert` trigger immediately fans each notification out into `pending`
   rows in `public.push_notification_deliveries` for all active devices that still
   have push enabled for that notification type.
3. This Edge Function reserves those `pending` rows, marks them `sending`, and
   updates them to `sent`, `failed`, or `skipped`.

## Live notification coverage

Today, SudoDuel automatically creates notifications for:

- friend request received
- friend request accepted
- Friend Challenge received
- Friend Challenge accepted
- Friend Challenge completed
- Daily Duel match found
- Ranked Duel match found

The schema/preferences also reserve `duel_ready`, `reminder`, and `marketing`,
but normal gameplay does not currently create those rows. Use the admin/self-test
helpers if you need to verify those categories manually.

If `app_notifications` exist but no delivery rows exist, the SQL migration that
adds the push fan-out trigger has not been applied yet.

## Manual self-test

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

Backfill missing pending delivery rows for recent notifications, if needed:

```sql
select public.repair_push_notification_deliveries(now() - interval '30 days');
```

## Notes

If push delivery fails, in-app notifications still remain available in SudoDuel.
Failed delivery rows are not automatically retried, which prevents duplicate push spam.
