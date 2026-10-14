# v0.9.5 — benchmark data import (Citeline, Medidata or your own export)

Builds on v0.9.4. The evaluation (`stress-test/EVALUATION-v0.9.3.md`) found that registry data alone cannot tell a fast
programme from a slow one, and that real enrollment benchmarks are the most effective input. This release lets you bring
them in from the tools that hold them.

## What it does
- **Evidence › Benchmark data**: import an enrollment-benchmark export as CSV, tab- or semicolon-separated text (save Excel
  exports as CSV). Either layout works: one row per trial and country, or one summary row per country.
- **Column detection with confirmation.** Common column names are detected, and the mapping is shown for you to confirm or
  change. It covers country, rate, patients randomized/enrolled, number of sites, enrollment months, site-months,
  screen-failure rate, trial ID and number of trials.
  - The rate unit (per month or per year) and what it counts (randomized, or screened with a screen-failure rate) can be
    changed.
  - Vendor export layouts are not published and were not available for testing. Detection was tested on files with typical
    column names, so check the mapping on your first real export.
- **Rates.** Each row gives patients/site/month from:
  - the rate column;
  - or patients ÷ site-months;
  - or patients ÷ (sites × months).

  Per country, the rate is pooled as Σ patients ÷ Σ site-months, or as a median (weighted by the number of trials) for
  summary rows.
  - Decimal commas and thousands separators are read.
  - Rows without a country, with a zero rate, or above 50 per site per month are skipped, with the reason shown.
- **Comparison before anything changes.** For every country you see the benchmark against the model's registry-based rate
  (with the ratio), and the overall benchmark against the registry comparator rate.
- **Applying is explicit, reasoned and reversible.**
  - “Use the overall benchmark as the benchmark rate” re-centres every country on it and keeps the registry's country
    differences (the existing Plan setting).
  - “Apply country rates to the ticked countries” writes each benchmark to that country's rate override. Countries not
    modelled from registry data are skipped and listed.
  - Each value is logged with its source file, previous value, reason and time, and can be reverted from the log. Reverting
    is refused once the value has been changed elsewhere.
- **Labelled everywhere.**
  - Overridden countries show the rate basis “benchmark import”.
  - Plan and the executive summary state the benchmark and what was applied.
  - An information risk flag names the source.
  - The JSON report includes the summary and the log.
- **Project file.** A new optional `benchmark` section holds the normalized rows, mapping and log (`PROJECT-SCHEMA.md`). The
  raw export is not stored. The save panel warns that vendor exports may be licensed. Licensed data never leaves the browser
  except in files you save.

## Tests
- New view checks (31 → 34):
  - detection and parsing: trial-by-country pooling, semicolon with decimal commas, yearly and screened rates, skip reasons;
  - apply, label and revert, with reasons;
  - project round trip, and refusal of a damaged row.
- Results (headless Chromium, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20,
  project 21/21, R3 33/33, view 34/34, flex 17/17, Gemini 30/30. `node --test tests/kernels.test.mjs` 10/10;
  `node tools/build.mjs --check` in sync.
- Forecasts without imported benchmarks are unchanged: spot-checked back-tests reproduce `results-v094-rerun.jsonl`.
