#!/usr/bin/env python3
"""Compares the v0.9.3 engine with v0.9.4 (comparators matched on planned patients per site) on the re-run back-tests,
and calibrates the trial-level σ rule for matched comparators.

    python3 stress-test/analysis/compare_v094.py stress-test/results-v094-rerun.jsonl

Input: JSON lines from rerun_backtests.cjs (--holdout --grid). Both engines are evaluated on the same registry snapshot
per trial. Timing = months from the first simulated patient to the target vs the published recruitment months; ranges =
p10–p90 participants randomised by the first patient + the actual months, as in the stress-test report.
σ calibration: for each candidate k, σ = clamp(k × weighted SD of matched comparators' log rates, 0.3, 0.9) (0.9 with fewer
than 5 comparators); the p10/p90 for that σ are interpolated (in log counts) from the σ grid. k is chosen on round 3 only;
rounds 1–2 and the hold-out are the check.
"""
import json, math, sys
import numpy as np

rows = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
bt = [r for r in rows if r['round'] != 'holdout']
ho = [r for r in rows if r['round'] == 'holdout']
GRID = sorted(float(k) for k in rows[0]['configs']['grid'])


def metrics(rs, cfg):
    A = np.array([r['actualMonths'] for r in rs], float); F = np.array([r['configs'][cfg]['fpiMonths'] for r in rs], float)
    n = np.array([r['actualN'] for r in rs], float)
    lo = np.array([r['configs'][cfg]['r10'] for r in rs], float); hi = np.array([r['configs'][cfg]['r90'] for r in rs], float)
    e = F / A - 1; lr = np.log(F / A)
    return {'n': len(rs), 'mae': np.median(np.abs(e)), 'w25': np.mean(np.abs(e) <= .25), 'w50': np.mean(np.abs(e) <= .5), 'bias': np.median(e),
            'logrmse': math.sqrt(np.mean(lr ** 2)), 'cover': np.mean((n >= lo) & (n <= hi)), 'below': np.mean(n < lo), 'above': np.mean(n > hi),
            'width': np.median(hi / np.maximum(lo, 1))}


def row(label, rs):
    a, b = metrics(rs, 'v093'), metrics(rs, 'v094')
    f = lambda m: f"{100 * m['mae']:.0f}% / {100 * m['bias']:+.0f}% / {m['logrmse']:.2f} / {100 * m['cover']:.0f}% / {m['width']:.1f}×"
    return f"| {label} | {a['n']} | {f(a)} | {f(b)} |"


def sigma_for(r, k, lo=0.3, hi=0.9):
    sd = r['configs']['v094'].get('sdLog')
    return hi if sd is None else min(hi, max(lo, k * sd))


def interp_range(r, s):
    g = {float(k): v for k, v in r['configs']['grid'].items()}; xs = GRID
    s = min(max(s, xs[0]), xs[-1]); j = max(i for i, x in enumerate(xs) if x <= s); j2 = min(j + 1, len(xs) - 1)
    t = 0 if j2 == j else (s - xs[j]) / (xs[j2] - xs[j])
    def li(idx):
        a, b = max(g[xs[j]][idx], 0.5), max(g[xs[j2]][idx], 0.5)
        return math.exp((1 - t) * math.log(a) + t * math.log(b))
    return li(0), li(2)


def coverage(rs, k):
    inside, widths = [], []
    for r in rs:
        lo, hi = interp_range(r, sigma_for(r, k)); inside.append(lo <= r['actualN'] <= hi); widths.append(hi / max(lo, 1))
    return np.mean(inside), np.median(widths)


def main():
    print(f'# v0.9.3 vs v0.9.4 on {len(bt)} re-run back-tests (+ {len(ho)} hold-out)\n')
    print('Cells: median abs. timing error / median bias / log-RMSE / actual inside 80% range / median range width (p90/p10)\n')
    print('| Group | Trials | v0.9.3 | v0.9.4 |\n|---|---|---|---|')
    F3 = np.array([r['configs']['v093']['fpiMonths'] for r in bt], float); q = np.percentile(F3, [100 / 3, 200 / 3])
    groups = [('All', bt), ('Rounds 1–2', [r for r in bt if r['round'] in (1, 2)]), ('Round 3', [r for r in bt if r['round'] == 3]),
              ('< 30 usable comparators', [r for r in bt if r['usable'] < 30]), ('≥ 30 usable comparators', [r for r in bt if r['usable'] >= 30]),
              ('Shortest third of v0.9.3 forecasts', [r for r, f in zip(bt, F3) if f <= q[0]]),
              ('Middle third', [r for r, f in zip(bt, F3) if q[0] < f <= q[1]]), ('Longest third', [r for r, f in zip(bt, F3) if f > q[1]])]
    for lab, rs in groups:
        if rs:
            print(row(lab, rs))
    matched = [r for r in bt if (r['configs']['v094'].get('match') or {}).get('applied', True) and (r['configs']['v094'].get('match') or {}).get('source')]
    print(f"\nMatching applied in {len(matched)} of {len(bt)} trials (the others have fewer than 5 effective comparators with a similar load, "
          f"or fewer than 3 usable comparators, and keep the v0.9.3 weighting); planned load clamped in {sum(1 for r in matched if r['configs']['v094']['match'].get('clamped'))}.")
    A = np.array([r['actualMonths'] for r in bt], float)
    loo = np.array([np.median(np.delete(A, i)) for i in range(len(A))])
    for cfg in ('v093', 'v094'):
        F = np.array([r['configs'][cfg]['fpiMonths'] for r in bt], float)
        print(f"{cfg}: slope of log(actual) on log(forecast) {np.polyfit(np.log(F), np.log(A), 1)[0]:.2f} (1 = well scaled)")
    print(f"Rule of thumb (median duration of the other trials): median abs. error {100 * np.median(np.abs(loo / A - 1)):.0f}%, "
          f"log-RMSE {math.sqrt(np.mean(np.log(loo / A) ** 2)):.2f}.")

    print('\n## σ rule for matched comparators: σ = clamp(k × SD, 0.3, 0.9)\n')
    r3 = [r for r in bt if r['round'] == 3]; r12 = [r for r in bt if r['round'] in (1, 2)]
    print('| k | Round 3 coverage / width | Rounds 1–2 coverage / width | All coverage / width |\n|---|---|---|---|')
    for k in [0.6, 0.8, 1.0, 1.2, 1.4, 1.6]:
        c3, c12, ca = coverage(r3, k), coverage(r12, k), coverage(bt, k)
        print(f'| {k:.1f} | {100 * c3[0]:.0f}% / {c3[1]:.1f}× | {100 * c12[0]:.0f}% / {c12[1]:.1f}× | {100 * ca[0]:.0f}% / {ca[1]:.1f}× |')
    v093cov = metrics(bt, 'v093')
    print(f"\nv0.9.3 for reference: coverage {100 * v093cov['cover']:.0f}%, width {v093cov['width']:.1f}×. "
          f"Interpolation check (k = 0.8 equals the v0.9.4 run's own rule): interpolated {100 * coverage(bt, 0.8)[0]:.0f}% vs simulated {100 * metrics(bt, 'v094')['cover']:.0f}%.")
    for r in ho:
        a, b = r['configs']['v093'], r['configs']['v094']
        print(f"\nHold-out {r['name']}: actual {r['actualMonths']} months, {r['actualN']} randomised. v0.9.3 {a['fpiMonths']} months, range {a['r10']}–{a['r90']}; "
              f"v0.9.4 {b['fpiMonths']} months, range {b['r10']}–{b['r90']} (σ {b['sigmaTrial']}).")


if __name__ == '__main__':
    main()
