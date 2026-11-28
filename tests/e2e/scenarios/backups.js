// @window 500,900
// Backups: the last five copies are kept (not just one), and any of them can be restored.
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; });
  DB.team.name = 'Version 1'; dbSave(); backupDB('test 1');
  for (let i = 2; i <= 7; i++) { DB.team.name = 'Version ' + i; dbSave(); backupDB('test ' + i); }
  const L = backups();
  expect(L.length === 5 && L[0].why === 'test 7' && L[4].why === 'test 3', 'keeps the five newest backups, newest first');
  DB.team.name = 'Current'; dbSave();
  go('team');
  expect(getComputedStyle($('restoreBk')).display !== 'none' && /Restore a backup \(5\)/.test(txt('restoreBk')), 'Team → Data shows “Restore a backup (5)”');
  click('restoreBk');
  expect(document.querySelectorAll('#sheetB [data-bk]').length === 5, 'the picker lists all five');
  document.querySelectorAll('#sheetB [data-bk]')[2].click();                  // "test 5"
  expect(DB.team.name === 'Version 5', 'restoring the third one brings back Version 5');
  expect(backups()[0].why === 'before restoring' && backups()[0].db.team.name === 'Current', 'what was on the device is kept as the newest backup');
  expect(activeRace() && !document.querySelector('#sheetBg.on'), 'a usable race after restoring');
});
