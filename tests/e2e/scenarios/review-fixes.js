// @window 500,900
// Regression checks from the second independent review (27–28 Nov 2026).
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; s.series = 'custom'; s.race.len = 360; });
  // 1. a device whose stored doc hash came from the old shape (no presets / presetDel) isn't treated as dirty
  const old = { name: DB.team.name, series: DB.team.series, members: DB.team.members, cars: DB.team.cars, exampleProfiles: !!DB.team.exampleProfiles };
  DB.team.docHash = hashOf(old); migrateDocHash(DB);
  expect(DB.team.docHash === hashOf(teamDoc()), 'old-shape doc hash is re-stamped, so the stale local doc isn’t pushed over the server');
  const tonight = Object.assign({}, old, { presets: [] }); DB.team.docHash = hashOf(tonight); migrateDocHash(DB);
  expect(DB.team.docHash === hashOf(teamDoc()), '…same for a device on the previous build (presets, no tombstones)');
  const oldHash = hashOf(old); DB.team.members[0].name = 'Edited'; const h = hashOf(teamDoc()); DB.team.docHash = oldHash; migrateDocHash(DB);
  expect(DB.team.docHash !== h, 'a genuinely edited doc stays dirty'); DB.team.members[0].name = 'Paul';
  // 6. presets merge by id; deletes are tombstones
  const P1 = { id: 'p1', name: 'Mine', series: 'luckydog', hours: 7, track: 'none', carId: null, drivers: [], rules: null };
  const P2 = { id: 'p2', name: 'Theirs', series: 'luckydog', hours: 4, track: 'none', carId: null, drivers: [], rules: null };
  DB.team.presets = [P1]; DB.team.presetDel = []; mergePresets({ presets: [P2], presetDel: [] });
  expect(DB.team.presets.map(x => x.id).sort().join() === 'p1,p2', 'two planners’ offline presets both survive a merge');
  mergePresets({ presets: [P2], presetDel: ['p1'] });
  expect(DB.team.presets.map(x => x.id).join() === 'p2' && DB.team.presetDel.includes('p1'), 'a delete on another device removes it here too');
  mergePresets({ presets: [P1, P2], presetDel: [] });
  expect(!DB.team.presets.some(x => x.id === 'p1'), 'a deleted preset doesn’t come back from a stale copy');
  // 2. sound: a cleared rehearsal log doesn't silence the real race
  const tick = () => { const lv = live(); P = plan(lv); soundTick(lv, P); };
  SND.on = true; SND.log = []; adv(1); click('bigBtn'); TAP_AT = 0; tick();
  const tt = () => { const p = plan(live()); return p.stints[curIdx(p)].end - live().now; };
  adv(tt() + 0.05); tick(); click('bigBtn'); TAP_AT = 0; adv(5.3); tick();
  expect(SND.log.includes('served'), 'rehearsal: stop served plays');
  S.events = []; save(); update(); tick(); SND.log = [];                     // clear the log, race for real
  adv(1); click('bigBtn'); TAP_AT = 0; tick(); adv(tt() + 0.05); tick(); click('bigBtn'); TAP_AT = 0; adv(5.3); tick();
  expect(SND.log.includes('box') && SND.log.includes('served'), 'after clearing the log, the real race’s box and served alerts play: ' + SND.log.join());
  // 3. box-in-3 re-arms when the stop moves later
  click('bigBtn'); TAP_AT = 0; tick(); SND.log = []; adv(tt() - 2.9); tick();
  expect(SND.log.includes('box3'), 'box in 3 plays');
  adv(-5); tick(); SND.log = []; adv(5); tick();                                // the stop moved ~5 min later (e.g. a long yellow), then time catches up
  expect(SND.log.includes('box3'), 'when the stop moves later, box in 3 plays again at the new time: ' + SND.log.join());
  // 5. records see a Fix that keeps the log length the same
  const r = activeRace(); addEvent({ type: 'end' }); finishRace(true);
  const before = computeRecords(null).fuel; const out = r.events.filter(e => e.type === 'out').pop();
  out.fuel = (out.fuel || 0) + 10; dbSave();
  expect(Math.abs(computeRecords(null).fuel - before - 10) < 0.01, 'records update after a fix that keeps the same number of entries');
  // 8. the stop brief uses the app’s jug label
  expect(typeof jugLbl === 'function' && jugLbl(2.5) === '2½', 'jug label 2½');
});
