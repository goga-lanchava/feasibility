# v0.8.1 — optional Gemini protocol parsing

Scope: protocol parsing only. Eligibility evaluator, Monte Carlo kernels (`src/`), allocation, worker controller and Claude country research are unchanged. Pre-change copy: `feasibility-pipeline.v0.8.0-backup.html`.

## What was added (HTML section "20. Optional Gemini protocol parsing")
- **Provider selector** (step 3): Rule-based only / Claude / Gemini. Default is Claude (existing behaviour). Changing it sends nothing; a failed request never falls back to another provider. Country research stays Claude-only.
- **Gemini key** field: held in memory only (`AI.gemini.key`). Not in sessionStorage/localStorage, `S`, project files, reports or the HTML.
- **Configurable model ID** with a datalist of models Google documents as free-tier (checked 2026-10-14 against ai.google.dev pricing and models pages). Listed paid-only and unlisted IDs need an explicit "may be billed" tick. No model is assumed free; the tool cannot enable billing.
- **Request**: `POST v1beta/models/{model}:generateContent`, key in `x-goog-api-key` header (never URL), `responseMimeType: application/json`; the existing `LLM_SCHEMA` is given in the prompt (not as Gemini's schema subset) and enforced locally.
- **Conversion**: strict JSON → `validateLlmItem` (existing) → `llmCriteriaToInternal` → `validateCriterion` (existing) → normal editable rule table (chip/reasons say "Gemini"). Invalid answers are rejected whole, before any vocabulary is registered.
- **Errors**: invalid key / permission, unknown or unsupported model, quota (429), FAILED_PRECONDITION, other 400, 5xx, network, timeout, truncation, safety block, empty/malformed/invalid output, cancellation (button), stale answers (protocol/study changed, or request replaced).
- **Privacy**: only protocol text is sent; a confirmation names Google, says patient records are never sent, and notes free-tier data use. Re-asked per protocol/model.
- The one-click run does not call Gemini (uses the rule-based parser and says so).

## Tests
- Mocked (no network): 30 checks, `runGeminiTests` / "Run mocked Gemini tests" (Expert view).
- Real API: separate opt-in "Run live Gemini check" (Expert view; uses your key and quota; synthetic protocol; applies nothing). Not run in development: no key available.
- Existing suites unchanged: parser 68, engine 103, lifecycle 10, project 21, R2 20, UX 20, R3 33, UI 10, flex 17, `node --test tests/kernels.test.mjs` 10; `node tools/build.mjs --check` in sync.

## Not verified
Real Gemini behaviour (response fields, error bodies, `maxOutputTokens` limits per model) is taken from Google docs and mocked; run the live check with your key.
