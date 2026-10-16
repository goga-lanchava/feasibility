# v0.9.12: professional forecast charts

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
