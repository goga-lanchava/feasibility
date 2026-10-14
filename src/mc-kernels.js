/* mc-kernels — Monte Carlo recruitment kernels for the Trial Feasibility Pipeline (single source of truth).
 * Edit this file, then run `node tools/build.mjs` to embed it in feasibility-pipeline.html.
 * Pure functions: no DOM, no application state, no network, no dynamic code compilation.
 * The page executes this script directly on the main thread and hands the identical text to the Blob Web Worker.
 * Loads as a classic script (sets self.MC_KERNELS) or as a CommonJS module (module.exports) for the offline test runner.
 * Seeded RNG draw order, quantile definitions and recruitment equations are unchanged from v0.5.0. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  root.MC_KERNELS = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const effectiveCap=r=>(r.capOverride&&r.capOverride.applied)?r.capOverride.value:r.cap;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function poisson(l, r) {
  if (l <= 0) return 0;
  if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * randn(r)));
  const L = Math.exp(-l); let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}
function largestRemainder(total, weights) {
  const n = weights.length; if (!n || total <= 0) return new Array(n).fill(0);
  const ws = weights.map(w => Math.max(0, +w || 0)); const sum = ws.reduce((a, b) => a + b, 0) || n;
  const raw = ws.map(w => (sum === n && !ws.some(Boolean) ? 1 : w) * total / sum);
  const out = raw.map(Math.floor); let rest = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (rest > 0) { out[i]++; rest--; } });
  return out;
}
function cappedDistribute(total, items) {
  const alloc = items.map(() => 0); let left = total; let open = items.map((_, i) => i);
  while (left > 0 && open.length) {
    const share = largestRemainder(left, open.map(i => items[i].w));
    let placed = 0; const next = [];
    open.forEach((i, j) => { const room = items[i].cap - alloc[i]; const add = Math.min(room, share[j]); alloc[i] += add; placed += add; if (alloc[i] < items[i].cap) next.push(i); });
    left -= placed; if (!placed) break; open = next;
  }
  return { alloc, unplaced: left };
}
function summarizeTotals(totals, reach, N, H, deadline, target) {
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [];
  for (let m = 0; m <= H; m++) { const s = Float64Array.from(totals[m]).sort(); p10.push(q(s, .1)); p25.push(q(s, .25)); p50.push(q(s, .5)); p75.push(q(s, .75)); p90.push(q(s, .9)); }
  let hit = 0; for (let n = 0; n < N; n++) if (totals[deadline][n] >= target) hit++;
  const rs = Float64Array.from(reach).sort();
  return { p10, p25, p50, p75, p90, prob: hit / N, medMonths: q(rs, .5), p90Months: q(rs, .9) };
}
function simulateSitesCore(P, allSites, siteIds, progress = () => {}) {
  const t0 = performance.now();
  const pool = allSites.filter(s => s.emr && s.eligible != null && (!siteIds || siteIds.has(s.id)));
  const r = mulberry32(P.seed >>> 0);
  const deadline = Math.max(1, Math.round(P.deadline));
  const H = Math.max(deadline + 12, Math.round(deadline * 1.75));
  const N = clamp(Math.round(P.sims), 100, 20000);
  const medE = median(allSites.filter(s => s.emr && s.eligible > 0).map(s => s.eligible)) || 1;
  const totals = Array.from({ length: H + 1 }, () => new Float64Array(N));
  const reach = new Float64Array(N).fill(Infinity);
  const contrib = new Float64Array(pool.length);
  const base = pool.map(s => ({
    lam: s.simRate * clamp(s.eligible / medE, 0.25, 2.0),
    poolMean: s.eligible * P.catchment * P.consent * (1 - s.simSF),
    sigma: s.rateKnown ? 0.35 : 0.6,
  }));
  const act = new Int32Array(pool.length), lam = new Float64Array(pool.length), left = new Float64Array(pool.length);
  const aMin = Math.max(0, Math.round(P.actMin)), aMax = Math.max(aMin, Math.round(P.actMax));
  let maxExcess = -Infinity;
  for (let n = 0; n < N; n++) {
    if (n % Math.max(1,Math.ceil(N/100)) === 0) progress(n,N,"simulation");
    for (let j = 0; j < pool.length; j++) {
      act[j] = aMin + Math.floor(r() * (aMax - aMin + 1));
      lam[j] = base[j].lam * Math.exp(base[j].sigma * randn(r) - base[j].sigma * base[j].sigma / 2);
      left[j] = poisson(base[j].poolMean, r);
    }
    let drawn = 0; for (let j = 0; j < pool.length; j++) drawn += left[j];
    let cum = 0;
    for (let m = 1; m <= H; m++) {
      for (let j = 0; j < pool.length; j++) {
        if (m <= act[j] || left[j] <= 0) continue;
        const k = Math.min(poisson(lam[j], r), left[j]);
        left[j] -= k; cum += k; if (m <= deadline) contrib[j] += k;
      }
      totals[m][n] = cum;
      if (cum >= P.target && reach[n] === Infinity) reach[n] = m;
    }
    if (cum - drawn > maxExcess) maxExcess = cum - drawn;
  }
  progress(N,N,"quantiles");
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [];
  for (let m = 0; m <= H; m++) {
    const s = Float64Array.from(totals[m]).sort();
    p10.push(q(s, .1)); p25.push(q(s, .25)); p50.push(q(s, .5)); p75.push(q(s, .75)); p90.push(q(s, .9));
  }
  const hitN = totals[deadline].reduce((a, v) => a + (v >= P.target ? 1 : 0), 0);
  const rs = Float64Array.from(reach).sort();
  return {
    H, deadline, target: P.target, p10, p25, p50, p75, p90,
    prob: hitN / N, medMonths: q(rs, .5), p90Months: q(rs, .9),
    sites: pool.map((s, j) => ({ id: s.id, expected: contrib[j] / N, poolMean: base[j].poolMean, lam: base[j].lam })),
    poolTotal: base.reduce((a, b) => a + b.poolMean, 0), poolCheck: { respected: !(maxExcess > 0), maxExcess }, nSites: pool.length, N, ms: performance.now() - t0,
  };
}
function simulateFootprintCore(P,F,alloc,rowsBy,nOverride,progress = () => {}) {
  const r = mulberry32((P.seed >>> 0) + 101);
  const deadline = Math.max(1, Math.round(P.deadline)); const H = Math.max(deadline + 12, Math.round(deadline * 1.75));
  const N = nOverride || clamp(Math.round(P.sims), 100, 20000);
  const sites = [];
  for (const [c, n] of Object.entries(alloc)) { const row = rowsBy[c]; if (!row || !(n > 0)) continue; for (let i = 0; i < n; i++) sites.push({ c, rate: row.rate, startup: row.startup }); }
  const totals = Array.from({ length: H + 1 }, () => new Float64Array(N)); const reach = new Float64Array(N).fill(Infinity); const byC = {};
  const act = new Float64Array(sites.length), lam = new Float64Array(sites.length); const s2 = F.sigma * F.sigma / 2;
  // Trial-level rate uncertainty (v0.9.1): one log-normal multiplier per run shared by every site, so the spread between
  // whole trials is not averaged away across hundreds of sites. Drawn from its own stream: with sigmaTrialEff 0 the
  // site-level random sequence and every result are unchanged.
  const sT = F.sigmaTrialEff > 0 ? F.sigmaTrialEff : 0, rT = sT ? mulberry32((P.seed >>> 0) + 303) : null;
  for (let n = 0; n < N; n++) {
    if (n % Math.max(1,Math.ceil(N/100)) === 0) progress(n,N,"simulation");
    // Median-preserving (v0.9.3): the comparator rate it scales is a median of trials, so the multiplier keeps that median.
    // (A mean-preserving form, exp(σz − σ²/2), shifted the median forecast ~30% slower at σ 0.8 in the back-tests.)
    const trialF = sT ? Math.exp(sT * randn(rT)) : 1;
    for (let j = 0; j < sites.length; j++) { act[j] = sites[j].startup + r() * F.stagger; lam[j] = sites[j].rate * trialF * Math.exp(F.sigma * randn(r) - s2); }
    let cum = 0;
    for (let m = 1; m <= H; m++) {
      for (let j = 0; j < sites.length; j++) {
        const on = m - act[j]; if (on <= 0) continue;
        const k = poisson(lam[j] * Math.min(1, on), r);
        if (k) { cum += k; if (m <= deadline) byC[sites[j].c] = (byC[sites[j].c] || 0) + k; }
      }
      totals[m][n] = cum; if (cum >= P.target && reach[n] === Infinity) reach[n] = m;
    }
  }
  progress(N,N,"quantiles");
  for (const c in byC) byC[c] /= N;
  return { H, deadline, target: P.target, N, nSites: sites.length, byCountry: byC, ...summarizeTotals(totals, reach, N, H, deadline, P.target) };
}
function optimizeAllocCore(F,rows,budget,sponsorAlloc = {}) {
  // Hard constraints: excluded countries get nothing, no country exceeds its cap, the total never exceeds the budget.
  // Soft constraints (parameters): max share per country, minimum sites per opened country.
  const alloc = {}; let total = 0;
  const diag = { budget, binding: [], infeasible: [], notes: [] };
  const perMax = Math.max(F.minSites, Math.floor(F.maxShare * budget));
  const anyIntel = rows.some(r => r.intel);
  rows.forEach(r => { if (r.capOverride && !r.capOverride.applied) diag.notes.push(`${r.country}: cap override ignored, a reason is required`); });
  // Optional regional cap (v0.9.1; off at 1): no world region takes more than this share of the budget; it also limits the sponsor keep-minimum
  const regMax = F.maxRegionShare > 0 && F.maxRegionShare < 1 ? Math.max(F.minSites, Math.floor(F.maxRegionShare * budget)) : Infinity, regUsed = {};
  if (F.keepMin > 0) for (const c of Object.keys(sponsorAlloc)) {
    const r = rows.find(x => x.country === c);
    if (!r || r.assumed) { diag.infeasible.push(`${c}: cannot keep ≥ ${F.keepMin} sites because the country has no registry-based model`); continue; }
    if (!r.allow) { diag.infeasible.push(`${c}: keep-minimum not applied because the country is excluded (“Use” unticked)`); continue; }
    const want = Math.round(F.keepMin), cap = effectiveCap(r), regRoom = r.region ? regMax - (regUsed[r.region] || 0) : Infinity;
    const n = Math.min(want, cap, perMax, budget - total, regRoom);
    if (n < want) diag.infeasible.push(`${c}: keep ≥ ${want} not achievable, limited to ${Math.max(0, n)} by ${n === cap ? `capacity (${cap} usable experienced sites)` : n === perMax ? 'the max-share limit' : n === regRoom ? `the region cap (${r.region}, ${regMax} sites)` : 'the budget'}`);
    if (n > 0) { alloc[c] = n; total += n; if (r.region) regUsed[r.region] = (regUsed[r.region] || 0) + n; }
  }
  const pool = rows.filter(r => r.allow && !r.assumed && effectiveCap(r) >= F.minSites && r.value > 0 && (!F.onlyResearched || !anyIntel || r.intel));
  for (const r of pool.sort((a, b) => b.value - a.value)) {
    if (total >= budget) break;
    const have = alloc[r.country] || 0, cap = effectiveCap(r), regRoom = r.region ? regMax - (regUsed[r.region] || 0) : Infinity;
    const room = Math.min(cap - have, perMax - have, budget - total, regRoom);
    if (room <= 0) { if (regRoom <= 0 && regMax < Infinity) diag.binding.push(`${r.country}: region cap (${r.region}, ${regMax} sites)`); continue; }
    if (have === 0 && room < F.minSites) { diag.binding.push(`${r.country}: skipped, fewer than ${F.minSites} sites available`); continue; }
    alloc[r.country] = have + room; total += room; if (r.region) regUsed[r.region] = (regUsed[r.region] || 0) + room;
    if (room === cap - have && room < budget - total + room) diag.binding.push(`${r.country}: capacity (${cap})`);
    else if (room === perMax - have) diag.binding.push(`${r.country}: max share (${perMax} sites)`);
    else if (room === regRoom) diag.binding.push(`${r.country}: region cap (${r.region}, ${regMax} sites)`);
  }
  for (const [c, n] of Object.entries(alloc)) { const r = rows.find(x => x.country === c); if (!r.allow || n > effectiveCap(r) || n < 0) throw new Error(`Allocation constraint violated for ${c}`); }
  if (total > budget) throw new Error('Allocation exceeded the budget');
  diag.allocated = total; diag.unused = budget - total;
  if (diag.unused > 0) diag.binding.push(`${diag.unused} sites of the budget unused: not enough allowed, experienced capacity`);
  return { alloc, total, diag };
}
function sitesNeededCore(P,F,fp,progress = () => {}) {
  // Coarse search at NS runs, then validation of neighbouring counts at NV runs with each count's own allocation.
  // Every evaluation uses the same seed (common random numbers), so differences between counts are not sampling noise alone.
  const NS = 400, NV = clamp(Math.round(P.sims), 2000, 5000), goal = 0.8; let evaluations = 0;
  const tot = a => Object.values(a).reduce((x, y) => x + y, 0);
  const se = (p, N) => Math.sqrt(Math.max(p * (1 - p), 0.0025) / N);
  const run = (alloc, N) => { evaluations++; return simulateFootprintCore(P,F,alloc,fp.rowsBy,N,(done,total,phase)=>progress(done,total,"site-count evaluation " + evaluations + " / " + phase)).prob; };
  const search = (allocFor, maxN) => {
    const p = n => run(allocFor(n), NS);
    let lo = 0, hi = Math.max(10, Math.min(maxN, Math.max(fp.totalA, fp.budgetB))); let ph = p(hi);
    while (ph < goal && hi < maxN) { lo = hi; hi = Math.min(maxN, hi * 2); ph = p(hi); }
    if (ph < goal) { const a = allocFor(maxN); const pv = run(a, NV); return { n: null, max: maxN, prob: pv, se: se(pv, NV), N: NV, searchN: NS, evaluations, stable: true, candidates: [{ n: tot(a), prob: pv, se: se(pv, NV) }] }; }
    while (hi - lo > 2) { const mid = (lo + hi) >> 1; if (p(mid) >= goal) hi = mid; else lo = mid; }
    const step = Math.max(1, Math.round(hi * 0.03));
    const cands = []; const seen = new Set();
    const add = n => { if (n < 1 || n > maxN) return; const a = allocFor(n); const t = tot(a); if (!t || seen.has(t)) return; seen.add(t); const pv = run(a, NV); cands.push({ n: t, alloc: a, prob: pv, se: se(pv, NV) }); cands.sort((x, y) => x.n - y.n); };
    for (let k = -3; k <= 3; k++) add(hi + k * step);
    for (let g = 0; g < 8 && !cands.some(c => c.prob >= goal) && cands.length && cands[cands.length - 1].n < maxN; g++) add(cands[cands.length - 1].n + 2 * step);
    // Probabilities are not assumed monotonic: pick the smallest count not contradicted by any larger evaluated count
    let iPick = cands.findIndex((c, i) => cands.slice(i).every(x => x.prob >= goal));
    if (iPick < 0) iPick = cands.findIndex(c => c.prob >= goal);
    const list = cands.map(({ n, prob, se }) => ({ n, prob, se }));
    if (iPick < 0) { const last = cands[cands.length - 1]; return { n: null, max: maxN, prob: last.prob, se: last.se, N: NV, searchN: NS, evaluations, stable: false, candidates: list }; }
    const pick = cands[iPick];
    const nonMonotone = cands.some((c, i) => i > 0 && c.prob < cands[i - 1].prob - 2 * Math.max(c.se, cands[i - 1].se));
    const lowC = cands.find(c => c.prob + 2 * c.se >= goal) || pick;
    const highC = cands.find((c, i) => cands.slice(i).every(x => x.prob - 2 * x.se >= goal)) || null;
    const width = highC ? highC.n - lowC.n : Infinity;
    const stable = !nonMonotone && width <= Math.max(2, Math.round(pick.n * 0.05));
    return { n: pick.n, prob: pick.prob, se: pick.se, alloc: pick.alloc, N: NV, searchN: NS, evaluations, stable, nonMonotone, range: [lowC.n, highC ? highC.n : null], candidates: list };
  };
  const res = {};
  if (fp.totalA) {
    const cs = Object.keys(fp.allocA);
    const items = cs.map(c => ({ w: fp.allocA[c], cap: fp.rowsBy[c].assumed ? fp.allocA[c] * 4 : Math.max(effectiveCap(fp.rowsBy[c]), fp.allocA[c]) }));
    const maxA = Math.min(2000, items.reduce((a, x) => a + x.cap, 0));
    res.A = search(n => { const d = cappedDistribute(n, items); return Object.fromEntries(cs.map((c, i) => [c, d.alloc[i]])); }, maxA);
    res.Acap = maxA;
  }
  const anyIntel = fp.rows.some(r => r.intel);
  const maxB = fp.rows.filter(r => r.allow && !r.assumed && effectiveCap(r) >= F.minSites && (!F.onlyResearched || !anyIntel || r.intel)).reduce((a, r) => a + effectiveCap(r), 0);
  res.B = search(n => optimizeAllocCore(F,fp.rows,n,fp.allocA).alloc, Math.max(10, maxB));
  res.Bmax = maxB; res.goal = goal;
  return res;
}
const pickSim = s => ({ prob: s.prob, medMonths: isFinite(s.medMonths) ? s.medMonths : null, p10AtDeadline: s.p10[s.deadline], p50AtDeadline: s.p50[s.deadline], p90AtDeadline: s.p90[s.deadline], N: s.N });
// Scenario analysis with matched random streams: country modifiers on/off, generic rate and start-up shifts, eligibility bases
function sensitivityCore(payload, progress = () => {}) {
  const P = payload.params, F = payload.fpp; const N = clamp(Math.round(P.sims), 500, 1000); const out = { N };
  if (payload.fp) {
    const fp = payload.fp;
    const variants = [
      ['As modelled', r => r.rate, 0],
      ['Without saturation factor', r => r.rateOverridden ? r.rate : r.rate / (r.satF || 1), 0],
      ['Without comparator-access factor', r => r.rateOverridden ? r.rate : r.rate / (r.socF || 1), 0],
      ['Without both country factors', r => r.rateOverridden ? r.rate : r.rate / ((r.satF || 1) * (r.socF || 1)), 0],
      ['All rates −25%', r => r.rate * 0.75, 0],
      ['All rates +25%', r => r.rate * 1.25, 0],
      ['Start-up +3 months', r => r.rate, 3],
    ];
    out.footprint = variants.map(([label, f, dS], i) => {
      const rowsBy = Object.fromEntries(Object.entries(fp.rowsBy).map(([c, r]) => [c, { ...r, rate: f(r), startup: r.startup + dS }]));
      const tick = (d, t, ph) => progress(i * 2 * t + d, variants.length * 2 * t, 'Sensitivity · ' + label + ' · ' + ph);
      return { label, sponsor: fp.totalA ? pickSim(simulateFootprintCore(P, F, fp.allocA, rowsBy, N, tick)) : null, recommended: pickSim(simulateFootprintCore(P, F, fp.allocB, rowsBy, N, tick)) };
    });
  }
  if (payload.sites && payload.sites.some(s => s.pools)) {
    const sel = payload.selected.length ? new Set(payload.selected) : null;
    out.eligibilityScope = sel ? 'selected sites' : 'all EMR-connected sites';
    out.eligibility = ['lower', 'likely', 'upper'].map(b => {
      const sites = payload.sites.map(x => ({ ...x, eligible: x.pools ? x.pools[b] : x.eligible }));
      const sim = simulateSitesCore({ ...P, sims: N }, sites, sel, (d, t, ph) => progress(d, t, 'Eligibility ' + b + ' · ' + ph));
      return { basis: b, eligible: sites.filter(x => x.emr && (!sel || sel.has(x.id))).reduce((a, x) => a + (x.eligible || 0), 0), pool: Math.round(sim.poolTotal), ...pickSim(sim) };
    });
  }
  return out;
}

return Object.freeze({ VERSION: 'mc-kernels/1', clamp, median, effectiveCap, mulberry32, randn, poisson, largestRemainder, cappedDistribute, summarizeTotals, simulateSitesCore, simulateFootprintCore, optimizeAllocCore, sitesNeededCore, sensitivityCore, pickSim });
});
