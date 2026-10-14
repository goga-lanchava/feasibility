# Feasibility Pipeline v0.7.0: Release 3, site review and investigator engagement

Built on the accepted v0.6.1 baseline ([CHANGELOG-v0.6.1.md](CHANGELOG-v0.6.1.md)); kept as `feasibility-pipeline.v0.6.1-backup.html`. Verified 2026-10-13. Superseded for the UI by [v0.7.1](CHANGELOG-v0.7.1.md); the Release 3 logic is unchanged there.

Unchanged: kernels and adapter (`build.mjs --check` in sync), Monte Carlo equations, RNG order, country-effect coefficients, eligibility evaluation, allocation, the worker controller and every existing test definition.

Existing lines changed: the version label and `APP_VERSION`; `freshState` (new review keys); `FEEDBACK_COLS` and `importFeedback` (optional new columns, original cell text kept); the "Saved:" text of the save panel; CSS. Everything else is the new section "17. Release 3".

## Added
- **Site cards (step 5)**, assembled on demand from the data already in the analysis (EMR cohort, site history as the model uses it, shortlisted registry facilities, imported responses). Every value is labelled *Observed / imported*, *Investigator-reported*, *Modeled assumption* or *Unknown / not collected*, with source and date. Registry locations are labelled "listing, not verified". Missing data is shown as not collected; nothing is filled in. Sites are matched by ID only; ambiguous names, conflicting names and generic registry labels are flagged. Each card lists evidence gaps and a recommended next action (separate from the decision).
- **Site decisions**: Invite to survey, Request more information, Prioritize, Hold, Exclude. A reason is required to record, change or clear; every change is logged. Decisions never change rankings, selection, allocations or forecasts.
- **Focused questionnaires**: the existing survey generators gain Section D (eligible patients over a stated period, screening confirmations, screened and randomized recruitment, competing studies, referral pathways, staff and facilities, activation timing, capacity and constraints) and a prefill-sources list. Model assumptions are marked "not an answer from your site"; a counts-only line asks for no patient-identifiable information.
- **Response review (step 6)**, reusing the existing importer: original values with unit, period, reporter, source and dates; flags for incomplete, inconsistent and outdated answers (older than 180 days or protocol changed); reviews need a reason and labels are never authenticated. Reported, observed and model-input recruitment are shown separately.
- **Explicit application** (registry mode only): the median of accepted randomized-per-month rates, or of start-up months, written to the existing country override with a reason, validated by the override limits, recalculated through `recompute()`, and revertible. Screened counts, patient pools, consent and screen-failure figures are never applied. EMR site forecasts have no per-site override field, so investigator values are comparison only there.
- **Site engagement pack (.md)**: labelled a questionnaire and information request, not a forecast report; forecast figures only when results are current; blocked while inputs are out of date; nothing is sent.
- **Persistence**: five optional sections in `tfp-project/1` (see [PROJECT-SCHEMA.md](PROJECT-SCHEMA.md)); no schema version change and no migration needed.
- **Release 3 suite** (`runR3Tests`, 33 checks, real Web Worker).

## Intentional behaviour changes
- Survey totals now read "Questions in sections A–C: N", followed by Section D and the new total.
- Investigator responses accept optional new columns (`reporter`, `eligible_period_months`, `screened_per_month`, `randomized_per_month`, `enrollment_unit`, `screening_confirmation`, `competing_overlap`, `referral_pathways`, `investigators`, `coordinators`, `capabilities`) and keep their original text.

## Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · lifecycle 10/10 · Node kernels 10/10 · **Release 3 33/33**. Eight deliberate breakages (reason not required, Exclude deselecting a site, accept auto-applying, pack ignoring result gating, authentication flag kept on load, screened rate applied, outdated not flagged, merge by name) each failed a Release 3 test. Keyboard-only flow on a site card verified by hand.

## Known issue found (existing behaviour)
Loading an example protocol nulls `S.history` but leaves `S.internalHistory`; the cards now follow `S.history`, but input provenance and saved files still mention the leftover history.
