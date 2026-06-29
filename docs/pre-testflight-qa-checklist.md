# SudoDuel Pre-TestFlight QA Checklist

Use this checklist before TestFlight builds and before adding another major feature. Mark each item as pass, fail, blocked, or not tested. Record device, build number, account, and Supabase project used for the run.

## QA Run Details

- Build/version:
- Device(s):
- OS version(s):
- Supabase project:
- Test account A:
- Test account B:
- Tester:
- Date:
- Notes:

## A. App Launch And Auth

- [ ] App opens cleanly.
- [ ] No blank screen, crash loop, or stuck splash.
- [ ] Signed-out launch shows a polished welcome/auth screen with a clear SudoDuel value proposition.
- [ ] Auth landing screen copy is App Store-safe and does not mention paid Premium, ads, or subscriptions.
- [ ] Auth landing screen fits on a small iPhone without clipped buttons, text, or overlapping cards.
- [ ] Apple and Google sign-in buttons appear on the signed-out auth screen.
- [ ] On iOS, Continue with Apple is at least as prominent as Continue with Google.
- [ ] Returning user stays signed in.
- [ ] Logout works.
- [ ] Login works after logout.
- [ ] Create account works.
- [ ] Sign-in and sign-up forms have clear labels, helper copy, and disabled/loading button states.
- [ ] Continue with Apple works on a real iPhone/TestFlight build after provider setup.
- [ ] Continue with Google works on a real iPhone/TestFlight build after provider setup.
- [ ] Cancelling Apple or Google OAuth shows a clean state and does not leave the app stuck.
- [ ] Sign-up validates email format.
- [ ] Sign-up validates minimum password length.
- [ ] Sign-up validates matching confirm password.
- [ ] Duplicate-account and bad-login errors are friendly.
- [ ] Failed sign-in/sign-up/reset states show polished user-facing messages rather than raw technical copy.
- [ ] Forgot password sends a reset email.
- [ ] Password reset link returns to the app or safe reset screen.
- [ ] New password can be saved from the reset flow.
- [ ] Username/profile setup works for a new user.
- [ ] Username setup clearly separates display name from searchable username.
- [ ] Username setup makes it clear avatar customisation can be done later.
- [ ] New social user reaches username setup when their profile is incomplete.
- [ ] Existing social user returns to Home without briefly seeing the wrong auth/setup state.
- [ ] Returning user lands in the right state.
- [ ] Incomplete profile user is routed to setup.
- [ ] Completed profile user does not briefly see setup.
- [ ] Session restore works after closing and reopening the app.
- [ ] Account deletion still works after Apple sign-in.
- [ ] Account deletion still works after Google sign-in.

## B. Home

- [ ] Home loads.
- [ ] New users see a lightweight explanation of what SudoDuel is and a clear first-puzzle action.
- [ ] Onboarding guidance does not block the app or trap the user in a long intro.
- [ ] Streak card displays correctly.
- [ ] Streak flame has a subtle ambient flicker and does not feel distracting.
- [ ] Daily Sudoku card opens today's puzzle.
- [ ] Daily Duel card opens the correct flow.
- [ ] Continue Puzzle appears only with a valid saved puzzle.
- [ ] Continue Puzzle does not appear when there is no resumable session.
- [ ] Premium card opens the Premium screen.
- [ ] No clipped text, clipped icons, or clipped buttons.
- [ ] Bottom nav works.
- [ ] Bottom nav labels fit: Home, Solo, Duel, Ranks, Profile.

## C. Solo / Classic

- [ ] Solo Ranked Duel card opens the Versus/Ranked flow instead of a Coming Soon alert.
- [ ] Easy opens.
- [ ] Medium opens.
- [ ] Hard opens.
- [ ] Expert opens.
- [ ] Master opens.
- [ ] Board renders correctly.
- [ ] Number pad works.
- [ ] Number pad tap targets feel reliable on a small phone.
- [ ] Notes/candidates work if present.
- [ ] Placing a real number clears notes in the cell.
- [ ] Placing a real number clears related peer notes.
- [ ] Mistakes/checking behavior works.
- [ ] Timer works.
- [ ] Pause/resume works if present.
- [ ] Completion saves an official result.
- [ ] Failed/abandoned result behavior is correct.
- [ ] Start Classic puzzle, enter a few numbers, leave and return: Continue appears and resumes the exact puzzle/session.
- [ ] Complete Classic puzzle: Continue disappears.
- [ ] Complete an Easy Classic puzzle, then check Medium: Medium must not show an older Continue puzzle.
- [ ] Start Medium Classic, make progress, leave and return: exactly one Continue appears for that Medium puzzle.
- [ ] Start Easy Classic while Medium is unfinished: the Medium continue is closed/abandoned and only Easy can be continued.
- [ ] Fail Classic puzzle/game over: Continue disappears.
- [ ] Complete Classic puzzle, force close and reopen: Continue remains absent.
- [ ] Fail Classic puzzle, force close and reopen: Continue remains absent.
- [ ] Missing or corrupt continue state is cleared and does not open a fallback puzzle.
- [ ] Starting a new Classic puzzle starts fresh, not as a continuation.
- [ ] There is never more than one Continue Puzzle across all Classic difficulties.

## D. Daily Sudoku

- [ ] Daily puzzle opens.
- [ ] Same daily date displays correctly.
- [ ] Puzzle is playable.
- [ ] Completion saves result.
- [ ] Failed attempt saves final result and blocks retry.
- [ ] Daily stats/streak update correctly.
- [ ] Failed Daily attempt does not extend solved streak.
- [ ] A genuine streak increase triggers the streak flame ignite once.
- [ ] Navigating away and back does not replay the same streak ignite.
- [ ] Reopening the app does not replay the same streak ignite just because the streak count loads.
- [ ] Streak screen explains current streak rules without a dead placeholder card.
- [ ] Replay/duplicate handling is sane.
- [ ] Completion CTA goes to the correct place.
- [ ] Daily leaderboard includes completed Daily attempts for the assigned puzzle.
- [ ] Daily leaderboard does not show Classic results.

## E. Daily Duel

- [ ] Daily Duel opens.
- [ ] Opponent/duel screen loads.
- [ ] Puzzle starts.
- [ ] Both players receive the same puzzle.
- [ ] Completion saves duel result.
- [ ] Failure consumes attempt and scores 0.
- [ ] Win/loss/draw displays correctly.
- [ ] Recent Matches outcome matches the duel outcome, not just puzzle solved status.
- [ ] Result appears in Results History.
- [ ] No Premium blocking.

## F. Friend Challenge

- [ ] Friends screen explains how to add a friend and where Friend Challenges live.
- [ ] Invite/share action opens the native share sheet or shows a safe unavailable message.
- [ ] Shared invite text clearly tells the recipient how to add the sender.
- [ ] Friend list loads in challenge mode.
- [ ] Incoming friend requests appear under Friends > Incoming requests.
- [ ] Empty friend/challenge states explain what to do next instead of ending in a dead end.
- [ ] Challenge creation works.
- [ ] Sending a Friend Challenge opens the sender's own run and the recipient can find the invite under Incoming challenges.
- [ ] User A customises avatar and User B sees User A's saved avatar in Friend Challenge.
- [ ] User B customises avatar and User A sees User B's saved avatar in Friend Challenge.
- [ ] Duplicate active challenge is blocked only for same friend plus same difficulty.
- [ ] Different-difficulty active challenges against the same friend are allowed.
- [ ] Challenge invite/share flow works if present.
- [ ] Recipient/open challenge flow works if testable.
- [ ] Challenge completion works.
- [ ] Failed attempt is final.
- [ ] If User A finishes first and keeps the waiting result modal open, it updates live to win/loss/draw when User B later completes.
- [ ] A friend challenge win that resolves from a waiting state plays the normal win treatment once when the final result lands.
- [ ] Result links to both players correctly.
- [ ] Result screens and completed challenge cards show the correct player avatars.
- [ ] Missing/deleted profile fallback avatar still renders without errors.
- [ ] Completed challenge moves out of Active Challenges.
- [ ] Completed challenge card shows correct winner/draw.
- [ ] Both failed shows Draw.
- [ ] No stuck states.

## G. Ranked Duel

- [ ] Find match works.
- [ ] Searching state appears.
- [ ] Cancel search works while waiting.
- [ ] Cancelled search does not change RP.
- [ ] Cancelled search does not block a new queue.
- [ ] Matched duel starts.
- [ ] Both players receive the same puzzle.
- [ ] Both player completion states work.
- [ ] Timeout/failure state works if testable.
- [ ] Result finalises once.
- [ ] Losing a Ranked Duel by running out of mistakes saves a final loss or safe failed state without leaving a replayable dead match.
- [ ] Returning to Versus after a ranked out-of-mistakes loss does not show a stuck matched duel that can be reopened.
- [ ] RP changes once only.
- [ ] Ranked profile updates after finalisation.
- [ ] Ranked leaderboard updates after finalisation.
- [ ] Profile Competitive Rank updates after finalisation.
- [ ] Normal ranked game completes and awards RP.
- [ ] Ranked completion uses server-derived elapsed time instead of trusting the client timer alone.
- [ ] Re-submitting the same ranked session is rejected or safely reused without double-awarding RP.
- [ ] Submitting a wrong final board is rejected.
- [ ] Implausibly low ranked elapsed time is rejected or replaced by the server-derived duration.
- [ ] Client-provided ranked score values cannot override the server-calculated score.
- [ ] Ranked RP gain within the same tier/division does not show a promotion celebration.
- [ ] A genuine ranked promotion shows a one-time promotion celebration with the correct new rank label.
- [ ] Reopening the same ranked result does not replay the same promotion endlessly.
- [ ] Repeat queue works after completed/cancelled/expired matches.
- [ ] Completed/cancelled/expired matches do not block a new queue.
- [ ] Ranked and Daily Duel cards show the opponent's real rank when it exists, and only show Unranked when no rank data exists.
- [ ] No Premium blocking.

## H. Ranks / Leaderboards

- [ ] Daily leaderboard loads.
- [ ] Weekly leaderboard loads.
- [ ] Friends leaderboard loads.
- [ ] Ranked leaderboard loads.
- [ ] Tapping a podium avatar/name opens that player's public profile.
- [ ] Tapping a leaderboard row avatar/name opens that player's public profile.
- [ ] Current user appears correctly where eligible.
- [ ] Current user highlighting is correct.
- [ ] RP/rank display matches Profile and Versus.
- [ ] Empty/loading states are clean.
- [ ] Empty leaderboard states include a useful next action.
- [ ] Avatars render correctly.
- [ ] No fake rows appear for signed-in users.

## I. Profile

- [ ] Display name renders.
- [ ] Username handle renders.
- [ ] Avatar renders.
- [ ] Mastery XP renders.
- [ ] Competitive Rank renders current-season RP.
- [ ] Progress to next rank is correct.
- [ ] Stats cards render.
- [ ] Solved-only stats are correct.
- [ ] Failed attempts do not count as solved puzzles.
- [ ] Failed attempts do not count as best times.
- [ ] Result History opens.
- [ ] Settings opens.
- [ ] Profile subpage back buttons return to Profile.
- [ ] Public player profile route opens with a large framed avatar hero.
- [ ] Public profile shows rank/stats only when the player's privacy settings allow them.
- [ ] Public profile hides recent results when the player has disabled public recent results.
- [ ] Public profile shows a calm private-state message when `public_profile` is off.

## J. Avatar Builder

- [ ] Avatar screen opens.
- [ ] Skin tone saves.
- [ ] Background saves.
- [ ] Hair style saves.
- [ ] Hair color saves.
- [ ] Top style saves.
- [ ] Top color saves.
- [ ] Accessory saves.
- [ ] Frame saves.
- [ ] Preview updates immediately.
- [ ] Save persists after restart.
- [ ] Avatar renders across Profile, Ranks, Friends, Duels, and Results.
- [ ] Opponent avatars use saved character customisation in Daily Duel, Ranked Duel, Friend Challenge, H2H, and leaderboards.
- [ ] User A changes avatar to an obvious style, colour, accessory, or frame.
- [ ] User B force closes and reopens the app.
- [ ] User B starts a new Friend Challenge with User A and sees User A's exact saved avatar.
- [ ] User A sees User B's exact saved avatar in the same social surfaces.
- [ ] User A changes avatar again, and User B sees the updated avatar after refresh or a new challenge.
- [ ] Legacy initials fallback still works.
- [ ] Chip rows do not clip at screen edges.

## K. Settings

- [ ] Account section opens.
- [ ] Profile settings open.
- [ ] Avatar settings open.
- [ ] Notification toggles do not error.
- [ ] Privacy toggles do not error.
- [ ] App settings/toggles persist as expected.
- [ ] Sound setting is hidden until bundled sound effects ship.
- [ ] Haptics setting persists and controls number-entry, mistake, completion, and result haptics.
- [ ] Appearance is not shown as fake placeholder functionality.
- [ ] Delete account entry is present.
- [ ] Delete account flow requires destructive confirmation.
- [ ] Delete account flow performs real in-app deletion or anonymisation, not just a request form.
- [ ] Delete account copy explains what will be deleted or anonymised.
- [ ] The `delete-account` Edge Function is deployed before TestFlight verification.
- [ ] Deleting an account signs the user out cleanly.
- [ ] Deleted accounts no longer appear in friend search, public profiles, or active challenge cards.
- [ ] A freshly deleted email can create a new account again afterward.
- [ ] Confirm on the live Supabase project that `auth.admin.updateUserById` frees the original email immediately enough for same-session recreation.
- [ ] Feedback opens.
- [ ] Report a problem opens.
- [ ] Contact Support opens.
- [ ] Contact Support shows `sudoduel@gmail.com`.
- [ ] Contact Support can open the device mail app or shows a safe fallback message.
- [ ] Submitting feedback creates a Supabase row.
- [ ] Feedback prevents empty submissions.
- [ ] Feedback can optionally include app diagnostics.
- [ ] A reproduced signed-in runtime crash or React render failure creates an automatic `bug_report` feedback row.
- [ ] Help & FAQ opens.
- [ ] Support opens.
- [ ] Premium opens.
- [ ] Terms of Use opens.
- [ ] Privacy Policy opens.
- [ ] Logout works.

## K1. Public Social Profiles

- [ ] Tapping a friend avatar/name opens that player's public profile.
- [ ] Tapping a Friend Challenge avatar/name opens that player's public profile.
- [ ] Tapping a Daily Duel or Ranked Duel opponent avatar/name opens that player's public profile when a real opponent exists.
- [ ] Public profile does not expose email, auth metadata, or private settings fields.
- [ ] Public profile recent results only appear when `show_recent_results_publicly` is enabled.
- [ ] Public profile stats only appear when `show_stats_publicly` is enabled.

## K2. Notifications

- [ ] Notifications opens from Settings.
- [ ] Notification permission prompt appears only after tapping the enable action.
- [ ] Denying push notifications does not break the app.
- [ ] The denied-permission message explains that SudoDuel still works normally.
- [ ] EAS/Expo project ID is present through `extra.eas.projectId`, `Constants.easConfig.projectId`, or UUID-shaped `EXPO_PUBLIC_EAS_PROJECT_ID`.
- [ ] `EXPO_PUBLIC_PROJECT_ID` may be a Rork slug and must not be treated as a valid EAS UUID unless UUID-shaped.
- [ ] Phone push requires `EXPO_PUBLIC_EAS_PROJECT_ID` or another real UUID-shaped project ID source.
- [ ] If Rork/EAS/APNs is not fully configured, TestFlight shows a calm unavailable message, not a raw Expo error.
- [ ] In that parked state, Inbox notifications still load and remain fully usable.
- [ ] Phone push is treated as pending Rork EAS/APNs setup for this build, not as a blocker for in-app notification QA.
- [ ] Push token registers after permission is granted.
- [ ] TestFlight device creates an active `push_tokens` row after opening Notifications with permission granted.
- [ ] Push token upsert does not create duplicate active token rows for the same user/token.
- [ ] Notification preferences save and reload.
- [ ] Marketing/news/offers defaults off.
- [ ] Friend request received creates an in-app notification for the recipient.
- [ ] Friend request accepted creates an in-app notification for the sender.
- [ ] Friend Challenge created creates an in-app notification for the challenged player.
- [ ] Friend Challenge accepted creates an in-app notification for the challenger.
- [ ] Friend Challenge completed creates result-ready notifications for both players.
- [ ] Daily Duel matched creates match-ready notifications for both players.
- [ ] Ranked Duel matched creates match-ready notifications for both players.
- [ ] Each in-app notification that should push immediately creates `pending` `push_notification_deliveries` rows for the user's active devices.
- [ ] Disabled preferences suppress matching in-app notification types.
- [ ] No duplicate spam notifications appear for the same event.
- [ ] In-app notification read state works.
- [ ] Notification deep links open the relevant Friends/Duel screen where safe.
- [ ] Tapping a valid notification deep link marks it read and navigates safely without crashing.
- [ ] Tapping a null, malformed, unsupported, external, or current-screen notification deep link does not crash and safely stays on Notifications.
- [ ] App still works without push permission.

## K3. Streak Motion

- [ ] Streak stats screen shows the same subtle flame treatment as Home where appropriate.
- [ ] Reduced-motion devices still show the streak clearly without broken or busy animation.
- [ ] Streak count remains accurate while the ambient flame animation runs.
- [ ] `send-push-notifications` Edge Function is deployed and invoked automatically by the scheduled backend job, with manual invocation available for debugging.
- [ ] Push deployment setup follows `docs/deploy-push-notifications.md`.
- [ ] Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` only in the server runtime.
- [ ] `PUSH_DELIVERY_SECRET` is configured if invoking the function over HTTP.
- [ ] Creating a Friend Challenge sends a phone push to the challenged player when push is enabled.
- [ ] Accepting a Friend Challenge sends a phone push to the challenger when push is enabled.
- [ ] Friend request send/accept sends phone pushes when push is enabled.
- [ ] Daily Duel and Ranked Duel match-found events send phone pushes when push is enabled.
- [ ] Disabled preferences suppress matching phone pushes.
- [ ] Invalid/dead Expo tokens are marked inactive.
- [ ] Push delivery failures do not remove in-app notifications.
- [ ] Client code does not send push notifications to other users.
- [ ] After creating a new notification, matching `push_notification_deliveries` rows appear as `pending`.
- [ ] Within the automation window, pending rows move to `sent`, `failed`, or `skipped` without manual PowerShell commands.

## L. Premium Foundation

- [ ] Premium screen shows Current plan: Free.
- [ ] Premium screen clearly says the app is free during beta.
- [ ] Premium screen uses clean placeholder copy and does not push users into an inactive purchase flow.
- [ ] Fairness note is visible.
- [ ] All Classic difficulties, including Expert and Master, are free.
- [ ] Premium screen clearly explains the current free-first launch approach.
- [ ] Premium is framed as future/supporter/cosmetic-focused rather than a core gameplay paywall.
- [ ] Premium does not affect RP, leaderboard scores, matchmaking, or duel outcomes.
- [ ] Premium does not imply Expert/Master are paywalled.
- [ ] Daily Sudoku is not paywalled.
- [ ] Daily Duel is not paywalled.
- [ ] Ranked Duel is not paywalled.
- [ ] Friend Challenge is not paywalled.
- [ ] Leaderboards are not paywalled.
- [ ] Free-first launch mode leaves current result history, advanced stats, head-to-head views, and current avatar options accessible without a Premium blocker.
- [ ] Premium/payment architecture remains intact even though current launch gating is relaxed.
- [ ] Restore purchases still behaves safely and refreshes Premium status.
- [ ] Free users can create up to 10 Friend Challenges in the current limit window.
- [ ] Premium users have the higher/unlimited Friend Challenge creation path.
- [ ] No real ad SDK is integrated.
- [ ] No tracking or App Tracking Transparency prompt is present.
- [ ] Ad policy allows future ads only at natural result-screen breaks.
- [ ] Future ads are disallowed during active puzzles, before result save, matchmaking, leaderboards, profile, settings, and Premium screen.
- [ ] Premium plan is treated as ad-free by policy.
- [ ] `user_entitlements` RLS is enabled.
- [ ] Current user has no active Premium entitlement unless intentionally configured for QA.
- [ ] Free users can create up to 10 Friend Challenges in the current limit window.
- [ ] Free users see no Premium clutter in the Friend Challenge modal before hitting the limit.
- [ ] Free users only see Friend Challenge limit copy after hitting the 10-challenge free allowance.
- [ ] Premium users see no `Premium active` clutter in the Friend Challenge modal.
- [ ] Premium users can create Friend Challenges beyond the Free limit.
- [ ] Friend Challenge accept, complete, and result flows still work after limit checks.
- [ ] Friend Challenge difficulty selection still works for Easy, Medium, Hard, Expert, and Master.
- [ ] Any future Premium gating plan for history, stats, avatar cosmetics, and supporter perks is documented for post-launch review rather than hard-blocking launch players.
- [ ] Friend Challenge limits and ad-free behaviour can still be retested later if monetisation rules change after launch learning.
- [ ] Solo screen does not show an overflowing or cramped Premium promo card at the bottom.
- [ ] Premium promo copy does not imply paid gameplay advantages or paywalled Classic difficulties.
- [ ] Premium screen does not show broken subscribe buttons, fake prices, or dead-end purchase UI during beta.
- [ ] Premium architecture remains easy to re-enable later without affecting current free-beta players.

## M. Results / History / Stats

- [ ] Solved result appears correctly.
- [ ] Failed result appears correctly.
- [ ] Empty results/history states explain how to generate the first entries and offer a useful action.
- [ ] Best times use solved-only results.
- [ ] Streaks use solved-only Daily completions.
- [ ] Result detail opens.
- [ ] Recent results do not duplicate.
- [ ] Ranked Duel rows show RP change when available.
- [ ] Ranked leaderboards only include valid server-eligible ranked results.
- [ ] Daily Duel rows show duel outcome from `daily_duels`, not `game_results.won`.
- [ ] Friend Challenge history/H2H shows correct outcomes.

## N. Puzzle Bank

- [ ] Classic uses active technique-calibrated puzzles.
- [ ] Daily Sudoku puzzle loading works.
- [ ] Daily Duel puzzle loading works.
- [ ] Friend Challenge puzzle loading works.
- [ ] Ranked Duel puzzle loading works.
- [ ] Existing old sessions/results still load inactive referenced puzzles.
- [ ] No invalid puzzle errors.
- [ ] No duplicate active givens.
- [ ] Expert result saving works.
- [ ] Master result saving works.
- [ ] Difficulty labels make sense during manual play.

## O. Visual / Layout QA

- [ ] Empty-state cards, helper text, and action buttons fit small iPhones without clipping.
- [ ] No status bar overlap at rest.
- [ ] Bottom nav labels fit: Home, Solo, Duel, Ranks, Profile.
- [ ] Cards do not clip.
- [ ] Buttons do not clip.
- [ ] Modals fit smaller iPhones.
- [ ] Keyboard does not block key forms.
- [ ] Dark cards/buttons are readable.
- [ ] Premium/settings/legal screens are not obvious placeholders except where intentionally coming soon.
- [ ] Settings has no hardcoded or decorative footer copy such as build markers or "Made with care".
- [ ] App version display is dynamic or hidden from normal users.
- [ ] Terms of Use has no version, build, or developer subheader text.
- [ ] Privacy Policy has no version, build, or developer subheader text.
- [ ] Contact Support, Help & FAQ, Privacy Policy, and Terms of Use read as user-facing screens rather than placeholder copy.
- [ ] Daily Sudoku card CTA stays inside the card.
- [ ] Ranked Duel card text does not wrap awkwardly.
- [ ] Home buttons/cards have consistent readable depth.

## P. Error / Loading States

- [ ] Loading states appear clean.
- [ ] Offline/slow network does not crash where possible.
- [ ] Supabase errors show safe messages.
- [ ] Empty states are readable.
- [ ] Empty states for Friends, Notifications, Leaderboards, Versus, and Results all explain what to do next.
- [ ] No raw database errors are shown to users.
- [ ] Autosave failures do not kick the user out of a valid game.
- [ ] Forced navigation logs are available if the game exits unexpectedly.

## Q. Security / Privacy Sanity

- [ ] RLS is enabled on user-owned tables.
- [ ] Feedback table does not expose other users' feedback to the client.
- [ ] `user_entitlements` cannot be client-inserted to grant Premium.
- [ ] Profiles expose only intended public fields where applicable.
- [ ] No service role key exists in app code.
- [ ] No secrets are committed.
- [ ] Supabase anon key is the only client key present.
- [ ] Internal QA/debug routes are not accessible in release builds.
- [ ] Long-press or hidden diagnostics do not open from Premium or legal screens in release builds.
- [ ] Terms screen has no placeholder copy.
- [ ] Privacy screen has no placeholder copy.
- [ ] Support/contact route works.
- [ ] Support email is centralised and currently points to `sudoduel@gmail.com`.
- [ ] App privacy disclosures match actual data collection.
- [ ] Account deletion/request route is explained.
- [ ] Account deletion is handled as a verified request flow unless a full self-service delete has been explicitly implemented and tested.
- [ ] Premium copy does not imply active payments.
- [ ] Premium copy does not imply Expert/Master are paywalled.
- [ ] Ad copy says ads are planned/coming soon if no real ad SDK is active.
- [ ] App privacy disclosures must be updated before enabling a real ad SDK or tracking.
- [ ] TestFlight review notes mention Premium/payments only once the purchase flow exists.
- [ ] Demo/test account details are prepared before external TestFlight review.

## R. Release Blockers

| Blocker | Severity | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## Recommended 30-Minute Smoke Test

1. Launch/sign in.
2. Home.
3. Solo Medium completion.
4. Continue Puzzle.
5. Daily Sudoku completion or duplicate attempt handling if already completed.
6. Daily Duel.
7. Ranked queue/cancel.
8. Ranked full match if two accounts are available.
9. Profile/stats/results.
10. Avatar save.
11. Feedback submission.
12. Premium screen.
13. Logout/login.

## Supabase QA SQL Appendix

Replace `:user_id` with the QA user id. Levi test user example:
`6c90ea5a-ac2b-4660-accd-b03c2a35ebf0`.

### Current Profile Row

```sql
select id, display_name, username_handle, initials, avatar_color, avatar_symbol,
       avatar_style_version, avatar_skin_tone, avatar_hair_style, avatar_top_style,
       profile_setup_completed, updated_at
from public.profiles
where id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0';
```

### Latest Feedback Rows

```sql
select id, user_id, category, status, left(message, 120) as message_preview, created_at
from public.feedback
order by created_at desc
limit 20;
```

### Current User Entitlements

```sql
select id, user_id, entitlement_type, status, source, starts_at, expires_at, created_at, updated_at
from public.user_entitlements
where user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by created_at desc;
```

### RLS Enabled For User Entitlements

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'user_entitlements';
```

### User Entitlement Grants

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_entitlements'
order by grantee, privilege_type;
```

### Notification Preferences

```sql
select user_id, push_enabled, friend_requests, friend_challenges, challenge_results,
       daily_duel_matches, ranked_duel_matches, reminders, marketing, updated_at
from public.notification_preferences
where user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0';
```

### Active Push Tokens For Current User

```sql
select token_id, user_id, left(expo_push_token, 24) as token_preview,
       platform, app_version, is_active, last_seen_at, created_at
from public.push_tokens
where user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by last_seen_at desc;
```

### Latest In-App Notifications

```sql
select notification_id, user_id, type, title, related_entity_type,
       related_entity_id, read_at, created_at
from public.app_notifications
where user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by created_at desc
limit 30;
```

### Push Delivery Log

```sql
select pnd.delivery_id, pnd.notification_id, pnd.token_id, pnd.user_id,
       pnd.status, pnd.provider_message_id, left(pnd.error_message, 160) as error_preview,
       pnd.attempted_at, pnd.created_at
from public.push_notification_deliveries pnd
where pnd.user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by pnd.attempted_at desc
limit 50;
```

### Push Delivery Counts By Status

```sql
select status, count(*) as delivery_count, max(attempted_at) as latest_attempt
from public.push_notification_deliveries
group by status
order by status;
```

### Pending Push Deliveries Ready To Send

```sql
select pnd.delivery_id, pnd.notification_id, pnd.user_id, pnd.token_id,
       pnd.status, pnd.created_at, pnd.attempted_at,
       an.type, an.title,
       left(pt.expo_push_token, 24) as token_preview
from public.push_notification_deliveries pnd
join public.app_notifications an
  on an.notification_id = pnd.notification_id
join public.push_tokens pt
  on pt.token_id = pnd.token_id
where pnd.status = 'pending'
order by pnd.created_at desc
limit 50;
```

### Pending Push Delivery Reservation Check

Run only from a trusted SQL/admin context. This reserves already-queued `pending`
rows for delivery, so do not run it repeatedly during normal QA unless you intend
to invoke the Edge Function straight afterwards.

```sql
select *
from public.reserve_pending_push_notification_deliveries(20);
```

### Notification Counts By Type

```sql
select type, count(*) as notification_count, max(created_at) as latest_created_at
from public.app_notifications
group by type
order by type;
```

### Latest Friend Challenges Joined To Notifications

```sql
select fc.challenge_id, fc.status, fc.challenger_id, fc.challenged_id,
       fc.created_at, fc.accepted_at, fc.completed_at,
       an.notification_id, an.user_id as notified_user_id,
       an.type as notification_type, an.created_at as notification_created_at
from public.friend_challenges fc
left join public.app_notifications an
  on an.related_entity_type = 'friend_challenge'
 and an.related_entity_id = fc.challenge_id::text
where fc.challenger_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
   or fc.challenged_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by fc.created_at desc, an.created_at desc
limit 50;
```

### Latest Friend Requests Joined To Notifications

```sql
select fr.request_id, fr.status, fr.sender_id, fr.receiver_id,
       fr.created_at, fr.updated_at,
       an.notification_id, an.user_id as notified_user_id,
       an.type as notification_type, an.created_at as notification_created_at
from public.friend_requests fr
left join public.app_notifications an
  on an.related_entity_type = 'friend_request'
 and an.related_entity_id = fr.request_id::text
where fr.sender_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
   or fr.receiver_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by fr.created_at desc, an.created_at desc
limit 50;
```

### Push Token Rows By User And Platform

```sql
select user_id, platform, is_active, count(*) as token_count,
       max(last_seen_at) as latest_seen_at
from public.push_tokens
group by user_id, platform, is_active
order by latest_seen_at desc nulls last;
```

### Notification Trigger Existence

```sql
select trigger_schema, trigger_name, event_manipulation, event_object_table, action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'notify_friend_request_events',
    'notify_friend_challenge_events',
    'notify_daily_duel_events',
    'notify_ranked_duel_events'
  )
order by event_object_table, trigger_name, event_manipulation;
```

### Repair Real Missed Notification Rows

Run only from the Supabase SQL editor if trigger setup was deployed after real friend/social events already happened:

```sql
select public.repair_notification_events(now() - interval '30 days');
```

### Repair Missing Push Delivery Rows

Run only from the Supabase SQL editor if `app_notifications` exist but `push_notification_deliveries`
are missing because the push fan-out trigger was deployed later:

```sql
select public.repair_push_notification_deliveries(now() - interval '30 days');
```

### Create A Safe Notification Self-Test

Creates one in-app notification for the current signed-in user and should
immediately fan it out into pending push delivery rows for that user's active
devices:

```sql
select public.create_notification_self_test();
```

### Create An Admin Notification Self-Test For A Specific User

Run from the Supabase SQL editor or another service-role context when `auth.uid()`
is not available:

```sql
select public.create_notification_admin_test_for_user(
  '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
);
```

### Notification RLS Enabled

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('notification_preferences', 'push_tokens', 'app_notifications')
order by tablename;
```

### Active Puzzle Bank Counts By Difficulty/Source

```sql
select source, difficulty, count(*) as active_count
from public.puzzles
where is_active = true
group by source, difficulty
order by source, difficulty;
```

### Invalid Active Puzzle Sanity

```sql
select puzzle_id, source, difficulty, length(givens) as givens_len, length(solution) as solution_len
from public.puzzles
where is_active = true
  and (
    difficulty not in ('Easy', 'Medium', 'Hard', 'Expert', 'Master')
    or length(givens) <> 81
    or length(solution) <> 81
  );
```

### Duplicate Active Givens

```sql
select givens, count(*) as duplicates, array_agg(puzzle_id order by puzzle_id) as puzzle_ids
from public.puzzles
where is_active = true
group by givens
having count(*) > 1;
```

### Recent Game Results For Current User

```sql
select result_id, session_id, puzzle_id, mode, difficulty, completed, won,
       final_score, elapsed_seconds, rp_change, completed_at
from public.game_results
where user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by completed_at desc
limit 30;
```

### Possible Duplicate Results For Current User

```sql
select user_id, mode, difficulty, puzzle_id, elapsed_seconds, final_score,
       completed_at, count(*) as duplicate_count,
       array_agg(result_id order by result_id) as result_ids
from public.game_results
where user_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
  and completed = true
group by user_id, mode, difficulty, puzzle_id, elapsed_seconds, final_score, completed_at
having count(*) > 1
order by completed_at desc;
```

### Recent Ranked Duels Involving Current User

```sql
select ranked_duel_id, status, winner_user_id, player_a_id, player_b_id,
       player_a_result_id, player_b_result_id, player_a_rp_change,
       player_b_rp_change, created_at, completed_at
from public.ranked_duels
where player_a_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
   or player_b_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by created_at desc
limit 20;
```

### Recent Daily Duels Involving Current User

```sql
select duel_id, duel_date, status, winner_user_id, player_a_id, player_b_id,
       player_a_result_id, player_b_result_id, completed_at
from public.daily_duels
where player_a_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
   or player_b_id = '6c90ea5a-ac2b-4660-accd-b03c2a35ebf0'
order by created_at desc
limit 20;
```

## Final Release Readiness Checklist

- [ ] `npm.cmd run qa:preflight` passes.
- [ ] `npm.cmd run validate:puzzles` passes.
- [ ] `npm.cmd run validate:unique-puzzles` passes.
- [ ] `npm.cmd run validate:givens` passes.
- [ ] `npm.cmd run validate:scoring` passes.
- [ ] TypeScript/lint checks pass if available.
- [ ] No critical console errors during smoke test.
- [ ] Privacy Policy is no longer placeholder copy.
- [ ] Terms of Use is no longer placeholder copy.
- [ ] Support/contact route works.
- [ ] App privacy disclosures match actual data collection.
- [ ] Account deletion/request route is explained in-app.
- [ ] Premium copy does not imply active payments.
- [ ] Owner-managed EAS build doc is up to date for the current app identity.
- [ ] iOS bundle identifier is `com.sudoduel.app`.
- [ ] Android package is `com.sudoduel.app`.
- [ ] App scheme is `sudoduel`.
- [ ] `EXPO_PUBLIC_EAS_PROJECT_ID` is documented as the preferred push/EAS UUID source.
- [ ] No client config or checked-in docs tell testers to use a Supabase service role key.
- [ ] Crash reporting doc is up to date for the current runtime error foundation.
- [ ] Automatic runtime error reports reach `public.feedback` without including puzzle boards, passwords, auth tokens, or full push tokens.
- [ ] TestFlight review notes mention Premium/payments only once the purchase flow exists.
- [ ] Demo/test account details are prepared before external TestFlight review.
- [ ] TestFlight build number/version is set.
- [ ] App icon is acceptable.
- [ ] Splash screen is acceptable.
- [ ] App Store screenshots are planned or ready.
- [ ] Known blockers are documented in the blocker table.
