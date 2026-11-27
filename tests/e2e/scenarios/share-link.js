// @window 1180,820
// Share links are untrusted: hostile fields can't inject markup or crash the app, and a link never
// silently replaces the active race (the crew is asked; a live race stays on screen).
__run(() => {
  const enc = o => '#' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const XSS = '<img src=x onerror="window.__pwned=1">';
  const hostile = {
    series: 'bogus', drivers: [{ name: 'Luc ' + XSS, max: 120, color: 'red" onmouseover="window.__pwned=2' }, { name: 'Marco', max: '"><b>' }],
    race: { name: '<b>Evil</b>', earliest: '<img src=x onerror=window.__pwned=3>', maxStint: '"><svg onload=window.__pwned=4>', track: '__proto__', start: '10:00"><i>' },
    car: { unit: '<i>gal</i>', lap: '<b>2:20</b>', cap: 'NaN', name: XSS },
  };
  const boot = hash => { history.replaceState(null, '', location.pathname + hash); DB = null; loadDB(); if (DB) hydrate(); else S = clone(DEFAULT); bind(); update(); if (DB && PENDING_SHARE) shareSheet(); };
  // injected markup shows up as <img>, an inline event handler, or a nested <b>/<i> from a name; the app itself uses none of these
  const noMarkup = () => !document.querySelector('img,#banners b b,.drv2 i') && ![...document.querySelectorAll('*')].some(e => [...e.attributes].some(a => /^on/i.test(a.name))) && !window.__pwned;

  // 1. existing team, race not started: asked first, nothing changes until "Add and open"
  fresh(); localStorage.setItem('pitdog_view', 'cc'); applyView();
  const before = DB.activeRaceId, nRaces = DB.races.length;
  boot(enc(hostile));
  expect(location.hash === '', 'hash cleared from the URL');
  expect($('sheetBg').classList.contains('on') && $('sheetT').textContent === 'Shared plan', 'asks before importing');
  expect(DB.activeRaceId === before && DB.races.length === nRaces, 'nothing imported before the crew says yes');
  expect($('sheetB').innerHTML.includes('&lt;img') && noMarkup(), 'shared names shown as text in the prompt');
  click('shareOpen');
  expect(DB.activeRaceId !== before && DB.races.length === nRaces + 1, '"Add and open" adds the race and opens it');
  expect(S.series === 'luckydog' && typeof S.race.earliest === 'number' && typeof S.race.maxStint === 'number', 'unknown series and non-numeric rules are cleaned');
  expect(S.race.track === 'none' && S.race.start === '10:00' && S.car.unit === 'gal' && S.car.lap === '2:20', 'enum, time, unit and lap fields are cleaned');
  expect(/^#[0-9a-f]{6}$/i.test(dcol(0)), 'hostile colour replaced');
  show('plan'); renderCC(); renderRace();
  expect(noMarkup(), 'no injected markup anywhere after rendering plan, race and command center');
  expect(document.body.innerText.includes('Luc <img src=x'), 'the hostile name is displayed literally');
  click('bigBtn'); update(); renderCC(); expect(noMarkup() && !document.querySelector('.uncaught'), 'still clean once the race is green');

  // 2. a live race on this device: the link can't take it over
  fresh(); click('bigBtn'); update();
  const liveId = DB.activeRaceId, n2 = DB.races.length;
  boot(enc({ series: 'aer', drivers: [{ name: 'Sam', max: 120 }], race: { name: 'Sunday' }, car: {} }));
  expect(!$('shareOpen') && !!$('shareAdd'), 'no "open" option while a race is live');
  click('shareAdd');
  expect(DB.activeRaceId === liveId && DB.races.length === n2 + 1 && live().started, 'live race stays active; shared plan added to races');
  expect(DB.races.some(r => r.rules.name === 'Sunday' && r.series === 'aer'), 'shared race saved with its series');

  // 3. "Ignore" leaves everything alone
  const n3 = DB.races.length; boot(enc({ series: 'pca', drivers: [{ name: 'X' }], race: {}, car: {} }));
  tap('#sheetF button'); expect(DB.races.length === n3 && !$('sheetBg').classList.contains('on'), 'Ignore imports nothing');

  // 4. no team on this device yet: the link starts one (nothing to lose), cleaned
  localStorage.removeItem('pitdog_db'); localStorage.removeItem('pitdog');
  boot(enc(hostile));
  expect(DB && DB.team.name === 'Shared team' && !PENDING_SHARE && S.series === 'luckydog', 'fresh device: shared plan becomes the team, cleaned');
  renderCC(); renderRace(); expect(noMarkup(), 'fresh-device import renders clean');

  // 5. damaged stored data (e.g. from an older build) doesn't crash the app
  const bad = JSON.parse(localStorage.getItem('pitdog_db'));
  bad.races[0].series = 'nope'; bad.races[0].events = [{ t: Date.now(), type: 'green' }, { t: Date.now(), type: 'in' }, { t: Date.now(), type: 'out', kind: 'zzz', fuel: '<b>' }];
  bad.team.members[0].color = 'url(javascript:alert(1))';
  localStorage.setItem('pitdog_db', JSON.stringify(bad));
  boot('');
  expect(S.series === 'luckydog' && S.events.length === 3 && S.events[2].kind === 'fuel' && S.events[2].fuel === 0, 'bad series and events repaired');
  expect(/^#[0-9a-f]{6}$/i.test(DB.team.members[0].color), 'bad stored colour repaired');
  show('log'); renderTeamTab(); expect(noMarkup(), 'log and team tab render clean');
});
