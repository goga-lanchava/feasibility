#!/usr/bin/env node
/* Runs every in-app verification suite (the ones under Settings › Technical tools › Expert view) in headless Chromium.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1      # from the repository root
 *   node tests/run-app-suites.cjs [suite …]            # default: all suites; exit code 1 if any test fails
 *
 * Each suite runs on a freshly loaded page. Needs Playwright (npm i playwright, or set PLAYWRIGHT_PATH to its folder). */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8765/feasibility-pipeline.html';
const SUITES = {
  parser: 'runParserTests', engine: 'runEngineTests', lifecycle: 'runLifecycleTests', ux: 'runUxTests', r2: 'runR2Tests',
  project: 'runProjectTests', r3: 'runR3Tests', view: 'runUiTests', flex: 'runFlexTests', gemini: 'runGeminiTests',
};
(async () => {
  const pick = process.argv.slice(2).filter(a => SUITES[a]);
  const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {}); let failed = 0;
  for (const [name, fn] of Object.entries(SUITES)) {
    if (pick.length && !pick.includes(name)) continue;
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(500);
    const t0 = Date.now();
    const r = await p.evaluate(async fn => {
      let out = await window[fn]?.() ?? await eval(fn + '()');
      if (fn === 'runParserTests') out = S.selfTest || out;
      const results = out.results || out.cases || [];
      return { pass: out.pass, total: out.total, failures: results.filter(x => !x.pass).map(x => `${x.group ? x.group + ' · ' : ''}${x.name || x.text || ''} :: ${String(x.detail ?? JSON.stringify(x.got ?? '')).slice(0, 300)}`) };
    }, fn).catch(e => ({ pass: 0, total: -1, failures: ['RUNNER ERROR: ' + e.message] }));
    const ok = r.pass === r.total && r.total > 0; if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(9)} ${r.pass}/${r.total}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    for (const f of r.failures) console.log('      ✗ ' + f);
    if (errs.length) console.log('      page errors: ' + errs.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close(); process.exit(failed ? 1 : 0);
})();
