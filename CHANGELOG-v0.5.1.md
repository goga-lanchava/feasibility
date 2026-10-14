# Feasibility Pipeline v0.5.1: changelog and verification

Correction patch implementing the *v0.5.0 Recommended Changes* brief (C1–C7). Verified 2026-10-13.

This patch improves correctness and lifecycle integrity. It does **not** establish clinical eligibility, validated recruitment prediction, comprehensive market intelligence, privacy compliance or production readiness.

## Identity

| Item | Value |
|---|---|
| Baseline | v0.5.0, SHA-256 `f2008613b77e82b0337f23fbd50daa3aa5cda5223d2bddc8e357aeea82ee0f0d` (kept as `feasibility-pipeline.v0.5.0-backup.html`) |
| Release | `feasibility-pipeline.html` v0.5.1, 537,248 bytes, SHA-256 `777e230612b9e36ffd58c9d59faf4eb4c57306d343bfce7d69f0be3fe3a6d6ff` |
| Numerical engine | `src/mc-kernels.js` (`mc-kernels/1`), SHA-256 `cbf3cc09d01adaab2b54c820e746edd7cb53d44ae1ed9b0a698bddfeb6bde199` |
| Worker adapter | `src/mc-worker.js` (`mc-worker/2`), SHA-256 `14556f957f975f765bd3db8a24f4bce24b3bdd4df34f2d6b6f85bd8cbca0e43c` |
| Test environment | Windows 11; Chromium-based in-app browser (Claude desktop) at `http://localhost:8765` (python http.server); Node v24.19.0 |

The run manifest in every JSON report now records the application version, the engine version, both engine hashes, and whether the page re-hashed and verified the engine it actually runs (`simulationEngine.integrityVerified`).

## Changes

### C1 (P0): Conditional eligibility handling (`evalNode`, `evalTop`)
- A criterion with a conditional sub-population clause is unresolved at every nesting depth, whether the base comparison passes or fails. The engine cannot establish the sub-population and its threshold, and the branch may be stricter or more lenient. The reason names the clause.
- Conditional handling is now separate from exception handling. Nested exceptions stay unresolved, as before.
- Top-level exceptions are simplified only where the relaxation semantics are safe: an exclusion's exception can only carve cases out, so a patient without the excluded concept stays not excluded. Inclusion exceptions may widen or narrow the requirement, so they are always unresolved.
- Exclusions are still inverted exactly once, in `evalTop`. An unknown raw predicate stays unknown after inversion.
- Conditional or exception uncertainty is never a screening-confirmation residual, so it never enters the central pool.

### C2 (P0): Temporal validation (`evalConcept` plus new helpers next to `monthsAgoOf`)
- New reusable predicates: `dateState` returns past, future, absent or invalid; also `startState`, `endState`, `periodInconsistent` and `badDate`.
- Ingestion flags unparseable dates (`dateInvalid`, `endInvalid`). It also counts anomalies in `ingest.dateQuality`: future diagnoses, future medication starts, future labs, invalid dates, and medication periods that end before they start. These counts appear in the Stage 1 log and the JSON report.
- Past-event windows require `0 ≤ monthsAgo ≤ window`. Future-dated or invalid records never count as history; they leave the criterion unresolved with a date-quality reason.
- A future medication start establishes neither current, prior nor in-window exposure. A future *end* date on an active course with a valid past start counts as ongoing.
- One valid past record can decide a criterion even when another record has a bad date. The anomaly is still reported.
- "For at least …" medication criteria now need a dated exposure span, and continuous exposure remains a screening confirmation (see changed behaviours).
- The cohort assumptions state the fixed analysis reference date and that it is not a screening or randomization date.

### C3 (P1): Signatures include the active rules (`simulationSignature`)
- Added the full serialized criteria to the existing signature, together with the protocol baseline and the reference date. "Full" means every semantic field, rule text, and review metadata such as `disabledReason`. All existing fields and the exact-string comparison are kept.

### C4 (P1): Worker callbacks scoped to their instance (`ensureSimulationWorker`)
- `onmessage`, `onerror` and `onmessageerror` return immediately unless `MC.worker` is still the instance that created them. Promise rejection, timeouts, supersession and recreation are unchanged, and there is still one controller.

### C5 (P1): Teardown (`pagehide`, new `pageshow`)
- `pagehide` cancels any job and then always disposes the worker and its Blob URL, including after a completed run.
- On a back/forward-cache restore, a still-current result stays valid. An interrupted job is recalculated, which creates a new worker.

### C6 (P1): Central assumed eligibility pool (`computeCohort`, Stage 4 UI, reports)
- **Policy:** the **lower** pool is now the default. The central pool is shown as **"Central assumed scenario — includes specified unverified requirements"** and is used only when selected explicitly.
- The internal enum `likely` is kept, so earlier configurations still load, with the new label and an assumption warning. Unknown values fall back to `lower`.
- Stage 4 shows lower, central-assumed and upper counts together. It lists which unverified requirements the central pool adds (criterion, requirement and record count) and states that the choice does not change machine-evaluated status. Selecting the central pool shows a warning and raises a risk flag.
- Records added by the central scenario keep the status `unresolved` everywhere. The patient-level CSV adds `unresolved_only_on_screening_confirmations`, `in_forecast_pool` and `forecast_pool_basis` columns.
- The JSON report records the basis label, the assumption, the policy, the reconciliation (`lower = meets; central = meets + designated confirmations; upper = meets + unresolved`) and the unverified requirements. The fan-chart heading, sensitivity table, surveys and bid summary also record the basis and assumption.
- No wording claims a "most likely" or expected eligible count.

### C7 (P2): One static numerical engine
- The kernels now live in `src/mc-kernels.js`, a pure module (no DOM, no app state) that loads as a classic script or as CommonJS. The worker message adapter is in `src/mc-worker.js`.
- `node tools/build.mjs` embeds both in the single-file release: `<script id="mc-kernels">` runs on the main thread, and `<script type="text/plain" id="mc-worker-adapter">` only ever runs inside the Blob worker after the identical kernel text. `--check` fails if the release is out of sync with `src/`.
- `workerCore()` returns the static kernels, so there is no `new Function` or `eval` anywhere. The main thread's RNG, allocation and simulation entry points delegate to the same kernels.
- The v0.5.0 main-thread engine is kept, with its own RNG copies, as a frozen **test-only reference** (`referenceSimulate`, `referenceSimulateFootprint`, `referenceOptimizeAlloc`). It is never used for results. The dead `sitesNeededLegacy` was removed.
- Seeded RNG draw order, quantile definitions and recruitment equations are unchanged; the kernel text was moved verbatim.

## Changed behaviours and expectations (please review)
No existing test expectation was changed or weakened: all 68 parser tests and all 70 v0.5.0 engine tests pass unmodified. The following behaviours did change on purpose:

1. **Inclusion criteria with an exception clause**: previously "meets" when the base rule passed; now unresolved (C1 #6).
2. **Exclusion residuals (my judgement call, beyond the letter of the brief).** For example, an exclusion with a washout qualifier where the drug is recorded was previously counted as a screening confirmation in the central pool. It is now an ordinary unresolved item, because for an exclusion the residual means the excluded concept *is* present. This makes the central pool more conservative; the change is one line in `evalTop` if you prefer the old behaviour.
3. **"For at least N" prior-medication criteria**: previously "meets" from a start date alone; now they need a dated exposure span, and continuity stays a screening confirmation (C2 #5, #8).
4. **Default forecast basis** changed from `likely` to `lower`. On the demo T2D data the lower pool is 0, so the default EMR forecast is zero. A note explains this and points to the explicit central-scenario choice.

Demo cohort counts are identical to v0.5.0 (T2D CSV 0 / 329 / 2,171 / 298; T2D FHIR 0 / 375 / 2,125 / 298; UC CSV and FHIR unchanged), because the demo data contain only valid past dates and no conditional clauses.

## Verification results

| Suite | Result | Notes |
|---|---|---|
| Parser (in-app) | **68 / 68** | unchanged |
| Engine and data integrity (in-app) | **98 / 98** | 70 existing + 28 new: C1 ×8, C2 ×10, C3 ×2, C6 ×4, C7 ×4 |
| Worker lifecycle (in-app, real Web Worker) | **10 / 10** | new: C3 live staleness, rapid edits, C4 replaced-worker events, real error, startup failure, cancellation, C5 teardown and restore, worker parity |
| Offline engine (`node --test tests/kernels.test.mjs`) | **10 / 10** | build sync, no runtime compilation, determinism, invariants, analytic expected values, allocation constraints, worker adapter via `worker_threads` |

**The new tests detect the v0.5.0 defects.** Run against v0.5.0, 14 of the 18 C1/C2 tests fail and 5 of the 7 C3–C5 lifecycle tests fail. The tests that pass on both versions are deliberate guards for behaviour the brief says to keep: valid past dates, OR/AND logic, real errors still rejecting, and cancel-then-retry.

**Numerical parity** (simulation summaries compared byte-for-byte excluding execution time; pool diagnostics checked separately):
- Kernel vs the frozen v0.5.0 reference: 15/15 site simulations (5 seeds × all sites, a selected portfolio, and a zero-eligible site) and 20/20 footprint and allocation cases (5 seeds × optimizer, sponsor, recommended and empty allocations).
- Pool diagnostics: respected in every case (`maxExcess ≤ 0`).
- Worker vs main-thread kernel: identical for all sites, a 3-site portfolio, and sponsor and recommended footprints. The Node adapter also matches for `run` and `sensitivity`.
- Independent expected values: footprint Poisson mean 179.6 vs analytic 180, and a saturated finite pool of 30.01 vs 30. As the brief notes, matching two executions of the same source is consistency evidence, not proof that the model is right.

**Browser checks (Chromium only).** These were run through the app's own event handlers:
- All six screens render without errors.
- Valid and invalid parameter edits are handled, including the activation min/max cross-check.
- The absence-assumption checkbox works.
- Disabling a criterion blocks export until a reason is given.
- Switching the pool basis invalidates the result and reruns.
- Sensitivity analysis works.
- The site-count search works for both a reachable target (9 sites, P = 0.95) and an unreachable one.
- Exports were checked: JSON report, patient-level CSV, bid summary, and survey text.
- CSV and FHIR import works, including future and invalid dates.
- Rule-set export and import round-trips exactly, and a bad rule set is rejected atomically.
- All 21 footprint help controls show ranges and respond to hover, focus, Enter, tap, click-outside and Escape.

Caveats on those checks:
- The pane was not the OS-focused window, so focus behaviour was confirmed by dispatching `focusin`.
- Exports were captured in-page instead of saved to disk.
- The footprint screens used a synthetic registry fixture instead of live ClinicalTrials.gov data.

## Hosting policy (C7)
v0.5.1 no longer needs `'unsafe-eval'`. Verified on localhost under this enforced policy, where all suites pass: parser 68/68, engine 98/98, lifecycle 10/10.

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self' data: blob:;
connect-src 'self' https://clinicaltrials.gov https://api.anthropic.com; worker-src blob:; base-uri 'none'; form-action 'none'
```

Under the same policy, v0.5.0 fails 5 engine tests with `EvalError` from its `new Function` engine. `script-src 'unsafe-inline'` is still needed because the app is a single file with inline scripts. **This policy must still be verified on the actual deployment.**

## Build and test
```
node tools/build.mjs            # after editing src/mc-kernels.js or src/mc-worker.js
node tools/build.mjs --check    # release gate: fails if the HTML is out of sync with src/
node --test tests/kernels.test.mjs
```
In the app, Step 3 (protocol) has three buttons: **Run self-test**, **Run engine tests** and **Run lifecycle tests**. The lifecycle suite replaces the current worker and recalculates your analysis afterwards.

## Known limitations and observations
- **Model property (not changed; needs a reviewed model change):** site rates scale with each site's eligibility *relative to the median site*. A scenario with larger but differently shaped pools can therefore recruit more slowly when recruitment is rate-limited. In one fixture the upper scenario (pool 288) had a lower median at deadline (51) than the lower scenario (pool 84, median 54). Ordering of lower ≤ central ≤ upper outcomes is guaranteed only when pools bind.
- Pre-existing: for the "other malignancy" branch where the study indication is as broad as the exclusion, the temporal window is not applied. v0.5.1 only stops future-dated records from counting there. This needs clinical review.
- In CSV problem lists, bracketed text that is not shaped like a date (e.g. `[unknown]`) stays part of the term, and the diagnosis counts as undated. Date-shaped impossible values such as `[2024-13-45]` are flagged as invalid.
- A future-dated *most recent* lab result leaves the lab criterion unresolved even when an older valid result exists. This is conservative and unchanged.
- Event ages are fixed at import relative to the analysis reference date, so re-importing later shifts the windows.
- No git repository: C7 is cleanly separable (`src/`, `tools/`, `tests/`, the two engine blocks, `workerCore`, and the reference functions), but it was not committed separately.

## Remaining production-readiness requirements
1. Retrospective and predictive validation against historical recruitment outcomes (review item 18), plus calibration of the eligibility scenarios and the rate model.
2. Clinical review of the C1/C2 semantics: exception handling, window edges, and treating continuous exposure as a confirmation.
3. Security for any shared deployment: the API key is held in the browser.
4. Privacy review and a formal de-identification assessment.
5. Cross-browser testing (Firefox, Safari, Edge) and live API testing (ClinicalTrials.gov v2, Anthropic Messages API).
6. Reviewed governance for country-research evidence.
7. Verification of the hosting policy on the actual deployment.
