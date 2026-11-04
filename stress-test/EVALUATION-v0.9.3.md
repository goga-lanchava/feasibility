# Evaluation of Trial Feasibility Pipeline v0.9.3: use case, performance and ease of use

Date: 14 Oct 2026. Build: `feasibility-pipeline.html` v0.9.3 (engine tests 10/10, `tools/build.mjs --check` in sync).
Evidence: the 57 back-tested trials in `results-v093-all57.json` (rounds 1–3), a fresh comparator snapshot for each of them
from ClinicalTrials.gov, and one new hold-out trial (KEYNOTE-407) run through the user interface in headless Chromium.
Every number below is produced by `analysis/evaluate_v093.py` (and `analysis/ui_backtest.cjs` for the hold-out).

> **Status (v0.9.4, `CHANGELOG-v0.9.4.md`):** P1 (matching on patients per site), U1 (planned sites under Study) and U2 (no
> tab jump) are implemented.
> - Measured in the app on the same 57 trials and registry data: median timing error 41% → 33%, log-RMSE 0.73 → 0.65
>   (rule of thumb 0.69), 80% range width 7.6× → 4.6× at 84% coverage, and KEYNOTE-407 13 → 16 months (actual 16).
> - The gain is smaller than the estimate in §2.4 (log-RMSE 0.61), because country rates draw mostly on their own
>   comparators.
> - Matching also needed a minimum of 5 effective comparators: without it, DAPA-HF (3 comparators) went from 18 to 41
>   months.

## Bottom line

1. **The 80% ranges are honest but very wide.** 82% of actual results fall inside them, as intended, but the median range
   spans **7.6×** (p90/p10). For KEYNOTE-407 that reads “recruitment takes 6 to 32 months”. This answers “is the target
   plausible at all?”, not “can we commit to a month?”.
2. **The median forecast is no better than a rule of thumb.** Predicting every trial at the median duration of the other
   trials gives about the same accuracy (median error 44% vs 41%, log-RMSE 0.69 vs 0.73).
3. **The main bias in the stress-test report is mostly a statistical artifact, and v0.9.3's “Fast ×2” scenario rests on
   it.** “Fast trials are forecast 2× too slow” comes from grouping trials by their *actual* duration, which produces that
   pattern for any noisy forecast. Grouped by what you know when planning (the forecast), the error runs the other way: long forecasts are too
   long (+56%) and short ones too short (−19%). The forecasts are too spread out, not too cautious.
4. **One engine change helps clearly: match comparators on planned patients per site.** In the same 57 trials it lowers
   log error from 0.70 to 0.61 and removes the bias in long forecasts (+56% → +6%). Honest 80% ranges narrow from 6.1×
   to 4.7×, and it improves every subgroup defined by planning-time information. The existing “Weight comparators by
   size” option has no measurable effect.
5. **Recommended footprints are optimistic and unrealistic by construction.** The optimizer fills the countries with the
   highest registry rates, several of them resting on 3–8 comparator trials. In KEYNOTE-407 every recommended country had a
   modelled rate above the comparator median: a footprint average of 0.37 patients/site/month against a 0.29 median and
   0.28 actual.
6. **It is easy to start but heavy to read.** A first analysis takes about 30 s and 8 clicks plus typing. But the planned site count
   can't be entered until after a first run. The Plan tab is about 40 screen-heights long with 257 inputs. And finishing
   background work switches you to Report even if you had moved to another tab.

## 1. Fit for the use case (bid defense / feasibility)

| Works well | Falls short |
|---|---|
| Single file, no install, runs in the browser; patient data never leaves the tab; nothing stored server-side | Timing forecast: no skill beyond a rule of thumb (§2.2); ranges too wide to plan a timeline with |
| Registry landscape: competing and completed trials, sites and saturation in seconds (KEYNOTE-407: 499 competing, 476 completed, 9 s) | Recommended countries are not a credible plan (§3); the report already advises using them only as prompts for research |
| Honest wording: ranges first, decision thresholds and assumptions labelled, results withheld while inputs are stale | Same condition string gives the same rate for very different trial designs (fixed partly by §4 P1) |
| Back-test mode (“Registry data as of”), reproducible project files, extensive in-app test suites | Rule-based parsing still needs line-by-line review (KEYNOTE-407: 16 of 36 rules incomplete, 1 contradiction, 2 indication conflicts) |
| Questionnaires, risk flags and investigator-response import give structure to the conversation with sites | The inputs that would sharpen the forecast (your own benchmark rate, investigator rates) are optional and easy to miss |

**Verdict:** today the tool is a good *structuring and screening* tool: landscape, criteria review, risks, site
questions, and “is this plausible?”. It is not yet a *forecasting* tool. §4 lists the changes that would move it toward one.

## 2. Forecast performance on the 57 back-tested trials

### 2.1 Ranges: calibrated, but wide
Actual results fall below p10 in 7% of trials (nominal 10%), below p50 in 54% (50%) and above p90 in 11% (10%), so the
v0.9.3 calibration works. The cost is width: median p90/p10 = **7.6×** (IQR 5.1–10.2×).

### 2.2 The median has no skill over naive baselines
| Method (months from first patient to target) | Median abs. error | Within ±25% | Within ±50% | Log-RMSE |
|---|---|---|---|---|
| Tool v0.9.3 median | 41% | 26% | 60% | 0.73 |
| Rule of thumb: median duration of the other 56 trials | 44% | 26% | 60% | 0.69 |
| Target ÷ (sites × median per-site rate of the other trials) | 65% | 18% | 35% | 1.05 |

The forecast does carry some signal (correlation with actual 0.40), but with too much spread: log(actual) ≈ 0.42 ×
log(forecast) + const. A slope of 1 would mean well-scaled forecasts.

### 2.3 “Fast trials are forecast too slow” is mostly regression to the mean
| Bias of the median, grouped by | Shortest third | Middle third | Longest third |
|---|---|---|---|
| Actual duration (known only afterwards), as in the stress-test report | +75% | +5% | −37% |
| **Forecast duration (known when planning)** | **−19%** | **+0%** | **+56%** |

Sort any set of noisy forecasts by the actual outcome and the fastest trials will look under-predicted. Part of what made
them fast was luck the forecast could not know, so the first row would look like this even for an unbiased model. The
second row is what a planner sees, and it shows the opposite problem: when the tool says “long”, the trial is usually
shorter, and when it says “short”, the trial is usually longer.

Consequence: v0.9.3's “Fast: ×2” scenario cites the first row as its evidence (“trials that recruited within 12 months ran
about twice the registry-based rate”). A planner can't know in advance that a trial will finish within 12 months, so this
evidence does not support ×2 as a planning factor. It should stay a clearly labelled user judgement or be replaced by P1.

### 2.4 Comparator weighting: patients per site is the missing signal
The engine estimates the per-site rate as a median over every completed trial with the same condition string. v0.9.1
added weighting by target size. The residual error, however, correlates most with the trial's **planned patients per
site** (target ÷ sites, r = −0.57): sponsors size footprints to the per-site rate they expect, so this ratio carries their
knowledge of the programme. It is already in the registry for every comparator (enrollment ÷ listed sites).

Same 53 trials (≥ 3 usable comparators), months = target ÷ (sites × comparator rate), no parameters fitted:

| Comparator rate | Median abs. error | Within ±50% | Log-RMSE | Honest 80% width |
|---|---|---|---|---|
| Plain median (before v0.9.1) | 40% | 62% | 0.72 | 6.4× |
| Size-weighted (current default) | 44% | 57% | 0.73 | 6.4× |
| **Matched on planned patients per site** | **39%** | **72%** | **0.62** | **4.9×** |
| Reference class: median recruitment months of similar trials | 45% | 57% | 0.61 | 4.8× |

Applied to the tool's own forecasts (forecast × current rate ÷ matched rate):

| Group | Trials | Tool: median abs. error / bias | With matching |
|---|---|---|---|
| All | 53 | 41% / +0% | **35% / −5%** |
| Rounds 1–2 (large CV and oncology trials) | 9 | 31% / +0% | 19% / −5% |
| Round 3 | 44 | 43% / −5% | 36% / −0% |
| Thin evidence (< 30 comparators) | 21 | 42% / +0% | 35% / +6% |
| Shortest third of forecasts | 20 | 44% / −19% | 37% / −6% |
| Longest third of forecasts | 15 | 56% / +56% | 36% / +6% |

Honest 80% width 6.1× → **4.7×**; slope of actual on forecast 0.45 → 0.69. (“Honest 80% width” is the p90/p10 ratio an
80% range would need, given the observed errors, to contain 80% of actual results: exp(2 × 1.28 × SD of the log error).)
One group defined by the outcome gets worse on median error: trials that actually recruited within 12 months, 69% → 88%
(log error still improves, 0.88 → 0.82). This is an approximation made outside the app.
The replica of the app's comparator set matches it exactly for KEYNOTE-407 (349 usable trials, rate 0.291), but the
change must be implemented and the 57 trials re-run to confirm.

### 2.5 What does not work: correcting the output
A regression of actual on forecast and patients per site, applied to the tool's output, looks good in leave-one-out
(log-RMSE 0.61, 80% width 4.4×). Fitted on round 3 and applied to rounds 1–2, however, it makes them worse (median error
31% → 35%). Fitted multipliers on the output don't transfer between trial types; the information has to enter through the
comparators (2.4), which needs no fitting.

## 3. Hold-out test through the user interface: KEYNOTE-407

NCT02775435, first-line metastatic squamous NSCLC, Merck. **559 randomised at 125 sites in 17 countries, Aug 2016 – Dec
2017 (16 months).** Not among the 57 trials. Same method as the stress test: registry as of the start date (9 Jun 2016),
history from 2004, window 16 + 6 = 22 months. The registry lists no sites, so the published 125 sites are used for the
recommended footprint (as for KEYNOTE-189/-024). Inputs and results: `holdout-keynote407.json`.

| | Tool | Actual |
|---|---|---|
| Recruitment months from first patient (median) | 13 | **16** (−19%) |
| 80% range of participants by month 22 | 259–1,629 (median 651) | 559 ✓ |
| Verdict | “At risk”, 59% of runs reach the target | Target reached |
| Comparator rate (size-weighted) | 0.291 patients/site/month | 0.280 |
| With patients-per-site matching (§2.4) | ≈ 15.5 months | 16 |

- **The comparator rate was nearly exact; the footprint made the forecast optimistic.** The 10 recommended countries
  (India 25, Mexico 25, Portugal 24, Finland 10, Belarus 10, Croatia 9, Indonesia 8, Georgia 7, China 4, Estonia 3) all
  have modelled rates above the median: 0.37 on average, against 0.29. Several rest on 3–8 comparator trials (Estonia 3,
  Belarus 5, Georgia 5, Indonesia 6). Choosing the highest of many noisy estimates is a winner's curse.
- **Parsing:** 36 rules, 8 manual, 16 marked incomplete. Three misreads, all flagged for review but left as is:
  - “Has not received prior systemic treatment for metastatic NSCLC” became an *exclusion* of metastatic disease, which
    contradicts the stage IV inclusion.
  - “Has non-squamous histology NSCLC” became an exclusion of all NSCLC, the trial's own indication.
  - The prior-malignancy exclusion was raised as an indication conflict.
- **Robustness:** no errors; registry query 4–6 s; full run about 9 s; results identical over repeated runs (seeded).

## 4. Recommended improvements, in priority order

### Performance
| # | Change | Evidence | Where / effort |
|---|---|---|---|
| P1 | **Match comparators on planned patients per site**: weight each comparator by the similarity of enrollment ÷ listed sites to target ÷ planned sites (×2 kernel, like the size kernel), alone or with size. Then re-derive the trial-level σ from the matched set and re-run the 57 trials. | §2.4: log-RMSE 0.70 → 0.61, ±50% 60% → 72%, 80% width 6.1× → 4.7×, bias by forecast tercile removed; KEYNOTE-407 13 → 15.5 months (actual 16) | `sizeMatchedRates` and `aggregateWeb` (add `pps` to `items`); the planned site count is the sponsor footprint total, or the budget. Small change; re-running the 57 trials is the main cost (see U5). |
| P2 | **Correct the recommended footprint's optimism.** Evaluate the chosen footprint with more strongly shrunk country rates (shrinkage proportional to evidence, empirical-Bayes style), raise `minEvidence` for large allocations (e.g. ≥ 8 trials for > 10% of sites), and set a default regional cap. Show the forecast at the comparator median next to the optimized one. | §3: footprint rate +28% above the median, forecast 19% too fast; earlier rounds: implausible country mixes | `computeFootprint` and `optimizeAllocCore`. Medium. |
| P3 | **Retire the back-test justification for “Fast ×2”.** Keep the speed scenario only as a labelled user judgement, or drop it once P1 is in. Prefer the benchmark rate, which is user evidence. | §2.3: the ×2 comes from grouping by outcome | `SPEED_SCENARIOS` text and the changelog wording. Small. |
| P4 | **Show the outside view:** “Similar completed trials (same condition, similar size and patients per site) recruited in a median of X months (IQR …), n = …”. | §2.4: as accurate as the model (log-RMSE 0.61), and bid-defense reviewers readily accept it | Report decision summary. Small. |
| P5 | **Report skill, not just coverage:** in every back-test, also score the rule-of-thumb baseline and report the improvement over it. Keep a fixed hold-out set and never tune on it. | §2.2: 82% coverage looked like success while the median had no skill | `analysis/evaluate_v093.py` already computes it. Small. |
| P6 | **Parser:** scope negation (“has not received … for metastatic X”), read histology subtypes (“non-squamous histology X” is a subtype exclusion, not the indication), and offer LLM parsing when confidence is low. | §3 misreads | Rule-based parser. Medium. |

### Ease of use
| # | Change | Why |
|---|---|---|
| U1 | **Add “Planned number of sites” to Study details**, next to the target and window. | Without a country list the run uses 75 sites. Changing it needs a first run, then Plan › budget mode “Custom” › site budget, then a re-run. |
| U2 | **Stay on the user's tab when background work finishes**; show a “Report ready” badge instead. | Reproduced twice: clicked Plan during the sensitivity run and was moved to Report when it finished. |
| U3 | **Progressive disclosure on Plan.** Open on a short summary with the 4–5 levers that matter (sites, window, countries, benchmark rate, speed). Put model assumptions, the country table, flexibility search and decision logs in sub-tabs, closed by default. | Plan is about 40 screens (35,600 px, ~12,900 words, 257 inputs, 35 collapsible sections). |
| U4 | **Ask for the window the way people think about it:** recruitment months (first patient → last patient) plus start-up, both visible; derive the study-start window. | The current field (“from study start incl. start-up”) is a known source of error (round 1: 5/5 false alarms). |
| U5 | **“Back-test a completed trial” by NCT ID:** fetch the condition, enrollment, start date, site list and eligibility; set “as of” and history; run; show forecast vs actual. | Makes P1/P5 cheap to verify and lets users build their own validation set. Today it is 3 hidden settings plus manual data entry (`analysis/ui_backtest.cjs` automates it). |
| U6 | Calculate the forecast ranges and sensitivity scenarios automatically after the main run. | The Report shows “not calculated yet” until the user clicks “Calculate the three ranges”. |
| U7 | Collapse the study-details card to a one-line summary on Plan and Report. | It takes up about a third of the first screen on every tab. |
| U8 | Small fixes: the forecast table in the Report overflows at 1,200 px (the “months from first patient” column is cut off); missing favicon (404 on every load). | Polish. |
| U9 | Prompt for your own data at the right moment. When the result is “At risk” or the range is wider than ~4×, suggest a benchmark rate or investigator rates as the most effective next step. | Registry data alone cannot narrow the range much further (§2). |

## 5. Limits of this evaluation
- The patients-per-site result uses the app's comparator rules but a simplified duration formula outside the app; the
  in-app effect in §2.4 is approximated by rescaling the tool's forecast. It needs implementation and a full re-run.
- Planned patients per site uses registry site counts, which include sites that never enrolled. In real planning the
  planned site count is used, which is what P1 needs.
- One hold-out trial is a check of the workflow, not a validation. The 57 trials are all industry phase 3 trials with
  ≥ 200 participants (rounds 1–2 are large cardiometabolic and oncology trials), and round 3 required explicit recruitment
  windows.

## Reproduce
```
python3 stress-test/analysis/evaluate_v093.py                    # uses analysis/comparators-asof-start.json.gz
python3 stress-test/analysis/evaluate_v093.py --refetch          # rebuilds the snapshot from ClinicalTrials.gov
python3 -m http.server 8765 --bind 127.0.0.1 &                   # then, with Playwright installed:
node stress-test/analysis/ui_backtest.cjs stress-test/holdout-keynote407.json
```
Sources (KEYNOTE-407): [ASCO Post](https://ascopost.com/News/59364), [ClinicalTrials.gov NCT02775435](https://clinicaltrials.gov/study/NCT02775435).
