// @window 1180,820
// Every series preset: 5 simulated races each must finish legally (only deliberate crew short-stops allowed),
// never run dry, respect max stint and mandatory stop counts. Plus the AER formula against the rulebook's examples.
__run(() => {
  [[480,5],[840,10],[400,4],[320,3],[240,2],[160,1]].forEach(([L,n]) => expect(mandCount({mandPer:80},L) === n, `AER ${L} min → ${n} stops (got ${mandCount({mandPer:80},L)})`));
  expect(document.querySelectorAll('#series option').length === Object.keys(SERIES).length, 'all series selectable in Plan');
  const summary = [];
  // AER: a short extra stop is legal (warning, not a violation) and doesn't count toward the mandatory total
  fresh(s => { s.series='aer'; s.race=Object.assign(s.race,SERIES.aer.race,{start:'10:00',end:'12:40'}); });   // 160 min → 1 mandatory
  adv(2.5); click('bigBtn'); adv(30); click('bigBtn'); adv(1.5); click('bigBtn');                                      // 1:30 splash
  expect(P.W.some(w => w[0]==='warn' && /doesn't count/.test(w[1])) && !P.W.some(w => w[0]==='bad'), 'AER short extra stop = warning, not violation');
  expect(countedStops(live()) === 0 && minFor('fuel') === 3, 'still owes the mandatory 3:00 stop');
  adv(40); click('bigBtn'); adv(3.2); click('bigBtn');
  expect(countedStops(live()) === 1 && minFor('fuel') === 0, 'after the mandatory stop, no minimum on further stops');
  // PCA: driver-change-only stop after the mandatory one has no minimum; fuel stops always 5:00
  fresh(s => { s.series='pca'; s.race=Object.assign(s.race,SERIES.pca.race,{len:120}); });
  click('bigBtn'); adv(20); click('bigBtn'); adv(5.2); click('bigBtn'); adv(10);
  expect(minFor('driver') === 0 && minFor('fuel') === 5, 'PCA: after mandatory stop, driver change has no minimum, fuel stays 5:00');
  ['luckydog','champcar','wrl','aer','lemons','pca'].forEach(key => {
    fresh(s => { s.series = key; s.race = Object.assign(s.race, SERIES[key].race, {track:'none'}); if (key==='pca') s.race.len = 120;
      s.drivers = [{name:'Paul',max:240},{name:'Luc',max:240},{name:'Marco',max:240},{name:'Sam',max:240}]; });
    const L = raceLen(); let stops = [];
    for (let seed = 1; seed <= 5; seed++) {
      startSim({seed: seed*7+key.length, speed:0, auto:true}); simStep(L + 20);
      const x = simReport(); stops.push(x.stops);
      const other = x.bad.filter(b => !/under the .* minimum/.test(b));
      expect(x.finished && !x.oof, `${key} seed ${seed}: finished, never dry`);
      expect(other.length === 0, `${key} seed ${seed}: legal: ${other.join(' | ')}`);
      expect(x.overStints === 0, `${key} seed ${seed}: no stint over ${S.race.maxStint||'∞'}`);
      expect(x.counted >= mandCount(S.race, L), `${key} seed ${seed}: ${x.counted} counting stops ≥ mandatory ${mandCount(S.race,L)}`);
      closeSheet(); endSim(true); hydrate();
    }
    summary.push(`${key}: ${fmt(L)} race, stops ${Math.min(...stops)}-${Math.max(...stops)}, glance ${SERIES[key].glance ? 'yes' : 'no'}`);
  });
  summary.forEach(log);
});
