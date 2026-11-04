#!/usr/bin/env node
/* Protocol strictness features for round-4 trials, from each trial's ClinicalTrials.gov eligibility text, using the
 * application's own rule parser (parseProtocolRules). Text only: no outcome is read here.
 *
 *   python -m http.server 8765 --bind 127.0.0.1            # repository root
 *   node stress-test/analysis/strictness_features.cjs calibration,validation out.json
 * PLAYWRIGHT_PATH / PW_EXE as for run_round4.cjs. */
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8765/feasibility-pipeline.html';
const [sets, out] = process.argv.slice(2);
if (/lockbox/.test(sets) && process.env.LOCKBOX_FROZEN !== 'yes') { console.error('lockbox sets need LOCKBOX_FROZEN=yes'); process.exit(2); }
const trials = sets.split(',').flatMap(s => JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'round4', `${s}.json`), 'utf8')).map(t => ({ set: s, id: t.id, proto: t.proto })));
(async () => {
  const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
  const p = await b.newPage(); await p.goto(URL); await p.waitForTimeout(600);
  const rows = await p.evaluate(trials => trials.map(t => {
    const text = String(t.proto || '');
    const body = text.replace(/^Inclusion\/exclusion \(ClinicalTrials\.gov [^)]*\):\n/, '');
    const parts = body.split(/exclusion criteria\s*:?/i), incTxt = parts[0] || '', excTxt = parts.slice(1).join(' ');
    const bullets = s => (s.match(/^\s*(?:[*\-•]|\d+[.)])\s+\S/gm) || []).length;
    let C = [];
    try { C = parseProtocolRules(text).criteria || []; } catch (e) { return { id: t.id, set: t.set, error: e.message }; }
    const on = C.filter(c => c.enabled !== false), inc = on.filter(c => c.kind === 'inc'), exc = on.filter(c => c.kind === 'exc');
    const numeric = c => ['lab', 'age', 'lines'].includes(c.type) || (c.type === 'biomarker' && c.op !== 'eq');
    const age = inc.filter(c => c.type === 'age');
    const ageMin = Math.max(0, ...age.map(c => c.op === 'between' ? c.min : (c.op === '>=' || c.op === '>') ? c.value : 0).filter(isFinite));
    const ageMax = Math.min(120, ...age.map(c => c.op === 'between' ? c.max : (c.op === '<=' || c.op === '<') ? c.value : 120).filter(isFinite));
    return { id: t.id, set: t.set,
      chars: body.length, words: (body.match(/\S+/g) || []).length, bulletsInc: bullets(incTxt), bulletsExc: bullets(excTxt),
      nInc: inc.length, nExc: exc.length, nRules: on.length, nNumeric: on.filter(numeric).length, nLab: on.filter(c => c.type === 'lab').length,
      nIncLab: inc.filter(c => c.type === 'lab').length, nLines: on.filter(c => c.type === 'lines').length,
      nIncMed: inc.filter(c => c.type === 'medication').length, nIncBiomarker: inc.filter(c => c.type === 'biomarker').length,
      nIncCondition: inc.filter(c => c.type === 'condition').length, nExcCondition: exc.filter(c => c.type === 'condition').length,
      nExcMed: exc.filter(c => c.type === 'medication').length, nTemporal: on.filter(c => c.temporal).length,
      nConditional: on.filter(c => c.conditional).length, nManual: on.filter(c => c.type === 'manual').length,
      ageMin, ageMax, ageSpan: ageMax - ageMin };
  }), trials);
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  console.log(`${rows.length} trials, ${rows.filter(r => r.error).length} parse errors`);
  await b.close();
})();
