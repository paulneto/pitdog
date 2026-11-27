// @page admin.html
// @window 1180,820
// System admin console against a fake Supabase client: every screen renders, every action calls the right admin_*
// RPC with the right arguments, hostile names are escaped, bad JSON never reaches the database, non-admins are
// stopped at the gate, and destructive actions need the name typed. (RLS itself is tested in supabase/tests.)
const CALLS = [];
const TEAM = 't-1', RACE = 'r-1', A = 'u-a', B = 'u-b';
const XSS = '<img src=x onerror="window.__pwned=1">';
const DATA = {
  admin_whoami: () => ({ user_id: A, email: 'paul@neto.me', is_admin: window.__isAdmin !== false }),
  admin_teams: () => [{ team_id: TEAM, name: 'Dawg Days ' + XSS, join_code: 'ABCD2345', members: 2, races: 1, events: 3, last_event: null, created_at: '2026-11-01T10:00:00Z' }],
  admin_team_detail: () => ({ team: { id: TEAM, name: 'Dawg Days', join_code: 'ABCD2345', created_at: '2026-11-01T10:00:00Z', doc_updated_at: '2026-11-01T10:00:00Z' },
    members: [{ user_id: A, email: 'paul@neto.me', role: 'owner', device: 'iPad', joined_at: '2026-11-01T10:00:00Z' }, { user_id: B, email: 'luc@example.com', role: 'crew', device: 'phone', joined_at: '2026-11-02T10:00:00Z' }],
    races: [{ id: RACE, settings: { name: 'Saturday' }, updated_at: '2026-11-02T10:00:00Z', events: 3 }] }),
  admin_race_events: () => [{ id: 'e1', t: 1, type: 'green', payload: {}, device: 'iPad' }, { id: 'e2', t: 2, type: 'in', payload: {}, device: 'phone' }, { id: 'e3', t: 3, type: 'void', payload: { target: 'e2' }, device: 'iPad' }],
  admin_users: () => [{ user_id: A, email: 'paul@neto.me', provider: 'google', is_admin: true, teams: [{ name: 'Dawg Days', role: 'owner' }], banned_until: null },
                      { user_id: B, email: 'luc@example.com', provider: 'google', is_admin: false, teams: [], banned_until: null }],
  admin_list_admins: () => [{ email: 'paul@neto.me', note: 'owner', added_at: '2026-11-27T10:00:00Z' }],
  admin_audit_log: () => [{ at: '2026-11-27T10:00:00Z', admin_email: 'paul@neto.me', action: 'member.role', target: 't-1/u-b', detail: { from: 'crew', to: 'viewer' } }],
};
const settingsRows = [{ key: 'banner', value: { text: '', level: 'info' }, note: 'banner', updated_at: null }, { key: 'maintenance', value: false, note: 'pause sync', updated_at: null }];
window.PITDOG_SB = {
  auth: { getSession: async () => ({ data: { session: window.__noSession ? null : { user: { id: A } } } }), signInWithOAuth: async o => { CALLS.push(['oauth', o]); }, signInWithIdToken: async o => { CALLS.push(['idtoken', o]); return { data: {}, error: null }; }, signOut: async () => {} },
  rpc: async (fn, args) => { CALLS.push([fn, args || {}]); return { data: DATA[fn] ? DATA[fn]() : null, error: null }; },
  from: () => ({ select: () => ({ order: async () => ({ data: settingsRows, error: null }) }) }),
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const called = (fn, pred) => CALLS.some(c => c[0] === fn && (!pred || pred(c[1])));

__run(() => {});   // results are written by the async flow below instead
setTimeout(async () => {
  const done = () => { const p = document.createElement('pre'); p.id = 'RESULT'; p.textContent = JSON.stringify(R); document.body.appendChild(p); };
  document.getElementById('RESULT') && document.getElementById('RESULT').remove();
  try {
    expect($('app').style.display !== 'none' && /paul@neto\.me/.test(txt('who')), 'admin passes the gate and sees the console');
    expect(/Dawg Days/.test(txt('main')) && /ABCD2345/.test(txt('main')), 'teams list shows the team and join code');
    expect(!document.querySelector('#main img') && !window.__pwned, 'hostile team name is escaped');
    tap('[data-team="t-1"]'); await wait(50);
    expect(called('admin_team_detail', a => a.p_team === TEAM) && /luc@example\.com/.test(txt('main')), 'team detail lists its people');
    const sel = document.querySelector(`[data-role="${B}"]`); sel.value = 'viewer'; sel.onchange(); await wait(20);
    expect(called('admin_set_role', a => a.p_team === TEAM && a.p_user === B && a.p_role === 'viewer'), 'changing a role calls admin_set_role');
    const ta = document.querySelector(`[data-set="${RACE}"]`); ta.value = '{ not json'; tap(`[data-save="${RACE}"]`); await wait(20);
    expect(!called('admin_update_race') && /valid JSON/.test(txt('toast')), "invalid JSON is caught and never sent");
    ta.value = '{"name":"Saturday","rules":{"maxStint":110}}'; tap(`[data-save="${RACE}"]`); await wait(20);
    expect(called('admin_update_race', a => a.p_race === RACE && a.p_settings.rules.maxStint === 110), 'race settings override sends the parsed JSON');
    const det = document.querySelector(`details[data-race="${RACE}"]`); det.open = true; det.ontoggle(); await wait(30);
    expect(document.querySelectorAll('[data-events] [data-void]').length === 1 && document.querySelector('[data-events] .voided'), 'race log: voided entry is struck through, only live entries can be voided');
    window.prompt = () => 'wrong pit-in'; tap('[data-void="e1"]'); await wait(20);
    expect(called('admin_void_event', a => a.p_event === 'e1' && a.p_reason === 'wrong pit-in'), 'void asks for a reason and calls admin_void_event');
    window.prompt = () => 'nope'; tap('#delTeam'); await wait(20);
    expect(!called('admin_delete_team'), 'deleting a team needs its name typed (wrong name: nothing happens)');
    window.prompt = () => 'Dawg Days'; tap('#delTeam'); await wait(20);
    expect(called('admin_delete_team', a => a.p_team === TEAM), 'typing the name deletes the team');

    tap('#tabs [data-t="accounts"]'); await wait(40);
    expect(/luc@example\.com/.test(txt('main')) && /you/.test(txt('main')), 'accounts list; your own row has no suspend/delete');
    const susp = document.querySelector(`[data-susp="${B}"]`); susp.value = '7'; susp.onchange(); await wait(20);
    expect(called('admin_set_banned', a => a.p_user === B && new Date(a.p_until) > new Date(Date.now() + 6 * 864e5)), 'suspend for 7 days');
    expect(!document.querySelector(`[data-susp="${A}"]`), "you can't suspend yourself from the page");

    tap('#tabs [data-t="settings"]'); await wait(40);
    const mt = document.querySelector('[data-key="maintenance"]'); mt.value = 'true'; tap('[data-savekey="maintenance"]'); await wait(20);
    expect(called('admin_set_setting', a => a.p_key === 'maintenance' && a.p_value === true), 'app setting saved as JSON');

    tap('#tabs [data-t="admins"]'); await wait(40);
    expect(document.querySelector('[data-rmadmin]').disabled, 'the last admin cannot be removed from the page');
    $('adEmail').value = 'sam@example.com'; $('adNote').value = 'crew chief'; tap('#addAdmin'); await wait(20);
    expect(called('admin_add_admin', a => a.p_email === 'sam@example.com' && a.p_note === 'crew chief'), 'add an admin');

    tap('#tabs [data-t="audit"]'); await wait(40);
    expect(/member\.role/.test(txt('main')), 'audit log shows admin actions');
  } catch (e) { R.fails.push('EXCEPTION ' + e.message); }
  done();
}, 400);
