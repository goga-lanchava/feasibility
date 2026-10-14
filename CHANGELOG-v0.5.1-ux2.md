# Feasibility Pipeline v0.5.1+ux2: stabilization of UX Release 1

Review fixes on top of v0.5.1+ux1 ([CHANGELOG-v0.5.1-ux1.md](CHANGELOG-v0.5.1-ux1.md)). Release 2 has not started. Verified 2026-10-13.

No change to the Monte Carlo kernels, seeded RNG draw order, allocation constraints, country-effect coefficients, worker controller, eligibility logic, forecast equations or the lower-pool default. This release does not establish clinical eligibility, validated recruitment prediction, privacy compliance or production readiness.

## Identity

| Item | Value |
|---|---|
| Baseline | v0.5.1+ux1, SHA-256 `a675139e…5767` (kept as `feasibility-pipeline.v0.5.1-ux1-backup.html`) |
| Release | `feasibility-pipeline.html` v0.5.1+ux2, SHA-256 `298b2c59144247f744e11776fa2f3f516502d99d0bdb498c779fb98af8be5882` |
| Engine | `mc-kernels/1` `cbf3cc09…bde199`, adapter `14556f95…e43c`; unchanged. `build.mjs --check` is in sync, and the page's runtime re-hash reports `integrityVerified: true`. |

## Fixes

### 1. Evidence governance (the four pre-staged v0.5.2 tests are now green, unmodified)
- `importIntel`: validates every record before any evidence state changes. Imported records keep their own retrieval date (`at`), `model` and study context (`sourceKey`, `contextMismatch`). An undated record gets `at: null` and `undated: true`; the import time is stored only in `importedAt` and is never used as a retrieval time.
- `validateIntel`: rejects the whole file if any record has an unparseable retrieval date or one in the future (5-minute clock tolerance).
- `sanitizeIntel` + new `assessConfidence`: keeps `confidenceReported` and records why it was lowered in `confidenceNote`. Confidence is only ever lowered, never raised:
  - "high" with no estimate becomes "medium".
  - Numeric estimates with no cited source become "low".
  - Re-assessing an already assessed record starts again from the reported value, so the result is stable.
- `wsWeb`: shows the opt-in checkbox (wired to the existing `acceptUnverifiedEvidence` handler) whenever imported records are blocked as undated or researched for another study. Before this, nothing visible set that flag.

### 2. Demo/example provenance (new `S.provenance`, set at load time)
- Nothing is inferred from `S.mode === 'emr'` or from matching text. Pasting the example text by hand is treated as your own input.
- Inputs are marked when loaded:
  - synthetic EMR (`loadDemoEmr`)
  - synthetic history (`loadDemoHistory`)
  - example protocols and the example footprint (step 3 example buttons, and both `runAll` fallbacks)
- An edited example stays "edited from the example" while at least 25% of its substantive lines remain.
- These clear the marker permanently:
  - replacing the text with something else
  - a protocol file (`loadProtocolFile`)
  - a real EMR import (`ingestText`)
  - an uploaded site history (`harmonize`, non-registry)
- Every input is reported individually as synthetic, example, derived from example, or user (`inputProvenance`). Mixed states are labelled "Mixed inputs".
- One sentence, `provenanceSentence`, feeds the banner, the JSON report (`syntheticOrExampleInputs`, `userInputs`, `inputProvenance`, `inputProvenanceNote`), the bid summary and the copied executive summary.

### 3. Destructive demo actions
- *Exit demo* and *Try the synthetic demo* ask for confirmation whenever the analysis holds user work: real inputs, edited examples, edited criteria, country overrides, imported responses or market evidence.
- The message lists the work that would be lost and states that the whole analysis is cleared, not just the demo parts. Cancel leaves the analysis unchanged.
- A pure demo exits without asking. The mixed-inputs banner also warns that exiting clears your inputs.

### 4. Country scenario wording
- Columns are now *Lower-rate scenario (−25%)*, *As modelled* and *Higher-rate scenario (+25%)*, under the heading "Country footprint: recruitment-rate scenarios".
- The text says they are sensitivity scenarios, not bounds, and not eligibility pools. The EMR group is titled "EMR forecast: eligible-pool scenarios".
- The EMR upper-pool card no longer says "ceiling".

### 5. Verdict explanation
- `VERDICT_THRESHOLDS` = 80% / 50%, the same cut-offs the risk flags use. `verdictRule()` states both thresholds and says they are application decision thresholds applied to simulated outcomes, not validated recruitment standards.
- The rule appears under the verdict and in the copied executive summary.

## Changed functions

- **New:** `assessConfidence`, `markExample`, `clearProvenance`, `exampleState`, `inputProvenance`, `demoParts` (rewritten), `userParts`, `provenanceSentence`, `userWork`, `withProvenanceNote`, `loadProtocolFile`, `verdictRule`, `runUxTests`, `UX_IO` (confirm/clipboard seam), `UX_TESTS`.
- **Modified:**
  - Evidence: `sanitizeIntel`, `importIntel`, `validateIntel`, `wsWeb` (opt-in checkbox).
  - Inputs and actions: `ACTIONS.runAll` (marks example fallbacks, 2 lines), the protocol-file branch of the change handler, `freshState` (`provenance: {}`).
  - Wrappers: `loadDemoEmr`/`loadDemoHistory`, and new provenance wrappers on `ingestText`, `harmonize` and `ACTIONS.demoProto`.
  - Summary and setup: `buildReport` and `buildBidSummary` (wrappers), `renderStart`, `startHtml` (checklist labels), `rangeModel`, `verdictOf`, `decisionSummary`, `buildExecSummary`.
  - Demo actions: `ACTIONS.startDemo`, `ACTIONS.exitDemo`, `ACTIONS.copyExec` (copies via the `UX_IO` seam).
  - `ws3` (UX test panel) and the setup change listener (refreshes the banner when protocol edits are committed).

## Intentional behavioural changes
- Choosing *Synthetic EMR demo* in the header no longer shows the demo banner by itself; the banner appears once synthetic data is loaded.
- Example text that was typed or pasted (not loaded with an example button) is treated as the user's own input.
- Imported evidence without a retrieval date, or researched for a different study context, is not used in the forecast until the user ticks the opt-in. In ux1 such records were stamped with the import time and used.
- Imported confidence can be lowered by the policy; the original value stays visible as `confidenceReported`.
- Evidence files with an invalid or future retrieval date are rejected whole.

## Verification (final file)

| Suite | Result |
|---|---|
| Parser | **68 / 68** |
| Engine (existing) | **103 / 103**. Test code is byte-identical to the pre-release file. |
| UX regression (new, separate) | **20 / 20** |
| Worker lifecycle (real worker, Step 3 button) | **10 / 10** |
| Node `tests/kernels.test.mjs` | **10 / 10** |
| Kernel/adapter integrity | `build.mjs --check` in sync; runtime `integrityVerified: true`; no `new Function` / `eval` |

Browser checks: in-app Chromium at `http://localhost:8765`, desktop width and 375 px.

- **Empty state**, including the `emr` run mode with nothing loaded: no banner.
- **Synthetic demo**, started with a real click.
- **Demo edit**: typed in step 3; the banner switched to "edited from the example" once the edit was committed.
- **Exit demo**: Cancel left the analysis unchanged; OK cleared it.
- **Mixed state**: the UC example plus an uploaded-style EMR file, then a live run. The banner, JSON report, bid summary and copied executive summary all carried the same provenance sentence.
- **Real country path**: live ClinicalTrials.gov, no banner, renamed scenarios, 21 tooltips. Hover, focus, Escape, tap-to-pin and tap-outside all work.
- **Export gating**: Decision Summary, copy and download were all blocked while running and after cancel, and worked when results were current.
- **Layout**: no horizontal page scroll at either width. No page errors.

## Not executed
- **The native `window.confirm` dialog was not clicked by hand.** In the browser checks it was replaced through the `UX_IO.confirm` seam with a recorder that answered Cancel or OK. The wiring from the button to the dialog to the outcome was exercised; the browser's own dialog UI was not.
- **Real Claude API country research was not run** (no key in this session). Evidence import was tested with fixtures.

## Remaining limitations
- The header *Reset* button still clears without confirmation (unchanged; outside the demo-action scope).
- The "edited from the example" rule uses a line-overlap threshold (≥25% of substantive example lines). A heavily rewritten example may lose the marker sooner than a user expects.
- The provenance banner refreshes when a protocol edit is committed (on blur), not on every keystroke.
- Remaining ux1 limitations still apply (range run counts, summary hidden during worker jobs, prior-rate fallback without site history).
