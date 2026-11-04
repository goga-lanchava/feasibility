"""Does protocol strictness explain round-4 forecast errors? (calibration first, then validation)

  python stress-test/analysis/strictness_test.py features.json results.jsonl:config [more.jsonl:config ...]

Primary (pre-specified): strictness = ln(1 + number of parsed eligibility rules).
  - completed trials: Spearman correlation with the forecast error ln((actual+1)/(P50+1)); a negative value means stricter
    protocols recruited slower than forecast;
  - all trials: AUC of strictness for later termination for poor enrolment (completed vs terminated).
Exploratory: the other features. A slope (per unit of ln rules) is fitted on completed trials for a possible rate factor.
"""
import json, sys, math
import numpy as np

def spearman(a, b):
    ra, rb = np.argsort(np.argsort(a)), np.argsort(np.argsort(b))
    return float(np.corrcoef(ra, rb)[0, 1])
def auc(pos, neg):
    return sum((p > n) + 0.5 * (p == n) for p in pos for n in neg) / (len(pos) * len(neg))

feat = {r['id']: r for r in json.load(open(sys.argv[1], encoding='utf8')) if 'error' not in r}
rows = []
for spec in sys.argv[2:]:
    f, cfg = spec.rsplit(':', 1)
    for l in open(f, encoding='utf8'):
        r = json.loads(l); c = r['configs'][cfg]
        if c['r90'] > 0 and r['id'] in feat and r['stratum'] != 'withdrawn':
            rows.append({**r, **c, **feat[r['id']]})
C = [r for r in rows if r['stratum'] == 'completed']; T = [r for r in rows if r['stratum'] == 'terminated']
err = lambda r: math.log((r['actualN'] + 1) / (r['r50'] + 1))
FEATS = {
    'PRIMARY ln(1+rules)': lambda r: math.log(1 + r['nRules']),
    'ln(1+inclusion rules)': lambda r: math.log(1 + r['nInc']),
    'ln(1+exclusion rules)': lambda r: math.log(1 + r['nExc']),
    'ln(chars)': lambda r: math.log(1 + r['chars']),
    'ln(1+bullets)': lambda r: math.log(1 + r['bulletsInc'] + r['bulletsExc']),
    'numeric thresholds': lambda r: r['nNumeric'],
    'lab thresholds': lambda r: r['nLab'],
    'time windows': lambda r: r['nTemporal'],
    'prior-therapy/medication inc': lambda r: r['nIncMed'] + r['nLines'],
    'biomarker inc': lambda r: r['nIncBiomarker'],
    'unparsed (manual) rules': lambda r: r['nManual'],
    'comparator rate (reference)': lambda r: -math.log(r['globalRate']),
}
print(f"n completed {len(C)}, terminated {len(T)}")
print(f"{'feature':<32}{'Spearman vs error (compl.)':>28}{'AUC for failure':>18}")
for name, fn in FEATS.items():
    rho = spearman([fn(r) for r in C], [err(r) for r in C])
    a = auc([fn(r) for r in T], [fn(r) for r in C])
    print(f"{name:<32}{rho:>28.2f}{a:>18.2f}")
x = np.array([math.log(1 + r['nRules']) for r in C]); y = np.array([err(r) for r in C])
X = np.c_[np.ones_like(x), x - x.mean()]; b, *_ = np.linalg.lstsq(X, y, rcond=None)
se = math.sqrt(np.sum((y - X @ b) ** 2) / (len(y) - 2) / np.sum((x - x.mean()) ** 2))
print(f"slope of error on ln(1+rules), completed: {b[1]:+.2f} (SE {se:.2f}); mean ln(1+rules) {x.mean():.2f}")
