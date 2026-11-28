// @window 500,900
// Copy schedule: the plan as text for the team chat.
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }, { name: 'Marco', max: 120 }]; s.race.track = 'calabogie'; s.race.name = 'Saturday'; });
  let copied = null; window.navigator.clipboard && (navigator.clipboard.writeText = t => { copied = t; return Promise.resolve(); });
  window.prompt = (m, d) => { copied = d; return d; };
  const t = scheduleText();
  log(t.split('\n').slice(0, 4).join(' | '));
  expect(/^Saturday · Lucky Dog · Calabogie · 10:00–17:00/.test(t), 'header: race, series, track, times');
  expect((t.match(/^\d+\. /gm) || []).length === P.stints.length && /Stop 1 at \d\d:\d\d · [\d.]+ gal \(\d.*jugs?\) · hold 5:00/.test(t), 'every stint, and each stop with fuel in jugs and the hold');
  expect(/Who drives when\nPaul: .*\nLuc: .*\nMarco: /.test(t) && /Fuel for the day: \d+ gal/.test(t), 'per-driver times and the day’s fuel');
  go('plan'); click('copySched');
  setTimeout(() => {}, 0);
  expect(copied === null || copied === t, 'the button copies the same text');
});
