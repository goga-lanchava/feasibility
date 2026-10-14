# Project file schema: `tfp-project/1`

Written by **Save project** and read by **Load project…** in Trial Feasibility Pipeline v0.6.1 and later. v0.7.0 added five optional sections (below) without changing the schema identifier: earlier files load unchanged, and v0.6.1 lists the new sections as ignored. One JSON file per analysis. It holds the analysis **inputs and review records**, never results, credentials or browser caches.

## Top level

| Field | Type | Meaning |
|---|---|---|
| `schema` | `"tfp-project/1"` | Required. Any other value is refused as unsupported; nothing is loaded. |
| `application` | `{ name, version, engine }` | Application and engine version that saved the file (informational). |
| `savedAt` | ISO date-time | When the file was saved. |
| `name` | string | Protocol title or indication. |
| `contents` | object | Plain-language statement: `patientRecords` (`"omitted"` or `"included (pseudonymized, not anonymized)"`), `credentials: "never saved"`, `results: "never saved; recalculated after loading"`, `rawExtractText: "never retained or saved"`. |
| `omitted` | array | What was left out and how to restore it, e.g. `{ section: "patient-level records", records, source, synthetic, reimport }`. |
| `vocabulary` | array | Custom concepts used by this browser at save time: `{ type: condition\|medication\|lab, key, label, synonyms[], unit }`. |
| `vocabularyFingerprint` | string | Vocabulary fingerprint at save time (informational). |
| `evidenceUsedAtSave` | `{ evidenceId: boolean }` | Whether each evidence record fed the model when saved. Used only to report records that are no longer used after re-checking age and policy at load. |
| `stateSha256` | hex string | SHA-256 of `JSON.stringify(state)`. A mismatch (damaged or edited file) refuses the whole file. |
| `state` | object | The saved sections (below), in tagged encoding. |

### Tagged encoding inside `state`
Plain JSON, plus three tags for values JSON cannot hold: `{ "$set": [...] }` (Set), `{ "$map": [[k, v], ...] }` (Map), `{ "$num": "Infinity" | "-Infinity" | "NaN" }`.

- Any other non-plain object makes saving fail.
- Keys named `__proto__`, `constructor` or `prototype` make loading fail.

## `state` sections

| Section | Content |
|---|---|
| `protocolText`, `meta`, `parseInfo`, `parseFp` | Protocol text, parsed title/target, parser info and the parse fingerprints used for staleness checks. |
| `criteria`, `baseline` | Current rules (with enable/disable reasons, essential flags, edits) and the protocol baseline; validated with the rule-set validator. |
| `params`, `fpp`, `fpOv`, `weights`, `assume`, `unitMap`, `performanceFilters`, `includeEstimatedRates`, `cacheDays`, `acceptUnverifiedEvidence` | Assumptions and parameter values, validated against the application's input schemas. From v0.8.0 `fpp.sponsorOnly` (0/1) restricts the recommendation to the sponsor's countries; files without it load as 0. |
| `brief`, `setup`, `mode`, `step` | Study brief (condition, comparator, phases, sponsor footprint…), guided-setup choices and the visible step. |
| `analysisId`, `referenceAt` | Analysis identity and the fixed reference date used for date windows (restored so date-dependent results are reproducible). |
| `provenance` | Load-time markers for synthetic and example inputs (`patients`, `history`, `protocol`, `footprint`). |
| `selected`, `selectionManual`, `topN` | Site selection. |
| `web` | ClinicalTrials.gov snapshot: `cond`, `fetchedAt`, `query`, `queryFp`, `truncated`, and `comp` / `hist` trials with source fields only (`nct, title, status, start, pcd, phases, enroll, enrollType, sponsor, sponsorClass, conditions, interventions, locs`). Country and site aggregates and per-site rates are recomputed. |
| `historyFromRegistry` | `true` when site history was derived from the registry snapshot. It is then rebuilt on load, the same way registry collection builds it, and not stored. |
| `internalHistory`, `registryHistory`, `history` | Uploaded site-performance history. The registry-derived parts are stored only when there is no registry snapshot to rebuild them from. |
| `intel` | Country evidence records exactly as held by the analysis (retrieval date, model, study context, confidence and its reported value and note, sources). |
| `evidenceReview`, `evidenceReviewLog` | Per-record accept/reject decisions keyed by `evidenceId`, with reason, timestamp and optional reviewer label, plus the full log. |
| `countryReview`, `countryReviewLog` | Country decisions (Recommended / Conditional / Watchlist / Excluded) with reason and timestamp, plus the full log. |
| `userFp` | User-selected footprint: `basis`, `alloc` (country → whole number of sites), `createdAt`, `applied`. **No result.** |
| `responses`, `responseProtocol`, `marketRecords`, `marketProtocol` | Imported investigator responses and market/pipeline records. From v0.7.0 each response also keeps `raw` (the original cell text of every known column), `responseId` (`rs-` + 8 hex, derived from site ID and `raw`) and `importedAt`. Responses saved by v0.6.1 have none of these and still load. |
| `siteReview`, `siteReviewLog` | *Optional, v0.7.0.* Site decisions keyed by site ID (`Invite to survey`, `Request more information`, `Prioritize`, `Hold`, `Exclude`) with reason, timestamp, change count and the site name and country at the time, plus the full log. Never changes rankings, selection or allocations. |
| `responseReview`, `responseReviewLog` | *Optional, v0.7.0.* Response reviews keyed by `responseId` (`accepted`, `needs follow-up`, `rejected`) with reason, timestamp, optional reviewer label and the flags present at review time, plus the log. Labels are always loaded as **not authenticated**; reviews whose response is not in the file go to the log only. |
| `flex` | *Optional, v0.8.0.* Flexibility-search settings: `goal` (0.5–0.95), `window`, `budget`, `startup`, `target` (each `{ on, max }`), `outside` and `criteria` (`{ on, ids }`), plus `applied`, the log of options applied with their reason. Search results are never saved. |
| `siteApplied` | *Optional, v0.7.0.* Log of reviewed investigator values explicitly applied to country overrides: country, field (`rate` or `startup`), value, previous value, source response IDs, reason, timestamp and any revert. The applied value itself lives in `fpOv`. Values are validated against the override limits. |
| `claudeModel` | The Anthropic model ID setting (not a credential). |
| `patients`, `ingest` | **Only if the user ticked “Include pseudonymized patient-level records”.** Processed, pseudonymized records and their import report. |

## Never saved
- API keys, session keys, network-approval state or any other credential.
- Raw patient extract text (it is not retained after import).
- Results: forecasts, sensitivity analyses, site-count searches, risk flags, surveys and user-footprint results.
- Browser storage: the evidence cache, session storage and drafts.

Unknown sections in a file, including any result section someone inserts, are ignored and listed in the load summary.

## Patient records
- **Default: omitted.** The load summary states how many records (and whether synthetic) were left out, and that the extract must be re-imported in step 1 to restore the cohort and its forecast.
- **When included:** the records are **pseudonymized, not anonymized**. They keep ages, sites, diagnoses, medications, lab values and month-level clinical timing. The file must be treated as sensitive and shared only under the user's data-sharing rules. The file name ends in `_WITH_PATIENT_RECORDS`.

## Loading rules

1. Size limit 60 MB, then JSON parse, then `schema`, then `stateSha256`, then decoding (forbidden keys refused), then section validation. Any failure refuses the whole file and leaves the current analysis unchanged.
2. A candidate state is built and the derived computations are dry-run on it: registry aggregation, history rebuild, cohort, site scoring and footprint. A failure refuses the file.
3. If the current analysis holds user work, the user must confirm replacement. **Cancel leaves it unchanged.**
4. On replacement:
   - The running simulation is cancelled, and in-flight registry, research and parsing requests are invalidated.
   - Results are cleared, and the session's API key is kept from the current session, not the file.
   - Missing custom vocabulary is registered; a conflicting local definition is kept and reported.
5. Evidence age and policy are re-evaluated against **today**. Records used at save but no longer used are reported.
6. Evidence reviews:
   - Reviews whose record is not in the file are not attached to any other record; they are kept in the log only.
   - Reviewer labels are always loaded as **not authenticated** and sources as **not verified**, whatever the file says.
7. The forecast is recalculated from the restored inputs when nothing is stale. Otherwise the summary says what needs attention, for example a re-parse after a vocabulary change. The user footprint is restored without a result and must be recalculated.

Re-saving a loaded project gives the same `state` and the same checksum.
