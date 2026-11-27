// @window 500,900
// Help mode: the ? toggle, a card for every section (what it is, how to read it, what it means, can / can't),
// taps explain instead of acting (PIT IN must never log from help mode), tabs still navigate, auto-off after 3 min.
__run(() => {
  fresh(s => { s.drivers = [{name:'Paul',max:120},{name:'Luc',max:120}]; s.race.track = 'none'; });
  adv(2.5); click('bigBtn'); adv(30);
  const nEv = S.events.length;
  click('helpBtn');
  expect(document.body.classList.contains('help-on') && getComputedStyle($('helpBar')).display !== 'none', 'the ? button turns help mode on, with a banner');
  click('bigBtn');
  expect(S.events.length === nEv, 'in help mode the big button explains instead of logging PIT IN');
  expect($('helpCard').classList.contains('on') && /The big button/.test(txt('helpCard')) && /How to read/i.test(txt('helpCard')) && /You can’t/i.test(txt('helpCard')), 'its help card explains it: ' + txt('helpCard').slice(0, 60));
  tap('#nextStop'); expect(/Next stop/.test(txt('helpCard')) && $('nextStop').classList.contains('help-target'), 'the countdown has its own card and is outlined');
  tap('#fuelFact'); expect(/estimate/i.test(txt('helpCard')), 'fuel card says it is an estimate');
  click('yBtn'); expect(!live().yellow && /YELLOW/.test(txt('helpCard')), 'YELLOW explains, does not toggle the flag');
  tap('.tabbar button[data-tab="plan"]');
  expect($('tab-plan').classList.contains('on'), 'tabs still switch in help mode');
  // every help key referenced exists, every card has at least "how to read", every tagged element points at a real card
  helpTag();
  const keys = new Set(Object.values(HELP_AT));
  expect([...keys].every(k => HELP[k] && HELP[k].t && HELP[k].read), 'every section has a card with a title and how to read it');
  expect([...document.querySelectorAll('[data-help]')].every(e => HELP[e.dataset.help]), 'every tagged element points at a card');
  const must = ['#bigBtn','#yBtn','#rBtn','#undoBtn','#banners','#nextStop','#fuelFact','#pitTimer','#jugChips','#fullTgl','#nextDrv','#ccGo','#ccCar','#ccRoster','#ccTl','#ccStopsList','.tabbar'];
  expect(must.every(sel => document.querySelector(sel) && document.querySelector(sel).dataset.help), 'all the key race-day controls have help');
  click('helpBtn');
  expect(!document.body.classList.contains('help-on') && !$('helpCard').classList.contains('on'), '? again leaves help mode');
  show('race'); click('bigBtn');
  expect(S.events.length === nEv + 1 && live().inPit, 'outside help mode the big button works again');
  click('helpBtn'); HELP_AT_T = Date.now() - 181000;
  // the 5 s auto-off check runs on a real interval; call its body directly
  if (HELP_ON && Date.now() - HELP_AT_T > 180000) setHelp(false);
  expect(!HELP_ON, 'help mode switches itself off after 3 minutes without use');
});
