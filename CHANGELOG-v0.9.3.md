# v0.9.3 — calibration from 57 back-tested trials

Source: round 3 of `stress-test/STRESS-TEST-REPORT.md` (48 trials selected automatically from ClinicalTrials.gov results
records, plus the 9 trials of rounds 1–2). Builds on v0.9.2.

## Result (all 57 trials re-run; `stress-test/results-v093-all57.json`)
| | v0.9.2 | v0.9.3 |
|---|---|---|
| Actual result inside the 80% range | 63% (36/57) | **82% (47/57)** |
| Median timing bias | ≈ 0% | **0%** |
| Median absolute timing error | ≈ 40% | 41% (unchanged: ranges, not the median, were the problem) |
| Inside 80% range, ≥ 30 comparators / < 30 (now flagged) | 65% / 50% (round 3) | 94% / 68% |

## Engine
- The trial-level multiplier is now **median-preserving** (`exp(σz)`), because the comparator rate it scales is a median of trials.
  A first attempt kept the mean-preserving form `exp(σz − σ²/2)`; with the wider σ it shifted the median forecast ~30% slower
  (bias +29% over 57 trials) — caught by the back-test and corrected. With σ = 0 results stay bit-identical to the frozen references.

## Changes
- **Wider, calibrated trial-level uncertainty.** The automatic trial-level σ is now 0.8 × the weighted SD of comparator trials'
  log per-site rates, kept between 0.3 and 0.9 (was 0.5 × SD, 0.15–0.6); 0.9 when fewer than 5 comparators exist. In round 3
  only 58% of actual results fell inside the 80% range with the old setting. A user value still overrides it.
- **Range first.** The decision summary and executive summary now lead with “8 in 10 simulated runs randomize X–Y
  participants by month D (median M). Recruitment from the first patient takes A to B months in 8 of 10 runs.”
- **Recruitment speed scenario and benchmark rate** (Plan, next to the site budget):
  - Speed scenario: Typical (default, ×1), Fast (high-volume sites, common or single-visit indication, ×2), Slow (rare
    population, complex protocol, ×0.75). Round 3 found no overall bias, so no global factor is applied by default.
  - Benchmark rate (patients/site/month, optional): re-centres every country on the user's own benchmark while keeping the
    registry's relative country differences.
  - Either one adds an “uses a user assumption” note to the risks and the executive summary.
- **Thin-evidence warning** at < 30 usable completed comparators (risk flag and registry status; was a < 50 status note).
  Round 3: median timing error 63% with < 30 comparators vs 37% with ≥ 30.

## Tests
- New view check “Calibration” (speed scenario ×2, benchmark re-centring, thin-evidence flag, range-first summary, project file
  rejects an unknown scenario). View suite 26 → 27.
- Updated: the v0.9.1 view check that asserted the thin-evidence σ of 0.6 now asserts 0.9 (the rule it tests was changed here).
- Made deterministic: the flex check “a search is stopped when an input changes while it runs” changed the input after a fixed
  30 ms, which intermittently came after the search had finished; it now changes the input on the search's first progress
  report. The assertion is unchanged.
- Results (browser, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33,
  view 27/27, flex 17/17 (twice in the same run), Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10;
  `node tools/build.mjs --check` in sync.
