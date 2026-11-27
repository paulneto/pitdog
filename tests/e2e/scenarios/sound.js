// @window 500,900
// Sound alerts: gear up, box in 3 min, box now, minimum stop served; once each, quiet for alerts already passed.
__run(() => {
  const tick = () => { const lv = live(); P = plan(lv); soundTick(lv, P); };
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; });
  SND.on = true; SND.log = [];
  adv(1); click('bigBtn'); TAP_AT = 0; tick();
  const tt = () => { const p = plan(live()); return p.stints[curIdx(p)].end - live().now; };
  const onDeck = S.race.onDeck || 0;
  adv(tt() - onDeck + 0.05); tick(); tick();
  expect(SND.log.join() === 'gear', 'gear-up tone once when the next driver is on deck: ' + SND.log.join());
  adv(tt() - 3 + 0.05); tick();
  expect(SND.log.join() === 'gear,box3', 'box-in-3-minutes tone: ' + SND.log.join());
  adv(tt() + 0.05); tick(); tick();
  expect(SND.log.join() === 'gear,box3,box', 'box-now tone once: ' + SND.log.join());
  click('bigBtn'); TAP_AT = 0; tick(); adv(2); tick();
  expect(!SND.log.includes('served'), 'no stop-served tone before the minimum');
  adv(3.2); tick(); tick();
  expect(SND.log.filter(x => x === 'served').length === 1, 'stop-served tone once the minimum (plus margin) is up');
  // reopening the app mid-race: alerts already passed stay quiet
  SND.race = null; SND.log = []; adv(1); tick();
  expect(!SND.log.length, 'on reopen, nothing replays');
  // muted: tones logged but not played (no vibration/sound); toggle lives in the menu
  click('menuBtn'); const it = [...document.querySelectorAll('#sheetB .mrow')].find(b => /Sound alerts/.test(b.textContent));
  expect(it && /on/.test(it.textContent), 'menu shows the sound toggle'); it.click();
  expect(!SND.on && localStorage.getItem('pitdog_sound') === '0', 'muted, remembered on this device');
  // the simulator stays quiet
  SND.on = true; startSim({ speed: 0 }); SND.log = []; simStep(200, true); tick();
  expect(!SND.log.length, 'no tones in the simulator'); endSim(true);
});
