# Feasibility Pipeline v0.6.0: Release 2 (country recommendation workflow and Evidence Health)

Built on the accepted v0.5.1+ux2 baseline ([CHANGELOG-v0.5.1-ux2.md](CHANGELOG-v0.5.1-ux2.md)). Verified 2026-10-13.

Unchanged and checked byte-identical against ux2:
- Monte Carlo kernels and adapter (embedded block and `src/` hashes)
- RNG draw order
- `computeFootprint` and the allocation optimizer
- Worker controller (`ensureSimulationWorker` … `updateWorkerPanel`)
- Eligibility evaluation and country-effect coefficients
- All existing test definitions

This release does not establish clinical eligibility, validated recruitment prediction, source verification, reviewer authentication, privacy compliance or production readiness.

## Identity

| Item | Value |
|---|---|
| Baseline | v0.5.1+ux2, SHA-256 `298b2c59…5882` (kept as `feasibility-pipeline.v0.5.1-ux2-backup.html`) |
| Release | `feasibility-pipeline.html` v0.6.0, SHA-256 `55f0f1c533345bf67e40b0a28cef24927788f55260524eb8d10a227a87c1e269` |
| Engine | `mc-kernels/1` `cbf3cc09…bde199`, adapter `14556f95…e43c`. `build.mjs --check` in sync; runtime `integrityVerified: true` |

## Features

### 1. Country decisions (step 5, "Your country decisions")
- One card per relevant country: sponsor, optimized and user countries, decided countries, unmodelled sponsor countries, and the top 8 by computed rank.
- Each card shows:
  - the computed rank and score (read-only)
  - sites per footprint
  - the committed decision with its reason and timestamp
  - evidence status
  - main risk and next action
- Decisions: Recommended / Conditional / Watchlist / Excluded, or Clear. Every commit or change needs a reason (at least 3 characters); identical re-commits and unknown values are refused. All changes go to a decision log.
- Decisions live in `S.countryReview`. They never touch `S.fp` rankings or allocations, and never start or invalidate a simulation.
- Drafts (`S.crDraft`) survive background re-renders.

### 2. User-selected footprint and three-way comparison
- The user footprint can be created from the optimized or the sponsor footprint and edited per country.
- **Apply decisions to user-selected footprint** is an explicit action that changes only the user footprint:
  - Excluded/Watchlist → 0 sites.
  - Recommended/Conditional with 0 sites → the optimized count, else the sponsor count, else the minimum per country.
  - Unmodelled countries are skipped and reported.
- **Calculate user footprint** sends the main payload through the existing `requestSimulation('run', …)`. Only the footprint slot changes, so the same kernel, rates, start-up, stagger, σ, runs and seed are used.
  - Countries are sent in the optimized footprint's order, so an allocation identical to the optimized one reproduces the optimized result exactly.
  - The result is current only while `simulationResultsCurrent()` holds and its own signature (main signature + allocation) matches. Any allocation or main-input edit invalidates it.
- The comparison table shows, for sponsor / optimized / user:
  - per-country sites, rate and start-up
  - totals and countries
  - sites-weighted rate and start-up
  - share of runs reaching the target, median months, and median (P10–P90) randomized by the deadline
- **Differences in inputs** lists what is shared and every allocation difference. It also flags unmodelled sponsor countries and user countries that are switched off for the optimizer.
- Results are shown only when current; otherwise a cell reads "Not current" or "Not calculated for the current inputs".

### 3. Evidence Health (step 2)
- Counts for Current, Expired, Undated, Other study context, Missing sources and Needs review. A record can be in several groups.
- **Source-linked** (a link is listed) is kept separate from **reviewed by you** (a local decision). The panel states that sources are not opened or verified and that reviewer labels are not authenticated.

### 4. Evidence acceptance and rejection
- Each record has a stable identity (`evidenceId`). Review fields: reason (required), optional reviewer label (`reviewerAuthenticated: false`), timestamp, and a snapshot of the record's retrieval date, undated flag and context mismatch (`sourcesVerified: false`). All reviews go to a log.
- `evidenceBlock` precedence: rejection > per-record acceptance > global opt-in.
- Acceptance only opens the undated / other-study gate. It never dates a record, never clears `contextMismatch`, and never revives expired records.
- The global opt-in keeps its behaviour; its scope is now explained next to it. The checkbox moved from the export bar into Evidence Health (same handler).
- Every review change calls `recompute()`: old forecasts are cleared at once and recalculated.

### 5. Country recommendation document (`country_recommendation_<date>.md`)
- Contents:
  - input provenance, application version, engine version and generation date
  - study target and timeline
  - sponsor / optimized / user footprints with results and input differences
  - country decisions with reasons
  - rate-scenario results
  - evidence gaps
  - top risks and actions
  - model assumptions, the verdict rule, and limitations
- Goes through `blockExport()`. A stale user footprint is written as "not calculated for the current inputs".
- Available from the comparison panel and the Decision Summary. The JSON report gains `countryDecisions`, `userFootprint` and `evidenceReview`.

### 6. Header Reset protection
- When the analysis holds user work, Reset asks first. User work covers real inputs, edited examples, criteria edits, overrides, responses, market records, country decisions, evidence reviews and a user footprint.
- Cancel leaves the analysis unchanged.
- Demo start/exit use the unguarded reset internally, so their own confirmation is not doubled.

### Small layout fixes (CSS only)
- At ≤640 px, the step header and chips inside callouts/notes wrap. Both overflows predate this release (a status chip and an allocation note in step 4).

## Changed functions

- **New:**
  - Country decisions: `commitCountryDecision`, `reviewCountries`, `countryRisk`, `countryNextAction`, `countryEvidenceText`, `countryReviewPanel`.
  - User footprint and comparison: `startUserFp`, `setUserFpSites`, `applyDecisionsToUserFp`, `engineOrder`, `userFpSignature`, `userFpCurrent`, `runUserFootprint`, `footprintModels`, `allocAssumptions`, `inputDifferences`, `footprintComparisonPanel`.
  - Evidence: `evidenceId`, `evidenceHealthOf`, `evidenceHealthPanel`, `reviewEvidence`, `evidenceAction`.
  - Export and reset: `buildCountryRecommendation`, `resetAnalysis`.
  - Tests: `r2WebFixture`, `runR2Tests`, `R2_TESTS`.
  - Actions: `crSave`, `ufpStart`, `ufpApply`, `ufpRun`, `ufpDiscard`, `evAccept`, `evReject`, `evClear`, `dlCountryRec`, `r2Tests`.
- **Modified:**
  - Evidence: `evidenceBlock` (per-record review), `evidenceState` (adds `review`, "rejected" label), `wsWeb` (Evidence Health replaces the export-bar checkbox).
  - Actions: `ACTIONS.reset` (guarded), `ACTIONS.startDemo` / `ACTIONS.exitDemo` (call `resetAnalysis`).
  - Wrappers: `ws5` (panels added above the existing ranking), `userWork`, `buildReport`.
  - Other: `freshState` (new state fields), `decisionSummary` (export button), `ws3` (Release 2 test panel), CSS.

## Intentional behaviour changes
- **Header Reset now asks before clearing user work.** It used to clear immediately.
- **Imported evidence can be rejected per record,** which removes it from the model even when it is current and even with the global opt-in on.
- **A per-record acceptance makes one undated or other-study record usable without the global opt-in.**
- **The global opt-in checkbox moved into Evidence Health.** Its behaviour is unchanged.

## Verification (final file)

| Suite | Result |
|---|---|
| Parser | **68 / 68** |
| Engine (existing) | **103 / 103** |
| UX regression (existing) | **20 / 20** |
| **Release 2 regression (new, real worker, offline fixture)** | **20 / 20** |
| Worker lifecycle (real worker, Step 3 button) | **10 / 10** |
| Node `tests/kernels.test.mjs` | **10 / 10** |
| Integrity | `build.mjs --check` in sync; runtime verified; no `new Function` / `eval` |

All existing test definitions are byte-identical to ux2.

**Mutation checks:** each test below was re-run with the code deliberately broken, and each failed as expected.
- Labels silently changing the optimized allocation: caught by *Review labels change neither…*
- Acceptance stamping a date on an undated record: caught by *Accepting an undated record…*
- The recommendation export skipping the current-result gate: caught by *The recommendation document is refused…*

**Browser checks** (in-app Chromium, `http://localhost:8765`):

- **Live ClinicalTrials.gov country path:**
  - A decision entered with the keyboard: the empty reason was refused, the commit worked, and focus stayed on the button.
  - The sponsor and optimized allocations and the run ID were unchanged.
  - Apply decisions, then Calculate: the result was identical to the optimized one when the allocation was identical.
  - Editing a User cell invalidated the result, and the export then said "not calculated for the current inputs".
- **Evidence Health:**
  - Undated, missing-sources and current records were grouped correctly.
  - A keyboard acceptance with a reviewer label triggered a recalculation: Poland's start-up went from 6 to 14 months. The record stayed undated and the label was marked not authenticated.
- **States:** synthetic demo (no country model, so the country panels stay hidden), mixed (UC example protocol plus your own country list, live), and real-data. All six screens render in every state.
- **Layout:** no horizontal page scroll at 375 px, 566 px (pane default) or 1280 px.
- **Tooltips:** all 21 present.
- No page JavaScript errors.

## Checks not executed or only partly executed
- **Native confirmation dialog, OK path:** not executable here. The app calls the real `window.confirm` (verified by wrapping it). This in-app browser closes JavaScript dialogs automatically and returns `false` within 1 ms, so the **Cancel** outcome is verified with the real native dialog, but an operator clicking OK is not. The OK path is covered by regression tests through the `UX_IO.confirm` seam.
- **Live Claude API country research** was not run (no key). Evidence was supplied through `importIntel` fixtures, the same path as the file importer.

## Remaining limitations
- **Mislabelled progress text:** while the user footprint calculates, the worker panel's progress text says "Recommended footprint". The unchanged worker adapter labels the second footprint slot that way.
- **Results hidden during a calculation:** while the user footprint (or any worker job) runs, steps 4–6 show "Current simulation results are not available" until it completes.
- **User footprint is opt-in to recalculate:** it is recalculated only on request. It is never auto-run after main-input changes; it is just marked not current.
- **No country model in the demo:** the synthetic EMR demo has no country footprint, so it shows no country decisions or comparison.
- **Evidence review identity:** a re-imported or re-researched record is a new record, so earlier reviews do not carry over to it.
- **Decisions are not persisted:** decisions and reviews live in the analysis state and the JSON report. They are lost on page reload, like all other analysis state.
