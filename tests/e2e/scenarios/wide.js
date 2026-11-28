// @window 1440,1043
// A laptop browser (1440x900): Home, Team, Plan and Team money use the width (cards in columns), not a phone strip.
__run(() => {
  try { localStorage.setItem('pitdog_view', 'phone'); } catch (e) {}
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; s.race.date = addDaysISO(todayISO(), 1); });
  applyView();
  const lefts = sel => new Set([...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().height > 0).map(e => Math.round(e.getBoundingClientRect().left))).size;
  go('home'); expect(lefts('#homeBody>.card') >= 2, 'Home: cards sit in columns at ' + innerWidth + ' px');
  go('team'); expect(lefts('#tab-team>.card') === 3, 'Team: three columns');
  go('money'); expect(lefts('#moneyBody>.card') >= 2, 'Team money: columns');
  go('plan'); const k = [...document.querySelectorAll('#kpis>*')]; expect(k.length === 6 && new Set(k.map(e => Math.round(e.getBoundingClientRect().top))).size === 1, 'Plan: the six headline numbers in one row');
  const tl = document.querySelector('#tab-plan .card').getBoundingClientRect(); expect(tl.width > 1000, 'Plan: the timeline spans the full width');
  go('race'); expect(document.body.dataset.tab === 'race', 'the race screen keeps its own layout');
});
