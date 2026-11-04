# External review (v0.9.5): verified findings and proposed fixes

Source: the ChatGPT code evaluation "Revision 2, v0.9.5 compared with v0.9.3" (14 Oct 2026), run against `feasibility-pipeline.html` v0.9.5 (SHA-256 fefaf6ba…).
Each finding was reproduced in the real app (headless Chromium) or kernel by an independent agent. Each agent then designed a fix and validated it on a copy of the repository against the in-app suites.
**Status (v0.9.6): all 13 fixes are applied, one commit each, in the order F02, F01, F03–F08, N01–N04, D01.** Each proposed fix was reviewed against the current code before it was applied. After every fix the full gate ran and passed: `node tools/build.mjs --check` in sync, `node --test tests/kernels.test.mjs` 10/10, and all 10 in-app suites. No fix was rejected. Where the review found a gap, the fix was extended (see "Applied with changes" below). Release notes: `CHANGELOG-v0.9.6.md`. The original proposed edits remain in `review-v095-proposed-fixes.json` for reference.

| ID | Finding | Verdict | Severity | Fix validated on a copy | Review before applying | Applied in v0.9.6 |
|---|---|---|---|---|---|---|
| F01 | AI lab thresholds keep non-canonical units | real-defect | medium | yes | agrees; extended | yes, cc81b7c |
| F02 | FHIR entered-in-error observations count for eligibility | real-defect | high | yes | agrees, fix OK | yes, 85b117d |
| F03 | Strict range endpoints (> 18 and < 65) become inclusive | real-defect | medium | yes | agrees; extended | yes, 245560b |
| F04 | Keep-minimum allocations bypass the regional cap | real-defect | medium | yes | agrees, fix OK | yes, 60395fa |
| F05 | Keep-minimum allocations bypass "Only researched" | real-but-minor | low | yes | agrees, fix OK (note only; allocation kept) | yes, 3b21191 |
| F06 | Reversed trial dates produce usable recruitment rates | real-defect | medium | yes | agrees, fix OK | yes, daf18df |
| F07 | CSV with unclosed quotes or extra fields accepted | real-defect | medium | yes | agrees, fix OK | yes, cfabe94 |
| F08 | Impossible as-of dates (2026-99-99) accepted | real-but-minor | low | yes | agrees, fix OK | yes, 8360882 |
| N01 | Benchmark pooling overrides the normalized rate basis | real-defect | medium | yes | agrees, fix OK | yes, 405ce99 |
| N02 | Benchmark number parsing too permissive (e.g. "12abc", negative counts) | real-defect | medium | yes | agrees; merged with N01 | yes, 86751d4 |
| N03 | Clearing benchmark data deletes the audit log while rates stay applied | real-defect | medium | yes | agrees; extended | yes, a0ae36e |
| N04 | Chained benchmark revert fails | real-defect | medium | yes | agrees, fix OK | yes, a56c386 |
| D01 | Report text still says "no retrospective validation" | real-but-minor | low | yes | agrees, fix OK (figures checked against CHANGELOG-v0.9.4) | yes, f194206 |

### Applied with changes
- **F01:**
  - the ULN check matches "xULN" without a space (`/uln/i` instead of `/\buln\b/i`);
  - rules with no threshold number, and unitless scores (UNITLESS: ECOG, INR and similar), skip the unit check because no other scale exists;
  - the AI item is copied (`c = { ...c, ...u.values }`) instead of modified in place;
  - the new test has two more cases: ALT ≤ 2.5 xULN, and ECOG with the unit "ECOG grade".
- **F03:** the reversed-range split ("> 160 or < 90") deletes `minStrict`/`maxStrict` from its one-sided rules. The PARSER_TESTS BMI expectation was changed from the inclusive "BMI BETWEEN 17 AND 35" to "(BMI > 17 AND BMI < 35)". The old expectation recorded the bug, so the new one is stricter, not looser.
- **F04/F05:** both change the same keep-minimum loop. F05's note was placed after F04's new region bookkeeping, and `node tools/build.mjs` regenerated the embedded kernel and its sha256 each time. The kernel sha after F04 matched the proposal (9ef33162…).
- **N02:** combined with N01 on the `pooled` line. In the new test, the control row "Genovia" has no rate cell, so its rate comes from counts and the `pooled` assertion still holds under N01. With a rate cell the row would deliberately use the median instead.
- **N03:** four additions:
  - `bmNote()` keeps naming the source, with "rows cleared", while values are still applied. Before, the summary and bid-summary "Benchmark data" line disappeared after clearing.
  - The panel text depends on whether anything is still applied.
  - The JSON report carries `rowsClearedAt`, and the project-export note no longer says "the 0 normalized rows".
  - `PROJECT-SCHEMA.md` documents `clearedAt`. The test checks all of these.
- **F06 back-test impact:** checked against `analysis/comparators-asof-start.json.gz`. Of 9,703 comparators, 7 have a reversed or zero-length span, and none had ACTUAL enrollment with at least 3 sites, so none ever produced a rate. The 57-trial figures are unchanged by this fix.

## Details

### F01: AI lab thresholds keep non-canonical units

**Reproduction:** I served the original repo on 127.0.0.1:8810 and drove it with Playwright (script: /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/f01-repro.cjs). It pastes a valid LLM JSON answer into S.llmPaste and calls ACTIONS.llmApply(), which is the real pasted Claude.ai path (validateLlmItem, then llmCriteriaToInternal). It then runs evalLab against a patient with Hb 12 g/dL (canonical, status ok). Results on the original:
- {field:'hemoglobin', unit:'g/L', op:'>=', value:100} became a lab rule with value 100, and evalLab gave s:'F'. The patient is wrongly excluded.
- anc unit 'cells/µL' value 1500 was kept as 1500 (canonical ×10⁹/L), so ANC 2.0 fails.
- hba1c unit 'mmol/mol' between 53 and 86 was kept as 53–86 (canonical %), so HbA1c 8% fails.
- hemoglobin unit 'mg/mL' value 100 (no conversion possible) was still executed as 100 g/dL.
- No unitNote chip an

**Assessment:** This is a real defect in the shipped app. The system prompt asks the model to express thresholds in canonical units, and the schema makes it report a `unit` for every item. When the model keeps the protocol's own unit (for example "Hb ≥ 100 g/L", which is common in EU and Canadian protocols, "ANC ≥ 1500/µL", or "HbA1c ≥ 53 mmol/mol"), the app takes the number as written and silently runs it against observations that were converted to the canonical unit. The error is a factor of 10, 1000 or a different scale entirely, which turns a lab inclusion into an almost universal fail, or an exclusion into a no-op. There is no warning or chip. For a feasibility tool this quietly distorts the eligible pool and the enrollment forecasts that feed site and country decisions. A reviewer would only catch it by reading every AI rule's number.

The rule-based parser already converts units (UNIT_CONV and no

**Proposed fix:** Added llmThresholdUnit(c) just before llmCriteriaToInternal. For a lab concept that exists in LABS (built-in, previously registered, or registered in this call), a stated unit is handled as follows:
- null, the canonical unit, or "×ULN" together with uln_multiple: accepted as is.
- A unit convertObs can convert: value, min and max are converted with the observation table, and the rule carries unitNote, which the existing chip renders as "Unit converted to the canonical unit".
- Any other unit: the rule becomes manual/unresolved with invalidReason.

llmCriteriaToInternal calls this helper for type 'lab' before building the rule. validateLlmItem now rejects a non-string `unit`. A new GEMINI_TESTS 'Conversion' test covers the g/L, canonical, mmol/mol range and unconvertible cases.

**Validation:** I applied the edits with a script that asserts each old_string is unique (script: /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/f01-apply.py plus f01-test.py) to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F01. `node tools/build.mjs --check` reports the kernel block in sync; the kernels are untouched.

I served the copy on 8810 and ran tests/run-app-suites.cjs with APP_URL pointing at it. Every suite passes:
| Suite | Result |
|---|---|
| parser | 100/100 |
| engine | 103/103 |
| lifecycle | 10/10

**Risks:** 1. Units that are canonical but spelled in a way convertObs does not recognise, and that differ from the LABS unit string, now become manual review instead of executing. One example is "10⁹ cells/L". This fails closed, which is the safer direction; the superscript forms 10⁹ and 10³ are normalised.
2. Lifeexp "years" now becomes unresolved, because UNIT_RULES only knows weeks and months; previously the number was wrongly used as weeks.
3. A "× ULN" unit is only tolerated when uln_multiple is set.

### F02: FHIR entered-in-error observations count for eligibility

**Reproduction:** I served the original repo on 127.0.0.1:8811 and drove it with Playwright using /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/repro_f02.cjs. The script calls the app's own fhirToRaw, deidentify and computeCohort through the in-app helpers tBundle, tPat, tObs, tC and tCohort. It imports a single HbA1c observation (LOINC 4548-4) of 6.5% and tests it against the criterion hba1c <= 7.
Original app: with status entered-in-error, cancelled, preliminary, final or no status, every case gave hba1c=6.5 and the patient 'meets'. The Observation was counted as 'accepted 1 of 1' and nothing in the import report mentioned the status.
Worse case (mixed): a final HbA1c of 9.0% dated 2026-03 plus a newer entered-in-error 6.5% dated 2026-09. The app gave hba1c=6.5 and 'meets'. The retracted value replaced the valid one, which fails the criterion.
Patched copy: ente

**Assessment:** In fhirToRaw's Observation branch (around line 1645) the only check is that valueQuantity holds a finite number. Observation.status is never read.
The Condition branch right above it already drops verificationStatus refuted and entered-in-error, and the medication branch maps status to active. So the Observation branch is the odd one out, not a deliberate design choice.
In FHIR R4, entered-in-error means the result was withdrawn and should not have existed. Cancelled means the test was not done. Neither may drive eligibility.
Because buildClinical takes the most recent observation per lab, a retracted result does more than add noise. It overrides the valid earlier result. In the real browser this flipped a patient from 'fails' (HbA1c 9.0) to 'meets' (6.5).
That inflates the eligible-patient counts that site selection and enrolment forecasts rest on. Nothing warns the user: the observatio

**Proposed fix:** The fix follows the existing Condition-refuted pattern in fhirToRaw.
1. Two new report counters, obsExcluded and obsPreliminary, are added.
2. Observations with status entered-in-error or cancelled are skipped before the numeric check, so they are not counted as accepted, and obsExcluded is incremented.
3. Numeric observations with status preliminary or registered are imported as before and counted in obsPreliminary.
4. The 'Skipped' row of the FHIR import report now lists 'N entered-in-error/cancelled observations'. It uses `|| 0` so older saved reports without the field still render.
5. A 'Result status' row is added to the import report when any preliminary results were used.
6. One new ENGINE_TESTS entry covers all of this.
The status is not carried into the de-identified obsRaw, because nothing would read it. Storing it would also change the persisted project shape.

**Validation:** I applied all edits to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F02/feasibility-pipeline.html with /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/apply.py, which asserts each old_string occurs exactly once in the original. Every one did.
Rerunning the repro on the copy gives the expected results listed under reproduction. `node tools/build.mjs --check` reports the kernel block in sync; the kernels were not touched.
tests/run-app-suites.cjs against the copy passed every suite:
- parser 100/100
- 

**Risks:** Patients whose only HbA1c (or other lab) observation is entered-in-error or cancelled now get no value for that lab. Those criteria show as 'unresolved' instead of 'meets' or 'fails', which is the intended conservative outcome.
Preliminary and registered results still count toward eligibility; they are only flagged in the report. If the team wants final-only screening, that would be a policy change.
FHIR imports in existing saved projects keep their old results until the data is re-imported.
Sta

### F03: Strict range endpoints (> 18 and < 65) become inclusive

**Reproduction:** I served the original repo at http://127.0.0.1:8812/feasibility-pipeline.html and drove it with Playwright. The script is /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/repro.cjs. For each line it calls parseCriterionLine(text, section) and then reports critLogic, critLabel and cmpNum at min, at max and at the midpoint. Results on the original:
- 'Age > 18 and < 65 years' gives {op:'between', min:18, max:65} with no strictness kept. critLogic is "age BETWEEN 18 AND 65" and the label is "INC · Age 18–65". cmpNum(18) and cmpNum(65) are both true, so 18 and 65 wrongly qualify. cmpNum is the comparison evalNode's age case uses (Bo(cmpNum(p.age, c))).
- The existing PARSER_TESTS case 'BMI greater than (\>)17 and less than (\<) 35' gives "BMI BETWEEN 17 AND 35", and BMI 17 and 35 both pass. The test expectation itself records the bug.
- 'HbA1c > 7% and 

**Assessment:** The finding is correct. When parseComparison() sees a lower bound followed by an upper bound (">/>= X ... </<= Y"), it merges them into {op:'between', min, max} and drops which operators were used. cmpNum's 'between' always tests v >= min && v <= max.

Every strict range is therefore evaluated as inclusive. That affects:
- age: the parser keeps all comparison fields through `...c` (spread), so the strictness is lost there too;
- labs: line ~2223 copies only min and max;
- lines of therapy and biomarkers: also spread.

The Logic column (critLogic) prints BETWEEN, which reads as inclusive, so a reviewer checking the rule against the protocol cannot see the error. The PARSER_TESTS BMI case (">17 and <35" expected as "BMI BETWEEN 17 AND 35") enshrines the bug.

Why it matters in a clinical-trial feasibility tool: patients exactly at a boundary are counted as eligible (or, for exclusions, exc

**Proposed fix:** Endpoint strictness is now kept as optional booleans minStrict and maxStrict, set only when true, so existing inclusive criteria and stored rule sets are unchanged.
1. parseComparison: when merging a lower and upper comparison, set minStrict for '>' and maxStrict for '<'.
2. Lab parser: copy the flags along with min and max. Age, lines and biomarker already spread the comparison object, so they need no change.
3. cmpNum 'between': use > or < for a strict endpoint.
4. critLogic: inclusive ranges still print "X BETWEEN a AND b". Ranges with a strict endpoint are spelled out and wrapped in brackets, e.g. "(X > a AND X < b)", so the NOT and ANY wrappers apply to the whole range. Biomarker ranges use the same helper.
5. critLabel: strict ranges show "Age > 18 and < 65" instead of "Age 18–65".
6. validateCriterion (also used by rule-set import): reject non-boolean strictness flags, and reject 

**Validation:** The edits are in /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/edits.cjs (JSON copy in edits.json). I applied them with apply.cjs, which checks that each old_string occurs exactly once in the original file, to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F03.
- `node tools/build.mjs --check` reports the kernel block in sync; no src/ change was needed.
- With the copy served on port 8812, the repro shows the corrected behaviour (see reproduction).
- tests/run-app-suites.cjs against the copy passed e

**Risks:** - Changed text: critLogic and critLabel output change only for ranges with a strict endpoint. Any saved expectations, exports or screenshots that recorded "X BETWEEN a AND b" for strict wording will now show "(X > a AND X < b)"; only the BMI parser test needed updating.
- Old rule sets and projects: these carry no flags, so they keep inclusive behaviour. Ranges saved from strict wording before the fix remain inclusive until the protocol is re-parsed.
- Threshold editing: the Thresholds editor's 

### F04: Keep-minimum allocations bypass the regional cap

**Reproduction:** I served the original repo on 127.0.0.1:8813 and ran Playwright (scratch script /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/f04repro.cjs). In the page it called MC_KERNELS.optimizeAllocCore({...DEFAULT_FPP,maxShare:1,minSites:1,maxRegionShare:0.5,keepMin:20}, rows, 40, {A:20,B:20}). The rows were A (region R1, value 9), B (R1, 8) and C (R2, 1), each with cap 50.

Original result: alloc {A:20,B:20}, total 40, diag.binding [] and diag.infeasible []. So region R1 got 40 of 40 sites even though the cap is floor(0.5*40)=20, and nothing in diag said so. The reviewer's finding is confirmed in the real kernel.

With keepMin 5 the same rows give {A:15,B:5,C:20}, which respects the cap. The bypass only happens when the keep-minimum phase alone pushes a region over the cap. The keep loop clips n by cap, perMax and the budget but not by the region. regMax 

**Assessment:** The finding is a real defect. "Max share per world region" is described in the UI as "e.g. 0.5 keeps any region at or below half of the sites". The keepMin tooltip says "Other capacity, allocation and budget constraints still apply". The keep phase already gives way to the max-share limit, which is a comparable soft constraint, and reports that in diag.infeasible. The regional cap was the only allocation constraint keep-min skipped, and it skipped it silently.

Who this affects: a feasibility user who sets a regional diversity or concentration limit (for example for regulatory or generalisability reasons) and also keeps a minimum presence in several sponsor countries in one region. They can get a recommended footprint that breaks their own regional limit. Nothing in the Allocation diagnostics would tell them. The recommended-scenario forecast (allocB and its probability) is then based on

**Proposed fix:** In optimizeAllocCore, the regMax/regUsed declaration moves above the sponsor keep-minimum loop. That loop now clips n by the region's remaining room (regRoom) and adds kept sites to regUsed. When regRoom is the binding limit it reports "limited to N by the region cap (R, M sites)" in diag.infeasible. The loop that rebuilt regUsed from alloc afterwards is removed because it is no longer needed. The change goes in src/mc-kernels.js and is embedded in feasibility-pipeline.html, including the new data-sha256 on the kernel tag. Prefer running `node tools/build.mjs` after editing src rather than hand-editing the HTML kernel block. There is a new regression test in UI_TESTS (run by runUiTests, suite "view") next to the existing Retrospective regional-cap test.

**Validation:** The fix was applied to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F04. I edited src/mc-kernels.js, ran `node tools/build.mjs`, and `node tools/build.mjs --check` reported "in sync". The new kernel sha256 is 9ef33162…, which is what the HTML tag edit uses. The HTML file sha after adding the test is ed8349c1…. I checked that each old_string occurs exactly once in the original files: the keep-loop block is unique in the HTML because the frozen reference has no regMax lines, and the sha tag and the test anchor are each unique.

- The repro o

**Risks:** - **Changed footprint, conflict case only.** With maxRegionShare < 1 and keep-minimums that add up past the region cap, the recommended footprint changes: some sponsor countries are kept below keepMin (possibly at 0), and a diag.infeasible entry says so. The freed budget goes to other regions through the normal greedy pass. Users who were relying on the old behaviour, where keep-min overrode the region cap, will see different allocB, sites-needed (sitesNeededCore B search) and flex results in th

### F05: Keep-minimum allocations bypass "Only researched"

**Reproduction:** I served the original repo on port 8814 and drove it with Playwright (/tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/f05repro.cjs). In page.evaluate I set S.fpOv={} and S.intel={}, then gave Aland a fresh research record: S.intel[intelKey('Aland')]={country:'Aland',key:intelKey('Aland'),at:now,startup_months:6}. The key and at fields are needed, otherwise cacheFresh() rejects the record and row.intel is null. I then called tFootprintSetup('Borduria: 6',{keepMin:5,onlyResearched:1,budgetMode:'custom',budget:15,maxShare:1,minSites:1}). Result on the original: rows intel = Aland true, Borduria false, Carpania false; allocB={"Borduria":5,"Aland":10}; diag.notes=[], diag.infeasible=[], diag.binding=[]. So an unresearched sponsor country gets 5 recommended sites while "Only researched" is on and a researched alternative exists, and nothing is recorded. 

**Assessment:** keepMin ("Keep ≥ N sites in sponsor countries", tooltip "Tries to retain this many sites in each modeled sponsor country") is an explicit user request to keep the sponsor's existing presence. It already honours hard constraints: an excluded country is refused and recorded in diag.infeasible, and assumed or unmodelled countries, cap, max share and budget are all recorded too. "Only researched" is a filter on which countries the tool recommends from the open pool. Making the keep-minimum obey that filter would silently defeat the feature, because sponsor countries that have not been researched yet are exactly the ones a sponsor would want kept. So allocating the sites is defensible. The defect is that it happens silently. Every other way keepMin departs from or overrides the allocation rules leaves a diagnostic, but this one does not, so the recommended footprint can include an unresearche

**Proposed fix:** In the keepMin loop of optimizeAllocCore (src/mc-kernels.js, embedded in feasibility-pipeline.html), add a diag.notes entry when sites are kept in a sponsor country that the "Only researched" rule would otherwise leave out. Allocation is unchanged. Edit src/mc-kernels.js and run `node tools/build.mjs`, which updates the embedded block and its data-sha256. The equivalent direct HTML edits, including the sha attribute, are listed as well. Add one ENGINE_TESTS case.

**Validation:** I worked on the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F05. I edited src/mc-kernels.js, ran `node tools/build.mjs`, and `--check` reports "in sync". The resulting HTML diff is exactly the kernel lines plus the data-sha256 change 3c776fa1… → 19240538…, which matches the HTML edits above. I then added the ENGINE_TESTS case. Re-running the repro on the copy gives the same allocation {"Borduria":5,"Aland":10} plus the note "Borduria: 5 sites kept as the sponsor-country minimum although the country has no web research (“Only researched” is on

**Risks:** Allocation numbers do not change; only diag.notes grows in this case. The kernel-vs-reference parity check at line 5803 compares whole optimizeAlloc output including diag, but its rows carry no intel, so the note never fires there and the check passed. If someone later adds intel to those parity rows, the frozen referenceOptimizeAlloc would diverge on diag.notes. The note is shown with the existing "override" chip, which fits a user-requested exception. If the applier edits the HTML directly ins

### F06: Reversed trial dates produce usable recruitment rates

**Reproduction:** I served the original repo on 127.0.0.1:8815 and opened it in Playwright. In page.evaluate I set S.web.hist to three trials built with the app's own tTrial helper, each with 3 sites in 'Alpha', enroll 300, ACTUAL: R1 runs from 2025-01-01 to 2024-01-01 (reversed), Z1 from 2024-01-01 to 2024-01-01 (zero length), and N1 from 2020-01-01 to 2022-01-01 (normal). Then I called aggregateWeb(). Original result: R1 has enrollMonths=3 and siteRate=33.33/site/month; Z1 has siteRate=null but is counted as missingDates=1 even though both dates are present; N1 has siteRate=5.95; usedForRates=2; the global median rate is 19.64. So one reversed record more than triples the global median (5.95 -> 19.64). After the fix (copy served on 8816): R1 and Z1 have enrollMonths=null and siteRate=null, dq.badDates=2, missingDates=0, usedForRates=1, and the median is 5.95.

**Assessment:** monthsBetween() returns a signed number of months. aggregateWeb only checks it is truthy (`span ? Math.max(3, span*share) : null`), so a negative span passes and Math.max turns it into a 3-month recruitment window. That is the shortest window there is, so the record gets the highest possible per-site rate. It then feeds the global median, the country medians (c.rates), facility rates and the pps-matched items. Those feed the Monte Carlo footprint forecast and the sites-needed answer, which ends up optimistic. ClinicalTrials.gov does contain records with primary completion before start (data-entry errors and some legacy records), so this can happen with real data and is not only a stub artifact. With small comparator sets (the app warns below 30 usable trials) a single bad record can move the median a lot, as the repro shows. A zero-length span was already excluded, because 0 is falsy, bu

**Proposed fix:** The fix requires a finite positive start-to-primary-completion span (okSpan) before longFollowup or enrollMonths are computed. Trials whose dates are present but reversed or equal go into a new dq.badDates counter; missingDates now counts only unparseable or absent dates (span == null). The new counter is reported in the bid summary 'Rate data' line and in the footprint model note. Both use `|| 0` so older saved dq objects without the field still render. The dq object is also exported as rateDataQuality, so the counter appears there too.

**Validation:** I applied all 8 edits with a script that asserts each old_string occurs exactly once, to /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F06/feasibility-pipeline.html; the script is /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/f06edit.py. The copy was served on port 8816 because the original was still on 8815 for comparison. The repro on the copy shows R1 and Z1 excluded, badDates=2 and median 5.95. The new ENGINE test passes: badDates=2, missingDates=1, usedForRates=1. `node tools/build.mjs --check` reports the

**Risks:** Zero-length spans now count under badDates instead of missingDates. This changes the excluded-count text and any external consumer of rateDataQuality.missingDates, but the new reporting is more accurate. Projects saved with an older dq lack badDates; the `|| 0` guards handle display. Positive spans under 3 months still get the 3-month floor; that is deliberate and unchanged. Country, facility and pps rates are fixed automatically because they all derive from st.siteRate.

### F07: CSV with unclosed quotes or extra fields accepted

**Reproduction:** I served the original repo on 127.0.0.1:8816 and used Playwright to call parseCSV and importFeedback in the real page (scripts are in /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/repro07.cjs and /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/repro07b.cjs).
- Unclosed quote: parseCSV('site_id,interest\nS1,"yes\nS2,no\nS3,maybe') returned 1 row with interest="yes\nS2,no\nS3,maybe". The rows after the quote were folded into one cell.
- Silent data loss: importFeedback('site_id,interest,challenges\nS1,yes,"staffing\nS2,no,none\nS3,maybe,none') returned 1. Only 1 of 3 site responses was imported and no error was shown, because the swallowed text landed in the free-text challenges column.
- Extra fields: parseCSV('site_id,site_name,interest,challenges\nS1,Smith, John,yes,none') returned {site_name:'Smith', inte

**Assessment:** parseCSV is the single tokenizer behind every CSV import: EMR patient CSV (csvToRaw), registry/history (harmonize), investigator feedback (importFeedback), market evidence (importMarket) and benchmark exports (importBenchmark, with comma, semicolon or tab delimiters). Neither defect always fails loudly.
1. An unmatched quote turns the rest of the file into one cell. If that cell is free text (challenges, notes, conditions), every later record disappears and nothing is reported. In the browser repro, 3 site responses became 1. For a feasibility tool, that means sites, patients or registry history silently go missing from enrollment forecasts.
2. An unquoted delimiter inside a value (for example "Smith, John", or a decimal comma in a semicolon file) shifts every later column one place to the right and drops the last value. Values then land in the wrong fields, which can be text fields with

**Proposed fix:** In parseCSV, the fix records which record a quoted field opened on and throws a row-numbered error if the file ends while still inside quotes. After the header is read, it rejects the first row that has a non-empty value beyond the header width, again with a row-numbered error (header = row 1). Trailing empty extra cells and short rows are still accepted. A regression test is added to R3_TESTS.

**Validation:** I applied the edits with exact unique-match replacement to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F07. Each old_string occurred exactly once in the original file.
- `node tools/build.mjs --check`: the kernel block is in sync.
- Both repro scripts rerun against the copy: malformed inputs now throw row-numbered errors; trailing empty cells, short rows, quoted commas, "" escapes and embedded CRLF/newlines parse the same as before.
- tests/run-app-suites.cjs against the copy: all suites pass. parser 100/100, engine 103/103, lifecycle 10/

**Risks:** - Files that used to import "successfully" with mismatched quotes or overflowing rows will now be rejected. That is the intended behavior, but users with sloppy exports will now see errors where they saw none before.
- A bare quote in the middle of an unquoted field (e.g. 5" height) still opens quote mode, as before. If it is never closed, the file is now rejected rather than silently mangled; if it is closed later, the file is still mis-tokenized, as before (outside the scope of this fix).
- Ro

### F08: Impossible as-of dates (2026-99-99) accepted

**Reproduction:** Served the original repo on 127.0.0.1:8817 and drove it with Playwright (/tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/repro08.cjs). With S.brief.asOf set to each value, registryAsOf() returned: '2026-99-99' -> '2026-99-99', '2023-02-30' -> '2023-02-30', '2026-13' -> '2026-13-01', '2026-00' -> '2026-00-01', 'junk' -> ''. validateProjectState accepts brief.asOf='2026-99-99' because it only checks that the value is a string. collectRegistry() with a stubbed fetch and asOf='2026-99-99' sent filter.advanced=AREA[StartDate]RANGE[MIN,2026-99-99] AND AREA[PrimaryCompletionDate]RANGE[2026-99-99,MAX], and S.web.query.asOf was '2026-99-99'. With asOf='junk' it quietly ran a normal query against today's registry (query.asOf null) and gave no message. The study review checklist never mentions the as-of date. I also queried the live ClinicalTrials.gov v2 API:

**Assessment:** The UI field is <input type="date">, and Chromium sets an invalid typed value to '', so a normal user cannot enter 2026-99-99 through the form. Bad values come from loaded or edited project files (the validator only checks for a string), from state set in code, or from browsers or locales without a date picker. When such a value does arrive, the outcome matters for a feasibility back-test, in two ways. (a) A shape-valid but impossible date (2026-99-99, 2026-13, 2023-02-30) goes straight into the CT.gov filter. Depending on the value, the registry step then fails with an opaque "Search error" 400, or it runs at a cut-off the registry chose and the user never asked for. (b) Any other non-empty value ('junk') is quietly treated as "no back-test", so the user believes they ran a retrospective with registry data as of a past date but actually used today's data, which brings in look-ahead bias

**Proposed fix:** registryAsOf() now uses validDateOnly(), so it returns only real calendar dates (YYYY-MM-DD, or YYYY-MM expanded to day 01), and '' otherwise. A new helper invalidAsOf() returns a non-empty as-of value that is not a valid date. collectRegistry() throws a clear error before any request when invalidAsOf() is set, and studyReviewHtml() adds a 'need' row titled 'Registry as-of date' that names the bad value. A new test is added to UI_TESTS (the 'view' suite, runUiTests).

**Validation:** Applied all four edits with exact, unique-match replacement to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/F08, served it on port 8818 and reran repro08.cjs. Results: 2026-99-99, 2023-02-30, 2026-13, 2026-00 and junk all now give registryAsOf() === ''. 2016-01 still gives 2016-01-01 and 2016-01-31 is unchanged. collectRegistry() throws "Registry data as of “2026-99-99” is not a valid date ..." before any fetch, and does the same for 'junk'. The study review checklist shows the new row. `node tools/build.mjs --check` reports the kernels in

**Risks:** 1. Behaviour change for a non-empty but invalid as-of value such as 'junk': it used to mean "no back-test, use today's data" and now blocks the registry step with an explicit error. This is deliberate, because the old fallback was silent look-ahead. A project file saved with such a value will load but cannot fetch registry data until the field is corrected or cleared. 2. Project load is still not refused for a bad asOf. Validation at load time was left out on purpose so old projects keep opening

### N01: Benchmark pooling overrides the normalized rate basis

**Reproduction:** I served the original repo on 127.0.0.1:8818 and drove it with Playwright (/tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/n01repro.cjs), calling the real importBenchmark() and bmSummary().
(a) Input 'country,enrolled per site per year,patients randomized,site_months\nItaly,12,120,10'. The app detected unit 'year' and normalized the row to rate 1 with basis 'rate column'. bmSummary().overall returned {rate:12, pooled:true}.
(b) Input 'country,screened per site per month,screen failure rate,patients randomized,site_months\nItaly,1,25%,120,120'. The app detected counts 'screened' and normalized the row to rate 0.75 with basis 'screened rate × (1 − screen failure)'. The overall result was {rate:1, pooled:true}.
So the aggregate the user sees, and can apply as the benchmark rate or as country overrides, ignores the rate basis that normalization chose a

**Assessment:** bmNormalize makes the rate column the authoritative basis. It converts a per-year rate to per-month and multiplies a screened rate by (1 − screen failure). Counts are used only when no rate exists.

bmAggregate, however, pools Σpatients/Σsite-months whenever every row has those two fields, whatever each row's basis is. The headline benchmark, the per-country rates and the values written by bmApplyOverall/bmApplyCountries can therefore come from a different basis than the one shown per row and set by the user's Unit/Counts choices. Vendor exports (Citeline/Medidata) often carry both a rate column and patient/site/duration columns, so this is not exotic.

In a feasibility tool this changes the enrollment rate that drives the forecast. Example (a) is off by 12×, which checkNum would only catch above the 50/site/month maximum. Example (b) overstates the randomized rate by 33%. The user is to

**Proposed fix:** In bmAggregate, pool Σpatients/Σsite-months only when every row's normalized rate was itself derived from those counts (basis starts with 'patients', or no basis on legacy rows). Otherwise use the existing weighted median of normalized row rates, so the per-year→per-month and screen-failure conversions are kept. Also added a regression test to the UI_TESTS 'Benchmark' group.

**Validation:** I applied both edits to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/N01. Each old_string was confirmed to occur exactly once. `node tools/build.mjs --check` reports the kernels in sync; the edits do not touch the kernel block.

I re-ran the repro against the served copy:
- (a) now gives {rate:1, pooled:false}.
- (b) now gives {rate:0.75, pooled:false}.
- The counts-only control still gives {rate:0.8, pooled:true}.

tests/run-app-suites.cjs with APP_URL pointing at the copy: all suites pass. parser 100/100, engine 103/103, lifecycle 10/10,

**Risks:** - **Changed results for some imports:** files that map both a rate column and patients plus site-months now report the median of the normalized rates instead of a pooled counts rate, and the panel label switches from "pooled" to "median". This is intended, but benchmark values may differ from what users saw before.
- **Mixed files:** where some rows are counts-derived and some come from a rate column, the median now covers all rows. It already did whenever any row lacked counts.
- **Disagreement

### N02: Benchmark number parsing too permissive (e.g. "12abc", negative counts)

**Reproduction:** Served the original repo on 127.0.0.1:8819 and ran Playwright with /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/n02repro.cjs. Results:
- bmNumber('1-2') gave {n:1}, '12abc' gave 12, '1.5.6' gave 1.5, 'abc5' gave 5, '$1,200' gave 1200, '12%' gave 12 (accepted for any column). With decimal comma on, '1,2,3' gave 1.23.
- importBenchmark('Country,Rate per site month,Patients Randomized,Site-Months\nAland,1,-100,100\nBorduria,0.5,-5,10') kept both rows with nothing skipped. bmSummary() then gave overall pooled rate -0.9545, Aland -1 and Borduria -0.5, all marked pooled:true.
- importBenchmark('Country,Patients Randomized,Number of Sites,Enrollment Months\nAland,1-2,10,12abc\n...') kept Aland with patients=1 and siteMonths=120, so rate 0.0083 came from two corrupted cells without any warning.

**Assessment:** The finding is confirmed in the real app. bmNumber uses parseFloat after deleting every character outside [0-9.-eE], so a range ("1-2"), a cell with a note ("12abc"), a currency value or a misplaced decimal is read as a fragment of a number. The row is then treated as valid input and nothing is skipped or reported. Negative counts are never rejected. Because the row rate came from the rate column, bmAggregate's pooled branch (Σpatients/Σsite-months) used the negative patient count and showed a negative benchmark rate in the panel.

Impact is limited by one existing check: bmApplyOverall/bmApplyCountries run checkNum against the 0-50 schema, so a negative rate cannot be written into the forecast. The more dangerous case is the silent one. A positive but wrong rate from a mangled cell ("12abc" months, "1-2" patients, "0,74" in a comma-quoted file read as 74 and later skipped as >50, or a w

**Proposed fix:** bmNumber now validates the whole string. It returns null for an empty or NA cell (as before) and false for a cell that is not a number. Thousands separators are removed only when they form proper groups (comma, or dot when decimal comma is detected, or space/NBSP/narrow NBSP). The decimal comma is converted only when detected. A trailing % is accepted only when allowPct is set (the screen-failure column). The cleaned string must then match a strict numeric pattern and is converted with Number().

bmNormalize collects the mapped column names that fail and skips the row with the reason 'not a number in <column>'. It also skips rows with negative patients, sites, months, site-months or trial count. Row line numbers are kept in skipped[].line, and the reason text stays constant per column so the panel's grouped reason counts still work.

bmAggregate's pooled branch also requires patients >= 

**Validation:** Applied the edits and the new test to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/N02 using the scripts n02apply.py and n02test.py in that folder, then served the copy on 8819.

Re-running the repro on the copy:
- '1-2', '12abc', '1.5.6', 'abc5', '$1,200' and '1,2,3' (with decimal comma) now return false.
- '12%' outside the SF column returns false.
- '1,234.5', '1 234' and '1e3' still parse. With decimal comma, '1.234,5' gives 1234.5 and '0,74' gives 0.74.
- The negative-patients file now skips both rows ('negative patients, ...') and bm

**Risks:** - Rows that used to import with a silently truncated value are now skipped. Users will see more skipped rows, but each one has a reason grouped by column in the panel.
- Exports with currency or unit suffixes (e.g. '0.5 pts'), or Indian-style digit grouping (12,34,567), are now rejected rather than guessed.
- '0,740' in a comma-decimal file is now read as 0.74 rather than as the thousands-grouped 740. Leading-zero groups are not treated as thousands. This is a small intended behaviour change.
- 

### N03: Clearing benchmark data deletes the audit log while rates stay applied

**Reproduction:** Served the original repo on 127.0.0.1:8820 and drove it with Playwright (script: /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/n03repro.cjs). Steps: r2Ready(); importBenchmark('country,rate_per_site_month\nAland,1.25\nBorduria,0.9','bench.csv','internal'); bmApplyCountries(['Aland'],'Internal phase 3 data'); bmApplyOverall('Internal benchmark'); UX_IO.confirm stubbed to accept; ACTIONS.bmClear(); recompute.
Before clearing: Aland rateBasis 'benchmark import', rate 1.25, benchmarkRate 0.9, Method risk 'Recruitment rates use imported benchmark data' shown, log has 2 entries.
After clearing: Aland rate still 1.25 and benchmarkRate still 0.9, but rateBasis is now 'manual override', the benchmark risk is gone, S.benchmark is null (log gone), buildReport().benchmark is missing, and the panel has no log. The confirm dialog said "Clearing the data keeps 

**Assessment:** The finding is correct. bmClear() sets S.benchmark to null, and S.benchmark.applied is the only record of where the benchmark values came from. bmActive() reads that log, so once it is gone the country rate is relabelled 'manual override'. The 'imported benchmark data' risk, the report's benchmark section and the saved project file also lose the source, reason and date. Meanwhile the forecast still uses the vendor or internal benchmark numbers. In a clinical-trial feasibility tool that is an audit-trail gap: a reviewer sees a hand-entered override with no source behind a recruitment rate that actually came from licensed benchmark data. The confirm text promises the opposite of what happens. Forecast numbers are not changed, so this is a traceability problem, not a calculation error, hence medium severity. I did not revert the applied values on clear, because that would silently change th

**Proposed fix:** bmClear keeps a stub of S.benchmark (source, file name, import date and applied log; no rows, headers or mapping; plus clearedAt) while any logged value is still active. Otherwise it clears to null as before. benchmarkPanel shows the cleared stub as a note plus the log, which still has its Revert controls. The shared status line and log markup were pulled into a `tail` string so both panel branches use it. The confirm and status wording are corrected. validateProjectState checks clearedAt when it is present. A new Benchmark test is added to the UI_TESTS list (runUiTests / 'view' suite).

**Validation:** Applied the edits by script, each asserted to match exactly once, to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/N03. `node tools/build.mjs --check` reports the kernels in sync. The repro on the copy, served on port 8821, now shows after clearing: rateBasis 'benchmark import', the risk still present, a log of 2 entries, the report still has its benchmark section, the panel shows the log, and the confirm and status text are correct. tests/run-app-suites.cjs on the copy: all suites PASS (parser 100/100, engine 103/103, lifecycle 10/10, ux 2

**Risks:** A cleared stub keeps S.benchmark non-null, so the 'Clear benchmark data' button still shows. Clicking it again after the values are reverted or changed removes the stub fully. The project-export note near line 7199 will say "the 0 normalized rows ... and the benchmark log are included" for a stub. That is accurate but awkward wording and was left alone as cosmetic. A re-import after clearing replaces the stub and keeps the previous log, as importBenchmark already did, and clearedAt is not carrie

### N04: Chained benchmark revert fails

**Reproduction:** Served the unmodified repo (port 8921) and drove it with Playwright (/tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/n04repro.cjs):
1. r2Ready(); importBenchmark('Aland,1.25 / Borduria,0.9','bench1.csv','internal'); bmApplyOverall + bmApplyCountries(['Aland']), which logs entry 1 (overall 0.9, previous null) and entry 1 (Aland 1.25, previous null).
2. Re-imported 'Aland,0.6 / Borduria,0.4' as bench2.csv (the log carries over through prevLog) and applied again, which logs entry 2 (overall 0.4, previous 0.9) and entry 2 (Aland 0.6, previous 1.25).
3. Reverted both entry 2s. The values went back correctly to benchmarkRate 0.9 and Aland 1.25.
Observed on the original:
- bmActive('overall') and bmActive('country','Aland') returned null, although the values in force are entry 1's and entry 1 was never reverted.
- Aland rateBasis was 'manual override', no

**Assessment:** bmActive walks the log backwards and returns at the first entry for that kind and country, even when that entry is reverted. A reverted later entry therefore hides the earlier entry whose value it restored.

The refused revert is the smaller problem. The provenance labelling is wrong too. After an apply → apply → revert sequence, benchmark-derived rates are still driving the forecast, but the app labels them as follows:
- The country rateBasis says 'manual override' (line 3656).
- They are left out of bmUsed (line 3848).
- The executive-summary note says "Not applied to the forecast yet".
- The log shows "superseded" with no Revert button.

In a clinical-trial feasibility tool, source attribution of enrolment-rate assumptions matters for review and audit. Here the report hides the fact that an imported benchmark is driving the forecast. The user can still fix the values by hand under Pla

**Proposed fix:** In bmActive, skip reverted log entries with `continue` instead of stopping at them, and drop the now-redundant !a.reverted from the return. Update the comment to match. Add a UI_TESTS 'Benchmark' test covering a two-step apply/revert chain for both the overall and the country rate, including the labelling (rateBasis and bmNote), the out-of-order refusal and the double-revert refusal.

**Validation:** I applied the three edits with exact-match replacement (each old string occurs exactly once) to the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/N04.

- `node tools/build.mjs --check`: in sync. The kernel block is untouched.
- Repro on the copy: fixed (details under reproduction).
- tests/run-app-suites.cjs with APP_URL pointing at the copy (port 8922): all 10 suites pass. parser 100/100, engine 103/103, lifecycle 10/10, ux 20/20, r2 20/20, project 21/21, r3 33/33, view 35/35, flex 17/17, gemini 30/30.
- The view suite really includes the new 

**Risks:** Low. Identity is still decided by value equality, same as before. If a user changes the value by hand and then sets it back to exactly an earlier unreverted benchmark value after a later revert, that entry counts as active again. The current code has the same property for the latest entry, so this adds no new class of mismatch. Project files saved before the fix load unchanged, because the log format is the same. The only change is that some entries previously shown as "superseded" now show as a

### D01: Report text still says "no retrospective validation"

**Reproduction:** Served the original repo on 127.0.0.1:8822. In Playwright I ran r2Ready() and then built all four outputs (buildBidSummary(), buildCountryRecommendation(), buildSitePack(S.fp.shortlist[0].id), runManifest().limitations), keeping each line that mentions 'retrospective' or 'back-test'. The script is at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/d01repro.cjs. What came back:
- bid: '- Probabilities are scenario estimates from an unvalidated model (no retrospective validation against recruitment outcomes yet).' The same document also has a risk line saying 'Back-tests of completed trials found timing errors about twice as large with fewer than 30 comparators (median 63% vs 37%)', so the bid summary contradicts itself.
- rec: '...(no retrospective validation against recruitment outcomes); they are scenario estimates, not predictions.'
- site: '- Fo

**Assessment:** Confirmed in the real app. Every generated report (bid defense summary, country recommendation, site engagement pack) and the run-manifest JSON says there has been no retrospective validation against recruitment outcomes. That is factually wrong after v0.9.3 and v0.9.4, which back-tested 57 completed trials and recalibrated σ and comparator matching on them. The README already says so, and the bid summary's own risk text cites those back-tests. Who it matters for: sponsors, CRO feasibility leads and auditors who read the exported reports. A self-contradicting or inaccurate limitations statement weakens trust in the documents and misstates the evidence. It does not change any number or decision, so severity is low.

The opposite mistake is just as important to avoid. The back-test is not independent validation: the same 57 trials were used to tune the calibration (σ rule, matching thresho

**Proposed fix:** Add one top-level constant VALIDATION_STATUS next to MODEL_DEFINITIONS_VERSION. It describes the 57-trial retrospective back-test as exploratory: also used for calibration, with the v0.9.4 default figures (84% inside the 80% range, 33% median timing error), and not prospective or held-out validation. Use it in the four places that said 'no retrospective validation': buildBidSummary, runManifest().limitations, buildCountryRecommendation and buildSitePack. Add one R2 test that builds all four outputs, checks each contains the constant and none says 'no retrospective validation', and checks that the constant keeps both the '57 completed trials' and the 'not prospective or held-out' qualifiers.

**Validation:** I applied the edits with a Python script that asserts each old_string occurs exactly once, working on the copy at /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/D01. Exact edits as JSON: /tmp/claude-0/-home-user-feasibility/c8d2e9e6-0485-5a69-97a2-5b03a59142d0/scratchpad/wf/d01edits.json.
- `node tools/build.mjs --check` on the copy reports the HTML is in sync; the kernel block was not touched.
- Repro on the copy (port 8823): all four outputs now carry the new sentence, and 'no retrospective validation' appears nowhere in the HTML except inside the new

**Risks:** The constant hard-codes the v0.9.4 back-test figures (84%, 33%). They must be updated whenever the stress test is re-run or engine defaults change. The '(v0.9.4 defaults)' tag keeps them honest in v0.9.5, whose changelog adds benchmark import without changing the default engine. The figures also do not describe runs where the user has applied overrides or benchmarks, and the wording only claims them for the defaults.

In the bid summary and the site pack, 'not validated predictions' is followed 
