/* In-page harness (run via the browser pane's javascript_tool, NOT headless): back-tests 20 trials with Gemini protocol parsing.
 * The Gemini key is taken from the already-configured AI.gemini.key in the open page; it is never read out, logged or saved.
 * Per trial: registry snapshot as of start -> rules parse + forecast -> Gemini parse + forecast, same snapshot. Results -> window.G20. */
window.G20 = { rows: [], log: [], done: false };
(async () => {
  const trials = await (await fetch('stress-test/gemini-run20-inputs.json')).json();
  const realRender = renderAll; renderAll = () => {}; UX_IO.confirm = () => true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (const t of trials) {
    const t0 = Date.now(), row = { id: t.id, name: t.name, round: t.round, actualN: t.n, actualMonths: t.months };
    try {
      Object.assign(S.brief, { condition: t.cond, since: t.since, asOf: t.asOf, sponsorFootprint: t.footprint, plannedSites: undefined });
      S.params.target = t.n; S.params.deadline = t.months + 6;
      if (!t.footprint) { S.brief.plannedSites = t.sites; S.fpp.budgetMode = 'custom'; S.fpp.budget = t.sites; }
      S.protocolText = t.proto;
      await collectRegistry();
      const read = () => {
        const sim = S.fp.simA || S.fp.simB, f = fpiDuration(sim), m = Math.min(sim.p10.length - 1, (f ? f.first : 7) + t.months);
        return { fpiMonths: f ? f.months : null, extrapolated: f ? f.approx : null, r10: sim.p10[m], r50: sim.p50[m], r90: sim.p90[m], prob: sim.prob, medMonths: sim.medMonths };
      };
      runRules(); row.rulesCriteria = S.criteria.length; computeFootprint(false); row.rules = read(); row.usable = S.web.global.dq.usedForRates;
      let res = null, err = null;
      for (let a = 1; a <= 3 && !res; a++) {
        try { res = await parseProtocolGemini(t.proto, {}); } catch (e) {
          err = `${e.kind || ''}: ${String(e.message).slice(0, 160)}`;
          if (e.kind === 'quota' || e.kind === 'server' || e.kind === 'timeout' || e.kind === 'malformed') await sleep(20000); else break;
        }
      }
      if (res) {
        applyParse(res); recompute(); row.gemCriteria = S.criteria.length; row.gemManual = S.criteria.filter(c => c.type === 'manual').length;
        row.gemMs = Math.round(res.info.ms); row.gemTokens = res.info.usage; computeFootprint(false); row.gemini = read();
      } else row.geminiError = err;
    } catch (e) { row.error = String(e.message).slice(0, 200); }
    row.seconds = Math.round((Date.now() - t0) / 1000); G20.rows.push(row); G20.log.push(`${t.id} ${row.seconds}s ${row.geminiError || row.error || 'ok'}`);
    await sleep(4000);
  }
  renderAll = realRender; G20.done = true;
})();
