# Feasibility Pipeline v0.5.1+ux1 — UX Release 1

Guided setup, synthetic-demo mode and a Decision Summary. Verified 2026-10-13.

Presentation-layer release. No change to the Monte Carlo kernels, seeded RNG draw order, allocation constraints, country-effect coefficients, worker controller, eligibility logic or forecast-pool policy. It does not establish clinical eligibility, validated recruitment prediction, privacy compliance or production readiness.

## Identity

| Item | Value |
|---|---|
| Baseline | v0.5.1 working copy, SHA-256 `c9fd90bf95699bcecb199497853ebd6033c1c5962a8d287a7bb20f2fa6afec04` (kept as `feasibility-pipeline.v0.5.1-pre-r1-backup.html`) |
| Release | `feasibility-pipeline.html` v0.5.1+ux1, SHA-256 `a675139e819103fdd6108f5bc5f88d15f967077f0c77027f0204355ed6eb5767` |
| Engine | `src/mc-kernels.js` `cbf3cc09…bde199` and `src/mc-worker.js` `14556f95…e43c`, unchanged; `node tools/build.mjs --check` reports in sync |

## Changes

1. **Start here panel** (above the pipeline diagram). Three paths: *Protocol only*, *Protocol + country/site list*, *Protocol + EMR / site data*. Each path shows only its inputs.
2. **Study setup card**: indication (shared with the step 2 brief), target randomized, enrollment window, proposed countries (country paths only), and a data-availability checklist with ✓ / ! / i states and one-click actions (upload, open step, template).
3. **Run analysis** validates first. It needs a protocol or an indication; the country path needs at least one country; the EMR path needs an extract. It then runs the existing pipeline, the existing sensitivity job for the three ranges, and opens the Decision Summary. The panel collapses to a one-line study bar with *Edit setup* / *View decision summary*.
4. **Synthetic-demo mode**: *Try the synthetic demo* starts from a clean state. A banner names every synthetic or example input in use (synthetic patients or history, example protocols, example footprint), however it was loaded. *Exit demo and start a real analysis* clears the analysis and reopens the path chooser. The JSON report gains `syntheticOrExampleInputs`; the bid summary gets a demo line.
5. **Decision Summary** at the top of step 6: a verdict (*On track under these assumptions* / *At risk* / *Unlikely…*, or *Mixed* when the country and EMR views disagree), a headline table, and an explanation when the conservative pool is zero.
6. **Forecast ranges side by side**. EMR: conservative (lower pool, default) / central assumed scenario / upper, with eligible records, share of runs reaching target, median and P10–P90 randomized by the deadline, and median months. Country footprint: rates −25% / as modelled / +25% (existing sensitivity variants), shown for the sponsor plan and the recommendation. Each column states in plain language what it means, followed by "What separates them".
7. **What to do next**: the top three risks, each with a recommended action and a *Go to step N* button. One shortfall flag is kept; repeated INFO items of the same kind are folded into "(+N similar)".
8. **Copy executive summary**: plain text covering the headline, ranges, risks with actions, data sources and limits. It goes through the same export gate as downloads. If the clipboard is blocked, the text is shown in a box to copy by hand.
9. Step 1 (EMR) collapses behind *Add patient data anyway* on the two paths without patient data.

## Intentional behavioural changes

- **Setup-card target/window override the protocol's values.** When typed in the setup card, they are re-applied after parsing (`autoFillBrief` wrapper), and the card notes the protocol's value. Values edited in step 4 replace the setup value. Without setup input, behaviour is unchanged.
- **Ingestion wording** (`STEPS[0].ai`) no longer says "PHI is stripped (Safe Harbor identifiers…)". It now says the data is pseudonymized, timing is kept at month level, and this is not Safe Harbor de-identification or anonymization. Required by the release safeguards; it also turns one pre-staged v0.5.2 test green.
- **Run analysis never falls back to the GastroNova example.** The header's *Run full pipeline* keeps its fallback, which now triggers the demo banner.
- CSS only: long `<select>` options in step 6 no longer cause horizontal page scroll; on phones, checklist actions sit below their text.

## Verification (final file)

| Suite | Result |
|---|---|
| Parser self-test | **68 / 68** |
| Engine tests | **99 / 103**. The 4 failures are pre-existing `v0.5.2 · Evidence` tests for unimplemented features (undated imports, study-context provenance, retrieval-date validation, confidence capping). Baseline before this release: 98 / 103. |
| Worker lifecycle (real Web Worker, Step 3 button) | **10 / 10** |
| Node `node --test tests/kernels.test.mjs` | **10 / 10** |
| `node tools/build.mjs --check` | in sync; no `new Function` / `eval` anywhere in the file |

Browser checks: Chromium-based in-app browser at `http://localhost:8765`, desktop and 375 px.

- All six screens render, both empty and after the demo.
- The demo, country and EMR paths were each run end to end; the country and EMR paths used live ClinicalTrials.gov data.
- Numeric changes (`consent`, `sims`, `fpp.sigma`) and checkbox changes (`absentIfNotRecorded`, `onlyResearched`) each start a new accepted run (run ID advances).
- While a run is in progress, or after it is cancelled, the Decision Summary is withheld, and copy and downloads are blocked.
- 21 tooltips. Hover, keyboard focus, Escape, tap-to-pin, second tap and outside tap all work.
- The JSON report and bid summary still export.
- `pagehide` during a run terminates the worker and revokes its Blob URL.
- Keyboard Tab moves through the setup fields without losing focus.
- No page JavaScript errors.

## Remaining limitations

- The footprint ranges are rate scenarios, not eligibility pools. "Central assumed scenario" stays reserved for the EMR pool.
- Range figures use the sensitivity run count (500–1,000 runs) with matched streams, so the *as modelled* column can differ slightly from the headline run.
- While any worker job runs (including the ranges calculation), step 6 shows "Current simulation results are not available" until it completes.
- In the EMR path without site history, every site uses the same prior rate, so forecasts can be far below those from the demo's synthetic history.
- *Exit demo* clears the whole analysis, including any real data loaded next to demo inputs.
- The demo is detected by exact match with the example protocol and footprint text; edited examples are no longer flagged.
- On phones, the headline table scrolls inside its box.
