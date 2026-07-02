# Deleted Account Sign-In Reuse Plan

## Current Behaviour

Today, deleting an account does not remove the `auth.users` row. The `delete-account` Edge Function:

- cancels active Friend Challenges, Daily Duels, and Ranked Duels
- abandons in-progress puzzle sessions
- anonymises the user profile
- locks down user settings
- marks prior results as not leaderboard/ranked eligible
- deletes linked rows such as friends, friend requests, push tokens, notification preferences, feedback, ranked profile rows, and achievement rows
- updates the Supabase Auth user to a deleted alias and applies a long ban duration

That final auth-step is why a later email, Apple, or Google sign-in returns a banned-user error instead of starting fresh.

## Why This Cannot Be Safely Reused Yet

The current schema still ties many preserved gameplay and social rows directly to `auth.users(id)`.

Examples in the current migrations include:

- `public.game_results.user_id references auth.users(id) on delete cascade`
- `public.puzzle_sessions.user_id references auth.users(id) on delete cascade`
- `public.friend_challenges.challenger_id/challenged_id references auth.users(id) on delete cascade`
- `public.daily_duels.player_a_id/player_b_id references auth.users(id) on delete cascade`
- `public.ranked_duels.player_a_id/player_b_id references auth.users(id) on delete cascade`

This creates two unsafe outcomes:

1. **Hard-deleting the auth user is dangerous today.**  
   A direct `auth.admin.deleteUser(userId)` could cascade into completed challenge, duel, session, and result rows that we currently preserve so other players keep legitimate history.

2. **Reusing the same auth user id is also unsafe today.**  
   If we simply unban and reset the same auth user, old rows still point at the same `user_id`. That risks reconnecting deleted history, completed duels, legacy results, and public identity traces to the new account.

## Option Audit

### Option A - Reuse the same `auth.users.id`

Not recommended with the current schema.

To do this safely, we would need to guarantee that all user-facing history linked to the deleted account is permanently detached from the reused `user_id`. That is not true today.

Main risks:

- old `game_results` could reappear in history
- preserved duel rows could still resolve to the same account id
- public-profile and social queries could reconnect anonymised history
- old puzzle sessions or derived stats could leak back into the new account

### Option B - Hard-delete the auth user and let the provider create a fresh one

Not recommended as a small patch.

This only becomes safe after the app no longer depends on `auth.users(id)` for preserved history rows, or after preserved history is moved to a separate immutable public-player identity model.

Main risks:

- cascading deletion of completed challenge and duel records
- loss of opponent history integrity
- loss of result rows used by stats or dispute investigation

### Option C - Keep support-only reuse for now

Recommended for the current release window.

This keeps deletion privacy strong and avoids reconnecting old data. The app should:

- continue treating deleted sign-ins as unavailable for automatic reuse
- show clear copy that the sign-in belonged to a deleted account
- offer support contact as the safe path

This is the safest launch choice with the current data model.

## Recommended Future Design For Self-Service "Start Fresh"

If self-service reuse becomes a priority, it should be implemented as a broader data-model change rather than a small auth tweak.

Recommended direction:

1. Introduce a stable public-player identity layer that is separate from `auth.users.id`.
2. Move preserved historical rows to reference that public identity (or nullable/anonymised placeholders) instead of cascading directly from `auth.users`.
3. Keep account deletion anonymising preserved public history while allowing the auth user itself to be safely removed.
4. Only after that, allow a later email/Apple/Google sign-in to create a genuinely new auth user and fresh profile.

At that point, the desired UX can be implemented safely:

- "This sign-in was used for a deleted SudoDuel account."
- "You can start fresh, but your previous account, stats, friends, challenges, and history will not be restored."
- Primary action: `Start fresh`
- Secondary action: `Contact support`

## Small Safe Improvements Included Now

This planning pass should keep behaviour safe while making it clearer:

- signed-out auth copy should explain that the sign-in belonged to a deleted account
- delete-account confirmation copy should stop implying same-sign-in reuse already works

## Manual Follow-Up Before Any Self-Service Reuse Work

Before revisiting this, confirm:

- which preserved rows must remain for opponent-facing history
- whether any current public-profile queries still derive directly from preserved `user_id`
- whether completed challenge/duel integrity can be maintained without `auth.users` cascades
- whether legal/privacy wording needs to change once same-sign-in fresh-start is supported
