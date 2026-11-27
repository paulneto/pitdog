// @window 500,900
// Data saved by the pre-team version (single race in localStorage 'pitdog') becomes a team on load.
__run(() => {
  const old = JSON.parse(JSON.stringify(DEFAULT));
  old.drivers = [{name:'Paul',max:110},{name:'Luc',max:120}]; old.race.name = 'Saturday'; old.events = [{t:1,type:'green'}];
  old.archive = [{name:'VIR', date: 1700000000000, stops: 3, fuel: 40, events: []}];
  localStorage.removeItem('pitdog_db'); localStorage.setItem('pitdog', JSON.stringify(old));
  DB = null; loadDB(); hydrate(); bind(); update();
  expect(DB && DB.team.members.map(m => m.name).join() === 'Paul,Luc', 'drivers became team members');
  expect(S.race.name === 'Saturday' && S.events.length === 1 && S.drivers[0].max === 110, 'active race keeps its plan and log');
  expect(DB.races.some(r => r.rules.name === 'VIR' && r.status === 'done'), 'old archived day became a done race');
  expect(!!localStorage.getItem('pitdog_db'), 'saved in the new format');
});
