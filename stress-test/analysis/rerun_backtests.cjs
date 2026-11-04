#!/usr/bin/env node
/* Re-runs the stress-test back-tests in the application itself (headless Chromium), the same way for every trial:
 * registry as of the trial's start date, completed-trial history from 12 years before, target = actual randomised,
 * window = actual recruitment months + 6 (default start-up), the trial's real footprint (registry location list) or,
 * without one, the recommended footprint at the published site count. The forecast is read like the decision summary:
 * the lead plan's runs reaching the target, months from the first patient to the target (fpiDuration) and the
 * p10/p50/p90 participants randomised by the deadline (p10…) and by the first patient + the actual months (r10…).
 *
 * The registry is queried once per trial; every configuration is then evaluated on that same snapshot, so engine
 * settings are compared on identical data. Results are appended as JSON lines (one per trial), so a run can resume.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1     # from the repository root
 *   node stress-test/analysis/rerun_backtests.cjs out.jsonl [--only NCT…,NCT…] [--holdout] [--grid]
 *
 * Configurations: "v093" = patients-per-site matching off (the v0.9.3 engine), "v094" = application defaults.
 * --grid adds, for v094, the p10/p90 at the deadline for fixed trial-level σ values (to calibrate the σ rule).
 * Needs Playwright (npm i playwright, or set PLAYWRIGHT_PATH to its folder). */
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8765/feasibility-pipeline.html';
const ST = path.resolve(__dirname, '..');
const out = process.argv[2]; if (!out) { console.error('usage: rerun_backtests.cjs out.jsonl [--only ids] [--holdout] [--grid]'); process.exit(2); }
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const only = arg('--only') ? new Set(arg('--only').split(',')) : null, grid = process.argv.includes('--grid');
// Start dates for round 1 (its inputs file has only the year): ClinicalTrials.gov start dates
const ROUND1_START = { NCT01131676: '2010-07-01', NCT01179048: '2010-08-31', NCT01720446: '2013-02-21', NCT03036124: '2017-02-08', NCT02578680: '2016-01-15' };
const trials = [];
for (const [f, round] of [['inputs.json', 1], ['inputs-round2.json', 2], ['inputs-round3.json', 3]])
  for (const t of JSON.parse(fs.readFileSync(path.join(ST, f), 'utf8'))) {
    const start = (t.start || ROUND1_START[t.id] || '').slice(0, 10);
    trials.push({ id: t.id, name: t.name, round, cond: t.cond, n: t.n, months: t.months, asOf: start, since: +start.slice(0, 4) - 12,
      footprint: t.footprint || '', sites: t.sites });
  }
if (process.argv.includes('--holdout')) {
  const h = JSON.parse(fs.readFileSync(path.join(ST, 'holdout-keynote407.json'), 'utf8')).inputs[0];
  trials.push({ id: h.id, name: h.name, round: 'holdout', cond: h.cond, n: h.n, months: h.months, asOf: h.asOf, since: h.since, footprint: h.footprint || '', sites: h.sites });
}
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const CONFIGS = [['v093', { ppsMatch: 0 }], ['v094', {}]];
const GRID = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1];

(async () => {
  const b = await chromium.launch();
  for (const t of trials) {
    if ((only && !only.has(t.id)) || done.has(t.id)) continue;
    const t0 = Date.now(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    let rec;
    for (let attempt = 1; attempt <= 2 && !rec; attempt++) {
      try {
        await p.goto(URL); await p.waitForTimeout(400);
        rec = await p.evaluate(async ({ t, CONFIGS, GRID, grid }) => {
          renderAll = () => {};  // headless: skip rendering between steps
          Object.assign(S.brief, { condition: t.cond, since: t.since, asOf: t.asOf, sponsorFootprint: t.footprint });
          S.params.target = t.n; S.params.deadline = t.months + 6;
          if (!t.footprint) { S.brief.plannedSites = t.sites; S.fpp.budgetMode = 'custom'; S.fpp.budget = t.sites; }  // as the Study field sets them
          await collectRegistry();
          const base = { ...S.fpp }, res = {};
          // As in the stress-test report: also read at the first simulated patient + the actual recruitment months
          const readAt = (sim, f) => { const m = Math.min(sim.p10.length - 1, (f ? f.first : 7) + t.months); return { readMonth: m, r10: sim.p10[m], r50: sim.p50[m], r90: sim.p90[m] }; };
          const read = () => {
            const sim = S.fp.simA || S.fp.simB, d = S.params.deadline, f = fpiDuration(sim);
            return { plan: S.fp.simA ? 'sponsor' : 'recommended', sites: S.fp.simA ? S.fp.totalA : S.fp.totalB, prob: sim.prob, medMonths: sim.medMonths,
              fpiMonths: f ? f.months : null, extrapolated: f ? f.approx : null, firstMonth: f ? f.first : null,
              p10: sim.p10[d], p50: sim.p50[d], p90: sim.p90[d], ...readAt(sim, f), sigmaTrial: S.fpp.sigmaTrialEff, sdLog: S.fp.sigmaSdLog ?? null, globalRate: S.fp.globalRate,
              match: S.fp.match || null, footprintRate: Object.entries(S.fp.allocB).reduce((a, [c, k]) => a + k * S.fp.rowsBy[c].rate, 0) / Math.max(1, S.fp.totalB) };
          };
          for (const [name, ov] of CONFIGS) {
            Object.assign(S.fpp, base, ov); computeFootprint(false); res[name] = read();
            if (grid && name === 'v094') {
              res.grid = {};
              for (const s of GRID) { S.fpp.sigmaTrial = s; computeFootprint(false); const sim = S.fp.simA || S.fp.simB, d = S.params.deadline; const r = readAt(sim, fpiDuration(sim)); res.grid[s] = [r.r10, r.r50, r.r90, fpiDuration(sim)?.months ?? null]; }
            }
          }
          Object.assign(S.fpp, base);
          return { usable: S.web.global.dq.usedForRates, completed: S.web.hist.length, competing: S.web.comp.length, configs: res };
        }, { t, CONFIGS, GRID, grid });
      } catch (e) { console.error(`${t.id} attempt ${attempt} failed: ${e.message.slice(0, 200)}`); }
    }
    await p.close();
    if (!rec) { console.error(`${t.id} skipped`); continue; }
    const row = { id: t.id, name: t.name, round: t.round, cond: t.cond, actualN: t.n, actualMonths: t.months, asOf: t.asOf, ...rec, errors: errs, seconds: (Date.now() - t0) / 1000 };
    fs.appendFileSync(out, JSON.stringify(row) + '\n');
    const c = rec.configs;
    console.log(`${t.id} ${String(t.name).slice(0, 18).padEnd(18)} usable ${String(rec.usable).padStart(4)} | actual ${t.months} mo | ` +
      Object.entries(c).filter(([k]) => k !== 'grid').map(([k, v]) => `${k}: ${v.extrapolated ? '≈' : ''}${v.fpiMonths} mo, ${v.p10}–${v.p90} (σ ${v.sigmaTrial})`).join(' | ') + ` | ${row.seconds.toFixed(0)} s`);
  }
  await b.close();
})();
