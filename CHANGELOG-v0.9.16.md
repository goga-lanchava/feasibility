# v0.9.16: questionnaires sites confirm or correct, the country mix and the bid-defense argument

No forecast changed: the engine (`src/`) is untouched. Three features that were partly there are now complete:

1. the site questionnaires;
2. the chance of reaching the target and how it changes with the country mix;
3. the search for the smallest change that reaches the goal.

All new code is in section 19b of the HTML, apart from small hooks in the registry parser, the text questionnaire, "what it would take", the Decision Summary, the bid-defense pack and the guided run.

## Site questionnaires: prefilled, the site confirms or corrects each answer
### Investigators from ClinicalTrials.gov
The registry query now also asks for location contacts and the study's overall officials (`LocationContactName`, `LocationContactRole`, `OverallOfficialName`, `OverallOfficialRole`, `OverallOfficialAffiliation`). Phone numbers and e-mail addresses are never requested.

A site's investigators are:
- the location's contacts with the role principal investigator or sub-investigator (plain "contact" entries are coordinators and are left out);
- the study's principal investigators, when the study has only that one location or the official's affiliation is the same facility.

Only names and roles are kept, without titles or degrees ("Prof. Ann Lee, MD" becomes "Ann Lee"). Each facility lists its investigators with the trials that name them, recruiting trials first.

Coverage depends on the registry. ClinicalTrials.gov keeps site investigators mainly for recruiting trials. In the UC test project, 594 of 8,677 registry sites name an investigator, and 2 of the 30 shortlisted sites do, because the shortlist favours sites with completed trials. Where no investigator is named, the questionnaire asks the site for one.

Saved projects keep the names with the registry snapshot. Projects saved before v0.9.16 have none until the registry data is collected again.

### One question list per site
`questionItems()` builds the same questions for the in-app form and the fillable CSV. Each question has a prefilled answer (with its source and date) or is left for the site to write in:

| Topic | Prefilled from |
|---|---|
| Investigators | names on ClinicalTrials.gov; the number from site history |
| Competing trials | the trials recruiting at the site (IDs and titles) and their number |
| Experience | completed trials at the site and the registry rate, or the site's own history |
| Standard of care | the standard of care, comparator access and same-class use from current country research (sources not verified); then the usual treatment at entry and acceptance of randomization to the comparator, which the site writes in |
| Patients | EMR records (EMR sites); the 12-month patient count and screening-only requirements are written in |
| Recruitment | the model's per-site rate, labelled as a model assumption |
| Start-up | the country start-up the model uses |
| Operations | protocol procedures, capabilities and constraints (written in) |

Country research is used only when it is current (dated, same study context), as everywhere else in the tool.

When the comparator is a placebo, sham or vehicle arm, no question asks whether it is "available and reimbursed" outside the trial. The randomization question asks instead whether patients would accept the chance of receiving placebo.

The text questionnaire (now "Text version") also gains the named investigators, the standard of care and comparator access in section A. Section B gains the usual treatment at entry and acceptance of randomization. The comparator-access question in section B is asked only when country research has no answer.

### Recording the answers
Report › Site questionnaires is now a form. For each prefilled answer you choose **Not answered**, **Confirm** or **Correct**, and Correct opens a box for the right answer. For the other questions you type the answer. A counter shows confirmed, corrected, written-in and open answers per site.

- **Fillable questionnaire (.csv)**, for one site or all sites. It has one row per question with the prefilled answer, its source, and `response`, `answer` and `comment` columns for the site. It opens in Excel (UTF-8 with BOM).
- **Import returned answers (.csv)** reads the returned file. Comma, semicolon (European Excel) and tab separators are all accepted. `confirm` and `correct` (and yes/ok, change/no) are understood. An answer equal to the prefilled one counts as a confirmation. "correct" without an answer stays a correction still to be written and is flagged; it is never read as "this is correct". Everything is checked before anything is stored. A returned file replaces that site's earlier answers.
- Each answer keeps the prefilled answer the site saw. If the prefilled answer has changed since (for example after new registry data), the form says so.

### Answers reach the forecast only through review
Answers to questions that match response fields become that site's investigator response. These fields are interest, patient count (12-month period), screened and randomized per month, start-up, competing studies, investigators, coordinators, referral pathways, capabilities, screening confirmation, constraints, reporter and date. They then go through the existing Release 3 review and the explicit "apply to country override".

Numbers are checked like the response CSV ("1,5" is read as 1.5; "three" is rejected, with a note naming the field). A questionnaire response replaces an imported response for the same site. A later response CSV import keeps questionnaire responses for the sites it does not cover. The forecast is never recalculated from answers alone.

The bid-defense pack gains a "Site questionnaires" section with the totals and every correction (prefilled answer against the site's answer). Answers are saved in the project file (new optional section `siteAnswers`) and listed in the full report JSON.

## Chance of reaching the target, and the country mix
The Decision Summary gains a **Country mix** section after "What to do next":
- **Plans side by side.** The chance for the sponsor plan, the recommended mix and your own mix (when calculated under Plan).
- **Without one country.** The lead plan with each of its countries left out.
- **Plus one country.** The lead plan with each of the six best unused countries added, at the plan's average sites per country or the country's usable capacity if lower. Countries you excluded or put on the watchlist, switched off, or with too little evidence or capacity are not offered.

Every row shows the chance, the change in points with a bar, and the median randomized by the deadline with its change. Near 0% or 100% the chance hardly moves, and the median shows the size of the effect. For UC (3%), adding one country moves the chance by about 2 points, while the median shows the size of the effect: with today's registry data, leaving out the United States costs 44 of the 148 expected randomized by month 24, and adding 20 sites in France adds 23.

Each row is a run of the same engine with the same seed and the same run count as the main forecast, so the plan as it is reproduces the headline exactly. "Try your own mix under Plan" opens the editable footprint comparison. The executive summary and the pack carry the same lines.

The guided run starts the country mix after the Report opens, and the section fills in when it is ready (about a minute for the 120-site UC plan). "Work out the country mix" runs it on request. The job reports only to the analysis that started it.

## The flexibility search as the bid-defense argument
"What it would take" gains **Another country**. It looks for the fewest added sites in one of the six best unused countries (the same ones as in the country mix) that reach 8 in 10 runs:
- every planned site is kept;
- candidates are screened at 400 runs, with countries that cannot beat the best found so far skipped;
- the answer is confirmed at full runs on the same seed.

If no single country gets there, it reports the best one at its full usable capacity (for UC: France with 118 sites, 21%).

It also searches **combinations** of a longer window and more sites (`needCombo`):
- Every planned site is kept. Added sites go where they recruit most by the deadline (per-site rate × months open). They can go to plan countries or new ones, within each country's usable experienced sites and the max-share limit. A new country opens with at least the minimum sites.
- Excluded and watchlist countries, countries switched off, and new countries with too little evidence are not used. Added sites are capped at 3× the plan.
- For windows from the planned one to the one that works alone (six steps, then a refinement halfway to each neighbour of the best), it finds the fewest added sites that reach 8 in 10 runs. Each window is screened at 400 runs and confirmed at full runs on the same seed.
- The smallest combination is the one with the smallest change relative to the plan: added months ÷ window + added sites ÷ planned sites. The result is shown as the "Combined" option. A **Time against sites** table lists every window with its added sites, where they go, the chance and the size of the change, with the smallest marked. Windows no number of usable sites can rescue are shown as "not reached".
- For UC with today's registry data, the smallest change is a 48-month window with 77 more sites (France 39, India 29, Ireland 9, all new countries). Changing one thing only takes a 72-month window or about 751 sites. "What it would take" now takes about 85 s for the 120-site UC plan (was about 60 s).

The section now opens with the **bid-defense argument**. It gives:
- the plan's chance;
- the smallest change that reaches the goal, combined or single;
- the alternatives, and which levers do not get there alone;
- the target that would work without changing the plan;
- the recommended mix's chance.

"Smallest" compares each change with the plan (added sites against the planned sites, added months against the window), and the note under the argument says so. The target is listed separately because changing it changes the study, not the plan.

For UC (today's registry data): "As proposed (120 sites in 6 countries), 3% of simulated runs reach 400 by month 24. The smallest change that gets 80% of runs there is a 48-month window with 77 more sites (24 months longer and 77 more sites: France 39 (new), India 29 (new), Ireland 9 (new)); changing one thing only would take a 72-month window (48 months longer) or about 751 sites (631 more than the 120 planned). One more country alone does not get there. Keeping the plan, the target would have to fall to about 60. The recommended country mix (120 sites, the same number) gives 4%."

When no combination is smaller than a single change, the argument says so.

The argument also leads "What it would take" in the executive summary and the pack. The Plan › "Where the plan can flex" search (combined options, criteria, start-up) is unchanged.

## Version label
The header and `APP_VERSION` show 0.9.16.

## Tests
- Nine new view-suite checks (groups "Questionnaire", "Country mix", "Bid argument"):
  - registry investigators;
  - the prefilled question list and the text version;
  - the returned-CSV round trip (semicolons, corrections without an answer, bad numbers, forecast unchanged);
  - refused files and the response-CSV interplay;
  - the form controls and save/load;
  - the country mix (the plan as it is reproduces the headline, excluded countries are not offered, results go stale with the inputs);
  - another country and the ranking in the argument;
  - the combined search (planned sites kept, capacity and exclusions respected, fewer sites as the window grows, smallest change picked);
  - the Decision Summary and pack structure.
- No existing test was changed. One existing check counts the Decision Summary's three headline tiles, so the country-mix tiles use their own class (`mix-plan`).

| Suite | Result |
|---|---|
| Parser | 106/106 |
| Engine | 107/107 |
| Lifecycle | 10/10 |
| UX | 21/21 |
| R2 | 21/21 |
| Project | 22/22 |
| R3 | 34/34 |
| View | 64/64 (55 + 9 new) |
| Flex | 21/21 |
| Gemini | 41/41 |
| OpenRouter (in-app) | 17/17 |
| Node kernels | 10/10 |
| `node tools/build.mjs --check` | in sync |
