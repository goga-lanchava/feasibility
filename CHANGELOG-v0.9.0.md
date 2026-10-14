# v0.9.0 — task-based workspace (presentation only)

Simulation kernels, equations, eligibility semantics, data processing, API requests and project format are unchanged. Pre-change copy: `feasibility-pipeline.v0.8.1-backup.html`.

## What changed
- **Four tabs** replace the diagram and Prev/Next as the default navigation: Study (steps 1, 3), Evidence (step 2), Plan (steps 4, 5), Report (step 6). They render the existing panels; `S.step` is still the only navigation state, so every "go to step" control still works. Switching tabs only renders (tested: no request, no job, same simulation signature).
- **Study**: study details card (indication, target, window, proposed countries), protocol textarea and .txt upload, extracted criteria, collapsed patient-data and history imports, and a "Review before analysis" checklist. Nothing is approved automatically.
- **One primary action**: Review study → Run analysis → Review report, or Update analysis when results aren't current. While running it shows the phase and progress, plus Cancel forecast (or Cancel Gemini request).
- **Run analysis** runs only your own inputs (forces live web mode, refuses without a protocol or indication). Report opens only after a successful, current run; otherwise the app stays on the tab that shows the error.
- **Report** adds "Read the forecast with": uncertainty, assumptions, missing evidence and demo provenance, placed after the decision summary.
- **Header**: Project menu (Save, Load, Reset). Settings panel holds the AI provider, Gemini and Claude fields (same ids and handlers, moved out of steps 2 and 3), run mode, Expert view and the old "Run full pipeline".
- **Indication and proposed countries** are edited only in Study; Evidence shows a summary with an "Edit in Study" button.
- **Technical workflow** (collapsed): the original diagram, step controls and Manual vs AI descriptions.
- The privacy notice is now one short line with expandable details (Gemini mentioned).

## Tests
- Updated (layout moved): `uiRenderSteps` now also renders the Study details card; one Gemini check looks for the key fields in `ws3() + settingsAiHtml()`.
- New: 5 "Tasks" checks in the view suite (unique ids per tab, tab switching is inert, primary-action states including cancel, failed vs successful run, no example substitution).
- Results (browser, localhost): parser 68/68, engine 103/103, lifecycle 10/10, UX 20/20, R2 20/20, project 21/21, R3 33/33, view 15/15, flex 17/17, Gemini 30/30; `node --test tests/kernels.test.mjs` 10/10; `node tools/build.mjs --check` in sync.
