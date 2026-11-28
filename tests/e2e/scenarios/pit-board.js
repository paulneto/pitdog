// @window 500,900
// Pit board: suggestions from the plan, full-screen message that fits the screen, tap to close.
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }]; s.race.track = 'none'; });
  adv(1); click('bigBtn'); TAP_AT = 0; adv(30);
  click('pbOpen');
  const chips = [...document.querySelectorAll('#sheetB [data-pb]')].map(b => b.dataset.pb);
  expect(txt('sheetT') === 'Pit board' && /^BOX \+\d+$/.test(chips[0]) && chips[1] === 'LUC NEXT' && chips.includes('STAY OUT'), 'suggests BOX +laps and the next driver: ' + chips.slice(0, 3).join(', '));
  document.querySelector('#sheetB [data-pb]').click();
  const el = $('pitBoardFS'), b = el.querySelector('b');
  expect(el.classList.contains('on') && b.textContent === chips[0] && !$('sheetBg').classList.contains('on'), 'the message goes full screen');
  expect(b.scrollWidth <= innerWidth && parseFloat(b.style.fontSize) > 80, 'big enough to read at speed, and fits: ' + Math.round(parseFloat(b.style.fontSize)) + 'px');
  el.click(); expect(!el.classList.contains('on'), 'tap closes it');
  click('pbOpen'); $('pbText').value = 'tyres ok'; click('pbShow');
  expect($('pitBoardFS').querySelector('b').textContent === 'TYRES OK', 'your own message, in capitals');
  $('pitBoardFS').click(); click('menuBtn');
  expect([...document.querySelectorAll('#sheetB .mrow b')].some(x => x.textContent === 'Pit board'), 'also in the menu');
  closeSheet();
  // help mode can't trap the board
  setHelp(true); click('menuBtn'); [...document.querySelectorAll('#sheetB .mrow')].find(x => /Pit board/.test(x.textContent)).click();
  document.querySelector('#sheetB [data-pb]').click();
  expect($('pitBoardFS').classList.contains('on') && !HELP_ON, 'showing the board leaves help mode');
  $('pitBoardFS').click(); expect(!$('pitBoardFS').classList.contains('on'), '…and a tap closes it');
  showBoard('STAY OUT'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(!$('pitBoardFS').classList.contains('on'), 'Esc closes the board');
});
