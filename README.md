# Trial Feasibility Pipeline

A single-file browser tool for clinical-trial feasibility and bid-defense work, for any indication. Open
`feasibility-pipeline.html` in Chrome or Edge (served from `localhost` for full functionality) and work through four tabs:

- **Study**: indication, target, enrollment window, proposed countries and protocol eligibility criteria (rule-based parser,
  optional Claude or Gemini parsing), with a review checklist before running.
- **Evidence**: ClinicalTrials.gov landscape (competing and completed trials, countries, sites), optional country research
  and historical site data.
- **Plan**: Monte Carlo enrollment forecast for the sponsor footprint and a recommended footprint, assumptions, what-ifs,
  country and site decisions.
- **Report**: decision summary (range first), risks, site questionnaires and exports.

Forecasts are scenario estimates from a registry-based model, not validated predictions. A retrospective back-test of 57
completed trials (`stress-test/STRESS-TEST-REPORT.md`) found the 80% range contained the actual result in 82% of trials, with
a median timing error of about 40% for the central estimate.

## Repository layout
| Path | Contents |
|---|---|
| `feasibility-pipeline.html` | The tool (single file; the engine is embedded from `src/`) |
| `src/mc-kernels.js`, `src/mc-worker.js` | Monte Carlo engine and Web Worker adapter |
| `tools/build.mjs` | Embeds `src/` into the HTML (`node tools/build.mjs`; `--check` verifies they are in sync) |
| `tests/kernels.test.mjs` | Engine tests (`node --test tests/kernels.test.mjs`); the in-app suites run from Expert view |
| `PROJECT-SCHEMA.md` | Saved-project file format |
| `CHANGELOG-*.md` | Release notes |
| `stress-test/` | Back-test inputs, per-trial results and report |

## Development
1. Edit engine code in `src/`, then run `node tools/build.mjs`.
2. Serve the folder locally, e.g. `python -m http.server 8765`, and open `http://localhost:8765/feasibility-pipeline.html`.
3. Before a release: all in-app suites pass (Expert view), `node --test tests/kernels.test.mjs`, `node tools/build.mjs --check`.
