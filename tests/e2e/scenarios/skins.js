// @window 1180,820
// Skins: the Look list (Log tab and the command-center SKIN sheet), persistence, tokens actually change, bundled fonts.
__run(() => {
  fresh();
  const bg = () => getComputedStyle(document.getElementById('cc')).backgroundColor;
  const order = SKINS.map(x => x.k);
  setSkin('night'); const nightBg = bg();
  expect(document.querySelectorAll('#skinTiles .skin-row').length === 8, 'Look card lists eight skins');
  expect(order.join() === 'night,sunlight,ferrari,mclaren,mercedes,redbull,aston,williams', 'skin order');
  click('ccSkin');
  expect($('sheetBg').classList.contains('on') && document.querySelectorAll('#skinSheetList .skin-row').length === 8, 'SKIN on the command center opens the list');
  tap('#skinSheetList [data-k="sunlight"]');
  expect(document.documentElement.dataset.skin === 'sunlight', 'picking from the list applies the skin');
  expect(bg() !== nightBg, 'command center background changes with skin');
  expect(localStorage.getItem('pitdog_skin') === 'sunlight', 'skin saved on device');
  expect(document.querySelector('#skinSheetList .sel').dataset.k === 'sunlight' && document.querySelectorAll('#skinSheetList .sel').length === 1, 'list marks only the chosen skin');
  const seen = new Set();
  for (const k of order.slice(2)) { tap(`#skinSheetList [data-k="${k}"]`); expect(document.documentElement.dataset.skin === k, 'list selects ' + k); seen.add(bg()); }
  expect(seen.size === order.length - 2, 'every F1 skin has its own command center background');
  tap('#sheetF button'); expect(!$('sheetBg').classList.contains('on'), 'Done closes the list');
  expect(getComputedStyle(document.querySelector('#skinTiles [data-k="ferrari"] .skin-pv')).backgroundColor !== getComputedStyle(document.querySelector('#skinTiles [data-k="sunlight"] .skin-pv')).backgroundColor, 'each row previews its own skin');
  document.querySelector('#skinTiles [data-k="mclaren"]').click();
  expect(document.documentElement.dataset.skin === 'mclaren' && document.querySelector('#skinTiles .sel').dataset.k === 'mclaren', 'Look card row selects mclaren');
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
