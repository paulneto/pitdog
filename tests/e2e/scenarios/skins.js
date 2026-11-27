// @window 1180,820
// Skins: picker tiles, persistence, command-center cycle button, tokens actually change.
__run(() => {
  fresh();
  const bg = () => getComputedStyle(document.getElementById('cc')).backgroundColor;
  setSkin('night'); const nightBg = bg();
  expect(document.querySelectorAll('#skinTiles .skin-tile').length === 4, 'four skin tiles');
  click('ccSkin'); expect(document.documentElement.dataset.skin === 'sunlight', 'SKIN cycles night → sunlight');
  expect(bg() !== nightBg, 'command center background changes with skin');
  expect(localStorage.getItem('pitdog_skin') === 'sunlight', 'skin saved on device');
  click('ccSkin'); click('ccSkin'); expect(document.documentElement.dataset.skin === 'sheet', 'cycles to sheet');
  click('ccSkin'); expect(document.documentElement.dataset.skin === 'night', 'wraps back to night');
  document.querySelector('#skinTiles [data-skin="tower"]').click();
  expect(document.documentElement.dataset.skin === 'tower' && document.querySelector('#skinTiles .sel').dataset.skin === 'tower', 'tile click selects tower');
  setSkin('bogus'); expect(document.documentElement.dataset.skin === 'night', 'unknown skin falls back to night');
});
