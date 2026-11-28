// @window 500,900
// A deploy while the app is open: the new service worker takes over, the page says a new version is ready,
// but never while a race is running (the bar would sit over the race screen); the menu always offers the reload.
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; });
  const bar = () => { updBar(); const b = $('updBar'); return !!(b && b.classList.contains('on')); };
  UPD.ready = false; UPD.ctl = false; onSwChange();
  expect(!UPD.ready && !bar(), 'first install (no previous worker): no update prompt');
  onSwChange();
  expect(UPD.ready && bar() && /New version/.test(txt('updBar')), 'a new worker taking over: the reload bar shows before the race');
  adv(1); click('bigBtn');
  expect(live().started && !bar(), 'race running: the bar stays hidden');
  click('menuBtn');
  const it = [...document.querySelectorAll('#sheetB .mrow')].find(b => /Reload for the new version/.test(b.textContent));
  expect(it && /Safe mid-race/.test(it.textContent), 'mid-race the menu still offers the reload, saying it is safe');
  expect(/PitDog/.test(document.querySelector('#sheetB .mver').textContent), 'the menu shows the version line');
  closeSheet();
  UPD.ready = false; expect(!bar(), 'no new version: no bar');
});
