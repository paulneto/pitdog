// @window 500,900
// @budget 8000
// Moving house (paulneto.github.io → pitdogracecontrol.com). The old address shows the banner only once the new one
// answers; "Move this device" packs the whole database into the link's #fragment; the new address takes it in
// (replacing, with a backup, only after asking), carries the device prefs, and rejects a damaged link.
__run(() => {});
setTimeout(async () => {
  document.getElementById('RESULT') && document.getElementById('RESULT').remove();
  try {
    fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; });
    DB.team.name = 'Dawg Days'; adv(2.5); click('bigBtn'); adv(20); click('yBtn'); dbSave();
    const races = DB.races.length, evs = S.events.length;
    show('home'); renderHome();
    expect(!$('moveCard'), 'no banner while the new address isn’t serving PitDog');
    MOVE.show = true; renderHome(); renderMoveBits();
    expect($('moveCard') && /has moved/i.test(txt('moveCard')), 'banner on Home once the new address answers');
    expect($('moveBtn').style.display === '', 'Team → Data offers the move');
    tap('#mvOpen');
    expect($('sheetBg').classList.contains('on') && /Copy move link/.test(txt('sheetF')) && $('mvGo'), 'move sheet: move, or copy the link for an iPhone icon');
    closeSheet();
    MOVE.noNav = true; await moveOut(false);
    expect(MOVE.went && MOVE.went.startsWith('https://pitdogracecontrol.com/#move=z.'), 'the move link goes to the new address, gzipped: ' + (MOVE.went || '').slice(0, 50));
    log('move link: ' + MOVE.went.length + ' chars');
    renderHome();
    expect(/This device has moved/i.test(txt('moveCard')), 'afterwards the old address says this device has moved');
    // --- the new address: a device that already started a different team
    localStorage.setItem('pitdog_skin', 'night'); localStorage.setItem('pitdog_sound', '1');
    const link = MOVE.went;
    fresh(s => { s.drivers = [{ name: 'Someone', max: 120 }]; }); DB.team.name = 'Other'; adv(1); click('bigBtn'); dbSave();
    let reloaded = false; MOVE.reload = () => { reloaded = true; };
    const ok = await moveIn(link);
    const got = JSON.parse(localStorage.getItem('pitdog_db'));
    expect(ok && reloaded && got.team.name === 'Dawg Days' && got.races.length === races, 'move-in replaces the data and reloads');
    const ar = got.races.find(r => r.id === got.activeRaceId);
    expect(ar && ar.events.length === evs, 'the running race comes with all its log entries');
    expect(backups().some(b => b.why === 'before moving in' && b.db.team.name === 'Other'), 'the device’s own data is kept as a backup');
    // --- damaged links, and the no-compression path (older iPhones)
    reloaded = false;
    expect(!(await moveIn('https://pitdogracecontrol.com/#move=z.AAAA')) && !reloaded, 'a damaged link is refused');
    expect(!(await moveIn('hello')) && !reloaded, 'junk is refused');
    const CS = window.CompressionStream; window.CompressionStream = undefined;
    const raw = await packMove({ app: 'pitdog', move: 1, db: got, prefs: { pitdog_skin: 'sunlight', evil: 'x' } }); window.CompressionStream = CS;
    expect(raw.startsWith('j.'), 'without CompressionStream the link is plain base64');
    localStorage.removeItem('pitdog_db'); DB = null;
    expect(await moveIn('#move=' + raw) && reloaded && localStorage.getItem('pitdog_skin') === 'sunlight' && localStorage.getItem('evil') === null, 'plain link works, carries the look, ignores unknown keys');
    // --- paste box on the new address
    loadDB(); hydrate(); MOVE.old = false; renderMoveBits();
    expect($('pasteMove').style.display === '', 'the new address offers “Bring data from the old address”');
    pasteMoveSheet(); expect($('mvPaste') && $('mvIn'), 'paste sheet'); closeSheet();
  } catch (e) { R.fails.push('EXCEPTION ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'RESULT'; p.textContent = JSON.stringify(R); document.body.appendChild(p);
}, 400);
