#!/usr/bin/env node
/* Round 4 blind back-test: runs the application (headless Chromium) on one set from select_round4.cjs.
 * Only start-of-trial information goes in: condition, registry as of the start date (history from 12 years before),
 * target (planned; imputed for terminated trials), the listed footprint, default start-up. The forecast is read at
 * the first simulated patient + the actual recruitment months (participants p10/p50/p90) and as months from the first
 * patient to the target (duration).
 *
 *   python -m http.server 8765 --bind 127.0.0.1              # repository root
 *   node stress-test/analysis/run_round4.cjs calibration out.jsonl [--configs name,name]
 * PLAYWRIGHT_PATH may point to a Playwright install. One JSON line per trial; a run resumes where it stopped. */
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8765/feasibility-pipeline.html';
const [set, out] = process.argv.slice(2); if (!set || !out) { console.error('usage: run_round4.cjs <set> out.jsonl'); process.exit(2); }
if (/^lockbox/.test(set) && process.env.LOCKBOX_FROZEN !== 'yes') { console.error('lockbox: set LOCKBOX_FROZEN=yes once the version is frozen'); process.exit(2); }
const trials = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'round4', `${set}.json`), 'utf8'));
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const CONC = +(process.env.CONC || 4);
// Engine settings evaluated on the same registry snapshot: CONFIGS='[["name",{fpp overrides}],…]' (the first is the headline)
const CONFIGS = JSON.parse(process.env.CONFIGS || '[["default",{}]]');
(async () => {
  const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const queue = trials.filter(t => !done.has(t.id));
  const worker = async () => {
    for (let t; (t = queue.shift());) {
      const t0 = Date.now(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      let rec;
      for (let attempt = 1; attempt <= 2 && !rec; attempt++) {
        try {
          await p.goto(URL); await p.waitForTimeout(400);
          rec = await p.evaluate(async ({ CONFIGS, ...t }) => {
            renderAll = () => {};
            const since = +t.start.slice(0, 4) - 12;
            Object.assign(S.brief, { condition: t.cond, since, asOf: t.start.length === 7 ? t.start + '-15' : t.start, sponsorFootprint: t.footprint || '' });
            if (t.phase && 'phase' in S.brief) S.brief.phase = t.phase;
            S.params.target = t.n; S.params.deadline = Math.ceil(t.months) + 6;
            if (!t.footprint && t.sites) { S.brief.plannedSites = t.sites; S.fpp.budgetMode = 'custom'; S.fpp.budget = t.sites; }
            await collectRegistry();
            const base = { ...S.fpp }, configs = {};
            const read = () => {
            const sim = S.fp.simA || S.fp.simB, f = fpiDuration(sim);
            const m = Math.min(sim.p10.length - 1, Math.round((f ? f.first : 7) + t.months));
            return { usable: S.web.global.dq.usedForRates, completed: S.web.hist.length, plan: S.fp.simA ? 'sponsor' : 'recommended',
              sitesSim: S.fp.simA ? S.fp.totalA : S.fp.totalB, prob: sim.prob, fpiMonths: f ? f.months : null, extrapolated: f ? !!f.approx : null,
              first: f ? f.first : null, ...(() => { const hit = a => { const i = a.findIndex(v => v >= t.n); return i < 0 ? null : i - (f ? f.first : 0); }; return { dur10: hit(sim.p90), dur50: hit(sim.p50), dur90: hit(sim.p10), horizon: sim.p10.length - 1 }; })(), r10: sim.p10[m], r25: sim.p25?.[m], r50: sim.p50[m], r75: sim.p75?.[m], r90: sim.p90[m], readMonth: m, sigmaTrial: S.fpp.sigmaTrialEff,
              globalRate: S.fp.globalRate, ppsFactor: S.fp.ppsFactor, thin: S.fp.thinEvidence, warnings: (S.fp.warnings || []).map(w => String(w.text || w).slice(0, 120)) };
            };
            for (const [name, ov] of CONFIGS) { Object.assign(S.fpp, base, ov); computeFootprint(false); configs[name] = read(); }
            Object.assign(S.fpp, base);
            return { ...configs[CONFIGS[0][0]], configs };
          }, { ...t, CONFIGS });
        } catch (e) { console.error(`${t.id} attempt ${attempt}: ${e.message.slice(0, 200)}`); }
      }
      await p.close();
      if (!rec) { console.error(`${t.id} skipped`); continue; }
      const row = { id: t.id, stratum: t.stratum, phase: t.phase, area: t.area, cond: t.cond, target: t.n, actualN: t.nActual ?? t.n, actualMonths: t.months,
        sites: t.sites, ...rec, errors: errs.slice(0, 3), seconds: (Date.now() - t0) / 1000 };
      fs.appendFileSync(out, JSON.stringify(row) + '\n');
      console.log(`${t.id} ${t.stratum.padEnd(10)} ${t.phase.padEnd(12)} usable ${String(rec.usable).padStart(4)} | actual ${row.actualN} in ${t.months} mo | forecast ${rec.r10}–${rec.r90} (p50 ${rec.r50}), ${rec.fpiMonths} mo | ${row.seconds.toFixed(0)} s`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  await b.close();
})();
