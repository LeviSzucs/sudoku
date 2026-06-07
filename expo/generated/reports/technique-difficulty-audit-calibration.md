# Technique Difficulty Calibration

Generated: 2026-06-07T15:17:45.943Z

## Scope

This is an audit and calibration artifact only. It does not relabel production puzzles, regenerate the puzzle bank, change puzzle selection, or alter gameplay/scoring/RP.

## Current Generator And Rating Summary

- Current generator creates a solved grid from a shuffled pattern, then removes clues while preserving exactly one solution.
- Current validation checks legal givens, legal solution, givens matching solution, and unique solution.
- Current difficulty labels are primarily driven by target clue count: Easy 40, Medium 34, Hard 30, Expert 27, Master 24.
- Current `rating_score` is fixed label/range metadata and is not currently a human solving complexity score.
- The new rater prototype solves with human-style techniques first, persists candidate eliminations through the solve path, then uses search/backtracking pressure as a fallback.

## Mismatch Summary

- Total mismatches: 304/555
- Mismatch count by current difficulty: {"Easy":2,"Medium":2,"Hard":102,"Expert":105,"Master":93}
- Easy suggested Medium or harder: 2
- Medium suggested Easy: 0
- Medium suggested Hard or harder: 2
- Hard suggested Easy/Medium: 90
- Hard suggested Expert/Master: 12
- Expert suggested easier: 90
- Master suggested easier: 93
- Expert/Master requiring advanced/search: 56

| current difficulty | count | mismatches | suggested distribution | hardest technique distribution |
|---|---:|---:|---|---|
| Easy | 111 | 2 | {"Easy":109,"Medium":2,"Hard":0,"Expert":0,"Master":0} | {"naked_single":109,"hidden_single":2} |
| Medium | 111 | 2 | {"Easy":0,"Medium":109,"Hard":0,"Expert":2,"Master":0} | {"naked_single":69,"hidden_single":40,"pointing_pair_triple":2} |
| Hard | 111 | 102 | {"Easy":0,"Medium":90,"Hard":9,"Expert":2,"Master":10} | {"hidden_single":48,"naked_single":45,"search":10,"pointing_pair_triple":6,"x_wing":2} |
| Expert | 111 | 105 | {"Easy":0,"Medium":77,"Hard":13,"Expert":6,"Master":15} | {"hidden_single":70,"pointing_pair_triple":5,"naked_single":17,"search":15,"box_line_reduction":2,"naked_pair":2} |
| Master | 111 | 93 | {"Easy":0,"Medium":57,"Hard":27,"Expert":9,"Master":18} | {"hidden_single":74,"naked_single":5,"box_line_reduction":2,"search":18,"pointing_pair_triple":8,"x_wing":4} |

## Five High-Signal Mismatch Examples Per Difficulty

### Easy

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_easy_20260602_0036 | Easy | Medium | 45 | hidden_single | 40 | 1037 |


### Medium

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_medium_20260602_0033 | Medium | Expert | 103 | pointing_pair_triple | 34 | 2034 |


### Hard

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_hard_20260602_0010 | Hard | Master | 516 | search | 30 | 3011 |
| bank_hard_20260602_0004 | Hard | Master | 513 | search | 30 | 3005 |
| bank_hard_20260602_0038 | Hard | Master | 492 | search | 30 | 3039 |
| bank_hard_20260602_0019 | Hard | Master | 491 | search | 30 | 3020 |
| bank_hard_20260602_0041 | Hard | Master | 411 | search | 30 | 3042 |


### Expert

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| seed_expert_005 | Expert | Medium | 60 | hidden_single | 27 | 525 |
| bank_expert_20260602_0009 | Expert | Medium | 59 | hidden_single | 27 | 4010 |
| bank_expert_20260602_0021 | Expert | Medium | 59 | hidden_single | 27 | 4022 |
| bank_expert_20260602_0032 | Expert | Medium | 59 | hidden_single | 27 | 4033 |
| seed_expert_004 | Expert | Medium | 59 | hidden_single | 27 | 524 |


### Master

| puzzle_id | current | suggested | score | hardest | givens | rating_score |
|---|---:|---:|---:|---|---:|---:|
| bank_master_20260602_0007 | Master | Medium | 60 | hidden_single | 24 | 5008 |
| bank_master_20260602_0010 | Master | Medium | 60 | hidden_single | 24 | 5011 |
| bank_master_20260602_0014 | Master | Medium | 60 | hidden_single | 24 | 5015 |
| bank_master_20260602_0017 | Master | Medium | 60 | hidden_single | 24 | 5018 |
| bank_master_20260602_0021 | Master | Medium | 60 | hidden_single | 24 | 5022 |


## Rater Quality Notes

- Naked singles are detected from peer-eliminated candidate masks, so direct singles/basic scanning are represented.
- Hidden singles are detected per row, column, and box by finding the only candidate cell for a digit.
- Locked candidate logic covers pointing pairs/triples from box to line and claiming/box-line reductions from line to box.
- Naked and hidden pairs/triples are implemented as candidate subset eliminations in each unit.
- X-wing is implemented for row-pair and column-pair eliminations.
- Candidate eliminations persist across passes, so locked candidates/subsets are not repeatedly recounted from a freshly recomputed candidate grid.
- Search is only used after all implemented human techniques fail to make progress, so it is not used too early relative to the current technique stack.
- The largest rater limitation is missing advanced human techniques beyond X-wing, such as swordfish, XY-wing, XYZ-wing, coloring/chains, uniqueness techniques, and more nuanced candidate graph logic.
- Because those techniques are missing, some puzzles may be marked too hard when the rater falls back to search for a human-solvable advanced pattern.
- Puzzles are less likely to be marked too easy because the rater only gives credit for techniques it actually applies, but the current scoring bands are still preliminary and should be validated against hand-picked known examples.

## Proposed Technique Difficulty Bands

- Easy: score 0-35; mostly naked singles/basic scanning, with very small hidden-single usage; no locked candidates or search.
- Medium: score 36-60; hidden singles and light candidate logic; no sustained advanced eliminations; no search.
- Hard: score 61-95; locked candidates, pointing/claiming, pairs/triples, and multi-step candidate maintenance; no search fallback in accepted production Hard puzzles unless tightly bounded.
- Expert: score 96-220; advanced patterns such as X-wing or multiple locked/subset chains, or very limited search pressure where the missing technique set likely explains the fallback.
- Master: score > 220; advanced patterns plus substantial branching/search pressure, or repeated advanced eliminations with high candidate complexity.

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
