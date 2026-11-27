-- Membership hardening (from the independent sync review, 27 Nov 2026):
--  1. The join code moves to its own table that only owners / pit wall can read (crew and viewers could read it, so a
--     removed or demoted member could simply re-join).
--  2. Membership history: a member removed by an owner/admin can't re-join with the code; someone who leaves and
--     re-joins gets their previous role back (a viewer can't come back as crew).
--  3. The last owner can't leave (or be removed by themselves): a team must always have an owner.
--  4. server_now() so devices can measure their clock offset.

-- ---------------------------------------------------------------- 1. join codes
create table public.team_codes (
  team_id   uuid primary key references public.teams(id) on delete cascade,
  join_code text not null unique
);
insert into public.team_codes (team_id, join_code) select id, join_code from public.teams;
alter table public.team_codes enable row level security;
create policy team_codes_read on public.team_codes for select to authenticated using (public.pitdog_can(team_id, 'plan'));
alter table public.teams drop column join_code;

drop function if exists public.create_team(text, text) cascade;
create function public.create_team(p_name text, p_device text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.teams; c text := public.pitdog_join_code();
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.teams (name) values (p_name) returning * into t;
  insert into public.team_codes (team_id, join_code) values (t.id, c);
  insert into public.memberships (team_id, user_id, role, device_name) values (t.id, auth.uid(), 'owner', p_device);
  return jsonb_build_object('id', t.id, 'name', t.name, 'join_code', c);
end $$;

create or replace function public.rotate_join_code(p_team uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text := public.pitdog_join_code();
begin
  if not public.pitdog_can(p_team, 'admin') then raise exception 'owner only'; end if;
  update public.team_codes set join_code = c where team_id = p_team;
  return c;
end $$;

create or replace function public.admin_rotate_code(p_team uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text := public.pitdog_join_code();
begin
  perform public.admin_guard('team.rotate_code', p_team::text);
  update public.team_codes set join_code = c where team_id = p_team;
  return c;
end $$;

-- ---------------------------------------------------------------- 2. membership history
create table public.membership_history (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  last_role  text not null,
  removed    boolean not null default false,     -- true = removed by someone else (owner/admin): no re-joining by code
  changed_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.membership_history enable row level security;   -- no policies: server-side bookkeeping only

create or replace function public.memberships_history_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- the team or the user itself being deleted (cascade): nothing to remember
  if not exists (select 1 from public.teams where id = old.team_id) or not exists (select 1 from auth.users where id = old.user_id) then return old; end if;
  insert into public.membership_history (team_id, user_id, last_role, removed, changed_at)
    values (old.team_id, old.user_id, old.role, auth.uid() is distinct from old.user_id, now())
    on conflict (team_id, user_id) do update set last_role = excluded.last_role, removed = excluded.removed, changed_at = now();
  return old;
end $$;
create trigger memberships_history after delete on public.memberships for each row execute function public.memberships_history_trg();

create or replace function public.join_team(p_code text, p_device text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid; h public.membership_history;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select team_id into tid from public.team_codes where join_code = upper(trim(p_code));
  if tid is null then raise exception 'no team with that code'; end if;
  if exists (select 1 from public.memberships where team_id = tid and user_id = auth.uid()) then
    update public.memberships set device_name = coalesce(p_device, device_name) where team_id = tid and user_id = auth.uid();
    return tid;
  end if;
  select * into h from public.membership_history where team_id = tid and user_id = auth.uid();
  if h.removed then raise exception 'removed from this team: ask the owner to add you back'; end if;
  insert into public.memberships (team_id, user_id, role, device_name)
    values (tid, auth.uid(), coalesce(case when h.last_role = 'owner' then 'pitwall' else h.last_role end, 'crew'), p_device);
  return tid;
end $$;

-- owners can let a removed person back in (clears the "removed" mark; they then join with the code)
create or replace function public.allow_rejoin(p_team uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pitdog_can(p_team, 'admin') then raise exception 'owner only'; end if;
  update public.membership_history set removed = false where team_id = p_team and user_id = p_user;
end $$;

-- ---------------------------------------------------------------- 3. a team always has an owner
create or replace function public.owner_count(p_team uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.memberships where team_id = p_team and role = 'owner';
$$;
drop policy memberships_remove on public.memberships;
create policy memberships_remove on public.memberships for delete to authenticated using (
  (public.pitdog_can(team_id, 'admin') and (role <> 'owner' or public.owner_count(team_id) > 1))
  or (user_id = auth.uid() and (role <> 'owner' or public.owner_count(team_id) > 1)));
-- demoting the last owner is refused too
create or replace function public.memberships_owner_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and new.role <> 'owner' and public.owner_count(old.team_id) <= 1 then
    raise exception 'a team needs an owner: make someone else owner first';
  end if;
  return new;
end $$;
create trigger memberships_owner_guard before update on public.memberships for each row execute function public.memberships_owner_guard();

-- ---------------------------------------------------------------- admin console reads the code from its new home
create or replace function public.admin_teams()
returns table (team_id uuid, name text, join_code text, members bigint, races bigint, events bigint, last_event timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query
    select t.id, t.name, (select c.join_code from public.team_codes c where c.team_id = t.id),
      (select count(*) from public.memberships m where m.team_id = t.id),
      (select count(*) from public.races r where r.team_id = t.id),
      (select count(*) from public.events e where e.team_id = t.id),
      (select max(e.created_at) from public.events e where e.team_id = t.id),
      t.created_at
    from public.teams t order by t.created_at desc;
end $$;
create or replace function public.admin_team_detail(p_team uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return (select jsonb_build_object(
    'team', to_jsonb(t) || jsonb_build_object('join_code', (select c.join_code from public.team_codes c where c.team_id = t.id)),
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'role', m.role,
                 'device', m.device_name, 'joined_at', m.joined_at) order by m.joined_at)
               from public.memberships m left join auth.users u on u.id = m.user_id where m.team_id = t.id), '[]'::jsonb),
    'races', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'settings', r.settings, 'updated_at', r.updated_at,
                 'events', (select count(*) from public.events e where e.race_id = r.id)) order by r.created_at desc)
               from public.races r where r.team_id = t.id), '[]'::jsonb))
    from public.teams t where t.id = p_team);
end $$;

-- ---------------------------------------------------------------- 4. server clock
create or replace function public.server_now() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

revoke all on function public.create_team(text, text), public.join_team(text, text), public.allow_rejoin(uuid, uuid) from public, anon;
grant execute on function public.create_team(text, text), public.join_team(text, text), public.allow_rejoin(uuid, uuid), public.server_now() to authenticated;
grant execute on function public.server_now() to anon;
revoke all on function public.owner_count(uuid), public.memberships_history_trg(), public.memberships_owner_guard() from public, anon, authenticated;

-- owner_count is called from the memberships_remove policy, which runs as the caller: it must be executable by
-- signed-in users (it only returns a count)
grant execute on function public.owner_count(uuid) to authenticated;
