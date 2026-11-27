// @window 500,900
// Team records: totals, drivers and pit stops build up from finished races (not simulations).
__run(() => {
  const btn = l => [...document.querySelectorAll('#sheetF button')].find(b => b.textContent.includes(l)).click();
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'glen'; s.race.name = 'Saturday'; });
  go('records');
  expect(/Records build up/.test(txt('recordsBody')), 'empty state before any finished race');
  // race 1: two fuel stops, one 6:00 and one 5:20, then finish at the flag
  go('race'); adv(1); click('bigBtn'); TAP_AT = 0;
  adv(60); click('bigBtn'); TAP_AT = 0; adv(6); click('bigBtn'); TAP_AT = 0;
  adv(60); click('bigBtn'); TAP_AT = 0; adv(5 + 20 / 60); click('bigBtn'); TAP_AT = 0;
  adv(400); TAP_AT = 0; click('bigBtn');                      // RACE COMPLETE → finish & debrief
  expect(activeRace().status === 'done', 'race 1 saved');
  // race 2 via Race now: 2 h, one stop of 5:10, ended early from the menu
  go('race'); TAP_AT = 0; click('bigBtn'); document.querySelector('#nHours [data-h="2"]').click(); btn('RACE NOW');
  adv(1); click('bigBtn'); TAP_AT = 0; adv(50); click('bigBtn'); TAP_AT = 0; adv(5 + 10 / 60); click('bigBtn'); TAP_AT = 0; adv(20);
  click('menuBtn'); [...document.querySelectorAll('#sheetB .mrow')].find(b => b.textContent.includes('End the race now')).click();
  // a simulation must not count
  startSim({ speed: 0 }); simStep(raceLen() + 5, true); endSim(true);
  go('records'); const R = computeRecords(null);
  expect(R.n === 2 && R.stops === 3, 'two races, three stops counted (sim excluded): ' + R.n + ' races, ' + R.stops + ' stops');
  expect(Math.abs(R.bestStop.len - (5 + 10 / 60)) < 0.02, 'best fuel stop is the 5:10');
  expect(Math.abs(R.hours - (7 + 76.17 / 60)) < 0.05, 'hours: a 7 h race plus one ended at ~1:16: ' + R.hours.toFixed(2));
  const drv = Object.values(R.drivers);
  expect(drv.length === 2 && drv.every(o => o.seat > 0 && o.races === 2), 'both drivers have seat time in both races');
  expect(/Team records/.test(txt('tab-records')) && /best fuel stop/i.test(txt('recordsBody')) && document.querySelectorAll('#recordsBody [data-deb]').length === 2, 'page shows totals, pit stops and both races');
  document.querySelector('#recordsBody [data-deb]').click();
  expect($('tab-debrief').classList.contains('on'), 'a race opens its debrief');
  go('home'); expect(document.getElementById('hRecords'), 'Home links to the records');
});
