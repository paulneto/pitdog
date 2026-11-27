// @window 1180,820
// iPad landscape: command center turns on, mirrors race state, and its controls drive the race.
__run(() => {
  try { localStorage.setItem('pitdog_view', 'auto'); } catch (e) {}
  fresh(s => { s.race.track = 'none'; });
  expect(document.body.classList.contains('cc-on'), 'command center active at 1180x820');
  expect(txt('ccFlag') === 'PRE-RACE', 'flag PRE-RACE');
  adv(2.5); click('ccGo');
  expect(txt('ccFlag') === 'GREEN' && txt('ccState') === 'ON TRACK', 'green + on track via CC button');
  click('ccY'); expect(/YELLOW/.test(txt('ccFlag')), 'yellow flag bar');
  expect(!$('ccFlagBar').classList.contains('has'), 'flag bar is just the flag when all is calm');
  expect(document.querySelectorAll('#ccStopsList .cc-ns').length >= 3 && /^#1/.test(txt('ccStopsList')), 'Next stops panel lists the upcoming stops: ' + txt('ccStopsList').slice(0, 60));
  click('ccY'); adv(78);   // (clears the yellow set above)
  expect($('ccFlagBar').classList.contains('has') && txt('ccFlag') === 'GREEN' && /Box in/.test(txt('ccTopAlert')), 'most urgent alert rides in the flag bar beside the flag: ' + txt('ccTopAlert'));
  click('ccY'); expect(/YELLOW/.test(txt('ccFlag')) && /pit NOW/i.test(txt('ccTopAlert')), 'under yellow the flag bar says pit now: ' + txt('ccTopAlert')); click('ccY');
  click('ccGo'); adv(2);
  expect(txt('ccState') === 'IN PITS' && /too early/.test(txt('ccGo')), 'in pits with too-early PIT OUT');
  tap('#ccDrvs button[data-d="2"]'); adv(3.5); click('ccGo');
  expect(S.drivers[P.stints[curIdx(P)].driver].name === S.drivers[2].name, 'CC next-driver pick applied');
  expect(document.querySelectorAll('#ccTl .sg').length === P.stints.length, 'timeline shows every stint');
  expect(document.querySelectorAll('#ccRoster .cc-r').length === S.drivers.length, 'roster shows every driver');
  // the stop brief under the countdown: what the crew needs ready
  const ci = curIdx(P), cur = P.stints[ci], nx = P.stints[ci + 1];
  if (nx && cur.stop) {
    const b = document.getElementById('ccBrief').textContent;
    expect(/brief/i.test(b) && b.includes(S.drivers[nx.driver].name) && (cur.stop.add > 0 ? /jug/.test(b) : /none/.test(b)), 'stop brief names the next driver and the fuel in jugs: ' + b);
    expect(document.getElementById('ccGo').getBoundingClientRect().bottom <= document.getElementById('ccCar').getBoundingClientRect().bottom + 1, 'PIT button stays inside the car panel: ' + Math.round(document.getElementById('ccGo').getBoundingClientRect().bottom) + ' vs ' + Math.round(document.getElementById('ccCar').getBoundingClientRect().bottom) + ' win ' + innerWidth + 'x' + innerHeight);
  }
  // command center: one tap back to Home, and the button to return is there
  store.set('pitdog_view', 'cc'); applyView();
  expect(document.body.classList.contains('cc-on'), 'command center on');
  click('ccHome');
  expect(!document.body.classList.contains('cc-on') && $('tab-home').classList.contains('on'), 'HOME in the command center goes to the Home screen');
  store.set('pitdog_view', 'cc'); applyView(); click('ccMenu');
  expect([...document.querySelectorAll('#sheetB .mrow b')].map(b => b.textContent).join().includes('Home') && [...document.querySelectorAll('#sheetB .mrow b')].map(b => b.textContent).join().includes('Phone view'), 'command center menu offers Home and Phone view');
  [...document.querySelectorAll('#sheetB .mrow')].find(b => b.textContent.includes('Home')).click();
  expect(!document.body.classList.contains('cc-on') && $('tab-home').classList.contains('on'), 'menu → Home leaves the command center');
});
