# Owner-Managed EAS Builds For SudoDuel

Use this guide when you want SudoDuel builds, TestFlight uploads, and App Store submission to run through your own Expo/EAS account instead of a Rork-owned build pipeline.

## App Identity

The Expo app is prepared for owner-managed builds with:

- app name: `SudoDuel`
- iOS bundle identifier: `com.sudoduel.app`
- Android package: `com.sudoduel.app`
- scheme: `sudoduel`

The existing slug is intentionally unchanged so local Rork/Codex workflows do not get disrupted unnecessarily.

## Before You Start

Run all Expo/EAS commands from:

```bash
cd expo
```

You need:

- an Expo account that you control
- access to your Apple Developer account
- EAS CLI installed locally
- the SudoDuel repo checked out locally

## Required Environment Variables

Set these in your local shell and in your Expo/EAS project environment as appropriate:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

Important:

- `EXPO_PUBLIC_EAS_PROJECT_ID` must be your real Expo/EAS project UUID
- the app already validates that the project ID is UUID-shaped before injecting it into `extra.eas.projectId`
- `EXPO_PUBLIC_PROJECT_ID` is only kept as a backwards-compatibility fallback and must not be relied on unless it is also UUID-shaped
- never put `SUPABASE_SERVICE_ROLE_KEY` in the app config or client environment

## First-Time Expo/EAS Setup

1. Log in to your Expo account:

```bash
eas login
```

2. Initialise EAS in this Expo app folder:

```bash
eas init
```

3. Configure build metadata if needed:

```bash
eas build:configure
```

The repo already includes `expo/eas.json` with `development`, `preview`, and `production` profiles, so you should not need to generate one from scratch.

## Build Profiles

Included profiles:

- `development`: internal development client builds
- `preview`: internal preview/TestFlight-style builds
- `production`: store-ready builds with remote app versioning

No secrets are stored in `eas.json`.

## First iOS Build

From the `expo/` folder:

```bash
eas build --profile preview --platform ios
```

For a store-ready production build:

```bash
eas build --profile production --platform ios
```

## First Submit

After a successful production build:

```bash
eas submit --profile production --platform ios
```

Note:

- changing the bundle identifier to `com.sudoduel.app` creates a new TestFlight/App Store Connect app record if one does not already exist
- the first submission should be done under your own Apple Developer account ownership

## Push Notification Readiness

The notification code already reads `extra.eas.projectId` and `EXPO_PUBLIC_EAS_PROJECT_ID`.

Phone push notifications will only work once:

- the Expo/EAS project UUID is valid and present
- the iOS app is built under the owner-managed EAS project
- Apple Push Notification capability/configuration is set correctly for the new app identifier

If the project ID is missing or invalid:

- the app should not crash
- in-app Inbox notifications should still work
- the UI should fall back to the safe push-unavailable state

## Push Notification Test Checklist

After the first owner-managed preview/TestFlight build:

1. Confirm `Constants.expoConfig?.extra?.eas?.projectId` resolves to your real UUID-shaped EAS project ID.
2. Open Notification settings and grant permission.
3. Confirm `public.push_tokens` receives an active iOS row for the signed-in user.
4. Confirm in-app Inbox notifications still work.
5. Confirm missing or denied phone push permission does not break the app.
6. Send a Friend Challenge or friend request and verify the in-app notification path still works even if phone push is not ready yet.

## Rork/Codex Workflow Note

This change is only about build and submission ownership.

It is still fine to:

- use Rork or Codex for code changes
- keep local Rork preview scripts for development convenience
- push changes to GitHub from your normal workflow

The important shift is that official builds and submissions should now be created through your own Expo/EAS account and Apple Developer account.
