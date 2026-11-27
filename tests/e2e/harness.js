// Injected into a copy of app/index.html for each scenario. Gives a fake, controllable clock
// (race day starts at 09:58 local), auto-confirm dialogs, helpers and a result block.
const __d0 = new Date(); __d0.setHours(9, 58, 0, 0);
const BASE = __d0.getTime(); let OFF = 0; Date.now = () => BASE + OFF;
window.confirm = () => true; window.alert = () => {}; window.prompt = (m, d) => d;
const adv = m => { OFF += m * 60000; update(); };                 // advance race time by m minutes
const click = id => document.getElementById(id).click();
const tap = sel => document.querySelector(sel).click();
const txt = id => document.getElementById(id).innerText.replace(/\s+/g, ' ').trim();
const R = { fails: [], log: [], checks: 0 };
window.addEventListener('error', e => R.fails.push('UNCAUGHT ' + e.message));   // errors inside click handlers don't reach the caller
const expect = (cond, msg) => { R.checks++; if (!cond) R.fails.push(msg); };
const log = m => R.log.push(m);
function fresh(patch) { const s = JSON.parse(JSON.stringify(DEFAULT)); if (patch) patch(s); adoptS(s, 'Test team'); }   // new local team with one race
window.__run = fn => setTimeout(() => {
  try { fn(); } catch (e) { R.fails.push('EXCEPTION ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'RESULT'; p.textContent = JSON.stringify(R); document.body.appendChild(p);
}, 300);
