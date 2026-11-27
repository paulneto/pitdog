// @window 500,900
// Race presets: save a setup once (series, hours, track, car, drivers, rules), start it with one tap in Race now.
__run(() => {
  const btn = l => [...document.querySelectorAll('#sheetF button')].find(b => b.textContent.includes(l)).click();
  window.prompt = () => 'Calabogie 8 h';
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }, { name: 'Marco', max: 120 }]; s.race.track = 'calabogie'; s.series = 'champcar'; });
  S.race.minStop = 6; S.race.end = '18:00'; save();                             // custom rule + 8 h day
  go('plan'); click('savePreset');
  const pr = DB.team.presets[0];
  expect(DB.team.presets.length === 1 && pr.name === 'Calabogie 8 h' && pr.track === 'calabogie' && pr.hours === 8 && pr.rules.minStop === 6, 'Plan → Save as a preset keeps track, 8 h and the custom rule');
  go('team'); expect(/Calabogie 8 h/.test(txt('presetList')), 'Team tab lists the preset');
  // a different race later: a 2 h sprint with only Luc, no track
  go('race'); click('rsNew'); document.querySelectorAll('#nPick button.sel').forEach(b => b.click());
  [...document.querySelectorAll('#nPick button')].find(b => b.textContent.startsWith('Luc')).click();
  document.querySelector('#nHours [data-h="2"]').click(); btn('RACE NOW');
  S.race.track = 'none'; save();
  expect(raceLen() === 120 && S.drivers.length === 1, 'set up a 2 h one-driver race');
  // the preset brings it all back in one tap
  click('rsNew');
  expect(document.querySelector('#nPresets [data-pr]'), 'Race now shows the preset chips');
  document.querySelector('#nPresets [data-pr]').click();
  expect(document.querySelector('#nHours .sel').dataset.h === '8' && document.querySelectorAll('#nPick button.sel').length === 3, 'tapping the preset fills 8 h and all three drivers');
  btn('RACE NOW');
  expect(raceLen() === 480 && S.race.track === 'calabogie' && S.race.minStop === 6 && S.race.name === 'Calabogie 8 h' && S.drivers.map(d => d.name).join() === 'Paul,Luc,Marco', 'the race uses the preset: 8 h, Calabogie, min stop 6, all drivers');
  // presets survive a reload and travel with the team doc
  dbSave(); const stored = JSON.parse(localStorage.getItem('pitdog_db'));
  expect(stored.team.presets.length === 1 && teamDoc().presets.length === 1, 'saved on the device and part of the shared team doc');
  // delete
  go('team'); document.querySelector('#presetList [data-delpr]').click();
  expect(!DB.team.presets.length && /Save a setup/.test(txt('presetList')), 'deleting a preset');
});
