# Trial Feasibility Pipeline

**Can this clinical trial recruit its patients on time, and where should it run?**

The Trial Feasibility Pipeline answers that question for any study and any indication. It searches ClinicalTrials.gov for
comparable trials, forecasts recruitment for the sponsor's countries and sites, recommends a footprint, and says plainly
what it would take to reach the target: more sites, another country, more time or a smaller target. It is built for
feasibility teams and bid-defense work at CROs and sponsors.

Everything runs in your browser from one file. There is nothing to install and no account to create.

## Get started

1. Download `feasibility-pipeline.html` from this repository.
2. Open it in Chrome or Edge.

   For everything to work, serve it from your own computer instead of double-clicking it. In the folder that holds the
   file, run `python -m http.server 8765`, then open <http://localhost:8765/feasibility-pipeline.html>.
3. Start a study in one of three ways:
   - **Import from ClinicalTrials.gov:** type an NCT number and the study details, countries, sites and eligibility
     criteria are filled in for you.
   - **Paste a protocol** or synopsis, or just name the indication.
   - **Try an example:** ulcerative colitis or type 2 diabetes, with synthetic data.
4. Click **Run the analysis** and read the Report.

## What you get

The tool works in four steps, shown as tabs:

| Tab | What happens |
|---|---|
| **Study** | The indication, target, recruitment window, planned sites and proposed countries, and the eligibility criteria read from the protocol. |
| **Evidence** | Competing and completed trials from ClinicalTrials.gov, by country and site. You can add your own past-trial data or benchmark exports (Citeline, Medidata). |
| **Plan** | A recruitment forecast for the sponsor's plan and for a recommended footprint, with what-ifs and country and site decisions. |
| **Report** | The answer, the reasons and the next steps, ready for a bid defense. |

The Report gives you:

- **The answer first:** how many participants to expect by the deadline, the likely range, and the chance of reaching the
  target on time.
- **Why:** pace, start-up time and country mix.
- **What it would take:** the smallest change that reaches the goal. Click any option to see its plan and its forecast
  against yours.
- **Country mix:** how the chance changes when each country is left out or added.
- **Risks and next steps,** grouped by country and topic.
- **Site questionnaires,** prefilled with investigators, competing trials and the standard of care, for sites to confirm
  or correct.
- **Exports:** an executive summary to copy, and a bid-defense pack (Markdown) with the evidence behind every number.

Save your work with **Save project** and open it again later with **Load project**.

## How far to trust the forecast

The forecasts are scenario estimates, not guarantees. The model simulates the trial thousands of times, using recruitment
rates from comparable completed trials.

- **Tested on real trials.** On 99 trials that were held back and not used for tuning, about 3 in 4 actual results fell
  inside the tool's "8 in 10" range. The middle forecast missed by about 60% in a typical trial.
- **Your own numbers make it better.** The recruitment rate per site matters most. Rates from your own past trials or
  from site questionnaires change the forecast far more than any other input.
- **No verdict when the inputs can't support one.** For example, a one-site study, a non-drug study, or a window that ends
  before the first site can open. The tool then says why and shows its numbers for reference only.

The test details are in `stress-test/round4/ROUND4-REPORT.md`.

## Your data

- **Patient data never leaves your computer.** De-identified patient extracts (CSV or FHIR) are read in your browser.
  They are saved in a project file only if you choose to include them.
- **Registry searches** send the study's condition and filters to ClinicalTrials.gov.
- **AI features are optional.** Protocol reading and country research with Claude or Gemini use your own API key. They
  send the protocol text or study brief, never patient data, and ask you first.

## Good to know

- One file works for any indication. Nothing is tied to a particular disease.
- Without patient data, the eligibility criteria do not change the forecast. The rate comes from comparator trials, which
  have their own criteria. With a patient extract, each record is checked against the criteria.
- Release notes are in [`CHANGELOG.md`](CHANGELOG.md).

## For developers

| Path | Contents |
|---|---|
| `feasibility-pipeline.html` | The tool. The simulation engine is embedded from `src/`. |
| `src/` | Simulation engine (`mc-kernels.js`) and its Web Worker adapter (`mc-worker.js`) |
| `tools/build.mjs` | Embeds `src/` into the HTML (`node tools/build.mjs`; `--check` verifies they match) |
| `tests/` | Engine tests (`node --test tests/kernels.test.mjs`) and a headless runner for the in-app test suites (`node tests/run-app-suites.cjs`, needs Playwright and a local server) |
| `PROJECT-SCHEMA.md` | Format of saved project files |
| `examples/` | Example input: country evidence for an acute leukemia study |
| `stress-test/` | Back-tests on completed trials: inputs, results and reports |

To change the engine, edit `src/`, then run `node tools/build.mjs`. Before a release, run the in-app suites (Settings ›
Technical tools › Expert view, or `node tests/run-app-suites.cjs`), `node --test tests/kernels.test.mjs` and
`node tools/build.mjs --check`.
