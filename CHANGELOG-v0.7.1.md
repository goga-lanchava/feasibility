# Feasibility Pipeline v0.7.1: Standard / Expert view and protocol quick start

Built on v0.7.0 ([CHANGELOG-v0.7.0.md](CHANGELOG-v0.7.0.md)); kept as `feasibility-pipeline.v0.7.0-backup.html`. It adopts the useful ideas of the external "UI simplification patch" (folder 15) without the regressions found in that file. Verified 2026-10-14.

| Item | Value |
|---|---|
| Release | `feasibility-pipeline.html` v0.7.1, SHA-256 `f20cfbf2f2865c1f2c85b70494feef3eb04130d5745fc184880be6eef80de12d` |
| Engine | kernels and adapter unchanged, `build.mjs --check` in sync, runtime integrity verified |

Unchanged: all calculations, the worker controller, validation, persistence (no new project fields) and every existing test definition.

## Added
- **Standard / Expert view** (header button, `aria-pressed`, remembered in this browser only, never saved in a project). Expert-only items are hidden, never removed:
  - the verification suites, the vocabulary editor, the generated cohort query and forced re-research;
  - a few diagnostic columns and stats: known sites, SOC access, prevalence and source count (step 2); trials per site (step 5); parse engine and execution status (step 3); note redactions and capped ages (step 1).
  Every input that changes a result and every review or decision control stays visible in both views; a test enforces this.
- **Simpler layouts** with nothing removed:
  - Step 1: an "optional in live web mode" callout with a link to step 3; upload first; demo buttons labelled synthetic; formats, the de-identification log and the record preview collapsed. The import report, including unit mapping, stays visible.
  - Step 2: the four brief fields and footprint lists up front; history window, phases, sponsor type and research limits collapsed under a summary that shows their current values.
  - Step 4: target, window, site budget and budget mode up front; the other model assumptions collapsed under a summary showing runs and seed. Diagnostics, the countries-without-registry-data table, the method note, sensitivity and definitions stay visible.
- **"Parse and collect registry data →"** (step 3) chains the existing steps: parse only if rules are missing or out of date (edits are kept), fill blank brief fields only, collect ClinicalTrials.gov data, recalculate and open step 4. With an empty protocol it refuses and never substitutes an example; examples keep their example label.
- **View and quick-start suite** (`runUiTests`, 8 checks, Expert view in step 3).

## Not adopted from the external patch
Removing the disabled-rule reason box, threshold editing, the essential toggle, rule export/import, the assumed-rate inputs, the cap reason, allocation diagnostics and the UX / Release 2 / project test buttons; loading an example silently when the protocol is empty; force-overwriting the brief; and the labels "On-Time Probability", "Expected Timeline", "Feasibility Score" and "80% Confidence", which overstate an unvalidated scenario model.

## Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · Release 3 33/33 · lifecycle 10/10 · **view and quick start 8/8** · Node kernels 10/10. Mutation checks: substituting an example on an empty protocol, and hiding the disabled-rule reason box in Expert view, each failed the new suite. In the browser: a real click on the header button switched the view, updated `aria-pressed`, stored the choice and showed the suites.

## Not executed
Quick start against live ClinicalTrials.gov (tests stub the registry call); 375 px checked inside the test iframe only.
