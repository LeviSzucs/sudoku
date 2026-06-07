# Technique Difficulty Calibration

Generated: 2026-06-07T14:53:54.538Z

## Scope

This is an audit and calibration artifact only. It does not relabel production puzzles, regenerate the puzzle bank, change puzzle selection, or alter gameplay/scoring/RP.

## Current Generator And Rating Summary

- Current generator creates a solved grid from a shuffled pattern, then removes clues while preserving exactly one solution.
- Current validation checks legal givens, legal solution, givens matching solution, and unique solution.
- Current difficulty labels are primarily driven by target clue count: Easy 40, Medium 34, Hard 30, Expert 27, Master 24.
- Current `rating_score` is fixed label/range metadata and is not currently a human solving complexity score.
- The new rater prototype solves with human-style techniques first, then uses search/backtracking pressure as a fallback.

## Mismatch Summary

- Total mismatches: 286/555
- Mismatch count by current difficulty: {"Easy":2,"Medium":17,"Hard":77,"Expert":111,"Master":79}
- Easy suggested Medium or harder: 2
- Medium suggested Easy: 0
- Medium suggested Hard or harder: 17
- Hard suggested Easy/Medium: 59
- Hard suggested Expert/Master: 18
- Expert suggested easier: 87
- Master suggested easier: 79
- Expert/Master requiring advanced/search: 56

| current difficulty | count | mismatches | suggested distribution | hardest technique distribution |
|---|---:|---:|---|---|
| Easy | 111 | 2 | {"Easy":109,"Medium":2,"Hard":0,"Expert":0,"Master":0} | {"naked_single":109,"hidden_single":2} |
| Medium | 111 | 17 | {"Easy":0,"Medium":94,"Hard":15,"Expert":0,"Master":2} | {"naked_single":69,"hidden_single":40,"pointing_pair_triple":2} |
| Hard | 111 | 77 | {"Easy":0,"Medium":59,"Hard":34,"Expert":0,"Master":18} | {"hidden_single":48,"naked_single":45,"pointing_pair_triple":14,"box_line_reduction":2,"search":2} |
| Expert | 111 | 111 | {"Easy":0,"Medium":17,"Hard":70,"Expert":0,"Master":24} | {"hidden_single":70,"pointing_pair_triple":24,"naked_single":17} |
| Master | 111 | 79 | {"Easy":0,"Medium":5,"Hard":74,"Expert":0,"Master":32} | {"hidden_single":74,"naked_single":5,"pointing_pair_triple":30,"search":2} |

## Five High-Signal Mismatch Examples Per Difficulty

### Easy

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_easy_20260602_0036 | Easy | Medium | 45 | hidden_single | 40 | 1037 |


### Medium

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_medium_20260602_0033 | Medium | Master | 1535 | pointing_pair_triple | 34 | 2034 |
| bank_medium_20260602_0037 | Medium | Hard | 56 | hidden_single | 34 | 2038 |
| bank_medium_20260602_0018 | Medium | Hard | 55 | hidden_single | 34 | 2019 |
| bank_medium_20260602_0019 | Medium | Hard | 54 | hidden_single | 34 | 2020 |
| seed_medium_004 | Medium | Hard | 53 | hidden_single | 34 | 224 |


### Hard

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_hard_20260602_0027 | Hard | Master | 1537 | pointing_pair_triple | 30 | 3028 |
| bank_hard_20260602_0039 | Hard | Master | 1525 | pointing_pair_triple | 30 | 3040 |
| bank_hard_20260602_0010 | Hard | Master | 1520 | pointing_pair_triple | 30 | 3011 |
| bank_hard_20260602_0005 | Hard | Master | 1514 | pointing_pair_triple | 30 | 3006 |
| bank_hard_20260602_0021 | Hard | Master | 1507 | box_line_reduction | 30 | 3022 |


### Expert

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_expert_20260602_0001 | Expert | Medium | 40 | naked_single | 27 | 4002 |
| bank_expert_20260602_0022 | Expert | Medium | 40 | naked_single | 27 | 4023 |
| bank_expert_20260602_0030 | Expert | Medium | 40 | naked_single | 27 | 4031 |
| bank_expert_20260602_0033 | Expert | Medium | 40 | naked_single | 27 | 4034 |
| bank_expert_20260602_0035 | Expert | Medium | 40 | naked_single | 27 | 4036 |


### Master

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_master_20260602_0009 | Master | Medium | 42 | naked_single | 24 | 5010 |
| bank_master_20260602_0043 | Master | Medium | 42 | naked_single | 24 | 5044 |
| seed_master_004 | Master | Medium | 42 | naked_single | 24 | 704 |
| bank_master_20260602_0003 | Master | Hard | 66 | hidden_single | 24 | 5004 |
| bank_master_20260602_0044 | Master | Hard | 66 | hidden_single | 24 | 5045 |


## Rater Quality Notes

- Naked singles are detected from peer-eliminated candidate masks, so direct singles/basic scanning are represented.
- Hidden singles are detected per row, column, and box by finding the only candidate cell for a digit.
- Locked candidate logic covers pointing pairs/triples from box to line and claiming/box-line reductions from line to box.
- Naked and hidden pairs/triples are implemented as candidate subset eliminations in each unit.
- X-wing is implemented for row-pair and column-pair eliminations.
- Search is only used after all implemented human techniques fail to make progress, so it is not used too early relative to the current technique stack.
- The largest rater limitation is missing advanced human techniques beyond X-wing, such as swordfish, XY-wing, XYZ-wing, coloring/chains, uniqueness techniques, and more nuanced candidate graph logic.
- Because those techniques are missing, some puzzles may be marked too hard when the rater falls back to search for a human-solvable advanced pattern.
- Puzzles are less likely to be marked too easy because the rater only gives credit for techniques it actually applies, but the current scoring bands are still preliminary and should be validated against hand-picked known examples.

## Proposed Technique Difficulty Bands

- Easy: mostly naked singles/basic scanning, with very small hidden-single usage; no locked candidates or search.
- Medium: hidden singles and light candidate logic; no sustained advanced eliminations; no search.
- Hard: locked candidates, pointing/claiming, pairs/triples, and multi-step candidate maintenance; no search fallback in accepted production Hard puzzles unless tightly bounded.
- Expert: advanced patterns such as X-wing or multiple locked/subset chains, or very limited search pressure where the missing technique set likely explains the fallback.
- Master: advanced patterns plus substantial branching/search pressure, or repeated advanced eliminations with high candidate complexity.

## Recommended Future Generation Acceptance Rules

- Keep uniqueness validation as the first gate for every generated puzzle.
- Add technique rating as a second acceptance gate before export.
- Easy candidates should be accepted only when suggested difficulty is Easy, hardest technique is naked_single or hidden_single, and score is within the Easy band.
- Medium candidates should be accepted only when suggested difficulty is Medium and no search fallback is required.
- Hard candidates should require at least hidden singles plus candidate logic or bounded subset/locked-candidate usage, and should reject puzzles that rate Easy/Medium.
- Expert candidates should require advanced patterns or tightly bounded search pressure, and should reject puzzles that solve with singles-only paths.
- Master candidates should require advanced patterns plus deeper search/branch pressure, and should reject puzzles that do not exceed Expert complexity.
- Generated batches should record both the assigned label and the technique audit fields so future exports can be filtered without relabeling by clue count.
- Do not use mixed-source `rating_score` as a cross-source difficulty sorter until it is normalized or replaced by technique_score.

## Recommended Next Implementation Plan

1. Add regression fixtures with known technique requirements for singles, locked candidates, pairs, X-wing, and search-only examples.
2. Calibrate the score bands against those fixtures and a small hand-reviewed sample from each current difficulty.
3. Extend the rater with at least swordfish and XY-wing or another common next-tier family before using it for Expert/Master production generation.
4. Add generator acceptance filters that reject generated puzzles whose technique rating does not match the requested target label.
5. Run a small trial generation batch per difficulty and inspect mismatch rates before generating a production-sized bank.
6. Only after calibration, consider relabel/deactivation recommendations for current active puzzles in a separate migration.
