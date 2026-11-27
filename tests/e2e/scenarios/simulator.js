// @window 1180,820
// Full simulated Lucky Dog day with auto-crew on the command center; real team data must be untouched.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120},{name:'Sam',max:120}]; s.race.track = 'none'; });
  const before = localStorage.getItem('pitdog_db');
  startSim({ seed: 42, speed: 0, auto: true });
  expect(SIM.on && S.race.name === 'Simulation' && document.body.classList.contains('sim-on'), 'sim running with HUD');
  simStep(5);
  expect(txt('ccFlag') !== 'PRE-RACE', 'race control threw the green');
  simStep(440);
  const x = simReport();
  log(JSON.stringify(x));
  expect(x.finished, 'race finished');
  expect(!x.oof, 'never ran out of fuel');
  expect(x.stops >= 4, 'made at least 4 stops: ' + x.stops);
  expect(x.overStints === 0, 'no stint over 2:00');
  expect(x.bad.length === 0, 'no rule violations: ' + x.bad.join(' | '));
  expect(x.meas && Math.abs(x.measErr) < 0.3, 'measured burn within 30% of truth: ' + x.measErr);
  expect(txt('sheetT') === 'Simulation complete', 'summary shown');
  expect(localStorage.getItem('pitdog_db') === before, 'real data untouched during sim');
  endSim();
  expect(!SIM.on && S.race.name !== 'Simulation' && !document.body.classList.contains('sim-on'), 'back to the real race after End');
  expect(!DB.races.some(r => r.sim), 'no sim race left in the team');
});
