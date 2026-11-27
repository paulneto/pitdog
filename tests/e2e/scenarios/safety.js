// @window 500,900
// Race-day safety nets: double-tap guard, "Logged" confirmation with Fix, the full toggle, PIT NOW under yellow,
// a loud banner when saving fails, export/import, backups before destructive actions, plan copies, another tab.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120}]; s.race.track = 'none'; });
  adv(2.5); click('bigBtn'); adv(70);
  click('yBtn');
  expect(txt('nextStop') === 'PIT NOW' && $('nextStop').classList.contains('go'), 'hero says PIT NOW on a cheap yellow: ' + txt('nextStop'));
  click('yBtn'); adv(9);

  // double tap: PIT IN, then an accidental second tap must not log anything
  click('bigBtn'); click('bigBtn');
  expect(live().inPit && S.events.filter(e => e.type === 'in').length === 1, 'double tap on PIT IN logs one event, stays in the pits');
  expect(!!$('fullTgl').querySelector('.sel'), 'fuel stop defaults to "filled to full" when the plan fills to full');
  tap('#fullTgl button');
  expect(!$('fullTgl').querySelector('.sel'), 'one tap switches it to "not full"');
  adv(5.3); click('bigBtn');
  const out = S.events[S.events.length - 1];
  expect(out.type === 'out' && out.full === false && out.fuel > 0, 'PIT OUT logs the fuel and the full flag');
  expect(/Logged: Fuel/.test(txt('banners')) && document.querySelector('#banners [data-act="fix"]'), 'PIT OUT shows what it logged, with a Fix button: ' + txt('banners'));

  // fix it: it was really a driver-only stop
  tap('#banners [data-act="fix"]');
  expect(txt('sheetT') === 'Fix last stop', 'Fix opens the correction sheet');
  tap('#sheetB [data-k="driver"]'); click('fixSave');
  const fixed = S.events[S.events.length - 1];
  expect(fixed.kind === 'driver' && fixed.fuel === 0 && fixed.full === false, 'the stop is corrected in place: ' + JSON.stringify(fixed));
  adv(4); expect(!/Logged:/.test(txt('banners')), 'the confirmation goes away after a few minutes');

  // saving fails → loud banner; works again → banner clears
  const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('QuotaExceeded'); };
  update(); expect(/NOT SAVING/.test(txt('banners')), 'a failed save raises a NOT SAVING banner');
  Storage.prototype.setItem = orig; update(); expect(!/NOT SAVING/.test(txt('banners')), 'banner clears once saving works again');

  // clear the log → backup → restore
  const nEv = S.events.length; click('endRace');
  expect(S.events.length === 0 && $('restoreBk').style.display !== 'none', 'clearing the log keeps a restorable backup');
  click('restoreBk');
  expect(S.events.length === nEv, 'restore brings the cleared log back');

  // export → import round trip
  click('exportDb');
  const copy = JSON.parse(JSON.stringify(DB)); copy.team.name = 'Imported team';
  expect(importDbObject(copy) && DB.team.name === 'Imported team', 'import replaces the data (after confirming)');
  expect(!importDbObject({ hello: 'world' }) && DB.team.name === 'Imported team', 'a non-PitDog file is refused, nothing changes');
  click('restoreBk'); expect(DB.team.name === 'Test team', 'the pre-import data is one tap away');

  // another tab writing the same storage
  window.dispatchEvent(new StorageEvent('storage', { key: 'pitdog_db' }));
  expect(/another tab/.test(txt('banners')), 'a second tab is called out'); OTHER_TAB = false;

  // a plan copy from a share link asks before it starts logging
  fresh(); history.replaceState(null, '', location.pathname + '#' + btoa(JSON.stringify({ series: 'luckydog', drivers: [{ name: 'Sam', max: 120 }], race: { name: 'Sunday' }, car: {} })));
  DB = null; loadDB(); hydrate(); bind(); update(); shareSheet(); click('shareOpen');
  expect(activeRace().copy === true && /Plan copy/.test(txt('banners')), 'imported plan is marked as a copy');
  adv(3); click('bigBtn');
  expect(live().started && activeRace().copy === false, 'GREEN on a copy asks first, then this device logs');
});
