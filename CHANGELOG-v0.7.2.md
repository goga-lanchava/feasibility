# Feasibility Pipeline v0.7.2: responsiveness fixes

Built on v0.7.1 ([CHANGELOG-v0.7.1.md](CHANGELOG-v0.7.1.md)). No change to calculations, results, the worker, persistence or any existing test definition. Verified 2026-10-14.

## Fixed
- **Every committed edit froze the page with a large registry snapshot.** `refreshComparablePerformance` runs on every recalculation and re-derived the condition concept and its descendants for each site-trial row. The filter context is now built once per refresh (`comparableContext`); the decision logic is unchanged and checked against the frozen v0.7.0 implementation (`comparableDecisionReference`).
- **Step 5 rendered every site card's full contents while collapsed.** Collapsed cards now render only their summary; the contents are built when a card is opened, with keyboard focus kept on the summary.

## Measured (large synthetic snapshot: 520 trials, 5,565 facilities, 40 countries)

| | v0.7.1 | v0.7.2 |
|---|---|---|
| Comparable-trial refresh per recalculation | 148 ms | 9 ms |
| Page blocked after editing a country rate | 210 ms | 40 ms |
| Step 5 render + layout | 87 ms (2,991 nodes) | 35 ms (1,776 nodes) |
| Step 2 render + layout | 59 ms | 18 ms |

## Verification
Parser 68/68 · engine 103/103 · UX 20/20 · Release 2 20/20 · project 21/21 · Release 3 33/33 · lifecycle 10/10 · **view, quick start and performance 10/10** (2 new: identical decisions to the reference across 14 filter combinations; lazy card contents and focus) · Node kernels 10/10 · `build.mjs --check` in sync.

The new view test that checks decision controls now opens the cards first, because their controls exist only inside an opened card.
