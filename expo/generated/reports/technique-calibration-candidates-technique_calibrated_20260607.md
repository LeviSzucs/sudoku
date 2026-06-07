# Technique Calibration Candidate Batch

Generated: 2026-06-07T18:31:39.839Z

## Scope

This batch is inactive candidate data only. It is not exported as SQL, not inserted into Supabase, and not used by live puzzle selection.

## Acceptance Summary

| difficulty | accepted | attempts | avg attempts per accepted | avg score | avg givens | avg advanced moves | avg search depth |
|---|---:|---:|---:|---:|---:|---:|---:|
| Easy | 50 | 50 | 1 | 33 | 40 | 0 | 0 |
| Medium | 50 | 50 | 1 | 39.4 | 34 | 0 | 0 |
| Hard | 50 | 1691 | 33.8 | 83 | 30 | 1.9 | 0 |
| Expert | 50 | 1087 | 21.7 | 115.3 | 27 | 5.2 | 0 |
| Master | 50 | 269 | 5.4 | 556 | 24 | 5.2 | 37.1 |

Accepted by intended difficulty: {"Easy":50,"Medium":50,"Hard":50,"Expert":50,"Master":50}
Accepted by suggested difficulty: {"Easy":50,"Medium":50,"Hard":50,"Expert":50,"Master":50}

## Technique And Search Distributions

| difficulty | hardest technique distribution | search depth distribution |
|---|---|---|
| Easy | {"naked_single":50} | {"0":50} |
| Medium | {"naked_single":38,"hidden_single":12} | {"0":50} |
| Hard | {"pointing_pair_triple":44,"naked_pair":2,"box_line_reduction":4} | {"0":50} |
| Expert | {"box_line_reduction":6,"naked_triple":10,"pointing_pair_triple":11,"x_wing":1,"naked_pair":19,"hidden_pair":3} | {"0":50} |
| Master | {"search":50} | {"19":1,"22":1,"25":2,"26":2,"29":3,"30":1,"31":2,"32":4,"33":1,"34":3,"35":5,"36":2,"37":2,"38":4,"39":2,"42":1,"43":1,"44":1,"45":1,"47":3,"48":1,"49":2,"50":1,"51":2,"52":2} |

## Current Active Bank Comparison

- Current active bank labels are still primarily clue-count based and use fixed `rating_score` metadata.
- This candidate bank is filtered by technique acceptance rules after uniqueness validation.
- Every accepted candidate has intended difficulty equal to suggested technique difficulty.
- The new bank improves consistency by rejecting candidates that are unique but solve too easily or too hard for the intended tier.
- Remaining weakness: Expert/Master still depend partly on the current technique set and search pressure; adding more advanced human patterns such as XY-wing, swordfish, coloring, or chains would make those tiers less search-dependent.

## Rejection Reason Summary

| reason | count |
|---|---:|
| Expert: Expert requires score 96-220 with advanced moves or limited search | 25 |
| Hard: Hard requires score 61-95 with candidate logic and no search | 25 |
| Master: Master requires score > 220 with deeper advanced/search pressure | 23 |
| Master: Could not generate a unique Master puzzle after 3 attempts. | 2 |

## Accepted Candidates

| candidate_id | intended | givens | score | hardest | advanced moves | search depth | search branches | suggested |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| calib_easy_technique_calibrated_20260607_0001 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0002 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0003 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0004 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0005 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0006 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0007 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0008 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0009 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0010 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0011 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0012 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0013 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0014 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0015 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0016 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0017 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0018 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0019 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0020 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0021 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0022 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0023 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0024 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0025 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0026 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0027 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0028 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0029 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0030 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0031 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0032 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0033 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0034 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0035 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0036 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0037 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0038 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0039 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0040 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0041 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0042 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0043 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0044 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0045 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0046 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0047 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0048 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0049 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260607_0050 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_medium_technique_calibrated_20260607_0001 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0002 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0003 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0004 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0005 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0006 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0007 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0008 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0009 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0010 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0011 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0012 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0013 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0014 | Medium | 34 | 55 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0015 | Medium | 34 | 52 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0016 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0017 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0018 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0019 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0020 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0021 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0022 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0023 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0024 | Medium | 34 | 53 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0025 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0026 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0027 | Medium | 34 | 52 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0028 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0029 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0030 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0031 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0032 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0033 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0034 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0035 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0036 | Medium | 34 | 52 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0037 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0038 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0039 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0040 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0041 | Medium | 34 | 50 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0042 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0043 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0044 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0045 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0046 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0047 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0048 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0049 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260607_0050 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_hard_technique_calibrated_20260607_0001 | Hard | 30 | 90 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0002 | Hard | 30 | 84 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0003 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0004 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0005 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0006 | Hard | 30 | 92 | naked_pair | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0007 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0008 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0009 | Hard | 30 | 83 | box_line_reduction | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0010 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0011 | Hard | 30 | 93 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0012 | Hard | 30 | 89 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0013 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0014 | Hard | 30 | 90 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0015 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0016 | Hard | 30 | 89 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0017 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0018 | Hard | 30 | 95 | naked_pair | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0019 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0020 | Hard | 30 | 81 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0021 | Hard | 30 | 91 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0022 | Hard | 30 | 73 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0023 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0024 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0025 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0026 | Hard | 30 | 81 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0027 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0028 | Hard | 30 | 81 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0029 | Hard | 30 | 83 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0030 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0031 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0032 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0033 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0034 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0035 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0036 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0037 | Hard | 30 | 81 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0038 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0039 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0040 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0041 | Hard | 30 | 81 | box_line_reduction | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0042 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0043 | Hard | 30 | 95 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0044 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0045 | Hard | 30 | 79 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0046 | Hard | 30 | 93 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0047 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0048 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0049 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260607_0050 | Hard | 30 | 90 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_expert_technique_calibrated_20260607_0001 | Expert | 27 | 101 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0002 | Expert | 27 | 137 | naked_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0003 | Expert | 27 | 147 | naked_triple | 10 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0004 | Expert | 27 | 97 | pointing_pair_triple | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0005 | Expert | 27 | 159 | x_wing | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0006 | Expert | 27 | 102 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0007 | Expert | 27 | 106 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0008 | Expert | 27 | 112 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0009 | Expert | 27 | 102 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0010 | Expert | 27 | 132 | naked_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0011 | Expert | 27 | 130 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0012 | Expert | 27 | 119 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0013 | Expert | 27 | 125 | naked_pair | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0014 | Expert | 27 | 104 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0015 | Expert | 27 | 107 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0016 | Expert | 27 | 102 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0017 | Expert | 27 | 119 | naked_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0018 | Expert | 27 | 100 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0019 | Expert | 27 | 97 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0020 | Expert | 27 | 102 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0021 | Expert | 27 | 109 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0022 | Expert | 27 | 103 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0023 | Expert | 27 | 103 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0024 | Expert | 27 | 110 | naked_triple | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0025 | Expert | 27 | 118 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0026 | Expert | 27 | 117 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0027 | Expert | 27 | 100 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0028 | Expert | 27 | 97 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0029 | Expert | 27 | 146 | naked_triple | 9 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0030 | Expert | 27 | 108 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0031 | Expert | 27 | 114 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0032 | Expert | 27 | 122 | hidden_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0033 | Expert | 27 | 154 | naked_triple | 11 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0034 | Expert | 27 | 118 | pointing_pair_triple | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0035 | Expert | 27 | 112 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0036 | Expert | 27 | 108 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0037 | Expert | 27 | 127 | naked_pair | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0038 | Expert | 27 | 115 | naked_triple | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0039 | Expert | 27 | 136 | hidden_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0040 | Expert | 27 | 104 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0041 | Expert | 27 | 98 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0042 | Expert | 27 | 124 | naked_pair | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0043 | Expert | 27 | 103 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0044 | Expert | 27 | 114 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0045 | Expert | 27 | 136 | naked_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0046 | Expert | 27 | 125 | hidden_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0047 | Expert | 27 | 110 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0048 | Expert | 27 | 108 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0049 | Expert | 27 | 101 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260607_0050 | Expert | 27 | 125 | naked_pair | 7 | 0 | 0 | Expert |
| calib_master_technique_calibrated_20260607_0001 | Master | 24 | 607 | search | 5 | 45 | 4 | Master |
| calib_master_technique_calibrated_20260607_0002 | Master | 24 | 553 | search | 6 | 34 | 4 | Master |
| calib_master_technique_calibrated_20260607_0003 | Master | 24 | 553 | search | 6 | 38 | 2 | Master |
| calib_master_technique_calibrated_20260607_0004 | Master | 24 | 514 | search | 7 | 33 | 1 | Master |
| calib_master_technique_calibrated_20260607_0005 | Master | 24 | 580 | search | 10 | 39 | 2 | Master |
| calib_master_technique_calibrated_20260607_0006 | Master | 24 | 523 | search | 7 | 31 | 2 | Master |
| calib_master_technique_calibrated_20260607_0007 | Master | 24 | 527 | search | 7 | 31 | 2 | Master |
| calib_master_technique_calibrated_20260607_0008 | Master | 24 | 527 | search | 5 | 35 | 2 | Master |
| calib_master_technique_calibrated_20260607_0009 | Master | 24 | 424 | search | 3 | 19 | 1 | Master |
| calib_master_technique_calibrated_20260607_0010 | Master | 24 | 543 | search | 9 | 35 | 1 | Master |
| calib_master_technique_calibrated_20260607_0011 | Master | 24 | 602 | search | 6 | 43 | 4 | Master |
| calib_master_technique_calibrated_20260607_0012 | Master | 24 | 491 | search | 5 | 29 | 1 | Master |
| calib_master_technique_calibrated_20260607_0013 | Master | 24 | 488 | search | 3 | 29 | 2 | Master |
| calib_master_technique_calibrated_20260607_0014 | Master | 24 | 551 | search | 6 | 36 | 3 | Master |
| calib_master_technique_calibrated_20260607_0015 | Master | 24 | 570 | search | 9 | 36 | 3 | Master |
| calib_master_technique_calibrated_20260607_0016 | Master | 24 | 670 | search | 4 | 49 | 8 | Master |
| calib_master_technique_calibrated_20260607_0017 | Master | 24 | 519 | search | 3 | 37 | 1 | Master |
| calib_master_technique_calibrated_20260607_0018 | Master | 24 | 453 | search | 2 | 26 | 1 | Master |
| calib_master_technique_calibrated_20260607_0019 | Master | 24 | 493 | search | 6 | 29 | 1 | Master |
| calib_master_technique_calibrated_20260607_0020 | Master | 24 | 519 | search | 3 | 37 | 1 | Master |
| calib_master_technique_calibrated_20260607_0021 | Master | 24 | 625 | search | 7 | 47 | 4 | Master |
| calib_master_technique_calibrated_20260607_0022 | Master | 24 | 583 | search | 8 | 44 | 1 | Master |
| calib_master_technique_calibrated_20260607_0023 | Master | 24 | 498 | search | 4 | 32 | 1 | Master |
| calib_master_technique_calibrated_20260607_0024 | Master | 24 | 546 | search | 3 | 38 | 3 | Master |
| calib_master_technique_calibrated_20260607_0025 | Master | 24 | 531 | search | 6 | 34 | 2 | Master |
| calib_master_technique_calibrated_20260607_0026 | Master | 24 | 650 | search | 5 | 49 | 6 | Master |
| calib_master_technique_calibrated_20260607_0027 | Master | 24 | 577 | search | 4 | 38 | 5 | Master |
| calib_master_technique_calibrated_20260607_0028 | Master | 24 | 618 | search | 3 | 47 | 5 | Master |
| calib_master_technique_calibrated_20260607_0029 | Master | 24 | 523 | search | 2 | 35 | 3 | Master |
| calib_master_technique_calibrated_20260607_0030 | Master | 24 | 668 | search | 11 | 50 | 4 | Master |
| calib_master_technique_calibrated_20260607_0031 | Master | 24 | 546 | search | 6 | 32 | 4 | Master |
| calib_master_technique_calibrated_20260607_0032 | Master | 24 | 667 | search | 5 | 52 | 6 | Master |
| calib_master_technique_calibrated_20260607_0033 | Master | 24 | 448 | search | 5 | 22 | 1 | Master |
| calib_master_technique_calibrated_20260607_0034 | Master | 24 | 516 | search | 5 | 34 | 1 | Master |
| calib_master_technique_calibrated_20260607_0035 | Master | 24 | 593 | search | 3 | 42 | 5 | Master |
| calib_master_technique_calibrated_20260607_0036 | Master | 24 | 717 | search | 9 | 51 | 9 | Master |
| calib_master_technique_calibrated_20260607_0037 | Master | 24 | 636 | search | 4 | 52 | 4 | Master |
| calib_master_technique_calibrated_20260607_0038 | Master | 24 | 635 | search | 7 | 48 | 4 | Master |
| calib_master_technique_calibrated_20260607_0039 | Master | 24 | 514 | search | 9 | 30 | 1 | Master |
| calib_master_technique_calibrated_20260607_0040 | Master | 24 | 465 | search | 3 | 26 | 1 | Master |
| calib_master_technique_calibrated_20260607_0041 | Master | 24 | 467 | search | 4 | 25 | 1 | Master |
| calib_master_technique_calibrated_20260607_0042 | Master | 24 | 558 | search | 4 | 32 | 6 | Master |
| calib_master_technique_calibrated_20260607_0043 | Master | 24 | 568 | search | 6 | 39 | 3 | Master |
| calib_master_technique_calibrated_20260607_0044 | Master | 24 | 700 | search | 3 | 51 | 10 | Master |
| calib_master_technique_calibrated_20260607_0045 | Master | 24 | 504 | search | 2 | 32 | 2 | Master |
| calib_master_technique_calibrated_20260607_0046 | Master | 24 | 547 | search | 5 | 38 | 2 | Master |
| calib_master_technique_calibrated_20260607_0047 | Master | 24 | 435 | search | 0 | 25 | 1 | Master |
| calib_master_technique_calibrated_20260607_0048 | Master | 24 | 670 | search | 4 | 47 | 9 | Master |
| calib_master_technique_calibrated_20260607_0049 | Master | 24 | 552 | search | 7 | 35 | 3 | Master |
| calib_master_technique_calibrated_20260607_0050 | Master | 24 | 536 | search | 2 | 35 | 4 | Master |

## Rejected Sample Rows

| intended | givens | score | hardest | advanced moves | search depth | suggested | reason |
|---|---:|---:|---|---:|---:|---:|---|
| Hard | 30 | 56 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 568 | search | 2 | 44 | Master | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 56 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 50 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 52 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 57 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 442 | search | 4 | 23 | Master | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 525 | search | 4 | 32 | Master | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 49 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 56 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 49 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 49 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 479 | search | 6 | 27 | Master | Hard requires score 61-95 with candidate logic and no search |
| Expert | 27 | 496 | search | 3 | 31 | Master | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 461 | search | 2 | 27 | Master | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 51 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 55 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 58 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 56 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 86 | pointing_pair_triple | 2 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 56 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 543 | search | 3 | 42 | Master | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 51 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 53 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 55 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 59 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 575 | search | 4 | 40 | Master | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 59 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 51 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 57 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 54 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 81 | pointing_pair_triple | 1 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 61 | hidden_single | 0 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 54 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Master | 24 | 97 | pointing_pair_triple | 2 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master |  |  |  |  |  |  | Could not generate a unique Master puzzle after 3 attempts. |
| Master | 24 | 61 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 60 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 57 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 62 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 59 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 56 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 54 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 58 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 90 | pointing_pair_triple | 3 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 57 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 83 | pointing_pair_triple | 2 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master |  |  |  |  |  |  | Could not generate a unique Master puzzle after 3 attempts. |
| Master | 24 | 114 | pointing_pair_triple | 7 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 62 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 66 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 57 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 62 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 56 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 59 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 118 | naked_pair | 5 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 62 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 58 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 54 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |

## Calibration Notes

- Easy/Medium candidates are much easier to generate with the current clue-removal algorithm.
- Hard/Expert/Master acceptance rates are the key signal for whether the future generator needs technique-guided clue removal instead of clue-count-only removal.
- Accepted Hard/Expert/Master candidates must show higher technique scores and/or search pressure than Medium candidates.
- Candidate rows are deliberately `is_active: false` and should remain out of production serving until a later reviewed export.
