# Technique Calibration Candidate Batch

Generated: 2026-06-12T23:13:00.844Z

## Scope

This batch was generated as candidate data first, then exported by the paired migration as the expanded active calibrated puzzle bank. Existing older calibrated puzzles remain available as fallback.

## Acceptance Summary

| difficulty | accepted | attempts | avg attempts per accepted | avg score | avg givens | avg advanced moves | avg search depth |
|---|---:|---:|---:|---:|---:|---:|---:|
| Easy | 200 | 206 | 1 | 33 | 40 | 0 | 0 |
| Medium | 200 | 205 | 1 | 39.5 | 34 | 0 | 0 |
| Hard | 200 | 7923 | 39.6 | 82.8 | 30 | 1.9 | 0 |
| Expert | 200 | 5043 | 25.2 | 113.2 | 27 | 5.1 | 0 |
| Master | 200 | 844 | 4.2 | 564.6 | 24 | 5 | 38.7 |

Accepted by intended difficulty: {"Easy":200,"Medium":200,"Hard":200,"Expert":200,"Master":200}
Accepted by suggested difficulty: {"Easy":200,"Medium":200,"Hard":200,"Expert":200,"Master":200}

## Technique And Search Distributions

| difficulty | hardest technique distribution | search depth distribution |
|---|---|---|
| Easy | {"naked_single":200} | {"0":200} |
| Medium | {"naked_single":148,"hidden_single":52} | {"0":200} |
| Hard | {"naked_pair":5,"box_line_reduction":16,"pointing_pair_triple":179} | {"0":200} |
| Expert | {"hidden_pair":9,"naked_pair":74,"naked_triple":26,"pointing_pair_triple":60,"box_line_reduction":26,"x_wing":5} | {"0":200} |
| Master | {"search":200} | {"17":2,"19":2,"20":1,"21":3,"22":2,"23":4,"24":1,"25":3,"26":3,"27":6,"28":1,"29":4,"30":5,"31":5,"32":7,"33":3,"34":7,"35":6,"36":5,"37":10,"38":14,"39":10,"40":3,"41":9,"42":9,"43":10,"44":8,"45":9,"46":7,"47":7,"48":5,"49":8,"50":5,"51":3,"52":5,"53":7,"54":1} |

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
| Easy: Easy requires singles-only score <= 35 | 6 |
| Medium: Medium requires score 36-60, no search, at most one advanced move | 5 |
| Master: Could not generate a unique Master puzzle after 3 attempts. | 2 |

## Accepted Candidates

| candidate_id | intended | givens | score | hardest | advanced moves | search depth | search branches | suggested |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| calib_easy_technique_calibrated_20260613_0001 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0002 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0003 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0004 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0005 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0006 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0007 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0008 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0009 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0010 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0011 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0012 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0013 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0014 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0015 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0016 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0017 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0018 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0019 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0020 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0021 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0022 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0023 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0024 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0025 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0026 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0027 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0028 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0029 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0030 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0031 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0032 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0033 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0034 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0035 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0036 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0037 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0038 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0039 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0040 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0041 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0042 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0043 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0044 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0045 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0046 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0047 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0048 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0049 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0050 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0051 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0052 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0053 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0054 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0055 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0056 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0057 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0058 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0059 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0060 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0061 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0062 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0063 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0064 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0065 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0066 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0067 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0068 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0069 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0070 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0071 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0072 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0073 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0074 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0075 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0076 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0077 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0078 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0079 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0080 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0081 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0082 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0083 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0084 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0085 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0086 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0087 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0088 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0089 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0090 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0091 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0092 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0093 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0094 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0095 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0096 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0097 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0098 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0099 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0100 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0101 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0102 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0103 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0104 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0105 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0106 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0107 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0108 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0109 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0110 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0111 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0112 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0113 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0114 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0115 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0116 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0117 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0118 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0119 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0120 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0121 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0122 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0123 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0124 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0125 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0126 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0127 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0128 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0129 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0130 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0131 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0132 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0133 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0134 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0135 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0136 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0137 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0138 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0139 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0140 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0141 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0142 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0143 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0144 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0145 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0146 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0147 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0148 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0149 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0150 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0151 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0152 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0153 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0154 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0155 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0156 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0157 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0158 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0159 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0160 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0161 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0162 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0163 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0164 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0165 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0166 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0167 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0168 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0169 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0170 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0171 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0172 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0173 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0174 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0175 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0176 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0177 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0178 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0179 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0180 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0181 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0182 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0183 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0184 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0185 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0186 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0187 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0188 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0189 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0190 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0191 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0192 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0193 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0194 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0195 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0196 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0197 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0198 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0199 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_easy_technique_calibrated_20260613_0200 | Easy | 40 | 33 | naked_single | 0 | 0 | 0 | Easy |
| calib_medium_technique_calibrated_20260613_0001 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0002 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0003 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0004 | Medium | 34 | 53 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0005 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0006 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0007 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0008 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0009 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0010 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0011 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0012 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0013 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0014 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0015 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0016 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0017 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0018 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0019 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0020 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0021 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0022 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0023 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0024 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0025 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0026 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0027 | Medium | 34 | 53 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0028 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0029 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0030 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0031 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0032 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0033 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0034 | Medium | 34 | 50 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0035 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0036 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0037 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0038 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0039 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0040 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0041 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0042 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0043 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0044 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0045 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0046 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0047 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0048 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0049 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0050 | Medium | 34 | 58 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0051 | Medium | 34 | 50 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0052 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0053 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0054 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0055 | Medium | 34 | 50 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0056 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0057 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0058 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0059 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0060 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0061 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0062 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0063 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0064 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0065 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0066 | Medium | 34 | 50 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0067 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0068 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0069 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0070 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0071 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0072 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0073 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0074 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0075 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0076 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0077 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0078 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0079 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0080 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0081 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0082 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0083 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0084 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0085 | Medium | 34 | 53 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0086 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0087 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0088 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0089 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0090 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0091 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0092 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0093 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0094 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0095 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0096 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0097 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0098 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0099 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0100 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0101 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0102 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0103 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0104 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0105 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0106 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0107 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0108 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0109 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0110 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0111 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0112 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0113 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0114 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0115 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0116 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0117 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0118 | Medium | 34 | 52 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0119 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0120 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0121 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0122 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0123 | Medium | 34 | 51 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0124 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0125 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0126 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0127 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0128 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0129 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0130 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0131 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0132 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0133 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0134 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0135 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0136 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0137 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0138 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0139 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0140 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0141 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0142 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0143 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0144 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0145 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0146 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0147 | Medium | 34 | 52 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0148 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0149 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0150 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0151 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0152 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0153 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0154 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0155 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0156 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0157 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0158 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0159 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0160 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0161 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0162 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0163 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0164 | Medium | 34 | 50 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0165 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0166 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0167 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0168 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0169 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0170 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0171 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0172 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0173 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0174 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0175 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0176 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0177 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0178 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0179 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0180 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0181 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0182 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0183 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0184 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0185 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0186 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0187 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0188 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0189 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0190 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0191 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0192 | Medium | 34 | 53 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0193 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0194 | Medium | 34 | 49 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0195 | Medium | 34 | 48 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0196 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0197 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0198 | Medium | 34 | 36 | naked_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0199 | Medium | 34 | 54 | hidden_single | 0 | 0 | 0 | Medium |
| calib_medium_technique_calibrated_20260613_0200 | Medium | 34 | 47 | hidden_single | 0 | 0 | 0 | Medium |
| calib_hard_technique_calibrated_20260613_0001 | Hard | 30 | 94 | naked_pair | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0002 | Hard | 30 | 89 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0003 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0004 | Hard | 30 | 91 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0005 | Hard | 30 | 86 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0006 | Hard | 30 | 87 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0007 | Hard | 30 | 74 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0008 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0009 | Hard | 30 | 77 | box_line_reduction | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0010 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0011 | Hard | 30 | 94 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0012 | Hard | 30 | 93 | naked_pair | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0013 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0014 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0015 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0016 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0017 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0018 | Hard | 30 | 94 | pointing_pair_triple | 5 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0019 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0020 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0021 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0022 | Hard | 30 | 86 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0023 | Hard | 30 | 74 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0024 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0025 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0026 | Hard | 30 | 89 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0027 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0028 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0029 | Hard | 30 | 84 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0030 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0031 | Hard | 30 | 81 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0032 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0033 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0034 | Hard | 30 | 87 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0035 | Hard | 30 | 79 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0036 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0037 | Hard | 30 | 87 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0038 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0039 | Hard | 30 | 79 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0040 | Hard | 30 | 93 | box_line_reduction | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0041 | Hard | 30 | 82 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0042 | Hard | 30 | 87 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0043 | Hard | 30 | 86 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0044 | Hard | 30 | 79 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0045 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0046 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0047 | Hard | 30 | 87 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0048 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0049 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0050 | Hard | 30 | 85 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0051 | Hard | 30 | 78 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0052 | Hard | 30 | 81 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0053 | Hard | 30 | 80 | box_line_reduction | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0054 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0055 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0056 | Hard | 30 | 92 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0057 | Hard | 30 | 86 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0058 | Hard | 30 | 83 | box_line_reduction | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0059 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0060 | Hard | 30 | 90 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0061 | Hard | 30 | 81 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0062 | Hard | 30 | 83 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0063 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0064 | Hard | 30 | 83 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0065 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0066 | Hard | 30 | 91 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0067 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0068 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0069 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0070 | Hard | 30 | 90 | naked_pair | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0071 | Hard | 30 | 83 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0072 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0073 | Hard | 30 | 81 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0074 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0075 | Hard | 30 | 81 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0076 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0077 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0078 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0079 | Hard | 30 | 92 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0080 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0081 | Hard | 30 | 90 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0082 | Hard | 30 | 91 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0083 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0084 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0085 | Hard | 30 | 82 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0086 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0087 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0088 | Hard | 30 | 79 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0089 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0090 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0091 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0092 | Hard | 30 | 91 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0093 | Hard | 30 | 91 | naked_pair | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0094 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0095 | Hard | 30 | 91 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0096 | Hard | 30 | 93 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0097 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0098 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0099 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0100 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0101 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0102 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0103 | Hard | 30 | 80 | box_line_reduction | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0104 | Hard | 30 | 82 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0105 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0106 | Hard | 30 | 81 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0107 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0108 | Hard | 30 | 91 | box_line_reduction | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0109 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0110 | Hard | 30 | 88 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0111 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0112 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0113 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0114 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0115 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0116 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0117 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0118 | Hard | 30 | 87 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0119 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0120 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0121 | Hard | 30 | 89 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0122 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0123 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0124 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0125 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0126 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0127 | Hard | 30 | 86 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0128 | Hard | 30 | 87 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0129 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0130 | Hard | 30 | 88 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0131 | Hard | 30 | 86 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0132 | Hard | 30 | 93 | box_line_reduction | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0133 | Hard | 30 | 74 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0134 | Hard | 30 | 95 | naked_pair | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0135 | Hard | 30 | 94 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0136 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0137 | Hard | 30 | 74 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0138 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0139 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0140 | Hard | 30 | 86 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0141 | Hard | 30 | 82 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0142 | Hard | 30 | 89 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0143 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0144 | Hard | 30 | 74 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0145 | Hard | 30 | 73 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0146 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0147 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0148 | Hard | 30 | 85 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0149 | Hard | 30 | 86 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0150 | Hard | 30 | 74 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0151 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0152 | Hard | 30 | 84 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0153 | Hard | 30 | 88 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0154 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0155 | Hard | 30 | 93 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0156 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0157 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0158 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0159 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0160 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0161 | Hard | 30 | 83 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0162 | Hard | 30 | 80 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0163 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0164 | Hard | 30 | 91 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0165 | Hard | 30 | 79 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0166 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0167 | Hard | 30 | 83 | box_line_reduction | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0168 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0169 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0170 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0171 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0172 | Hard | 30 | 94 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0173 | Hard | 30 | 91 | box_line_reduction | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0174 | Hard | 30 | 91 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0175 | Hard | 30 | 91 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0176 | Hard | 30 | 84 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0177 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0178 | Hard | 30 | 80 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0179 | Hard | 30 | 88 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0180 | Hard | 30 | 92 | box_line_reduction | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0181 | Hard | 30 | 89 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0182 | Hard | 30 | 87 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0183 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0184 | Hard | 30 | 87 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0185 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0186 | Hard | 30 | 82 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0187 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0188 | Hard | 30 | 85 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0189 | Hard | 30 | 90 | pointing_pair_triple | 2 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0190 | Hard | 30 | 78 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0191 | Hard | 30 | 76 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0192 | Hard | 30 | 89 | pointing_pair_triple | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0193 | Hard | 30 | 75 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0194 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0195 | Hard | 30 | 81 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0196 | Hard | 30 | 93 | box_line_reduction | 3 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0197 | Hard | 30 | 73 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0198 | Hard | 30 | 93 | pointing_pair_triple | 4 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0199 | Hard | 30 | 79 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_hard_technique_calibrated_20260613_0200 | Hard | 30 | 77 | pointing_pair_triple | 1 | 0 | 0 | Hard |
| calib_expert_technique_calibrated_20260613_0001 | Expert | 27 | 132 | hidden_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0002 | Expert | 27 | 112 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0003 | Expert | 27 | 122 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0004 | Expert | 27 | 116 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0005 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0006 | Expert | 27 | 97 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0007 | Expert | 27 | 152 | naked_triple | 10 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0008 | Expert | 27 | 99 | box_line_reduction | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0009 | Expert | 27 | 101 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0010 | Expert | 27 | 106 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0011 | Expert | 27 | 113 | pointing_pair_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0012 | Expert | 27 | 98 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0013 | Expert | 27 | 97 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0014 | Expert | 27 | 106 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0015 | Expert | 27 | 106 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0016 | Expert | 27 | 96 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0017 | Expert | 27 | 110 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0018 | Expert | 27 | 113 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0019 | Expert | 27 | 100 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0020 | Expert | 27 | 117 | box_line_reduction | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0021 | Expert | 27 | 110 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0022 | Expert | 27 | 98 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0023 | Expert | 27 | 104 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0024 | Expert | 27 | 113 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0025 | Expert | 27 | 118 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0026 | Expert | 27 | 125 | hidden_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0027 | Expert | 27 | 97 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0028 | Expert | 27 | 112 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0029 | Expert | 27 | 110 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0030 | Expert | 27 | 106 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0031 | Expert | 27 | 132 | naked_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0032 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0033 | Expert | 27 | 132 | naked_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0034 | Expert | 27 | 99 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0035 | Expert | 27 | 108 | box_line_reduction | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0036 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0037 | Expert | 27 | 111 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0038 | Expert | 27 | 131 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0039 | Expert | 27 | 125 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0040 | Expert | 27 | 157 | x_wing | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0041 | Expert | 27 | 116 | naked_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0042 | Expert | 27 | 129 | naked_pair | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0043 | Expert | 27 | 135 | naked_pair | 9 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0044 | Expert | 27 | 123 | naked_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0045 | Expert | 27 | 130 | naked_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0046 | Expert | 27 | 97 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0047 | Expert | 27 | 151 | x_wing | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0048 | Expert | 27 | 122 | hidden_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0049 | Expert | 27 | 97 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0050 | Expert | 27 | 96 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0051 | Expert | 27 | 98 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0052 | Expert | 27 | 97 | pointing_pair_triple | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0053 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0054 | Expert | 27 | 111 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0055 | Expert | 27 | 96 | pointing_pair_triple | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0056 | Expert | 27 | 122 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0057 | Expert | 27 | 110 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0058 | Expert | 27 | 106 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0059 | Expert | 27 | 102 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0060 | Expert | 27 | 112 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0061 | Expert | 27 | 104 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0062 | Expert | 27 | 104 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0063 | Expert | 27 | 123 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0064 | Expert | 27 | 110 | pointing_pair_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0065 | Expert | 27 | 136 | naked_pair | 9 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0066 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0067 | Expert | 27 | 111 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0068 | Expert | 27 | 108 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0069 | Expert | 27 | 121 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0070 | Expert | 27 | 102 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0071 | Expert | 27 | 109 | naked_triple | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0072 | Expert | 27 | 104 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0073 | Expert | 27 | 101 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0074 | Expert | 27 | 124 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0075 | Expert | 27 | 113 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0076 | Expert | 27 | 103 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0077 | Expert | 27 | 105 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0078 | Expert | 27 | 106 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0079 | Expert | 27 | 159 | x_wing | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0080 | Expert | 27 | 102 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0081 | Expert | 27 | 127 | hidden_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0082 | Expert | 27 | 108 | naked_triple | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0083 | Expert | 27 | 102 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0084 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0085 | Expert | 27 | 100 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0086 | Expert | 27 | 115 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0087 | Expert | 27 | 104 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0088 | Expert | 27 | 120 | naked_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0089 | Expert | 27 | 123 | naked_pair | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0090 | Expert | 27 | 102 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0091 | Expert | 27 | 102 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0092 | Expert | 27 | 119 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0093 | Expert | 27 | 100 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0094 | Expert | 27 | 102 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0095 | Expert | 27 | 97 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0096 | Expert | 27 | 146 | naked_triple | 9 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0097 | Expert | 27 | 131 | pointing_pair_triple | 11 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0098 | Expert | 27 | 126 | naked_pair | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0099 | Expert | 27 | 123 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0100 | Expert | 27 | 97 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0101 | Expert | 27 | 149 | naked_pair | 12 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0102 | Expert | 27 | 135 | naked_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0103 | Expert | 27 | 114 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0104 | Expert | 27 | 102 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0105 | Expert | 27 | 99 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0106 | Expert | 27 | 119 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0107 | Expert | 27 | 115 | naked_triple | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0108 | Expert | 27 | 121 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0109 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0110 | Expert | 27 | 100 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0111 | Expert | 27 | 102 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0112 | Expert | 27 | 99 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0113 | Expert | 27 | 108 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0114 | Expert | 27 | 112 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0115 | Expert | 27 | 111 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0116 | Expert | 27 | 159 | naked_pair | 14 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0117 | Expert | 27 | 112 | box_line_reduction | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0118 | Expert | 27 | 128 | naked_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0119 | Expert | 27 | 146 | naked_pair | 11 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0120 | Expert | 27 | 104 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0121 | Expert | 27 | 96 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0122 | Expert | 27 | 115 | box_line_reduction | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0123 | Expert | 27 | 130 | naked_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0124 | Expert | 27 | 108 | naked_triple | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0125 | Expert | 27 | 109 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0126 | Expert | 27 | 98 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0127 | Expert | 27 | 106 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0128 | Expert | 27 | 111 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0129 | Expert | 27 | 101 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0130 | Expert | 27 | 129 | hidden_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0131 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0132 | Expert | 27 | 137 | naked_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0133 | Expert | 27 | 119 | box_line_reduction | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0134 | Expert | 27 | 97 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0135 | Expert | 27 | 140 | naked_triple | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0136 | Expert | 27 | 108 | box_line_reduction | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0137 | Expert | 27 | 100 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0138 | Expert | 27 | 124 | naked_pair | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0139 | Expert | 27 | 146 | naked_pair | 11 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0140 | Expert | 27 | 118 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0141 | Expert | 27 | 119 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0142 | Expert | 27 | 120 | naked_pair | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0143 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0144 | Expert | 27 | 101 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0145 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0146 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0147 | Expert | 27 | 101 | box_line_reduction | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0148 | Expert | 27 | 109 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0149 | Expert | 27 | 109 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0150 | Expert | 27 | 123 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0151 | Expert | 27 | 106 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0152 | Expert | 27 | 116 | box_line_reduction | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0153 | Expert | 27 | 131 | hidden_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0154 | Expert | 27 | 117 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0155 | Expert | 27 | 180 | x_wing | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0156 | Expert | 27 | 98 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0157 | Expert | 27 | 101 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0158 | Expert | 27 | 97 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0159 | Expert | 27 | 155 | hidden_pair | 10 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0160 | Expert | 27 | 97 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0161 | Expert | 27 | 136 | naked_pair | 9 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0162 | Expert | 27 | 106 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0163 | Expert | 27 | 99 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0164 | Expert | 27 | 96 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0165 | Expert | 27 | 98 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0166 | Expert | 27 | 109 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0167 | Expert | 27 | 111 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0168 | Expert | 27 | 120 | naked_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0169 | Expert | 27 | 97 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0170 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0171 | Expert | 27 | 106 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0172 | Expert | 27 | 104 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0173 | Expert | 27 | 104 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0174 | Expert | 27 | 103 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0175 | Expert | 27 | 109 | box_line_reduction | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0176 | Expert | 27 | 99 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0177 | Expert | 27 | 151 | naked_triple | 9 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0178 | Expert | 27 | 107 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0179 | Expert | 27 | 96 | pointing_pair_triple | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0180 | Expert | 27 | 105 | naked_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0181 | Expert | 27 | 162 | hidden_pair | 10 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0182 | Expert | 27 | 107 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0183 | Expert | 27 | 130 | naked_pair | 8 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0184 | Expert | 27 | 111 | box_line_reduction | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0185 | Expert | 27 | 116 | naked_pair | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0186 | Expert | 27 | 99 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0187 | Expert | 27 | 160 | naked_triple | 11 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0188 | Expert | 27 | 139 | naked_pair | 10 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0189 | Expert | 27 | 122 | hidden_pair | 3 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0190 | Expert | 27 | 137 | naked_triple | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0191 | Expert | 27 | 118 | naked_pair | 6 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0192 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0193 | Expert | 27 | 99 | box_line_reduction | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0194 | Expert | 27 | 101 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0195 | Expert | 27 | 105 | naked_pair | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0196 | Expert | 27 | 173 | x_wing | 7 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0197 | Expert | 27 | 100 | pointing_pair_triple | 5 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0198 | Expert | 27 | 96 | pointing_pair_triple | 4 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0199 | Expert | 27 | 96 | naked_pair | 2 | 0 | 0 | Expert |
| calib_expert_technique_calibrated_20260613_0200 | Expert | 27 | 108 | pointing_pair_triple | 6 | 0 | 0 | Expert |
| calib_master_technique_calibrated_20260613_0001 | Master | 24 | 554 | search | 7 | 37 | 2 | Master |
| calib_master_technique_calibrated_20260613_0002 | Master | 24 | 639 | search | 5 | 44 | 7 | Master |
| calib_master_technique_calibrated_20260613_0003 | Master | 24 | 557 | search | 5 | 34 | 5 | Master |
| calib_master_technique_calibrated_20260613_0004 | Master | 24 | 513 | search | 2 | 35 | 2 | Master |
| calib_master_technique_calibrated_20260613_0005 | Master | 24 | 558 | search | 11 | 36 | 1 | Master |
| calib_master_technique_calibrated_20260613_0006 | Master | 24 | 447 | search | 0 | 27 | 1 | Master |
| calib_master_technique_calibrated_20260613_0007 | Master | 24 | 486 | search | 1 | 30 | 2 | Master |
| calib_master_technique_calibrated_20260613_0008 | Master | 24 | 609 | search | 11 | 41 | 3 | Master |
| calib_master_technique_calibrated_20260613_0009 | Master | 24 | 543 | search | 5 | 37 | 2 | Master |
| calib_master_technique_calibrated_20260613_0010 | Master | 24 | 628 | search | 8 | 44 | 5 | Master |
| calib_master_technique_calibrated_20260613_0011 | Master | 24 | 553 | search | 3 | 40 | 3 | Master |
| calib_master_technique_calibrated_20260613_0012 | Master | 24 | 622 | search | 8 | 45 | 4 | Master |
| calib_master_technique_calibrated_20260613_0013 | Master | 24 | 616 | search | 6 | 39 | 7 | Master |
| calib_master_technique_calibrated_20260613_0014 | Master | 24 | 452 | search | 4 | 23 | 1 | Master |
| calib_master_technique_calibrated_20260613_0015 | Master | 24 | 561 | search | 2 | 46 | 1 | Master |
| calib_master_technique_calibrated_20260613_0016 | Master | 24 | 547 | search | 2 | 39 | 3 | Master |
| calib_master_technique_calibrated_20260613_0017 | Master | 24 | 505 | search | 3 | 35 | 1 | Master |
| calib_master_technique_calibrated_20260613_0018 | Master | 24 | 503 | search | 5 | 32 | 1 | Master |
| calib_master_technique_calibrated_20260613_0019 | Master | 24 | 557 | search | 4 | 38 | 3 | Master |
| calib_master_technique_calibrated_20260613_0020 | Master | 24 | 508 | search | 2 | 36 | 1 | Master |
| calib_master_technique_calibrated_20260613_0021 | Master | 24 | 562 | search | 4 | 38 | 4 | Master |
| calib_master_technique_calibrated_20260613_0022 | Master | 24 | 653 | search | 5 | 52 | 5 | Master |
| calib_master_technique_calibrated_20260613_0023 | Master | 24 | 486 | search | 8 | 26 | 1 | Master |
| calib_master_technique_calibrated_20260613_0024 | Master | 24 | 570 | search | 7 | 43 | 1 | Master |
| calib_master_technique_calibrated_20260613_0025 | Master | 24 | 620 | search | 7 | 43 | 5 | Master |
| calib_master_technique_calibrated_20260613_0026 | Master | 24 | 612 | search | 10 | 43 | 3 | Master |
| calib_master_technique_calibrated_20260613_0027 | Master | 24 | 450 | search | 1 | 25 | 1 | Master |
| calib_master_technique_calibrated_20260613_0028 | Master | 24 | 594 | search | 2 | 46 | 4 | Master |
| calib_master_technique_calibrated_20260613_0029 | Master | 24 | 412 | search | 1 | 20 | 1 | Master |
| calib_master_technique_calibrated_20260613_0030 | Master | 24 | 631 | search | 4 | 51 | 4 | Master |
| calib_master_technique_calibrated_20260613_0031 | Master | 24 | 604 | search | 5 | 47 | 3 | Master |
| calib_master_technique_calibrated_20260613_0032 | Master | 24 | 508 | search | 3 | 36 | 1 | Master |
| calib_master_technique_calibrated_20260613_0033 | Master | 24 | 534 | search | 5 | 38 | 1 | Master |
| calib_master_technique_calibrated_20260613_0034 | Master | 24 | 422 | search | 0 | 22 | 1 | Master |
| calib_master_technique_calibrated_20260613_0035 | Master | 24 | 588 | search | 11 | 37 | 3 | Master |
| calib_master_technique_calibrated_20260613_0036 | Master | 24 | 585 | search | 9 | 39 | 3 | Master |
| calib_master_technique_calibrated_20260613_0037 | Master | 24 | 672 | search | 7 | 49 | 7 | Master |
| calib_master_technique_calibrated_20260613_0038 | Master | 24 | 641 | search | 5 | 47 | 6 | Master |
| calib_master_technique_calibrated_20260613_0039 | Master | 24 | 505 | search | 7 | 31 | 1 | Master |
| calib_master_technique_calibrated_20260613_0040 | Master | 24 | 569 | search | 11 | 38 | 1 | Master |
| calib_master_technique_calibrated_20260613_0041 | Master | 24 | 691 | search | 5 | 52 | 8 | Master |
| calib_master_technique_calibrated_20260613_0042 | Master | 24 | 606 | search | 6 | 44 | 4 | Master |
| calib_master_technique_calibrated_20260613_0043 | Master | 24 | 445 | search | 0 | 24 | 2 | Master |
| calib_master_technique_calibrated_20260613_0044 | Master | 24 | 595 | search | 6 | 44 | 3 | Master |
| calib_master_technique_calibrated_20260613_0045 | Master | 24 | 451 | search | 5 | 21 | 2 | Master |
| calib_master_technique_calibrated_20260613_0046 | Master | 24 | 498 | search | 0 | 31 | 3 | Master |
| calib_master_technique_calibrated_20260613_0047 | Master | 24 | 628 | search | 2 | 50 | 5 | Master |
| calib_master_technique_calibrated_20260613_0048 | Master | 24 | 586 | search | 8 | 43 | 2 | Master |
| calib_master_technique_calibrated_20260613_0049 | Master | 24 | 576 | search | 2 | 38 | 6 | Master |
| calib_master_technique_calibrated_20260613_0050 | Master | 24 | 482 | search | 5 | 28 | 1 | Master |
| calib_master_technique_calibrated_20260613_0051 | Master | 24 | 671 | search | 16 | 43 | 5 | Master |
| calib_master_technique_calibrated_20260613_0052 | Master | 24 | 577 | search | 5 | 39 | 4 | Master |
| calib_master_technique_calibrated_20260613_0053 | Master | 24 | 555 | search | 3 | 34 | 5 | Master |
| calib_master_technique_calibrated_20260613_0054 | Master | 24 | 468 | search | 3 | 27 | 1 | Master |
| calib_master_technique_calibrated_20260613_0055 | Master | 24 | 455 | search | 1 | 27 | 1 | Master |
| calib_master_technique_calibrated_20260613_0056 | Master | 24 | 712 | search | 3 | 49 | 12 | Master |
| calib_master_technique_calibrated_20260613_0057 | Master | 24 | 500 | search | 1 | 33 | 2 | Master |
| calib_master_technique_calibrated_20260613_0058 | Master | 24 | 616 | search | 0 | 50 | 5 | Master |
| calib_master_technique_calibrated_20260613_0059 | Master | 24 | 577 | search | 10 | 39 | 2 | Master |
| calib_master_technique_calibrated_20260613_0060 | Master | 24 | 448 | search | 0 | 27 | 1 | Master |
| calib_master_technique_calibrated_20260613_0061 | Master | 24 | 604 | search | 5 | 42 | 5 | Master |
| calib_master_technique_calibrated_20260613_0062 | Master | 24 | 563 | search | 3 | 41 | 3 | Master |
| calib_master_technique_calibrated_20260613_0063 | Master | 24 | 443 | search | 5 | 19 | 2 | Master |
| calib_master_technique_calibrated_20260613_0064 | Master | 24 | 493 | search | 1 | 35 | 1 | Master |
| calib_master_technique_calibrated_20260613_0065 | Master | 24 | 562 | search | 7 | 38 | 2 | Master |
| calib_master_technique_calibrated_20260613_0066 | Master | 24 | 629 | search | 2 | 52 | 4 | Master |
| calib_master_technique_calibrated_20260613_0067 | Master | 24 | 513 | search | 4 | 30 | 3 | Master |
| calib_master_technique_calibrated_20260613_0068 | Master | 24 | 507 | search | 7 | 30 | 1 | Master |
| calib_master_technique_calibrated_20260613_0069 | Master | 24 | 598 | search | 6 | 45 | 3 | Master |
| calib_master_technique_calibrated_20260613_0070 | Master | 24 | 677 | search | 7 | 47 | 8 | Master |
| calib_master_technique_calibrated_20260613_0071 | Master | 24 | 569 | search | 3 | 42 | 3 | Master |
| calib_master_technique_calibrated_20260613_0072 | Master | 24 | 509 | search | 5 | 33 | 1 | Master |
| calib_master_technique_calibrated_20260613_0073 | Master | 24 | 542 | search | 3 | 37 | 3 | Master |
| calib_master_technique_calibrated_20260613_0074 | Master | 24 | 631 | search | 2 | 46 | 7 | Master |
| calib_master_technique_calibrated_20260613_0075 | Master | 24 | 516 | search | 3 | 32 | 3 | Master |
| calib_master_technique_calibrated_20260613_0076 | Master | 24 | 573 | search | 4 | 40 | 4 | Master |
| calib_master_technique_calibrated_20260613_0077 | Master | 24 | 493 | search | 5 | 31 | 1 | Master |
| calib_master_technique_calibrated_20260613_0078 | Master | 24 | 688 | search | 8 | 53 | 6 | Master |
| calib_master_technique_calibrated_20260613_0079 | Master | 24 | 607 | search | 10 | 42 | 3 | Master |
| calib_master_technique_calibrated_20260613_0080 | Master | 24 | 648 | search | 3 | 50 | 6 | Master |
| calib_master_technique_calibrated_20260613_0081 | Master | 24 | 618 | search | 6 | 41 | 6 | Master |
| calib_master_technique_calibrated_20260613_0082 | Master | 24 | 549 | search | 7 | 34 | 3 | Master |
| calib_master_technique_calibrated_20260613_0083 | Master | 24 | 618 | search | 6 | 44 | 5 | Master |
| calib_master_technique_calibrated_20260613_0084 | Master | 24 | 667 | search | 6 | 46 | 8 | Master |
| calib_master_technique_calibrated_20260613_0085 | Master | 24 | 556 | search | 4 | 38 | 3 | Master |
| calib_master_technique_calibrated_20260613_0086 | Master | 24 | 484 | search | 7 | 27 | 1 | Master |
| calib_master_technique_calibrated_20260613_0087 | Master | 24 | 638 | search | 1 | 53 | 5 | Master |
| calib_master_technique_calibrated_20260613_0088 | Master | 24 | 637 | search | 7 | 49 | 4 | Master |
| calib_master_technique_calibrated_20260613_0089 | Master | 24 | 564 | search | 7 | 41 | 1 | Master |
| calib_master_technique_calibrated_20260613_0090 | Master | 24 | 502 | search | 2 | 34 | 1 | Master |
| calib_master_technique_calibrated_20260613_0091 | Master | 24 | 528 | search | 3 | 37 | 2 | Master |
| calib_master_technique_calibrated_20260613_0092 | Master | 24 | 492 | search | 4 | 31 | 1 | Master |
| calib_master_technique_calibrated_20260613_0093 | Master | 24 | 398 | search | 1 | 17 | 1 | Master |
| calib_master_technique_calibrated_20260613_0094 | Master | 24 | 537 | search | 3 | 34 | 4 | Master |
| calib_master_technique_calibrated_20260613_0095 | Master | 24 | 511 | search | 4 | 35 | 1 | Master |
| calib_master_technique_calibrated_20260613_0096 | Master | 24 | 638 | search | 5 | 49 | 5 | Master |
| calib_master_technique_calibrated_20260613_0097 | Master | 24 | 666 | search | 10 | 46 | 6 | Master |
| calib_master_technique_calibrated_20260613_0098 | Master | 24 | 556 | search | 2 | 45 | 1 | Master |
| calib_master_technique_calibrated_20260613_0099 | Master | 24 | 699 | search | 14 | 49 | 6 | Master |
| calib_master_technique_calibrated_20260613_0100 | Master | 24 | 462 | search | 1 | 29 | 1 | Master |
| calib_master_technique_calibrated_20260613_0101 | Master | 24 | 577 | search | 5 | 42 | 3 | Master |
| calib_master_technique_calibrated_20260613_0102 | Master | 24 | 635 | search | 4 | 47 | 6 | Master |
| calib_master_technique_calibrated_20260613_0103 | Master | 24 | 587 | search | 7 | 41 | 3 | Master |
| calib_master_technique_calibrated_20260613_0104 | Master | 24 | 472 | search | 1 | 31 | 1 | Master |
| calib_master_technique_calibrated_20260613_0105 | Master | 24 | 610 | search | 8 | 45 | 3 | Master |
| calib_master_technique_calibrated_20260613_0106 | Master | 24 | 566 | search | 7 | 42 | 1 | Master |
| calib_master_technique_calibrated_20260613_0107 | Master | 24 | 564 | search | 6 | 41 | 2 | Master |
| calib_master_technique_calibrated_20260613_0108 | Master | 24 | 400 | search | 1 | 17 | 1 | Master |
| calib_master_technique_calibrated_20260613_0109 | Master | 24 | 452 | search | 4 | 23 | 1 | Master |
| calib_master_technique_calibrated_20260613_0110 | Master | 24 | 597 | search | 7 | 44 | 3 | Master |
| calib_master_technique_calibrated_20260613_0111 | Master | 24 | 453 | search | 2 | 26 | 1 | Master |
| calib_master_technique_calibrated_20260613_0112 | Master | 24 | 538 | search | 2 | 37 | 3 | Master |
| calib_master_technique_calibrated_20260613_0113 | Master | 24 | 467 | search | 1 | 27 | 2 | Master |
| calib_master_technique_calibrated_20260613_0114 | Master | 24 | 562 | search | 4 | 38 | 4 | Master |
| calib_master_technique_calibrated_20260613_0115 | Master | 24 | 660 | search | 7 | 48 | 6 | Master |
| calib_master_technique_calibrated_20260613_0116 | Master | 24 | 446 | search | 2 | 25 | 1 | Master |
| calib_master_technique_calibrated_20260613_0117 | Master | 24 | 606 | search | 11 | 41 | 3 | Master |
| calib_master_technique_calibrated_20260613_0118 | Master | 24 | 508 | search | 5 | 32 | 1 | Master |
| calib_master_technique_calibrated_20260613_0119 | Master | 24 | 498 | search | 4 | 32 | 1 | Master |
| calib_master_technique_calibrated_20260613_0120 | Master | 24 | 544 | search | 2 | 39 | 3 | Master |
| calib_master_technique_calibrated_20260613_0121 | Master | 24 | 638 | search | 6 | 45 | 6 | Master |
| calib_master_technique_calibrated_20260613_0122 | Master | 24 | 588 | search | 7 | 44 | 2 | Master |
| calib_master_technique_calibrated_20260613_0123 | Master | 24 | 533 | search | 4 | 37 | 2 | Master |
| calib_master_technique_calibrated_20260613_0124 | Master | 24 | 427 | search | 5 | 19 | 1 | Master |
| calib_master_technique_calibrated_20260613_0125 | Master | 24 | 605 | search | 7 | 45 | 3 | Master |
| calib_master_technique_calibrated_20260613_0126 | Master | 24 | 602 | search | 10 | 39 | 4 | Master |
| calib_master_technique_calibrated_20260613_0127 | Master | 24 | 621 | search | 7 | 43 | 5 | Master |
| calib_master_technique_calibrated_20260613_0128 | Master | 24 | 460 | search | 4 | 25 | 1 | Master |
| calib_master_technique_calibrated_20260613_0129 | Master | 24 | 588 | search | 4 | 45 | 3 | Master |
| calib_master_technique_calibrated_20260613_0130 | Master | 24 | 590 | search | 9 | 42 | 2 | Master |
| calib_master_technique_calibrated_20260613_0131 | Master | 24 | 639 | search | 3 | 49 | 6 | Master |
| calib_master_technique_calibrated_20260613_0132 | Master | 24 | 447 | search | 3 | 23 | 1 | Master |
| calib_master_technique_calibrated_20260613_0133 | Master | 24 | 682 | search | 3 | 54 | 7 | Master |
| calib_master_technique_calibrated_20260613_0134 | Master | 24 | 586 | search | 6 | 42 | 3 | Master |
| calib_master_technique_calibrated_20260613_0135 | Master | 24 | 430 | search | 1 | 22 | 1 | Master |
| calib_master_technique_calibrated_20260613_0136 | Master | 24 | 464 | search | 1 | 26 | 2 | Master |
| calib_master_technique_calibrated_20260613_0137 | Master | 24 | 643 | search | 5 | 52 | 4 | Master |
| calib_master_technique_calibrated_20260613_0138 | Master | 24 | 603 | search | 5 | 45 | 4 | Master |
| calib_master_technique_calibrated_20260613_0139 | Master | 24 | 594 | search | 5 | 43 | 4 | Master |
| calib_master_technique_calibrated_20260613_0140 | Master | 24 | 642 | search | 2 | 53 | 5 | Master |
| calib_master_technique_calibrated_20260613_0141 | Master | 24 | 642 | search | 9 | 48 | 4 | Master |
| calib_master_technique_calibrated_20260613_0142 | Master | 24 | 559 | search | 9 | 36 | 2 | Master |
| calib_master_technique_calibrated_20260613_0143 | Master | 24 | 685 | search | 5 | 51 | 8 | Master |
| calib_master_technique_calibrated_20260613_0144 | Master | 24 | 670 | search | 8 | 52 | 5 | Master |
| calib_master_technique_calibrated_20260613_0145 | Master | 24 | 557 | search | 6 | 39 | 2 | Master |
| calib_master_technique_calibrated_20260613_0146 | Master | 24 | 509 | search | 9 | 29 | 1 | Master |
| calib_master_technique_calibrated_20260613_0147 | Master | 24 | 661 | search | 5 | 53 | 5 | Master |
| calib_master_technique_calibrated_20260613_0148 | Master | 24 | 616 | search | 7 | 50 | 2 | Master |
| calib_master_technique_calibrated_20260613_0149 | Master | 24 | 576 | search | 7 | 37 | 4 | Master |
| calib_master_technique_calibrated_20260613_0150 | Master | 24 | 526 | search | 2 | 33 | 4 | Master |
| calib_master_technique_calibrated_20260613_0151 | Master | 24 | 723 | search | 10 | 53 | 8 | Master |
| calib_master_technique_calibrated_20260613_0152 | Master | 24 | 577 | search | 6 | 38 | 4 | Master |
| calib_master_technique_calibrated_20260613_0153 | Master | 24 | 531 | search | 2 | 38 | 2 | Master |
| calib_master_technique_calibrated_20260613_0154 | Master | 24 | 588 | search | 5 | 43 | 3 | Master |
| calib_master_technique_calibrated_20260613_0155 | Master | 24 | 559 | search | 4 | 40 | 3 | Master |
| calib_master_technique_calibrated_20260613_0156 | Master | 24 | 622 | search | 10 | 45 | 3 | Master |
| calib_master_technique_calibrated_20260613_0157 | Master | 24 | 625 | search | 7 | 46 | 4 | Master |
| calib_master_technique_calibrated_20260613_0158 | Master | 24 | 618 | search | 7 | 49 | 2 | Master |
| calib_master_technique_calibrated_20260613_0159 | Master | 24 | 628 | search | 4 | 50 | 4 | Master |
| calib_master_technique_calibrated_20260613_0160 | Master | 24 | 569 | search | 2 | 43 | 3 | Master |
| calib_master_technique_calibrated_20260613_0161 | Master | 24 | 571 | search | 5 | 38 | 4 | Master |
| calib_master_technique_calibrated_20260613_0162 | Master | 24 | 589 | search | 10 | 44 | 1 | Master |
| calib_master_technique_calibrated_20260613_0163 | Master | 24 | 558 | search | 8 | 38 | 1 | Master |
| calib_master_technique_calibrated_20260613_0164 | Master | 24 | 605 | search | 1 | 47 | 5 | Master |
| calib_master_technique_calibrated_20260613_0165 | Master | 24 | 555 | search | 9 | 38 | 1 | Master |
| calib_master_technique_calibrated_20260613_0166 | Master | 24 | 441 | search | 1 | 23 | 1 | Master |
| calib_master_technique_calibrated_20260613_0167 | Master | 24 | 502 | search | 2 | 35 | 1 | Master |
| calib_master_technique_calibrated_20260613_0168 | Master | 24 | 644 | search | 9 | 48 | 4 | Master |
| calib_master_technique_calibrated_20260613_0169 | Master | 24 | 427 | search | 1 | 21 | 1 | Master |
| calib_master_technique_calibrated_20260613_0170 | Master | 24 | 531 | search | 6 | 34 | 2 | Master |
| calib_master_technique_calibrated_20260613_0171 | Master | 24 | 648 | search | 3 | 48 | 7 | Master |
| calib_master_technique_calibrated_20260613_0172 | Master | 24 | 543 | search | 5 | 37 | 2 | Master |
| calib_master_technique_calibrated_20260613_0173 | Master | 24 | 625 | search | 10 | 43 | 4 | Master |
| calib_master_technique_calibrated_20260613_0174 | Master | 24 | 658 | search | 7 | 53 | 4 | Master |
| calib_master_technique_calibrated_20260613_0175 | Master | 24 | 494 | search | 2 | 29 | 3 | Master |
| calib_master_technique_calibrated_20260613_0176 | Master | 24 | 639 | search | 8 | 48 | 4 | Master |
| calib_master_technique_calibrated_20260613_0177 | Master | 24 | 502 | search | 5 | 32 | 1 | Master |
| calib_master_technique_calibrated_20260613_0178 | Master | 24 | 593 | search | 8 | 41 | 3 | Master |
| calib_master_technique_calibrated_20260613_0179 | Master | 24 | 494 | search | 3 | 32 | 1 | Master |
| calib_master_technique_calibrated_20260613_0180 | Master | 24 | 529 | search | 5 | 34 | 2 | Master |
| calib_master_technique_calibrated_20260613_0181 | Master | 24 | 433 | search | 3 | 21 | 1 | Master |
| calib_master_technique_calibrated_20260613_0182 | Master | 24 | 572 | search | 7 | 38 | 3 | Master |
| calib_master_technique_calibrated_20260613_0183 | Master | 24 | 642 | search | 13 | 46 | 3 | Master |
| calib_master_technique_calibrated_20260613_0184 | Master | 24 | 540 | search | 3 | 39 | 2 | Master |
| calib_master_technique_calibrated_20260613_0185 | Master | 24 | 567 | search | 1 | 42 | 4 | Master |
| calib_master_technique_calibrated_20260613_0186 | Master | 24 | 647 | search | 4 | 47 | 7 | Master |
| calib_master_technique_calibrated_20260613_0187 | Master | 24 | 539 | search | 4 | 36 | 3 | Master |
| calib_master_technique_calibrated_20260613_0188 | Master | 24 | 578 | search | 5 | 39 | 4 | Master |
| calib_master_technique_calibrated_20260613_0189 | Master | 24 | 640 | search | 5 | 47 | 6 | Master |
| calib_master_technique_calibrated_20260613_0190 | Master | 24 | 525 | search | 6 | 30 | 3 | Master |
| calib_master_technique_calibrated_20260613_0191 | Master | 24 | 664 | search | 5 | 51 | 6 | Master |
| calib_master_technique_calibrated_20260613_0192 | Master | 24 | 701 | search | 6 | 53 | 8 | Master |
| calib_master_technique_calibrated_20260613_0193 | Master | 24 | 632 | search | 9 | 41 | 6 | Master |
| calib_master_technique_calibrated_20260613_0194 | Master | 24 | 668 | search | 8 | 49 | 6 | Master |
| calib_master_technique_calibrated_20260613_0195 | Master | 24 | 489 | search | 2 | 29 | 2 | Master |
| calib_master_technique_calibrated_20260613_0196 | Master | 24 | 531 | search | 5 | 32 | 3 | Master |
| calib_master_technique_calibrated_20260613_0197 | Master | 24 | 555 | search | 4 | 37 | 4 | Master |
| calib_master_technique_calibrated_20260613_0198 | Master | 24 | 633 | search | 13 | 42 | 4 | Master |
| calib_master_technique_calibrated_20260613_0199 | Master | 24 | 544 | search | 5 | 35 | 3 | Master |
| calib_master_technique_calibrated_20260613_0200 | Master | 24 | 508 | search | 2 | 30 | 4 | Master |

## Rejected Sample Rows

| intended | givens | score | hardest | advanced moves | search depth | suggested | reason |
|---|---:|---:|---|---:|---:|---:|---|
| Easy | 40 | 422 | search | 1 | 22 | Master | Easy requires singles-only score <= 35 |
| Easy | 40 | 43 | hidden_single | 0 | 0 | Medium | Easy requires singles-only score <= 35 |
| Easy | 40 | 43 | hidden_single | 0 | 0 | Medium | Easy requires singles-only score <= 35 |
| Easy | 40 | 43 | hidden_single | 0 | 0 | Medium | Easy requires singles-only score <= 35 |
| Easy | 40 | 48 | hidden_single | 0 | 0 | Medium | Easy requires singles-only score <= 35 |
| Easy | 40 | 43 | hidden_single | 0 | 0 | Medium | Easy requires singles-only score <= 35 |
| Medium | 34 | 424 | search | 3 | 21 | Master | Medium requires score 36-60, no search, at most one advanced move |
| Medium | 34 | 469 | search | 5 | 28 | Master | Medium requires score 36-60, no search, at most one advanced move |
| Medium | 34 | 496 | search | 5 | 32 | Master | Medium requires score 36-60, no search, at most one advanced move |
| Medium | 34 | 472 | search | 4 | 27 | Master | Medium requires score 36-60, no search, at most one advanced move |
| Medium | 34 | 453 | search | 2 | 28 | Master | Medium requires score 36-60, no search, at most one advanced move |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 52 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 50 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 58 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 56 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 57 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 51 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 49 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 53 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 51 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 51 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 54 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 50 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 49 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 56 | hidden_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 436 | search | 0 | 26 | Master | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 38 | naked_single | 0 | 0 | Medium | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 488 | search | 7 | 28 | Master | Hard requires score 61-95 with candidate logic and no search |
| Hard | 30 | 420 | search | 1 | 22 | Master | Hard requires score 61-95 with candidate logic and no search |
| Expert | 27 | 53 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 59 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 54 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 515 | search | 5 | 35 | Master | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 53 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 52 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 530 | search | 3 | 37 | Master | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 61 | hidden_single | 0 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 59 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 61 | hidden_single | 0 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 56 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 57 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 94 | pointing_pair_triple | 3 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 53 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 60 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 57 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 58 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 61 | hidden_single | 0 | 0 | Hard | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 59 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 40 | naked_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 59 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Expert | 27 | 57 | hidden_single | 0 | 0 | Medium | Expert requires score 96-220 with advanced moves or limited search |
| Master | 24 | 101 | pointing_pair_triple | 4 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 58 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 102 | pointing_pair_triple | 3 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 61 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 58 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 61 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 60 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 57 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master |  |  |  |  |  |  | Could not generate a unique Master puzzle after 3 attempts. |
| Master | 24 | 114 | pointing_pair_triple | 7 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 54 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 58 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 59 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 59 | hidden_single | 0 | 0 | Medium | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 63 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 124 | box_line_reduction | 8 | 0 | Expert | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 61 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 89 | pointing_pair_triple | 2 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |
| Master | 24 | 63 | hidden_single | 0 | 0 | Hard | Master requires score > 220 with deeper advanced/search pressure |

## Calibration Notes

- Easy/Medium candidates are much easier to generate with the current clue-removal algorithm.
- Hard/Expert/Master acceptance rates are the key signal for whether the future generator needs technique-guided clue removal instead of clue-count-only removal.
- Accepted Hard/Expert/Master candidates must show higher technique scores and/or search pressure than Medium candidates.
- Candidate rows are deliberately `is_active: false` and should remain out of production serving until a later reviewed export.
