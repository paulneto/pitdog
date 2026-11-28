// @window 1180,820
// Glove-sized targets on the iPad command center: every control on the race screen, on track and in a pit stop, is at least 40 px each way
// (Apple's minimum is 44; the top-bar buttons fill a 44 px bar). Exceptions: UNDO is deliberately smaller (≥ 28 px) so it
// isn't hit by accident, and the round help/menu buttons and pill buttons extend their tap area beyond what's drawn.
__run(() => {
  try { localStorage.setItem('pitdog_view', 'auto'); } catch (e) {}
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; });
  applyView(); go('race');
  const cc = document.body.classList.contains('cc-on'), goB = cc ? 'ccGo' : 'bigBtn', yB = cc ? 'ccY' : 'yBtn';
  const small = tag => { const out = []; document.querySelectorAll('button,[role=button],a[href],select').forEach(el => {
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const af = getComputedStyle(el, '::after'), pad = af.content !== 'none' && af.position === 'absolute';
      const min = (el.id === 'undoBtn' || el.id === 'ccU' || pad) ? 28 : 40;
      if (r.width < min || r.height < min) out.push(tag + ':' + (el.id || el.textContent.trim().slice(0, 14)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
    return out; };
  expect(cc, 'the command center is on at ' + innerWidth + 'x' + innerHeight);
  let bad = small('pre-race');
  adv(2); click(goB); TAP_AT = 0; adv(1); click(yB); bad = bad.concat(small('on track, yellow')); click(yB);
  adv(60); click(goB); TAP_AT = 0; adv(1); bad = bad.concat(small('in the pits'));
  if (cc) { const pv = $('ccPitView').getBoundingClientRect(), d = [...document.querySelectorAll('#ccDrvs button')].map(b => b.getBoundingClientRect());
    expect(d.length && d.every(r => r.height >= 40 && r.bottom <= pv.bottom + 1), 'command center pit stop: the next-driver chips are fully visible, not clipped (' + d.map(r => Math.round(r.bottom)).join(',') + ' vs ' + Math.round(pv.bottom) + ')'); }
  expect(!bad.length, 'no small targets on the iPad command center: ' + bad.join(', '));
  if (!cc) { const y = $('yBtn').getBoundingClientRect(); expect(y.height >= 44, 'YELLOW is at least 44 px tall: ' + Math.round(y.height)); }
  else { const y = $('ccY').getBoundingClientRect(), r = $('ccR').getBoundingClientRect(); expect(y.height >= 44 && r.height >= 44 && Math.abs(y.top - r.top) < 2, 'command center: YELLOW and RED side by side, 44 px+: ' + Math.round(y.height)); }
});
