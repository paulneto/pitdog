-- System admin console (app/admin.html): app-wide settings, an audit log, and admin-only RPCs.
-- Every admin RPC checks is_platform_admin() itself and writes an audit row; nothing here relies on the page.

-- ---------------------------------------------------------------- app-wide settings (overrides, flags, banners)
create table public.app_settings (
  key        text primary key check (key ~ '^[a-z0-9_.-]{1,60}$'),
  value      jsonb not null,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security;
-- the app reads them before sign-in (e.g. a maintenance banner), so anyone may read; only admin RPCs write
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
insert into public.app_settings (key, value, note) values
  ('banner',          '{"text": "", "level": "info"}', 'Message shown at the top of every PitDog screen ("" = none). level: info | warn | bad'),
  ('maintenance',     'false',                         'true = sync is paused for everyone (the app keeps working offline)'),
  ('series_overrides','{}',                            'Per-series rule overrides, e.g. {"luckydog": {"maxStint": 110}}. Applied on top of the built-in presets'),
  ('features',        '{"sync": true, "radar": true}', 'Feature switches');

-- ---------------------------------------------------------------- audit log
create table public.admin_audit (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  admin_id   uuid,
  admin_email text,
  action     text not null,
  target     text,
  detail     jsonb
);
alter table public.admin_audit enable row level security;   -- no policies: readable only through admin_audit_log()
revoke all on public.admin_audit from anon, authenticated;

create or replace function public.admin_guard(p_action text, p_target text, p_detail jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  insert into public.admin_audit (admin_id, admin_email, action, target, detail)
    values (auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_target, p_detail);
end $$;
revoke all on function public.admin_guard(text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- reads
create or replace function public.admin_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('user_id', auth.uid(), 'email', (select email from auth.users where id = auth.uid()),
                            'is_admin', public.is_platform_admin());
$$;

create or replace function public.admin_users()
returns table (user_id uuid, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
               banned_until timestamptz, is_admin boolean, teams jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query
    select u.id, u.email::text, coalesce(u.raw_app_meta_data->>'provider', '?'), u.created_at, u.last_sign_in_at, u.banned_until,
      exists (select 1 from public.platform_admins a where a.email = lower(u.email)),
      coalesce((select jsonb_agg(jsonb_build_object('team_id', t.id, 'name', t.name, 'role', m.role) order by t.name)
                from public.memberships m join public.teams t on t.id = m.team_id where m.user_id = u.id), '[]'::jsonb)
    from auth.users u order by u.created_at desc;
end $$;

create or replace function public.admin_team_detail(p_team uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return (select jsonb_build_object(
    'team', to_jsonb(t),
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'role', m.role,
                 'device', m.device_name, 'joined_at', m.joined_at) order by m.joined_at)
               from public.memberships m left join auth.users u on u.id = m.user_id where m.team_id = t.id), '[]'::jsonb),
    'races', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'settings', r.settings, 'updated_at', r.updated_at,
                 'events', (select count(*) from public.events e where e.race_id = r.id)) order by r.created_at desc)
               from public.races r where r.team_id = t.id), '[]'::jsonb))
    from public.teams t where t.id = p_team);
end $$;

create or replace function public.admin_race_events(p_race uuid)
returns setof public.events
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query select * from public.events where race_id = p_race order by t, created_at;
end $$;

create or replace function public.admin_audit_log(p_limit int default 200)
returns setof public.admin_audit
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query select * from public.admin_audit order by id desc limit least(greatest(p_limit, 1), 1000);
end $$;

create or replace function public.admin_list_admins()
returns setof public.platform_admins
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query select * from public.platform_admins order by added_at;
end $$;

-- ---------------------------------------------------------------- writes (all audited)
create or replace function public.admin_update_team(p_team uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard('team.rename', p_team::text, jsonb_build_object('from', (select name from public.teams where id = p_team), 'to', p_name));
  update public.teams set name = p_name where id = p_team;
end $$;

create or replace function public.admin_rotate_code(p_team uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  perform public.admin_guard('team.rotate_code', p_team::text);
  update public.teams set join_code = public.pitdog_join_code() where id = p_team returning join_code into c;
  return c;
end $$;

create or replace function public.admin_delete_team(p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard('team.delete', p_team::text, (select jsonb_build_object('name', name) from public.teams where id = p_team));
  delete from public.teams where id = p_team;
end $$;

create or replace function public.admin_set_role(p_team uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('owner', 'pitwall', 'crew', 'viewer') then raise exception 'unknown role %', p_role; end if;
  perform public.admin_guard('member.role', p_team::text || '/' || p_user::text,
    jsonb_build_object('from', (select role from public.memberships where team_id = p_team and user_id = p_user), 'to', p_role));
  insert into public.memberships (team_id, user_id, role) values (p_team, p_user, p_role)
    on conflict (team_id, user_id) do update set role = excluded.role;
end $$;

create or replace function public.admin_remove_member(p_team uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard('member.remove', p_team::text || '/' || p_user::text);
  delete from public.memberships where team_id = p_team and user_id = p_user;
end $$;

create or replace function public.admin_set_banned(p_user uuid, p_until timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then raise exception 'you cannot suspend your own account'; end if;
  perform public.admin_guard(case when p_until is null then 'user.restore' else 'user.suspend' end, p_user::text,
    jsonb_build_object('email', (select email from auth.users where id = p_user), 'until', p_until));
  update auth.users set banned_until = p_until where id = p_user;
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then raise exception 'you cannot delete your own account'; end if;
  perform public.admin_guard('user.delete', p_user::text, jsonb_build_object('email', (select email from auth.users where id = p_user)));
  delete from auth.users where id = p_user;
end $$;

create or replace function public.admin_add_admin(p_email text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'not an email address'; end if;
  perform public.admin_guard('admin.add', lower(p_email), jsonb_build_object('note', p_note));
  insert into public.platform_admins (email, note) values (lower(p_email), p_note) on conflict (email) do update set note = excluded.note;
end $$;

create or replace function public.admin_remove_admin(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.platform_admins) <= 1 then raise exception 'cannot remove the last admin'; end if;
  perform public.admin_guard('admin.remove', lower(p_email));
  delete from public.platform_admins where email = lower(p_email);
end $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard('setting.set', p_key, jsonb_build_object('from', (select value from public.app_settings where key = p_key), 'to', p_value));
  insert into public.app_settings (key, value, note, updated_at, updated_by) values (p_key, p_value, p_note, now(), auth.uid())
    on conflict (key) do update set value = excluded.value, note = coalesce(excluded.note, public.app_settings.note), updated_at = now(), updated_by = auth.uid();
end $$;

create or replace function public.admin_update_race(p_race uuid, p_settings jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_settings) <> 'object' then raise exception 'settings must be a JSON object'; end if;
  perform public.admin_guard('race.override', p_race::text, jsonb_build_object('from', (select settings from public.races where id = p_race), 'to', p_settings));
  update public.races set settings = p_settings, updated_at = now(), updated_by = auth.uid() where id = p_race;
end $$;

create or replace function public.admin_void_event(p_event uuid, p_reason text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare e public.events; v uuid := gen_random_uuid();
begin
  select * into e from public.events where id = p_event;
  if e.id is null then raise exception 'no such event'; end if;
  perform public.admin_guard('event.void', p_event::text, jsonb_build_object('type', e.type, 'reason', p_reason));
  insert into public.events (id, race_id, team_id, t, type, payload, device, created_by)
    values (v, e.race_id, e.team_id, (extract(epoch from now()) * 1000)::bigint, 'void',
            jsonb_build_object('target', e.id, 'by', 'admin', 'reason', p_reason), 'admin', auth.uid());
  return v;
end $$;

-- only signed-in callers may even try; each function checks admin itself
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'admin\_%' and p.proname <> 'admin_guard' loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop; end $$;

-- admin_join_team (from the platform_admins migration) goes through the audit too
create or replace function public.admin_join_team(p_team uuid, p_role text default 'owner')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('owner', 'pitwall', 'crew', 'viewer') then raise exception 'unknown role %', p_role; end if;
  perform public.admin_guard('admin.join_team', p_team::text, jsonb_build_object('role', p_role));
  insert into public.memberships (team_id, user_id, role, device_name) values (p_team, auth.uid(), p_role, 'admin')
    on conflict (team_id, user_id) do update set role = excluded.role;
end $$;
