# v0.9.6 — fixes from the external v0.9.5 review

Builds on v0.9.5. An external code review of v0.9.5 reported 13 findings. Each one was reproduced in the real app, given a
proposed fix, and reviewed again before being applied (`stress-test/REVIEW-v0.9.5-findings.md`). All 13 are fixed here,
one commit each, and the full test suite was run after every fix.

## Eligibility and patient data
- **FHIR observations marked entered-in-error or cancelled no longer count (F02).** Before, a withdrawn result was used
  like any other. Because the newest value per lab wins, a retracted HbA1c could replace a valid earlier one and turn a
  "fails" into a "meets". These observations are now skipped and counted in the import report. Preliminary and
  registered results are still used, but the report says how many there were.
- **AI-parsed lab thresholds run in the canonical unit (F01).** When Claude or Gemini kept the protocol's own unit (for
  example "Hb ≥ 100 g/L", "ANC ≥ 1500/µL" or "HbA1c 53–86 mmol/mol"), the number was used as if it were in g/dL, ×10⁹/L
  or %. The threshold is now converted with the same table used for patient observations, and the rule shows a
  unit-conversion chip. If the unit cannot be converted, the rule is left unresolved for manual review. Three cases are
  accepted as written:
  - a ULN multiple (also written "xULN");
  - scores, which have no other scale;
  - rules with no threshold number.
- **Strict ranges stay strict (F03).** "Age > 18 and < 65" used to be evaluated as 18–65 inclusive, and the Logic column
  printed BETWEEN, so the error could not be seen. Each end of a range now keeps whether it is strict, in evaluation, in
  the logic text ("(age > 18 AND age < 65)") and in the label ("Age > 18 and < 65"). Inclusive ranges and saved rule sets
  are unchanged. Validation rejects an empty strict range (for example min = max with an excluded end). The parser test
  for "BMI > 17 and < 35" had recorded the inclusive behaviour; it now expects the strict form.

## Allocation
- **Keep-minimum respects the regional cap (F04).** Keeping a minimum number of sites in sponsor countries could push one
  world region past "Max share per world region" without any warning. The keep-minimum is now limited by the region's
  remaining room. Any shortfall is listed under Allocation diagnostics ("limited to N by the region cap"). With no
  regional cap (the default), allocation is unchanged. The engine change is in `src/mc-kernels.js`; the frozen-reference
  parity tests still pass.
- **Keep-minimum under "Only researched" is now recorded (F05).** A sponsor country that has no web research keeps its
  minimum sites, because that is an explicit request. Allocation diagnostics now record this as an exception instead of
  leaving it unexplained. Allocation numbers are unchanged.

## Registry and import data
- **Reversed or zero-length trial dates give no rate (F06).** A comparator whose primary completion came before its start
  used to get the 3-month minimum window, and so the highest possible per-site rate. These trials are now excluded from
  rates and counted separately in the rate-data line ("primary completion on or before start"). The 57-trial back-test is
  not affected: of its 9,703 comparators, 7 have such dates, and none of them would have produced a rate.
- **Malformed CSV files are refused (F07).** Before, an unclosed quote silently merged the rest of the file into one cell,
  and an unquoted delimiter shifted values into the wrong columns. Both now stop the import with a row-numbered error.
  This applies to every CSV import: patients, registry history, feedback, market evidence and benchmarks. Short rows and
  trailing empty cells (common in spreadsheet exports) are still accepted.
- **Impossible as-of dates are refused (F08).** An as-of date from an edited project file such as 2026-99-99 was sent to
  ClinicalTrials.gov unchanged. Any other invalid value quietly meant "today", which introduces look-ahead bias. Only
  real calendar dates are used now. An invalid value stops the registry search with a clear message and appears in the
  study review checklist.

## Benchmark data (v0.9.5 feature)
- **Pooling respects how each rate was derived (N01).** The aggregate used Σ patients ÷ Σ site-months whenever those
  columns were present. That ignored a rate column's per-year unit (12× too high in the repro) or its screen-failure
  conversion. Pooling now applies only to rows whose rate came from those counts; other rows use the weighted median of
  their normalized rates.
- **Benchmark numbers must be whole numbers (N02).** Before, cells such as "1-2", "12abc" or "$5", a stray %, and a
  quoted "1,5" in a comma file were read as fragments of a number. A negative patient count could even give a negative
  pooled rate. Such rows are now skipped, with the column named in the reason. Grouped thousands, decimal commas and %
  in the screen-failure column are still read.
- **Clearing benchmark data keeps the audit trail (N03).** Clearing used to delete the log while the applied rates stayed
  in the forecast, relabelled as "manual override". When logged values are still applied, clearing now removes the
  imported rows but keeps the source name and log. The overrides stay labelled "benchmark import", and the risk flag,
  summary note, JSON report (`rowsClearedAt`), export note and project file all still name the source. Once nothing is
  applied, clearing removes everything as before. The confirm text now describes what actually happens.
  `PROJECT-SCHEMA.md` documents the optional `clearedAt`.
- **Chained reverts work (N04).** After apply → apply → revert, the earlier benchmark value was back in force but was
  labelled "manual override", left out of the summary, and could not be reverted. The earlier entry is now active again,
  labelled, and revertible.

## Reports
- **Validation wording (D01).** Every report and the run manifest said there had been "no retrospective validation". That
  has been wrong since the 57-trial back-test, and the bid summary's own risk text cites that back-test. One shared
  statement now replaces it in all four outputs. It describes the back-test as exploratory: the same trials also
  calibrated the model, the figures are for v0.9.4 defaults (84% inside the 80% range, 33% median timing error), and it
  is not prospective or held-out validation.

## Beyond the original proposals
The review behind each fix found these gaps, which were closed in the same commit:
- **F01:**
  - "xULN" written without a space is accepted;
  - scores and rules without a threshold number are not sent to manual review;
  - the AI answer object is no longer modified in place.
- **F03:** the "> 160 or < 90" split no longer carries the strictness flags onto its one-sided rules.
- **N02:** in the new test, the control row's rate comes from counts. Its "pooled" assertion still holds under N01.
- **N03:** after clearing, the summary and bid-summary benchmark line, the JSON report and the export note keep naming the
  source. The panel text follows whether anything is still applied.

## Not changed (noted for later)
- The AI JSON schema has no strictness field, so strict ranges parsed by Claude or Gemini stay inclusive.
- The rule-based parser reads "≥ 160 or ≤ 90" as strict ("> 160" and "< 90").
- A rate column that disagrees with the patient and site-month counts is not flagged.

## Tests
- 13 new checks, one per finding. The total goes from 388 to 401:

  | Suite | Before | After | Findings |
  |---|---|---|---|
  | engine | 103 | 107 | F02, F03, F05, F06 |
  | gemini | 30 | 31 | F01 |
  | R3 | 33 | 34 | F07 |
  | view | 34 | 40 | F04, F08, N01–N04 |
  | R2 | 20 | 21 | D01 |

- One existing expectation was corrected: the BMI parser case, which had recorded the inclusive-range bug. No test was
  removed or loosened.
- Final results (Chromium, localhost):

  | Suite | Result |
  |---|---|
  | parser | 100/100 |
  | engine | 107/107 |
  | lifecycle | 10/10 |
  | UX | 20/20 |
  | R2 | 21/21 |
  | project | 21/21 |
  | R3 | 34/34 |
  | view | 40/40 |
  | flex | 17/17 |
  | Gemini | 31/31 |

  `node --test tests/kernels.test.mjs` passes 10/10 and `node tools/build.mjs --check` reports in sync.
