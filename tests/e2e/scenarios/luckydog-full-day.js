// @window 500,900
// Full Lucky Dog 7-hour day on the phone layout.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120},{name:'Marco',max:120},{name:'Sam',max:120}]; });
  expect(txt('statusPill') === 'PRE-RACE', 'starts PRE-RACE');
  expect(/^0:0[12]:/.test(txt('raceClock')), 'counts down to 10:00 scheduled start: ' + txt('raceClock'));
  adv(2.5); click('bigBtn');
  expect(txt('statusPill') === 'ON TRACK', 'on track after green');
  expect(txt('raceClock') === '0:00:30', 'race clock runs from scheduled 10:00, not the tap: ' + txt('raceClock'));
  adv(70);
  expect(/On deck: Luc/.test(txt('banners')), 'on-deck alert for next driver: ' + txt('banners'));
  adv(9);
  expect(/BOX|Box in/.test(txt('banners')), 'box alert near planned stop');
  click('bigBtn'); adv(3);
  expect(txt('statusPill') === 'IN PITS', 'in pits');
  expect(/Too early/.test(txt('bigBtn')), 'PIT OUT blocked-looking before 5:00');
  tap('#jugChips button[data-j="2"]'); adv(2.2);
  expect(/Car leaving/.test(txt('bigBtn')), 'PIT OUT ready after 5:05');
  click('bigBtn');
  expect(txt('drvName') === 'Luc', 'Luc out after stop 1: ' + txt('drvName'));
  adv(40); click('bigBtn'); tap('#kindChips button[data-k="driver"]'); adv(1);
  expect(/No minimum/.test(txt('pitTarget')), 'driver-only stop has no minimum');
  tap('#nextDrv button[data-d="2"]'); click('bigBtn');
  const cur = P.stints[curIdx(P)];
  expect(S.drivers[cur.driver].name === 'Marco', 'Marco out after driver change');
  expect(!P.W.some(w => w[0] === 'bad'), 'plan stays legal: ' + P.W.filter(w => w[0]==='bad').map(w => w[1]).join(' | '));
  expect(cur.fuelEnd >= S.car.reserve * P.burn - 0.01, 'current stint re-planned to fuel actually in the tank');
  adv(400);
  expect(txt('statusPill') === 'FINISHED' && txt('raceClock') === '7:00:00', 'finishes at scheduled 17:00');
  log('log: ' + S.events.map(e => e.type).join(','));
});
