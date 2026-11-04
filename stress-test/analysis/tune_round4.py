"""Ranks engine configurations from a multi-config run_round4.cjs result file by a sharpness/coverage trade-off.

  python stress-test/analysis/tune_round4.py results.jsonl [--weights 0.88,0.12]

Per trial (enrolment, withdrawn trials excluded: their 0 has no log): the 80% interval score on the log scale,
  IS = ln(P90) − ln(P10) + 10·max(0, ln P10 − ln y) + 10·max(0, ln y − ln P90)     (+1 on every count)
which is lowest for the narrowest range that still holds the result (Gneiting & Raftery 2007). Strata are re-weighted
to a realistic portfolio (default 88% completed, 12% terminated for poor enrolment) instead of the failure-enriched sample.
"""
import json, sys, math, statistics as st

args = [a for a in sys.argv[1:] if not a.startswith('--')]
w = sys.argv[sys.argv.index('--weights') + 1] if '--weights' in sys.argv else '0.88,0.12'
if w in args: args.remove(w)
WC, WT = map(float, w.split(','))
rows = [json.loads(l) for p in args for l in open(p, encoding='utf8') if l.strip()]
rows = [r for r in rows if r['stratum'] != 'withdrawn']
cfgs = list(rows[0]['configs'])
L = lambda x: math.log(1 + max(0, x or 0))

def score(c):
    acc = {'completed': [], 'terminated': []}
    for r in rows:
        f = r['configs'][c]
        if not (f['r90'] > 0): continue
        y, lo, hi = L(r['actualN']), L(f['r10']), L(f['r90'])
        is80 = hi - lo + 10 * max(0, lo - y) + 10 * max(0, y - hi)
        lo50, hi50 = L(f.get('r25')), L(f.get('r75'))
        acc[r['stratum']].append(dict(is80=is80, in80=lo <= y <= hi, in50=lo50 <= y <= hi50 if f.get('r25') is not None else None,
                                      ratio=(f['r90'] + 1) / (f['r10'] + 1), err=math.exp(L(f['r50']) - y) - 1))
    def wavg(k):
        m = {s: st.mean(x[k] for x in v) for s, v in acc.items() if v and v[0][k] is not None}
        return WC * m.get('completed', 0) + WT * m.get('terminated', 0)
    comp = acc['completed']
    return dict(cfg=c, IS=wavg('is80'), cov80=wavg('in80'), cov50=wavg('in50'),
                ratio=st.median(x['ratio'] for v in acc.values() for x in v),
                comp_cov80=st.mean(x['in80'] for x in comp), comp_bias=st.median(x['err'] for x in comp))

res = sorted((score(c) for c in cfgs), key=lambda d: d['IS'])
print(f"{'config':<22}{'IS80':>7}{'cov80(w)':>10}{'cov50(w)':>10}{'P90/P10':>9}{'compl cov80':>12}{'compl bias':>11}")
for d in res:
    print(f"{d['cfg']:<22}{d['IS']:7.2f}{100*d['cov80']:9.0f}%{100*d['cov50']:9.0f}%{d['ratio']:8.1f}×{100*d['comp_cov80']:11.0f}%{100*d['comp_bias']:+10.0f}%")
