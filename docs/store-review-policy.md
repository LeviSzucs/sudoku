# Store review policy

SudoDuel uses Apple's native in-app review surface through Expo StoreReview. There is no custom star selector, satisfaction gate, negative-feedback diversion, or claim that a player submitted a rating.

## Eligibility

An automatic attempt is considered only after the shared completion modal has a freshly saved, authoritative result and has remained visibly settled for two seconds. The player must be signed in, have at least five completed puzzles, and meet one milestone:

- third successful Daily Sudoku completion;
- second authoritative Daily, Ranked, or Friend Challenge duel win;
- tenth total successful puzzle completion for Classic.

Losses, draws, guests, pending or failed saves, unresolved/cancelled matches, old result revisits, app launch, and non-result actions are excluded. A blocking alert or navigation transition also prevents the attempt.

## Cooldown and persistence

The versioned AsyncStorage record `@sudoduel/store-review/v1` contains only `schemaVersion`, `lastAttemptedAt`, `lastAttemptedVersion`, and up to 20 recent result keys used for attempt deduplication.

The app attempts at most once per marketing app version and never within 30 days of the previous attempt. The stable result key is claimed and persisted before `requestReview()` is invoked, preventing rerenders or simultaneous effects from duplicating an attempt. Missing, old-version, or malformed storage falls back safely.

The record means only that the native API was invoked. Apple does not reveal whether the sheet appeared or whether the player submitted a rating.

## Native capability and timing

`StoreReview.isAvailableAsync()` runs before an attempt is claimed. An unavailable capability or failed capability check exits silently and does not consume the cooldown. Invocation errors are swallowed after development-only diagnostics; because the invocation was attempted, the cooldown remains consumed.

The two-second delay is cancellable. Closing the modal, changing the result, navigating away, or unmounting clears the pending callback. Share, Continue, Home, and close remain immediately usable.

## TestFlight and manual rating

Apple's native rating sheet does not display in TestFlight. TestFlight QA can verify eligibility, delay, cancellation, persistence, deduplication, and crash safety, but the actual sheet must be observed in an appropriate development/App Store environment.

No manual Settings row is included because the repository does not contain a verified App Store product or write-review URL. Adding one later should use verified configuration and must remain independent of automatic cooldown metadata.

## Privacy and adjustment

Only aggregate counters already present in the authoritative profile and non-sensitive local attempt metadata are used. Development diagnostics record event names, eligibility reasons, app version, and errors; they do not include usernames, puzzle contents, or profile details.

Future tuning should change the pure milestone policy and its tests. Ambient Home activity signals are intentionally outside this work.
