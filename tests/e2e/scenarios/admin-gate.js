// @page admin.html
// @window 1180,820
// Admin console gate: a signed-in account that is NOT on the admin list sees nothing.
window.__isAdmin = false;
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
  auth: { getSession: async () => ({ data: { session: window.__noSession ? null : { user: { id: A } } } }), signInWithOAuth: async o => { CALLS.push(['oauth', o]); }, signOut: async () => {} },
  rpc: async (fn, args) => { CALLS.push([fn, args || {}]); return { data: DATA[fn] ? DATA[fn]() : null, error: null }; },
  from: () => ({ select: () => ({ order: async () => ({ data: settingsRows, error: null }) }) }),
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const called = (fn, pred) => CALLS.some(c => c[0] === fn && (!pred || pred(c[1])));

__run(() => {
  expect($('app').style.display === 'none' && /Not an admin/.test(txt('gate')), 'a signed-in non-admin is stopped at the gate');
  expect(!CALLS.some(c => c[0] !== 'admin_whoami'), 'and no admin data is even requested');
});
