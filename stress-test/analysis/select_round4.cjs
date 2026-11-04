#!/usr/bin/env node
/* Round 4 trial selection (≈200 finished trials, mixed phases/indications, including slow and failed enrolment).
 * Selection and the calibration / validation / lockbox split happen here, before any forecast is run.
 *
 *   node stress-test/analysis/select_round4.cjs
 *
 * Writes stress-test/round4/{calibration,validation,lockbox}.json and selection-log.json.
 * Strata (all interventional, start 2009–2019, ≥3 listed sites, not used in rounds 1–3):
 *   completed   – results posted and a recruitment window stated in "recruitment details" (two dates)
 *   terminated  – whyStopped mentions enrolment/accrual/recruitment; window = start → primary completion (actual)
 *   withdrawn   – whyStopped mentions enrolment/accrual/recruitment; 0 enrolled; planned target and dates kept
 * Information used by the forecast is only what was known at the start: condition, phase, target (planned),
 * sites/countries from the location list (the one compromise: the registry list is the final one), start date.
 * The split is a deterministic hash of the NCT id (seed "r4"), stratified by stratum, so it does not depend on results. */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const ST = path.resolve(__dirname, '..'); const OUT = path.join(ST, 'round4'); fs.mkdirSync(OUT, { recursive: true });
const API = 'https://clinicaltrials.gov/api/v2/studies';
const FIELDS = 'NCTId,BriefTitle,Condition,Phase,OverallStatus,WhyStopped,StartDate,PrimaryCompletionDate,CompletionDate,EnrollmentCount,EnrollmentType,LocationCountry,LocationFacility,resultsSection.participantFlowModule.recruitmentDetails,EligibilityCriteria,LeadSponsorName,StudyType';
const seen = new Set();
for (const f of ['inputs.json', 'inputs-round2.json', 'inputs-round3.json', 'gemini-run20-inputs.json'])
  try { const j = JSON.parse(fs.readFileSync(path.join(ST, f), 'utf8')); (Array.isArray(j) ? j : j.inputs || []).forEach(t => seen.add(t.id)); } catch {}
seen.add('NCT03850444');  // KEYNOTE-407 hold-out
// FRESH=<name>: draw a new one-time test set (≈50 trials, same strata and phase mix) that excludes every round-4 trial;
// used after the first lockbox had been spent. Writes round4/<name>.json only.
const FRESH = process.env.FRESH || '';
if (FRESH) for (const f of ['calibration', 'validation', 'lockbox']) JSON.parse(fs.readFileSync(path.join(OUT, f + '.json'), 'utf8')).forEach(t => seen.add(t.id));
const h = s => parseInt(crypto.createHash('sha256').update((FRESH ? 'r4b:' : 'r4:') + s).digest('hex').slice(0, 8), 16);
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const ym = d => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(d || ''); return m ? +m[1] * 12 + (+m[2] - 1) + ((m[3] ? +m[3] : 15) - 1) / 30 : null; };
// Dates in free text → fractional month index; returns them in order of appearance
function textDates(s) {
  const out = []; let m;
  const re = /(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(?:(\d{1,2})(?:st|nd|rd|th)?,?\s*)?((?:19|20)\d{2})|\b((?:19|20)\d{2})-(\d{2})(?:-(\d{2}))?|\b(\d{1,2})\/(\d{1,2})\/((?:19|20)\d{2})|\b(\d{1,2})\/((?:19|20)\d{2})\b/gi;
  while ((m = re.exec(s))) {
    if (m[2]) out.push(+m[4] * 12 + MON[m[2].toLowerCase().slice(0, 3)] + ((+(m[1] || m[3] || 15)) - 1) / 30);
    else if (m[5]) out.push(+m[5] * 12 + (+m[6] - 1) + ((+(m[7] || 15)) - 1) / 30);
    else if (m[8]) out.push(+m[10] * 12 + (+m[8] - 1) + (+m[9] - 1) / 30);
    else if (m[11]) out.push(+m[12] * 12 + (+m[11] - 1) + 0.5);
  }
  return out;
}
const AREA = [['Oncology', /cancer|carcinoma|tumou?r|lymphoma|leukemi|myeloma|melanoma|sarcoma|neoplas|glioma|blastoma/i],
  ['Cardiometabolic', /diabet|heart|cardi|hypertens|coronary|atrial|obes|lipid|cholest|stroke|vascular|kidney|renal/i],
  ['Infectious', /hiv|hepatitis|infect|influenza|vaccin|covid|tubercul|malaria|pneumonia|sepsis|bacter|viral/i],
  ['Neuro/Psych', /alzheim|parkinson|schizo|depress|epilep|migraine|sclerosis|bipolar|autism|pain|neuropath|anxiety|insomnia|adhd/i],
  ['Respiratory', /asthma|copd|pulmonary|lung|cystic fibrosis|respirat/i],
  ['Immunology/Derm', /arthritis|psoria|lupus|crohn|colitis|dermatitis|eczema|spondyl|urticaria|atopic/i]];
const area = c => (AREA.find(([, r]) => r.test(c)) || ['Other'])[0];
async function get(term, maxPages) {
  const rows = []; let tok = '';
  for (let p = 0; p < maxPages; p++) {
    const u = `${API}?query.term=${encodeURIComponent(term)}&fields=${FIELDS}&pageSize=1000${tok ? '&pageToken=' + tok : ''}`;
    let j; for (let a = 0; a < 3 && !j; a++) { try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (r.ok) j = await r.json(); } catch {} }
    if (!j) break; rows.push(...(j.studies || [])); if (!j.nextPageToken) break; tok = j.nextPageToken;
  }
  return rows;
}
function shape(s, stratum) {
  const p = s.protocolSection, st = p.statusModule, id = p.identificationModule.nctId;
  const locs = (p.contactsLocationsModule || {}).locations || [], byC = {};
  for (const l of locs) if (l.country) byC[l.country] = (byC[l.country] || 0) + 1;
  const conds = (p.conditionsModule || {}).conditions || [], phases = (p.designModule || {}).phases || [];
  const enr = (p.designModule || {}).enrollmentInfo || {};
  const start = ym(st.startDateStruct?.date), pc = ym(st.primaryCompletionDateStruct?.date);
  const t = { id, name: id, title: (p.identificationModule.briefTitle || '').slice(0, 160), cond: conds[0] || '', conds, stratum,
    phase: phases.join('/') || 'NA', area: area(conds.join(' ') + ' ' + p.identificationModule.briefTitle), sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name || '',
    start: st.startDateStruct?.date || '', sites: locs.length, countries: Object.keys(byC).length,
    footprint: Object.entries(byC).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${c}: ${k}`).join('\n'), whyStopped: st.whyStopped || '',
    proto: `Inclusion/exclusion (ClinicalTrials.gov ${id}):\n${(p.eligibilityModule || {}).eligibilityCriteria || ''}`.slice(0, 6000) };
  if (stratum === 'completed') {
    const rd = s.resultsSection?.participantFlowModule?.recruitmentDetails || '';
    if (!/enrol|recruit|random|screen|between|from/i.test(rd)) return null;
    const d = textDates(rd); if (d.length < 2) return null;
    const a = Math.min(d[0], d[1]), b = Math.max(d[0], d[1]), months = Math.round((b - a) * 10) / 10;
    if (months < 2 || months > 96 || (pc && b > pc + 1) || (start && Math.abs(a - start) > 6)) return null;
    Object.assign(t, { n: enr.count, months, evidence: rd.slice(0, 300), outcome: 'completed' });
  } else if (stratum === 'terminated') {
    const months = start && pc ? Math.round((pc - start) * 10) / 10 : null;
    if (!months || months < 2 || months > 96 || !(enr.count > 0)) return null;
    // Planned target is not kept by the registry after termination; 3× the actual enrolment stands in (documented)
    Object.assign(t, { n: Math.max(enr.count * 3, 30), nActual: enr.count, months, targetImputed: true, outcome: 'terminated-low-accrual' });
  } else {
    const months = start && pc ? Math.round((pc - start) * 10) / 10 : null;
    if (!months || months < 3 || !(enr.count > 0)) return null;
    Object.assign(t, { n: enr.count, nActual: 0, months, outcome: 'withdrawn-no-accrual' });
  }
  return t;
}
(async () => {
  const LOW = /enrol|accru|recruit|slow|insufficient (?:number|patients|participants|subjects)/i;
  const base = 'AREA[StudyType]INTERVENTIONAL AND AREA[StartDate]RANGE[2009-01-01,2019-12-31]';
  const want = FRESH ? { completed: { PHASE1: 4, PHASE2: 12, PHASE3: 12, PHASE4: 4 }, terminated: { PHASE1: 2, PHASE2: 8, PHASE3: 5, PHASE4: 2 }, withdrawn: { PHASE1: 1, PHASE2: 1, PHASE3: 1 } } : { completed: { PHASE1: 15, PHASE2: 50, PHASE3: 55, PHASE4: 15 }, terminated: { PHASE1: 8, PHASE2: 30, PHASE3: 20, PHASE4: 8 }, withdrawn: { PHASE1: 3, PHASE2: 6, PHASE3: 4 } };
  const pool = [], log = {};
  for (const [stratum, byPhase] of Object.entries(want)) for (const [ph, k] of Object.entries(byPhase)) {
    const status = stratum.toUpperCase();
    const term = `${base} AND AREA[OverallStatus]${status} AND AREA[Phase]${ph}` + (stratum === 'completed' ? ' AND AREA[HasResults]true' : '');
    const rows = await get(term, stratum === 'completed' ? 6 : 4);
    const cands = rows.map(s => {
      if (seen.has(s.protocolSection.identificationModule.nctId)) return null;
      if (stratum !== 'completed' && !LOW.test(s.protocolSection.statusModule.whyStopped || '')) return null;
      const t = shape(s, stratum); if (!t) return null;
      if (stratum !== 'withdrawn' && (t.sites < 3 || !(t.n >= 20))) return null;
      return t;
    }).filter(Boolean).sort((a, b) => h(a.id) - h(b.id));
    // Spread across indications: at most 2 picks per first-condition word, then fill
    const pick = [], perCond = {};
    for (const t of cands) { const key = (t.cond || '').toLowerCase().split(/\W+/)[0]; if ((perCond[key] = (perCond[key] || 0) + 1) <= 2 && pick.length < k) pick.push(t); }
    log[`${stratum}/${ph}`] = { fetched: rows.length, eligible: cands.length, picked: pick.length };
    pool.push(...pick); console.log(stratum, ph, log[`${stratum}/${ph}`]);
  }
  const uniq = [...new Map(pool.map(t => [t.id, t])).values()];
  if (FRESH) {
    const uq = [...new Map(pool.map(t => [t.id, t])).values()];
    fs.writeFileSync(path.join(OUT, `${FRESH}.json`), JSON.stringify(uq, null, 1));
    fs.writeFileSync(path.join(OUT, `${FRESH}-selection-log.json`), JSON.stringify({ date: new Date().toISOString(), log, size: uq.length }, null, 1));
    console.log(FRESH, uq.length); return;
  }
  const sets = { calibration: [], validation: [], lockbox: [] };
  for (const stratum of Object.keys(want)) {
    const g = uniq.filter(t => t.stratum === stratum).sort((a, b) => h('split:' + a.id) - h('split:' + b.id));
    g.forEach((t, i) => { const r = i % 4; (r < 2 ? sets.calibration : r === 2 ? sets.validation : sets.lockbox).push(t); });
  }
  for (const [k, v] of Object.entries(sets)) fs.writeFileSync(path.join(OUT, `${k}.json`), JSON.stringify(v, null, 1));
  fs.writeFileSync(path.join(OUT, 'selection-log.json'), JSON.stringify({ date: new Date().toISOString(), log, sizes: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length])) }, null, 1));
  console.log(Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length])));
})();
