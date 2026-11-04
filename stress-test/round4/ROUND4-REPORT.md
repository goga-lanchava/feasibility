# Round 4 back-test: 203 finished trials, with a calibration, validation and lockbox split

Date: 2026-10-15. The tool before the change is v0.9.8, called "before" below. The tool after the change is the recalibrated engine, called "after" (v0.9.9 engine; the version label in the app was not changed).

## 1. Trial selection (`analysis/select_round4.cjs`)

- **Source.** ClinicalTrials.gov API v2. Trials are interventional, started 2009–2019 and have at least 3 listed sites (withdrawn trials are the exception). None of them was used in rounds 1–3 or in the KEYNOTE-407 hold-out.
- **Three strata:**
  - **Completed (129).** Results are posted, and the "recruitment details" text gives a recruitment window with two dates. The window must end by the primary completion date.
  - **Terminated for poor enrolment (65).** The `whyStopped` field mentions enrolment, accrual or recruitment. The recruitment window runs from the start date to the actual primary completion date.
  - **Withdrawn for no enrolment (9).** 0 participants enrolled. The planned target and the planned dates are kept.
- **Spread.** The 203 trials cover phases 1, 1/2, 2, 2/3, 3 and 4, and all major therapeutic areas. Each first-condition word is limited to 2 picks per phase cell. Areas in the calibration set: oncology 34, other 25, cardiometabolic 17, neuro/psych 12, infectious 7, respiratory 4, immunology/derm 4.
- **Split.** The split was made **before any forecast was run**. It is a deterministic SHA-256 hash of each NCT id, stratified by stratum:
  - calibration: **103**
  - validation: **50**
  - lockbox: **50**

  The file hashes are recorded below. The lockbox was run exactly once, after the engine was frozen. Its sha256 values are in `FROZEN-v0.9.9.sha256`. The harness refuses to run the lockbox unless `LOCKBOX_FROZEN=yes` is set.

## 2. Blind run (`analysis/run_round4.cjs`)

The application runs in headless Chromium and uses only information known at trial start:

- the condition;
- the registry **as of the start date**, with comparator history from 12 years before;
- the planned target;
- the listed footprint;
- the default start-up.

The forecast is read at "first simulated patient + actual recruitment months", in two ways:

- **Participants (P10/P50/P90).** This applies to every trial.
- **Months from first patient to target (duration).** This applies to completed trials only.

Known compromises:

- The location list is the final registry list, not the list at start.
- Terminated trials no longer show their planned target, so 3× the actual enrolment is used in its place.
- 3 trials produced no forecast, because no country had a registry rate. They are excluded from the scores and listed separately.

## 3. Baseline: before (v0.9.8)

| Set | Trials | Enrolment inside P10–P90 | Median error (abs) | Median error (signed) | Optimistic share | Duration inside P10–P90 | Duration median error (abs) |
|---|---|---|---|---|---|---|---|
| Calibration | 103 | **47%** | 74% | +53% | 72% | 58% | 51% (−7% signed) |
| Validation | 48 | **50%** | 93% | +93% | 73% | 65% | 47% (−25% signed) |
| Completed only (calibration) | 66 | 56% | 56% | +13% | 59% | 58% | 51% |
| Terminated (calibration) | 33 | 33% | 244% | +244% | 94% | n/a | n/a |

**Lean: optimistic.** The actual result fell *below* P10 in 43% of trials and above P90 in only 11%. The P10–P90 range should hold about 80% of results; it held about half. The main patterns:

- **Ranges were too narrow.** The trial-level σ was 0.57, against an observed log error SD of 1.0.
- **Failure cases were missing.** No trial ever recruited far below its comparators.
- **Large industry footprints were over-predicted by about 1.4×.** Activation is slow and only a few sites enrol most patients.
- **Thin evidence made it worse.** With fewer than 30 usable comparators, the median miss was about 100% or more.

## 4. Changes (tuned on calibration, checked on validation)

| Change | Parameter (default) | Evidence |
|---|---|---|
| Wider trial-level spread | σ = 1.2 × comparator SD, within [0.5, 1.2] (was 0.8×, [0.3, 0.9]) | Completed-trial coverage 56% → 77% on its own |
| Slow-trial mixture: 15% of simulated trials recruit at 0.3× | `slowShare 0.15`, `slowFactor 0.3` | Terminated trials sat at about 0.3× their forecast. Coverage of terminated trials 33% → 76% |
| Activation spread grows with footprint: stagger = max(3, min(18, √sites)) months | `staggerSites 1` | Corrects the over-prediction for large footprints. Completed-trial median error +22% → −1% on validation |
| Site-level heterogeneity: a few sites carry enrolment | `sigma 0.8` (was 0.4) | Mean is unchanged. It widens small-footprint plans, which were most often below P10 |
| Thin-evidence handling: fewer than 30 usable comparators → σ at its cap, plus a warning | `thinN 30` | Thin-evidence cases had about 2× the error |
| "No forecast" warning instead of a blank or zero curve | — | 3 trials returned a zero curve with no explanation |

**Tested but not adopted: a patients-per-site elasticity** (`ppsElasticity`, left at 0). The offline regression found a signal and validation reproduced it (coefficient 0.39 on calibration, 0.55 on validation). When run in the app, though, it made forecasts *more* optimistic on calibration, so it stays off.

## 5. Results: after (frozen engine)

| Set | Trials | Enrolment inside P10–P90 | Median error (abs) | Median error (signed) | Optimistic share | Duration inside P10–P90 | Duration median error (abs, signed) |
|---|---|---|---|---|---|---|---|
| Calibration | 103 | 47% → **78%** | 74% → 66% | +53% → +25% | 72% → 62% | 58% → **83%** | 51% → 56% (+13%) |
| Validation | 48 | 50% → **83%** | 93% → 74% | +93% → +60% | 73% → 62% | 65% → **90%** | 47% → 48% (+7%) |
| **Lockbox (one run)** | 49 | 65% → **86%** | 68% → 61% | +55% → +24% | 69% → 61% | 77% → **90%** | 50% → 49% (+12%) |
| Lockbox, completed only | 31 | 81% → 94% | 55% → 55% | +10% → −8% | 58% → 45% | 77% → 90% | 49% |
| Lockbox, terminated | 16 | 44% → 81% | 176% → 126% | n/a | 88% | n/a | n/a |

**Lean after the change:**

- **Completed trials are now close to neutral.** The signed median is −9%, −1% and −8% across the three sets, and the optimistic share is about 45%.
- **Duration leans slightly pessimistic,** by +7% to +13%.
- **Terminated trials are still optimistic at the median,** which is expected: the tool cannot know a trial will fail. Their actual results now usually fall inside P10–P90.

## 6. What it costs, and what is still weak

- **Ranges are much wider.** The median P90/P10 ratio is about 5× before and about 22–28× after. Most of the widening comes from the slow-trial mixture: P10 now sits inside the "slow trial" scenario. That is honest about the risk, but too wide to plan sites from. For planning, read P50 and a P25–P75 band, and treat P10 as the downside if the trial stalls.
- **Point accuracy improved only modestly.** The median miss on participants is still 55–75%, and on duration it is still about 50%. Registry data alone cannot separate fast trials from slow ones. Benchmarks or site surveys remain the main lever, and the existing benchmark import stays the recommended path.
- **Withdrawn trials (0 enrolled) are always missed,** 0 of 7. The tool has no "never starts" outcome.
- **The sample is enriched for failures.** About 32% of the sample is terminated, against roughly 5–10% in practice, so the "all trials" rows understate coverage on a typical portfolio. Read the completed-only rows for typical trials.
- **The lockbox numbers came out slightly better than validation.** That points to sampling noise at 50 trials (±10 points on coverage), not overfitting. Report about 80–85% coverage, not 86%.

## 7. Files

- `round4/{calibration,validation,lockbox}.json`: the selected trials and the inputs used.
- `round4/results/baseline-*.jsonl`: the v0.9.8 runs, done before any change.
- `round4/results/grid1-*.jsonl` and `grid2-*.jsonl`: the parameter search on calibration and validation.
- `round4/results/final-*.jsonl`: before and after on the same registry snapshot, for all three sets. The lockbox appears only here.
- `analysis/score_round4.py <file> --config v099|v098 [--by stratum|phase|area|thin]`: re-scores any result file.

## 8. Narrowing round (follow-up, same day)

**Goal:** narrower ranges without losing the coverage gain. The first lockbox had already been spent, so a **fresh lockbox (`lockbox2.json`, 49 new trials, no overlap with any earlier set)** was drawn before tuning results were looked at. It was run once, after freezing (`FROZEN-v0.9.9-narrow.sha256`).

**How the setting was chosen:** `analysis/tune_round4.py` ranks configurations by the 80% interval score on the log scale. The score rewards narrow ranges and penalises misses ×10. Strata are re-weighted to a realistic portfolio of 88% completed and 12% terminated, instead of the failure-enriched sample. Two grids were run on calibration and checked on validation: 26 and 13 configurations (`results/grid3-*`, `results/grid4-*`).

**What drives width:**
- **The main cause is the σ cap and how often it is forced (the thin-evidence rule).** With `thinN 30`, about half of all trials got the widest uncertainty.
- **The slow-trial share is secondary.**
- **There is a floor.** With today's median miss (log error SD ≈ 0.9–1.05), an honest 80% range must be about 10–15× wide. The old 5× was overconfident, not precise.

**Chosen ("narrow"):**

| Parameter | Value |
|---|---|
| `thinN` | 10 (was 30) |
| `sigmaK` | 0.9 (was 1.2) |
| `slowShare` | 0.10 (was 0.15) |
| Unchanged | σ cap 1.2, `slowFactor` 0.3, site σ 0.8, `staggerSites` 1 |

**Results.** "Wide" is the first v0.9.9 setting. Coverage is shown for the realistic mix, with completed trials only in brackets.

| Set | Setting | P90/P10 width | Inside P10–P90 | Interval score |
|---|---|---|---|---|
| Calibration | wide → narrow | 21.5× → 9.3× | 82% → 75% (83% → 77%) | 3.86 → 4.06 |
| Validation | wide → narrow | 26.7× → 10.7× | 88% → 80% (90% → 83%) | 3.74 → 3.44 |
| **Lockbox 2 (one run)** | v0.9.8 / wide / narrow | 5.4× / 26.6× / **8.8×** | 56% / 76% / **70%** (60% / 80% / **73%**) | 4.94 / 4.01 / 4.13 |

**Lockbox-2 reading:**
- **Narrowing worked on width:** about 3× narrower than "wide".
- **Coverage fell short of target on fresh data:** 70–73%, against the 80% goal. Validation showed 80–83%.
- **"Wide" scored slightly better on this set.** Both clearly beat v0.9.8.
- **The lockbox-2 completed trials recruited faster than forecast** (median −29%, pessimistic), unlike the earlier sets. Lean flips from set to set, which is another sign that point accuracy, not the range rule, is the limit.
- **Coverage of the P25–P75 band** (completed trials) is 37% narrow / 47% wide / 40% v0.9.8, against the 50% it should be.

**Honest summary across all held-out data** (validation + lockbox 2, about 100 trials):
- narrow: about 75% coverage at about 10× width;
- wide: about 82% coverage at about 26× width;
- v0.9.8: about 55% coverage at about 5× width.

Nothing more was tuned after lockbox 2. Any further change needs another fresh test set.

## 9. Re-run of the first 50-trial lockbox with the committed v0.9.9 (narrow)

This is not a blind test: that set had already been seen once. The narrow setting, however, was tuned without it. The data is a fresh registry snapshot, with all three settings run on it (`results/v099-lockbox1.jsonl`).

| | v0.9.8 | v0.9.9 (narrow) |
|---|---|---|
| Inside P10–P90, all trials | 65% | **76%** |
| Inside P10–P90, completed only | 81% | 81% |
| Inside P10–P90, terminated for poor enrolment | 44% | **75%** |
| Inside P25–P75, completed (should be 50%) | 32% | **55%** |
| Median error, completed (signed) | +10% | **−2%** |
| Share of forecasts that were too optimistic | 69% | **61%** |
| Duration inside P10–P90 | 77% | **81%** |
| Median miss (participants) | 68% | 65% |
| Width P90/P10 | 5.1× | 8.4× |
| Interval score (realistic mix) | 3.03 | 3.05 (tie) |

**Reading.** On this set, v0.9.8 already did well on normally completed trials. The improvement shows in four places:
- trials that stalled;
- the middle band;
- the removed optimistic lean;
- duration.

The cost is a range about 1.6× wider. Point accuracy barely moved.
