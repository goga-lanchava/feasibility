# v0.9.10: threshold relaxation in the flexibility search, and a strictness test

## Flexibility search: "Numeric thresholds that may be relaxed" (EMR cohort model)
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

### Tests
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

## Protocol strictness as a forecast signal: tested, not adopted
**Question:** does protocol strictness predict how fast a trial recruits, using the 153 round-4 calibration and validation trials and the app's own parser?

**Answer:** no relationship that holds up. With the measure fixed in advance:
- the correlation with forecast error is +0.10 on calibration and 0.00 on validation;
- the AUC for predicting later failure is 0.55 and 0.62.

**So:** no rate factor was added, and no test set was spent. Details are in `stress-test/round4/STRICTNESS.md`. The registry forecast still does not change when the protocol is edited; with EMR data, criteria changes act on the eligible pool.
