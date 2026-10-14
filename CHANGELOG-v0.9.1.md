# v0.9.1 — fixes from the retrospective test of five completed trials

Source: `stress-test/STRESS-TEST-REPORT.md` (EMPA-REG OUTCOME, LEADER, SUSTAIN-6, DAPA-HF, KEYNOTE-189).
Pre-change copy: `feasibility-pipeline.v0.9.0-uifix-backup.html`; engine before the change in the same backup (embedded).

## Recruitment model
- **Follow-up-aware recruitment span.** Completed comparator trials whose primary-outcome follow-up (new registry field
  `PrimaryOutcomeTimeFrame`) covers ≥ 60% of start → primary completion are treated as event-driven / long follow-up and use
  `enrollShareLong` (default 50%) instead of `enrollShare` (70%). Per-trial follow-up subtraction was tested and rejected: it
  produced 1.3–2.6 patients/site/month for trials that actually ran at 0.4–0.6.
- **Size-matched comparators** (`sizeMatch`, on): comparator rates are weighted by size similarity to the target
  (weight 0.61 at 4× larger/smaller, 0.14 at 16×). Country shrinkage uses the summed weights. Data without per-trial sizes
  (fixtures, older saved projects) give weight 1, i.e. the previous plain medians.
- **Trial-level rate uncertainty** (engine, `sigmaTrialEff`): one log-normal multiplier per simulated trial shared by all sites.
  Default = half the weighted SD of comparator log rates (0.15–0.6); 0.6 when fewer than 5 comparators exist; user-settable
  (`sigmaTrial`, empty = auto). Drawn from its own random stream, so with 0 every result is bit-identical to v0.9.0
  (frozen-reference parity tests unchanged and passing). Derived value is never saved in projects.
- **Back-test date** (`brief.asOf`, “Registry data as of”): completed trials must have started and reached primary completion by
  that date; competing trials are those running on it (site statuses are ignored because they are today's).
- **Start-up made visible:** the window label says it counts from study start incl. country start-up; the decision summary and
  executive summary add “recruitment months from first patient” and state when the first patients enrol.

## Country recommendation
- Default max share per country 0.35 → **0.20**.
- **Evidence minimum** (`minEvidence`, 3): countries with fewer usable completed comparator trials are not recommended unless
  “Use” is ticked (chip “low evidence”); sponsor countries are still modelled. If no country qualifies, all are used and the
  allocation diagnostics say so.
- Optional **regional cap** (`maxRegionShare`, off at 1) using a geography-only region table.

## Protocol parsing
- Fixed misreads: “male and female” (no sex rule); “drug-naive or treated with …/if X is part of background therapy”
  (permitted therapy, not a requirement); “anti-obesity drugs”; “anaplastic lymphoma kinase”; “pregnancy testing”;
  “complications of diabetes”; “contraindications to background therapy” (manual, not hypersensitivity);
  “X-directed therapy is not indicated” (biomarker negative); “anti-PD-L1 agent” (drug target, not biomarker);
  “chemotherapy for metastatic disease” in exclusions (no metastatic-status rule).
- Country-only rules (“For South Africa: …”) become manual rules tagged with the country.
- Severity-qualified exclusions (“NYHA class IV”, “grade ≥ 3”) are conditional (unresolved), not blanket exclusions.
- One-line registry criteria (“Inclusion Criteria: - A - B”) are split into items; 0 rules from non-empty text is an error status.
- New check: a concept both required and excluded (no time window) → high risk flag and a callout with “Both are intended”.
- Indication-conflict wording no longer assumes oncology (“subtype, complication or other condition”).
- The Logic column now shows the time window, exception and condition (they were stored and evaluated but not displayed, which
  led to a wrong correction of the EMPA-REG stroke/TIA rule in the stress test — since restored).

## Small fixes
- “Country research skipped …” no longer repeats on every run; registry status notes the as-of date, long-follow-up trials and
  thin evidence (< 50 completed trials).
- Review checklist warns when no countries are entered and the default 75-site budget would drive the forecast.
- Saved registry trials keep `followup` so rates are identical after reload.

## Tests
- New: 15 parser cases (68 → 83), 6 view-suite checks “Retrospective” (19 → 25). Existing tests unchanged.
- Results (browser, localhost): parser 83/83, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33,
  view 25/25, flex 17/17, Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10; `node tools/build.mjs --check` in sync.
- Note: the flex check “A search is stopped … when an input changes” failed once in one full run (timing-dependent: it changes an
  input 30 ms after starting a search) and passed in the next three runs.
