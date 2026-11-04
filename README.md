# Trial Feasibility Pipeline

A single-file browser tool for clinical-trial feasibility and bid-defense work, for any indication. Open
`feasibility-pipeline.html` in Chrome or Edge (served from `localhost` for full functionality) and work through four tabs:

- **Study**: indication, target, enrollment window, planned number of sites, proposed countries and protocol eligibility
  criteria (rule-based parser, optional Claude or Gemini parsing), with a review checklist before running.
- **Evidence**: ClinicalTrials.gov landscape (competing and completed trials, countries, sites), optional country research,
  historical site data and benchmark data imported from Citeline, Medidata or your own trials (CSV export).
- **Plan**: Monte Carlo enrollment forecast for the sponsor footprint and a recommended footprint, assumptions, what-ifs,
  country and site decisions.
- **Report**: decision summary (answer first: the expected result against the target, why, the bid-defense argument with
  the smallest change that reaches the goal in sites, one more country, time or target, next actions, and how the chance
  changes with each country left out or added), grouped risks, site questionnaires prefilled with named investigators,
  competing trials and the standard of care that the site confirms or corrects (in the app or as a returned CSV), and the
  bid-defense pack (.md) with the country evidence and decisions as appendices.

Forecasts are scenario estimates from a registry-based model, not validated predictions. On 99 held-out trials not used for
tuning (round 4, `stress-test/round4/ROUND4-REPORT.md`), about 3 in 4 actual enrollments fell inside the "8 in 10 runs"
range (≈75%, below its nominal 80%) and the median miss was about 60%. The earlier 57-trial back-tests
(`stress-test/STRESS-TEST-REPORT.md`) were used to calibrate the model and are not independent. Enter the planned number
of sites so that comparator trials can be matched on patients per site.

## Repository layout
| Path | Contents |
|---|---|
| `feasibility-pipeline.html` | The tool (single file; the engine is embedded from `src/`) |
| `src/mc-kernels.js`, `src/mc-worker.js` | Monte Carlo engine and Web Worker adapter |
| `tools/build.mjs` | Embeds `src/` into the HTML (`node tools/build.mjs`; `--check` verifies they are in sync) |
| `tests/kernels.test.mjs` | Engine tests (`node --test tests/kernels.test.mjs`) |
| `tests/run-app-suites.cjs` | Runs every in-app suite headless (`node tests/run-app-suites.cjs`; needs a localhost server and Playwright); they also run from Expert view |
| `CHANGELOG.md` | Release notes, newest first |
| `PROJECT-SCHEMA.md` | Saved-project file format |
| `examples/` | Example input: country evidence for an acute leukemia study, to load under Evidence |
| `stress-test/` | Back-test inputs, per-trial results and reports (including the EMPA-REG OUTCOME protocol extract used in round 1) |
| `stress-test/round4/` | The 203-trial round-4 back-test: selection, calibration, held-out sets and `ROUND4-REPORT.md` |
| `stress-test/EVALUATION-v0.9.3.md` | Evaluation of v0.9.3: forecast skill vs baselines, comparator weighting, KEYNOTE-407 hold-out, prioritized improvements |
| `stress-test/results-v094-*.json*` | v0.9.4 back-test results; the `.jsonl` holds both engines per trial on the same registry snapshot |
| `stress-test/analysis/` | `rerun_backtests.cjs` (re-runs the back-tests in the app), `compare_v094.py` (v0.9.3 vs v0.9.4 and the σ check), `evaluate_v093.py` (the v0.9.3 evaluation from a comparator snapshot), `ui_backtest.cjs` (one back-test through the UI) |

## Development
1. Edit engine code in `src/`, then run `node tools/build.mjs`.
2. Serve the folder locally, e.g. `python -m http.server 8765`, and open `http://localhost:8765/feasibility-pipeline.html`.
3. Before a release: `node tests/run-app-suites.cjs` (or the suites in Expert view), `node --test tests/kernels.test.mjs`,
   `node tools/build.mjs --check`; for engine changes, re-run the back-tests (`stress-test/analysis/rerun_backtests.cjs`).
