# v0.9.7 — three gaps left open by the v0.9.6 review fixes

Builds on v0.9.6. Closes the three items listed under "Not changed (noted for later)" in `CHANGELOG-v0.9.6.md`. Each fix is
one commit, and the full test suite was run after every fix. No engine change: `src/mc-kernels.js` is untouched.

## Eligibility parsing
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

## Benchmark data
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

## Not changed (noted for later)
- Reversed outside limits on age or lines of therapy ("Age < 18 or > 75") still become a reversed range. Validation
  rejects it ("reversed range (75 > 18)"), but the parser gives it 95% confidence. Only the lab path splits outside limits.
  This is unchanged from v0.9.6.
- The disagreement threshold (25%, and at least 0.01 patients/site/month) is fixed. It is not a setting.
- The AI schema has one nullable field left under Anthropic's limit of 16. A further nullable field needs a schema
  redesign (for example, making some fields optional instead of nullable). The new test fails if the limit is passed.

## Tests
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
