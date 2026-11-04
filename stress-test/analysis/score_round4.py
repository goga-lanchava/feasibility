"""Scores round-4 back-test results (JSON lines from run_round4.cjs).

  python stress-test/analysis/score_round4.py results.jsonl [more.jsonl ...] [--by phase|stratum|area|thin]

Enrolment: actual participants by the first patient + actual recruitment months vs the forecast p10–p90 / p50
  (all trials; withdrawn ones have 0 enrolled). Error = p50/actual − 1; optimistic = forecast more than actual.
Duration (completed trials only): months from first patient to target vs forecast p10–p90 (dur10…dur90; a missing
  dur90 means beyond the simulated horizon, i.e. open-ended); error = p50/actual − 1; optimistic = forecast shorter.
"""
import json, sys, statistics as st, math

def load(paths):
    rows = []
    for p in paths:
        rows += [json.loads(l) for l in open(p, encoding='utf8') if l.strip()]
    return rows

def enrol(r):
    a = r['actualN']
    inside = r['r10'] <= a <= r['r90']
    err = (r['r50'] / a - 1) if a > 0 else None
    return inside, err, r['r50'] > a

def duration(r):
    if r['stratum'] != 'completed': return None
    a = r['actualMonths']
    lo = r['dur10'] if r['dur10'] is not None else math.inf
    hi = r['dur90'] if r['dur90'] is not None else math.inf
    p50 = r['dur50'] if r['dur50'] is not None else (r['fpiMonths'] or math.inf)
    err = (p50 / a - 1) if math.isfinite(p50) else None
    return lo <= a <= hi, err, p50 < a

def summary(rows):
    E = [enrol(r) for r in rows]
    D = [d for d in (duration(r) for r in rows) if d]
    def block(X):
        if not X: return {'n': 0}
        errs = [e for _, e, _ in X if e is not None]
        return {'n': len(X), 'coverage': sum(i for i, _, _ in X) / len(X),
                'median_abs_err': st.median(abs(e) for e in errs) if errs else None,
                'median_err': st.median(errs) if errs else None,
                'optimistic_share': sum(o for _, _, o in X) / len(X),
                'below_p10': None}
    e, d = block(E), block(D)
    e['below_p10'] = sum(r['actualN'] < r['r10'] for r in rows) / len(rows) if rows else None
    e['above_p90'] = sum(r['actualN'] > r['r90'] for r in rows) / len(rows) if rows else None
    return e, d

def fmt(lbl, e, d):
    pc = lambda x: '—' if x is None else f'{100*x:.0f}%'
    sg = lambda x: '—' if x is None else f'{100*x:+.0f}%'
    return (f"{lbl:<26} enrol n={e['n']:>3} in P10–P90 {pc(e.get('coverage')):>4} (below {pc(e.get('below_p10'))}, above {pc(e.get('above_p90'))}) "
            f"median |err| {pc(e.get('median_abs_err')):>5} median err {sg(e.get('median_err')):>6} optimistic {pc(e.get('optimistic_share')):>4} | "
            f"duration n={d['n']:>3} in P10–P90 {pc(d.get('coverage')):>4} median |err| {pc(d.get('median_abs_err')):>5} median err {sg(d.get('median_err')):>6} optimistic {pc(d.get('optimistic_share')):>4}")

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    by = sys.argv[sys.argv.index('--by') + 1] if '--by' in sys.argv else None
    if by: args = [a for a in args if a != by]
    cfg = sys.argv[sys.argv.index('--config') + 1] if '--config' in sys.argv else None
    if cfg: args = [a for a in args if a != cfg]
    rows = load(args)
    if cfg: rows = [{**r, **r['configs'][cfg]} for r in rows]
    rows = [r for r in rows if r['sitesSim'] > 0 or r['r90'] > 0]  # no forecast produced: reported separately
    print(fmt('ALL', *summary(rows)))
    if by:
        key = {'thin': lambda r: 'usable<10' if r['usable'] < 10 else 'usable<30' if r['usable'] < 30 else 'usable≥30',
               'phase': lambda r: r['phase'].replace('PHASE', 'P')}.get(by, lambda r: r[by])
        for k in sorted({key(r) for r in rows}):
            print(fmt(f'  {by}={k}', *summary([r for r in rows if key(r) == k])))
