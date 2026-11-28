// @window 500,900
// First launch → onboarding → team with people + car → pick drivers for a race → race → finish & save → day 2.
__run(() => {
  expect(document.getElementById('sheetBg').classList.contains('on'), 'onboarding sheet shows on first launch');
  expect(txt('sheetT') === 'Welcome to PitDog', 'welcome title: ' + txt('sheetT'));
  const btn = l => [...document.querySelectorAll('#sheetF button')].find(b => b.textContent.includes(l)).click();
  const setv = (id, v) => { document.getElementById(id).value = v; };
  click('wSetup'); setv('oName', 'Dawg Days'); setv('oSeries', 'luckydog'); btn('Next');
  setv('oCar', 'E30 #42'); setv('oCap', '16.4'); setv('oBurn', '0.38'); setv('oLap', '2:20'); btn('Next');
  ['Paul', 'Luc', 'Marco'].forEach(n => { setv('oPerson', n); click('oAdd'); });
  setv('oPerson', 'Sam'); setv('oRole', 'crew'); click('oAdd');
  btn('Create team');
  expect(DB && DB.team.name === 'Dawg Days', 'team created');
  expect(DB.team.members.length === 4 && DB.team.members[0].role === 'owner' && DB.team.members[3].role === 'crew', 'roles: owner + drivers + crew');
  expect(S.drivers.map(d => d.name).join() === 'Paul,Luc,Marco', 'first race uses all drivers, not crew: ' + S.drivers.map(d => d.name).join());
  expect(/Dawg Days/i.test(txt('teamTitle')) && document.querySelectorAll('#memberList .lrow').length === 4, 'team tab lists 4 people');
  // add a person via the sheet
  click('addMember'); setv('mName', 'Jo'); btn('Save');
  expect(DB.team.members.some(m => m.name === 'Jo'), 'added Jo');
  // starting a new race is obvious from the race screen before the green flag
  show('race'); update();
  expect(getComputedStyle($('raceSwitch')).display !== 'none' && document.getElementById('rsNew'), 'race screen offers “Change” before the green flag');
  // planning a race ahead: Team → Races → + New race. Only Luc then Paul (tap order), at Watkins Glen
  click('newRaceBtn');
  document.querySelectorAll('#rPick button').forEach(b => b.click());           // toggle everyone off
  const pick = n => [...document.querySelectorAll('#rPick button')].find(b => b.textContent.startsWith(n)).click();
  pick('Luc'); pick('Paul'); setv('rName', 'Saturday'); setv('rTrack', 'glen'); btn('Create race');
  expect(S.race.name === 'Saturday' && S.drivers.map(d => d.name).join() === 'Luc,Paul', 'race drivers in tap order: ' + S.drivers.map(d => d.name).join());
  expect(DB.races.length === 2, 'two races in team');
  // late driver from the Plan tab
  [...document.querySelectorAll('#addFromTeam button')].find(b => b.textContent.includes('Marco')).click();
  expect(S.drivers.length === 3 && S.drivers[2].name === 'Marco', 'late driver added from team');
  // drive the race a bit and finish
  adv(2.5); click('bigBtn'); adv(80); click('bigBtn'); adv(5.3); click('bigBtn'); adv(30);
  click('finishRace');
  const sat = DB.races.find(r => r.rules.name === 'Saturday');
  expect(sat.status === 'done' && sat.summary && sat.summary.stops === 1, 'Saturday saved as done with 1 stop');
  expect(Object.keys(sat.summary.seat).length === 2, 'seat time saved for 2 drivers');
  // finishing opens the debrief; "Race now" from there starts the next one with the same drivers
  expect($('tab-debrief').classList.contains('on') && /Debrief/i.test(txt('debriefBody')), 'finishing opens the debrief');
  click('dbNext');
  expect(txt('sheetT') === 'Race now', 'debrief offers Race now: ' + txt('sheetT'));
  btn('RACE NOW');
  expect(S.drivers.map(d => d.name).join() === 'Luc,Paul,Marco' && !S.events.length && S.race.track === 'glen', 'next race copies drivers and track, empty log');
  // persisted
  const stored = JSON.parse(localStorage.getItem('pitdog_db'));
  expect(stored.races.length === 3 && stored.team.members.length === 5, 'saved to device storage');
});
