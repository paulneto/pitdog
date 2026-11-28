// @window 500,900
// @budget 15000
// Team sync against an in-memory fake Supabase server shared by two "devices" (A = owner iPad, B = crew phone),
// which take turns in this page by swapping their local state. RLS itself is tested for real in supabase/tests.
const SRV = { teams: [], team_codes: [], memberships: [], history: [], races: [], events: [], ledger: [], down: false, user: null, subs: [], delay: 0, dead: false };
// like Postgres jsonb: objects come back with their keys in a different order than they were written
const jsonb = v => Array.isArray(v) ? v.map(jsonb) : v && typeof v === 'object' ? Object.keys(v).sort().reverse().reduce((o, k) => (o[k] = jsonb(v[k]), o), {}) : v;
const out = r => { const o = JSON.parse(JSON.stringify(r)); ['settings', 'doc', 'payload'].forEach(k => { if (o[k]) o[k] = jsonb(o[k]); }); return o; };
const U = { A: { id: '11111111-1111-4111-8111-111111111111', email: 'paul@neto.me' }, B: { id: '22222222-2222-4222-8222-222222222222', email: 'luc@example.com' } };
const roleOf = (tid) => (SRV.memberships.find(m => m.team_id === tid && m.user_id === SRV.user.id) || {}).role;
function broadcast(table, row) { SRV.subs.forEach(s => s.table === table && s.cb({ new: out(row) })); }
function Q(table) {
  const st = { table, filters: [], op: 'select', single: false };
  const q = {
    select() { return q; }, eq(c, v) { st.filters.push([c, v]); return q; }, single() { st.single = true; return q; },
    insert(rows) { st.op = 'insert'; st.rows = [].concat(rows); return q; }, upsert(rows, o) { st.op = 'upsert'; st.rows = [].concat(rows); return q; },
    update(obj) { st.op = 'update'; st.obj = obj; return q; }, delete() { st.op = 'delete'; return q; },
    then(res, rej) { return new Promise(r => setTimeout(r, SRV.delay)).then(() => run(st)).then(res, rej); },
  };
  return q;
}
function run(st) {
  if (SRV.down) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
  const T = SRV[st.table], match = r => st.filters.every(([c, v]) => r[c] === v);
  const visible = r => !SRV.dead && (st.table === 'teams' ? roleOf(r.id) : st.table === 'team_codes' ? ['owner', 'pitwall'].includes(roleOf(r.team_id)) : st.table === 'memberships' ? roleOf(r.team_id) : roleOf(r.team_id));
  if (st.op === 'select') { const d = T.filter(match).filter(visible).map(out); if (st.single && !d.length) return { data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' } }; return { data: st.single ? d[0] : d, error: null }; }
  if (st.op === 'insert' || st.op === 'upsert') {
    for (const r of st.rows) {
      if (st.table === 'events' && !['owner', 'pitwall', 'crew'].includes(roleOf(r.team_id))) return { data: null, error: { message: 'new row violates row-level security policy for table "events"' } };
      if (st.table === 'ledger') { const role = roleOf(r.team_id), plan = ['owner', 'pitwall'].includes(role), tg = r.kind === 'void' && SRV.ledger.find(x => x.id === (r.payload || {}).target);
        if (!role || (r.kind === 'rule' && !plan) || (r.kind === 'void' && (!tg || (tg.created_by !== SRV.user.id && !plan)))) return { data: null, error: { message: 'new row violates row-level security policy for table "ledger"' } }; }
      if (st.table === 'races' && !['owner', 'pitwall'].includes(roleOf(r.team_id))) return { data: null, error: { message: 'new row violates row-level security policy for table "races"' } };
      if (T.some(x => x.id === r.id)) { if (st.op === 'upsert') continue; return { data: null, error: { message: 'duplicate key value' } }; }
      const row = Object.assign({ created_by: SRV.user.id }, r, st.table === 'races' ? { updated_at: new Date().toISOString() } : {}); T.push(row); broadcast(st.table, row);
    }
    return { data: null, error: null };
  }
  if (st.op === 'update') {
    T.filter(match).forEach(r => { const tid = st.table === 'teams' ? r.id : r.team_id; if (!['owner', 'pitwall'].includes(roleOf(tid))) return; Object.assign(r, st.obj); broadcast(st.table, r); });
    return { data: null, error: null };
  }
  if (st.op === 'delete') {
    const del = T.filter(match).filter(r => st.table !== 'memberships' || r.role !== 'owner' || SRV.memberships.filter(m => m.team_id === r.team_id && m.role === 'owner').length > 1);
    del.forEach(r => SRV.history.push({ team_id: r.team_id, user_id: r.user_id, last_role: r.role, removed: r.user_id !== SRV.user.id }));
    SRV[st.table] = T.filter(r => !del.includes(r)); return { data: del.map(out), error: null }; }
}
window.PITDOG_SB = {
  auth: { getSession: async () => ({ data: { session: SRV.user && !SRV.dead ? { user: SRV.user } : null } }), getUser: async () => SRV.dead ? { data: { user: null }, error: { message: 'invalid JWT' } } : { data: { user: SRV.user }, error: null }, signOut: async () => {}, signInWithIdToken: async () => ({ data: { user: SRV.user }, error: null }) },
  rpc: async (fn, a) => {
    if (SRV.down) return { data: null, error: { message: 'Failed to fetch' } };
    if (fn === 'create_team') { const code = SRV.teams.length ? 'Z9XW8VUT' : 'K7QM3XPA'; const t = { id: uuid(), name: a.p_name, doc: {}, doc_updated_at: null }; SRV.teams.push(t); SRV.team_codes.push({ team_id: t.id, join_code: code }); SRV.memberships.push({ team_id: t.id, user_id: SRV.user.id, role: 'owner' }); return { data: { id: t.id, name: t.name, join_code: code }, error: null }; }
    if (fn === 'join_team') { const c = SRV.team_codes.find(x => x.join_code === a.p_code); if (!c) return { data: null, error: { message: 'no team with that code' } };
      if (!SRV.memberships.some(m => m.team_id === c.team_id && m.user_id === SRV.user.id)) { const h = SRV.history.filter(x => x.team_id === c.team_id && x.user_id === SRV.user.id).pop();
        if (h && h.removed) return { data: null, error: { message: 'removed from this team: ask the owner to add you back' } };
        SRV.memberships.push({ team_id: c.team_id, user_id: SRV.user.id, role: h ? (h.last_role === 'owner' ? 'pitwall' : h.last_role) : 'crew' }); }
      return { data: c.team_id, error: null }; }
    if (fn === 'team_members') { const r = roleOf(a.p_team); if (!r) return { data: null, error: { message: 'not a member of this team' } }; const own = r === 'owner';
      const em = id => Object.values(U).find(u => u.id === id).email, last = {}; SRV.history.filter(h => h.team_id === a.p_team).forEach(h => { last[h.user_id] = h; });
      const cur = SRV.memberships.filter(m => m.team_id === a.p_team).map(m => ({ user_id: m.user_id, name: em(m.user_id).split('@')[0], email: own || m.user_id === SRV.user.id ? em(m.user_id) : null, role: m.role, device: 'phone', removed: false, is_me: m.user_id === SRV.user.id }));
      const gone = own ? Object.values(last).filter(h => h.removed && !cur.some(c => c.user_id === h.user_id)).map(h => ({ user_id: h.user_id, name: em(h.user_id).split('@')[0], email: em(h.user_id), role: h.last_role, removed: true, is_me: false })) : [];
      return { data: cur.concat(gone), error: null }; }
    if (fn === 'set_member_role') { if (roleOf(a.p_team) !== 'owner') return { data: null, error: { message: 'owner only' } }; SRV.memberships.find(m => m.team_id === a.p_team && m.user_id === a.p_user).role = a.p_role; return { data: null, error: null }; }
    if (fn === 'allow_rejoin') { if (roleOf(a.p_team) !== 'owner') return { data: null, error: { message: 'owner only' } }; SRV.history.filter(h => h.team_id === a.p_team && h.user_id === a.p_user).forEach(h => { h.removed = false; }); return { data: null, error: null }; }
  },
  from: t => Q(t),
  channel: () => { const ch = { on(ev, f, cb) { SRV.subs.push({ table: f.table, cb }); return ch; }, subscribe() { return ch; } }; return ch; },
  removeChannel: () => { SRV.subs = []; },
};
// device switching: each device = its own localStorage DB + signed-in user
const DEV = {};
function park(name) { dbSave(); stopSync(); DEV[name] = localStorage.getItem('pitdog_db'); }
function become(name) { SRV.user = U[name]; SYNC.user = U[name]; SRV.subs = []; if (DEV[name]) localStorage.setItem('pitdog_db', DEV[name]); else localStorage.removeItem('pitdog_db'); DB = null; loadDB(); if (DB) hydrate(); bind(); update(); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const n = () => S.events.length;

__run(() => {});
setTimeout(async () => {
  document.getElementById('RESULT') && document.getElementById('RESULT').remove();
  try {
    // --- A: a local team with a race underway, then put it online
    fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc', max: 120 }, { name: 'Marco', max: 120 }]; s.race.track = 'none'; });
    adv(2.5); click('bigBtn'); adv(20); click('yBtn'); adv(2); click('yBtn');
    SRV.user = U.A; SYNC.user = U.A;
    await putTeamOnline(); await wait(30);
    expect(teamOnline() && DB.team.role === 'owner' && DB.team.joinCode === 'K7QM3XPA', 'A puts the team online and is its owner');
    expect(SRV.events.length === 3 && SRV.races.length === DB.races.length && SRV.teams[0].doc.members.length === 3, 'the race, its log (3 entries) and the roster reach the server');
    expect(S.events.every(e => /^[0-9a-f-]{36}$/.test(e.id)), 'every log entry has an id');
    show('team'); renderTeamTab();
    expect(/K7QM3XPA/.test(txt('syncBody')) && /SYNC ✓/.test(txt('syncPill')), 'the Team tab shows the join code; the top bar says SYNC ✓');
    park('A');

    // --- B: a fresh phone joins with the code
    become('B'); SYNC.user = U.B;
    await joinTeam('k7qm3xpa'); await wait(30);
    expect(teamOnline() && DB.team.role === 'crew' && DB.team.members.length === 3, 'B joins with the code (any case) as crew and gets the roster');
    expect(n() === 3 && live().started, 'B sees the same race log (3 entries, race started)');
    expect(document.querySelectorAll('#tab-plan input:disabled').length > 5, 'crew can’t edit the plan (inputs disabled)');

    // --- B logs PIT IN; A receives it live
    adv(1); click('bigBtn'); await wait(20); await pushAll();
    expect(SRV.events.length === 4 && live().inPit, 'B logs PIT IN and it reaches the server');
    const pitIn = SRV.events[3]; park('B');
    become('A');
    applyRemoteEvent(pitIn);
    expect(n() === 4 && live().inPit, 'A receives B’s PIT IN live');
    applyRemoteEvent(pitIn);
    expect(n() === 4, 'receiving the same entry twice changes nothing');
    park('A');

    // --- B offline: entries wait in the outbox, then go when signal returns
    become('B'); SRV.down = true;
    adv(5.2); click('bigBtn'); await wait(20); await pushAll();
    expect(SYNC.status === 'offline' && pendingCount() === 1 && /OFFLINE · 1/.test(txt('syncPill')), 'offline: PIT OUT waits in the outbox, top bar says OFFLINE · 1');
    expect(!live().inPit, 'B keeps working offline (car is back on track)');
    SRV.down = false; await pushAll();
    expect(pendingCount() === 0 && SRV.events.length === 5 && SYNC.status === 'live', 'back online: the outbox empties onto the server');

    // --- UNDO is a void, never a delete; a voided entry can't come back
    const before = SRV.events.length, last = S.events[S.events.length - 1];
    undoBtnConfirm(); await wait(20); await pushAll();
    expect(SRV.events.length === before + 1 && SRV.events[SRV.events.length - 1].type === 'void' && !S.events.some(e => e.id === last.id), 'UNDO sends a void entry; the server keeps the original');
    park('B');
    become('A'); await pull(false);
    expect(!S.events.some(e => e.id === last.id) && live().inPit, 'A applies the void on its next pull (PIT OUT undone)');
    applyRemoteEvent(SRV.events.find(e => e.id === last.id));
    expect(!S.events.some(e => e.id === last.id), 'a late copy of the voided entry does not come back');

    // --- both devices tap at the same moment, both offline: neither overwrites the other
    SRV.down = true; click('yBtn'); await wait(20); park('A');
    become('B'); click('rBtn'); await wait(20); park('B');
    SRV.down = false;
    become('A'); await pushAll(); park('A'); become('B'); await pushAll(); await pull(false);
    expect(S.events.some(e => e.type === 'yellow' && e.on) && S.events.some(e => e.type === 'red' && e.on), 'simultaneous offline taps on two devices: both survive');

    // --- plan changes by the owner reach the crew in ONE pull, even after the crew logged GREEN (jsonb key order)
    park('B'); become('A'); S.race.maxStint = 110; update(); await pushAll(); park('A');
    become('B'); await pull(false);
    expect(S.race.maxStint === 110, 'the owner’s plan change reaches the crew on the first pull');
    park('B'); become('A'); const before0 = SRV.races[0].updated_at; await pull(false); await pushAll();
    expect(SRV.races[0].updated_at === before0, 'an owner’s pull + push of unchanged settings writes nothing (no echo rewrite)');
    // offline plan edit on the owner's device survives the startup pull and goes up
    SRV.down = true; S.race.rest = 55; update(); await wait(10); SRV.down = false;
    await pull(false); await pushAll();
    expect(SRV.races.some(r => r.settings.rules && r.settings.rules.rest === 55), 'an owner’s offline plan edit is pushed after the next pull (not marked clean)');
    park('A');

    // --- a tap made while a send is in flight is not lost (finding #1)
    become('B'); SRV.delay = 60;
    adv(1); click('yBtn'); const p1 = pushAll(); await wait(5); adv(0.1); click('yBtn'); const mid = S.events[S.events.length - 1]; clearTimeout(PUSH_T); await p1; await wait(80);
    expect(pendingCount() === 1, 'the tap made during the send is still waiting in the outbox');
    await pushAll(); SRV.delay = 0;
    expect(pendingCount() === 0 && SRV.events.some(e => e.id === mid.id), '…and reaches the server on the next send');
    // UNDO of an entry that is already on its way sends a void (finding #1b)
    SRV.delay = 60; click('rBtn'); const lastR = S.events[S.events.length - 1]; const p2 = pushAll(); await wait(5); click('undoBtn'); await p2; await wait(80); await pushAll(); SRV.delay = 0;
    expect(SRV.events.some(e => e.id === lastR.id) && SRV.events.some(e => e.type === 'void' && e.payload.target === lastR.id), 'UNDO during the send: the entry went up, so a void follows it');
    await pull(false);
    expect(!S.events.some(e => e.id === lastR.id), '…and it stays undone after a pull');
    park('B');

    // --- both devices tap PIT IN for the same stop (finding #3)
    become('A'); if (live().inPit) { adv(5.3); click('bigBtn'); } adv(2); click('bigBtn'); await pushAll(); park('A');   // A: PIT IN
    become('B'); await pull(false); const inPitB = live().inPit, stops = live().stops.length;
    logEvent({ type: 'in' }); save(); update(); await pushAll(); await pull(false);                        // B taps PIT IN for the same stop
    expect(inPitB && live().stops.length === stops && live().inPit, 'a second PIT IN from another device doesn’t open a second stop');
    adv(5.3); click('bigBtn'); await pushAll();
    expect(!live().inPit && live().stops[live().stops.length - 1].out != null, '…and one PIT OUT closes it');
    park('B');

    // --- Fix sheet survives a pull that rebuilds the log (finding #4)
    become('A'); await pull(false);
    tap('#banners [data-act="fix"]') ;
    if (txt('sheetT') !== 'Fix last stop') fixStopSheet();
    await pull(false);
    tap('#sheetB [data-k="driver"]'); click('fixSave'); await wait(10);
    expect(S.events.filter(e => e.type === 'out').pop().kind === 'driver', 'Fix saved after a pull still applies (looked up by id)');
    park('A');

    // --- roles and membership rules
    become('B'); SRV.memberships.find(m => m.user_id === U.B.id).role = 'viewer'; await pull(false);
    const k = n(); click('yBtn');
    expect(n() === k && /View only/.test(txt('banners')), 'a viewer can’t log, and is told why');
    expect(!DB.team.joinCode, 'a viewer doesn’t see the join code');
    await leaveTeam(); park('B');
    become('B'); SYNC.user = U.B; await joinTeam('K7QM3XPA');
    expect(DB.team.role === 'viewer', 'a viewer who leaves and re-joins comes back as a viewer, not crew');
    park('B');
    become('A'); const ownerRows = SRV.memberships.filter(m => m.user_id === U.A.id).length; await leaveTeam();
    expect(teamOnline() && SRV.memberships.filter(m => m.user_id === U.A.id).length === ownerRows, 'the only owner can’t leave (the team keeps its owner)');

    // --- the owner manages members in the app (no admin console needed)
    const tid = DB.team.sid, mB = () => SRV.memberships.find(m => m.team_id === tid && m.user_id === U.B.id);
    show('team'); SYNC.membersAt = 0; renderTeamTab(); await wait(30);
    expect(/On this team \(2\)/.test(txt('syncMembers')) && /luc@example\.com/.test(txt('syncMembers')) && /\(you\)/.test(txt('syncMembers')), 'the owner sees both members, with emails');
    const sel = document.querySelector('#syncMembers [data-role]'); sel.value = 'pitwall'; await sel.onchange(); await wait(30);
    expect(mB().role === 'pitwall', 'the owner promotes B to pit wall from the Team tab');
    await document.querySelector('#syncMembers [data-rmm]').onclick(); await wait(30);
    expect(!mB() && /Removed/.test(txt('syncMembers')) && document.querySelector('#syncMembers [data-rejoin]'), 'the owner removes B, who is listed under Removed');
    await document.querySelector('#syncMembers [data-rejoin]').onclick(); await wait(30);
    expect(SRV.history.filter(h => h.team_id === tid && h.user_id === U.B.id).every(h => !h.removed) && !/Removed/.test(txt('syncMembers')), '“Let back in” clears the mark');
    park('A'); become('B'); SYNC.user = U.B; await joinTeam('K7QM3XPA');
    expect(mB() && mB().role === 'pitwall' && DB.team.role === 'pitwall', 'B re-joins with the code and gets the pit wall role back');
    SYNC.membersAt = 0; show('team'); renderTeamTab(); await wait(30);
    expect(!document.querySelector('#syncMembers [data-role]') && !/paul@neto\.me/.test(txt('syncMembers')), 'non-owners see names and roles, no controls, no one else’s email');
    park('B'); become('A');

    // --- review fixes: Race now on a shared team syncs; crew can't make private races; abandon is shared and hidden
    const sheetBtn = l => [...document.querySelectorAll('#sheetF button')].find(x => x.textContent.includes(l)).click();
    if (raceIsLive()) { addEvent({ type: 'end' }); finishRace(true); }
    await pushAll(); const nR = SRV.races.length;
    raceNow(); sheetBtn('RACE NOW'); await wait(20);
    adv(1); TAP_AT = 0; click('bigBtn'); await pushAll();
    const newSid = activeRace().sid;
    expect(newSid && SRV.races.length === nR + 1 && SRV.events.some(e => e.race_id === newSid && e.type === 'green'), 'a race made with Race now on a shared team reaches the server with its log');
    park('A'); become('B'); await pull(false);
    expect(DB.races.some(r => r.sid === newSid), 'the crew phone gets that race');
    SRV.memberships.find(m => m.team_id === tid && m.user_id === U.B.id).role = 'crew'; await pull(false);
    const nRaces = DB.races.length; raceNow();
    expect(DB.races.length === nRaces && !(/Race now/.test(txt('sheetT')) && $('sheetBg').classList.contains('on')), 'crew can’t create a private race with Race now');
    closeSheet(); click('menuBtn'); const its = [...document.querySelectorAll('#sheetB .mrow b')].map(x => x.textContent);
    expect(!its.includes('End the race now') && !its.includes('Abandon this race') && !its.includes('Race now'), 'crew menu: no end / abandon / race now: ' + its.join(', '));
    // --- team money: crew (B) adds expenses; they reach the owner; crew can't touch the owner's; deletions sync as voids
    closeSheet(); const mids = DB.team.members.map(m => m.id);
    const bx = moneyAdd({ k: 'exp', amt: 3000, by: mids[1], cat: 'food', date: todayISO(), note: 'pizza', split: { m: 'auto' } }); await pushAll();
    expect(SRV.ledger.some(r => r.id === bx.id && r.kind === 'exp' && r.payload.amt === 3000 && r.created_by === U.B.id), 'crew adds an expense; it reaches the server as theirs');
    const by = moneyAdd({ k: 'exp', amt: 1000, by: mids[1], cat: 'other', date: todayISO(), split: { m: 'auto' } }); await pushAll();
    SRV.down = true; moneyVoid(by.id); await pushAll(); expect(pendingCount() >= 1, 'deleting an expense with no signal waits in the outbox');
    SRV.down = false; await pushAll(); expect(SRV.ledger.some(r => r.kind === 'void' && r.payload.target === by.id) && pendingCount() === 0, '…and goes up as a void when signal is back');
    moneyAdd({ k: 'rule', scope: 'team', m: 'seat' }); await pushAll();   // the UI doesn't offer this to crew; the server refuses it anyway
    expect(!SRV.ledger.some(r => r.kind === 'rule') && !ruleFor('team'), 'a crew member’s split rule is refused by the team and dropped on this device');
    park('B'); become('A'); await pull(false);
    expect(moneyItems().some(i => i.id === bx.id && i.u === U.B.id) && !moneyItems().some(i => i.id === by.id), 'the owner gets the crew expense, and not the deleted one');
    const ax = moneyAdd({ k: 'exp', amt: 12000, by: mids[0], cat: 'fuel', date: todayISO(), split: { m: 'auto' } });
    moneyAdd({ k: 'rule', scope: 'team', m: 'shares', sh: { [mids[0]]: 2, [mids[1]]: 1, [mids[2]]: 1 } }); await pushAll();
    expect(canEditMoney(moneyItems().find(i => i.id === bx.id)), 'the owner can fix anyone’s expense');
    const bA = balances(); park('A'); become('B'); await pull(false);
    expect(!canEditMoney(moneyItems().find(i => i.id === ax.id)) && canEditMoney(moneyItems().find(i => i.id === bx.id)), 'crew can edit their own expenses, not the owner’s');
    const bB = balances(); expect(mids.every(id => bA[id] === bB[id]) && bB[mids[0]] === 12000 - 7500 && bB[mids[1]] === 3000 - 3750, 'both devices agree on the balances under the team’s fixed shares (2/1/1)');
    applyRemoteLedger({ id: uuid(), t: Date.now(), kind: 'void', payload: { target: ax.id }, created_by: U.A.id });
    expect(!moneyItems().some(i => i.id === ax.id), 'a live void from the owner removes the expense on the crew phone');
    closeSheet(); park('B'); become('A'); await pull(false);
    DB.activeRaceId = DB.races.find(r => r.sid === newSid).id; reloadActive();
    abandonRace(); closeSheet(); await pushAll();
    expect(SRV.races.find(r => r.id === newSid).settings.abandoned === true, 'abandoning a shared race closes it for everyone');
    park('A'); become('B'); await pull(false);
    const ab = DB.races.find(r => r.sid === newSid);
    expect(ab && ab.abandoned && (!lastRace() || lastRace().sid !== newSid) && !computeRecords(null).races.some(x => x.r.sid === newSid), 'the crew phone hides the abandoned race from history');
    park('B'); become('A');
    closeSheet(); raceNow(); sheetBtn('RACE NOW'); adv(1); TAP_AT = 0; click('bigBtn'); await pushAll();     // A back on a live shared race

    // --- restoring a backup on a synced device: unsent entries carry over and still go up
    await pushAll(); backupDB('test: before the yellow');
    SRV.down = true; adv(0.5); click('yBtn'); const unsent = S.events[S.events.length - 1]; await pushAll();
    expect(pendingCount() >= 1, 'an entry is waiting (offline)');
    show('team'); renderTeamTab(); click('restoreBk');
    [...document.querySelectorAll('#sheetB [data-bk]')].find(x => /before the yellow/.test(x.textContent)).click();
    expect(S.events.some(e => e.id === unsent.id) && pendingCount() >= 1, 'restoring an older backup keeps the unsent entry');
    SRV.down = false; await wait(60); await pushAll(); await wait(60); await pushAll();
    expect(SRV.events.some(e => e.id === unsent.id), '…and it reaches the server');

    // --- session died elsewhere: keep everything, say signed out (finding #2)
    SRV.dead = true; click('yBtn'); await pull(false);
    expect(teamOnline() && DB.team.sid && pendingCount() >= 1 && !SYNC.user && /SIGNED OUT/.test(txt('syncPill')), 'a dead session keeps the team and its unsent entries, and says SIGNED OUT');
    SRV.dead = false; SYNC.user = U.A; await pushAll();
    expect(pendingCount() === 0, '…and they go up once signed in again');
    park('A');

    // --- a detached device can put a team online again (fresh ids, no clash) (finding #7)
    become('A'); const evN = SRV.events.length; delete DB.team.sid; delete DB.team.role; dbSave(); hydrate();
    await putTeamOnline(); await wait(20);
    expect(SRV.teams.length === 2 && SYNC.status === 'live' && pendingCount() === 0 && SRV.events.length > evN, 'putting a team online again gives fresh ids: no clash, everything uploads');
  } catch (e) { R.fails.push('EXCEPTION ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'RESULT'; p.textContent = JSON.stringify(R); document.body.appendChild(p);
}, 400);
function undoBtnConfirm() { click('undoBtn'); }
