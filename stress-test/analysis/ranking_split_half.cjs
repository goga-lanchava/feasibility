#!/usr/bin/env node
/* Does discounting thin evidence pick better countries for the recommended footprint? (v0.9.18: tested, not adopted.)
 *
 *   PLAYWRIGHT_PATH=<playwright folder> [PW_EXE=<chromium>] node stress-test/analysis/ranking_split_half.cjs <app URL> [out.json]
 *
 * For each indication, the completed comparator trials with a usable per-site rate are split by start date into an older
 * and a newer half. Countries are ranked on the older half and the picks are scored by their median per-site rate in the
 * newer half, relative to that half's global median. Candidates are the countries with at least 3 rated trials in each
 * half. Rates are the app's own: a trial's enrollment ÷ sites ÷ enrollment months, counted for every country it ran in,
 * pulled toward the global median with the app's shrinkage.
 *   z rules: rank by the estimate lowered by z standard errors, exp(−z · sd / √(n + K)); z = 0 is the app's ranking.
 *   m rules: rank by the estimate among countries with at least m rated trials; m = 3 is the app's default minimum.
 * Uses live ClinicalTrials.gov data, so the numbers move as the registry changes. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const CONDS = ['type 2 diabetes', 'breast cancer', 'asthma', 'rheumatoid arthritis', 'heart failure', 'ulcerative colitis', 'COPD', 'multiple sclerosis', 'psoriasis', 'non-small cell lung cancer'];
const ZS = [0, 1, 1.64, 2, 3], MS = [3, 5, 8, 10, 15, 20];
(async () => {
  const [url, outFile] = process.argv.slice(2);
  if (!url) { console.error('usage: node ranking_split_half.cjs <app URL> [out.json]'); process.exit(2); }
  const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
  const out = [];
  for (const cond of CONDS) {
    const p = await b.newPage();
    await p.goto(url); await p.waitForTimeout(800);
    const r = await p.evaluate(async ({ cond, ZS, MS }) => {
      S.brief.condition = cond;
      try { await collectRegistry(); } catch (e) { return { cond, error: e.message }; }
      const K = S.fpp.shrinkK, T = S.web.hist.filter(t => t.siteRate != null && t.start).sort((a, b) => a.start < b.start ? -1 : 1);
      const half = Math.floor(T.length / 2), train = T.slice(0, half), test = T.slice(half);
      const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
      const byC = set => { const m = {}; for (const t of set) for (const c of new Set(t.locs.map(l => l.country).filter(Boolean))) (m[c] = m[c] || []).push(t.siteRate); return m; };
      const A = byC(train), B = byC(test), g = med(train.map(t => t.siteRate)), gTest = med(test.map(t => t.siteRate));
      const logs = train.map(t => Math.log(t.siteRate)).filter(isFinite), mu = logs.reduce((a, x) => a + x, 0) / logs.length, sd = Math.sqrt(logs.reduce((a, x) => a + (x - mu) ** 2, 0) / logs.length);
      const cands = Object.keys(A).filter(c => A[c].length >= 3 && (B[c] || []).length >= 3).map(c => ({ c, n: A[c].length, est: (A[c].length * med(A[c]) + K * g) / (A[c].length + K), real: med(B[c]) }));
      const score = (list, key, k = 4) => { const top = [...list].sort((x, y) => key(y) - key(x)).slice(0, k); return top.length ? { real: top.reduce((a, x) => a + x.real, 0) / top.length / gTest, picks: top.map(x => `${x.c} (${x.n})`) } : null; };
      const z = {}, m = {};
      for (const v of ZS) z[v] = score(cands, x => x.est * Math.exp(-v * sd / Math.sqrt(x.n + K)));
      for (const v of MS) m[v] = score(cands.filter(x => x.n >= v), x => x.est);
      return { cond, trials: T.length, sdLog: +sd.toFixed(2), candidates: cands.length, averageCandidate: cands.reduce((a, x) => a + x.real, 0) / cands.length / gTest, z, m };
    }, { cond, ZS, MS });
    out.push(r); await p.close();
    console.log(r.error ? `${cond}: ERROR ${r.error}` : `${cond}: ${r.trials} trials, ${r.candidates} candidate countries; current ranking picks ${r.z[0].picks.join(', ')} → ${r.z[0].real.toFixed(2)}`);
  }
  await b.close();
  const ok = out.filter(r => !r.error), mean = f => ok.reduce((a, r) => a + f(r), 0) / ok.length;
  const line = (label, get, base) => { const have = ok.filter(r => get(r)); return `  ${label.padEnd(22)} ${(have.reduce((a, r) => a + get(r).real, 0) / have.length).toFixed(3)}   better than the current ranking in ${have.filter(r => get(r).real > base(r).real + 1e-9).length}, worse in ${have.filter(r => get(r).real < base(r).real - 1e-9).length} of ${have.length}`; };
  console.log(`\nMedian per-site rate of the top 4 picks in the newer half, relative to its global median (${ok.length} indications):`);
  for (const v of ZS) console.log(line(v === 0 ? 'estimate (current)' : `minus ${v} std. errors`, r => r.z[v], r => r.z[0]));
  for (const v of MS) console.log(line(`at least ${v} trials`, r => r.m[v], r => r.m[3]));
  console.log(`  ${'average candidate'.padEnd(22)} ${mean(r => r.averageCandidate).toFixed(3)}`);
  if (outFile) require('fs').writeFileSync(outFile, JSON.stringify({ at: new Date().toISOString(), indications: out }, null, 1) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
