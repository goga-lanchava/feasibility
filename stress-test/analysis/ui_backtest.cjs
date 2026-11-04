#!/usr/bin/env node
/* Runs a back-test through the user interface in headless Chromium, the way a user would:
 * Study (indication, target, window, planned sites, eligibility text, rule-based parse) → Evidence (history since,
 * registry as of) → Run analysis → Report. Prints the forecast and writes <out>.json.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1          # from the repository root (the app needs localhost)
 *   node stress-test/analysis/ui_backtest.cjs stress-test/holdout-keynote407.json [out-prefix]
 *
 * Inputs: the first entry of "inputs" (fields id, cond, n, window, asOf, since, sites, footprint, proto).
 * Needs Playwright (npm i playwright, or a global install; set PLAYWRIGHT_PATH to its folder if not resolvable).
 * Note: numeric fields are typed key by key; Playwright's fill() on the start card can be lost to a re-render. */
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8765/feasibility-pipeline.html';
const T = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).inputs[0];
const OUT = process.argv[3] || `ui-backtest-${T.id}`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const t0 = Date.now(); const log = (...a) => console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s`, ...a);
  await p.goto(URL); await p.waitForTimeout(800);
  const typeInto = async (sel, text) => { await p.click(sel); await p.keyboard.press('Control+A'); await p.keyboard.type(String(text), { delay: 30 }); await p.keyboard.press('Tab'); await p.waitForTimeout(150); };
  const openSections = () => p.evaluate(() => document.querySelectorAll('#workspace details').forEach(d => { d.open = true; }));
  const busy = () => p.evaluate(() => S.running >= 0 || !!document.querySelector('[data-act=cancelMonteCarlo]') || /withheld until current/i.test(document.querySelector('#detailCard').innerText));
  const settle = async () => { let quiet = 0; for (let i = 0; i < 900 && quiet < 3; i++) { quiet = (await busy()) ? 0 : quiet + 1; await p.waitForTimeout(1000); } };
  const clickPrimary = async re => { const acts = await p.evaluate(() => [...document.querySelectorAll('#taskActions [data-act]')].map(e => e.dataset.act)); const a = acts.find(x => re.test(x)); if (a) await p.click(`#taskActions [data-act="${a}"]`); return a; };

  // Study
  await typeInto('[data-brief=condition]', T.cond);
  await typeInto('[data-setup=target]', T.n); await typeInto('[data-setup=deadline]', T.window);
  if (!T.footprint && T.sites) await typeInto('[data-plansites]', T.sites);  // v0.9.4: planned number of sites under Study
  if (T.footprint) { await p.fill('[data-brief=sponsorFootprint]', T.footprint); await p.press('[data-brief=sponsorFootprint]', 'Tab'); }
  await p.fill('#protoText', T.proto); await p.press('#protoText', 'Tab');
  await p.click('summary:has-text("Protocol parsing options")'); await p.click('[data-act=parseRules]'); await p.waitForTimeout(800);
  log('parsed', await p.evaluate(() => `${S.criteria.length} rules, ${S.criteria.filter(c => c.type === 'manual').length} manual, ${S.criteria.filter(c => (c.flags || []).includes('unparsed')).length} incomplete`));
  // Evidence: back-test settings sit in a collapsed section
  await p.click('#tab-evidence'); await p.waitForTimeout(300); await openSections(); await p.waitForTimeout(200);
  await typeInto('[data-brief=since]', T.since);
  await p.fill('[data-brief=asOf]', T.asOf); await p.press('[data-brief=asOf]', 'Tab'); await p.waitForTimeout(200);
  // Review, then run
  await clickPrimary(/review/i); await p.waitForTimeout(500);
  log('run:', await clickPrimary(/run|analy/i)); await settle();
  log('registry', await p.evaluate(() => S.status[1]?.msg));
  const res = await p.evaluate(() => {
    const s = S.fp.simB, d = s.deadline ?? S.params.deadline;
    return { budget: S.fp.budgetB, prob: s.prob, medMonths: s.medMonths, p90Months: s.p90Months, firstPatientMonth: s.p50.findIndex(v => v >= 1),
      p10: s.p10[d], p50: s.p50[d], p90: s.p90[d], globalRate: S.fp.globalRate, sigmaTrial: S.fpp.sigmaTrialEff, usable: S.web.global.dq.usedForRates,
      footprint: Object.entries(S.fp.allocB).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ country: c, sites: n, rate: +S.fp.rowsBy[c].rate.toFixed(3), trials: S.fp.rowsBy[c].evidence.trials })),
      sponsor: S.fp.simA ? { prob: S.fp.simA.prob, medMonths: S.fp.simA.medMonths } : null, months: fpiDuration(S.fp.simA || S.fp.simB)?.months ?? null, matchMode: S.fp.matchMode, comparatorBasis: comparatorBasisNote() };
  });
  await p.click('#tab-report'); await p.waitForTimeout(800);
  res.summary = await p.evaluate(() => document.querySelector('#workspace').innerText.split('\n').filter(l => /simulated runs|first patient/i.test(l)).slice(0, 3));
  res.actual = { months: T.months, n: T.n }; res.errors = errs;
  fs.writeFileSync(OUT + '.json', JSON.stringify(res, null, 1));
  log(JSON.stringify(res, null, 1));
  await b.close();
})();
