// @window 1180,820
// Skins: picker tiles, persistence, command-center cycle button, tokens actually change, bundled fonts.
__run(() => {
  fresh();
  const bg = () => getComputedStyle(document.getElementById('cc')).backgroundColor;
  const order = SKINS.map(x => x.k);
  setSkin('night'); const nightBg = bg();
  expect(document.querySelectorAll('#skinTiles .skin-tile').length === 8, 'eight skin tiles');
  expect(order.join() === 'night,sunlight,ferrari,mclaren,mercedes,redbull,aston,williams', 'skin order');
  click('ccSkin'); expect(document.documentElement.dataset.skin === 'sunlight', 'SKIN cycles night → sunlight');
  expect(bg() !== nightBg, 'command center background changes with skin');
  expect(localStorage.getItem('pitdog_skin') === 'sunlight', 'skin saved on device');
  const seen = new Set();
  for (let i = 2; i < order.length; i++) { click('ccSkin'); expect(document.documentElement.dataset.skin === order[i], 'cycles to ' + order[i]); seen.add(bg()); }
  expect(seen.size === order.length - 2, 'every F1 skin has its own command center background');
  click('ccSkin'); expect(document.documentElement.dataset.skin === 'night', 'wraps back to night');
  document.querySelector('#skinTiles [data-skin="mclaren"]').click();
  expect(document.documentElement.dataset.skin === 'mclaren' && document.querySelector('#skinTiles .sel').dataset.skin === 'mclaren', 'tile click selects mclaren');
  expect(getComputedStyle(document.querySelector('.appbar'), '::after').backgroundImage.includes('gradient'), 'F1 skin shows the livery stripe');
  setSkin('night'); expect(getComputedStyle(document.querySelector('.appbar'), '::after').backgroundImage === 'none', 'night has no livery stripe');
  // status colours mean status only: identical across F1 skins
  const st = k => { setSkin(k); const cs = getComputedStyle(document.documentElement); return ['--red', '--amber', '--green', '--yellow'].map(v => cs.getPropertyValue(v).trim()).join(); };
  const ref = st('ferrari'); expect(['mclaren', 'mercedes', 'redbull', 'aston', 'williams'].every(k => st(k) === ref), 'status colours identical across F1 skins');
  expect(getComputedStyle(document.getElementById('raceClock')).fontFamily.includes('Barlow Condensed'), 'race clock uses bundled Barlow Condensed');
  expect(getComputedStyle(document.body).fontFamily.startsWith('"Barlow"') || getComputedStyle(document.body).fontFamily.startsWith('Barlow'), 'UI uses bundled Barlow');
  setSkin('tower'); expect(document.documentElement.dataset.skin === 'night', 'retired skin (tower) falls back to night');
  setSkin('bogus'); expect(document.documentElement.dataset.skin === 'night', 'unknown skin falls back to night');
});
