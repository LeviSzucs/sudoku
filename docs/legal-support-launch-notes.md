# SudoDuel Legal, Support, and Account Notes

This note summarises the current launch-safe legal and support surfaces for SudoDuel.

## Support Email

- Shared support email constant: `sudoduel@gmail.com`
- Defined in: `expo/constants/legal.ts`
- Mailto helper: `expo/lib/support.ts`

Change the address in one place only if SudoDuel moves to a domain email later.

## Screens Updated

- `Settings > Premium`
- `Settings > Help & FAQ`
- `Settings > Contact Support`
- `Settings > Terms of Use`
- `Settings > Privacy Policy`
- `Settings > Delete Account`
- `Settings > Send feedback`
- `Settings > Report a problem`

## Current Premium Position

- SudoDuel remains free during the current beta.
- Premium is presented as future supporter, cosmetic, and convenience direction only.
- This pass does not enable subscriptions or RevenueCat purchase UX.

## Feedback And Support Behaviour

- Feedback and problem reports still write to `public.feedback`.
- Users must be signed in to submit through the in-app form.
- The form prevents empty submissions.
- Users can optionally include app diagnostics:
  - app version
  - platform
- Support and deletion flows also offer a `mailto:` route to `sudoduel@gmail.com`.

## Account Deletion Behaviour

Current behaviour is a verified deletion request flow, not a destructive self-service delete.

- `Settings > Delete Account` explains the flow.
- Users can:
  - open a prefilled in-app deletion request
  - email support directly
- This avoids unsafe partial deletion while beta data relationships are still being reviewed.

## App Store Review Notes

Before wider TestFlight or App Store review:

- confirm Terms of Use and Privacy Policy copy still matches actual data flows
- confirm `sudoduel@gmail.com` is monitored
- confirm account deletion requests have an operational response process
- confirm feedback submissions still create `public.feedback` rows
- confirm mailto support links open safely on device
- confirm Premium copy does not imply active subscriptions during beta

## Remaining Manual Review

This copy is launch-safe product copy, not legal advice. Before public release:

- perform legal review of Terms of Use
- perform legal review of Privacy Policy
- confirm final retention/deletion policy wording
- confirm any future analytics, advertising, or subscription changes are reflected in Privacy Policy before release
