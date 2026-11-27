// @window 500,900
// PCA Club Racing 2-hour enduro: one mandatory 5:00 stop inside the 15-min / last-10-min window.
__run(() => {
  fresh(s => { s.series = 'pca'; Object.assign(s.race, SERIES.pca.race, { len: 120 });
    s.car = Object.assign(s.car, { cap: 16.9, burn: 0.55, lap: '2:05', pitLoss: 40, changeSec: 45, margin: 5 });   // burn known from practice
    s.drivers = [{name:'A',max:60},{name:'B',max:60}]; });
  expect(P.stints.length === 2, 'one planned stop: ' + (P.stints.length - 1));
  const stopAt = P.stints[0].end; expect(stopAt > 15 && stopAt < 110, 'stop inside window: ' + stopAt.toFixed(1));
  click('bigBtn'); adv(10);
  expect(/Stop window opens in/.test(txt('banners')), 'window-opens banner before 15:00');
  click('yBtn');
  expect(/pits closed/i.test(txt('banners')), 'PCA: pits closed under FCY');
  click('yBtn'); adv(stopAt - 10); click('bigBtn'); adv(5.2); click('bigBtn');
  expect(txt('drvName') === 'B', 'driver B after the stop');
  adv(70);
  expect(txt('statusPill') === 'FINISHED', 'finished');
  expect(!P.W.some(w => w[0] === 'bad'), 'no rule violations');
});
