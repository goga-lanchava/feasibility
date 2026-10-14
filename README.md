# Trial Feasibility Pipeline

A single-file browser tool for clinical-trial feasibility and bid-defense work, for any indication. Open
`feasibility-pipeline.html` in Chrome or Edge (served from `localhost` for full functionality) and work through four tabs:

- **Study**: indication, target, enrollment window, planned number of sites, proposed countries and protocol eligibility
  criteria (rule-based parser, optional Claude or Gemini parsing), with a review checklist before running.
- **Evidence**: ClinicalTrials.gov landscape (competing and completed trials, countries, sites), optional country research
  and historical site data.
- **Plan**: Monte Carlo enrollment forecast for the sponsor footprint and a recommended footprint, assumptions, what-ifs,
  country and site decisions.
- **Report**: decision summary (range first), risks, site questionnaires and exports.

Forecasts are scenario estimates from a registry-based model, not validated predictions. In a retrospective back-test of 57
completed trials (`stress-test/STRESS-TEST-REPORT.md`, v0.9.4) the 80% range contained the actual result in 84% of trials,
with a median range width of 4.6× (p90/p10) and a median timing error of 33% for the central estimate (v0.9.3: 82%, 7.6×,
41%). Enter the planned number of sites so that comparator trials can be matched on patients per site; without a site
count the forecast falls back to the v0.9.3 weighting.

## Repository layout
| Path | Contents |
|---|---|
| `feasibility-pipeline.html` | The tool (single file; the engine is embedded from `src/`) |
| `src/mc-kernels.js`, `src/mc-worker.js` | Monte Carlo engine and Web Worker adapter |
| `tools/build.mjs` | Embeds `src/` into the HTML (`node tools/build.mjs`; `--check` verifies they are in sync) |
| `tests/kernels.test.mjs` | Engine tests (`node --test tests/kernels.test.mjs`) |
| `tests/run-app-suites.cjs` | Runs every in-app suite headless (`node tests/run-app-suites.cjs`; needs a localhost server and Playwright); they also run from Expert view |
| `PROJECT-SCHEMA.md` | Saved-project file format |
| `CHANGELOG-*.md` | Release notes |
| `stress-test/` | Back-test inputs, per-trial results and report |
| `stress-test/EVALUATION-v0.9.3.md` | Evaluation of v0.9.3: forecast skill vs baselines, comparator weighting, KEYNOTE-407 hold-out, prioritized improvements |
| `stress-test/results-v094-*.json*` | v0.9.4 back-test results; the `.jsonl` holds both engines per trial on the same registry snapshot |
| `stress-test/analysis/` | `rerun_backtests.cjs` (re-runs the back-tests in the app), `compare_v094.py` (v0.9.3 vs v0.9.4 and the σ check), `evaluate_v093.py` (the v0.9.3 evaluation from a comparator snapshot), `ui_backtest.cjs` (one back-test through the UI) |

## Development
1. Edit engine code in `src/`, then run `node tools/build.mjs`.
2. Serve the folder locally, e.g. `python -m http.server 8765`, and open `http://localhost:8765/feasibility-pipeline.html`.
3. Before a release: `node tests/run-app-suites.cjs` (or the suites in Expert view), `node --test tests/kernels.test.mjs`,
   `node tools/build.mjs --check`; for engine changes, re-run the back-tests (`stress-test/analysis/rerun_backtests.cjs`).
