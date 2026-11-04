# v0.9.9 (engine recalibration from the round-4 back-test, 203 trials)

See `stress-test/round4/ROUND4-REPORT.md` for the method and the results (calibration, validation and lockbox).

## Engine
- `src/mc-kernels.js`
  - Slow-trial mixture: `slowShare` / `slowFactor`. It is drawn from the trial-level stream only when `slowShare > 0`.
  - Footprint-scaled activation spread: `staggerSites`. With 0 it keeps the fixed stagger.
- `sizeMatchedRates`
  - New overrides for the σ rule: `sigmaK`, `sigmaLo`, `sigmaHi`.
  - Thin-evidence cap: `thinN`, returned as `thin`. The "Round 4" thin test now uses 8 comparators, because the threshold is 10.
  - Optional patients-per-site elasticity: `ppsElasticity`, default 0 (tested, not adopted).
- New defaults ("narrow", after the narrowing round, see report §8): `sigma` 0.8 (was 0.4), `sigmaK` 0.9, `sigmaLo` 0.5, `sigmaHi` 1.2, `slowShare` 0.10, `slowFactor` 0.3, `thinN` 10, `staggerSites` 1.
- The first setting ("wide": `sigmaK` 1.2, `slowShare` 0.15, `thinN` 30) gives about 82% coverage at about 26× width. "Narrow" gives about 75% at about 10×. Switch with these three parameters.
- All the new parameters are in `FPP_SCHEMA` and are saved with the project like the other `fpp` settings.
- New plan notes:
  - thin evidence (fewer than `thinN` usable comparators, 10 by default; the registry status line still warns below 30);
  - "No forecast" when no planned or recommendable site has a rate. Before, the result showed a blank or zero curve.

## Tests
All suites pass:

| Suite | Result |
|---|---|
| Parser | 104/104 |
| Engine | 107/107 |
| Lifecycle | 10/10 |
| UX | 21/21 |
| R2 | 21/21 |
| Project | 21/21 |
| R3 | 34/34 |
| View | 44/44 (3 new "Round 4" tests) |
| Flex | 17/17 |
| Gemini | 40/40 |
| Node kernels | 10/10 |

Test changes made because of the deliberate recalibration. They are listed here because an existing test was edited.

- **Frozen v0.5.0 reference parity and the analytic Poisson-mean check now set `staggerSites: 0`.** The frozen reference has a fixed stagger. This follows the same pattern as `sigmaTrialEff: 0` in v0.9.1.
- **The thin-evidence σ check now expects `DEFAULT_FPP.sigmaHi` (1.2) instead of the literal 0.9,** and also checks the new `thin` flag.
- **Three flexibility tests pin the pre-v0.9.9 uncertainty settings (`FLEX_FIXTURE_UNCERTAINTY`).** They test the search mechanics. With the wider ranges, their fixture's goal was out of reach within the allowed limits.

`tests/run-app-suites.cjs` now accepts `PW_EXE`, an explicit Chromium executable. It is needed on this Windows machine.

The version label in the app (`APP_VERSION`) is still 0.9.8, so the frozen hash stays valid. Bump it when you release.
