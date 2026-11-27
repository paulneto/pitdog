// @window 500,900
// Phone race screen: next stop is the hero, one status strip, fuel only shouts when it's low, icons not emoji.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120}]; s.race.track = 'none'; });
  adv(2.5); click('bigBtn'); adv(30);
  expect(parseFloat(getComputedStyle($('nextStop')).fontSize) > 2 * parseFloat(getComputedStyle($('raceClock')).fontSize), 'next-stop countdown is the hero, race clock is small');
  expect($('raceClock').closest('.appbar'), 'race clock lives in the top bar');
  expect($('fuelFact').className === 'fact', 'fuel is quiet when the tank is fine');
  adv(48); click('yBtn'); adv(2);
  expect(document.querySelectorAll('#banners .strip').length === 1 && document.querySelectorAll('#banners .strip2').length >= 1, 'most urgent alert as the strip, the rest as chips');
  expect($('banners').querySelector('.strip').classList.contains('box'), 'BOX outranks the yellow: ' + txt('banners'));
  expect($('nextStop').classList.contains('bad') && /^−/.test(txt('nextStop')), 'overdue countdown turns red with a real minus sign');
  click('yBtn');
  // a stop that logs no fuel: the next stint is re-planned short, then fuel warns and finally goes red
  click('bigBtn'); adv(5.3);
  for (let g = 0; +document.querySelector('#jugChips .sv').dataset.j > 0 && g < 30; g++) tap('#jugChips [data-step="-0.5"]');
  expect(/No fuel/.test(txt('jugChips')) && document.querySelector('#jugChips [data-step="-0.5"]').disabled, 'stepper bottoms out at no fuel');
  click('bigBtn');
  const seen = new Set();
  for (let m = 0; m < 25 && !seen.has('bad'); m++) { adv(1); const c = $('fuelFact').className.split(' ')[1]; if (c) seen.add(c); }
  expect(seen.has('warn') && seen.has('bad'), 'fuel goes amber, then red on reserve: ' + [...seen].join(','));
  // icons, not emoji, across the race screen, plan and log
  show('plan'); show('log');
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}]/u;
  expect(!emoji.test(document.body.innerText), 'no emoji left in the rendered app');
  expect(document.querySelectorAll('#logList .ico svg').length === S.events.length, 'every log row has an icon');
});
