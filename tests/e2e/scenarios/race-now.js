// @window 500,900
// Race now: first launch → one sheet → race screen; after the flag the race screen never traps you on "RACE COMPLETE".
__run(() => {
  const btn = l => [...document.querySelectorAll('#sheetF button')].find(b => b.textContent.includes(l)).click();
  const setv = (id, v) => { document.getElementById(id).value = v; };
  expect(document.body.classList.contains('nodb'), 'first launch hides the placeholder race behind the welcome sheet');
  click('wNow');
  expect(txt('sheetT') === 'Race now' && $('nTeam') && $('nCap'), 'Race now asks for the team and car when they’re missing');
  btn('RACE NOW');
  expect(!DB && txt('sheetT') === 'Race now', 'no drivers: it stays on the sheet');
  setv('nTeam', 'Dawg Days');
  ['Paul', 'Luc', 'Marco'].forEach(n => { setv('nName', n); click('nAdd'); });
  document.querySelector('#nHours [data-h="4"]').click();
  btn('RACE NOW');
  expect(DB && DB.team.name === 'Dawg Days' && S.drivers.map(d => d.name).join() === 'Paul,Luc,Marco', 'team and drivers created in one go');
  expect(raceLen() === 240 && S.race.date === todayISO() && $('tab-race').classList.contains('on'), 'a 4 h race today, on the race screen');
  expect(/GREEN FLAG/.test(txt('bigBtn')) && !document.body.classList.contains('nodb'), 'ready for the green flag');
  expect(/Change/.test(txt('raceSwitch')) && !/Race now/i.test(txt('raceSwitch')), 'pre-race: “Change”, not another Race now');
  // Change re-opens the sheet on this race: 6 h instead, same drivers, no team/car questions
  S.race.minStop = 7; S.race.name = 'Sprint Saturday'; save();                    // a custom rule set on this race
  click('rsNew');
  expect(!$('nTeam') && !$('nCap') && document.querySelector('#nHours .sel').dataset.h === '4', 'Change: only drivers/hours, prefilled 4 h');
  document.querySelector('#nHours [data-h="6"]').click(); btn('RACE NOW');
  expect(raceLen() === 360 && DB.races.length === 1, 'changed to 6 h without leaving a stray race');
  expect(S.race.minStop === 7 && S.race.name === 'Sprint Saturday', 'Change keeps the race’s custom rules and name (edits in place)');
  // race it to the flag
  adv(150); click('bigBtn');                                                       // green 2.5 h after setting it up
  expect(live().now < 1.01 && raceLen() === 360, 'the 6 h clock starts at the green flag, not at setup: ' + hms(live().now) + ' elapsed');
  adv(361);
  expect(/RACE COMPLETE/.test(txt('bigBtn')) && getComputedStyle($('upNextCard')).display === 'none', 'at the flag: one clear action, no empty “Up next”');
  expect(getComputedStyle(document.querySelector('#actionBar .side')).display === 'none', 'flag buttons hidden after the flag');
  TAP_AT = 0; click('bigBtn');
  expect($('tab-debrief').classList.contains('on') && activeRace().status === 'done', 'finish → debrief');
  const nEv = S.events.length; click('undoBtn');
  expect(S.events.length === nEv, 'UNDO can’t reopen a finished, saved race');
  // back on the race tab: not stuck
  show('race'); update();
  expect(/RACE NOW/.test(txt('bigBtn')), 'race tab after a saved race offers RACE NOW: ' + txt('bigBtn'));
  TAP_AT = 0; click('bigBtn');
  expect(txt('sheetT') === 'Race now' && document.querySelectorAll('#nPick button.sel').length === 3, 'Race now prefilled with the same three drivers');
  btn('RACE NOW');
  expect(activeRace().status !== 'done' && !S.events.length && /GREEN FLAG/.test(txt('bigBtn')), 'next race ready');
  // home hero follows the state
  show('home'); renderHome();
  expect(/RACE NOW/.test(txt('hNow')) && /Paul, Luc, Marco/.test(txt('hNow')), 'Home: RACE NOW names the race that’s ready');
  click('hNow');
  expect($('tab-race').classList.contains('on') && DB.races.filter(r => r.status !== 'done').length === 1, 'Home hero opens the ready race, no duplicate');
  adv(1); TAP_AT = 0; click('bigBtn'); show('home'); renderHome();
  expect(/BACK TO THE RACE/.test(txt('hNow')), 'Home during a race: BACK TO THE RACE');
  // simulator speeds
  expect(SIM_SPEEDS.join() === '30,60,120,200', 'sim speeds 30/60/120/200');
});
