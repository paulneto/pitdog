// @window 500,900
// Removing a person and deleting a team: the Remove button is always there (it explains when it can't), and the
// team sheet has Delete team (local: start over with a backup).
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }, { name: 'Marco', max: 120 }]; s.race.track = 'none'; });
  const [P_, L_, M_] = DB.team.members.map(m => m.id); const sheetBtn = t => [...document.querySelectorAll('#sheetF button')].find(x => x.textContent === t);
  // in an upcoming race (not started): Remove is offered and takes them off the race too
  go('team'); document.querySelector(`#memberList [data-mid="${M_}"]`).click();
  let said = ''; window.confirm = m => { said = m; return true; };
  expect(sheetBtn('Remove'), 'Remove is offered for someone in an upcoming race');
  sheetBtn('Remove').click();
  expect(!member(M_) && !activeRace().drivers.some(d => d.mid === M_) && /upcoming race/.test(said), 'removed from the team and the upcoming race, and the confirm says so');
  // in the race that's running: explained, not removed
  adv(2.5); click('bigBtn');
  go('team'); document.querySelector(`#memberList [data-mid="${L_}"]`).click();
  let warned = ''; window.alert = m => { warned = m; };
  sheetBtn('Remove').click();
  expect(member(L_) && /race that’s running/.test(warned), 'someone in the running race isn’t removed; it says why');
  closeSheet(); window.alert = () => {};
  // deleting a local team = start over, with a backup
  const nb = backups().length; click('teamEdit');
  expect(sheetBtn('Delete team'), 'the team sheet has Delete team');
  sheetBtn('Delete team').click();
  expect(!DB && txt('sheetT') === 'Welcome to PitDog' && backups().length === nb + 1, 'deleting a local team starts over (backup kept)');
  window.confirm = () => true;
});
