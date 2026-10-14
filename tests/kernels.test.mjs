/* Offline tests for the shared numerical engine. No browser, no dependencies:
 *
 *   node --test tests/
 *
 * The kernels are loaded directly from src/mc-kernels.js (no string extraction, no runtime compilation).
 * Parity with the frozen v0.5.0 reference engine and the real Blob worker runs in the browser suites
 * (engine tests and lifecycle tests, step 3 of the app). Matching two executions of the same source is
 * consistency evidence only; the expected-value checks below are independent of the implementation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { embed } from '../tools/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const K = createRequire(import.meta.url)(path.join(ROOT, 'src', 'mc-kernels.js'));
const HTML = fs.readFileSync(path.join(ROOT, 'feasibility-pipeline.html'), 'utf8');

const PARAMS = { target: 300, deadline: 18, consent: 0.6, catchment: 8, actMin: 1, actMax: 4, sims: 400, seed: 42, eligBasis: 'lower' };
const FPP = { budgetMode: 'match', budget: 75, maxShare: 0.35, minSites: 3, capShare: 0.6, enrollShare: 0.7, stagger: 3, sigma: 0.4, satK: 0.25, socBroad: 0.8, socRestricted: 1.0, socLimited: 1.2, defaultStartup: 6, rateScale: 1, shrinkK: 3, keepMin: 0, onlyResearched: 1 };
const SITES = [
  { id: 'a', emr: true, eligible: 40, simRate: 2, simSF: 0.3, rateKnown: true, pools: { lower: 20, likely: 40, upper: 60 } },
  { id: 'b', emr: true, eligible: 12, simRate: 1.2, simSF: 0.4, rateKnown: false, pools: { lower: 6, likely: 12, upper: 30 } },
  { id: 'z', emr: true, eligible: 0, simRate: 1, simSF: 0.3, rateKnown: true, pools: { lower: 0, likely: 0, upper: 0 } },
];
const row = (country, rate, startup, cap, value, o = {}) => ({ country, rate, startup, cap, allow: true, value, assumed: false, intel: false, capOverride: null, satF: 1, socF: 1, rateOverridden: false, ...o });
const ROWS = [row('A', 0.6, 4, 30, 8), row('B', 0.3, 6, 12, 3.5), row('C', 0.9, 8, 4, 9), row('D', 0.5, 5, 20, 6, { allow: false })];
const ROWS_BY = Object.fromEntries(ROWS.map(r => [r.country, r]));
const FP = { rows: ROWS, rowsBy: ROWS_BY, allocA: { A: 10, B: 5 }, allocB: { A: 12, B: 4, C: 4 }, totalA: 15, totalB: 20, budgetB: 20 };
const strip = s => { const { ms, ...rest } = s; return rest; };

test('release is in sync with src/ (tools/build.mjs --check)', () => {
  assert.equal(embed(HTML).html, HTML, 'feasibility-pipeline.html differs from src/: run node tools/build.mjs');
});

test('embedded engine blocks are byte-identical to src/ and carry matching hashes', () => {
  for (const [id, file] of [['mc-kernels', 'mc-kernels.js'], ['mc-worker-adapter', 'mc-worker.js']]) {
    const m = new RegExp(`<script[^>]*id="${id}" data-sha256="([0-9a-f]{64})">\\n([\\s\\S]*?)</script>`).exec(HTML);
    assert.ok(m, `${id} block present`);
    const src = fs.readFileSync(path.join(ROOT, 'src', file), 'utf8').replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n';
    assert.equal(m[2], src, `${id} text equals src/${file}`);
  }
});

test('no runtime code compilation in the release or the engine sources', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*type="text\/plain")[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const sources = scripts + fs.readFileSync(path.join(ROOT, 'src', 'mc-kernels.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src', 'mc-worker.js'), 'utf8');
  assert.doesNotMatch(sources, /\bnew Function\s*\(|[^.\w]eval\s*\(/);
});

test('kernel API is frozen and complete', () => {
  assert.ok(Object.isFrozen(K));
  for (const f of ['mulberry32', 'randn', 'poisson', 'largestRemainder', 'cappedDistribute', 'summarizeTotals', 'simulateSitesCore', 'simulateFootprintCore', 'optimizeAllocCore', 'sitesNeededCore', 'sensitivityCore']) assert.equal(typeof K[f], 'function', f);
  assert.equal(K.VERSION, 'mc-kernels/1');
});

test('seeded runs are reproducible; a different seed gives a different sample', () => {
  for (const seed of [1, 7, 42, 1234, 987654321]) {
    const p = { ...PARAMS, seed };
    assert.deepEqual(strip(K.simulateSitesCore(p, SITES, null)), strip(K.simulateSitesCore(p, SITES, null)));
    assert.deepEqual(K.simulateFootprintCore(p, FPP, FP.allocB, ROWS_BY), K.simulateFootprintCore(p, FPP, FP.allocB, ROWS_BY));
  }
  assert.notDeepEqual(K.simulateSitesCore({ ...PARAMS, seed: 1 }, SITES, null).p50, K.simulateSitesCore({ ...PARAMS, seed: 2 }, SITES, null).p50);
});

test('invariants: zero-eligible sites and empty allocations enroll nobody; pools are never exceeded; quantiles ordered and non-decreasing', () => {
  const zero = K.simulateSitesCore(PARAMS, SITES, new Set(['z']));
  assert.ok(zero.p90.every(v => v === 0) && zero.prob === 0 && zero.poolTotal === 0);
  const none = K.simulateSitesCore(PARAMS, SITES, new Set());
  assert.equal(none.nSites, 0);
  const empty = K.simulateFootprintCore(PARAMS, FPP, {}, ROWS_BY);
  assert.ok(empty.nSites === 0 && empty.p90.every(v => v === 0) && empty.prob === 0);
  for (const seed of [1, 7, 42]) {
    const s = K.simulateSitesCore({ ...PARAMS, seed, catchment: 1, consent: 1, target: 1000 }, SITES, null);
    assert.ok(s.poolCheck.respected && s.poolCheck.maxExcess <= 0, 'finite pool respected');
    for (const x of [s, K.simulateFootprintCore({ ...PARAMS, seed }, FPP, FP.allocB, ROWS_BY)]) {
      for (let m = 0; m <= x.H; m++) {
        assert.ok(x.p10[m] <= x.p25[m] && x.p25[m] <= x.p50[m] && x.p50[m] <= x.p75[m] && x.p75[m] <= x.p90[m], `quantiles ordered at month ${m}`);
        if (m) assert.ok(x.p50[m] >= x.p50[m - 1], `median curve non-decreasing at month ${m}`);
      }
      assert.ok(x.prob >= 0 && x.prob <= 1);
    }
  }
});

test('independent expected values: Poisson footprint mean and a saturated finite pool', () => {
  const fp = K.simulateFootprintCore({ ...PARAMS, sims: 4000, target: 1e6 }, { ...FPP, sigma: 0, stagger: 0 }, { X: 5 }, { X: { country: 'X', rate: 2, startup: 0 } });
  assert.ok(Math.abs(fp.byCountry.X - 5 * 2 * 18) / 180 < 0.02, `footprint mean ${fp.byCountry.X} vs 180`);
  const sim = K.simulateSitesCore({ ...PARAMS, sims: 4000, actMin: 1, actMax: 1, catchment: 1, consent: 0.5, target: 1e6 }, [{ id: 's', emr: true, eligible: 80, simRate: 500, simSF: 0.25, rateKnown: true }], null);
  assert.equal(sim.poolTotal, 30);
  assert.ok(Math.abs(sim.sites[0].expected - 30) / 30 < 0.03, `saturated pool ${sim.sites[0].expected} vs 30`);
});

test('allocation respects hard constraints and integer totals', () => {
  for (const budget of [0, 5, 20, 40, 200]) {
    const { alloc, total, diag } = K.optimizeAllocCore({ ...FPP, keepMin: 2 }, ROWS, budget, FP.allocA);
    assert.ok(total <= budget && total === Object.values(alloc).reduce((a, b) => a + b, 0));
    assert.ok(!alloc.D, 'excluded country gets no sites');
    for (const [c, n] of Object.entries(alloc)) assert.ok(n > 0 && n <= ROWS_BY[c].cap, `${c} within its cap`);
    assert.equal(diag.allocated, total);
  }
  for (const [t, w] of [[10, [1, 1, 1]], [7, [0, 0, 0]], [100, [3, 2, 0.5, 0]], [0, [1, 2]]]) assert.equal(K.largestRemainder(t, w).reduce((a, b) => a + b, 0), w.length ? t : 0);
});

function runInWorker(message) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(ROOT, 'tests', 'worker-shim.cjs'));
    const seen = { ready: false, progress: 0 };
    w.on('message', msg => {
      if (msg.type === 'ready') { seen.ready = true; w.postMessage(message); return; }
      if (msg.type === 'progress') { assert.equal(msg.runId, message.runId); assert.equal(msg.inputFingerprint, message.inputFingerprint); seen.progress++; return; }
      w.terminate(); msg.type === 'result' ? resolve({ msg, seen }) : reject(new Error(msg.message));
    });
    w.on('error', reject);
  });
}

test('worker adapter: message protocol and results identical to direct kernel calls', async () => {
  const payload = { params: { ...PARAMS, sims: 300 }, fpp: FPP, sites: SITES, selected: ['a', 'z'], fp: FP };
  const { msg, seen } = await runInWorker({ type: 'run', runId: 7, inputFingerprint: 'abc', payload });
  assert.ok(seen.ready && seen.progress > 0);
  assert.equal(msg.runId, 7); assert.equal(msg.inputFingerprint, 'abc');
  const r = msg.result;
  assert.deepEqual(strip(r.sim), strip(K.simulateSitesCore(payload.params, SITES, null)));
  assert.deepEqual(strip(r.portfolioSim), strip(K.simulateSitesCore(payload.params, SITES, new Set(['a', 'z']))));
  assert.deepEqual(r.simA, K.simulateFootprintCore(payload.params, FPP, FP.allocA, ROWS_BY));
  assert.deepEqual(r.simB, K.simulateFootprintCore(payload.params, FPP, FP.allocB, ROWS_BY));
});

test('worker adapter: sensitivity pools are ordered lower ≤ central assumed ≤ upper; outcomes follow when recruitment is pool-limited', async () => {
  const payload = { params: { ...PARAMS, sims: 600, target: 50 }, fpp: FPP, sites: SITES, selected: [], fp: null };
  const { msg } = await runInWorker({ type: 'sensitivity', runId: 1, inputFingerprint: 'x', payload });
  const e = msg.result.eligibility;
  assert.deepEqual(e.map(x => x.basis), ['lower', 'likely', 'upper']);
  assert.deepEqual(msg.result, K.sensitivityCore(payload));
  assert.ok(e[0].pool <= e[1].pool && e[1].pool <= e[2].pool);
  // Site rates scale with eligibility relative to the median site, so a larger but differently shaped pool can recruit more
  // slowly when rate-limited (documented model property). Outcome ordering is only an invariant when pools bind.
  for (const seed of [1, 7, 42, 1234, 987654321]) {
    const b = K.sensitivityCore({ ...payload, params: { ...payload.params, seed, catchment: 0.5, consent: 0.5 } }).eligibility;
    assert.ok(b[0].p50AtDeadline <= b[1].p50AtDeadline && b[1].p50AtDeadline <= b[2].p50AtDeadline, `seed ${seed}: ${b.map(x => x.p50AtDeadline)}`);
  }
});
