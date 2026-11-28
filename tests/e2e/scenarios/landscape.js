// @window 667,518
// A phone on its side: never the command center (even if it was picked), the race screen side by side.
__run(() => {
  store.set('pitdog_view', 'cc');
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; });
  applyView(); go('race');
  expect(innerWidth > innerHeight && innerHeight < 560, 'landscape phone-sized window: ' + innerWidth + 'x' + innerHeight);
  expect(!document.body.classList.contains('cc-on') && document.body.classList.contains('land'), 'no command center on a phone; landscape layout on');
  expect(getComputedStyle($('ccOpen')).display === 'none', 'no command-center button on a phone');
  const b = $('bigBtn').getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
  expect(b.left > innerWidth / 2 && b.top >= 0 && b.bottom <= innerHeight, 'big button on the right, fully on screen');
  const card = $('trackCard').getBoundingClientRect();
  expect(card.right <= b.left, 'cards sit left of the button, not under it');
  adv(2); click('bigBtn'); TAP_AT = 0; adv(40); click('bigBtn'); TAP_AT = 0;
  expect(getComputedStyle($('pitCard')).display === 'grid', 'pit stop card goes two columns');
  const t = $('pitTimer').getBoundingClientRect(), k = $('kindChips').getBoundingClientRect();
  const bar = document.querySelector('.tabbar').getBoundingClientRect().top, vis = id => { const q = $(id).getBoundingClientRect(); return q.height > 0 && q.bottom <= bar + 1; };
  expect(t.bottom <= bar && vis('jugChips') && vis('nextDrv') && $('jugChips').getBoundingClientRect().left > t.left, 'iPhone SE on its side: timer, fuel stepper and next driver all on screen without scrolling (bar at ' + Math.round(bar) + ')');
  go('home'); expect(document.body.dataset.tab === 'home' && getComputedStyle($('actionBar')).display === 'none', 'other tabs use the full width');
});
