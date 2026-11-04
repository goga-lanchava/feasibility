# v0.9.11: a more organised interface (layout only)

No forecast, input or control changed. Every control is still present, and Plan sections that are not showing stay in the page.

## Repeated blocks removed (all tabs)
- **Study details only on the Study tab.** The full form (indication, target, window, sites, countries) was meant to show on Study only, but the card's CSS overrode the `hidden` attribute, so it repeated on every tab. Evidence, Plan and Report now show a one-line summary instead, for example "Study · type 2 diabetes mellitus · 300 randomized within 18 months · no proposed countries". It has an "Edit study details" button that returns to the Study tab.
- **Compact forecast status.** The "Background Monte Carlo" panel (title, progress bar, button and worker note) appeared at the top of every tab. A finished forecast now shows nothing there: the tab already says "forecast current". A small "Recalculate" button sits in the action bar instead. While a forecast runs, or after a cancel or error, one compact line shows the status, progress and Cancel or Recalculate. The worker note moved to that line's tooltip.
- **Slimmer demo banner.** It is one row, with the exit button beside the text. The wording is unchanged.

## Less noise
- **Logic column moved to Expert view.** The criteria table's parser-code column (`HAS_DX(t2dm) WITHIN WINDOW …`) is Expert-only now. Concept, thresholds, flags and the source text stay visible.
- **Long assumptions folded away.** The cohort's assumptions paragraph sits behind an "Assumptions behind these counts" expander.

## Plan tab in four sections
The Plan tab used to be one 6,000-px page. It now has a sub-menu that shows one section at a time, with a one-line status on each button:

| Section | What it holds | Example status |
|---|---|---|
| **Forecast** | Simulation parameters, forecast stats (projected pool, P(target), median and P90 months), enrollment chart, sensitivity ranges. In the country model, the country forecast. | "93% reach 300 by month 18" |
| **Patient pool** (EMR data only) | Pool counts, eligible-pool scenarios, unknown results by criterion, attrition, eligible patients by site, model definitions | "298 eligible records (central)" |
| **What-ifs** | The flexibility search | "find a feasible configuration" or "N options found" |
| **Sites** / **Countries & sites** | Scoring weights, portfolio forecast, ranked sites and site review, or the country review | "6 of 10 sites selected" |

"Show all" shows every section with headings. The chosen section is presentation only and is not saved with the project.

## Measured (synthetic demo, 1400-px window)

| Page | Before | After |
|---|---|---|
| Plan | 6,028 px | 1,550–2,250 px per section |
| Evidence | 2,476 px | 1,919 px |
| Study | 4,072 px | 3,323 px |

## Tests
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
