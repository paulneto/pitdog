// @window 1180,820
// Settings an admin sets in admin.html reach the app: a banner (escaped), per-series rule overrides (only known
// numeric rule keys), and the crew-set flag note. Applied from an object, as the network fetch would.
__run(() => {
  fresh(s => { s.race.track = 'none'; });
  applyAppSettings({ banner: { text: 'Track closes at 6 pm <img src=x onerror="window.__pwned=1">', level: 'warn' },
    series_overrides: { luckydog: { maxStint: 110, bogus: 5, rest: 'sixty', minStop: -3 }, nosuchseries: { maxStint: 1 } } });
  update();
  expect(/Track closes at 6 pm/.test(txt('ccAlerts') + txt('ccTopAlert')) && !document.querySelector('#cc img') && !window.__pwned, 'admin banner shows, escaped');
  expect(SERIES.luckydog.race.maxStint === 110 && SERIES.luckydog.race.rest === 60 && SERIES.luckydog.race.minStop === 5 && !('bogus' in SERIES.luckydog.race), 'only valid numeric overrides of known rule keys apply');
  expect(SERIES.luckydog.overridden.join() === 'maxStint', 'the note names only the overrides that applied');
  expect(/rules updated by your admin: maxStint/.test(txt('ccAlerts') + txt('ccTopAlert')), 'crew are told the series rules changed');
  expect(SERIES.champcar.race.maxStint === 120, 'other series untouched');
  applyAppSettings({}); update();
  expect(SERIES.luckydog.race.maxStint === 120 && !/Track closes/.test(txt('ccAlerts') + txt('ccTopAlert')), 'clearing the settings restores the presets and removes the banner');
  expect(getComputedStyle($('ccFlag'), '::after').content === 'none' && $('ccFlag').classList.contains('n'), 'pre-race flag has no crew-set note');
  adv(2.5); click('ccGo');
  expect(/crew-set/.test(getComputedStyle($('ccFlag'), '::after').content) && txt('ccFlag') === 'GREEN', 'GREEN is labelled crew-set (visual only)');
});
