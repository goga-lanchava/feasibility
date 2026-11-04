# Does protocol strictness predict recruitment speed? (round-4 data, 2026-10-16)

**Answer: not in a usable way. No strictness factor was added to the forecast.**

## Method
- **Trials:** the 153 calibration and validation trials from round 4. Both lockboxes were not touched.
- **Features:** each trial's ClinicalTrials.gov eligibility text was parsed with the application's own rule parser, `parseProtocolRules` (`analysis/strictness_features.cjs` → `results/strictness-calval.json`). 3 texts could not be parsed and are excluded. The eligibility text had been capped at 6,000 characters when the trials were selected.
- **Forecast compared against:** the current v0.9.9 engine (config `t10h1.2sg0.8` in `results/grid4-*.jsonl`).
- **Primary measure, fixed in advance:** strictness = ln(1 + number of parsed eligibility rules). It is tested two ways:
  1. against the forecast error ln((actual+1)/(P50+1)) for completed trials (Spearman correlation);
  2. as a warning sign for trials later stopped for poor enrolment (AUC, completed vs terminated).
- **Exploratory measures (10):** inclusion and exclusion counts, text length, bullet count, numeric and lab thresholds, time windows, prior-therapy requirements, biomarker requirements and unparsed rules. Script: `analysis/strictness_test.py`.

## Results

| Measure | Calibration: correlation with error | Calibration: failure AUC | Validation: correlation with error | Validation: failure AUC |
|---|---|---|---|---|
| **Primary: ln(1+rules)** | +0.10 | 0.55 | 0.00 | 0.62 |
| Inclusion rules | +0.08 | 0.53 | +0.16 | 0.62 |
| Exclusion rules | +0.11 | 0.52 | −0.16 | 0.61 |
| Lab thresholds | −0.01 | 0.61 | −0.04 | 0.45 |
| Numeric thresholds | −0.09 | 0.59 | +0.08 | 0.45 |
| Prior-therapy / medication inclusion | +0.07 | 0.53 | +0.10 | 0.60 |
| Comparator rate (reference) | −0.32 | 0.52 | +0.07 | 0.55 |

- **The primary measure shows no relationship with forecast error.** The slope is +0.15 ± 0.21 on calibration and −0.09 ± 0.28 on validation, and the sign flips between sets.
- **No feature warned of failure consistently across both sets.** The best calibration hint, lab thresholds at AUC 0.61, fell to 0.45 on validation, which is typical of chance after testing about 11 features.

## Why the signal may be hidden
- **Counts are compared across very different indications.** Oncology protocols are long by convention. A fair test would compare each protocol's strictness with its own comparator trials' protocols, which means fetching and parsing comparator eligibility texts.
- **The sample is modest.** About 95 completed trials can only detect fairly strong effects (correlation of roughly 0.25 or more).
- **Rule counts are a crude measure of burden.** Procedures, visit schedules and placebo design are not in the eligibility text.

## Decision
- **No rate factor.** The registry forecast still does not react to protocol edits.
- **Within a patient cohort, protocol changes are handled directly.** When EMR data is loaded, dropping or relaxing criteria changes the eligible pool, and the flexibility search uses that (see CHANGELOG v0.9.10).
- **Possible next test:** strictness relative to comparator protocols, using comparator eligibility texts from the registry.
