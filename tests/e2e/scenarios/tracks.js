// @window 500,900
// Track list: new Ontario tracks are selectable and resolve to weather coordinates.
__run(() => {
  fresh();
  const opts = [...document.querySelectorAll('#track option')].map(o => o.textContent);
  expect(opts.includes('Calabogie') && opts.includes('Shannonville'), 'Calabogie and Shannonville in Plan → Track');
  S.race.track = 'calabogie'; const c = trackLL(); expect(c && Math.abs(c[0] - 45.30) < 0.01 && Math.abs(c[1] + 76.67) < 0.01, 'Calabogie coords');
  S.race.track = 'shannonville'; const sh = trackLL(); expect(sh && Math.abs(sh[0] - 44.23) < 0.01 && Math.abs(sh[1] + 77.16) < 0.01, 'Shannonville coords');
  click('newRaceBtn'); const r = [...document.querySelectorAll('#rTrack option')].map(o => o.textContent);
  expect(r.includes('Calabogie') && r.includes('Shannonville'), 'both in the New race sheet');
  closeSheet();
  // track maps: baked-in outlines, drawn without network
  const keys = Object.keys(TRACKMAP);
  expect(keys.length >= 17 && keys.every(k => TRACKS[k] && /<path d="M[\d,L -]+/.test(trackSVG(k))), 'every baked track map is a valid SVG path (' + keys.length + ')');
  expect(trackSVG('none') === '' && trackSVG('custom') === '', 'no map for “none” or a custom track');
  S.race.track = 'roadamerica'; activeRace().rules.track = 'roadamerica'; show('race'); update();
  expect($('raceMap').querySelector('svg.tmap') && /Road America/.test($('raceMap').innerHTML), 'race screen shows the Road America outline');
  document.body.classList.add('cc-on'); renderCC(); document.body.classList.remove('cc-on'); expect($('ccMap').querySelector('svg.tmap'), 'command center clock panel shows it too');
  S.race.track = 'none'; activeRace().rules.track = 'none'; update();
  expect(!$('raceMap').innerHTML, 'no track → no map');
});
