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
- [ ] Returning user stays signed in.
- [ ] Logout works.
- [ ] Login works after logout.
- [ ] Create account works.
- [ ] Username/profile setup works for a new user.
- [ ] Returning user lands in the right state.
- [ ] Incomplete profile user is routed to setup.
- [ ] Completed profile user does not briefly see setup.

## B. Home

- [ ] Home loads.
- [ ] Streak card displays correctly.
- [ ] Daily Sudoku card opens today's puzzle.
- [ ] Daily Duel card opens the correct flow.
- [ ] Continue Puzzle appears only with a valid saved puzzle.
- [ ] Continue Puzzle does not appear when there is no resumable session.
- [ ] Premium card opens the Premium screen.
- [ ] No clipped text, clipped icons, or clipped buttons.
- [ ] Bottom nav works.
- [ ] Bottom nav labels fit: Home, Solo, Duel, Ranks, Profile.

## C. Solo / Classic

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
- [ ] Continue Puzzle works after leaving mid-puzzle.
- [ ] Completed puzzle clears continue state.

## D. Daily Sudoku

- [ ] Daily puzzle opens.
- [ ] Same daily date displays correctly.
- [ ] Puzzle is playable.
- [ ] Completion saves result.
- [ ] Failed attempt saves final result and blocks retry.
- [ ] Daily stats/streak update correctly.
- [ ] Failed Daily attempt does not extend solved streak.
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

- [ ] Friend list loads in challenge mode.
- [ ] Challenge creation works.
- [ ] Duplicate active challenge is blocked only for same friend plus same difficulty.
- [ ] Different-difficulty active challenges against the same friend are allowed.
- [ ] Challenge invite/share flow works if present.
- [ ] Recipient/open challenge flow works if testable.
- [ ] Challenge completion works.
- [ ] Failed attempt is final.
- [ ] Result links to both players correctly.
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
- [ ] RP changes once only.
- [ ] Ranked profile updates after finalisation.
- [ ] Ranked leaderboard updates after finalisation.
- [ ] Profile Competitive Rank updates after finalisation.
- [ ] Repeat queue works after completed/cancelled/expired matches.
- [ ] Completed/cancelled/expired matches do not block a new queue.
- [ ] No Premium blocking.

## H. Ranks / Leaderboards

- [ ] Daily leaderboard loads.
- [ ] Weekly leaderboard loads.
- [ ] Friends leaderboard loads.
- [ ] Ranked leaderboard loads.
- [ ] Current user appears correctly where eligible.
- [ ] Current user highlighting is correct.
- [ ] RP/rank display matches Profile and Versus.
- [ ] Empty/loading states are clean.
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
- [ ] Legacy initials fallback still works.
- [ ] Chip rows do not clip at screen edges.

## K. Settings

- [ ] Account section opens.
- [ ] Profile settings open.
- [ ] Avatar settings open.
- [ ] Notification toggles do not error.
- [ ] Privacy toggles do not error.
- [ ] App settings/toggles persist as expected.
- [ ] Feedback opens.
- [ ] Report a problem opens.
- [ ] Submitting feedback creates a Supabase row.
- [ ] Help & FAQ opens.
- [ ] Support opens.
- [ ] Premium opens.
- [ ] Terms & Conditions opens.
- [ ] Privacy Policy opens.
- [ ] Logout works.

## K2. Notifications

- [ ] Notifications opens from Settings.
- [ ] Notification permission prompt appears only after tapping the enable action.
- [ ] Denying push notifications does not break the app.
- [ ] The denied-permission message explains that SudoDuel still works normally.
- [ ] Push token registers after permission is granted.
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
- [ ] Disabled preferences suppress matching in-app notification types.
- [ ] No duplicate spam notifications appear for the same event.
- [ ] In-app notification read state works.
- [ ] Notification deep links open the relevant Friends/Duel screen where safe.
- [ ] App still works without push permission.
- [ ] Secure server-side push delivery is configured before relying on external push notifications; client code must not send push notifications to other users.

## L. Premium Foundation

- [ ] Premium screen shows Current plan: Free.
- [ ] Premium purchase flow is clearly marked as not implemented yet.
- [ ] Fairness note is visible.
- [ ] Subscriptions/payment copy says payments are not implemented.
- [ ] All Classic difficulties, including Expert and Master, are free.
- [ ] Premium benefits focus on ad-free experience, stats, history, duel tools, and cosmetics.
- [ ] Premium does not affect RP, leaderboard scores, matchmaking, or duel outcomes.
- [ ] Premium does not imply Expert/Master are paywalled.
- [ ] Daily Sudoku is not paywalled.
- [ ] Daily Duel is not paywalled.
- [ ] Ranked Duel is not paywalled.
- [ ] Friend Challenge is not paywalled.
- [ ] Leaderboards are not paywalled.
- [ ] No real ad SDK is integrated.
- [ ] No tracking or App Tracking Transparency prompt is present.
- [ ] Ad policy allows future ads only at natural result-screen breaks.
- [ ] Future ads are disallowed during active puzzles, before result save, matchmaking, leaderboards, profile, settings, and Premium screen.
- [ ] Premium plan is treated as ad-free by policy.
- [ ] `user_entitlements` RLS is enabled.
- [ ] Current user has no active Premium entitlement unless intentionally configured for QA.
- [ ] Friend Challenge creation limits are documented as Free: 3 per day and Premium: higher/unlimited.
- [ ] Free result history limit is documented as latest 20 results.
- [ ] Friend Challenge limits, stats limits, history limits, and ad-free behaviour must be retested once payments are integrated.
- [ ] RevenueCat public iOS API key is configured for purchase-enabled builds.
- [ ] RevenueCat entitlement `premium` exists.
- [ ] RevenueCat offering `default` exists.
- [ ] App Store Connect products `sudoduel_premium_monthly` and `sudoduel_premium_yearly` exist.
- [ ] Premium screen loads monthly/yearly offerings and prices from the store in sandbox/TestFlight.
- [ ] Subscribe flow works in sandbox/TestFlight.
- [ ] Restore purchases refreshes Premium status.
- [ ] Logout/login preserves active Premium entitlement.
- [ ] Purchase-unavailable preview state is graceful and does not show fake prices.

## M. Results / History / Stats

- [ ] Solved result appears correctly.
- [ ] Failed result appears correctly.
- [ ] Best times use solved-only results.
- [ ] Streaks use solved-only Daily completions.
- [ ] Result detail opens.
- [ ] Recent results do not duplicate.
- [ ] Ranked Duel rows show RP change when available.
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

- [ ] No status bar overlap at rest.
- [ ] Bottom nav labels fit: Home, Solo, Duel, Ranks, Profile.
- [ ] Cards do not clip.
- [ ] Buttons do not clip.
- [ ] Modals fit smaller iPhones.
- [ ] Keyboard does not block key forms.
- [ ] Dark cards/buttons are readable.
- [ ] Premium/settings/legal screens are not obvious placeholders except where intentionally coming soon.
- [ ] Daily Sudoku card CTA stays inside the card.
- [ ] Ranked Duel card text does not wrap awkwardly.
- [ ] Home buttons/cards have consistent readable depth.

## P. Error / Loading States

- [ ] Loading states appear clean.
- [ ] Offline/slow network does not crash where possible.
- [ ] Supabase errors show safe messages.
- [ ] Empty states are readable.
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
- [ ] Terms screen has no placeholder copy.
- [ ] Privacy screen has no placeholder copy.
- [ ] Support/contact route works.
- [ ] App privacy disclosures match actual data collection.
- [ ] Account deletion/request route is explained.
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
- [ ] Terms & Conditions are no longer placeholder copy.
- [ ] Support/contact route works.
- [ ] App privacy disclosures match actual data collection.
- [ ] Account deletion/request route is explained in-app.
- [ ] Premium copy does not imply active payments.
- [ ] TestFlight review notes mention Premium/payments only once the purchase flow exists.
- [ ] Demo/test account details are prepared before external TestFlight review.
- [ ] TestFlight build number/version is set.
- [ ] App icon is acceptable.
- [ ] Splash screen is acceptable.
- [ ] App Store screenshots are planned or ready.
- [ ] Known blockers are documented in the blocker table.
