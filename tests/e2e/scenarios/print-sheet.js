// @window 500,900
// Printed race-day sheet: the paper backup. One stint row per planned stint, fuel per stop, rules, rotation,
// a blank pit-log grid, names escaped; window.print is stubbed so the sheet can be inspected.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc <i>x</i>',max:120},{name:'Marco',max:120}]; s.race.track = 'glen'; s.race.date = todayISO(); });
  let printed = 0; window.print = () => { printed++; };
  click('print');
  const box = $('printSheet'), T = box.textContent;
  expect(printed === 1, 'Print builds the sheet, then prints');
  expect(/Saturday/.test(T) && /Lucky Dog/.test(T) && /Watkins Glen/.test(T), 'header: race, series, track');
  expect(box.querySelectorAll('table')[0].rows.length === 1 + P.stints.length, 'one stint row per planned stint');
  expect(/jugs/.test(T) && /finish/.test(T), 'fuel per stop in jugs; the last stint runs to the finish');
  expect(/Max stint/.test(T) && /Rotation/.test(T), 'rules at a glance and the rotation');
  expect(box.querySelectorAll('table.grid tr').length >= 9, 'a blank pit-log grid for logging by hand');
  expect(!box.querySelector('i') && /Luc <i>x<\/i>/.test(T), 'driver names escaped');
  expect(getComputedStyle(box).display === 'none', 'the sheet is invisible on screen (print only)');
});
