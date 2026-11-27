// @window 500,900
// @budget 15000
// Team sync against an in-memory fake Supabase server shared by two "devices" (A = owner iPad, B = crew phone),
// which take turns in this page by swapping their local state. RLS itself is tested for real in supabase/tests.
const SRV = { teams: [], memberships: [], races: [], events: [], down: false, user: null, subs: [] };
const U = { A: { id: '11111111-1111-4111-8111-111111111111', email: 'paul@neto.me' }, B: { id: '22222222-2222-4222-8222-222222222222', email: 'luc@example.com' } };
const roleOf = (tid) => (SRV.memberships.find(m => m.team_id === tid && m.user_id === SRV.user.id) || {}).role;
function broadcast(table, row) { SRV.subs.forEach(s => s.table === table && s.cb({ new: JSON.parse(JSON.stringify(row)) })); }
function Q(table) {
  const st = { table, filters: [], op: 'select', single: false };
  const q = {
    select() { return q; }, eq(c, v) { st.filters.push([c, v]); return q; }, single() { st.single = true; return q; },
    insert(rows) { st.op = 'insert'; st.rows = [].concat(rows); return q; }, upsert(rows, o) { st.op = 'upsert'; st.rows = [].concat(rows); return q; },
    update(obj) { st.op = 'update'; st.obj = obj; return q; }, delete() { st.op = 'delete'; return q; },
    then(res, rej) { return Promise.resolve().then(() => run(st)).then(res, rej); },
  };
  return q;
}
function run(st) {
  if (SRV.down) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
  const T = SRV[st.table], match = r => st.filters.every(([c, v]) => r[c] === v);
  if (st.op === 'select') { const d = JSON.parse(JSON.stringify(T.filter(match))); return { data: st.single ? d[0] : d, error: null }; }
  if (st.op === 'insert' || st.op === 'upsert') {
    for (const r of st.rows) {
      if (st.table === 'events' && !['owner', 'pitwall', 'crew'].includes(roleOf(r.team_id))) return { data: null, error: { message: 'new row violates row-level security policy for table "events"' } };
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
  if (st.op === 'delete') { SRV[st.table] = T.filter(r => !match(r)); return { data: null, error: null }; }
}
window.PITDOG_SB = {
  auth: { getSession: async () => ({ data: { session: SRV.user ? { user: SRV.user } : null } }), signOut: async () => {}, signInWithIdToken: async () => ({ data: { user: SRV.user }, error: null }) },
  rpc: async (fn, a) => {
    if (SRV.down) return { data: null, error: { message: 'Failed to fetch' } };
    if (fn === 'create_team') { const t = { id: uuid(), name: a.p_name, join_code: 'K7QM3XPA', doc: {}, doc_updated_at: null }; SRV.teams.push(t); SRV.memberships.push({ team_id: t.id, user_id: SRV.user.id, role: 'owner' }); return { data: t, error: null }; }
    if (fn === 'join_team') { const t = SRV.teams.find(x => x.join_code === a.p_code); if (!t) return { data: null, error: { message: 'no team with that code' } }; if (!SRV.memberships.some(m => m.team_id === t.id && m.user_id === SRV.user.id)) SRV.memberships.push({ team_id: t.id, user_id: SRV.user.id, role: 'crew' }); return { data: t.id, error: null }; }
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

    // --- plan changes by the owner reach the crew; viewers can't log
    park('B'); become('A'); S.race.maxStint = 110; update(); await pushAll(); park('A');
    become('B'); await pull(false);
    expect(S.race.maxStint === 110, 'the owner’s plan change reaches the crew');
    SRV.memberships.find(m => m.user_id === U.B.id).role = 'viewer'; await pull(false);
    const k = n(); click('yBtn');
    expect(n() === k && /View only/.test(txt('banners')), 'a viewer can’t log, and is told why');
  } catch (e) { R.fails.push('EXCEPTION ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'RESULT'; p.textContent = JSON.stringify(R); document.body.appendChild(p);
}, 400);
function undoBtnConfirm() { click('undoBtn'); }
