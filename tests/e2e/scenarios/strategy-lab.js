// @window 500,900
// Strategy Lab: example profiles, driver-aware planning, fair comparison, "Use this plan", conditions.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120},{name:'Sam',max:120}]; s.race.track = 'none'; });
  show('lab'); renderLab();
  expect(DB.team.exampleProfiles && member(S.drivers[0].mid).pace === -0.02, 'example profiles applied on first open');
  expect(document.querySelectorAll('#labDrivers input').length === 16, 'profile table editable (4 drivers × 4 fields)');
  // editing a lap time updates the profile
  const lapIn = document.querySelector('#labDrivers input[data-f="lap"]'); lapIn.value = '2:15.0'; lapIn.onchange();
  expect(Math.abs(member(S.drivers[0].mid).pace - (135/140 - 1)) < 1e-6, 'lap time edit → pace delta');
  // pace weighting: fastest driver gets the longest stint, plan stays legal
  S.race.weighting = 'pace'; update();
  const byDrv = {}; P.stints.forEach(st => byDrv[st.driver] = (byDrv[st.driver]||0) + st.dur);
  log('pace plan seat: ' + Object.entries(byDrv).map(([d,t]) => S.drivers[d].name + ' ' + fmt(t)).join(', '));
  expect(byDrv[0] > byDrv[2], 'Paul (fastest) planned more seat time than Marco (slowest)');
  expect(!P.W.some(w => w[0] === 'bad'), 'pace-weighted plan legal: ' + P.W.filter(w=>w[0]==='bad').map(w=>w[1]).join('|'));
  S.race.weighting = 'even'; update();
  // comparison (small N for test speed), timed
  const before = localStorage.getItem('pitdog_db');
  const rows = labCompareSync(['even','pace','yellow','noyellow'], 6, 'normal');
  rows.forEach(r => log(`${r.name}: ${r1(r.avg)} laps (p10 ${r.p10}), dry ${r.dry}, viol ${r.viol}, stops ${r1(r.stops)}, spread ${fmt(r.spread)}`));
  expect(rows.length === 4 && rows.every(r => r.n === 6), '4 strategies × 6 races');
  expect(rows.every(r => r.dry === 0), 'no strategy ran dry');
  expect(rows.every(r => r.viol === 0), 'no rule violations in any strategy');
  const ev = rows.find(r => r.key === 'even'), pc = rows.find(r => r.key === 'pace');
  expect(pc.seat['Paul'] > ev.seat['Paul'], 'pace strategy gives Paul more seat time than even');
  expect(localStorage.getItem('pitdog_db') === before && !SIM.on && S.race.name !== 'Simulation', 'Lab runs leave real data and state untouched');
  // render + use
  LAB.res = {rows, cond:'normal', n:6, at:Date.now()}; renderLabResults();
  document.querySelector('#labResults [data-use="pace"]').click();
  expect(S.race.weighting === 'pace' && document.getElementById('tab-plan').classList.contains('on'), '"Use this plan" applies the strategy and opens Plan');
  // conditions
  const out = labCompareSync(['even'], 3, 'driverout')[0];
  expect(Object.keys(out.seat).filter(n => out.seat[n] > 0).length === 3, 'driver-out: only 3 drivers drive');
  const leak = labCompareSync(['even'], 3, 'leak')[0];
  expect(leak.stops >= ev.stops, 'fuel leak needs at least as many stops: ' + leak.stops + ' vs ' + ev.stops);
});
