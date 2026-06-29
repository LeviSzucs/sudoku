# SudoDuel Social Sign-In Setup

Use this guide to enable `Continue with Apple` and `Continue with Google` for SudoDuel.

This repo now supports Supabase OAuth for:

- Apple
- Google

The mobile app uses Expo-compatible browser-based OAuth with a native deep link back into the app. It does **not** use separate native Google or Apple account-linking flows in this PR.

## App values used by this setup

- iOS bundle identifier: `com.leviszucs.sudoduel`
- app scheme: `sudoduel`
- Supabase project ref: `bocnyzryikelpiupnigv`
- Supabase callback URL: `https://bocnyzryikelpiupnigv.supabase.co/auth/v1/callback`
- Native auth redirect URL: `sudoduel://auth`

## Supabase Auth URL configuration

In Supabase Dashboard:

`Authentication` -> `URL Configuration`

Add these redirect URLs:

- `sudoduel://auth`
- `sudoduel://**`

Recommended site URL for production-facing auth copy:

- `https://sudoduel.app`

If your public site is not ready when testing, you can temporarily use the Supabase project URL as the site URL and swap it later.

## Google provider setup

In Google Cloud / Google Auth Platform:

1. Create or open the Google Cloud project for SudoDuel.
2. Configure the OAuth consent screen branding.
3. Ensure the standard scopes are available:
   - `openid`
   - `userinfo.email`
   - `userinfo.profile`
4. Create an OAuth Client ID with application type `Web application`.
5. Set the authorised redirect URI to:
   - `https://bocnyzryikelpiupnigv.supabase.co/auth/v1/callback`
6. For authorised JavaScript origins, use your production-facing auth/site origin if you have one:
   - `https://sudoduel.app`
7. Copy the Google Client ID and Client Secret.

In Supabase Dashboard:

`Authentication` -> `Providers` -> `Google`

Paste:

- Client ID
- Client Secret

Then enable the provider.

## Apple provider setup

In Apple Developer:

1. Open `Certificates, Identifiers & Profiles`.
2. Confirm the App ID for `com.leviszucs.sudoduel` has `Sign in with Apple` enabled.
3. Create a Services ID for the web OAuth client. Suggested value:
   - `com.leviszucs.sudoduel.web`
4. Configure the Services ID website settings:
   - Domain: `bocnyzryikelpiupnigv.supabase.co`
   - Return URL: `https://bocnyzryikelpiupnigv.supabase.co/auth/v1/callback`
5. Create a Sign in with Apple key.
6. Save:
   - Team ID
   - Key ID
   - Services ID
   - the generated `.p8` key file

In Supabase Dashboard:

`Authentication` -> `Providers` -> `Apple`

Paste:

- Services ID as Client ID
- generated Apple secret / key details as required by Supabase

Then enable the provider.

## Expo / app configuration

The app now includes:

- `ios.usesAppleSignIn: true`
- the `expo-apple-authentication` Expo plugin for capability sync
- `expo-web-browser` for the OAuth session hand-off

This PR uses:

- `expo-web-browser`
- existing Expo deep linking via `scheme: "sudoduel"`

Because the app already has the `sudoduel` scheme configured, the OAuth callback returns to:

- `sudoduel://auth`

Depending on the provider and Supabase response mode, the app can now handle either:

- `access_token` + `refresh_token`, or
- an auth `code`, which is exchanged with Supabase using `exchangeCodeForSession`

## Account linking note

Automatic linking between:

- an existing email/password account
- a new Apple sign-in
- a new Google sign-in

is **not** implemented in this PR.

That is intentional. During beta, users should continue with the same sign-in method they started with unless manual linking is added safely later.

## Manual test checklist

Run these on a real iPhone / TestFlight build after provider setup:

1. Continue with Apple
2. Continue with Google
3. Continue with Email still works
4. New social user reaches username setup if their profile is incomplete
5. Existing social user returns to Home
6. Sign out and sign back in with Apple
7. Sign out and sign back in with Google
8. Cancel the OAuth sheet and confirm the app stays usable
9. Delete account still works after social sign-in
