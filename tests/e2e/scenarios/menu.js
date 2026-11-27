// @window 500,900
// The menu is a way out of any state: end or abandon a race, leave the simulator or help mode, start over.
__run(() => {
  const item = t => [...document.querySelectorAll('#sheetB .mrow')].find(b => b.textContent.includes(t));
  const items = () => [...document.querySelectorAll('#sheetB .mrow b')].map(b => b.textContent);
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; });
  expect(getComputedStyle($('menuBtn')).display !== 'none', 'menu button in the top bar');
  // mid-race: end it now
  adv(2); click('bigBtn'); adv(45);
  click('menuBtn');
  expect(txt('sheetT') === 'Menu' && items().includes('End the race now') && items().includes('Abandon this race') && !items().includes('Race now'), 'mid-race menu: end / abandon, no “Race now”: ' + items().join(', '));
  item('End the race now').click();
  const r = DB.races.find(x => x.status === 'done');
  expect(r && r.summary && $('tab-debrief').classList.contains('on'), 'End the race now saves it and opens the debrief');
  expect(S.events.some(e => e.type === 'end') && live().finished && Math.abs(live().L - 45) < 0.1, 'the race is over at 45 min, not at the planned 7 h');
  expect(computeDebrief(r).L < 46, 'the debrief uses the early end');
  show('race'); update();
  expect(/RACE NOW/.test(txt('bigBtn')), 'race screen then offers RACE NOW');
  // abandon: throw the race away
  TAP_AT = 0; click('bigBtn'); [...document.querySelectorAll('#sheetF button')].find(b => b.textContent.includes('RACE NOW')).click();
  adv(1); TAP_AT = 0; click('bigBtn'); adv(10);
  const nBefore = DB.races.length, abandoned = activeRace().id;
  click('menuBtn'); item('Abandon this race').click();
  expect(!DB.races.some(x => x.id === abandoned) && DB.races.length === nBefore && txt('sheetT') === 'Race now', 'Abandon throws the race away and offers Race now');
  expect(JSON.parse(localStorage.getItem('pitdog_backup')).why.startsWith('before abandoning'), 'a backup is kept');
  closeSheet(); update();
  expect(activeRace() && !live().started && /GREEN FLAG/.test(txt('bigBtn')), 'cancelling Race now still leaves a usable race screen');
  // help mode: the menu still opens and gets you out
  setHelp(true); click('menuBtn');
  expect(txt('sheetT') === 'Menu' && items()[0] === 'Leave help mode', 'menu works in help mode and offers to leave it');
  item('Leave help mode').click();
  expect(!HELP_ON, 'help mode off');
  // Esc closes sheets and help
  click('menuBtn'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(!$('sheetBg').classList.contains('on'), 'Esc closes the menu');
  setHelp(true); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(!HELP_ON, 'Esc leaves help mode');
  // simulator: end it from the menu
  startSim({ speed: 0 }); click('menuBtn');
  expect(items()[0] === 'End the simulation' && !items().includes('Abandon this race'), 'in the simulator the menu offers to end it');
  item('End the simulation').click();
  expect(!SIM.on, 'simulation ended');
});
