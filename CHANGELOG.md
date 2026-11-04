# Changelog

Release notes for the Trial Feasibility Pipeline, newest first. v0.9.13 (motion layer and wider veil drift) and v0.9.14 (parser rules, released together with v0.9.15) have no notes of their own; see the commit history.

## v0.9.17 — Registry import, trials already under way, and warnings before the verdict

No forecast changed: the engine (`src/`) is untouched. All new code is in sections 22 and 23 of the HTML, at the end of the main script.

### Import a study from ClinicalTrials.gov
Study › "Import from ClinicalTrials.gov (NCT number)" fetches the public registry record. Only the NCT number is sent. It fills:

| Field | From the record |
|---|---|
| Indication | the first three listed conditions |
| Target | the enrollment count (actual or estimated) |
| Window | months from start to primary completion |
| Proposed countries and planned sites | the listed locations, counted per country; the site budget is set to that total |
| Comparator phases | the study's own phases; a phase 4 study also searches phase 3 |
| Comparator funders | industry-only when the lead sponsor is industry, otherwise all funders |
| Protocol text | the eligibility criteria, with age and sex from their registry fields added as inclusion lines, then parsed |

Fields missing from the record are named in the message and reset to their defaults (empty countries and planned sites with the default site budget, the default target, window and comparator phases, no criteria), so nothing is left over from a previously imported study. Found with NCT07890909 (no locations listed yet), which showed "Canada: 1" from the study imported before it. Importing over existing work asks first; Cancel sends nothing.

Listed locations are the sites of the registered trial, not a plan for a new one. Review them before relying on the forecast.

### Forecast the remaining recruitment of a trial already under way
When an imported trial is recruiting (or the mode is on), Study shows "Randomized so far" and "Months of recruitment left". The months left are prefilled from the primary completion date.

Applying sets:
- the target to the original target minus those already randomized;
- the window to the months left;
- default start-up, activation stagger and every sponsor country's start-up to 0, because the sites are already open.

The original inputs are kept. "Back to the full study" restores them exactly. Importing another study ends the mode first. The comparator rate still comes from completed trials, not from the trial's own pace so far, and the verdict says so.

### Warnings before the verdict
The decision summary and its exports carry "Check the inputs before using this verdict" when:
- no site plan was entered, so the forecast used the default site budget in a footprint the tool chose;
- the median forecast is 5× the target or more, which usually means the footprint is larger than the real study's;
- an imported trial is already recruiting, so a new-start forecast ignores participants already enrolled (replaced by the remaining-recruitment basis once that is applied).

A separate note says when parsed eligibility criteria cannot change the forecast because no patient data is loaded.

### Studies that are not phase 2–4 drug trials
Found by importing NCT07890532, a single-site, 2-month health-services study that was already recruiting. It got "0 of 52, 0% chance" from drug-trial comparators and a 9-month start-up assumption.

- **Phase "not applicable"** is a comparator phase (Study › Search filters, "N/A"). The import sets it from the record, so device, behavioural and health-services studies are compared with studies of the same kind, not with drug trials.
- **Primary purpose**: a record with a non-treatment purpose (health services research, supportive care, diagnostic, screening, basic science, device feasibility, educational or counselling, other) limits the comparator search to studies with that purpose. Treatment and prevention studies keep the unfiltered search the back-tests used. It can also be set by hand under Search filters.
- Neither setting changes the registry fingerprint of a brief that does not use it, so saved searches stay current.
- **Recruiting imports forecast from now.** When the imported trial is recruiting (or enrolling by invitation), the import switches to remaining recruitment: sites open (start-up and stagger 0), and the window is the months left to primary completion. The number already randomized is not in the registry, so the full target is forecast and there is no verdict until it is entered.

### No verdict when the inputs cannot support one
The forecast still runs, and its numbers and "what it would take" are shown "for reference only". The verdict and the enrollment risk flags are withheld, under "Why there is no verdict", when:
- the number already randomized is not entered for a remaining-recruitment forecast;
- the window ends before the first site can open (the model's start-up, or the EMR activation month);
- the study is outside what the model was back-tested on: a non-treatment purpose, no drug phase, or a one-site plan.

### Wording
- "1 site", "1 country", "1 month" (it read "1 sites", "1 months").
- A target not reached reads "reached after month 14" (it read "reached by after month 14").
- A recommended footprint with no sites (no country qualified) is no longer listed as a plan or a risk ("0 sites: no countries").
- Trial saturation is flagged only when it is at least 0.1 trials per site above the median, so it never reads "0.0 (median 0.0)".
- An age the eligibility text already states is not added a second time from the registry age fields.

### "What it would take": each option opens its plan
Each option that reaches the goal (more sites, another country, combined, more time, smaller target) is now clickable, as is the "Show the plan" link after its text. Clicking it opens a panel under the option with:
- **The plan** against the current plan: sites per country (new countries marked), all sites, window and target, with the change for each;
- **The result**: the chance of the target by the option's deadline, the expected number by then (or "Target reached") with the likely range, the month the median run reaches the target, and the first patient's month, each beside the current plan;
- **A chart** of the option's forecast beside the current plan.

The option is simulated on click with the same engine, random seed and number of runs that confirmed it, so the chance matches the option's text exactly. Nothing is applied to the inputs. Every option is clickable, including one that does not reach the goal ("no single added country gets there"): its panel shows the most the search tried (all usable sites in the plan's countries, the country with all its usable sites, the longest window, a target of 1) and says that it falls short. The open panel is view state: not saved, and closed when the inputs change.

When there is no verdict (see below), "What it would take" is still worked out and shown, with a note that it is for reference only. An earlier build hid it in that case and left only "Not worked out", which made the options disappear for recruiting, one-site and non-drug studies.

The forecast chart now draws a series simulated over a shorter horizon up to its own last month (the current plan beside an option with a longer window), and can cap its axis (the panel shows up to 2.5× the target) with the marks clipped, so a very wide upper range no longer flattens the rest. The Report chart is unchanged.

### Eligibility parser: exceptions, permitted therapy and the study's own diagnosis
Ported from a parser rework found in folder 17, with two of its rules tightened after a check on the 252 back-test protocols.

- **The study's own diagnosis is never excluded by mistake.** An exclusion that matches the main inclusion diagnosis only because a subtype or procedural qualifier was not understood or is planned ("Ulcerative colitis limited to the rectum", "Atypical manifestations of reflux disease", exclusions of hepatocellular carcinoma in a liver-cancer study) goes to the site to confirm instead of excluding every patient.
- **Permitted therapy in brackets is the exclusion's exception:** "Systemic corticosteroids within 4 weeks (stable 5-ASA is permitted)".
- **Surgery and procedures name what they were for:** "Prior colectomy for Crohn's disease" is a surgery, not the disease.
- **More "planned" wording:** "likely to require surgery", "planning to", "requiring urgent surgery".
- **A second sentence that says who is still eligible is the exclusion's exception:** "Known CNS metastases. Patients with treated and stable brain metastases are eligible". Tightened: the folder-17 rule took almost any following sentence, so "Participants with uncontrolled diabetes will be excluded", "NOTE: testing is not required" or "This includes:" became exceptions (18 of its 71 new exceptions). Now the sentence must say someone is eligible, allowed, permitted, acceptable or can be enrolled: 41 new exceptions, none of that kind.
- **A drug that a sentence only permits is not an inclusion requirement:** "pretreatment with hydroxyurea is allowed", "corticosteroids … are allowed if stable". Tightened: the folder-17 rule checked the whole line, so "Received two prior lines of chemotherapy … Previous treatment with SoC regimens is permitted" lost its chemotherapy requirement. Now only the sentence containing the drug counts.

On the 252 protocols, 59 parse differently. Applicable rules go from 3,372 to 3,308; the rules removed are mostly exclusions of the study's own diagnosis, permitted drugs read as requirements, and concepts that belonged to an exception. Parser tests: 137 (11 new). A parser test can now check whether a rule carries an exception ("rule [except]" / "rule [no except]").

### Eligibility parser: vocabulary, lab units and wrong requirements (second folder-17 revision)
A second revision from folder 17 (made with Antigravity) was checked on the 252 protocols and ported in part.

Taken:
- **Vocabulary that no longer misfires:**
  - portal, pulmonary, intracranial and ocular hypertension are not hypertension; "malignant hypertension/hyperthermia" is not cancer;
  - "ALL the following criteria" is not acute lymphoblastic leukemia; nystatin and somatostatin are not statins;
  - urine albumin-to-creatinine ratio is neither serum albumin nor creatinine; an allergy skin test is not an allergy;
  - "carcinoma of the breast" is breast cancer; "non-metastatic" is not metastatic.
- **Lab units:** "75,000/cmm", escaped registry notation such as "1.5 × 10\^3/µL", "upper limit normal" without "of", and the "1.73 m*2" suffix of eGFR. A platelet limit read as "< 0.1" now reads "< 70".
- **Requirements that were wrong:**
  - contraception and pregnancy-test lines no longer make pregnancy (or male sex) an inclusion requirement;
  - "Negative HIV / hepatitis test" is no longer "requires HIV";
  - "non-malignant pain" is not cancer; "to exclude urothelial carcinoma" is not a requirement for it;
  - the CKD-EPI equation is not a kidney-disease diagnosis; vaccines and immunotherapy "for" a disease are not the disease;
  - "weight loss or gain" is not a weight limit.
- **The indication guard covers more cases.** Any exclusion that matches an inclusion diagnosis (or its parent) only because of a subtype, severity, exception or condition goes to the site. In a cancer study, "prior malignancy" excludes other cancers only. Checked case by case: "Uncontrolled asthma" in an asthma study, "Squamous cell NSCLC" in a lung-cancer study and "liver disease" in a hepatitis C study no longer exclude every patient.

Not taken:
- the looser trailing-sentence and whole-line "permitted" rules (they bring back 18 misread exceptions and drop a chemotherapy requirement), and the removal of the tests that catch them;
- raising the threshold for sending criteria to the AI model from 0.6 to 0.8 (not measured);
- the reversal of the one-progress-bar fix.

Fixed in its wider negation rule: "triple negative breast cancer" (no hyphen) was read as NOT breast cancer, with confidence 0.95, which would exclude every patient in a triple-negative study. "Negative" after a tumour or leukaemia marker (triple, receptor, HER2, Philadelphia chromosome, ER/PR, PD-L1, EGFR, ALK, BRAF and others) is a subtype, not a negation.

On the 252 protocols: 80 parse differently, applied rules go from 3,308 to 3,215, with 0 misread exceptions and no "NOT breast cancer" inclusions. The removed rules were checked by category; they are the wrong requirements and own-diagnosis exclusions above. Parser tests: 156 (15 from the revision, 4 new for marker negatives).

### Smaller changes
- One progress bar per run. While the analysis or a forecast runs, only the action bar above the tasks shows progress and Cancel, and it now updates live. The second "Forecast · running" bar (and a "Forecast · idle · Recalculate" line before the forecast started) inside the page are gone. That line still appears after a forecast is cancelled or fails.
- Scrolling over a focused number field leaves the field instead of changing its value. Before, it could change Plan › Sponsor sites, which rewrites Study › Proposed countries, while the page scrolled.
- Changing Plan › Sponsor sites now says in the status line what Study › Proposed countries reads.
- Temporal and procedural words (onset, hours, undergoing, pre-existing, irreversible…) no longer count as unparsed words in criteria.

### Project files
Two optional sections, additive to the project format: `importInfo` (NCT number, title, status, dates, site count, sponsor) and `ongoing` (randomized so far, or `null` with `pending: true` while not entered; months left; the original inputs). The brief can carry `purpose` and `phases.NA`. All are validated on load; a malformed value is refused. Older projects load unchanged.

### Not adopted
A cardiology vocabulary (STEMI/NSTEMI, primary PCI, Killip class, beta blockers, RAAS inhibitors and their classes, wider heart-failure synonyms) came with this work. It was left out to keep the tool indication-agnostic.

### Tests
View suite: one new check (65). It opens the time, combined and target plans on the fixture (the sites and another-country plans are checked too when the fixture reaches them; in the current fixture neither does) and checks the plan table, that each option's simulated chance equals the confirmed one, the chart, closing, that an option without a plan does nothing, and that the panel closes when an input changes.

New suite "Registry import and remaining-recruitment tests" (Expert view, 22 checks, offline registry record, no network). The 8 checks added for the section above cover the phase-N/A and purpose search (the registry requests themselves), the unchanged fingerprint, the automatic remaining-recruitment forecast, each reason for no verdict and a plan that keeps its verdict, the wording, the age line, and saving and loading. The first 14 checks cover:
- import fills every field and sends only the NCT number;
- a malformed ID, a missing record and a server error change nothing;
- importing over work asks first, and declining sends nothing;
- phase 4 and non-industry handling, and missing fields are named;
- remaining recruitment: apply, re-apply, exact restore, refused entries, and the mode ending on a new import;
- sanity notes in the summary and Markdown export, none for a plausible plan, the new-start warning replaced once applied, the criteria note;
- project save and load round trip, and malformed sections refused;
- the scroll-wheel fix.

## v0.9.16 — Questionnaires sites confirm or correct, the country mix and the bid-defense argument

No forecast changed: the engine (`src/`) is untouched. Three features that were partly there are now complete:

1. the site questionnaires;
2. the chance of reaching the target and how it changes with the country mix;
3. the search for the smallest change that reaches the goal.

All new code is in section 19b of the HTML, apart from small hooks in the registry parser, the text questionnaire, "what it would take", the Decision Summary, the bid-defense pack and the guided run.

### Site questionnaires: prefilled, the site confirms or corrects each answer
#### Investigators from ClinicalTrials.gov
The registry query now also asks for location contacts and the study's overall officials (`LocationContactName`, `LocationContactRole`, `OverallOfficialName`, `OverallOfficialRole`, `OverallOfficialAffiliation`). Phone numbers and e-mail addresses are never requested.

A site's investigators are:
- the location's contacts with the role principal investigator or sub-investigator (plain "contact" entries are coordinators and are left out);
- the study's principal investigators, when the study has only that one location or the official's affiliation is the same facility.

Only names and roles are kept, without titles or degrees ("Prof. Ann Lee, MD" becomes "Ann Lee"). Each facility lists its investigators with the trials that name them, recruiting trials first.

Coverage depends on the registry. ClinicalTrials.gov keeps site investigators mainly for recruiting trials. In the UC test project, 594 of 8,677 registry sites name an investigator, and 2 of the 30 shortlisted sites do, because the shortlist favours sites with completed trials. Where no investigator is named, the questionnaire asks the site for one.

Saved projects keep the names with the registry snapshot. Projects saved before v0.9.16 have none until the registry data is collected again.

#### One question list per site
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

#### Recording the answers
Report › Site questionnaires is now a form. For each prefilled answer you choose **Not answered**, **Confirm** or **Correct**, and Correct opens a box for the right answer. For the other questions you type the answer. A counter shows confirmed, corrected, written-in and open answers per site.

- **Fillable questionnaire (.csv)**, for one site or all sites. It has one row per question with the prefilled answer, its source, and `response`, `answer` and `comment` columns for the site. It opens in Excel (UTF-8 with BOM).
- **Import returned answers (.csv)** reads the returned file. Comma, semicolon (European Excel) and tab separators are all accepted. `confirm` and `correct` (and yes/ok, change/no) are understood. An answer equal to the prefilled one counts as a confirmation. "correct" without an answer stays a correction still to be written and is flagged; it is never read as "this is correct". Everything is checked before anything is stored. A returned file replaces that site's earlier answers.
- Each answer keeps the prefilled answer the site saw. If the prefilled answer has changed since (for example after new registry data), the form says so.

#### Answers reach the forecast only through review
Answers to questions that match response fields become that site's investigator response. These fields are interest, patient count (12-month period), screened and randomized per month, start-up, competing studies, investigators, coordinators, referral pathways, capabilities, screening confirmation, constraints, reporter and date. They then go through the existing Release 3 review and the explicit "apply to country override".

Numbers are checked like the response CSV ("1,5" is read as 1.5; "three" is rejected, with a note naming the field). A questionnaire response replaces an imported response for the same site. A later response CSV import keeps questionnaire responses for the sites it does not cover. The forecast is never recalculated from answers alone.

The bid-defense pack gains a "Site questionnaires" section with the totals and every correction (prefilled answer against the site's answer). Answers are saved in the project file (new optional section `siteAnswers`) and listed in the full report JSON.

### Chance of reaching the target, and the country mix
The Decision Summary gains a **Country mix** section after "What to do next":
- **Plans side by side.** The chance for the sponsor plan, the recommended mix and your own mix (when calculated under Plan).
- **Without one country.** The lead plan with each of its countries left out.
- **Plus one country.** The lead plan with each of the six best unused countries added, at the plan's average sites per country or the country's usable capacity if lower. Countries you excluded or put on the watchlist, switched off, or with too little evidence or capacity are not offered.

Every row shows the chance, the change in points with a bar, and the median randomized by the deadline with its change. Near 0% or 100% the chance hardly moves, and the median shows the size of the effect. For UC (3%), adding one country moves the chance by about 2 points, while the median shows the size of the effect: with today's registry data, leaving out the United States costs 44 of the 148 expected randomized by month 24, and adding 20 sites in France adds 23.

Each row is a run of the same engine with the same seed and the same run count as the main forecast, so the plan as it is reproduces the headline exactly. "Try your own mix under Plan" opens the editable footprint comparison. The executive summary and the pack carry the same lines.

The guided run starts the country mix after the Report opens, and the section fills in when it is ready (about a minute for the 120-site UC plan). "Work out the country mix" runs it on request. The job reports only to the analysis that started it.

### The flexibility search as the bid-defense argument
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

### Version label
The header and `APP_VERSION` show 0.9.16.

### Tests
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

## v0.9.15 — An answer-first summary and a clearer process

No forecast changed: the engine (`src/`) is untouched. The changes are in how results are summarised, labelled and exported, plus one new search ("what it would take") that runs the existing engine on changed scenarios.

The old Decision Summary gave a verdict ("Unlikely to reach the target on time") and a share of runs ("3%"), but it never said how far off the plan was, why, or what would fix it.

### Decision Summary (Report)
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

### One number per scenario
The "As modelled" range card showed different numbers from the headline (for UC, median 147 and 4% against 152 and 3%). The ranges come from a separate run with 1,000 runs per scenario, while the headline uses 2,000.

The basis column of the ranges, the "As modelled" row of the Plan sensitivity table, the EMR forecast-basis row and the bid summary's sensitivity table now show the main forecast itself. The other scenarios still come from the sensitivity run, on the same random stream.

### Study title
The parser used the first line of the protocol as the title. When a protocol starts with "Inclusion Criteria", that heading became the study name in the "Project loaded" note, the project file name and every export.

- The title is now a line above the criteria headings, and never a section heading.
- `studyTitle()` falls back to the indication.
- A project saved earlier with a heading as its name shows the study title when it is loaded.

### Executive summary (Copy)
- It is rebuilt from the same model as the screen, so the two always match.
- It opens with the study title, the question and the answer, then gives these sections: Why, What it would take, What to do next, Plans compared (one line per plan, plus one line of ranges), Evidence, and Basis and limits.
- Each plan's numbers now appear once, not three times.
- The rule for how the verdict is set has moved to the end.
- A stale sentence that said the default forecast basis is the conservative pool has been removed. The default has been the central assumed scenario since v0.9.8.

### Exports
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

### Risk list (Report)
- Flags with the same category and severity are grouped into one row that names the subjects, for example "Saturation (6): United States, Poland, Germany, Canada, Spain, United Kingdom". Each group opens to every flag's detail.
- Shortfall flags and flags with their own button ("Try without") always keep their own row.
- In the UC test project, 16 flags now take 8 rows.
- "Read the forecast with" is renamed "Before you rely on it". Its uncertainty item moved into the summary's caveat.

### Background jobs no longer blank the Report
These jobs do not change the forecast:
- the ranges;
- the site-count search;
- the "what it would take" runs.

While one runs, Plan and the Report keep showing the current results, with a progress line. Before, the Report was replaced by "Current simulation results are not available" until the job finished. Exports still wait for the job to finish. A run that replaces the forecast (an input change) still withholds it, as before.

This uses an optional `purpose` argument on `requestSimulation`, together with `analysisRunning()` and `resultsShown()`.

### Country decisions (Plan)
Each country is one line showing:
- sponsor, optimized and user sites;
- the decision chip;
- the main risk.

The decision form, evidence status and next action open per country. A country with a decision in progress opens by itself, and a country you open stays open (also after saving). Every control stays in the page, so the Standard-view test still finds them. For the 16 countries of the UC test project, the section is now about 1,000 px tall.

### Version label
The header and `APP_VERSION` show 0.9.15. The uncommitted v0.9.14 parser rules in the working copy are untouched.

### Tests
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

## v0.9.12 — Professional forecast charts

Both forecast charts now use one renderer and one visual style:
- the EMR fan chart (Plan › Forecast);
- the country model's sponsor-vs-recommended chart.

No forecast number changed.

**Header.** A plain-language title, then a sentence with the result. For example: "Median 405 randomized by month 18 · 8 in 10 runs 326–490 · target of 300 reached in 97% of runs". Below it, one quiet line of run details: sites, number of runs, pool basis.

**Legend.** It names each mark in words ("Median", "Middle 50% of runs", "8 in 10 runs"). Text stays in text colours, and only the small swatches carry series colour.

**Axes.**
- Solid hairline gridlines.
- Sans-serif tick labels with thousands separators.
- Axis titles: "Participants randomized" and "Months from study start", or "from first country submission" for the country model.

**Target and deadline.** Both are neutral dashed reference lines, labelled "Target 300" and "Deadline · month 18". They replace the green and red lines, so status colours stay reserved for status.

**Highlighted value.** A dot marks the median at the deadline, labelled with its value on a halo. A second series' value is labelled only where it doesn't collide; the tooltip and the table carry every value.

**Two footprints.** The recommended range is shaded. The sponsor's range is drawn as two thin edge lines, so the two ranges never blend into one muddy area.

**Interaction.** A crosshair snaps to the nearest month, with a tooltip that leads with the value: "277 median · middle 50% 248–311 · 8 in 10 runs 220–350". The chart is keyboard-accessible: Tab to it, then use ←/→/Home/End.

**Table view.** "Forecast as a table" lists the median and ranges every 3 or 6 months, with the deadline month marked.

**Colours.**

| Series | Light theme | Dark theme |
|---|---|---|
| Series 1 (blue) | `#3186ff` | `#3987e5` |
| Series 2 (orange, sponsor) | `#eb6834` | `#d95926` |

These pass the dataviz palette validator in both themes: lightness band, chroma floor, colour-blind separation (ΔE ≥ 26.8), normal-vision floor, and contrast. The app's dark-theme blue `#5ea2ff` failed the lightness band for a data series, so the chart uses its own tokens.

**Percentile names.** P10, P50 and P90 are named everywhere:
- end labels at the right edge of the chart;
- the legend ("P50 (median)", "P25–P75", "P10–P90");
- the subtitle ("By month 18: P50 405 randomized · P10–P90 326–490 (8 in 10 runs)");
- the tooltip, which lists P90, P75, P50, P25 and P10 for the hovered month, with P50 emphasised;
- the table columns (P10, P25, P50, P75, P90).

All suites pass.

## v0.9.11 — A more organised interface (layout only)

No forecast, input or control changed. Every control is still present, and Plan sections that are not showing stay in the page.

### Repeated blocks removed (all tabs)
- **Study details only on the Study tab.** The full form (indication, target, window, sites, countries) was meant to show on Study only, but the card's CSS overrode the `hidden` attribute, so it repeated on every tab. Evidence, Plan and Report now show a one-line summary instead, for example "Study · type 2 diabetes mellitus · 300 randomized within 18 months · no proposed countries". It has an "Edit study details" button that returns to the Study tab.
- **Compact forecast status.** The "Background Monte Carlo" panel (title, progress bar, button and worker note) appeared at the top of every tab. A finished forecast now shows nothing there: the tab already says "forecast current". A small "Recalculate" button sits in the action bar instead. While a forecast runs, or after a cancel or error, one compact line shows the status, progress and Cancel or Recalculate. The worker note moved to that line's tooltip.
- **Slimmer demo banner.** It is one row, with the exit button beside the text. The wording is unchanged.

### Less noise
- **Logic column moved to Expert view.** The criteria table's parser-code column (`HAS_DX(t2dm) WITHIN WINDOW …`) is Expert-only now. Concept, thresholds, flags and the source text stay visible.
- **Long assumptions folded away.** The cohort's assumptions paragraph sits behind an "Assumptions behind these counts" expander.

### Plan tab in four sections
The Plan tab used to be one 6,000-px page. It now has a sub-menu that shows one section at a time, with a one-line status on each button:

| Section | What it holds | Example status |
|---|---|---|
| **Forecast** | Simulation parameters, forecast stats (projected pool, P(target), median and P90 months), enrollment chart, sensitivity ranges. In the country model, the country forecast. | "93% reach 300 by month 18" |
| **Patient pool** (EMR data only) | Pool counts, eligible-pool scenarios, unknown results by criterion, attrition, eligible patients by site, model definitions | "298 eligible records (central)" |
| **What-ifs** | The flexibility search | "find a feasible configuration" or "N options found" |
| **Sites** / **Countries & sites** | Scoring weights, portfolio forecast, ranked sites and site review, or the country review | "6 of 10 sites selected" |

"Show all" shows every section with headings. The chosen section is presentation only and is not saved with the project.

### Measured (synthetic demo, 1400-px window)

| Page | Before | After |
|---|---|---|
| Plan | 6,028 px | 1,550–2,250 px per section |
| Evidence | 2,476 px | 1,919 px |
| Study | 4,072 px | 3,323 px |

### Tests
All suites pass unchanged:

| Suite | Result |
|---|---|
| Parser | 104 |
| Engine | 107 |
| Lifecycle | 10 |
| UX | 21 |
| R2 | 21 |
| Project | 21 |
| R3 | 34 |
| View | 44 |
| Flex | 21 |
| Gemini | 40 |
| Node kernels | 10 |

## v0.9.10 — Threshold relaxation in the flexibility search, and a strictness test

### Flexibility search: "Numeric thresholds that may be relaxed" (EMR cohort model)
**What it does:** next to "Eligibility criteria that may be dropped", the Plan tab's "Where the plan can flex" search can now relax numeric thresholds step by step. These are lab values, age limits, prior therapy lines and numeric biomarker cut-offs.

**How you use it:**
- Tick which thresholds may move and the maximum number of steps.
- The search finds the smallest number of steps that reaches the goal, either alone or combined with the other levers.
- Inside a combined option, threshold changes are reduced first, together with target and criteria changes, because they are protocol-level.

**How a step works:**
- **Direction:** every ticked threshold loosens in the direction that admits more patients. For inclusion criteria, ≤ limits rise and ≥ limits fall, and ranges widen. Exclusion criteria move the opposite way.
- **Size:** 5% of the threshold per step. Age moves by whole years (at least 1) and therapy lines by one line. ULN-based lab limits (e.g. ALT ≤ 2.5×ULN) relax the ULN multiple.

**Safeguards:**
- Safety-essential criteria are never offered.
- An adult protocol is never relaxed below 18 years.
- Options list the exact new thresholds (e.g. "INC · Age 18–75 → Age 18–83") and carry a warning that this needs medical and sponsor agreement and may need a protocol amendment.

**Applying an option:**
- A reason is required.
- The new thresholds are written to the criteria, and the reason is stored on each one (`relaxedReason`).
- The change appears in the applied-options log, and "Restore criteria" undoes it.

**Saving:** settings are stored in the project file (`flex.relax: { on, max, ids }`) and checked on load. Older projects load with relaxation off.

**When it's available:** only with EMR patient data, like dropping criteria. The registry country model has no patient pool for criteria to act on.

#### Tests
**New "Thresholds" tests in the flexibility suite (4):**
- direction and step rules, including the adult age floor and ULN multiples;
- only non-essential numeric thresholds are offered, relaxing never shrinks the pool, and applying an option is reasoned and reversible;
- the search returns the smallest step that reaches the goal, and one step fewer does not;
- project save, load and validation.

**Full results — all suites pass:**

| Suite | Result |
|---|---|
| Parser | 104 |
| Engine | 107 |
| Lifecycle | 10 |
| UX | 21 |
| R2 | 21 |
| Project | 21 |
| R3 | 34 |
| View | 44 |
| Flex | 21 (was 17) |
| Gemini | 40 |
| Node kernels | 10 |

### Protocol strictness as a forecast signal: tested, not adopted
**Question:** does protocol strictness predict how fast a trial recruits, using the 153 round-4 calibration and validation trials and the app's own parser?

**Answer:** no relationship that holds up. With the measure fixed in advance:
- the correlation with forecast error is +0.10 on calibration and 0.00 on validation;
- the AUC for predicting later failure is 0.55 and 0.62.

**So:** no rate factor was added, and no test set was spent. Details are in `stress-test/round4/STRICTNESS.md`. The registry forecast still does not change when the protocol is edited; with EMR data, criteria changes act on the eligible pool.

## v0.9.9 — Engine recalibration from the round-4 back-test, 203 trials

See `stress-test/round4/ROUND4-REPORT.md` for the method and the results (calibration, validation and lockbox).

### Engine
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

### Tests
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

## v0.9.8 — The headline leads with the central case

Builds on v0.9.7 and on 2f5a87f (Gemini option for country research, committed separately by another session).

### Why
In the synthetic demo, the Decision Summary said **"Unlikely to reach the target on time"**, with 0–0 patients by month 18.
The EMR forecast ran on the conservative pool by default, and in the demo no record passes every requirement the software
can check. The central assumed scenario (298 records) reaches the target in 93% of runs. A sponsor reading the headline
would take a "nothing could be verified" finding for a predicted shortfall.

### What changed
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

### Tests
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

### Noted for later
- The test suites read the browser's stored vocabulary (`tfp_vocab_v1`), so AI-registered concepts from earlier sessions
  can change parser results. The suites should run against an empty vocabulary.
- The demo site questionnaire states "Modelled enrollment by month 18: ~118 participants" next to a headline median of
  387 for the selected sites. This is probably a per-site or different-scope figure, but it should be checked so the two
  do not appear to contradict each other.

## v0.9.7 — Three gaps left open by the v0.9.6 review fixes

Builds on v0.9.6. Closes the three items listed under "Not changed (noted for later)" in the v0.9.6 notes below. Each fix is
one commit, and the full test suite was run after every fix. No engine change: `src/mc-kernels.js` is untouched.

### Eligibility parsing
- **AI-parsed strict ranges stay strict.** v0.9.6 (F03) kept strict range ends for the rule-based parser. The JSON schema
  used by Claude and Gemini had no strictness field, so "Age > 18 and < 65" parsed by AI still became an inclusive 18–65
  range. What changed:
  - Each rule now has `min_strict` and `max_strict` (true, false or null) in the schema and in the instructions sent to
    the model.
  - `true` maps to the same exclusive-end flags the rule-based parser uses. Evaluation, the Logic column and the label all
    follow ("(age > 18 AND age < 65)", "Age > 18 and < 65").
  - The validator rejects any other value, for Claude, Gemini and pasted answers alike.
  - Answers without the fields are read as before (inclusive). These include older saved answers, JSON pasted from
    Claude.ai, and models that leave the fields out.
  - An empty strict range (for example "> 50 and ≤ 50") is sent to manual review, as it already was for the rule-based
    parser.
  - Schema budget: the schema now has 15 nullable (anyOf) fields. Anthropic structured outputs allow at most 16 per request,
    so one is left. A test checks the limit (16 union-typed fields, 24 optional fields).
- **"≥ 160 or ≤ 90" stays inclusive.** Two outside limits joined by "or" are read as a range whose minimum is above its
  maximum. That range was always split into "> 160" and "< 90". Each limit now keeps its own comparator:
  - "≥ 160 or ≤ 90" gives ≥ 160 and ≤ 90;
  - "> 160 or ≤ 90" gives > 160 and ≤ 90;
  - "> 160 or < 90" is unchanged.

  The split now applies only when the parser actually paired two comparators (`parseComparison` marks these as `outside`).
  The marker stays internal: it is not copied onto age, lines or biomarker rules.
- **A reversed range with no comparators is no longer guessed.** A reversed range from BETWEEN_RE or RANGE_RE has no
  strictness flags, and no "or" either. Examples are "between 160 and 90" and "SBP 160-90 mmHg". It could mean two outside
  limits, a range written high to low, or a blood-pressure reading (160/90), and the text does not say which.
  - Before: it became two strict outside limits at 95% confidence. For an inclusion, that meant patients outside 90–160
    qualified, the opposite of the plain reading.
  - Now: no rule is made from it. A line with nothing else becomes manual review. Other rules from the same line stay, and
    are flagged because the numbers were not interpreted.
  - **Behaviour change to review:** "Uncontrolled hypertension (SBP 160-90 mmHg)" used to give "NOT SBP > 160" and "NOT
    SBP < 90". It now gives the hypertension exclusion at 55% confidence, marked incomplete. That is what "blood pressure >
    160/100 mmHg" already gave.

### Benchmark data
- **A rate column that disagrees with the counts is flagged (not silently preferred).** Some rows have a rate column and
  also patients with site-months, or with sites and months. The rate column was used and the counts were ignored without
  comment. When the two rates differ, the benchmark panel now says so:
  - **When a row counts:** the rates are compared after the unit and screen-failure conversions, and a row is flagged when
    they are more than 25% apart and at least 0.01 patients/site/month apart. Zero patients against a positive rate column
    is also flagged.
  - **The warning:** a warning above the overall benchmark lists each such row: line, country, trial, both rates and how
    far apart they are (up to 8 rows, then a count).
  - **Which value is used:** the warning says the rate column is still used and how to use the counts instead (set "Rate"
    to "— not in file —"). After a project load, where the mapping cannot be edited, it says to re-import the file.
  - **sites × months:** when the counts came from sites × months, the warning explains that this assumes every site
    enrolled for the whole period, which understates the rate when sites opened at different times.
  - **Country table:** each affected country gets a "N disagree" chip next to its row count.
  - **Report:** each aggregate carries a `conflicts` count, so the JSON report's benchmark summary includes it.
  - **Rates unchanged:** which rate is used and how countries are aggregated (N01) are both unchanged.
  - **Project files:** rows gain two optional fields, `line` and `countBasis` (`PROJECT-SCHEMA.md`). Rows from earlier
    project files are checked too, because they already store patients and site-months. Their line numbers are not shown.

### Not changed (noted for later)
- Reversed outside limits on age or lines of therapy ("Age < 18 or > 75") still become a reversed range. Validation
  rejects it ("reversed range (75 > 18)"), but the parser gives it 95% confidence. Only the lab path splits outside limits.
  This is unchanged from v0.9.6.
- The disagreement threshold (25%, and at least 0.01 patients/site/month) is fixed. It is not a setting.
- The AI schema has one nullable field left under Anthropic's limit of 16. A further nullable field needs a schema
  redesign (for example, making some fields optional instead of nullable). The new test fails if the limit is passed.

### Tests
- 6 new checks, each written first and seen failing before its fix. The total goes from 401 to 407:

  | Suite | Before | After | Change |
  |---|---|---|---|
  | parser | 100 | 104 | "≥ 160 or ≤ 90", "> 160 or ≤ 90" (inclusion group), "between 160 and 90", "160-90 mmHg" |
  | Gemini | 31 | 32 | AI strict range ends: evaluation, logic text, validation, old answers, schema limits |
  | view | 40 | 41 | benchmark rate column vs counts: panel warning, country chip, sites × months note, no false flags |

- No test was removed, loosened or changed.
- Final results (Chromium, 127.0.0.1):

  | Suite | Result |
  |---|---|
  | parser | 104/104 |
  | engine | 107/107 |
  | lifecycle | 10/10 |
  | UX | 20/20 |
  | R2 | 21/21 |
  | project | 21/21 |
  | R3 | 34/34 |
  | view | 41/41 |
  | flex | 17/17 |
  | Gemini | 32/32 |

  `node --test tests/kernels.test.mjs` passes 10/10 and `node tools/build.mjs --check` reports in sync.

## v0.9.6 — Fixes from the external v0.9.5 review

Builds on v0.9.5. An external code review of v0.9.5 reported 13 findings. Each one was reproduced in the real app, given a
proposed fix, and reviewed again before being applied (`stress-test/REVIEW-v0.9.5-findings.md`). All 13 are fixed here,
one commit each, and the full test suite was run after every fix.

### Eligibility and patient data
- **FHIR observations marked entered-in-error or cancelled no longer count (F02).** Before, a withdrawn result was used
  like any other. Because the newest value per lab wins, a retracted HbA1c could replace a valid earlier one and turn a
  "fails" into a "meets". These observations are now skipped and counted in the import report. Preliminary and
  registered results are still used, but the report says how many there were.
- **AI-parsed lab thresholds run in the canonical unit (F01).** When Claude or Gemini kept the protocol's own unit (for
  example "Hb ≥ 100 g/L", "ANC ≥ 1500/µL" or "HbA1c 53–86 mmol/mol"), the number was used as if it were in g/dL, ×10⁹/L
  or %. The threshold is now converted with the same table used for patient observations, and the rule shows a
  unit-conversion chip. If the unit cannot be converted, the rule is left unresolved for manual review. Three cases are
  accepted as written:
  - a ULN multiple (also written "xULN");
  - scores, which have no other scale;
  - rules with no threshold number.
- **Strict ranges stay strict (F03).** "Age > 18 and < 65" used to be evaluated as 18–65 inclusive, and the Logic column
  printed BETWEEN, so the error could not be seen. Each end of a range now keeps whether it is strict, in evaluation, in
  the logic text ("(age > 18 AND age < 65)") and in the label ("Age > 18 and < 65"). Inclusive ranges and saved rule sets
  are unchanged. Validation rejects an empty strict range (for example min = max with an excluded end). The parser test
  for "BMI > 17 and < 35" had recorded the inclusive behaviour; it now expects the strict form.

### Allocation
- **Keep-minimum respects the regional cap (F04).** Keeping a minimum number of sites in sponsor countries could push one
  world region past "Max share per world region" without any warning. The keep-minimum is now limited by the region's
  remaining room. Any shortfall is listed under Allocation diagnostics ("limited to N by the region cap"). With no
  regional cap (the default), allocation is unchanged. The engine change is in `src/mc-kernels.js`; the frozen-reference
  parity tests still pass.
- **Keep-minimum under "Only researched" is now recorded (F05).** A sponsor country that has no web research keeps its
  minimum sites, because that is an explicit request. Allocation diagnostics now record this as an exception instead of
  leaving it unexplained. Allocation numbers are unchanged.

### Registry and import data
- **Reversed or zero-length trial dates give no rate (F06).** A comparator whose primary completion came before its start
  used to get the 3-month minimum window, and so the highest possible per-site rate. These trials are now excluded from
  rates and counted separately in the rate-data line ("primary completion on or before start"). The 57-trial back-test is
  not affected: of its 9,703 comparators, 7 have such dates, and none of them would have produced a rate.
- **Malformed CSV files are refused (F07).** Before, an unclosed quote silently merged the rest of the file into one cell,
  and an unquoted delimiter shifted values into the wrong columns. Both now stop the import with a row-numbered error.
  This applies to every CSV import: patients, registry history, feedback, market evidence and benchmarks. Short rows and
  trailing empty cells (common in spreadsheet exports) are still accepted.
- **Impossible as-of dates are refused (F08).** An as-of date from an edited project file such as 2026-99-99 was sent to
  ClinicalTrials.gov unchanged. Any other invalid value quietly meant "today", which introduces look-ahead bias. Only
  real calendar dates are used now. An invalid value stops the registry search with a clear message and appears in the
  study review checklist.

### Benchmark data (v0.9.5 feature)
- **Pooling respects how each rate was derived (N01).** The aggregate used Σ patients ÷ Σ site-months whenever those
  columns were present. That ignored a rate column's per-year unit (12× too high in the repro) or its screen-failure
  conversion. Pooling now applies only to rows whose rate came from those counts; other rows use the weighted median of
  their normalized rates.
- **Benchmark numbers must be whole numbers (N02).** Before, cells such as "1-2", "12abc" or "$5", a stray %, and a
  quoted "1,5" in a comma file were read as fragments of a number. A negative patient count could even give a negative
  pooled rate. Such rows are now skipped, with the column named in the reason. Grouped thousands, decimal commas and %
  in the screen-failure column are still read.
- **Clearing benchmark data keeps the audit trail (N03).** Clearing used to delete the log while the applied rates stayed
  in the forecast, relabelled as "manual override". When logged values are still applied, clearing now removes the
  imported rows but keeps the source name and log. The overrides stay labelled "benchmark import", and the risk flag,
  summary note, JSON report (`rowsClearedAt`), export note and project file all still name the source. Once nothing is
  applied, clearing removes everything as before. The confirm text now describes what actually happens.
  `PROJECT-SCHEMA.md` documents the optional `clearedAt`.
- **Chained reverts work (N04).** After apply → apply → revert, the earlier benchmark value was back in force but was
  labelled "manual override", left out of the summary, and could not be reverted. The earlier entry is now active again,
  labelled, and revertible.

### Reports
- **Validation wording (D01).** Every report and the run manifest said there had been "no retrospective validation". That
  has been wrong since the 57-trial back-test, and the bid summary's own risk text cites that back-test. One shared
  statement now replaces it in all four outputs. It describes the back-test as exploratory: the same trials also
  calibrated the model, the figures are for v0.9.4 defaults (84% inside the 80% range, 33% median timing error), and it
  is not prospective or held-out validation.

### Beyond the original proposals
The review behind each fix found these gaps, which were closed in the same commit:
- **F01:**
  - "xULN" written without a space is accepted;
  - scores and rules without a threshold number are not sent to manual review;
  - the AI answer object is no longer modified in place.
- **F03:** the "> 160 or < 90" split no longer carries the strictness flags onto its one-sided rules.
- **N02:** in the new test, the control row's rate comes from counts. Its "pooled" assertion still holds under N01.
- **N03:** after clearing, the summary and bid-summary benchmark line, the JSON report and the export note keep naming the
  source. The panel text follows whether anything is still applied.

### Not changed (noted for later)
- The AI JSON schema has no strictness field, so strict ranges parsed by Claude or Gemini stay inclusive.
- The rule-based parser reads "≥ 160 or ≤ 90" as strict ("> 160" and "< 90").
- A rate column that disagrees with the patient and site-month counts is not flagged.

### Tests
- 13 new checks, one per finding. The total goes from 388 to 401:

  | Suite | Before | After | Findings |
  |---|---|---|---|
  | engine | 103 | 107 | F02, F03, F05, F06 |
  | gemini | 30 | 31 | F01 |
  | R3 | 33 | 34 | F07 |
  | view | 34 | 40 | F04, F08, N01–N04 |
  | R2 | 20 | 21 | D01 |

- One existing expectation was corrected: the BMI parser case, which had recorded the inclusive-range bug. No test was
  removed or loosened.
- Final results (Chromium, localhost):

  | Suite | Result |
  |---|---|
  | parser | 100/100 |
  | engine | 107/107 |
  | lifecycle | 10/10 |
  | UX | 20/20 |
  | R2 | 21/21 |
  | project | 21/21 |
  | R3 | 34/34 |
  | view | 40/40 |
  | flex | 17/17 |
  | Gemini | 31/31 |

  `node --test tests/kernels.test.mjs` passes 10/10 and `node tools/build.mjs --check` reports in sync.

## v0.9.5 — Benchmark data import (Citeline, Medidata or your own export)

Builds on v0.9.4. The evaluation (`stress-test/EVALUATION-v0.9.3.md`) found that registry data alone cannot tell a fast
programme from a slow one, and that real enrollment benchmarks are the most effective input. This release lets you bring
them in from the tools that hold them.

### What it does
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

### Tests
- New view checks (31 → 34):
  - detection and parsing: trial-by-country pooling, semicolon with decimal commas, yearly and screened rates, skip reasons;
  - apply, label and revert, with reasons;
  - project round trip, and refusal of a damaged row.
- Results (headless Chromium, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20,
  project 21/21, R3 33/33, view 34/34, flex 17/17, Gemini 30/30. `node --test tests/kernels.test.mjs` 10/10;
  `node tools/build.mjs --check` in sync.
- Forecasts without imported benchmarks are unchanged: spot-checked back-tests reproduce `results-v094-rerun.jsonl`.

## v0.9.4 — Comparators matched on planned patients per site; planned sites under Study; no tab jump

Source: `stress-test/EVALUATION-v0.9.3.md` (improvements P1, U1 and U2). Builds on v0.9.3.

### Result (57 back-tested trials, re-run in the application; `stress-test/results-v094-all57.json`)
Both engines were run on the same registry snapshot per trial (`stress-test/results-v094-rerun.jsonl`), with the same
method as `results-v093-all57.json`. The v0.9.3 column reproduces that file exactly.

| | v0.9.3 | v0.9.4 |
|---|---|---|
| Median abs. timing error (months from first patient) | 41% | **33%** |
| Timing log-RMSE (rule of thumb “median duration of the other trials”: 0.69) | 0.73 | **0.65** |
| Actual result inside the 80% range | 82% | **84%** |
| Median width of the 80% range (p90/p10) | 7.6× | **4.6×** |
| Slope of log(actual) on log(forecast) (1 = well scaled) | 0.42 | 0.57 |
| Rounds 1–2 (9 large trials): median error / coverage | 31% / 9 of 9 | **16%** / 9 of 9 |
| Round 3 (48 trials): median error / coverage | 43% / 79% | **33%** / 81% |
| < 30 usable comparators: coverage / width | 68% / 9.0× | **84%** / 5.7× |
| Longest third of forecasts: median bias | +56% | +27% |
| KEYNOTE-407 hold-out (not among the 57): months, actual 16 | 13 | **16** |

The improvement is smaller than the offline estimate in the evaluation (log-RMSE 0.61), because country rates mostly come
from each country's own comparator trials and only partly from the matched global rate. The median forecast now beats the
rule of thumb, though modestly. The ranges stay honest and are much narrower. Matching applies in 45 of the 57 trials; the
other 12 have fewer than 5 effective comparators with a similar load, or fewer than 3 usable comparators, and keep the
v0.9.3 weighting.

Caveat: the back-tests use each trial's final registry site count, and sponsors sometimes add sites when recruitment is
slow. Part of the gain may come from that, and would not be there when planning prospectively with the planned site count.

### Engine
- **Comparator trials matched on planned patients per site.** When the site count is the user's own, each comparator's
  enrollment ÷ listed sites is compared with target ÷ planned sites (weight 0.61 at 2× more or fewer), replacing the size
  weighting. The site count is the user's own when every proposed country has a site count, or a planned number of sites
  is entered under Study. The same weights give the country rates and the trial-level σ. The σ rule (0.8 × weighted SD, kept within
  0.3–0.9) was checked on the re-run and left unchanged.
  - The planned load is kept within the 5th–95th percentile of the comparators' loads. An undersized plan is therefore
    never matched to rates no comparator reached, and a load above that range is a risk flag.
  - Fewer than 5 effective matched comparators keep the size weighting (the same minimum as for measuring the spread),
    so thin evidence cannot rest on one or two trials. In the back-tests this kept DAPA-HF (3 comparators) at 18 months,
    actual 19 (41 without the minimum).
  - Off switch: Plan › Model assumptions › “Match comparator trials on planned patients per site”. A project file stores
    it as `fpp.ppsMatch` (files without it load as 1).
- Plan shows the comparator basis, e.g. “Comparator rate 0.24 patients/site/month: 349 completed comparator trials
  weighted by how closely their patients per site match this plan (4.5 = 559 ÷ 125 planned sites …)”. The executive
  summary repeats it.

### Changes
- **Planned number of sites under Study details**, next to the target and window. It is part of the study (`brief.plannedSites`):
  - It anchors the matching and also sets the recommended footprint's size (Plan › Custom), with no first run or visit to
    Plan needed.
  - Clearing it restores the default 75.
  - The review checklist's “Planned sites” row shows the plan's patients per site, or asks for the number.
- **What-ifs keep the plan's matched comparators.** Changing the site budget under Plan, applying a flexibility option or
  searching for the sites needed for 80% adds or removes sites at the plan's matched per-site rate. A search's result is
  therefore what applying it shows.
  - Example: on KEYNOTE-407, 200 sites reach the target in 79% of runs, both in the search and after applying.
  - Without the anchor, the rate would be re-matched to 200 sites and the applied plan would show 70%.
  - This also avoids leaning on the site-count relationship for added sites, which may partly reflect rescue sites in
    the back-test data.
- **Finishing a run no longer moves you.** If you open another tab while the analysis runs, you stay there and see “The
  analysis is complete: the Report is ready”. Staying put still opens the Report.
- Risk flags: planned load above 95% of comparators (medium), below 5% (info); comparators not matched on patients per
  site, with the reason (info).

### Tests
- New view checks (27 → 31):
  - matching and its fallbacks (no site count, option off, older data without loads, too few similar comparators, clamp);
  - the planned-sites field (budget, anchor kept under a Plan budget what-if, precedence of a complete footprint, clearing,
    review row, project validation);
  - forecast basis, rate kept for a budget what-if and clamp flag on the fixture;
  - staying on the user's tab after a run.
- `tests/run-app-suites.cjs` runs every in-app suite headless (needs a localhost server and Playwright).
- Results (headless Chromium, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20,
  project 21/21, R3 33/33, view 31/31, flex 17/17, Gemini 30/30. `node --test tests/kernels.test.mjs` 10/10;
  `node tools/build.mjs --check` in sync (the kernels are unchanged).
- `stress-test/analysis/rerun_backtests.cjs` re-runs the back-tests in the application. It reproduces
  `results-v093-all57.json` exactly with matching off. `compare_v094.py` produces the table above and the σ check.

## v0.9.3 — Calibration from 57 back-tested trials

Source: round 3 of `stress-test/STRESS-TEST-REPORT.md` (48 trials selected automatically from ClinicalTrials.gov results
records, plus the 9 trials of rounds 1–2). Builds on v0.9.2.

### Result (all 57 trials re-run; `stress-test/results-v093-all57.json`)
| | v0.9.2 | v0.9.3 |
|---|---|---|
| Actual result inside the 80% range | 63% (36/57) | **82% (47/57)** |
| Median timing bias | ≈ 0% | **0%** |
| Median absolute timing error | ≈ 40% | 41% (unchanged: ranges, not the median, were the problem) |
| Inside 80% range, ≥ 30 comparators / < 30 (now flagged) | 65% / 50% (round 3) | 94% / 68% |

### Engine
- The trial-level multiplier is now **median-preserving** (`exp(σz)`), because the comparator rate it scales is a median of trials.
  A first attempt kept the mean-preserving form `exp(σz − σ²/2)`; with the wider σ it shifted the median forecast ~30% slower
  (bias +29% over 57 trials) — caught by the back-test and corrected. With σ = 0 results stay bit-identical to the frozen references.

### Changes
- **Wider, calibrated trial-level uncertainty.** The automatic trial-level σ is now 0.8 × the weighted SD of comparator trials'
  log per-site rates, kept between 0.3 and 0.9 (was 0.5 × SD, 0.15–0.6); 0.9 when fewer than 5 comparators exist. In round 3
  only 58% of actual results fell inside the 80% range with the old setting. A user value still overrides it.
- **Range first.** The decision summary and executive summary now lead with “8 in 10 simulated runs randomize X–Y
  participants by month D (median M). Recruitment from the first patient takes A to B months in 8 of 10 runs.”
- **Recruitment speed scenario and benchmark rate** (Plan, next to the site budget):
  - Speed scenario: Typical (default, ×1), Fast (high-volume sites, common or single-visit indication, ×2), Slow (rare
    population, complex protocol, ×0.75). Round 3 found no overall bias, so no global factor is applied by default.
  - Benchmark rate (patients/site/month, optional): re-centres every country on the user's own benchmark while keeping the
    registry's relative country differences.
  - Either one adds an “uses a user assumption” note to the risks and the executive summary.
- **Thin-evidence warning** at < 30 usable completed comparators (risk flag and registry status; was a < 50 status note).
  Round 3: median timing error 63% with < 30 comparators vs 37% with ≥ 30.

### Tests
- New view check “Calibration” (speed scenario ×2, benchmark re-centring, thin-evidence flag, range-first summary, project file
  rejects an unknown scenario). View suite 26 → 27.
- Updated: the v0.9.1 view check that asserted the thin-evidence σ of 0.6 now asserts 0.9 (the rule it tests was changed here).
- Made deterministic: the flex check “a search is stopped when an input changes while it runs” changed the input after a fixed
  30 ms, which intermittently came after the search had finished; it now changes the input on the search's first progress
  report. The assertion is unchanged.
- Results (browser, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33,
  view 27/27, flex 17/17 (twice in the same run), Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10;
  `node tools/build.mjs --check` in sync.

## v0.9.2 — Fixes from the second retrospective round

Source: round 2 of `stress-test/STRESS-TEST-REPORT.md` (MONALEESA-2, STEP 1, CLARITY AD, KEYNOTE-024). Builds on v0.9.1.
The recruitment model and engine are unchanged; this release fixes one planning bug and protocol parsing.

### Planning
- **Window not longer than start-up.** Previously every country scored 0 (rate × (window − start-up)), so nothing was
  recommended and no reason was given (STEP 1 with its real 6-month window). Now countries are ranked by rate, the allocation
  diagnostics explain why, and the “Review before analysis” checklist warns before the run that the window counts from study start.

### Protocol parsing (registry-style eligibility text)
- Markdown escapes (`\>=`, `\<`) are removed and an operator repeated in brackets after its words is ignored:
  “aged greater than or equal to (>=) 50 and less than or equal to (<=) 90” → `age BETWEEN 50 AND 90` (was `age <= 50`).
- “> 160 or < 90” becomes two outside limits (exclusion) or an OR group (inclusion) instead of an impossible range.
- “lacking EGFR … and/or ALK …” → both markers negative (the negation covers the clause); “lacking” is a negation word.
- “not evaluable for PD-L1” no longer becomes “PD-L1 negative”.
- Contraception / pregnancy-test lines: no sex restriction, and drugs named there (“after the last dose of …”) are not rules.
- “age-adjusted / age-matched …” is not an age criterion; durations (“amenorrhoea for 12 or more months”) are not ages.
- “If receiving an approved treatment …” inclusions are manual (they apply to some patients only).
- “BMI ≥ 30, or ≥ 27 with at least one of the following comorbidities: …” keeps only the threshold, not the examples.
- “… defined either by:” starts an any-one-of group (postmenopausal definitions); “defined as:” lists stay all-of.
- “locoregionally recurrent or metastatic” is an OR group, not two required statuses.
- “(in the absence of chemotherapy …)”, “(e.g. …)” brackets name examples, not rules.
- “change in body weight > 5 kg” is not a body-weight threshold; “NYHA functional classification III–IV” is a severity qualifier.
- “therapy for the treatment of their stage IV NSCLC” in an exclusion no longer excludes the disease or stage itself.

### Tests
- New: 17 parser cases (83 → 100) and 1 view-suite check (25 → 26). Existing tests unchanged.
- Results (browser, localhost): parser 100/100, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33,
  view 26/26, flex 17/17, Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10; `node tools/build.mjs --check` in sync.

## v0.9.1 — Fixes from the retrospective test of five completed trials

Source: `stress-test/STRESS-TEST-REPORT.md` (EMPA-REG OUTCOME, LEADER, SUSTAIN-6, DAPA-HF, KEYNOTE-189).
Pre-change copy: `feasibility-pipeline.v0.9.0-uifix-backup.html`; engine before the change in the same backup (embedded).

### Recruitment model
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

### Country recommendation
- Default max share per country 0.35 → **0.20**.
- **Evidence minimum** (`minEvidence`, 3): countries with fewer usable completed comparator trials are not recommended unless
  “Use” is ticked (chip “low evidence”); sponsor countries are still modelled. If no country qualifies, all are used and the
  allocation diagnostics say so.
- Optional **regional cap** (`maxRegionShare`, off at 1) using a geography-only region table.

### Protocol parsing
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

### Small fixes
- “Country research skipped …” no longer repeats on every run; registry status notes the as-of date, long-follow-up trials and
  thin evidence (< 50 completed trials).
- Review checklist warns when no countries are entered and the default 75-site budget would drive the forecast.
- Saved registry trials keep `followup` so rates are identical after reload.

### Tests
- New: 15 parser cases (68 → 83), 6 view-suite checks “Retrospective” (19 → 25). Existing tests unchanged.
- Results (browser, localhost): parser 83/83, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33,
  view 25/25, flex 17/17, Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10; `node tools/build.mjs --check` in sync.
- Note: the flex check “A search is stopped … when an input changes” failed once in one full run (timing-dependent: it changes an
  input 30 ms after starting a search) and passed in the next three runs.

## v0.9.0 — Task-based workspace (presentation only)

Simulation kernels, equations, eligibility semantics, data processing, API requests and project format are unchanged. Pre-change copy: `feasibility-pipeline.v0.8.1-backup.html`.

### What changed
- **Four tabs** replace the diagram and Prev/Next as the default navigation: Study (steps 1, 3), Evidence (step 2), Plan (steps 4, 5), Report (step 6). They render the existing panels; `S.step` is still the only navigation state, so every "go to step" control still works. Switching tabs only renders (tested: no request, no job, same simulation signature).
- **Study**: study details card (indication, target, window, proposed countries), protocol textarea and .txt upload, extracted criteria, collapsed patient-data and history imports, and a "Review before analysis" checklist. Nothing is approved automatically.
- **One primary action**: Review study → Run analysis → Review report, or Update analysis when results aren't current. While running it shows the phase and progress, plus Cancel forecast (or Cancel Gemini request).
- **Run analysis** runs only your own inputs (forces live web mode, refuses without a protocol or indication). Report opens only after a successful, current run; otherwise the app stays on the tab that shows the error.
- **Report** adds "Read the forecast with": uncertainty, assumptions, missing evidence and demo provenance, placed after the decision summary.
- **Header**: Project menu (Save, Load, Reset). Settings panel holds the AI provider, Gemini and Claude fields (same ids and handlers, moved out of steps 2 and 3), run mode, Expert view and the old "Run full pipeline".
- **Indication and proposed countries** are edited only in Study; Evidence shows a summary with an "Edit in Study" button.
- **Technical workflow** (collapsed): the original diagram, step controls and Manual vs AI descriptions.
- The privacy notice is now one short line with expandable details (Gemini mentioned).

### Tests
- Updated (layout moved): `uiRenderSteps` now also renders the Study details card; one Gemini check looks for the key fields in `ws3() + settingsAiHtml()`.
- New: 5 "Tasks" checks in the view suite (unique ids per tab, tab switching is inert, primary-action states including cancel, failed vs successful run, no example substitution).
- Results (browser, localhost): parser 68/68, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33, view 15/15, flex 17/17, Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10; `node tools/build.mjs --check` in sync.

## v0.8.1 — Optional Gemini protocol parsing

Scope: protocol parsing only. Eligibility evaluator, Monte Carlo kernels (`src/`), allocation, worker controller and Claude country research are unchanged. Pre-change copy: `feasibility-pipeline.v0.8.0-backup.html`.

### What was added (HTML section "20. Optional Gemini protocol parsing")
- **Provider selector** (step 3): Rule-based only / Claude / Gemini. Default is Claude (existing behaviour). Changing it sends nothing; a failed request never falls back to another provider. Country research stays Claude-only.
- **Gemini key** field: held in memory only (`AI.gemini.key`). Not in sessionStorage/localStorage, `S`, project files, reports or the HTML.
- **Configurable model ID** with a datalist of models Google documents as free-tier (checked 2026-10-14 against ai.google.dev pricing and models pages). Listed paid-only and unlisted IDs need an explicit "may be billed" tick. No model is assumed free; the tool cannot enable billing.
- **Request**: `POST v1beta/models/{model}:generateContent`, key in `x-goog-api-key` header (never URL), `responseMimeType: application/json`; the existing `LLM_SCHEMA` is given in the prompt (not as Gemini's schema subset) and enforced locally.
- **Conversion**: strict JSON → `validateLlmItem` (existing) → `llmCriteriaToInternal` → `validateCriterion` (existing) → normal editable rule table (chip/reasons say "Gemini"). Invalid answers are rejected whole, before any vocabulary is registered.
- **Errors**: invalid key / permission, unknown or unsupported model, quota (429), FAILED_PRECONDITION, other 400, 5xx, network, timeout, truncation, safety block, empty/malformed/invalid output, cancellation (button), stale answers (protocol/study changed, or request replaced).
- **Privacy**: only protocol text is sent; a confirmation names Google, says patient records are never sent, and notes free-tier data use. Re-asked per protocol/model.
- The one-click run does not call Gemini (uses the rule-based parser and says so).

### Tests
- Mocked (no network): 30 checks, `runGeminiTests` / "Run mocked Gemini tests" (Expert view).
- Real API: separate opt-in "Run live Gemini check" (Expert view; uses your key and quota; synthetic protocol; applies nothing). Not run in development: no key available.
- Existing suites unchanged: parser 68, engine 103, lifecycle 10, project 21, R2 20, UX 20, R3 33, UI 10, flex 17, `node --test tests/kernels.test.mjs` 10; `node tools/build.mjs --check` in sync.

### Not verified
Real Gemini behaviour (response fields, error bodies, `maxOutputTokens` limits per model) is taken from Google docs and mocked; run the live check with your key.

## v0.8.0 — Flexibility search and sponsor-country planning

Built on v0.7.2 (below); kept as `feasibility-pipeline.v0.7.2-backup.html`. Verified 2026-10-14.

| Item | Value |
|---|---|
| Release | `feasibility-pipeline.html` v0.8.0, SHA-256 `d771ab761624a967437c36720ec3ddc7b87a147e0ed9d0e282255ed0d13d9ba5` |
| Engine | kernels and worker adapter unchanged, `build.mjs --check` in sync, runtime integrity verified |

### Added

#### Plan within the sponsor's countries only (step 4 checkbox, both views)
- When ticked, the recommended footprint, the sites-needed search and the automatic research list use only the countries in the sponsor's footprint. Other countries stay in the step 5 table, marked "outside sponsor list", with their "Use" box locked.
- Your own "Use" exclusions still apply inside the sponsor list. With no sponsor footprint entered, nothing is restricted and a warning says why.
- The bid-defense summary states the restriction. The choice is saved as `fpp.sponsorOnly`.
- Implementation: `computeFootprint` marks other countries as not allowed (`allow = userAllow && !outsideSponsor`). The allocation algorithm, the kernels and their inputs are otherwise unchanged; unticked (the default) gives exactly the previous recommendation.

#### Where the plan can flex (step 4 panel, both views)
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

### Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · Release 3 33/33 · lifecycle 10/10 · view, quick start and performance 10/10 (five new visibility checks for the new controls) · **flexibility and sponsor countries 17/17** · Node kernels 10/10.

Mutation checks:
- Applying without a reason, and letting the search ignore the sponsor restriction, each failed a test.
- The window option is checked against the kernel run directly: the reported extension reaches the goal, one month less does not, and the confirmed probability equals the kernel's.
- Applying a window option reproduces its confirmed probability exactly in the main forecast.

In the browser, on the offline registry example with sponsor-only ticked, ticking the window and clicking Find found "+5 months: 17% → 81% (borderline)" with no input changed. The result also showed that only 6 of the 13 budgeted sites fit the sponsor countries' estimated capacity.

### Limitations
- The search assumes more room never lowers the probability (usual with common random numbers, not guaranteed). Combined options are the smallest mix found by this greedy order, not a proven optimum.
- Eligibility criteria change forecasts only in the EMR model. The country model uses registry rates that already reflect past trials' criteria.
- When patient data and registry data are both loaded, the search uses the country model.
- Not run against live ClinicalTrials.gov data in this release.

## v0.7.2 — Responsiveness fixes

Built on v0.7.1 (below). No change to calculations, results, the worker, persistence or any existing test definition. Verified 2026-10-14.

### Fixed
- **Every committed edit froze the page with a large registry snapshot.** `refreshComparablePerformance` runs on every recalculation and re-derived the condition concept and its descendants for each site-trial row. The filter context is now built once per refresh (`comparableContext`); the decision logic is unchanged and checked against the frozen v0.7.0 implementation (`comparableDecisionReference`).
- **Step 5 rendered every site card's full contents while collapsed.** Collapsed cards now render only their summary; the contents are built when a card is opened, with keyboard focus kept on the summary.

### Measured (large synthetic snapshot: 520 trials, 5,565 facilities, 40 countries)

| | v0.7.1 | v0.7.2 |
|---|---|---|
| Comparable-trial refresh per recalculation | 148 ms | 9 ms |
| Page blocked after editing a country rate | 210 ms | 40 ms |
| Step 5 render + layout | 87 ms (2,991 nodes) | 35 ms (1,776 nodes) |
| Step 2 render + layout | 59 ms | 18 ms |

### Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · Release 3 33/33 · lifecycle 10/10 · **view, quick start and performance 10/10** (2 new: identical decisions to the reference across 14 filter combinations; lazy card contents and focus) · Node kernels 10/10 · `build.mjs --check` in sync.

The new view test that checks decision controls now opens the cards first, because their controls exist only inside an opened card.

## v0.7.1 — Standard / Expert view and protocol quick start

Built on v0.7.0 (below); kept as `feasibility-pipeline.v0.7.0-backup.html`. It adopts the useful ideas of the external "UI simplification patch" (folder 15) without the regressions found in that file. Verified 2026-10-14.

| Item | Value |
|---|---|
| Release | `feasibility-pipeline.html` v0.7.1, SHA-256 `f20cfbf2f2865c1f2c85b70494feef3eb04130d5745fc184880be6eef80de12d` |
| Engine | kernels and adapter unchanged, `build.mjs --check` in sync, runtime integrity verified |

Unchanged: all calculations, the worker controller, validation, persistence (no new project fields) and every existing test definition.

### Added
- **Standard / Expert view** (header button, `aria-pressed`, remembered in this browser only, never saved in a project). Expert-only items are hidden, never removed:
  - the verification suites, the vocabulary editor, the generated cohort query and forced re-research;
  - a few diagnostic columns and stats: known sites, SOC access, prevalence and source count (step 2); trials per site (step 5); parse engine and execution status (step 3); note redactions and capped ages (step 1).
  Every input that changes a result and every review or decision control stays visible in both views; a test enforces this.
- **Simpler layouts** with nothing removed:
  - Step 1: an "optional in live web mode" callout with a link to step 3; upload first; demo buttons labelled synthetic; formats, the de-identification log and the record preview collapsed. The import report, including unit mapping, stays visible.
  - Step 2: the four brief fields and footprint lists up front; history window, phases, sponsor type and research limits collapsed under a summary that shows their current values.
  - Step 4: target, window, site budget and budget mode up front; the other model assumptions collapsed under a summary showing runs and seed. Diagnostics, the countries-without-registry-data table, the method note, sensitivity and definitions stay visible.
- **"Parse and collect registry data →"** (step 3) chains the existing steps: parse only if rules are missing or out of date (edits are kept), fill blank brief fields only, collect ClinicalTrials.gov data, recalculate and open step 4. With an empty protocol it refuses and never substitutes an example; examples keep their example label.
- **View and quick-start suite** (`runUiTests`, 8 checks, Expert view in step 3).

### Not adopted from the external patch
Removing the disabled-rule reason box, threshold editing, the essential toggle, rule export/import, the assumed-rate inputs, the cap reason, allocation diagnostics and the UX / Release 2 / project test buttons; loading an example silently when the protocol is empty; force-overwriting the brief; and the labels "On-Time Probability", "Expected Timeline", "Feasibility Score" and "80% Confidence", which overstate an unvalidated scenario model.

### Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · Release 3 33/33 · lifecycle 10/10 · **view and quick start 8/8** · Node kernels 10/10. Mutation checks: substituting an example on an empty protocol, and hiding the disabled-rule reason box in Expert view, each failed the new suite. In the browser: a real click on the header button switched the view, updated `aria-pressed`, stored the choice and showed the suites.

### Not executed
Quick start against live ClinicalTrials.gov (tests stub the registry call); 375 px checked inside the test iframe only.

## v0.7.0 — Release 3, site review and investigator engagement

Built on the accepted v0.6.1 baseline (below); kept as `feasibility-pipeline.v0.6.1-backup.html`. Verified 2026-10-13. Superseded for the UI by v0.7.1 (above); the Release 3 logic is unchanged there.

Unchanged: kernels and adapter (`build.mjs --check` in sync), Monte Carlo equations, RNG order, country-effect coefficients, eligibility evaluation, allocation, the worker controller and every existing test definition.

Existing lines changed: the version label and `APP_VERSION`; `freshState` (new review keys); `FEEDBACK_COLS` and `importFeedback` (optional new columns, original cell text kept); the "Saved:" text of the save panel; CSS. Everything else is the new section "17. Release 3".

### Added
- **Site cards (step 5)**, assembled on demand from the data already in the analysis (EMR cohort, site history as the model uses it, shortlisted registry facilities, imported responses). Every value is labelled *Observed / imported*, *Investigator-reported*, *Modeled assumption* or *Unknown / not collected*, with source and date. Registry locations are labelled "listing, not verified". Missing data is shown as not collected; nothing is filled in. Sites are matched by ID only; ambiguous names, conflicting names and generic registry labels are flagged. Each card lists evidence gaps and a recommended next action (separate from the decision).
- **Site decisions**: Invite to survey, Request more information, Prioritize, Hold, Exclude. A reason is required to record, change or clear; every change is logged. Decisions never change rankings, selection, allocations or forecasts.
- **Focused questionnaires**: the existing survey generators gain Section D (eligible patients over a stated period, screening confirmations, screened and randomized recruitment, competing studies, referral pathways, staff and facilities, activation timing, capacity and constraints) and a prefill-sources list. Model assumptions are marked "not an answer from your site"; a counts-only line asks for no patient-identifiable information.
- **Response review (step 6)**, reusing the existing importer: original values with unit, period, reporter, source and dates; flags for incomplete, inconsistent and outdated answers (older than 180 days or protocol changed); reviews need a reason and labels are never authenticated. Reported, observed and model-input recruitment are shown separately.
- **Explicit application** (registry mode only): the median of accepted randomized-per-month rates, or of start-up months, written to the existing country override with a reason, validated by the override limits, recalculated through `recompute()`, and revertible. Screened counts, patient pools, consent and screen-failure figures are never applied. EMR site forecasts have no per-site override field, so investigator values are comparison only there.
- **Site engagement pack (.md)**: labelled a questionnaire and information request, not a forecast report; forecast figures only when results are current; blocked while inputs are out of date; nothing is sent.
- **Persistence**: five optional sections in `tfp-project/1` (see [PROJECT-SCHEMA.md](PROJECT-SCHEMA.md)); no schema version change and no migration needed.
- **Release 3 suite** (`runR3Tests`, 33 checks, real Web Worker).

### Intentional behaviour changes
- Survey totals now read "Questions in sections A–C: N", followed by Section D and the new total.
- Investigator responses accept optional new columns (`reporter`, `eligible_period_months`, `screened_per_month`, `randomized_per_month`, `enrollment_unit`, `screening_confirmation`, `competing_overlap`, `referral_pathways`, `investigators`, `coordinators`, `capabilities`) and keep their original text.

### Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · lifecycle 10/10 · Node kernels 10/10 · **Release 3 33/33**. Eight deliberate breakages (reason not required, Exclude deselecting a site, accept auto-applying, pack ignoring result gating, authentication flag kept on load, screened rate applied, outdated not flagged, merge by name) each failed a Release 3 test. Keyboard-only flow on a site card verified by hand.

### Known issue found (existing behaviour)
Loading an example protocol nulls `S.history` but leaves `S.internalHistory`; the cards now follow `S.history`, but input provenance and saved files still mention the leftover history.

## v0.6.1 — Project save and load

Built on the accepted v0.6.0 baseline (below). The file format is documented in [PROJECT-SCHEMA.md](PROJECT-SCHEMA.md). Release 3 (site engagement) has not started. Verified 2026-10-13.

Unchanged and checked byte-identical against v0.6.0:
- Kernels and adapter
- `computeFootprint` and allocation
- The worker controller
- Eligibility evaluation (`evalNode` … and `computeCohort`)
- All existing test definitions (parser, engine, lifecycle, UX, Release 2)

Against v0.6.0, three existing lines changed: the version label, `APP_VERSION` and `renderAll`, which now also renders the project panel. Everything else is additive.

### Identity

| Item | Value |
|---|---|
| Baseline | v0.6.0 (kept as `feasibility-pipeline.v0.6.0-backup.html`) |
| Release | `feasibility-pipeline.html` v0.6.1, SHA-256 `4741b997767a809a549cfbf88ea24925c31dafb0436e00c550a7ca8982b1b149` |
| Engine | `mc-kernels/1` `cbf3cc09…bde199`, adapter `14556f95…e43c`, in sync; runtime `integrityVerified: true` |

### Added
- **Header actions: Save project and Load project….**
  - Save opens a panel listing what is saved and what is never saved, with a separate, unticked option to include pseudonymized patient records. The option explains that the records are pseudonymized, not anonymized, and that the file must be treated as sensitive.
  - Load reads a `.json` file. The project file input is handled by its own listener, which stops the generic file handler from recalculating the old analysis.
- **Versioned format `tfp-project/1`:**
  - Whitelisted sections, tagged encoding for Sets, Maps and non-finite numbers, and a SHA-256 checksum of the state.
  - Registry trials are stored with source fields only. Registry-derived site history is rebuilt on load instead of being stored, which brought a live ulcerative-colitis project from 25 MB to 1.7 MB.
  - Reuses the existing validators: rule-set (`validateCriterion`), evidence (`validateIntel`), and the parameter, footprint, override and brief schemas (`checkNum`).
- **Whole-file validation before anything changes:** schema, checksum, forbidden keys and every section, followed by a dry run of the derived computations on a candidate state.
- **Replacement confirmation** when the current analysis holds user work, through the existing `UX_IO.confirm` seam, which uses the real `window.confirm`. Cancel leaves the analysis unchanged.
- **After loading:**
  - The running simulation is cancelled and in-flight request tokens are invalidated.
  - Results are not restored, and evidence age and policy are re-checked against today.
  - Reviews of records missing from the file are not attached elsewhere, and reviewer labels and sources are forced to not authenticated and not verified.
  - The forecast is recalculated automatically unless an input is stale, in which case the summary says why.
- **Load summary panel:** what was restored, what was omitted and how to re-import it, evidence no longer used, detached reviews, ignored sections and warnings.
- **Project save/load regression suite** (`runProjectTests`, button in step 3; real Web Worker, offline fixtures).

### New functions
- Project file: `encProj`, `decProj`, `customVocabulary`, `coreTrial`, `projectState`, `buildProjectFile`, `projectFileName`.
- Loading: `validateProjectState`, `candidateFromProject`, `parseProjectText`, `loadProjectText`, `loadProjectFromUi`.
- UI: `projectPanel`, `renderProject`; actions `projSaveOpen`, `projSaveCancel`, `projDownload`, `projLoad`, `projDismiss`, `projectTests`.
- Tests: `runProjectTests`, `PROJECT_TESTS` and helpers.

### Intentional behaviour changes
- **Loading registers missing custom vocabulary in this browser.** Like adding a concept by hand, it is persisted to this browser's vocabulary storage. A conflicting local definition is kept and reported.
- **Registry-derived site history is rebuilt from the saved snapshot with the restored settings.** If enrollment-share settings changed after collection, the rebuilt history follows the current settings.

### Verification (final file)

| Suite | Result |
|---|---|
| Parser | **68 / 68** |
| Engine (existing) | **103 / 103** |
| UX regression (existing) | **20 / 20** |
| Release 2 regression (existing) | **20 / 20** |
| **Project save/load (new)** | **21 / 21** |
| Worker lifecycle (real worker, Step 3 button) | **10 / 10** |
| Node `tests/kernels.test.mjs` | **10 / 10** |

The 21 new tests cover:
- round trips of user inputs, decisions, reviews and the user footprint
- synthetic provenance with patients included, and mixed plus edited-example provenance
- patients omitted, and the patient-inclusion wording
- accepted/rejected evidence, detached reviews, forced not-authenticated status, and evidence age re-checked at load
- the user footprint without its result
- malformed JSON, a missing schema, an unsupported schema version and a damaged checksum
- invalid sections, including a prototype-pollution key
- credential exclusion
- replacement Cancel and OK
- forecast invalidation and exact reproduction after loading
- cancelling a run in progress, and ignoring inserted result sections
- vocabulary restore, registry-history rebuild, and an idempotent format

**Mutation checks:** each of these deliberate breakages made its test fail.
- Skipping the checksum check: caught by *Malformed JSON…*
- Mutating state before validation: caught by *Invalid sections…*
- Writing the API key into the file: caught by *API keys…*

**Browser end to end** (live ClinicalTrials.gov):
1. Built an analysis with an accepted undated evidence record, two country decisions and a user footprint.
2. Clicked Save project, then Download project file; the file was 1.7 MB and contained no key.
3. Reloaded the page, so all work was lost.
4. Loaded the file through the real file input.

The sponsor and optimized forecast curves, decisions, reviews, user allocation, evidence and site history all came back identical. The session key stayed out of the file and the user footprint was marked for recalculation.

Also checked:
- Loading over work with the real native `window.confirm`, answered Cancel by the in-app browser: the analysis was unchanged.
- Demo project saved without patients: the summary explains the omission at 375 px.
- No page JavaScript errors.

### Not executed
- **The native dialog's OK path was not driven by hand in this pane,** which auto-answers Cancel. OK is covered by regression tests through the `UX_IO.confirm` seam; you verified the native OK path independently for v0.6.0's Reset.
- **The browser's own file-picker dialog was not opened.** Loading was exercised through the same file input with a programmatically attached file, and saving through the same `download` path with the download intercepted.

### Remaining limitations
- **Large files with patient records:** with records included, a 2,500-record extract produces a large file. There is no compression or encryption, and sensitive files must be protected by the user.
- **The checksum detects damage or editing, not tampering:** anyone can recompute it. It is not a signature.
- **No migration path yet:** files from another schema version are refused outright.
- **Base-vocabulary changes:** a project saved with a different application version whose base vocabulary differs will show the criteria as stale and ask for a re-parse.
- **Evidence cache:** projects do not write to this browser's evidence cache, so a later "Collect registry data" does not reuse the loaded evidence. The loaded records stay in the analysis.
- **Not saved:** drafts (unsaved decision reasons or review text) and the visible scroll position.

## v0.6.0 — Release 2 (country recommendation workflow and Evidence Health)

Built on the accepted v0.5.1+ux2 baseline (below). Verified 2026-10-13.

Unchanged and checked byte-identical against ux2:
- Monte Carlo kernels and adapter (embedded block and `src/` hashes)
- RNG draw order
- `computeFootprint` and the allocation optimizer
- Worker controller (`ensureSimulationWorker` … `updateWorkerPanel`)
- Eligibility evaluation and country-effect coefficients
- All existing test definitions

This release does not establish clinical eligibility, validated recruitment prediction, source verification, reviewer authentication, privacy compliance or production readiness.

### Identity

| Item | Value |
|---|---|
| Baseline | v0.5.1+ux2, SHA-256 `298b2c59…5882` (kept as `feasibility-pipeline.v0.5.1-ux2-backup.html`) |
| Release | `feasibility-pipeline.html` v0.6.0, SHA-256 `55f0f1c533345bf67e40b0a28cef24927788f55260524eb8d10a227a87c1e269` |
| Engine | `mc-kernels/1` `cbf3cc09…bde199`, adapter `14556f95…e43c`. `build.mjs --check` in sync; runtime `integrityVerified: true` |

### Features

#### 1. Country decisions (step 5, "Your country decisions")
- One card per relevant country: sponsor, optimized and user countries, decided countries, unmodelled sponsor countries, and the top 8 by computed rank.
- Each card shows:
  - the computed rank and score (read-only)
  - sites per footprint
  - the committed decision with its reason and timestamp
  - evidence status
  - main risk and next action
- Decisions: Recommended / Conditional / Watchlist / Excluded, or Clear. Every commit or change needs a reason (at least 3 characters); identical re-commits and unknown values are refused. All changes go to a decision log.
- Decisions live in `S.countryReview`. They never touch `S.fp` rankings or allocations, and never start or invalidate a simulation.
- Drafts (`S.crDraft`) survive background re-renders.

#### 2. User-selected footprint and three-way comparison
- The user footprint can be created from the optimized or the sponsor footprint and edited per country.
- **Apply decisions to user-selected footprint** is an explicit action that changes only the user footprint:
  - Excluded/Watchlist → 0 sites.
  - Recommended/Conditional with 0 sites → the optimized count, else the sponsor count, else the minimum per country.
  - Unmodelled countries are skipped and reported.
- **Calculate user footprint** sends the main payload through the existing `requestSimulation('run', …)`. Only the footprint slot changes, so the same kernel, rates, start-up, stagger, σ, runs and seed are used.
  - Countries are sent in the optimized footprint's order, so an allocation identical to the optimized one reproduces the optimized result exactly.
  - The result is current only while `simulationResultsCurrent()` holds and its own signature (main signature + allocation) matches. Any allocation or main-input edit invalidates it.
- The comparison table shows, for sponsor / optimized / user:
  - per-country sites, rate and start-up
  - totals and countries
  - sites-weighted rate and start-up
  - share of runs reaching the target, median months, and median (P10–P90) randomized by the deadline
- **Differences in inputs** lists what is shared and every allocation difference. It also flags unmodelled sponsor countries and user countries that are switched off for the optimizer.
- Results are shown only when current; otherwise a cell reads "Not current" or "Not calculated for the current inputs".

#### 3. Evidence Health (step 2)
- Counts for Current, Expired, Undated, Other study context, Missing sources and Needs review. A record can be in several groups.
- **Source-linked** (a link is listed) is kept separate from **reviewed by you** (a local decision). The panel states that sources are not opened or verified and that reviewer labels are not authenticated.

#### 4. Evidence acceptance and rejection
- Each record has a stable identity (`evidenceId`). Review fields: reason (required), optional reviewer label (`reviewerAuthenticated: false`), timestamp, and a snapshot of the record's retrieval date, undated flag and context mismatch (`sourcesVerified: false`). All reviews go to a log.
- `evidenceBlock` precedence: rejection > per-record acceptance > global opt-in.
- Acceptance only opens the undated / other-study gate. It never dates a record, never clears `contextMismatch`, and never revives expired records.
- The global opt-in keeps its behaviour; its scope is now explained next to it. The checkbox moved from the export bar into Evidence Health (same handler).
- Every review change calls `recompute()`: old forecasts are cleared at once and recalculated.

#### 5. Country recommendation document (`country_recommendation_<date>.md`)
- Contents:
  - input provenance, application version, engine version and generation date
  - study target and timeline
  - sponsor / optimized / user footprints with results and input differences
  - country decisions with reasons
  - rate-scenario results
  - evidence gaps
  - top risks and actions
  - model assumptions, the verdict rule, and limitations
- Goes through `blockExport()`. A stale user footprint is written as "not calculated for the current inputs".
- Available from the comparison panel and the Decision Summary. The JSON report gains `countryDecisions`, `userFootprint` and `evidenceReview`.

#### 6. Header Reset protection
- When the analysis holds user work, Reset asks first. User work covers real inputs, edited examples, criteria edits, overrides, responses, market records, country decisions, evidence reviews and a user footprint.
- Cancel leaves the analysis unchanged.
- Demo start/exit use the unguarded reset internally, so their own confirmation is not doubled.

#### Small layout fixes (CSS only)
- At ≤640 px, the step header and chips inside callouts/notes wrap. Both overflows predate this release (a status chip and an allocation note in step 4).

### Changed functions

- **New:**
  - Country decisions: `commitCountryDecision`, `reviewCountries`, `countryRisk`, `countryNextAction`, `countryEvidenceText`, `countryReviewPanel`.
  - User footprint and comparison: `startUserFp`, `setUserFpSites`, `applyDecisionsToUserFp`, `engineOrder`, `userFpSignature`, `userFpCurrent`, `runUserFootprint`, `footprintModels`, `allocAssumptions`, `inputDifferences`, `footprintComparisonPanel`.
  - Evidence: `evidenceId`, `evidenceHealthOf`, `evidenceHealthPanel`, `reviewEvidence`, `evidenceAction`.
  - Export and reset: `buildCountryRecommendation`, `resetAnalysis`.
  - Tests: `r2WebFixture`, `runR2Tests`, `R2_TESTS`.
  - Actions: `crSave`, `ufpStart`, `ufpApply`, `ufpRun`, `ufpDiscard`, `evAccept`, `evReject`, `evClear`, `dlCountryRec`, `r2Tests`.
- **Modified:**
  - Evidence: `evidenceBlock` (per-record review), `evidenceState` (adds `review`, "rejected" label), `wsWeb` (Evidence Health replaces the export-bar checkbox).
  - Actions: `ACTIONS.reset` (guarded), `ACTIONS.startDemo` / `ACTIONS.exitDemo` (call `resetAnalysis`).
  - Wrappers: `ws5` (panels added above the existing ranking), `userWork`, `buildReport`.
  - Other: `freshState` (new state fields), `decisionSummary` (export button), `ws3` (Release 2 test panel), CSS.

### Intentional behaviour changes
- **Header Reset now asks before clearing user work.** It used to clear immediately.
- **Imported evidence can be rejected per record,** which removes it from the model even when it is current and even with the global opt-in on.
- **A per-record acceptance makes one undated or other-study record usable without the global opt-in.**
- **The global opt-in checkbox moved into Evidence Health.** Its behaviour is unchanged.

### Verification (final file)

| Suite | Result |
|---|---|
| Parser | **68 / 68** |
| Engine (existing) | **103 / 103** |
| UX regression (existing) | **20 / 20** |
| **Release 2 regression (new, real worker, offline fixture)** | **20 / 20** |
| Worker lifecycle (real worker, Step 3 button) | **10 / 10** |
| Node `tests/kernels.test.mjs` | **10 / 10** |
| Integrity | `build.mjs --check` in sync; runtime verified; no `new Function` / `eval` |

All existing test definitions are byte-identical to ux2.

**Mutation checks:** each test below was re-run with the code deliberately broken, and each failed as expected.
- Labels silently changing the optimized allocation: caught by *Review labels change neither…*
- Acceptance stamping a date on an undated record: caught by *Accepting an undated record…*
- The recommendation export skipping the current-result gate: caught by *The recommendation document is refused…*

**Browser checks** (in-app Chromium, `http://localhost:8765`):

- **Live ClinicalTrials.gov country path:**
  - A decision entered with the keyboard: the empty reason was refused, the commit worked, and focus stayed on the button.
  - The sponsor and optimized allocations and the run ID were unchanged.
  - Apply decisions, then Calculate: the result was identical to the optimized one when the allocation was identical.
  - Editing a User cell invalidated the result, and the export then said "not calculated for the current inputs".
- **Evidence Health:**
  - Undated, missing-sources and current records were grouped correctly.
  - A keyboard acceptance with a reviewer label triggered a recalculation: Poland's start-up went from 6 to 14 months. The record stayed undated and the label was marked not authenticated.
- **States:** synthetic demo (no country model, so the country panels stay hidden), mixed (UC example protocol plus your own country list, live), and real-data. All six screens render in every state.
- **Layout:** no horizontal page scroll at 375 px, 566 px (pane default) or 1280 px.
- **Tooltips:** all 21 present.
- No page JavaScript errors.

### Checks not executed or only partly executed
- **Native confirmation dialog, OK path:** not executable here. The app calls the real `window.confirm` (verified by wrapping it). This in-app browser closes JavaScript dialogs automatically and returns `false` within 1 ms, so the **Cancel** outcome is verified with the real native dialog, but an operator clicking OK is not. The OK path is covered by regression tests through the `UX_IO.confirm` seam.
- **Live Claude API country research** was not run (no key). Evidence was supplied through `importIntel` fixtures, the same path as the file importer.

### Remaining limitations
- **Mislabelled progress text:** while the user footprint calculates, the worker panel's progress text says "Recommended footprint". The unchanged worker adapter labels the second footprint slot that way.
- **Results hidden during a calculation:** while the user footprint (or any worker job) runs, steps 4–6 show "Current simulation results are not available" until it completes.
- **User footprint is opt-in to recalculate:** it is recalculated only on request. It is never auto-run after main-input changes; it is just marked not current.
- **No country model in the demo:** the synthetic EMR demo has no country footprint, so it shows no country decisions or comparison.
- **Evidence review identity:** a re-imported or re-researched record is a new record, so earlier reviews do not carry over to it.
- **Decisions are not persisted:** decisions and reviews live in the analysis state and the JSON report. They are lost on page reload, like all other analysis state.

## v0.5.1+ux2 — Stabilization of UX Release 1

Review fixes on top of v0.5.1+ux1 (below). Release 2 has not started. Verified 2026-10-13.

No change to the Monte Carlo kernels, seeded RNG draw order, allocation constraints, country-effect coefficients, worker controller, eligibility logic, forecast equations or the lower-pool default. This release does not establish clinical eligibility, validated recruitment prediction, privacy compliance or production readiness.

### Identity

| Item | Value |
|---|---|
| Baseline | v0.5.1+ux1, SHA-256 `a675139e…5767` (kept as `feasibility-pipeline.v0.5.1-ux1-backup.html`) |
| Release | `feasibility-pipeline.html` v0.5.1+ux2, SHA-256 `298b2c59144247f744e11776fa2f3f516502d99d0bdb498c779fb98af8be5882` |
| Engine | `mc-kernels/1` `cbf3cc09…bde199`, adapter `14556f95…e43c`; unchanged. `build.mjs --check` is in sync, and the page's runtime re-hash reports `integrityVerified: true`. |

### Fixes

#### 1. Evidence governance (the four pre-staged v0.5.2 tests are now green, unmodified)
- `importIntel`: validates every record before any evidence state changes. Imported records keep their own retrieval date (`at`), `model` and study context (`sourceKey`, `contextMismatch`). An undated record gets `at: null` and `undated: true`; the import time is stored only in `importedAt` and is never used as a retrieval time.
- `validateIntel`: rejects the whole file if any record has an unparseable retrieval date or one in the future (5-minute clock tolerance).
- `sanitizeIntel` + new `assessConfidence`: keeps `confidenceReported` and records why it was lowered in `confidenceNote`. Confidence is only ever lowered, never raised:
  - "high" with no estimate becomes "medium".
  - Numeric estimates with no cited source become "low".
  - Re-assessing an already assessed record starts again from the reported value, so the result is stable.
- `wsWeb`: shows the opt-in checkbox (wired to the existing `acceptUnverifiedEvidence` handler) whenever imported records are blocked as undated or researched for another study. Before this, nothing visible set that flag.

#### 2. Demo/example provenance (new `S.provenance`, set at load time)
- Nothing is inferred from `S.mode === 'emr'` or from matching text. Pasting the example text by hand is treated as your own input.
- Inputs are marked when loaded:
  - synthetic EMR (`loadDemoEmr`)
  - synthetic history (`loadDemoHistory`)
  - example protocols and the example footprint (step 3 example buttons, and both `runAll` fallbacks)
- An edited example stays "edited from the example" while at least 25% of its substantive lines remain.
- These clear the marker permanently:
  - replacing the text with something else
  - a protocol file (`loadProtocolFile`)
  - a real EMR import (`ingestText`)
  - an uploaded site history (`harmonize`, non-registry)
- Every input is reported individually as synthetic, example, derived from example, or user (`inputProvenance`). Mixed states are labelled "Mixed inputs".
- One sentence, `provenanceSentence`, feeds the banner, the JSON report (`syntheticOrExampleInputs`, `userInputs`, `inputProvenance`, `inputProvenanceNote`), the bid summary and the copied executive summary.

#### 3. Destructive demo actions
- *Exit demo* and *Try the synthetic demo* ask for confirmation whenever the analysis holds user work: real inputs, edited examples, edited criteria, country overrides, imported responses or market evidence.
- The message lists the work that would be lost and states that the whole analysis is cleared, not just the demo parts. Cancel leaves the analysis unchanged.
- A pure demo exits without asking. The mixed-inputs banner also warns that exiting clears your inputs.

#### 4. Country scenario wording
- Columns are now *Lower-rate scenario (−25%)*, *As modelled* and *Higher-rate scenario (+25%)*, under the heading "Country footprint: recruitment-rate scenarios".
- The text says they are sensitivity scenarios, not bounds, and not eligibility pools. The EMR group is titled "EMR forecast: eligible-pool scenarios".
- The EMR upper-pool card no longer says "ceiling".

#### 5. Verdict explanation
- `VERDICT_THRESHOLDS` = 80% / 50%, the same cut-offs the risk flags use. `verdictRule()` states both thresholds and says they are application decision thresholds applied to simulated outcomes, not validated recruitment standards.
- The rule appears under the verdict and in the copied executive summary.

### Changed functions

- **New:** `assessConfidence`, `markExample`, `clearProvenance`, `exampleState`, `inputProvenance`, `demoParts` (rewritten), `userParts`, `provenanceSentence`, `userWork`, `withProvenanceNote`, `loadProtocolFile`, `verdictRule`, `runUxTests`, `UX_IO` (confirm/clipboard seam), `UX_TESTS`.
- **Modified:**
  - Evidence: `sanitizeIntel`, `importIntel`, `validateIntel`, `wsWeb` (opt-in checkbox).
  - Inputs and actions: `ACTIONS.runAll` (marks example fallbacks, 2 lines), the protocol-file branch of the change handler, `freshState` (`provenance: {}`).
  - Wrappers: `loadDemoEmr`/`loadDemoHistory`, and new provenance wrappers on `ingestText`, `harmonize` and `ACTIONS.demoProto`.
  - Summary and setup: `buildReport` and `buildBidSummary` (wrappers), `renderStart`, `startHtml` (checklist labels), `rangeModel`, `verdictOf`, `decisionSummary`, `buildExecSummary`.
  - Demo actions: `ACTIONS.startDemo`, `ACTIONS.exitDemo`, `ACTIONS.copyExec` (copies via the `UX_IO` seam).
  - `ws3` (UX test panel) and the setup change listener (refreshes the banner when protocol edits are committed).

### Intentional behavioural changes
- Choosing *Synthetic EMR demo* in the header no longer shows the demo banner by itself; the banner appears once synthetic data is loaded.
- Example text that was typed or pasted (not loaded with an example button) is treated as the user's own input.
- Imported evidence without a retrieval date, or researched for a different study context, is not used in the forecast until the user ticks the opt-in. In ux1 such records were stamped with the import time and used.
- Imported confidence can be lowered by the policy; the original value stays visible as `confidenceReported`.
- Evidence files with an invalid or future retrieval date are rejected whole.

### Verification (final file)

| Suite | Result |
|---|---|
| Parser | **68 / 68** |
| Engine (existing) | **103 / 103**. Test code is byte-identical to the pre-release file. |
| UX regression (new, separate) | **20 / 20** |
| Worker lifecycle (real worker, Step 3 button) | **10 / 10** |
| Node `tests/kernels.test.mjs` | **10 / 10** |
| Kernel/adapter integrity | `build.mjs --check` in sync; runtime `integrityVerified: true`; no `new Function` / `eval` |

Browser checks: in-app Chromium at `http://localhost:8765`, desktop width and 375 px.

- **Empty state**, including the `emr` run mode with nothing loaded: no banner.
- **Synthetic demo**, started with a real click.
- **Demo edit**: typed in step 3; the banner switched to "edited from the example" once the edit was committed.
- **Exit demo**: Cancel left the analysis unchanged; OK cleared it.
- **Mixed state**: the UC example plus an uploaded-style EMR file, then a live run. The banner, JSON report, bid summary and copied executive summary all carried the same provenance sentence.
- **Real country path**: live ClinicalTrials.gov, no banner, renamed scenarios, 21 tooltips. Hover, focus, Escape, tap-to-pin and tap-outside all work.
- **Export gating**: Decision Summary, copy and download were all blocked while running and after cancel, and worked when results were current.
- **Layout**: no horizontal page scroll at either width. No page errors.

### Not executed
- **The native `window.confirm` dialog was not clicked by hand.** In the browser checks it was replaced through the `UX_IO.confirm` seam with a recorder that answered Cancel or OK. The wiring from the button to the dialog to the outcome was exercised; the browser's own dialog UI was not.
- **Real Claude API country research was not run** (no key in this session). Evidence import was tested with fixtures.

### Remaining limitations
- The header *Reset* button still clears without confirmation (unchanged; outside the demo-action scope).
- The "edited from the example" rule uses a line-overlap threshold (≥25% of substantive example lines). A heavily rewritten example may lose the marker sooner than a user expects.
- The provenance banner refreshes when a protocol edit is committed (on blur), not on every keystroke.
- Remaining ux1 limitations still apply (range run counts, summary hidden during worker jobs, prior-rate fallback without site history).

## v0.5.1+ux1 — UX Release 1

Guided setup, synthetic-demo mode and a Decision Summary. Verified 2026-10-13.

Presentation-layer release. No change to the Monte Carlo kernels, seeded RNG draw order, allocation constraints, country-effect coefficients, worker controller, eligibility logic or forecast-pool policy. It does not establish clinical eligibility, validated recruitment prediction, privacy compliance or production readiness.

### Identity

| Item | Value |
|---|---|
| Baseline | v0.5.1 working copy, SHA-256 `c9fd90bf95699bcecb199497853ebd6033c1c5962a8d287a7bb20f2fa6afec04` (kept as `feasibility-pipeline.v0.5.1-pre-r1-backup.html`) |
| Release | `feasibility-pipeline.html` v0.5.1+ux1, SHA-256 `a675139e819103fdd6108f5bc5f88d15f967077f0c77027f0204355ed6eb5767` |
| Engine | `src/mc-kernels.js` `cbf3cc09…bde199` and `src/mc-worker.js` `14556f95…e43c`, unchanged; `node tools/build.mjs --check` reports in sync |

### Changes

1. **Start here panel** (above the pipeline diagram). Three paths: *Protocol only*, *Protocol + country/site list*, *Protocol + EMR / site data*. Each path shows only its inputs.
2. **Study setup card**: indication (shared with the step 2 brief), target randomized, enrollment window, proposed countries (country paths only), and a data-availability checklist with ✓ / ! / i states and one-click actions (upload, open step, template).
3. **Run analysis** validates first. It needs a protocol or an indication; the country path needs at least one country; the EMR path needs an extract. It then runs the existing pipeline, the existing sensitivity job for the three ranges, and opens the Decision Summary. The panel collapses to a one-line study bar with *Edit setup* / *View decision summary*.
4. **Synthetic-demo mode**: *Try the synthetic demo* starts from a clean state. A banner names every synthetic or example input in use (synthetic patients or history, example protocols, example footprint), however it was loaded. *Exit demo and start a real analysis* clears the analysis and reopens the path chooser. The JSON report gains `syntheticOrExampleInputs`; the bid summary gets a demo line.
5. **Decision Summary** at the top of step 6: a verdict (*On track under these assumptions* / *At risk* / *Unlikely…*, or *Mixed* when the country and EMR views disagree), a headline table, and an explanation when the conservative pool is zero.
6. **Forecast ranges side by side**. EMR: conservative (lower pool, default) / central assumed scenario / upper, with eligible records, share of runs reaching target, median and P10–P90 randomized by the deadline, and median months. Country footprint: rates −25% / as modelled / +25% (existing sensitivity variants), shown for the sponsor plan and the recommendation. Each column states in plain language what it means, followed by "What separates them".
7. **What to do next**: the top three risks, each with a recommended action and a *Go to step N* button. One shortfall flag is kept; repeated INFO items of the same kind are folded into "(+N similar)".
8. **Copy executive summary**: plain text covering the headline, ranges, risks with actions, data sources and limits. It goes through the same export gate as downloads. If the clipboard is blocked, the text is shown in a box to copy by hand.
9. Step 1 (EMR) collapses behind *Add patient data anyway* on the two paths without patient data.

### Intentional behavioural changes

- **Setup-card target/window override the protocol's values.** When typed in the setup card, they are re-applied after parsing (`autoFillBrief` wrapper), and the card notes the protocol's value. Values edited in step 4 replace the setup value. Without setup input, behaviour is unchanged.
- **Ingestion wording** (`STEPS[0].ai`) no longer says "PHI is stripped (Safe Harbor identifiers…)". It now says the data is pseudonymized, timing is kept at month level, and this is not Safe Harbor de-identification or anonymization. Required by the release safeguards; it also turns one pre-staged v0.5.2 test green.
- **Run analysis never falls back to the GastroNova example.** The header's *Run full pipeline* keeps its fallback, which now triggers the demo banner.
- CSS only: long `<select>` options in step 6 no longer cause horizontal page scroll; on phones, checklist actions sit below their text.

### Verification (final file)

| Suite | Result |
|---|---|
| Parser self-test | **68 / 68** |
| Engine tests | **99 / 103**. The 4 failures are pre-existing `v0.5.2 · Evidence` tests for unimplemented features (undated imports, study-context provenance, retrieval-date validation, confidence capping). Baseline before this release: 98 / 103. |
| Worker lifecycle (real Web Worker, Step 3 button) | **10 / 10** |
| Node `node --test tests/kernels.test.mjs` | **10 / 10** |
| `node tools/build.mjs --check` | in sync; no `new Function` / `eval` anywhere in the file |

Browser checks: Chromium-based in-app browser at `http://localhost:8765`, desktop and 375 px.

- All six screens render, both empty and after the demo.
- The demo, country and EMR paths were each run end to end; the country and EMR paths used live ClinicalTrials.gov data.
- Numeric changes (`consent`, `sims`, `fpp.sigma`) and checkbox changes (`absentIfNotRecorded`, `onlyResearched`) each start a new accepted run (run ID advances).
- While a run is in progress, or after it is cancelled, the Decision Summary is withheld, and copy and downloads are blocked.
- 21 tooltips. Hover, keyboard focus, Escape, tap-to-pin, second tap and outside tap all work.
- The JSON report and bid summary still export.
- `pagehide` during a run terminates the worker and revokes its Blob URL.
- Keyboard Tab moves through the setup fields without losing focus.
- No page JavaScript errors.

### Remaining limitations

- The footprint ranges are rate scenarios, not eligibility pools. "Central assumed scenario" stays reserved for the EMR pool.
- Range figures use the sensitivity run count (500–1,000 runs) with matched streams, so the *as modelled* column can differ slightly from the headline run.
- While any worker job runs (including the ranges calculation), step 6 shows "Current simulation results are not available" until it completes.
- In the EMR path without site history, every site uses the same prior rate, so forecasts can be far below those from the demo's synthetic history.
- *Exit demo* clears the whole analysis, including any real data loaded next to demo inputs.
- The demo is detected by exact match with the example protocol and footprint text; edited examples are no longer flagged.
- On phones, the headline table scrolls inside its box.

## v0.5.1 — Changelog and verification

Correction patch implementing the *v0.5.0 Recommended Changes* brief (C1–C7). Verified 2026-10-13.

This patch improves correctness and lifecycle integrity. It does **not** establish clinical eligibility, validated recruitment prediction, comprehensive market intelligence, privacy compliance or production readiness.

### Identity

| Item | Value |
|---|---|
| Baseline | v0.5.0, SHA-256 `f2008613b77e82b0337f23fbd50daa3aa5cda5223d2bddc8e357aeea82ee0f0d` (kept as `feasibility-pipeline.v0.5.0-backup.html`) |
| Release | `feasibility-pipeline.html` v0.5.1, 537,248 bytes, SHA-256 `777e230612b9e36ffd58c9d59faf4eb4c57306d343bfce7d69f0be3fe3a6d6ff` |
| Numerical engine | `src/mc-kernels.js` (`mc-kernels/1`), SHA-256 `cbf3cc09d01adaab2b54c820e746edd7cb53d44ae1ed9b0a698bddfeb6bde199` |
| Worker adapter | `src/mc-worker.js` (`mc-worker/2`), SHA-256 `14556f957f975f765bd3db8a24f4bce24b3bdd4df34f2d6b6f85bd8cbca0e43c` |
| Test environment | Windows 11; Chromium-based in-app browser (Claude desktop) at `http://localhost:8765` (python http.server); Node v24.19.0 |

The run manifest in every JSON report now records the application version, the engine version, both engine hashes, and whether the page re-hashed and verified the engine it actually runs (`simulationEngine.integrityVerified`).

### Changes

#### C1 (P0): Conditional eligibility handling (`evalNode`, `evalTop`)
- A criterion with a conditional sub-population clause is unresolved at every nesting depth, whether the base comparison passes or fails. The engine cannot establish the sub-population and its threshold, and the branch may be stricter or more lenient. The reason names the clause.
- Conditional handling is now separate from exception handling. Nested exceptions stay unresolved, as before.
- Top-level exceptions are simplified only where the relaxation semantics are safe: an exclusion's exception can only carve cases out, so a patient without the excluded concept stays not excluded. Inclusion exceptions may widen or narrow the requirement, so they are always unresolved.
- Exclusions are still inverted exactly once, in `evalTop`. An unknown raw predicate stays unknown after inversion.
- Conditional or exception uncertainty is never a screening-confirmation residual, so it never enters the central pool.

#### C2 (P0): Temporal validation (`evalConcept` plus new helpers next to `monthsAgoOf`)
- New reusable predicates: `dateState` returns past, future, absent or invalid; also `startState`, `endState`, `periodInconsistent` and `badDate`.
- Ingestion flags unparseable dates (`dateInvalid`, `endInvalid`). It also counts anomalies in `ingest.dateQuality`: future diagnoses, future medication starts, future labs, invalid dates, and medication periods that end before they start. These counts appear in the Stage 1 log and the JSON report.
- Past-event windows require `0 ≤ monthsAgo ≤ window`. Future-dated or invalid records never count as history; they leave the criterion unresolved with a date-quality reason.
- A future medication start establishes neither current, prior nor in-window exposure. A future *end* date on an active course with a valid past start counts as ongoing.
- One valid past record can decide a criterion even when another record has a bad date. The anomaly is still reported.
- "For at least …" medication criteria now need a dated exposure span, and continuous exposure remains a screening confirmation (see changed behaviours).
- The cohort assumptions state the fixed analysis reference date and that it is not a screening or randomization date.

#### C3 (P1): Signatures include the active rules (`simulationSignature`)
- Added the full serialized criteria to the existing signature, together with the protocol baseline and the reference date. "Full" means every semantic field, rule text, and review metadata such as `disabledReason`. All existing fields and the exact-string comparison are kept.

#### C4 (P1): Worker callbacks scoped to their instance (`ensureSimulationWorker`)
- `onmessage`, `onerror` and `onmessageerror` return immediately unless `MC.worker` is still the instance that created them. Promise rejection, timeouts, supersession and recreation are unchanged, and there is still one controller.

#### C5 (P1): Teardown (`pagehide`, new `pageshow`)
- `pagehide` cancels any job and then always disposes the worker and its Blob URL, including after a completed run.
- On a back/forward-cache restore, a still-current result stays valid. An interrupted job is recalculated, which creates a new worker.

#### C6 (P1): Central assumed eligibility pool (`computeCohort`, Stage 4 UI, reports)
- **Policy:** the **lower** pool is now the default. The central pool is shown as **"Central assumed scenario — includes specified unverified requirements"** and is used only when selected explicitly.
- The internal enum `likely` is kept, so earlier configurations still load, with the new label and an assumption warning. Unknown values fall back to `lower`.
- Stage 4 shows lower, central-assumed and upper counts together. It lists which unverified requirements the central pool adds (criterion, requirement and record count) and states that the choice does not change machine-evaluated status. Selecting the central pool shows a warning and raises a risk flag.
- Records added by the central scenario keep the status `unresolved` everywhere. The patient-level CSV adds `unresolved_only_on_screening_confirmations`, `in_forecast_pool` and `forecast_pool_basis` columns.
- The JSON report records the basis label, the assumption, the policy, the reconciliation (`lower = meets; central = meets + designated confirmations; upper = meets + unresolved`) and the unverified requirements. The fan-chart heading, sensitivity table, surveys and bid summary also record the basis and assumption.
- No wording claims a "most likely" or expected eligible count.

#### C7 (P2): One static numerical engine
- The kernels now live in `src/mc-kernels.js`, a pure module (no DOM, no app state) that loads as a classic script or as CommonJS. The worker message adapter is in `src/mc-worker.js`.
- `node tools/build.mjs` embeds both in the single-file release: `<script id="mc-kernels">` runs on the main thread, and `<script type="text/plain" id="mc-worker-adapter">` only ever runs inside the Blob worker after the identical kernel text. `--check` fails if the release is out of sync with `src/`.
- `workerCore()` returns the static kernels, so there is no `new Function` or `eval` anywhere. The main thread's RNG, allocation and simulation entry points delegate to the same kernels.
- The v0.5.0 main-thread engine is kept, with its own RNG copies, as a frozen **test-only reference** (`referenceSimulate`, `referenceSimulateFootprint`, `referenceOptimizeAlloc`). It is never used for results. The dead `sitesNeededLegacy` was removed.
- Seeded RNG draw order, quantile definitions and recruitment equations are unchanged; the kernel text was moved verbatim.

### Changed behaviours and expectations (please review)
No existing test expectation was changed or weakened: all 68 parser tests and all 70 v0.5.0 engine tests pass unmodified. The following behaviours did change on purpose:

1. **Inclusion criteria with an exception clause**: previously "meets" when the base rule passed; now unresolved (C1 #6).
2. **Exclusion residuals (my judgement call, beyond the letter of the brief).** For example, an exclusion with a washout qualifier where the drug is recorded was previously counted as a screening confirmation in the central pool. It is now an ordinary unresolved item, because for an exclusion the residual means the excluded concept *is* present. This makes the central pool more conservative; the change is one line in `evalTop` if you prefer the old behaviour.
3. **"For at least N" prior-medication criteria**: previously "meets" from a start date alone; now they need a dated exposure span, and continuity stays a screening confirmation (C2 #5, #8).
4. **Default forecast basis** changed from `likely` to `lower`. On the demo T2D data the lower pool is 0, so the default EMR forecast is zero. A note explains this and points to the explicit central-scenario choice.

Demo cohort counts are identical to v0.5.0 (T2D CSV 0 / 329 / 2,171 / 298; T2D FHIR 0 / 375 / 2,125 / 298; UC CSV and FHIR unchanged), because the demo data contain only valid past dates and no conditional clauses.

### Verification results

| Suite | Result | Notes |
|---|---|---|
| Parser (in-app) | **68 / 68** | unchanged |
| Engine and data integrity (in-app) | **98 / 98** | 70 existing + 28 new: C1 ×8, C2 ×10, C3 ×2, C6 ×4, C7 ×4 |
| Worker lifecycle (in-app, real Web Worker) | **10 / 10** | new: C3 live staleness, rapid edits, C4 replaced-worker events, real error, startup failure, cancellation, C5 teardown and restore, worker parity |
| Offline engine (`node --test tests/kernels.test.mjs`) | **10 / 10** | build sync, no runtime compilation, determinism, invariants, analytic expected values, allocation constraints, worker adapter via `worker_threads` |

**The new tests detect the v0.5.0 defects.** Run against v0.5.0, 14 of the 18 C1/C2 tests fail and 5 of the 7 C3–C5 lifecycle tests fail. The tests that pass on both versions are deliberate guards for behaviour the brief says to keep: valid past dates, OR/AND logic, real errors still rejecting, and cancel-then-retry.

**Numerical parity** (simulation summaries compared byte-for-byte excluding execution time; pool diagnostics checked separately):
- Kernel vs the frozen v0.5.0 reference: 15/15 site simulations (5 seeds × all sites, a selected portfolio, and a zero-eligible site) and 20/20 footprint and allocation cases (5 seeds × optimizer, sponsor, recommended and empty allocations).
- Pool diagnostics: respected in every case (`maxExcess ≤ 0`).
- Worker vs main-thread kernel: identical for all sites, a 3-site portfolio, and sponsor and recommended footprints. The Node adapter also matches for `run` and `sensitivity`.
- Independent expected values: footprint Poisson mean 179.6 vs analytic 180, and a saturated finite pool of 30.01 vs 30. As the brief notes, matching two executions of the same source is consistency evidence, not proof that the model is right.

**Browser checks (Chromium only).** These were run through the app's own event handlers:
- All six screens render without errors.
- Valid and invalid parameter edits are handled, including the activation min/max cross-check.
- The absence-assumption checkbox works.
- Disabling a criterion blocks export until a reason is given.
- Switching the pool basis invalidates the result and reruns.
- Sensitivity analysis works.
- The site-count search works for both a reachable target (9 sites, P = 0.95) and an unreachable one.
- Exports were checked: JSON report, patient-level CSV, bid summary, and survey text.
- CSV and FHIR import works, including future and invalid dates.
- Rule-set export and import round-trips exactly, and a bad rule set is rejected atomically.
- All 21 footprint help controls show ranges and respond to hover, focus, Enter, tap, click-outside and Escape.

Caveats on those checks:
- The pane was not the OS-focused window, so focus behaviour was confirmed by dispatching `focusin`.
- Exports were captured in-page instead of saved to disk.
- The footprint screens used a synthetic registry fixture instead of live ClinicalTrials.gov data.

### Hosting policy (C7)
v0.5.1 no longer needs `'unsafe-eval'`. Verified on localhost under this enforced policy, where all suites pass: parser 68/68, engine 98/98, lifecycle 10/10.

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self' data: blob:;
connect-src 'self' https://clinicaltrials.gov https://api.anthropic.com; worker-src blob:; base-uri 'none'; form-action 'none'
```

Under the same policy, v0.5.0 fails 5 engine tests with `EvalError` from its `new Function` engine. `script-src 'unsafe-inline'` is still needed because the app is a single file with inline scripts. **This policy must still be verified on the actual deployment.**

### Build and test
```
node tools/build.mjs            # after editing src/mc-kernels.js or src/mc-worker.js
node tools/build.mjs --check    # release gate: fails if the HTML is out of sync with src/
node --test tests/kernels.test.mjs
```
In the app, Step 3 (protocol) has three buttons: **Run self-test**, **Run engine tests** and **Run lifecycle tests**. The lifecycle suite replaces the current worker and recalculates your analysis afterwards.

### Known limitations and observations
- **Model property (not changed; needs a reviewed model change):** site rates scale with each site's eligibility *relative to the median site*. A scenario with larger but differently shaped pools can therefore recruit more slowly when recruitment is rate-limited. In one fixture the upper scenario (pool 288) had a lower median at deadline (51) than the lower scenario (pool 84, median 54). Ordering of lower ≤ central ≤ upper outcomes is guaranteed only when pools bind.
- Pre-existing: for the "other malignancy" branch where the study indication is as broad as the exclusion, the temporal window is not applied. v0.5.1 only stops future-dated records from counting there. This needs clinical review.
- In CSV problem lists, bracketed text that is not shaped like a date (e.g. `[unknown]`) stays part of the term, and the diagnosis counts as undated. Date-shaped impossible values such as `[2024-13-45]` are flagged as invalid.
- A future-dated *most recent* lab result leaves the lab criterion unresolved even when an older valid result exists. This is conservative and unchanged.
- Event ages are fixed at import relative to the analysis reference date, so re-importing later shifts the windows.
- No git repository: C7 is cleanly separable (`src/`, `tools/`, `tests/`, the two engine blocks, `workerCore`, and the reference functions), but it was not committed separately.

### Remaining production-readiness requirements
1. Retrospective and predictive validation against historical recruitment outcomes (review item 18), plus calibration of the eligibility scenarios and the rate model.
2. Clinical review of the C1/C2 semantics: exception handling, window edges, and treating continuous exposure as a confirmation.
3. Security for any shared deployment: the API key is held in the browser.
4. Privacy review and a formal de-identification assessment.
5. Cross-browser testing (Firefox, Safari, Edge) and live API testing (ClinicalTrials.gov v2, Anthropic Messages API).
6. Reviewed governance for country-research evidence.
7. Verification of the hosting policy on the actual deployment.

