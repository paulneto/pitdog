// @window 1180,820
// 25 random simulated Lucky Dog days (seeded). The only allowed problems are the auto-crew's deliberate
// early departures (~3% of stops), which the app must flag. Never run dry, never break a stint/rest rule.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120},{name:'Sam',max:120}]; s.race.track = 'none'; });
  const res = [];
  for (let seed = 1; seed <= 25; seed++) { startSim({seed, speed:0, auto:true}); simStep(440); res.push({seed, ...simReport()}); closeSheet(); endSim(true); hydrate(); }
  const errs = res.filter(x => x.measErr != null).map(x => x.measErr);
  log(`stops ${Math.min(...res.map(x=>x.stops))}-${Math.max(...res.map(x=>x.stops))} · races with a red ${res.filter(x=>x.reds).length} · measured burn error ${Math.round(Math.min(...errs)*100)}%..${Math.round(Math.max(...errs)*100)}% · crew early-exits caught ${res.filter(x=>x.shortStops).length}`);
  res.forEach(x => {
    expect(x.finished, `seed ${x.seed}: finished`);
    expect(!x.oof, `seed ${x.seed}: never ran dry`);
    expect(x.overStints === 0, `seed ${x.seed}: no stint over max`);
    const other = x.bad.filter(b => !/under the .* minimum/.test(b));
    expect(other.length === 0, `seed ${x.seed}: only crew mistakes flagged: ${other.join(' | ')}`);
    expect(x.shortStops === x.bad.length - other.length, `seed ${x.seed}: every short stop is flagged`);
  });
  expect(Math.max(...errs.map(Math.abs)) < 0.2, 'measured burn within ±20% of truth in every race');
});
