# Stress test: forecast vs actual recruitment, 5 completed trials

## v0.9.3 — calibration applied and verified on all 57 trials (14 Oct 2026; `CHANGELOG-v0.9.3.md`)

Same method as round 3 for every trial; per-trial results in `stress-test/results-v093-all57.json`.

| | Trials | Actual inside 80% range | Median abs. timing error | Median bias |
|---|---|---|---|---|
| **All** | 57 | **82%** (was 63%) | 41% | **0%** |
| Rounds 1–2 | 9 | 100% | 31% | 0% |
| Round 3 | 48 | 79% | 43% | −5% |
| Recruited ≤ 12 months | 22 | 77% | 75% | +75% (still too slow) |
| Recruited > 12 months | 35 | 86% | 36% | −25% |
| ≥ 30 usable comparators | 32 | 94% | 41% | −13% |
| < 30 usable comparators (now flagged in every case) | 25 | 68% | 42% | 0% |

Reading: the ranges are now honest (82% coverage for a nominal 80%), the median is unbiased overall, and the thin-evidence
warning fires exactly when coverage is weakest. The median's accuracy did not change — registry data alone cannot tell a fast
programme from a slow one; that is what the new speed scenario and benchmark rate are for (user assumptions, labelled in the report).

## Round 3 — 48 more trials from ClinicalTrials.gov results records (v0.9.2, 14 Oct 2026)

**Selection (automatic, reproducible):** all 4,867 completed industry phase 3 trials with posted results, started 2008–2019,
≥ 200 participants. Kept only records whose results “recruitment details” state an explicit recruitment/enrolment/randomisation
window (e.g. “1134 participants were randomized between February 2017 and February 2019”), rejecting study-conduct wording
(“took part”, “participated”, “was conducted”, screening-only dates) and any window that runs up to primary completion
(minus the stated follow-up) — that check removed 90 conduct-period windows. Also excluded: extensions/follow-up studies,
vaccines/healthy volunteers, < 20 listed sites, missing inclusion/exclusion text, the 9 trials already used.
Result: **48 qualifying trials** (2 short of 50; the rules were not loosened). Spot-checked 12 extracted windows against the
source wording. Inputs: `stress-test/inputs-round3.json`; results: `stress-test/results-round3.json`.
Same method as rounds 1–2: fair back-test (registry as of the trial's start), real footprint, forecast read at first patient +
actual months. (The optional sensitivity scenarios were skipped to save time; they do not affect the main forecast.)

| Group | Trials | Median abs. timing error | Within ±25% | Within ±50% | Median bias (+ = too slow) | Actual inside 80% range |
|---|---|---|---|---|---|---|
| **All round 3** | 48 | **40%** | 33% | 56% | **+1%** | **58%** (13 above p90, 7 below p10) |
| Oncology | 14 | 40% | 29% | 64% | −23% | 50% |
| Cardiometabolic | 10 | 88% | 40% | 40% | +53% | 60% |
| Other (GI, bone, urology, derm, pain …) | 15 | 78% | 27% | 40% | +78% | 47% |
| Immunology / Neuro / Infectious | 9 | 28–47% | — | — | — | 75–100% |
| Recruited in ≤ 12 months | 20 | 100% | 35% | 35% | **+100%** | 50% |
| Recruited in > 12 months | 28 | 35% | 32% | 71% | **−22%** | 64% |
| ≥ 30 completed comparators | 26 | 37% | 35% | 65% | −10% | 65% |
| < 30 completed comparators | 22 | 63% | 32% | 45% | +17% | 50% |
| ≥ 1,500 participants | 5 | 100% | 20% | 20% | +100% | 80% |

**All 57 trials (rounds 1–3):** median absolute timing error ≈ 40%; actual inside the 80% range in 36/57 (63%).

**What the larger set shows**
1. **No overall bias → no global recalibration.** The median forecast/actual ratio is 1.01; half the trials are forecast too
   slow, 44% too fast. A blanket “Rate calibration ×” would make as many forecasts worse as better.
2. **The model regresses every trial to the comparator median.** Fast trials (≤ 12 months) are forecast ~2× too slow; slow
   ones ~22% too fast. The registry cannot tell a fast programme from a slow one — sponsor execution, site quality,
   patient demand and protocol burden are not in it.
3. **The uncertainty ranges are too narrow.** Real per-site rates vary around the model with a log-SD of ≈ 0.82, but the
   trial-level term is ≈ 0.49 (13/48 at the 0.6 cap). Simulated coverage of the 80% range by trial-level σ:
   0.5 → 58–65%, 0.6 → 67–79%, **0.7 → 75–83%, 0.8 → 83–88%**. → Raising the default (≈ 0.8 × comparator SD, cap ≈ 0.9) would make
   the ranges honest; they would also be wider (roughly ×0.35 to ×2.8 around the median).
4. **Thin comparator sets hurt** (< 30 completed trials: 63% vs 37% error). The condition term matters: 5 trials hit the
   thin-evidence fallback (e.g. “Severe Nodular Acne”, “Chronic Constipation”, “Steroid-induced osteoporosis”).
5. **Worst misses are short, high-throughput trials:** colorectal cancer 849 patients at 29 sites in 8 months (3.7/site/month
   vs model 0.2), acne, molluscum, erectile dysfunction, constipation — specialty or single-visit indications where sites
   recruit very fast.
6. **Parsing on 48 new protocols:** no zero-rule failures; contradictions flagged in 6 trials, indication conflicts in 18
   (mostly “prior malignancy” in cancer trials and broader-category exclusions), median 21 rules of which 46% are manual review.
7. **Robustness:** 48/48 runs completed and current; one rare-disease query (medullary thyroid cancer, 0 completed comparators
   in 2012) took ~4 minutes to settle but finished.

**Recommended next changes (evidence-based):** (a) trial-level uncertainty default ≈ 0.8 × comparator SD, cap 0.9;
(b) show the forecast as a range first and the median second; (c) a “fast-recruiting indication / high-volume sites” scenario
or user-entered benchmark instead of a global factor; (d) warn when fewer than 30 completed comparators are found and suggest
broader condition terms.

## Round 2 fixes verified (v0.9.2, 14 Oct 2026; `CHANGELOG-v0.9.2.md`)

All nine back-tests were rerun with v0.9.2 (same method as below).
- **Forecasts:** identical to v0.9.1, as intended (model untouched): median |error| 36%, 8/9 actuals inside the 80% range.
- **STEP 1 with its real 6-month window:** now recommends 128 sites (was none), the allocation diagnostics explain that the
  window is not longer than start-up, and the review checklist warns before the run.
- **Parsing:** rule contradictions across the nine protocols 8 → **0** (all were KEYNOTE-024). Remaining indication-conflict
  warnings are genuine review points: “prior malignancy” exclusions in the three cancer trials and KEYNOTE-189's
  squamous-histology exclusion. All 16 round-2 misreads below now parse correctly (parser suite 83 → 100 cases).
- No errors in 10 runs; all results current. All test suites pass (see changelog).

## Round 2 — four more trials, all nine scored the same way (v0.9.1, 14 Oct 2026)

**New trials** (inputs: `stress-test/inputs-round2.json`; eligibility = ClinicalTrials.gov text; real footprint = registry
location list; actuals from published sources):

| Trial | Area | Randomised | Sites / countries | Recruitment | Months |
|---|---|---|---|---|---|
| MONALEESA-2 | HR+/HER2− advanced breast cancer | 668 | 223 / 29 | Jan 2014 – Mar 2015 | 14 |
| STEP 1 | Obesity | 1,961 | 129 / 16 | Jun – Nov 2018 | 6 |
| CLARITY AD | Early Alzheimer disease | 1,795 | 235 / ~14 | Mar 2019 – Mar 2021 | 25 |
| KEYNOTE-024 | PD-L1 ≥ 50% NSCLC | 305 | 102 / 16 | Sep 2014 – Oct 2015 | 13 |

Considered but **excluded because the recruitment end date could not be verified**: PARADIGM-HF, DAPA-CKD, SELECT-COMPARE,
SURMOUNT-1 (scoring against unverified dates would make the test meaningless).

**Method (all nine trials):** fair back-test (registry data as of the trial's start date, history from 12 years before),
target = actual randomised, real footprint where the registry lists sites (KEYNOTE-189/-024: recommended plan at the published
site count). The window was set to actual recruitment months + the 6-month default start-up, and the forecast is read at
**first simulated patient + actual recruitment months**, so it is compared like-for-like with a published recruitment period.
(Round 1's probabilities used the bare recruitment months as the window, which includes start-up and biases them low.)

| Trial | Actual months | Forecast months (first patient → target) | Error | Forecast 80% range vs actual randomised | Inside? |
|---|---|---|---|---|---|
| DAPA-HF | 19 | 20 | +5% | 2,074–9,794 vs 4,744 | ✓ |
| KEYNOTE-189 (126 sites) | 14 | 15 | +7% | 328–1,049 vs 616 | ✓ |
| CLARITY AD | 25 | 22 | −12% | 1,288–3,516 vs 1,795 | ✓ |
| KEYNOTE-024 (102 sites) | 13 | 10 | −23% | 250–747 vs 305 | ✓ |
| MONALEESA-2 | 14 | 19 | +36% | 267–913 vs 668 | ✓ |
| EMPA-REG OUTCOME | 32 | 18 | −44% | 6,497–27,611 vs 7,034 | ✓ |
| LEADER | 20 | 33 | +65% | 2,706–12,220 vs 9,340 | ✓ |
| STEP 1 | 6 | 12 | +100% | 459–2,178 vs 1,961 | ✓ |
| SUSTAIN-6 | 11 | ≈23 | +109% | 805–2,882 vs 3,297 | ✗ |
| **Summary** | | | **median |error| 36%**; 4/9 within ±25%, 6/9 within ±50%; 5 too slow, 4 too fast | | **8/9** |

**What this says about real-life usability**
1. **The ranges are now roughly honest but wide.** 8 of 9 actual results fall inside the 80% range (nominal 80%), but the
   ranges span about ×4. Useful for “is this plausible at all?”, not for committing to a month.
2. **The central estimate is a reasonable first guess for ordinary programmes** (DAPA-HF, KEYNOTE-189, CLARITY AD, KEYNOTE-024
   within ±25%) and **systematically too slow for exceptionally fast ones** (STEP 1 ≈ 2.5, SUSTAIN-6 1.3, LEADER 1.1
   patients/site/month). The registry cannot see sponsor execution, site quality or patient demand; those need
   `Rate calibration ×` or investigator-reported rates.
3. **Condition terms matter.** “Heart failure with reduced ejection fraction” found 3 completed comparators in 2017
   (thin-evidence fallback); obesity found trials with a median 2.3 patients/site/month — the comparator set drives the answer.
4. **Recommended footprints remain unreliable.** Examples (back-test): MONALEESA-2 → Ukraine, Brazil, Sweden, Denmark,
   Switzerland; CLARITY AD → China, Russia, Ukraine, South Africa (the real trial: North America, Europe, Japan/Asia);
   KEYNOTE-024 → Mexico, Portugal, Sweden, India. Use them only as prompts for country research.

**New problems found**
- **Bug — window ≤ start-up gives an empty recommendation with no explanation.** STEP 1 with its real 6-month window: every
  country's value (rate × (window − start-up)) is 0, so nothing is recommended and the forecast is 0% with no message.
- **Parser misreads not seen in round 1:**
  - “aged greater than or equal to (>=) 50 and less than or equal to (<=) 90” → `age <= 50`; “BMI greater than (>) 17 and
    less than (<) 35” → `BMI <= 17` (an operator repeated in brackets after the words; ClinicalTrials.gov also escapes it as `\>=`).
  - “Systolic BP > 160 or < 90” → `BETWEEN 160 AND 90` (impossible range).
  - “Stage IV NSCLC **lacking** EGFR … and/or ALK …” → EGFR/ALK **positive** (“lacking” is not treated as a negation).
  - “Female participants … must have a negative pregnancy test” / contraception lines → `sex = female` inclusion and
    chemotherapy/pembrolizumab rules from “after the last dose of …”.
  - “at least 1 standard deviation below the **age-adjusted** mean” → `age >= 1`.
  - “BMI ≥ 30 or ≥ 27 with at least one weight-related comorbidity: hypertension, …” → BMI ≥ 30 **and** hypertension required.
  - “If receiving an approved AD treatment, stable for 12 weeks” → Alzheimer's and “newly diagnosed” rules.
  - “Age < 60 and amenorrhoea for 12 or more months” → `age BETWEEN 12 AND 60`; postmenopausal alternatives become separate,
    jointly impossible age rules; “locoregionally recurrent or metastatic” becomes two required statuses.
  - “self-reported **change in** body weight > 5 kg” → `body weight > 5`; “NYHA functional **classification** III–IV” not
    recognised as a severity qualifier; “specimen not evaluable for PD-L1” → PD-L1 negative.
  - The contradiction check caught 8 of these in KEYNOTE-024 and the indication-conflict check flagged MONALEESA-2,
    CLARITY AD and KEYNOTE-024 — so a reviewer is warned, but the rules are still wrong until reviewed.
- Robustness: 17 runs in round 2, no errors, every result current.

**Suggested next fixes:** explain and handle window ≤ start-up (rank by rate, warn); the parser patterns above (bracketed
operators and `\>` escapes, “X or Y” outside ranges, “lacking”, pregnancy/contraception context, “age-adjusted”, “If receiving…”,
“with at least one of the following” alternatives, “change in”, “classification III–IV”); then a larger validation set before any
change to the default rate.

Sources (round 2): [ASCO Post — MONALEESA-2](https://ascopost.com/issues/july-25-2022/addition-of-ribociclib-to-letrozole-improves-survival-in-women-with-hr-positive-her2-negative-advanced-breast-cancer),
[MD Anderson — MONALEESA-2 sites](https://www.mdanderson.org/newsroom/2016/10/md-anderson-led-stud.html),
[ClinicalTrials.gov — STEP 1](https://clinicaltrials.gov/study/NCT03548935), [PMC — STEP 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC8089593),
[RxFiles — CLARITY AD](https://www.rxfiles.ca/RxFiles/uploads/documents/ts-CLARITY-AD-TRIAL-SUMMARY-2023.pdf),
[Wiki Journal Club — KEYNOTE-024](https://www.wikijournalclub.org/wiki/KEYNOTE-024).

---

## Update — v0.9.1 rerun (after fixes; details in `CHANGELOG-v0.9.1.md`)

Two corrections to the original findings below:
- **Time windows were not dropped.** Windows such as “within 2 months” are stored, evaluated against dated records and shown as a
  chip; only the Logic column hid them. Finding 6's “lose their time window” items were wrong, and the EMPA-REG stroke/TIA rule
  was switched off by mistake and has been restored. The Logic column now shows windows, exceptions and conditions.
- **Indication conflicts were flagged** for SUSTAIN-6 and KEYNOTE-189 (the check existed); the wording assumed oncology.

Same five trials, same inputs, v0.9.1 defaults. **Fair back-test** = registry data as of each trial's start date
(completed trials finished by then, competing trials running then, history window = 12 years before).
Months = recruitment months from the first patient (≈ = extrapolated). Range = 8 in 10 runs, randomised by the actual deadline.

| Trial | Actual | Original run (today's data) | v0.9.1, today's data | **v0.9.1, fair back-test** | Back-test range at deadline vs actual |
|---|---|---|---|---|---|
| EMPA-REG (real footprint) | 32 mo | 28 (−12%) | 28 (−12%) | **18 (−44%)**, P 75% | 5,075–21,588 vs 7,034 ✓ |
| LEADER (real footprint) | 20 mo | ≈50 (+152%) | ≈52 (+160%) | **≈33 (+65%)**, P 5% | 1,705–7,821 vs 9,340 ✗ |
| SUSTAIN-6 (real footprint) | 11 mo | ≈30 (+170%) | ≈31 (+182%) | **≈23 (+109%)**, P 0% | 266–966 vs 3,297 ✗ |
| DAPA-HF (real footprint) | 19 mo | ≈38 (+100%) | ≈28 (+47%) | **21 (+11%)**, P 20% | 1,303–6,153 vs 4,744 ✓ |
| KEYNOTE-189 (126 sites) | 14 mo | ≈22 (+57%) | ≈20 (+43%) | **15 (+7%)**, P 4% | 157–511 vs 616 ✗ |
| Median absolute timing error | | **100%** | **47%** | **44%** | ranges contain actual: **0/5 → 2/5** |

What changed and what did not:
- **Fair back-testing matters most.** Registry rates for T2DM were ~0.8 patients/site/month in 2010 data vs ~0.5 in today's;
  judging a 2010 trial with today's (more saturated) registry made it look too slow.
- **Uncertainty is now honest-ish:** ranges went from ±4% to roughly ×0.5–×2, and 2 of 5 actual outcomes fall inside them
  (none before). Probabilities are no longer a flat 0% for trials that succeeded, but still under-call fast trials.
- **Still unsolved:** fast, high-volume programmes (LEADER, SUSTAIN-6: 1.1–1.3 patients/site/month) are under-predicted 1.6–2×,
  and EMPA-REG is now over-predicted. Registry proxies cannot see sponsor/site quality; use `Rate calibration ×` with internal
  benchmarks. Five trials are not enough to recalibrate the default honestly.
- **Recommended footprints:** no single-country share above 20%; thin-evidence countries (Puerto Rico, Algeria, Lebanon,
  Latvia) are no longer pushed by default in the back-tests; DAPA-HF falls back with an explicit note (only 3 completed HFrEF
  comparators in 2017 — the condition term is too narrow). Mixes are more plausible (LEADER: Western Europe 61%) but still not
  the real ones (EMPA-REG back-test: Asia-Pacific 45%, no North America). Country research is still needed.
- **Parsing:** all misreads listed below are fixed or turned into manual/conditional rules (parser 68 → 83 cases).

---

# Original report (v0.9.0)

Tool: feasibility-pipeline.html v0.9.0 (UI cleanup applied), live web mode, run 14 Oct 2026 on localhost.
Inputs per trial: indication; eligibility text (EMPA-REG: protocol v5 extract; others: ClinicalTrials.gov eligibility section);
target = actual number randomised; enrollment window = actual recruitment months; sponsor footprint = the trial's own
ClinicalTrials.gov location list (country: site count). Recommended footprint uses the same total site count.
No patient data, no country research (no Anthropic key), all model assumptions at defaults. Registry "since" = 2014 (default).
Inputs file: `stress-test/inputs.json`.

## Actual recruitment (published)

| Trial | Area | Randomised | Sites / countries | Recruitment period | Months | Patients / site / month |
|---|---|---|---|---|---|---|
| EMPA-REG OUTCOME | T2DM CV outcomes | 7,034 | 592 / 42 | Sep 2010 – Apr 2013 | 32 | 0.37 |
| LEADER | T2DM CV outcomes | 9,340 | 410 / 32 | Sep 2010 – Apr 2012 | 20 | 1.14 |
| SUSTAIN-6 | T2DM CV outcomes | 3,297 | 230 / 20 | Feb 2013 – Dec 2013 | 11 | 1.30 |
| DAPA-HF | HFrEF | 4,744 | 410 / 20 | Feb 2017 – Aug 2018 | 19 | 0.61 |
| KEYNOTE-189 | Metastatic NSCLC | 616 | 118–126 / 16 | Feb 2016 – Mar 2017 | 14 | 0.35 |

## Forecast vs actual

"Months from first patient" removes the tool's ~6-month default start-up (first simulated patient at month 7), so it is
comparable with a published recruitment period. Values beyond the 1.75× horizon are extrapolated at the final monthly rate (*).

| Trial | Tool verdict at actual window | Median randomised by actual deadline | Months from first patient to target: sponsor (real) footprint | Recommended footprint, same sites | Actual months | Error (real footprint) |
|---|---|---|---|---|---|---|
| EMPA-REG | Unlikely (0%) | 6,482 of 7,034 | **28** | 21 | 32 | 12% optimistic |
| LEADER | Unlikely (0%) | 2,335 of 9,340 | **50.5*** | 39* | 20 | 2.5× too slow |
| SUSTAIN-6 | Unlikely (0%) | 392 of 3,297 | **30*** | 23* | 11 | 2.7× too slow |
| DAPA-HF | Unlikely (0%) | 1,453 of 4,744 | **38*** | 32* | 19 | 2.0× too slow |
| KEYNOTE-189 | Unlikely (0%) | 183 of 616 (126 sites) | no registry site list | 22* | 14 | 1.6× too slow |

Modelled rate on the real footprint: 0.30–0.44 patients/site/month for every trial. Actual: 0.35–1.30.

## Findings

1. **Timing accuracy is poor except by coincidence.** The model gives nearly the same per-site rate to every trial
   (~0.3–0.45). It matched EMPA-REG (actual 0.37) but was 2–2.7× too slow for the fast trials (LEADER, SUSTAIN-6, DAPA-HF).
   It cannot distinguish a fast, well-run sponsor programme from an average one.
2. **Every trial was called "Unlikely" (0%), yet all five finished within the stated window** — 5/5 false alarms.
   Two causes: the rate underestimate above, and the enrollment window silently includes ~6 months of country start-up.
   The UI should say whether the window counts from first site activation or from study start.
3. **Recommended footprints are not credible.** All three T2DM trials received almost the same plan (China and Japan at the
   35% share cap each, then Puerto Rico, Latvia, Slovenia, Algeria, Lebanon…), regardless of trial. KEYNOTE-189 got
   Philippines, Georgia, Finland, Belarus as the top four. The real trials were Europe/North America-led. Allocations are driven
   by small-sample registry rates and the share cap, not by where the trial could recruit.
4. **No back-testing is possible.** The completed-trial query always runs from "since" to today and competing trials are
   today's, so historical trials are judged with data from after they ran (and possibly include themselves). With the default
   since = 2014, the 2010 trials used only later data.
5. **The same condition string returns identical registry evidence** (T2DM: 196 competing, 542 completed, every time), so
   inclusion criteria, mechanism and trial design don't change the forecast. DAPA-HF had only 32 completed comparator trials.
6. **Protocol parsing is unsafe without review.** Misreads seen in this test:
   - KEYNOTE-189: EGFR-positive and ALK-positive as *inclusions* (the trial required negatives); lymphoma as an inclusion;
     NSCLC and metastatic disease as *exclusions* (the indication itself); PD-L1 positive excluded (enrolment was regardless of PD-L1).
   - SUSTAIN-6: exclusion "Diabetes mellitus (any type)" (excludes the whole population); insulin as both inclusion and exclusion;
     any heart failure excluded (protocol: NYHA IV only).
   - LEADER: insulin as both inclusion and exclusion; age ≥50 / ≥60 risk rules dropped.
   - DAPA-HF, EMPA-REG: MI / stroke / unstable-angina exclusions lose their time window, contradicting the inclusion rules.
   - EMPA-REG: 7 misreads (see `EMPA-REG-OUTCOME-criteria-corrections.md`, now applied).
   Only one indication conflict was flagged automatically (EMPA-REG pregnancy); the KEYNOTE and SUSTAIN contradictions were not.
   These affect EMR cohort forecasts, surveys and risk flags, not the country forecast.
7. **Single-line criteria text parses to 0 rules with no error.** LEADER and SUSTAIN-6 registry text (" - " bullets on one line)
   produced "Parsed 0 rules" as a normal status; reformatted one criterion per line, they parsed.
8. **Registry status text duplicates** "Country research skipped…" once per run (seen up to 5 times).
9. **Robustness was good:** 6 runs, 10–48 s each, no errors, results current, cancellation never needed, tab switching inert.

## What this means for real-life use

- Use the tool to structure a feasibility discussion (registry landscape, saturation flags, criteria review, questionnaires),
  not to predict recruitment duration or choose countries.
- Treat the per-site rate as an uncalibrated prior; enter sponsor-specific or investigator-reported rates where available.
- Always review parsed criteria line by line; never use the recommended country list without country research and expert input.

## Suggested fixes (priority order)

1. Calibrate rates against completed trials of similar size/area; widen uncertainty accordingly. Add a historical-data cut-off
   (registry query "through" date) so back-tests are fair.
2. State clearly whether the enrollment window includes start-up; optionally report "months from first patient".
3. Allocation: regional caps (e.g. protocol "≤50% per region"), a minimum country count, and a lower default max share.
4. Parser: keep time windows ("within 2 months"); read "male and female" and "negative for X" correctly; never exclude the study
   indication or its own diagnosis without a blocking warning; detect rules that are both inclusion and exclusion; warn when
   0 rules are parsed from non-empty text.
5. De-duplicate the registry status message.

## Limits of this test

Five trials, all large sponsor-led phase III (four cardiometabolic, one oncology); ClinicalTrials.gov eligibility text is shorter
than full protocols; location lists may include sites that never enrolled; actual figures come from published summaries
(site counts differ slightly between sources). Results describe this build with default settings.

Sources: ClinicalTrials.gov NCT01131676, NCT01179048, NCT01720446, NCT03036124, NCT02578680; ASCO Post (KEYNOTE-189 AACR 2018);
RxFiles DAPA-HF summary; LSHTM/European Pharmaceutical Review (LEADER); Carenet (SUSTAIN-6); EMPA-REG baseline report
(Cardiovascular Diabetology 2014).
