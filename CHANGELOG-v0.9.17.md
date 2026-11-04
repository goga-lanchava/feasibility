# v0.9.17: registry import, trials already under way, and warnings before the verdict

No forecast changed: the engine (`src/`) is untouched. All new code is in sections 22 and 23 of the HTML, at the end of the main script.

## Import a study from ClinicalTrials.gov
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

## Forecast the remaining recruitment of a trial already under way
When an imported trial is recruiting (or the mode is on), Study shows "Randomized so far" and "Months of recruitment left". The months left are prefilled from the primary completion date.

Applying sets:
- the target to the original target minus those already randomized;
- the window to the months left;
- default start-up, activation stagger and every sponsor country's start-up to 0, because the sites are already open.

The original inputs are kept. "Back to the full study" restores them exactly. Importing another study ends the mode first. The comparator rate still comes from completed trials, not from the trial's own pace so far, and the verdict says so.

## Warnings before the verdict
The decision summary and its exports carry "Check the inputs before using this verdict" when:
- no site plan was entered, so the forecast used the default site budget in a footprint the tool chose;
- the median forecast is 5× the target or more, which usually means the footprint is larger than the real study's;
- an imported trial is already recruiting, so a new-start forecast ignores participants already enrolled (replaced by the remaining-recruitment basis once that is applied).

A separate note says when parsed eligibility criteria cannot change the forecast because no patient data is loaded.

## Studies that are not phase 2–4 drug trials
Found by importing NCT07890532, a single-site, 2-month health-services study that was already recruiting. It got "0 of 52, 0% chance" from drug-trial comparators and a 9-month start-up assumption.

- **Phase "not applicable"** is a comparator phase (Study › Search filters, "N/A"). The import sets it from the record, so device, behavioural and health-services studies are compared with studies of the same kind, not with drug trials.
- **Primary purpose**: a record with a non-treatment purpose (health services research, supportive care, diagnostic, screening, basic science, device feasibility, educational or counselling, other) limits the comparator search to studies with that purpose. Treatment and prevention studies keep the unfiltered search the back-tests used. It can also be set by hand under Search filters.
- Neither setting changes the registry fingerprint of a brief that does not use it, so saved searches stay current.
- **Recruiting imports forecast from now.** When the imported trial is recruiting (or enrolling by invitation), the import switches to remaining recruitment: sites open (start-up and stagger 0), and the window is the months left to primary completion. The number already randomized is not in the registry, so the full target is forecast and there is no verdict until it is entered.

## No verdict when the inputs cannot support one
The forecast still runs, and its numbers and "what it would take" are shown "for reference only". The verdict and the enrollment risk flags are withheld, under "Why there is no verdict", when:
- the number already randomized is not entered for a remaining-recruitment forecast;
- the window ends before the first site can open (the model's start-up, or the EMR activation month);
- the study is outside what the model was back-tested on: a non-treatment purpose, no drug phase, or a one-site plan.

## Wording
- "1 site", "1 country", "1 month" (it read "1 sites", "1 months").
- A target not reached reads "reached after month 14" (it read "reached by after month 14").
- A recommended footprint with no sites (no country qualified) is no longer listed as a plan or a risk ("0 sites: no countries").
- Trial saturation is flagged only when it is at least 0.1 trials per site above the median, so it never reads "0.0 (median 0.0)".
- An age the eligibility text already states is not added a second time from the registry age fields.

## "What it would take": each option opens its plan
Each option that reaches the goal (more sites, another country, combined, more time, smaller target) is now clickable, as is the "Show the plan" link after its text. Clicking it opens a panel under the option with:
- **The plan** against the current plan: sites per country (new countries marked), all sites, window and target, with the change for each;
- **The result**: the chance of the target by the option's deadline, the expected number by then (or "Target reached") with the likely range, the month the median run reaches the target, and the first patient's month, each beside the current plan;
- **A chart** of the option's forecast beside the current plan.

The option is simulated on click with the same engine, random seed and number of runs that confirmed it, so the chance matches the option's text exactly. Nothing is applied to the inputs. Every option is clickable, including one that does not reach the goal ("no single added country gets there"): its panel shows the most the search tried (all usable sites in the plan's countries, the country with all its usable sites, the longest window, a target of 1) and says that it falls short. The open panel is view state: not saved, and closed when the inputs change.

When there is no verdict (see below), "What it would take" is still worked out and shown, with a note that it is for reference only. An earlier build hid it in that case and left only "Not worked out", which made the options disappear for recruiting, one-site and non-drug studies.

The forecast chart now draws a series simulated over a shorter horizon up to its own last month (the current plan beside an option with a longer window), and can cap its axis (the panel shows up to 2.5× the target) with the marks clipped, so a very wide upper range no longer flattens the rest. The Report chart is unchanged.

## Eligibility parser: exceptions, permitted therapy and the study's own diagnosis
Ported from a parser rework found in folder 17, with two of its rules tightened after a check on the 252 back-test protocols.

- **The study's own diagnosis is never excluded by mistake.** An exclusion that matches the main inclusion diagnosis only because a subtype or procedural qualifier was not understood or is planned ("Ulcerative colitis limited to the rectum", "Atypical manifestations of reflux disease", exclusions of hepatocellular carcinoma in a liver-cancer study) goes to the site to confirm instead of excluding every patient.
- **Permitted therapy in brackets is the exclusion's exception:** "Systemic corticosteroids within 4 weeks (stable 5-ASA is permitted)".
- **Surgery and procedures name what they were for:** "Prior colectomy for Crohn's disease" is a surgery, not the disease.
- **More "planned" wording:** "likely to require surgery", "planning to", "requiring urgent surgery".
- **A second sentence that says who is still eligible is the exclusion's exception:** "Known CNS metastases. Patients with treated and stable brain metastases are eligible". Tightened: the folder-17 rule took almost any following sentence, so "Participants with uncontrolled diabetes will be excluded", "NOTE: testing is not required" or "This includes:" became exceptions (18 of its 71 new exceptions). Now the sentence must say someone is eligible, allowed, permitted, acceptable or can be enrolled: 41 new exceptions, none of that kind.
- **A drug that a sentence only permits is not an inclusion requirement:** "pretreatment with hydroxyurea is allowed", "corticosteroids … are allowed if stable". Tightened: the folder-17 rule checked the whole line, so "Received two prior lines of chemotherapy … Previous treatment with SoC regimens is permitted" lost its chemotherapy requirement. Now only the sentence containing the drug counts.

On the 252 protocols, 59 parse differently. Applicable rules go from 3,372 to 3,308; the rules removed are mostly exclusions of the study's own diagnosis, permitted drugs read as requirements, and concepts that belonged to an exception. Parser tests: 137 (11 new). A parser test can now check whether a rule carries an exception ("rule [except]" / "rule [no except]").

## Eligibility parser: vocabulary, lab units and wrong requirements (second folder-17 revision)
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

## Smaller changes
- One progress bar per run. While the analysis or a forecast runs, only the action bar above the tasks shows progress and Cancel, and it now updates live. The second "Forecast · running" bar (and a "Forecast · idle · Recalculate" line before the forecast started) inside the page are gone. That line still appears after a forecast is cancelled or fails.
- Scrolling over a focused number field leaves the field instead of changing its value. Before, it could change Plan › Sponsor sites, which rewrites Study › Proposed countries, while the page scrolled.
- Changing Plan › Sponsor sites now says in the status line what Study › Proposed countries reads.
- Temporal and procedural words (onset, hours, undergoing, pre-existing, irreversible…) no longer count as unparsed words in criteria.

## Project files
Two optional sections, additive to the project format: `importInfo` (NCT number, title, status, dates, site count, sponsor) and `ongoing` (randomized so far, or `null` with `pending: true` while not entered; months left; the original inputs). The brief can carry `purpose` and `phases.NA`. All are validated on load; a malformed value is refused. Older projects load unchanged.

## Not adopted
A cardiology vocabulary (STEMI/NSTEMI, primary PCI, Killip class, beta blockers, RAAS inhibitors and their classes, wider heart-failure synonyms) came with this work. It was left out to keep the tool indication-agnostic.

## Tests
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
