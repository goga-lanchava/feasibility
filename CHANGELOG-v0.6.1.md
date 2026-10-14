# Feasibility Pipeline v0.6.1: project save and load

Built on the accepted v0.6.0 baseline ([CHANGELOG-v0.6.0.md](CHANGELOG-v0.6.0.md)). The file format is documented in [PROJECT-SCHEMA.md](PROJECT-SCHEMA.md). Release 3 (site engagement) has not started. Verified 2026-10-13.

Unchanged and checked byte-identical against v0.6.0:
- Kernels and adapter
- `computeFootprint` and allocation
- The worker controller
- Eligibility evaluation (`evalNode` … and `computeCohort`)
- All existing test definitions (parser, engine, lifecycle, UX, Release 2)

Against v0.6.0, three existing lines changed: the version label, `APP_VERSION` and `renderAll`, which now also renders the project panel. Everything else is additive.

## Identity

| Item | Value |
|---|---|
| Baseline | v0.6.0 (kept as `feasibility-pipeline.v0.6.0-backup.html`) |
| Release | `feasibility-pipeline.html` v0.6.1, SHA-256 `4741b997767a809a549cfbf88ea24925c31dafb0436e00c550a7ca8982b1b149` |
| Engine | `mc-kernels/1` `cbf3cc09…bde199`, adapter `14556f95…e43c`, in sync; runtime `integrityVerified: true` |

## Added
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

## New functions
- Project file: `encProj`, `decProj`, `customVocabulary`, `coreTrial`, `projectState`, `buildProjectFile`, `projectFileName`.
- Loading: `validateProjectState`, `candidateFromProject`, `parseProjectText`, `loadProjectText`, `loadProjectFromUi`.
- UI: `projectPanel`, `renderProject`; actions `projSaveOpen`, `projSaveCancel`, `projDownload`, `projLoad`, `projDismiss`, `projectTests`.
- Tests: `runProjectTests`, `PROJECT_TESTS` and helpers.

## Intentional behaviour changes
- **Loading registers missing custom vocabulary in this browser.** Like adding a concept by hand, it is persisted to this browser's vocabulary storage. A conflicting local definition is kept and reported.
- **Registry-derived site history is rebuilt from the saved snapshot with the restored settings.** If enrollment-share settings changed after collection, the rebuilt history follows the current settings.

## Verification (final file)

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

## Not executed
- **The native dialog's OK path was not driven by hand in this pane,** which auto-answers Cancel. OK is covered by regression tests through the `UX_IO.confirm` seam; you verified the native OK path independently for v0.6.0's Reset.
- **The browser's own file-picker dialog was not opened.** Loading was exercised through the same file input with a programmatically attached file, and saving through the same `download` path with the download intercepted.

## Remaining limitations
- **Large files with patient records:** with records included, a 2,500-record extract produces a large file. There is no compression or encryption, and sensitive files must be protected by the user.
- **The checksum detects damage or editing, not tampering:** anyone can recompute it. It is not a signature.
- **No migration path yet:** files from another schema version are refused outright.
- **Base-vocabulary changes:** a project saved with a different application version whose base vocabulary differs will show the criteria as stale and ask for a re-parse.
- **Evidence cache:** projects do not write to this browser's evidence cache, so a later "Collect registry data" does not reuse the loaded evidence. The loaded records stay in the analysis.
- **Not saved:** drafts (unsaved decision reasons or review text) and the visible scroll position.
