# Android store readiness

This document tracks the Android launch path for SudoDuel without changing the submitted iOS build.

## Current Android identifiers

- App name: SudoDuel
- Expo slug: `sudoduel`
- Android package: `com.leviszucs.sudoduel`
- EAS project ID: `9e0e41fd-7050-42f7-b25f-49d1181f19a8`

## Build profiles

Use the preview profile for direct Android device testing:

```powershell
cd C:\Users\LeviS\Documents\sudoku\expo
npm.cmd run qa:android-store
npm.cmd run build:android:preview
```

The preview profile is configured as an internal APK build so it can be installed on Android devices for smoke testing before Google Play setup.

Use the production profile only when the Google Play Console app and signing/release process are ready:

```powershell
cd C:\Users\LeviS\Documents\sudoku\expo
npm.cmd run qa:android-store
npm.cmd run build:android:production
```

## Android smoke-test checklist

Before uploading to Google Play closed testing, verify on a real Android device:

- Install APK from the preview build.
- Launch app from cold start.
- Sign in with a non-personal test account.
- Complete display name and username setup.
- Start and complete a Classic puzzle.
- Start or view Daily puzzle flow.
- Open Duel / Versus / Ranked screens.
- Open Friend Challenge screen.
- Send and receive a challenge if a second account/device is available.
- Confirm push notification permission prompt appears where expected.
- Confirm received push notifications open the app without crashing.
- Test Android hardware/software back button from major screens.
- Check keyboard and number input on puzzle grid.
- Check safe-area/status-bar spacing on Home, Puzzle, Duel, Profile, Settings, Legal, Privacy, Support, and Feedback screens.
- Submit feedback through the in-app feedback form.
- Sign out and sign back in.

## Google Play Console preparation

Create the Google Play listing only after the preview APK smoke test passes.

Expected setup tasks:

- Create or use a Google Play Developer account.
- Create SudoDuel app.
- Set app category to Game / Puzzle.
- Add privacy policy URL: `https://www.sudoduel.app/privacy`.
- Add support contact: `sudoduel@gmail.com`.
- Complete Google Play Data Safety based on the same production data practices used for Apple privacy labels.
- Prepare Android screenshots from a real Android build, not Expo preview.
- Start closed testing and recruit enough opted-in testers for the required testing period before production access.

## Boundaries while iOS is under Apple review

Do not use this Android track to change shared production behaviour unless a blocker is found.

Avoid changes to:

- Puzzle generation or validation.
- Scoring, ranking, sessions, or duel logic.
- Auth flow.
- Push notification tap routing.
- Supabase migrations or production schema.
- iOS bundle identifier or submitted iOS build settings.

Also do not run production Supabase schema push/reset commands from this track.
