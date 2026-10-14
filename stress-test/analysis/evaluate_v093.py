#!/usr/bin/env python3
"""Evaluation of the v0.9.3 back-test (57 completed trials): forecast skill, calibration and candidate improvements.

    python3 stress-test/analysis/evaluate_v093.py            # uses the committed comparator snapshot
    python3 stress-test/analysis/evaluate_v093.py --refetch  # rebuilds the snapshot from ClinicalTrials.gov first

Inputs (all in stress-test/): results-v093-all57.json, results-round3.json, inputs*.json and
analysis/comparators-asof-start.json.gz. Needs numpy. Every number in EVALUATION-v0.9.3.md comes from this script.

Comparator rules replicate the application's back-test mode (aggregateWeb / sizeMatchedRates in feasibility-pipeline.html):
completed industry phase 2/3 trials for the condition, started within 12 years before the trial's start and finished by it;
per-site rate = actual enrollment / listed locations / (start→primary completion × 0.7, or × 0.5 when the primary-outcome
follow-up is ≥ 60% of that span), using trials with ≥ 3 locations. For KEYNOTE-407 the replica gives exactly the
application's 349 usable comparators and size-weighted rate 0.291.
"""
import datetime, gzip, json, math, os, re, sys, time, urllib.parse, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.dirname(HERE)
SNAP = os.path.join(HERE, 'comparators-asof-start.json.gz')
Z80 = 1.2816  # standard-normal quantile for a central 80% interval


def load_trials():
    res = json.load(open(os.path.join(ST, 'results-v093-all57.json')))
    rows = [dict(zip(res['columns'], r)) for r in res['rows']]
    inp = {}
    for f in ['inputs.json', 'inputs-round2.json', 'inputs-round3.json']:
        for t in json.load(open(os.path.join(ST, f))):
            inp[t['id']] = t
    out = []
    for r in rows:
        t = inp[r['id']]
        fp = [l.rsplit(':', 1) for l in t.get('footprint', '').splitlines() if ':' in l]
        fp_sites = sum(int(n) for _, n in fp if n.strip().isdigit())
        out.append({**r, 'name': t.get('name'), 'cond': t['cond'], 'n': r['actualN'], 'A': r['actualMonths'],
                    'F': r['forecastMonthsFromFirstPatient'], 'S': fp_sites or t.get('sites')})
    return out


# ---------- comparator snapshot ----------
MON = {m: i + 1 for i, m in enumerate('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split())}


def as_of(t):
    if t.get('start'):
        return t['start'][:10] if len(t['start']) >= 10 else t['start'][:7] + '-01'
    m = re.match(r'(\w{3})\w*\s+(\d{4})', t.get('period', ''))
    return f"{m.group(2)}-{MON[m.group(1)]:02d}-01"


def refetch():
    fields = 'NCTId,EnrollmentCount,EnrollmentType,StartDate,PrimaryCompletionDate,LocationCountry,PrimaryOutcomeTimeFrame'
    inp = {}
    for f in ['inputs.json', 'inputs-round2.json', 'inputs-round3.json']:
        for t in json.load(open(os.path.join(ST, f))):
            inp[t['id']] = t
    inp['NCT02775435'] = {'cond': 'Non-small cell lung cancer', 'start': '2016-06-09'}  # KEYNOTE-407 hold-out
    trials = {}
    for nct, t in inp.items():
        a = as_of(t); since = int(a[:4]) - 12; comps = []; tok = None
        while True:
            q = {'query.cond': t['cond'], 'filter.overallStatus': 'COMPLETED',
                 'filter.advanced': f'AREA[StartDate]RANGE[{since}-01-01,{a}] AND AREA[PrimaryCompletionDate]RANGE[MIN,{a}]',
                 'aggFilters': 'studyType:int,phase:2 3,funderType:industry', 'pageSize': '1000', 'format': 'json', 'fields': fields}
            if tok:
                q['pageToken'] = tok
            for attempt in range(4):
                try:
                    with urllib.request.urlopen('https://clinicaltrials.gov/api/v2/studies?' + urllib.parse.urlencode(q), timeout=90) as r:
                        j = json.load(r)
                    break
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(2 ** attempt)
            for s in j.get('studies', []):
                p = s.get('protocolSection', {}); dm = p.get('designModule', {}); sm = p.get('statusModule', {})
                ei = dm.get('enrollmentInfo') or {}
                comps.append({'nct': p.get('identificationModule', {}).get('nctId'), 'enroll': ei.get('count'), 'etype': ei.get('type'),
                              'start': (sm.get('startDateStruct') or {}).get('date'), 'pcd': (sm.get('primaryCompletionDateStruct') or {}).get('date'),
                              'nloc': len((p.get('contactsLocationsModule') or {}).get('locations') or []),
                              'tf': [o.get('timeFrame', '') for o in (p.get('outcomesModule') or {}).get('primaryOutcomes') or []]})
            tok = j.get('nextPageToken')
            if not tok or len(comps) >= 3000:
                break
        trials[nct] = {'cond': t['cond'], 'asOf': a, 'since': since, 'comps': [c for c in comps if c['nct'] != nct]}
        print(f'  {nct} {t["cond"][:40]:40s} as of {a}: {len(trials[nct]["comps"])} completed', flush=True)
    meta = {'note': 'see evaluate_v093.py', 'retrieved': datetime.date.today().isoformat(), 'source': 'https://clinicaltrials.gov/api/v2/studies', 'trials': trials}
    with gzip.open(SNAP, 'wt', compresslevel=9) as g:
        json.dump(meta, g, separators=(',', ':'))


UNIT = {'day': 1 / 30.44, 'week': 12 / 52.18, 'month': 1, 'year': 12}


def followup_months(tfs):
    best = None
    for tf in tfs:
        for m in re.finditer(r'(\d+(?:\.\d+)?)\s*(?:(?:-|to|–)\s*\d+(?:\.\d+)?\s*)?(day|week|month|year)s?\b', re.sub(r'(\d),(\d{3})', r'\1\2', tf.lower())):
            v = float(m.group(1)) * UNIT[m.group(2)]
            if 0 < v < 240 and (best is None or v > best):
                best = v
    return best


def pdate(s):
    try:
        return datetime.date.fromisoformat(s if len(s) == 10 else s + '-01')
    except Exception:
        return None


def usable_comparators(comps):
    out = []
    for c in comps:
        a, b = pdate(c['start'] or ''), pdate(c['pcd'] or '')
        if not a or not b or c['etype'] != 'ACTUAL' or c['nloc'] < 3 or not c['enroll'] or c['enroll'] <= 0:
            continue
        span = (b - a).days / 30.44
        if span <= 0:
            continue
        f = followup_months(c['tf'])
        em = max(3, span * (0.5 if f is not None and f >= 0.6 * span else 0.7))
        out.append({'rate': c['enroll'] / c['nloc'] / em, 'n': c['enroll'], 'pps': c['enroll'] / c['nloc'], 'em': em})
    return out


def wmed(vals, w):
    o = np.argsort(vals); v = np.asarray(vals)[o]; ww = np.asarray(w)[o]
    return v[np.searchsorted(np.cumsum(ww), ww.sum() / 2)]


def kern(x, t, bw):  # the application's size kernel: weight 0.61 at bw× larger or smaller
    return np.exp(-0.5 * (np.log(x / t) / np.log(bw)) ** 2)


# ---------- metrics ----------
def metrics(P, A):
    e = P / A - 1; lr = np.log(P / A)
    return {'mae': np.median(np.abs(e)), 'w25': np.mean(np.abs(e) <= .25), 'w50': np.mean(np.abs(e) <= .5), 'bias': np.median(e),
            'logrmse': math.sqrt(np.mean(lr ** 2)), 'width80': math.exp(2 * Z80 * lr.std(ddof=1))}


def line(label, P, A, extra=''):
    m = metrics(P, A)
    return (f"| {label} | {100 * m['mae']:.0f}% | {100 * m['w25']:.0f}% | {100 * m['w50']:.0f}% | {100 * m['bias']:+.0f}% | "
            f"{m['logrmse']:.2f} | {m['width80']:.1f}× |{extra}")


HDR = '| Method | Median abs. error | Within ±25% | Within ±50% | Median bias | Log-RMSE | Honest 80% width |\n|---|---|---|---|---|---|---|'


def main():
    if '--refetch' in sys.argv:
        print('Rebuilding comparator snapshot from ClinicalTrials.gov…'); refetch()
    T = load_trials(); N = len(T)
    A = np.array([t['A'] for t in T], float); F = np.array([t['F'] for t in T], float)
    n = np.array([t['n'] for t in T], float); S = np.array([t['S'] for t in T], float)
    p10, p50, p90 = (np.array([t[k] for t in T], float) for k in ('p10', 'p50', 'p90'))
    thin = np.array([t['thinEvidenceFlag'] for t in T]); rnd = np.array([t['round'] for t in T])

    print(f'# Evaluation of v0.9.3 on {N} back-tested trials\n')
    print('## 1. Point forecast vs naive baselines (months from first patient to target)\n')
    print(HDR)
    print(line('Tool v0.9.3 median', F, A))
    loo = lambda f: np.array([f(np.arange(N) != i, i) for i in range(N)])
    print(line('Naive: median duration of the other 56 trials', loo(lambda m, i: np.median(A[m])), A))
    rate = n / (S * A)
    print(line('Naive: target ÷ (sites × median per-site rate of the other trials)', loo(lambda m, i: n[i] / (S[i] * np.median(rate[m]))), A))
    print(f'\nActual per-site rate: median {np.median(rate):.2f}, p10 {np.percentile(rate, 10):.2f}, p90 {np.percentile(rate, 90):.2f} patients/site/month.')

    print('\n## 2. Calibration of the median: grouped by outcome vs by forecast\n')
    b = np.polyfit(np.log(F), np.log(A), 1)
    print(f'log(actual) = {b[0]:.2f} × log(forecast) + {b[1]:.2f}; corr = {np.corrcoef(np.log(F), np.log(A))[0, 1]:.2f} (slope 1 = well scaled; < 1 = forecasts too spread out)\n')
    print('| Grouped by | Tercile 1 (short) | Tercile 2 | Tercile 3 (long) |\n|---|---|---|---|')
    for lab, grp in [('actual duration (known only afterwards)', A), ('forecast duration (known when planning)', F)]:
        q = np.percentile(grp, [100 / 3, 200 / 3]); cells = []
        for lo, hi in [(-1, q[0]), (q[0], q[1]), (q[1], 1e9)]:
            m = (grp > lo) & (grp <= hi); cells.append(f'{100 * np.median(F[m] / A[m] - 1):+.0f}% (n={m.sum()})')
        print(f'| {lab} | ' + ' | '.join(cells) + ' |')

    print('\n## 3. Ranges (participants randomized by the actual deadline)\n')
    w = p90 / p10; res = np.log(n / p50)
    print(f'Below p10 {100 * np.mean(n < p10):.0f}% (nominal 10), below p50 {100 * np.mean(n < p50):.0f}% (50), above p90 {100 * np.mean(n > p90):.0f}% (10); '
          f'inside 80% range {100 * np.mean((n >= p10) & (n <= p90)):.0f}%.')
    print(f'Range width p90/p10: median {np.median(w):.1f}× (IQR {np.percentile(w, 25):.1f}–{np.percentile(w, 75):.1f}×).')

    print('\n## 4. Post-hoc corrections of the median (leave-one-out regression on log months)\n')
    X = {'log forecast': np.log(F), 'log planned patients/site': np.log(n / S), 'log sites': np.log(S), 'log target': np.log(n)}
    la = np.log(A)
    print('| Model | Median abs. error | Log-RMSE | LOO 80% coverage | 80% width |\n|---|---|---|---|---|')
    for cols in [[], ['log forecast'], ['log forecast', 'log planned patients/site']]:
        P = np.zeros(N); cov = 0; wid = []
        for i in range(N):
            m = np.arange(N) != i; M = np.column_stack([np.ones(N)] + [X[c] for c in cols])
            beta, *_ = np.linalg.lstsq(M[m], la[m], rcond=None); r = la[m] - M[m] @ beta
            s = math.sqrt(np.sum(r ** 2) / (m.sum() - M.shape[1])); P[i] = M[i] @ beta
            cov += abs(la[i] - P[i]) <= Z80 * s; wid.append(math.exp(2 * Z80 * s))
        P = np.exp(P)
        print(f"| log actual ~ {' + '.join(cols) or 'constant'} | {100 * np.median(np.abs(P / A - 1)):.0f}% | {math.sqrt(np.mean(np.log(P / A) ** 2)):.2f} | {100 * cov / N:.0f}% | {np.median(wid):.1f}× |")
    M = np.column_stack([np.ones(N), X['log forecast'], X['log planned patients/site']])
    beta, *_ = np.linalg.lstsq(M[rnd == 3], la[rnd == 3], rcond=None); Pt = np.exp(M[rnd < 3] @ beta)
    print(f"\nOut-of-sample check: fitted on round 3 (48 trials), applied to rounds 1–2 (9 large trials): median abs. error "
          f"{100 * np.median(np.abs(F[rnd < 3] / A[rnd < 3] - 1)):.0f}% (tool) → {100 * np.median(np.abs(Pt / A[rnd < 3] - 1)):.0f}% (corrected). "
          'A fitted output correction does not transfer.')

    print('\n## 5. Comparator weighting (same trials, months = target ÷ (sites × comparator rate))\n')
    snap = json.load(gzip.open(SNAP, 'rt'))['trials']
    keep, R = [], {k: [] for k in ['plain', 'size', 'pps2', 'pps3', 'both', 'ref']}
    for i, t in enumerate(T):
        C = usable_comparators(snap[t['id']]['comps'])
        if len(C) < 3:
            continue
        r = np.array([c['rate'] for c in C]); cn = np.array([c['n'] for c in C]); cp = np.array([c['pps'] for c in C]); em = np.array([c['em'] for c in C])
        pps = n[i] / S[i]; keep.append(i)
        R['plain'].append(np.median(r)); R['size'].append(wmed(r, kern(cn, n[i], 4)))
        R['pps2'].append(wmed(r, kern(cp, pps, 2))); R['pps3'].append(wmed(r, kern(cp, pps, 3)))
        R['both'].append(wmed(r, kern(cn, n[i], 4) * kern(cp, pps, 3))); R['ref'].append(wmed(em, kern(cn, n[i], 4) * kern(cp, pps, 3)))
    k = np.array(keep); Ak, nk, Sk, Fk = A[k], n[k], S[k], F[k]; R = {key: np.array(v) for key, v in R.items()}
    print(f'{len(k)} of {N} trials have ≥ 3 usable comparators.\n')
    print(HDR)
    print(line('Tool v0.9.3 (reference)', Fk, Ak))
    for key, lab in [('plain', 'Plain median of comparators'), ('size', 'Size-weighted (current “Weight comparators by size”)'),
                     ('pps2', '**Matched on planned patients per site (×2 kernel)**'), ('pps3', 'Matched on planned patients per site (×3 kernel)'),
                     ('both', 'Size and patients-per-site matched')]:
        print(line(lab, nk / (Sk * R[key]), Ak))
    print(line('Reference class: weighted median recruitment months of similar trials', R['ref'], Ak))

    Fn = Fk * R['size'] / R['pps2']  # the tool's forecast with its global rate swapped for the patients-per-site matched rate
    print('\nTool forecast with patients-per-site matching (approximation: forecast × size-weighted rate ÷ matched rate):\n')
    print('| Group | Trials | Tool: median abs. error / bias | With matching: median abs. error / bias |\n|---|---|---|---|')
    q = np.percentile(Fk, [100 / 3, 200 / 3]); th = thin[k]; rd = rnd[k]
    fmt = lambda P, m: f'{100 * np.median(np.abs(P[m] / Ak[m] - 1)):.0f}% / {100 * np.median(P[m] / Ak[m] - 1):+.0f}%'
    for lab, m in [('All', np.ones(len(k), bool)), ('Rounds 1–2 (large trials)', rd < 3), ('Round 3', rd == 3), ('Thin evidence (< 30)', th == 1),
                   ('≥ 30 comparators', th == 0), ('Shortest third of forecasts', Fk <= q[0]), ('Middle third', (Fk > q[0]) & (Fk <= q[1])),
                   ('Longest third of forecasts', Fk > q[1])]:
        print(f'| {lab} | {m.sum()} | {fmt(Fk, m)} | {fmt(Fn, m)} |')
    print(f"\nHonest 80% width {metrics(Fk, Ak)['width80']:.1f}× → {metrics(Fn, Ak)['width80']:.1f}×; "
          f"slope of log(actual) on log(forecast) {np.polyfit(np.log(Fk), np.log(Ak), 1)[0]:.2f} → {np.polyfit(np.log(Fn), np.log(Ak), 1)[0]:.2f}.")

    k4 = snap.get('NCT02775435')
    if k4:
        C = usable_comparators(k4['comps']); r = np.array([c['rate'] for c in C])
        size = wmed(r, kern(np.array([c['n'] for c in C]), 559, 4)); pp = wmed(r, kern(np.array([c['pps'] for c in C]), 559 / 125, 2))
        print(f'\nKEYNOTE-407 hold-out: {len(C)} usable comparators, size-weighted rate {size:.3f}, patients-per-site matched {pp:.3f}, '
              f'actual {559 / (125 * 16):.3f}; tool forecast 13 months → ≈{13 * size / pp:.1f} with matching (actual 16).')


if __name__ == '__main__':
    main()
