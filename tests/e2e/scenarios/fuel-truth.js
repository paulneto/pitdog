// @window 500,900
// The fuel gate. The auto-crew follows the APP (pours the planned fuel, pits on BOX, never sees the true tank),
// and the true burn is −3%..+15% off the team's estimate. Across series, tank sizes and fill modes the car must
// never run dry, and the measured burn must land close to the truth.
__run(() => {
  const DRV = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120},{name:'Sam',max:120}];
  const variants = [
    { name: 'Lucky Dog', n: 30, patch: s => {} },
    { name: 'Lucky Dog, 22-gal tank', n: 15, patch: s => { s.car.cap = 22; } },
    { name: 'Lucky Dog, only-what\'s-needed fills', n: 15, patch: s => { s.car.fill = 'need'; } },
    { name: 'ChampCar', n: 10, patch: s => { s.series = 'champcar'; Object.assign(s.race, SERIES.champcar.race); } },
    { name: 'AER', n: 10, patch: s => { s.series = 'aer'; Object.assign(s.race, SERIES.aer.race); } },
  ];
  variants.forEach(v => {
    fresh(s => { s.drivers = JSON.parse(JSON.stringify(DRV)); s.race.track = 'none'; v.patch(s); });
    const res = [];
    for (let seed = 1; seed <= v.n; seed++) { startSim({ seed, speed: 0, auto: true }); simStep(raceLen() + 25); res.push({ seed, ...simReport() }); closeSheet(); endSim(true); hydrate(); }
    const dry = res.filter(x => x.oof), errs = res.filter(x => x.measErr != null).map(x => x.measErr);
    log(`${v.name}: ran dry ${dry.length}/${res.length} · measured ${errs.length}/${res.length} · error ${errs.length ? Math.round(Math.min(...errs) * 100) + '..' + Math.round(Math.max(...errs) * 100) + '%' : '–'} · stops ${Math.min(...res.map(x => x.stops))}-${Math.max(...res.map(x => x.stops))} · laps ${Math.min(...res.map(x => x.laps))}-${Math.max(...res.map(x => x.laps))}`);
    expect(dry.length === 0, `${v.name}: never runs dry when the crew follows the app (dry on seeds ${dry.map(x => x.seed).join(',')})`);
    expect(res.every(x => x.finished), `${v.name}: every race finishes`);
    if (errs.length) expect(Math.max(...errs.map(Math.abs)) < 0.12, `${v.name}: measured burn within ±12% of the truth`);
  });
});
