# v0.9.15: an answer-first summary and a clearer process

No forecast changed: the engine (`src/`) is untouched. The changes are in how results are summarised, labelled and exported, plus one new search ("what it would take") that runs the existing engine on changed scenarios.

The old Decision Summary gave a verdict ("Unlikely to reach the target on time") and a share of runs ("3%"), but it never said how far off the plan was, why, or what would fix it.

## Decision Summary (Report)
The summary now answers in this order:

1. **Answer.** The verdict, then the expected result against the target and what reaching it would take. For example: "Expect about 152 of 400 randomized by month 24 (likely range 61–295); 3% of simulated runs reach 400 on time. Reaching 400 on time would take about 738 sites, a 74-month window or a target of about 86."
2. **Three figures.**
   - Expected by the deadline, with its likely range.
   - Chance of reaching the target on time, with the second plan's chance beside it.
   - The month the median run reaches the target, with the first-patient month.
3. **Why.** The reasons come from the inputs:
   - **Country model:**
     - *Pace:* the per-site rate the plan needs compared with the model rate, and how many comparable completed trials the model rate comes from.
     - *Time:* when the first patients enrol, and how much of the window is left for recruitment.
     - *Country mix:* whether the recommended footprint changes the answer, or (as in the UC case) does not close the gap.
   - **EMR model:**
     - *Patient pool:* the modelled pool compared with the target, saying whether the pool or the pace is the limit.
     - *Time:* when sites activate.
4. **What it would take.** For 8 in 10 runs to reach the target, the smallest change of one thing, with everything else kept as it is:
   - **More sites:** uses the existing site-count search. For a sponsor plan it covers the sponsor's countries and the recommended mix. For EMR, the next-ranked sites.
   - **More time:** a longer window.
   - **Smaller target:** a smaller target by the deadline.

   Each option is screened at 400 runs and confirmed at full runs (2,000–5,000) on the same seed, as the flexibility search does. The options are not applied to the inputs. The guided run works them out automatically when the plan falls short, and a "Work out what it would take" button does the same at any time. It takes about 25 s for the 120-site UC test project.
5. **What to do next.** The top three risks. The shortfall's action now names the options. Repeated per-country flags fold into one item ("+5 similar: Poland, Germany, …") at every severity, not only INFO, so six saturation flags no longer fill the list.
6. **Chart.** The forecast chart from Plan (v0.9.12 renderer). The sponsor plan is the highlighted series, because the verdict follows it.
7. **Forecast detail (collapsed).** The detail behind the summary:
   - every plan's range sentence;
   - the plans table;
   - the first-patient note;
   - the three ranges;
   - how the verdict is set.
8. One closing caveat line, instead of a caveat in every sentence.

## One number per scenario
The "As modelled" range card showed different numbers from the headline (for UC, median 147 and 4% against 152 and 3%). The ranges come from a separate run with 1,000 runs per scenario, while the headline uses 2,000.

The basis column of the ranges, the "As modelled" row of the Plan sensitivity table, the EMR forecast-basis row and the bid summary's sensitivity table now show the main forecast itself. The other scenarios still come from the sensitivity run, on the same random stream.

## Study title
The parser used the first line of the protocol as the title. When a protocol starts with "Inclusion Criteria", that heading became the study name in the "Project loaded" note, the project file name and every export.

- The title is now a line above the criteria headings, and never a section heading.
- `studyTitle()` falls back to the indication.
- A project saved earlier with a heading as its name shows the study title when it is loaded.

## Executive summary (Copy)
- It is rebuilt from the same model as the screen, so the two always match.
- It opens with the study title, the question and the answer, then gives these sections: Why, What it would take, What to do next, Plans compared (one line per plan, plus one line of ranges), Evidence, and Basis and limits.
- Each plan's numbers now appear once, not three times.
- The rule for how the verdict is set has moved to the end.
- A stale sentence that said the default forecast basis is the conservative pool has been removed. The default has been the central assumed scenario since v0.9.8.

## Exports
- **Bid-defense pack (.md)** replaces "Bid-defense summary (.md)" in the Report. It works for both models, and its contents are, in order:
  - the decision summary;
  - every risk, grouped;
  - Appendix A: the former bid-defense summary;
  - Appendix B: the country recommendation and decisions;
  - for EMR: the patient pool and top sites;
  - evidence;
  - basis and limits.

  The appendices keep their content. Their titles and demo notes are not repeated, and their headings move down one level.
- "Country recommendation (.md)" stays in Plan › footprint comparison. The data files (JSON, CSV, surveys) are grouped as "Data files".

## Risk list (Report)
- Flags with the same category and severity are grouped into one row that names the subjects, for example "Saturation (6): United States, Poland, Germany, Canada, Spain, United Kingdom". Each group opens to every flag's detail.
- Shortfall flags and flags with their own button ("Try without") always keep their own row.
- In the UC test project, 16 flags now take 8 rows.
- "Read the forecast with" is renamed "Before you rely on it". Its uncertainty item moved into the summary's caveat.

## Background jobs no longer blank the Report
These jobs do not change the forecast:
- the ranges;
- the site-count search;
- the "what it would take" runs.

While one runs, Plan and the Report keep showing the current results, with a progress line. Before, the Report was replaced by "Current simulation results are not available" until the job finished. Exports still wait for the job to finish. A run that replaces the forecast (an input change) still withholds it, as before.

This uses an optional `purpose` argument on `requestSimulation`, together with `analysisRunning()` and `resultsShown()`.

## Country decisions (Plan)
Each country is one line showing:
- sponsor, optimized and user sites;
- the decision chip;
- the main risk.

The decision form, evidence status and next action open per country. A country with a decision in progress opens by itself, and a country you open stays open (also after saving). Every control stays in the page, so the Standard-view test still finds them. For the 16 countries of the UC test project, the section is now about 1,000 px tall.

## Version label
The header and `APP_VERSION` show 0.9.15. The uncommitted v0.9.14 parser rules in the working copy are untouched.

## Tests
- Nine new view-suite checks (group "Summary"):
  - titles;
  - the ranges matching the headline;
  - answer-first order;
  - what it would take (each option confirmed at full runs, then confirmed again independently, and stale after an input change);
  - risk grouping;
  - country cards;
  - pack structure;
  - background jobs;
  - executive summary order.
- No existing test was changed.

| Suite | Result |
|---|---|
| Parser | 106/106 |
| Engine | 107/107 |
| Lifecycle | 10/10 |
| UX | 21/21 |
| R2 | 21/21 |
| Project | 22/22 |
| R3 | 34/34 |
| View | 55/55 (46 + 9 new) |
| Flex | 21/21 |
| Gemini | 41/41 |
| OpenRouter (in-app) | 17/17 |
| Node kernels | 10/10 |
| `node tools/build.mjs --check` | in sync |
