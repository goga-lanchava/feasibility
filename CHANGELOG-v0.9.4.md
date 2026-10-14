# v0.9.4 — comparators matched on planned patients per site; planned sites under Study; no tab jump

Source: `stress-test/EVALUATION-v0.9.3.md` (improvements P1, U1 and U2). Builds on v0.9.3.

## Result (57 back-tested trials, re-run in the application; `stress-test/results-v094-all57.json`)
Both engines were run on the same registry snapshot per trial (`stress-test/results-v094-rerun.jsonl`), with the same
method as `results-v093-all57.json`. The v0.9.3 column reproduces that file exactly.

| | v0.9.3 | v0.9.4 |
|---|---|---|
| Median abs. timing error (months from first patient) | 41% | **33%** |
| Timing log-RMSE (rule of thumb “median duration of the other trials”: 0.69) | 0.73 | **0.65** |
| Actual result inside the 80% range | 82% | **84%** |
| Median width of the 80% range (p90/p10) | 7.6× | **4.6×** |
| Slope of log(actual) on log(forecast) (1 = well scaled) | 0.42 | 0.57 |
| Rounds 1–2 (9 large trials): median error / coverage | 31% / 9 of 9 | **16%** / 9 of 9 |
| Round 3 (48 trials): median error / coverage | 43% / 79% | **33%** / 81% |
| < 30 usable comparators: coverage / width | 68% / 9.0× | **84%** / 5.7× |
| Longest third of forecasts: median bias | +56% | +27% |
| KEYNOTE-407 hold-out (not among the 57): months, actual 16 | 13 | **16** |

The improvement is smaller than the offline estimate in the evaluation (log-RMSE 0.61), because country rates mostly come
from each country's own comparator trials and only partly from the matched global rate. The median forecast now beats the
rule of thumb, though modestly. The ranges stay honest and are much narrower. Matching applies in 45 of the 57 trials; the
other 12 have fewer than 5 effective comparators with a similar load, or fewer than 3 usable comparators, and keep the
v0.9.3 weighting.

Caveat: the back-tests use each trial's final registry site count, and sponsors sometimes add sites when recruitment is
slow. Part of the gain may come from that, and would not be there when planning prospectively with the planned site count.

## Engine
- **Comparator trials matched on planned patients per site.** When the site count is the user's own, each comparator's
  enrollment ÷ listed sites is compared with target ÷ planned sites (weight 0.61 at 2× more or fewer), replacing the size
  weighting. The site count is the user's own when every proposed country has a site count, or a planned number of sites
  is entered under Study. The same weights give the country rates and the trial-level σ. The σ rule (0.8 × weighted SD, kept within
  0.3–0.9) was checked on the re-run and left unchanged.
  - The planned load is kept within the 5th–95th percentile of the comparators' loads. An undersized plan is therefore
    never matched to rates no comparator reached, and a load above that range is a risk flag.
  - Fewer than 5 effective matched comparators keep the size weighting (the same minimum as for measuring the spread),
    so thin evidence cannot rest on one or two trials. In the back-tests this kept DAPA-HF (3 comparators) at 18 months,
    actual 19 (41 without the minimum).
  - Off switch: Plan › Model assumptions › “Match comparator trials on planned patients per site”. A project file stores
    it as `fpp.ppsMatch` (files without it load as 1).
- Plan shows the comparator basis, e.g. “Comparator rate 0.24 patients/site/month: 349 completed comparator trials
  weighted by how closely their patients per site match this plan (4.5 = 559 ÷ 125 planned sites …)”. The executive
  summary repeats it.

## Changes
- **Planned number of sites under Study details**, next to the target and window. It is part of the study (`brief.plannedSites`):
  - It anchors the matching and also sets the recommended footprint's size (Plan › Custom), with no first run or visit to
    Plan needed.
  - Clearing it restores the default 75.
  - The review checklist's “Planned sites” row shows the plan's patients per site, or asks for the number.
- **What-ifs keep the plan's matched comparators.** Changing the site budget under Plan, applying a flexibility option or
  searching for the sites needed for 80% adds or removes sites at the plan's matched per-site rate. A search's result is
  therefore what applying it shows.
  - Example: on KEYNOTE-407, 200 sites reach the target in 79% of runs, both in the search and after applying.
  - Without the anchor, the rate would be re-matched to 200 sites and the applied plan would show 70%.
  - This also avoids leaning on the site-count relationship for added sites, which may partly reflect rescue sites in
    the back-test data.
- **Finishing a run no longer moves you.** If you open another tab while the analysis runs, you stay there and see “The
  analysis is complete: the Report is ready”. Staying put still opens the Report.
- Risk flags: planned load above 95% of comparators (medium), below 5% (info); comparators not matched on patients per
  site, with the reason (info).

## Tests
- New view checks (27 → 31):
  - matching and its fallbacks (no site count, option off, older data without loads, too few similar comparators, clamp);
  - the planned-sites field (budget, anchor kept under a Plan budget what-if, precedence of a complete footprint, clearing,
    review row, project validation);
  - forecast basis, rate kept for a budget what-if and clamp flag on the fixture;
  - staying on the user's tab after a run.
- `tests/run-app-suites.cjs` runs every in-app suite headless (needs a localhost server and Playwright).
- Results (headless Chromium, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20,
  project 21/21, R3 33/33, view 31/31, flex 17/17, Gemini 30/30. `node --test tests/kernels.test.mjs` 10/10;
  `node tools/build.mjs --check` in sync (the kernels are unchanged).
- `stress-test/analysis/rerun_backtests.cjs` re-runs the back-tests in the application. It reproduces
  `results-v093-all57.json` exactly with matching off. `compare_v094.py` produces the table above and the σ check.
