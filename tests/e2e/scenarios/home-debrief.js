// @window 500,900
// Home + debrief. A race is run by hand with known mistakes (a stop held 52 s over the minimum, a cheap yellow stop
// not taken, a full fill so burn gets measured), finished from the big button, and the debrief must name each one.
// Then Home: next race (dated tomorrow) with forecast slot and prep checklist, last race, team, and the start tab rule.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc <b>x</b>',max:120},{name:'Marco',max:120}]; s.race.track = 'none'; s.race.date = todayISO(); });
  expect(startTab() === 'race', 'race dated today: the app opens on the race screen');
  adv(2.5); click('bigBtn');                                   // green (snapshot of the plan is taken)
  expect(Array.isArray(activeRace().planAtGreen) && activeRace().planAtGreen.length === P.stints.length, 'the plan at the green is saved for the debrief');
  // a cheap yellow ~10 min before the first stop that the crew ignores
  const due = P.stints[0].end; adv(due - 10 - live().now); click('yBtn'); adv(4); click('yBtn');
  adv(P.stints[0].end - live().now + 0.3);
  click('bigBtn'); adv(5 + 40 / 60 + 0.2); click('bigBtn');   // PIT IN, then out 40 s over the 5:00 minimum, filled to full
  // second stop on time, also full
  adv(P.stints[curIdx(P)].end - live().now + 0.3); click('bigBtn'); adv(5.1); click('bigBtn');
  adv(500);                                                     // to the checkered flag
  expect(live().finished && /debrief/i.test(txt('bigBtn')), 'at the flag the big button offers the debrief: ' + txt('bigBtn'));
  click('bigBtn');                                              // finishes the race (confirm auto-yes) and opens the debrief
  const r = DB.races.find(x => x.status === 'done');
  expect(r && $('tab-debrief').classList.contains('on'), 'finishing opens the debrief');
  const D = txt('debriefBody');
  expect(/over the minimums|beyond the minimums/i.test(D) && /\+5\d s/.test(D), 'debrief: time over the pit-stop minimum, per stop: ' + (D.match(/\+\d+ s/g) || []).join(','));
  expect(/cheap yellow stop was on offer and not taken/i.test(D) && /a cheap stop you didn’t take/.test(D), 'debrief: the missed cheap yellow stop');
  expect(/Measured fuel burn/.test(D), 'debrief: fuel burn measured from the full fills');
  expect(/Plan at the green vs what happened/i.test(D), 'debrief: plan at the green vs actual');
  expect(document.querySelector('[data-help="debrief_stops"] table').rows.length === 1 + 2, 'pit stop table has one row per stop (2)');
  expect(!document.querySelector('#debriefBody b b') && /Luc <b>x<\/b>/.test(D), 'driver names are escaped in the debrief');
  const marco = computeDebrief(r).drivers.find(o => o.name === 'Marco');
  expect(marco.seat > 240 && marco.seat <= 7 * 60 - 140 && marco.longest > 120, 'debrief follows the log: Marco drove from the last stop to the flag (' + fmt(marco.seat) + ')');
  expect(/Marco drove a .* stint, over the 2:00(:00)? limit/.test(D) && /No stops were logged in the last/.test(D), 'debrief flags the over-long final stint and the missing stops');
  expect(Object.values(r.summary.seat).every(v => v <= 7 * 60 + 0.01), 'saved seat time never runs past the flag');
  $('dbNotes').value = 'Fuel man was slow on stop 1'; $('dbNotes').oninput();
  expect(r.notes === 'Fuel man was slow on stop 1', 'notes are saved with the race');

  // Home: plan tomorrow's race
  const nr = newRaceObj({ series: 'luckydog', rules: Object.assign(clone(r.rules), { name: 'Sunday', date: addDaysISO(todayISO(), 1) }), carId: r.carId, drivers: clone(r.drivers) });
  DB.races.push(nr); dbSave(); DB.activeRaceId = nr.id; reloadActive();
  expect(startTab() === 'home', 'race dated tomorrow, not started: the app opens on Home');
  show('home'); renderHome();
  const H = txt('homeBody');
  expect(/Next race/i.test(H) && /tomorrow/i.test(H) && /Sunday/.test(H), 'Home: next race with its day');
  expect(document.querySelectorAll('#homeBody [data-prep]').length === 6 && /jug/.test(H), 'Home: prep checklist from the plan (fuel, jugs, first driver…)');
  tap('#homeBody [data-prep="fuel"]');
  expect(nr.prep.fuel === true && /1\/6/.test(txt('homeBody')), 'ticking a prep item is saved');
  // this device: no offline copy in the test browser, so it's flagged with the fix; once saved, it reads ready
  SND.on = true; DEVOK.off = false; renderHome();
  expect($('devCard') && /Works with no signal/.test(txt('devCard')) && /1 to fix/i.test(txt('devCard')) && /once with signal/.test(txt('devCard')), 'Home: device check flags a missing offline copy, with the fix: ' + ($('devCard') ? txt('devCard') : 'no card'));
  DEVOK.off = true; renderHome();
  expect(/ready/i.test(txt('devCard')) && !/to fix/i.test(txt('devCard')), 'Home: device check reads ready once everything is in place');
  SND.on = false; renderHome();
  expect(/Sound alerts on/.test(txt('devCard')) && /Menu/.test(txt('devCard')), 'device check: sound off is flagged');
  expect(/Last race/i.test(H) && document.getElementById('hDebrief'), 'Home: last race with a link to its debrief');
  click('hDebrief'); expect($('tab-debrief').classList.contains('on') && /Fuel man was slow/.test($('dbNotes').value), 'Home opens the last debrief');
  show('home'); renderHome();
  expect(/Paul/.test(txt('homeBody')) && document.querySelectorAll('#homeBody .hseat').length === 3, 'Home: season seat time per driver');
  DB.races.find(x => x.id === nr.id).rules.date = todayISO(); reloadActive();
  expect(startTab() === 'race', 'on race day it opens the race screen again');
});
