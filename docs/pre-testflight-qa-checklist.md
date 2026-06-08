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
- [ ] Expert opens or shows clean Premium-coming-soon behavior.
- [ ] Master opens or shows clean Premium-coming-soon behavior.
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
- [ ] Premium opens.
- [ ] Terms & Conditions opens.
- [ ] Privacy Policy opens.
- [ ] Logout works.

## L. Premium Foundation

- [ ] Premium screen shows Current plan: Free.
- [ ] Premium coming soon is clear.
- [ ] Fairness note is visible.
- [ ] Subscriptions/payment copy says payments are not implemented.
- [ ] Expert/Master badges are understandable.
- [ ] Expert/Master remain testable or show clean non-blocking coming-soon behavior.
- [ ] Daily Sudoku is not paywalled.
- [ ] Daily Duel is not paywalled.
- [ ] Ranked Duel is not paywalled.
- [ ] Friend Challenge is not paywalled.
- [ ] Leaderboards are not paywalled.
- [ ] `user_entitlements` RLS is enabled.
- [ ] Current user has no entitlement row unless manually granted for testing.

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
- [ ] Support/legal placeholder copy is clearly marked where not final.

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
- [ ] TestFlight build number/version is set.
- [ ] App icon is acceptable.
- [ ] Splash screen is acceptable.
- [ ] App Store screenshots are planned or ready.
- [ ] Known blockers are documented in the blocker table.
