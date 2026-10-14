# Feasibility Pipeline v0.8.0: flexibility search and sponsor-country planning

Built on v0.7.2 ([CHANGELOG-v0.7.2.md](CHANGELOG-v0.7.2.md)); kept as `feasibility-pipeline.v0.7.2-backup.html`. Verified 2026-10-14.

| Item | Value |
|---|---|
| Release | `feasibility-pipeline.html` v0.8.0, SHA-256 `d771ab761624a967437c36720ec3ddc7b87a147e0ed9d0e282255ed0d13d9ba5` |
| Engine | kernels and worker adapter unchanged, `build.mjs --check` in sync, runtime integrity verified |

## Added

### Plan within the sponsor's countries only (step 4 checkbox, both views)
- When ticked, the recommended footprint, the sites-needed search and the automatic research list use only the countries in the sponsor's footprint. Other countries stay in the step 5 table, marked "outside sponsor list", with their "Use" box locked.
- Your own "Use" exclusions still apply inside the sponsor list. With no sponsor footprint entered, nothing is restricted and a warning says why.
- The bid-defense summary states the restriction. The choice is saved as `fpp.sponsorOnly`.
- Implementation: `computeFootprint` marks other countries as not allowed (`allow = userAllow && !outsideSponsor`). The allocation algorithm, the kernels and their inputs are otherwise unchanged; unticked (the default) gives exactly the previous recommendation.

### Where the plan can flex (step 4 panel, both views)
- Tick the parameters that have room to move and set a maximum for each:
  - enrollment window (+months);
  - site budget (+sites placed by the optimizer, never more than the allowed countries' capacity can hold; EMR model: next-ranked unselected sites);
  - start-up or activation (months faster);
  - target randomized (−%);
  - countries outside the sponsor list (when planning within them);
  - eligibility criteria that may be dropped (EMR model only; only non-essential, computable, enabled criteria are offered).
- Goal: the share of simulated runs reaching the target by the deadline (default 0.80).
- The search finds the smallest single-parameter change for each ticked parameter, then the smallest combination (shrinking target and criteria changes first, then countries, window, sites and start-up). It screens with 400 runs and confirms every option with the full run count (2,000–5,000).
- Every evaluation is a normal `run` job of the existing worker with the same kernels and seed; each scenario's allocation comes from the same optimizer.
- Options show what changes, the confirmed probability with ± 2 standard errors, the median months and the sites placed of the budget. They carry warnings: a target change needs the statistician; dropping criteria is exploratory and needs medical and sponsor agreement; faster start-up is an operational assumption; extra countries are outside the sponsor's proposal.
- If the goal is out of reach, the best result with every parameter at its maximum is reported.
- **Nothing is applied automatically.** "Apply to inputs" needs a reason and changes only what the option lists: deadline, target, custom site budget or EMR selection, the sponsor-only box, and disabled criteria (with the reason recorded). Start-up acceleration is never applied automatically. Applied options are logged.
- Options are current only while the inputs and settings are unchanged. A search is stopped, not reported, if an input changes while it runs.
- Settings and the applied log are saved in the optional `flex` project section (see [PROJECT-SCHEMA.md](PROJECT-SCHEMA.md)); results are not saved.
- **Flexibility and sponsor-country suite** (`runFlexTests`, 17 checks, real Web Worker; Expert view in step 3).

## Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · Release 3 33/33 · lifecycle 10/10 · view, quick start and performance 10/10 (five new visibility checks for the new controls) · **flexibility and sponsor countries 17/17** · Node kernels 10/10.

Mutation checks:
- Applying without a reason, and letting the search ignore the sponsor restriction, each failed a test.
- The window option is checked against the kernel run directly: the reported extension reaches the goal, one month less does not, and the confirmed probability equals the kernel's.
- Applying a window option reproduces its confirmed probability exactly in the main forecast.

In the browser, on the offline registry example with sponsor-only ticked, ticking the window and clicking Find found "+5 months: 17% → 81% (borderline)" with no input changed. The result also showed that only 6 of the 13 budgeted sites fit the sponsor countries' estimated capacity.

## Limitations
- The search assumes more room never lowers the probability (usual with common random numbers, not guaranteed). Combined options are the smallest mix found by this greedy order, not a proven optimum.
- Eligibility criteria change forecasts only in the EMR model. The country model uses registry rates that already reflect past trials' criteria.
- When patient data and registry data are both loaded, the search uses the country model.
- Not run against live ClinicalTrials.gov data in this release.
