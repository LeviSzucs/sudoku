# SudoDuel Social Sign-In Setup

Use this guide to enable `Continue with Apple` and `Continue with Google` for SudoDuel.

This repo now supports Supabase social sign-in for:

- Apple
- Google

The mobile app now uses:

- native Apple sign-in on iOS via `expo-apple-authentication` and Supabase `signInWithIdToken`
- browser-based Google OAuth with a native deep link back into the app

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
8. In the OAuth consent screen branding, set:
   - App name: `SudoDuel`
   - Support email: your real support address
   - Home page: `https://sudoduel.app`
   - Privacy Policy: `https://sudoduel.app/privacy`
   - Terms of Service: `https://sudoduel.app/support` or your final terms page
   - App logo: SudoDuel app icon if available

In Supabase Dashboard:

`Authentication` -> `Providers` -> `Google`

Paste:

- Client ID
- Client Secret

Then enable the provider.

### Google branding note

Google sign-in in this PR still opens the Supabase-hosted OAuth hand-off in a browser session. That means the Supabase project host may still appear in parts of the browser flow.

To make the Google flow look cleaner:

1. make sure the Google OAuth consent screen branding is fully configured
2. set the Supabase site URL to `https://sudoduel.app`
3. if you want to remove the Supabase project host from the visible browser flow entirely, the smallest safe follow-up is a Supabase custom auth domain

### Google branding follow-up options

#### Option A: Supabase custom auth domain

This is the smallest safe way to replace `bocnyzryikelpiupnigv.supabase.co` with a SudoDuel-owned domain in the browser hand-off flow.

Recommended target:

- `auth.sudoduel.app`

Manual steps for Levi:

1. In Supabase, enable the custom domain/auth domain feature for the project if your plan supports it.
2. Add a custom auth domain such as `auth.sudoduel.app`.
3. Create the DNS records Supabase asks for, typically:
   - a CNAME for `auth.sudoduel.app`
   - any verification TXT record Supabase provides
4. Wait for domain verification and TLS provisioning.
5. Update Google OAuth authorised redirect URIs to include:
   - `https://auth.sudoduel.app/auth/v1/callback`
6. Keep the existing Supabase project callback in Google until the custom domain is fully verified and working.
7. Update any Supabase Auth URL configuration or provider callback settings that still point only at the project subdomain.

Result:

- the Google browser/interstitial flow should show an `auth.sudoduel.app` domain instead of the Supabase project URL

#### Option B: Native Google ID-token flow

This is possible with Supabase, but it is a larger follow-up than this PR.

Why it is larger:

- the current app uses the safer browser-based Google OAuth hand-off
- moving to native Google sign-in means obtaining a Google ID token directly on-device, then exchanging it with Supabase
- that requires additional Google client configuration and a native-friendly Google sign-in implementation for Expo/iOS

Recommendation:

- keep the current working Google flow for now
- prefer the custom auth domain first
- only move to native Google ID-token auth if the browser hand-off remains unacceptable after domain branding is in place

## Apple provider setup

In Apple Developer:

1. Open `Certificates, Identifiers & Profiles`.
2. Confirm the App ID for `com.leviszucs.sudoduel` has `Sign in with Apple` enabled.
3. Create a Sign in with Apple key.
4. Save:
   - Team ID
   - Key ID
   - the generated `.p8` key file

In Supabase Dashboard:

`Authentication` -> `Providers` -> `Apple`

Paste:

- Key ID
- Team ID
- Bundle ID / client identifier: `com.leviszucs.sudoduel`
- the generated Apple private key contents as required by Supabase

Then enable the provider.

## Expo / app configuration

The app now includes:

- `ios.usesAppleSignIn: true`
- the `expo-apple-authentication` Expo plugin for capability sync
- `expo-web-browser` for the OAuth session hand-off

This app now uses:

- native Apple sign-in on iOS with `signInWithIdToken`
- `expo-web-browser` for Google OAuth
- existing Expo deep linking via `scheme: "sudoduel"`

Because the app already has the `sudoduel` scheme configured, the OAuth callback returns to:

- `sudoduel://auth`

Google OAuth can return either:

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
