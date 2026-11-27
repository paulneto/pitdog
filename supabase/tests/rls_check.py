#!/usr/bin/env python3
"""Row-level-security check for the PitDog team-sync schema, run inside the real database.

Sign-in is OAuth-only, so the test doesn't sign anyone in. It simulates users exactly the way Supabase's API does
(role `authenticated` + JWT claims carrying the user id), creates two throwaway users and teams, runs every check,
then deletes everything it made, all in one request.

User A owns a team; user B is a stranger, then a crew member, then pit wall; C is a platform admin (verified email
on the admin list); D has a listed but unverified email; "nobody" is a signed-out caller.
Needs: a Supabase CLI login (token in the macOS keychain) and PITDOG_SUPABASE_REF in ~/.pitdog/supabase.env.
Usage:  python3 supabase/tests/rls_check.py
"""
import base64, json, os, subprocess, sys, urllib.request, urllib.error

env = dict(l.strip().split('=', 1) for l in open(os.path.expanduser('~/.pitdog/supabase.env')) if '=' in l)
REF = env['PITDOG_SUPABASE_REF']
raw = subprocess.run(['security', 'find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'], capture_output=True, text=True).stdout.strip()
TOKEN = base64.b64decode(raw[len('go-keyring-base64:'):]).decode() if raw.startswith('go-keyring-base64:') else raw

def query(sql):
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query', method='POST',
        data=json.dumps({'query': sql}).encode(), headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'pitdog-rls-check'})
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode() or 'null')
    except urllib.error.HTTPError as e: sys.exit(f'query failed {e.code}: {e.read().decode()[:800]}')

ID = lambda k: f"(select id from pg_temp.ids where k='{k}')"
RACE, TEAM, TEAM2 = ID('race'), ID('team'), ID('team2')

# (description, who: 'A' | 'B' | None for signed out, SQL, expectation: 'ok' | 'denied' | 'rows:N')
CHECKS = [
  ('owner creates a team through create_team', 'A', "select public.create_team('RLS check team','iPad')", 'ok'),
  ('owner creates a race', 'A', "insert into races(team_id,settings) select id,'{\"name\":\"Sat\"}' from teams where name='RLS check team' returning id", 'rows:1'),
  ('owner logs GREEN', 'A', "insert into events(id,race_id,team_id,t,type) select gen_random_uuid(),id,team_id,1,'green' from races returning id", 'rows:1'),
  ("a stranger can't see the team", 'B', "select * from teams", 'rows:0'),
  ("a stranger can't read the race log", 'B', "select * from events", 'rows:0'),
  ("a stranger can't log events into the team's race", 'B', f"insert into events(id,race_id,team_id,t,type) values (gen_random_uuid(),{RACE},{TEAM},2,'in') returning id", 'denied'),
  ("teams can't be inserted directly", 'B', "insert into teams(name) values ('sneaky') returning id", 'denied'),
  ("nobody can grant themselves membership", 'B', f"insert into memberships(team_id,user_id,role) values ({TEAM},auth.uid(),'owner') returning user_id", 'denied'),
  ("signed-out callers see nothing", None, "select * from teams", 'rows:0'),
  ("signed-out callers can't create teams", None, "select public.create_team('anon team')", 'denied'),
  ("a stranger can't read any join code", 'B', "select * from team_codes", 'rows:0'),
  ('teammate joins with the code (any case) as crew', 'B', "select public.join_team(lower((select code from pg_temp.ids where k='team')),'crew phone')", 'ok'),
  ('crew can now read the race log', 'B', "select * from events", 'rows:1'),
  ("crew can't read the join code", 'B', "select * from team_codes", 'rows:0'),
  ('owner can read the join code', 'A', f"select * from team_codes where team_id={TEAM}", 'rows:1'),
  ("the last owner can't leave", 'A', f"delete from memberships where team_id={TEAM} and user_id=auth.uid() returning user_id", 'rows:0'),
  ("the last owner can't demote themselves", 'A', f"update memberships set role='crew' where team_id={TEAM} and user_id=auth.uid() returning user_id", 'denied'),
  ('server clock is readable', 'B', "select 1 where public.server_now() > 1700000000000", 'rows:1'),
  ('crew can log PIT IN', 'B', f"insert into events(id,race_id,team_id,t,type) values (gen_random_uuid(),{RACE},{TEAM},3,'in') returning id", 'rows:1'),
  ("crew can't forge an event as someone else", 'B', f"insert into events(id,race_id,team_id,t,type,created_by) values (gen_random_uuid(),{RACE},{TEAM},4,'out',{ID('userA')}) returning id", 'denied'),
  ("crew can't change the race plan", 'B', "update races set settings='{\"name\":\"hacked\"}' returning id", 'rows:0'),
  ("crew can't promote themselves", 'B', "update memberships set role='owner' where user_id=auth.uid() returning user_id", 'rows:0'),
  ("events are append-only: the owner can't delete one", 'A', "delete from events returning id", 'rows:0'),
  ("events are append-only: no edits (UNDO is a void event)", 'A', "update events set type='out' returning id", 'rows:0'),
  ('UNDO is logged as a void event', 'A', "insert into events(id,race_id,team_id,t,type,payload) select gen_random_uuid(),race_id,team_id,5,'void',jsonb_build_object('target',id) from events where type='in' limit 1 returning id", 'rows:1'),
  ('owner demotes the teammate to viewer', 'A', f"update memberships set role='viewer' where user_id={ID('userB')} and team_id={TEAM} returning user_id", 'rows:1'),
  ('a viewer can leave', 'B', f"delete from memberships where team_id={TEAM} and user_id=auth.uid() returning user_id", 'rows:1'),
  ('the viewer re-joins with the code', 'B', "select public.join_team((select code from pg_temp.ids where k='team'))", 'ok'),
  ('…and gets the old role back (viewer, not crew)', 'B', "select 1 from memberships where user_id=auth.uid() and team_id=(select id from pg_temp.ids where k='team') and role='viewer'", 'rows:1'),
  ('owner promotes the teammate to pit wall', 'A', f"update memberships set role='pitwall' where user_id={ID('userB')} returning user_id", 'rows:1'),
  ('pit wall can change the plan', 'B', "update races set settings='{\"name\":\"Sat v2\"}' returning id", 'rows:1'),
  ('setup: E joins team 2 as crew', 'E', "select public.join_team((select code from pg_temp.ids where k='team2'))", 'ok'),
  ('owner removes a member', 'A', f"delete from memberships where team_id={TEAM2} and user_id={ID('userE')} returning user_id", 'rows:1'),
  ("a removed member can't re-join with the code", 'E', "select public.join_team((select code from pg_temp.ids where k='team2'))", 'denied'),
  ('owner can let them back in', 'A', f"select public.allow_rejoin({TEAM2},{ID('userE')})", 'ok'),
  ('…and then they can re-join', 'E', "select public.join_team((select code from pg_temp.ids where k='team2'))", 'ok'),
  ("an event can't point at another team's race", 'A', f"insert into events(id,race_id,team_id,t,type) values (gen_random_uuid(),{RACE},{TEAM2},6,'in') returning id", 'denied'),
  ("only the owner can rotate the join code", 'B', f"select public.rotate_join_code({TEAM})", 'denied'),
  ('owner rotates the join code', 'A', f"select public.rotate_join_code({TEAM})", 'ok'),
  ("a stranger can't use the admin overview", 'B', "select * from public.admin_teams()", 'denied'),
  ('platform admin sees every team', 'C', "select * from teams where name like 'RLS check team%'", 'rows:2'),
  ('platform admin reads any race log', 'C', "select * from events", 'rows:3'),
  ('platform admin can repair a plan', 'C', "update races set settings='{\"name\":\"fixed by admin\"}' returning id", 'rows:1'),
  ('platform admin overview lists the teams', 'C', "select * from public.admin_teams() where name like 'RLS check team%'", 'rows:2'),
  ('platform admin can join a team to help', 'C', f"select public.admin_join_team({TEAM2},'pitwall')", 'ok'),
  ("an unverified email on the admin list gets nothing", 'D', "select * from teams", 'rows:0'),
  ("nobody can read the admin list", 'B', "select * from public.platform_admins", 'denied'),
  # --- admin console RPCs
  ("a non-admin can't list accounts", 'B', "select * from public.admin_users()", 'denied'),
  ("a non-admin can't change settings", 'B', "select public.admin_set_setting('rls_check','1')", 'denied'),
  ("a non-admin can't suspend anyone", 'B', f"select public.admin_set_banned({ID('userA')}, now() + interval '1 day')", 'denied'),
  ("app settings can't be written directly", 'B', "insert into app_settings(key,value) values ('rls_check','1') returning key", 'denied'),
  ('anyone can read app settings (banner, flags)', None, "select * from app_settings where key in ('banner','maintenance','series_overrides','features')", 'rows:4'),
  ('admin console: whoami says admin', 'C', "select 1 where (public.admin_whoami()->>'is_admin')::boolean", 'rows:1'),
  ('admin console: lists accounts with their teams', 'C', f"select * from public.admin_users() where user_id in ({ID('userA')},{ID('userB')})", 'rows:2'),
  ('admin console: team detail', 'C', f"select 1 where jsonb_array_length(public.admin_team_detail({TEAM})->'members') = 2", 'rows:1'),
  ('admin console: change a role', 'C', f"select public.admin_set_role({TEAM},{ID('userB')},'viewer')", 'ok'),
  ('admin console: override race settings', 'C', f"select public.admin_update_race({RACE}, '{{\"name\":\"admin override\"}}')", 'ok'),
  ('admin console: void a bad event', 'C', "select public.admin_void_event((select id from events where type='in' limit 1),'rls check')", 'ok'),
  ('admin console: set an app setting', 'C', "select public.admin_set_setting('rls_check','{\"x\":1}','rls_check')", 'ok'),
  ('admin console: suspend an account', 'C', f"select public.admin_set_banned({ID('userB')}, now() + interval '1 day')", 'ok'),
  ("admin console: can't suspend yourself", 'C', f"select public.admin_set_banned({ID('userC')}, now() + interval '1 day')", 'denied'),
  ('admin console: every action is in the audit log', 'C', "select * from public.admin_audit_log(50) where admin_email='rls-admin@pitdog.test'", 'rows:6'),
  ("nobody can read the audit table directly", 'C', "select * from public.admin_audit", 'denied'),
  ('owner can delete the team (cascades)', 'A', f"delete from teams where id={TEAM} returning id", 'rows:1'),
]
# after these checks, remember ids the later checks refer to
AFTER = {
  0: "insert into pg_temp.ids select 'team', t.id, c.join_code from teams t join team_codes c on c.team_id=t.id where t.name='RLS check team';",
  1: """insert into pg_temp.ids select 'race', id, null from races where team_id=(select id from pg_temp.ids where k='team');
  perform set_config('request.jwt.claims', (select json_build_object('sub',id::text,'role','authenticated')::text from pg_temp.ids where k='userA'), true);
  execute 'set local role authenticated'; perform public.create_team('RLS check team 2'); execute 'reset role';
  insert into pg_temp.ids select 'team2', t.id, c.join_code from teams t join team_codes c on c.team_id=t.id where t.name='RLS check team 2';""",
}

def block(i, desc, who, sql, exp):
    q = sql.replace("'", "''")
    claims = "''" if who is None else f"(select json_build_object('sub',id::text,'role','authenticated')::text from pg_temp.ids where k='user{who}')"
    role = 'anon' if who is None else 'authenticated'
    want_rows = exp.startswith('rows:')
    return f"""
  perform set_config('request.jwt.claims', {claims}, true);
  begin
    execute 'set local role {role}';
    execute 'with x as ({q}) select count(*) from x' into n;
    ok := {f"n = {exp.split(':')[1]}" if want_rows else f"{'true' if exp == 'ok' else 'false'}"}; detail := n || ' row(s)';
    execute 'reset role';
  exception when others then
    ok := {'true' if exp == 'denied' else 'false'}; detail := sqlerrm;
  end;
  execute 'reset role';
  insert into pg_temp.results values ({i}, '{desc.replace("'", "''")}', ok, detail);
  {AFTER.get(i, '')}"""

script = """
create temp table results(i int, descr text, ok boolean, detail text);
create temp table ids(k text, id uuid, code text);
grant all on results, ids to authenticated, anon;
insert into ids values ('userA', gen_random_uuid(), null), ('userB', gen_random_uuid(), null), ('userC', gen_random_uuid(), null), ('userD', gen_random_uuid(), null), ('userE', gen_random_uuid(), null);
insert into public.platform_admins(email, note) values ('rls-admin@pitdog.test', 'rls_check'), ('rls-unverified@pitdog.test', 'rls_check');
insert into auth.users(id, aud, role, instance_id, email, email_confirmed_at)
  select id, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000',
    case k when 'userC' then 'rls-admin@pitdog.test' when 'userD' then 'rls-unverified@pitdog.test' end,
    case k when 'userC' then now() end from ids;
do $t$ declare n int; ok boolean; detail text; begin
""" + ''.join(block(i, *c) for i, c in enumerate(CHECKS)) + """
end $t$;
delete from public.teams where name in ('RLS check team','RLS check team 2','anon team');
delete from auth.users where id in (select id from pg_temp.ids where k like 'user%');
delete from public.platform_admins where note = 'rls_check';
delete from public.membership_history where user_id in (select id from pg_temp.ids where k like 'user%');
delete from public.admin_audit where admin_email = 'rls-admin@pitdog.test';
delete from public.app_settings where key = 'rls_check';
select i, descr, ok, detail from pg_temp.results order by i;
"""
rows = query(script)
if not isinstance(rows, list): sys.exit(f'unexpected response: {rows}')
fails = [r for r in rows if not r['ok']]
for r in rows: print(('  ok   ' if r['ok'] else '  FAIL ') + r['descr'] + ('' if r['ok'] else f"   ({r['detail']})"))
left = query("select (select count(*) from public.teams where name like 'RLS check%' or name='anon team') as teams_left")
print(f"\n{len(rows) - len(fails)}/{len(CHECKS)} checks passed · leftovers {left}")
sys.exit(1 if fails or len(rows) != len(CHECKS) else 0)
