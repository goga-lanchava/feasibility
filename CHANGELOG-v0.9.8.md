# v0.9.8 — the headline leads with the central case

Builds on v0.9.7 and on 2f5a87f (Gemini option for country research, committed separately by another session).

## Why
In the synthetic demo, the Decision Summary said **"Unlikely to reach the target on time"**, with 0–0 patients by month 18.
The EMR forecast ran on the conservative pool by default, and in the demo no record passes every requirement the software
can check. The central assumed scenario (298 records) reaches the target in 93% of runs. A sponsor reading the headline
would take a "nothing could be verified" finding for a predicted shortfall.

## What changed
- **The default forecast basis is the central assumed scenario** (`DEFAULT_PARAMS.eligBasis: 'likely'`, was `'lower'`).
  The headline verdict, the headline range, the median and the headline table now come from the central case. In the demo,
  the verdict is now "On track under these assumptions": 93% of runs, a median of 387 randomized by month 18, and 309–470
  in 8 of 10 runs.
- **The conservative pool is stated beside the headline as the lower bound.** When the EMR forecast uses the central
  scenario, the Decision Summary and the copied executive summary add:
  - what the forecast assumes: the number of records whose only open items are unverified screening requirements, named
    (for example, dose stability / washout);
  - a request to confirm those requirements with sites;
  - the conservative lower bound: the records that meet every checkable requirement, and the share of runs they reach the
    target in, once the ranges are calculated.
- **The assumption is shown wherever the central scenario is used.** The eligible-pool panel's "Scenario assumption in use"
  callout appears by default. The report, surveys and bid summary record the central scenario, as they already did when it
  was chosen by hand. In Forecast ranges, the central column is now marked as the forecast basis and the conservative
  column is described as the lower bound.
- **Unchanged:**
  - the conservative pool can still be selected under the eligible-pool scenarios, with its existing zero-pool explanation;
  - an unknown or damaged basis value still falls back to the conservative pool;
  - project files that saved a basis keep it, so older projects (which always saved `lower`) reopen on the conservative
    pool;
  - the country-footprint headline is untouched;
  - forecast numbers for a given basis are unchanged.

## Tests
- New UX check: the one-click demo's inputs give a headline on the central scenario, with a non-zero range and the
  "On track" verdict. The conservative lower bound is stated in the Decision Summary and the executive summary, and the
  zero-pool wording is gone from the headline. The check was seen failing before the change: basis `lower`, 0% of runs,
  "Unlikely".
- Two existing checks were adapted to the new default, with the user's approval. Nothing was removed or loosened:
  - *C6 "The conservative lower pool is the default…"* now asserts the central default. It still checks the conservative
    pool (selected explicitly: 0 eligible, the "select it explicitly" note, no assumption callout), the fallback of
    unknown values to it, and the central scenario's assumption callout.
  - *C6 "Switching the forecast basis invalidates an accepted forecast"* switched to `likely`, which is now the default
    and so no longer a change. It now switches to `lower` and asserts that this is a change.
- Final results (Chromium, http://localhost:8765). Run from `localhost` rather than `127.0.0.1` because that origin's
  browser storage holds 83 AI-registered vocabulary concepts from the Gemini stress run. They change rule-based parsing and
  fail one parser and one engine check that pass on a clean origin.

  | Suite | Result |
  |---|---|
  | parser | 104/104 |
  | engine | 107/107 |
  | lifecycle | 10/10 |
  | UX | 21/21 |
  | R2 | 21/21 |
  | project | 21/21 |
  | R3 | 34/34 |
  | view | 41/41 |
  | flex | 17/17 |
  | Gemini | 40/40 |

  `node --test tests/kernels.test.mjs` passes 10/10 and `node tools/build.mjs --check` reports in sync.

## Noted for later
- The test suites read the browser's stored vocabulary (`tfp_vocab_v1`), so AI-registered concepts from earlier sessions
  can change parser results. The suites should run against an empty vocabulary.
- The demo site questionnaire states "Modelled enrollment by month 18: ~118 participants" next to a headline median of
  387 for the selected sites. This is probably a per-site or different-scope figure, but it should be checked so the two
  do not appear to contradict each other.
