// @window 500,900
// The welcome on a new device has a way straight to Home: an empty team, nothing to fill in, and every screen still works.
__run(() => {
  expect(welcomeOn() && $('wHome') && $('wJoin') && /Run the pit wall/.test(txt('welcome')), 'a new device shows the welcome page, with Skip and Join');
  click('wHome');
  expect(DB && !welcomeOn() && !$('sheetBg').classList.contains('on') && $('tab-home').classList.contains('on') && !document.body.classList.contains('nodb'), 'Skip lands on Home with the welcome closed');
  expect(DB.team.members.length === 0 && DB.team.cars.length === 1 && activeRace(), 'an empty team: one default car, no people, a blank race');
  const H = txt('homeBody'); expect(/race now/i.test(H), 'Home offers Race now: ' + H.slice(0, 80));
  let err = null; try { go('race'); const lv = live(); P = plan(lv); renderRace(); go('team'); renderTeamTab(); go('plan'); go('money'); renderMoney(); go('home'); } catch (e) { err = e.message; }
  expect(!err, 'every tab opens with an empty team: ' + err);
  expect(/sign in/i.test(txt('syncBody')) || $('syncBody').innerHTML.length > 0, 'Team tab: sign in and join a team from there');
  const back = normalizeDB(JSON.parse(localStorage.getItem('pitdog_db')));
  expect(back && back.team.cars.length === 1, 'the empty team is saved, so the welcome doesn’t come back');
  // team money in the simulator: tapping an entry opens it read-only instead of doing nothing
  DB.team.members.push({ id: 'p1', name: 'Paul', role: 'owner', maxStint: 120, color: '#ff5a4e' }); dbSave();
  const x = moneyAdd({ k: 'exp', amt: 2500, by: 'p1', cat: 'food', date: todayISO(), split: { m: 'auto' } });
  startSim({ speed: 0 }); go('money');
  document.querySelector(`#moneyList [data-eid="${x.id}"]`).click();
  expect($('sheetBg').classList.contains('on') && /read-only/.test(txt('sheetT')) && $('xAmt').disabled, 'in the simulator an expense opens read-only: ' + txt('sheetT'));
  closeSheet(); endSim(true);
});
