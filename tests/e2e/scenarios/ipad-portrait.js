// @window 820,1323
// iPad in portrait: the command center on its own, stacked; nothing race-critical clipped.
__run(() => {
  store.set('pitdog_view', 'auto');
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }, { name: 'Marco', max: 120 }]; s.race.track = 'calabogie'; });
  applyView();
  expect(innerHeight > innerWidth && document.body.classList.contains('cc-on'), 'iPad portrait opens the command center: ' + innerWidth + 'x' + innerHeight);
  const inside = (id, box) => { const a = $(id).getBoundingClientRect(), b = $(box).getBoundingClientRect(); return a.width > 0 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.left >= b.left - 1 && a.right <= b.right + 1; };
  adv(2); click('bigBtn'); TAP_AT = 0; adv(30); renderCC();
  const car = $('ccCar').getBoundingClientRect(), grid = document.querySelector('.cc-grid').getBoundingClientRect();
  expect(car.width > grid.width * 0.9, 'car panel spans the full width');
  expect(inside('ccGo', 'ccCar') && inside('ccNext', 'ccCar') && inside('ccBrief', 'ccCar') && $('ccBrief').textContent.includes('jug'), 'countdown, stop brief and the big button all fit in the car panel');
  click('bigBtn'); TAP_AT = 0; adv(2); renderCC();
  expect(inside('ccJugs', 'ccCar') && inside('ccDrvs', 'ccCar') && inside('ccKinds', 'ccCar'), 'in the pits: stop type, fuel stepper and next driver all visible');
  expect(inside('ccFlag', 'ccFlagBar') && $('ccWall').getBoundingClientRect().left >= $('ccFlagBar').getBoundingClientRect().right - 1, 'header: clock doesn’t overlap the flag bar');
});
