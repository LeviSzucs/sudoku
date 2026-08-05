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

## Production SQL Readiness

- [ ] Production Supabase includes the ranked result core dependencies listed in [ranked-result-sql-readiness.md](C:/Users/LeviS/Documents/Codex/2026-05-30/github-plugin-github-openai-curated-can/sudoku-onboarding-empty-state/docs/ranked-result-sql-readiness.md) before testing Ranked Duel saves.
- [ ] Production Supabase includes the ranked season rollover foundation in [ranked-season-foundation.md](ranked-season-foundation.md) before testing a real season rollover or recap eligibility.
- [ ] Production Supabase includes the block/report read-path hardening in [user-safety-enforcement.md](user-safety-enforcement.md) before validating blocked profile and challenge visibility.

## Puzzle Inventory Tooling

- [ ] Canonical puzzle inventory audit passes without writes (`npm.cmd run puzzles:audit`).
- [ ] Puzzle inventory tooling fixtures pass (`npm.cmd run puzzles:test-tooling`).
- [ ] A proposed JSON batch passes the read-only batch validator before SQL is prepared.
- [ ] Batch validation rejects malformed boards, conflicting givens, invalid solutions/difficulties, and duplicate IDs/givens.
- [ ] Unique-solution checks distinguish zero, one, and multiple solutions and stop after two.
- [ ] Inventory includes Easy, Medium, Hard, Expert, and Master.
- [ ] Audit and batch validation do not require or print production credentials.
- [ ] Puzzle tooling does not alter live selection, gameplay, scoring, XP, RP, or result writing.

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
- [ ] Apple sign-in uses the native iOS Apple sheet and does not show an ugly web service identifier to the user.
- [ ] Google OAuth consent branding shows SudoDuel app naming, support, and public site details from the Google console setup.
- [ ] If Supabase custom auth domain is enabled, Google OAuth browser flow shows `auth.sudoduel.app` instead of the raw Supabase project host.
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
- [ ] Username setup says the avatar can be updated later without awkward sign-up copy.
- [ ] New social user reaches username setup when their profile is incomplete.
- [ ] Existing social user returns to Home without briefly seeing the wrong auth/setup state.
- [ ] Returning user lands in the right state.
- [ ] Incomplete profile user is routed to setup.
- [ ] Completed profile user does not briefly see setup.
- [ ] Session restore works after closing and reopening the app.
- [ ] Account deletion still works after Apple sign-in.
- [ ] Account deletion still works after Google sign-in.
- [ ] Failed account deletion shows friendly support-oriented copy rather than a raw Edge Function status message.
- [ ] Re-trying a deleted Apple/Google/email account never shows raw `User is banned` text.
- [ ] If a deleted identity cannot yet be re-used automatically, the auth screen shows a clear support-guided message instead.

## B. Home

- [ ] Home loads.
- [ ] Daily Duel vignette plays one clean 6.6-second sequence on the first Home focus.
- [ ] Rapid tab switching does not restart the Daily Duel vignette; its final frame holds.
- [ ] Leaving Home during playback cancels safely, with no animation surviving blur or unmount.
- [ ] Reduced-motion devices show the complete static vignette immediately.
- [ ] Tapping the vignette area still opens Daily Duel; the decorative preview does not intercept touches.
- [ ] Daily Duel vignette fits narrow, standard, and large iPhones without making the card disproportionate.
- [ ] Daily Duel vignette remains capped and balanced on iPad portrait and landscape.
- [ ] Home navigation does not reach the global runtime error boundary after repeated visits.
- [ ] Profile avatar animation is unchanged, and no unrelated Home card animates.
- [ ] Daily Sudoku flows directly into Daily Duel with balanced spacing on narrow/large iPhone and iPad portrait/landscape.
- [ ] Home does not mount Past Dailies or Your Week and issues no removed Daily-history protected query.
- [ ] Daily Sudoku remains playable for guest and signed-in users with assignment, attempt, and result behaviour unchanged.
- [ ] Daily Duel vignette timing, replay contract, layout, card navigation, and gameplay remain unchanged.
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
- [ ] Standard board size matches the current layout.
- [ ] Large board size increases the board noticeably without hiding controls.
- [ ] XL board size increases the board again while keeping the puzzle playable.
- [ ] Sudoku board size persists after app restart.
- [ ] Small-screen iPhone layout remains usable with XL selected.
- [ ] Large-screen iPhone layout remains clean with XL selected.
- [ ] Solo puzzle never stays indefinitely on `Loading puzzle…`.
- [ ] If Solo puzzle load fails or times out, a recoverable error screen appears with a Back to Play action.
- [ ] Timer does not advance while the Solo puzzle is still on the loading screen.
- [ ] Autosave/session progress does not mutate while the Solo puzzle is still on the loading screen.
- [ ] Number pad works.
- [ ] Number pad tap targets feel reliable on a small phone.
- [ ] Notes/candidates work if present.
- [ ] Placing a real number clears notes in the cell.
- [ ] Placing a real number clears related peer notes.
- [ ] Mistakes/checking behavior works.
- [ ] Timer works.
- [ ] Pause/resume works if present.
- [ ] Completion saves an official result.
- [ ] Share Result from a completed Classic/Solo puzzle opens a branded card image on native devices or safely falls back to text.
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
- [ ] Daily puzzle never stays indefinitely on `Loading puzzle…`.
- [ ] If Daily puzzle load fails or times out, a recoverable error screen appears with a Back to Play action.
- [ ] Same daily date displays correctly.
- [ ] Puzzle is playable.
- [ ] Daily puzzle remains playable at Standard, Large, and XL board sizes.
- [ ] Completion saves result.
- [ ] Share Result from a completed Daily puzzle opens a Daily share card image or safely falls back to text.
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
- [ ] Friend Challenge sender puzzle never stays indefinitely on `Loading puzzle…`.
- [ ] Friend Challenge recipient can accept and open the challenge puzzle without getting stuck on `Loading puzzle…`.
- [ ] If a Friend Challenge puzzle load fails or times out, a recoverable error screen appears with a Back to Versus action.
- [ ] Friend Challenge remains playable at Standard, Large, and XL board sizes.
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

- [ ] The current active ranked season uses the correct sequential name, e.g. `Season 2`, not a reset `Season 1`.
- [ ] If `latest_unseen_ranked_season_recap()` returns a row, the app opens normally without automatically showing the completed-season recap.
- [ ] Own Profile / Competitive Rank shows a clear CTA such as `View your Season 1 recap` when an unseen recap exists.
- [ ] Users with no completed-season ranked matches do not see a recap CTA.
- [ ] Tapping the recap CTA opens the completed-season recap and Continue shows the active-season intro.
- [ ] Pressing Continue or intentionally closing the recap marks it viewed, and the CTA disappears afterward.
- [ ] After the recap is acknowledged, reopening the app does not show the same recap again.
- [ ] The ranked season banner shows the active season number/name and remaining time without any hardcoded `Season 1`.
- [ ] Competitive Rank detail shows only current-season ranked results, never prior-season results mixed into the current season view.
- [ ] If there are no current-season ranked results yet, Competitive Rank shows a clean empty state instead of falling back to Season 1 history.
- [ ] A completed prior-season recap still shows that completed season's own archived data correctly.
- [ ] Manual verification queries confirm `ranked_seasons.season_number` is sequential and unique.
- [ ] Manual verification queries confirm there is only one active ranked season.
- [ ] Manual verification queries confirm completed seasons create one `ranked_season_results` snapshot row per eligible user without duplicates.
- [ ] Manual verification queries confirm the latest unseen recap RPC returns only the authenticated user's own season snapshot.
- [ ] Signed-out or guest navigation does not crash when ranked season recap RPCs return no rows.
- [ ] Viewing another player's profile does not show the current user's private recap CTA.
- [ ] Sharing a ranked season recap opens a branded season card image or safely falls back to text.
- [ ] Find match works.
- [ ] Ranked Duel opens a fresh puzzle without staying indefinitely on `Loading puzzle…`.
- [ ] Ranked Duel remains playable at Standard, Large, and XL board sizes.
- [ ] If a Ranked Duel puzzle/session cannot be restored, the app clears it safely and shows a recoverable Back to Versus path.
- [ ] Searching state appears.
- [ ] Cancel search works while waiting.
- [ ] Cancelled search does not change RP.
- [ ] Cancelled search does not block a new queue.
- [ ] Matched duel starts.
- [ ] Both players receive the same puzzle.
- [ ] Ranked Duel never grades a valid-looking entry against a mismatched fallback puzzle or stale session solution.
- [ ] If a ranked session cannot load its exact server puzzle, the app fails safely instead of silently substituting a different Hard puzzle.
- [ ] Both player completion states work.
- [ ] Timeout/failure state works if testable.
- [ ] Result finalises once.
- [ ] Losing a Ranked Duel by running out of mistakes saves a final loss or safe failed state without leaving a replayable dead match.
- [ ] Returning to Versus after a ranked out-of-mistakes loss does not show a stuck matched duel that can be reopened.
- [ ] If a corrupt or unrestorable ranked match is cleared, the user sees a clear “match was cleared” message and can start a new Ranked Duel immediately.
- [ ] After clearing a corrupt ranked duel, tapping Find match does not rematch into the same stale duel/session again.
- [ ] RP changes once only.
- [ ] Ranked profile updates after finalisation.
- [ ] Ranked leaderboard updates after finalisation.
- [ ] Share Result from a completed Ranked Duel opens a ranked result card image with outcome and RP details, or safely falls back to text.
- [ ] Profile Competitive Rank updates after finalisation.
- [ ] Normal ranked game completes and awards RP.
- [ ] Ranked completion uses server-derived elapsed time instead of trusting the client timer alone.
- [ ] For Ranked and Duel modes, an implausibly small client elapsed value is clamped to the authoritative server/session duration or rejected.
- [ ] Re-submitting the same ranked session is rejected or safely reused without double-awarding RP.
- [ ] Submitting a wrong final board is rejected.
- [ ] Implausibly low ranked elapsed time is rejected or replaced by the server-derived duration.
- [ ] Client-provided ranked score values cannot override the server-calculated score.
- [ ] Ranked RP gain within the same tier/division does not show a promotion celebration.
- [ ] A genuine ranked promotion shows a one-time promotion celebration with the correct new rank label.
- [ ] Reopening the same ranked result does not replay the same promotion endlessly.
- [ ] Repeat queue works after completed/cancelled/expired matches.
- [ ] Completed/cancelled/expired matches do not block a new queue.
- [ ] A stale or corrupt ranked session does not remain playable from Versus after the app refreshes the active match.
- [ ] Ranked and Daily Duel cards show the opponent's real rank when it exists, and only show Unranked when no rank data exists.
- [ ] No Premium blocking.

## H. Ranks / Leaderboards

- [ ] Daily leaderboard loads.
- [ ] Weekly leaderboard loads.
- [ ] Friends leaderboard loads.
- [ ] Ranked leaderboard loads.
- [ ] Existing signed-in user is hidden from global Daily / Weekly / Ranked leaderboards by default.
- [ ] New signed-in user is hidden from global Daily / Weekly / Ranked leaderboards by default.
- [ ] Turning on `Show me on global leaderboards` adds the user to eligible global leaderboards after refresh.
- [ ] Turning off `Show me on global leaderboards` removes the user from global leaderboards again.
- [ ] Hidden users can still view their own private ranked/profile stats normally.
- [ ] Tapping a podium avatar/name opens that player's public profile.
- [ ] Tapping a leaderboard row avatar/name opens that player's public profile.
- [ ] Public player profile win rate matches authoritative completed duel records and does not fall back to stale 0% values for players with real wins.
- [ ] Current user appears correctly where eligible.
- [ ] Current user highlighting is correct.
- [ ] RP/rank display matches Profile and Versus.
- [ ] Empty/loading states are clean.
- [ ] Empty leaderboard states include a useful next action and global opt-in guidance when few or no users have joined publicly.
- [ ] Avatars render correctly.
- [ ] No fake rows appear for signed-in users.

## I. Profile

- [ ] Display name renders.
- [ ] Username handle renders.
- [ ] Avatar renders.
- [ ] Signed-in Profile avatar has a subtle idle float while the Profile screen is focused.
- [ ] Profile avatar background circle and frame rem…5721 tokens truncated…pabase QA SQL Appendix

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

### Latest Support Message Rows

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

### Duplicate Active Expo Push Tokens Across Users

```sql
select left(expo_push_token, 24) as token_preview,
       count(*) as active_rows,
       array_agg(user_id order by last_seen_at desc nulls last) as user_ids,
       max(last_seen_at) as latest_seen_at
from public.push_tokens
where is_active = true
group by expo_push_token
having count(*) > 1
order by latest_seen_at desc nulls last;
```

### Users With Multiple Active Push Tokens

```sql
select user_id,
       count(*) as active_token_count,
       max(last_seen_at) as latest_seen_at
from public.push_tokens
where is_active = true
group by user_id
having count(*) > 1
order by latest_seen_at desc nulls last;
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

### Latest Notifications Joined To Delivery Status

```sql
select an.notification_id,
       an.user_id,
       an.type,
       an.title,
       an.created_at,
       pnd.status,
       left(coalesce(pnd.error_message, ''), 200) as error_preview,
       pnd.attempted_at,
       left(pt.expo_push_token, 24) as token_preview
from public.app_notifications an
left join public.push_notification_deliveries pnd
  on pnd.notification_id = an.notification_id
left join public.push_tokens pt
  on pt.token_id = pnd.token_id
order by an.created_at desc, pnd.attempted_at desc nulls last
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

### One-Off Cleanup For Duplicate Active Tokens Across Users

Run only from the Supabase SQL editor after reviewing the duplicate query above.
This keeps the newest active row for each exact Expo token string and deactivates
older duplicates, which is useful when stale Rork/EAS tokens are still active:

```sql
with ranked_tokens as (
  select token_id,
         expo_push_token,
         row_number() over (
           partition by expo_push_token
           order by last_seen_at desc nulls last, created_at desc, token_id desc
         ) as row_rank,
         count(*) over (partition by expo_push_token) as token_count
  from public.push_tokens
  where is_active = true
)
update public.push_tokens pt
set is_active = false,
    last_seen_at = now()
from ranked_tokens rt
where pt.token_id = rt.token_id
  and rt.token_count > 1
  and rt.row_rank > 1;
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
# Avatar rendering foundation

- [ ] Existing signed-in users retain their current avatar colours, initials, hair, top, accessory, and frame.
- [ ] Guest, loading-profile, unknown remote, and removed/invalid avatar values render the stable default rather than blank space.
- [ ] Home avatar renders at its existing size and remains static.
- [ ] Own Profile avatar animates only while Profile is focused; leaving and returning does not build duplicate loops.
- [ ] Versus and matchmaking avatars use the shared context policy and stop when the screen loses focus.
- [ ] Public profile, leaderboard, friend-list, search-result, notification, and other dense-list avatars remain static.
- [ ] Result, promotion, or season placements that adopt avatars use the shared `result` context rather than local animation rules.
- [ ] Reduced Motion removes idle, thinking, celebration, and defeated movement while retaining the requested expression.
- [ ] No avatar animation continues after unmount and dense-list scrolling has no regression.
- [ ] Avatar sizing remains correct on iPhone and iPad.
- [ ] Identity avatars have one useful accessibility label; decorative previews and internal layers are not announced.

## Avatar customisation

- [ ] Tapping the own Profile avatar opens the editor; public profiles remain read-only.
- [ ] The latest saved avatar populates Appearance, Hair, Outfit, Accessories, Background, and Frame.
- [ ] The large preview updates immediately and remains neutral, static, and decorative.
- [ ] Option thumbnails remain static and do not affect avatar animation elsewhere.
- [ ] Cancel discards local changes; a dirty back/dismiss action asks before discarding.
- [ ] Save is disabled when unchanged and while saving; rapid taps issue only one save.
- [ ] A successful save updates Profile without restart; a failed save keeps the editor and draft open.
- [ ] Existing initials, legacy values, and current layer IDs remain intact unless explicitly changed.
- [ ] Unknown or retired remote values render a safe fallback and do not blank or destructively rewrite the avatar.
- [ ] Accessory None and Frame None can be selected and saved.
- [ ] Initials accept one to three letters/numbers and the keyboard does not cover Save or Cancel.
- [ ] Category tabs and options announce useful labels and selected state; colour options never announce raw hex values.
- [ ] The editor remains usable on narrow, standard, and large iPhone layouts.
- [ ] The editor is centred and capped with side-by-side preview/controls on iPad portrait and landscape.
- [ ] Guest avatar changes retain existing local behavior and signed-in saves use the profile update path.
- [ ] Profile idle motion and all result/Versus avatar behavior remain unchanged outside the static editor.

## Avatar rendering polish

- [ ] Editor live preview has one clean background/frame edge with no secondary halo.
- [ ] Completion modal avatar has no grey halo, double circle, or ghosted character layer.
- [ ] Own Profile and Versus avatars show one background and one selected frame only.
- [ ] Idle, thinking, celebrate, and defeated motion never reveal a stationary duplicate character beneath the moving layer.
- [ ] Static and animated avatars look identical when animation is at rest.
- [ ] None, Buzz, Short, Side part, Curly, Long, and Bun keep both pupils and the eye region readable.
- [ ] Curly, Long, and Side part hair retain a clean forehead/eye boundary.
- [ ] Glasses remain visible with every hairstyle, including Curly and None.
- [ ] Headband remains aligned with every hairstyle, including Short and None.
- [ ] Headphones remain aligned with every hairstyle, including Long and None.
- [ ] None accessory and None hair render without a residual shadow or missing head shape.
- [ ] Bronze, Silver, Gold, ranked crown, premium crown, and no-frame states render one crisp frame treatment.
- [ ] Light and dark avatar backgrounds retain a clean circular edge without a false outer shadow.
- [ ] Editor option thumbnails use the corrected static renderer and keep eyes readable.
- [ ] Reduced Motion remains static while preserving the selected result expression.
- [ ] Avatar editor Save and Cancel behavior remains unchanged after rendering corrections.
- [ ] Rendering remains crisp on narrow/large iPhones and iPad portrait/landscape.
- [ ] Short hair touches the forehead naturally without covering either pupil.
- [ ] Side-part hair follows the forehead contour and its sweep/highlight remains attached.
- [ ] Curly hair reads as integrated hair rather than a floating cap.
- [ ] Long hair front and back layers remain aligned and keep central facial features readable.
- [ ] Every persisted hairstyle keeps both pupils visible while retaining a natural forehead/head anchor.
- [ ] Gold and all other selected frames contain the complete body/outfit with no lower-edge protrusion.
- [ ] Bronze, Silver, Gold, premium crown, and ranked crown remain crisp and aligned after clipping.
- [ ] Idle, thinking, win, and loss motion never moves artwork outside the circular clip.
- [ ] Own Profile breathing is perceptible but restrained at 84 px and stops off-screen.
- [ ] Avatar editor preview and option thumbnails remain static after the Profile motion correction.
- [ ] Matchmaking/waiting remains focused + thinking rather than switching to breathing.
- [ ] Reduced Motion keeps Profile and competitive avatars static.
- [ ] Avatar editor Save, Cancel, and unsaved-change handling remain unchanged.

## Avatar motion and result reactions

- [ ] Own Profile breathing is subtle, stops when leaving the tab, resumes once on return, and never moves the frame/background.
- [ ] Daily and Ranked matchmaking/waiting use focused expression and restrained thinking motion.
- [ ] Finding an opponent resets both Versus avatars to neutral idle without overlapping loops.
- [ ] An authoritative win plays one happy celebration; an authoritative loss plays one gentle sad reaction; a draw remains neutral.
- [ ] Reopening an old result or rerendering it does not replay; a genuinely new result key can react.
- [ ] Pending, failed, unresolved, cancelled, and unknown result states do not celebrate.
- [ ] Reduced Motion preserves the happy, sad, focused, or neutral expression with no movement.
- [ ] Result actions remain immediately usable and score, XP, RP, continuation, and sharing are unchanged.
- [ ] Completion avatars do not cover result copy on narrow iPhone, large iPhone, iPad portrait, or iPad landscape.
- [ ] Home, public profiles, leaderboards, friend/search/notification rows, compact cards, and editor previews remain static.
- [ ] Leaving Versus/Profile or unmounting a result cancels active avatar animation.

