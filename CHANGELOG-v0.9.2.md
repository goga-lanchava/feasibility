# v0.9.2 — fixes from the second retrospective round

Source: round 2 of `stress-test/STRESS-TEST-REPORT.md` (MONALEESA-2, STEP 1, CLARITY AD, KEYNOTE-024). Builds on v0.9.1.
The recruitment model and engine are unchanged; this release fixes one planning bug and protocol parsing.

## Planning
- **Window not longer than start-up.** Previously every country scored 0 (rate × (window − start-up)), so nothing was
  recommended and no reason was given (STEP 1 with its real 6-month window). Now countries are ranked by rate, the allocation
  diagnostics explain why, and the “Review before analysis” checklist warns before the run that the window counts from study start.

## Protocol parsing (registry-style eligibility text)
- Markdown escapes (`\>=`, `\<`) are removed and an operator repeated in brackets after its words is ignored:
  “aged greater than or equal to (>=) 50 and less than or equal to (<=) 90” → `age BETWEEN 50 AND 90` (was `age <= 50`).
- “> 160 or < 90” becomes two outside limits (exclusion) or an OR group (inclusion) instead of an impossible range.
- “lacking EGFR … and/or ALK …” → both markers negative (the negation covers the clause); “lacking” is a negation word.
- “not evaluable for PD-L1” no longer becomes “PD-L1 negative”.
- Contraception / pregnancy-test lines: no sex restriction, and drugs named there (“after the last dose of …”) are not rules.
- “age-adjusted / age-matched …” is not an age criterion; durations (“amenorrhoea for 12 or more months”) are not ages.
- “If receiving an approved treatment …” inclusions are manual (they apply to some patients only).
- “BMI ≥ 30, or ≥ 27 with at least one of the following comorbidities: …” keeps only the threshold, not the examples.
- “… defined either by:” starts an any-one-of group (postmenopausal definitions); “defined as:” lists stay all-of.
- “locoregionally recurrent or metastatic” is an OR group, not two required statuses.
- “(in the absence of chemotherapy …)”, “(e.g. …)” brackets name examples, not rules.
- “change in body weight > 5 kg” is not a body-weight threshold; “NYHA functional classification III–IV” is a severity qualifier.
- “therapy for the treatment of their stage IV NSCLC” in an exclusion no longer excludes the disease or stage itself.

## Tests
- New: 17 parser cases (83 → 100) and 1 view-suite check (25 → 26). Existing tests unchanged.
- Results (browser, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33,
  view 26/26, flex 17/17, Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10; `node tools/build.mjs --check` in sync.
