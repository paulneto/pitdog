-- Platform admins: people who can see and manage EVERY team, race and log (support, repairs, recovery).
-- An admin signs in through OAuth like everyone else; admin rights come from this list, matched on the account's
-- VERIFIED email (auth.users.email_confirmed_at), never on anything the client sends.
-- The table has row-level security with no policies, so no client can read or change the list; only the database
-- owner (Supabase dashboard / CLI) can. Break-glass access is the Supabase dashboard itself.

create table public.platform_admins (
  email    text primary key check (email = lower(email)),
  note     text,
  added_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

insert into public.platform_admins (email, note) values ('paul@neto.me', 'Paul: owner of the PitDog Supabase organisation');

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u join public.platform_admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- every permission check passes for a platform admin
create or replace function public.pitdog_can(p_team uuid, p_action text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or case p_action
    when 'read'  then public.pitdog_role(p_team) is not null
    when 'log'   then public.pitdog_role(p_team) in ('owner', 'pitwall', 'crew')
    when 'plan'  then public.pitdog_role(p_team) in ('owner', 'pitwall')
    when 'admin' then public.pitdog_role(p_team) = 'owner'
    else false end;
$$;

-- the admin's overview: every team with its people and activity
create or replace function public.admin_teams()
returns table (team_id uuid, name text, join_code text, members bigint, races bigint, events bigint, last_event timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query
    select t.id, t.name, t.join_code,
      (select count(*) from public.memberships m where m.team_id = t.id),
      (select count(*) from public.races r where r.team_id = t.id),
      (select count(*) from public.events e where e.team_id = t.id),
      (select max(e.created_at) from public.events e where e.team_id = t.id),
      t.created_at
    from public.teams t order by t.created_at desc;
end $$;

-- let an admin add themselves to a team (e.g. to help on race day), with any role
create or replace function public.admin_join_team(p_team uuid, p_role text default 'owner')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  insert into public.memberships (team_id, user_id, role, device_name) values (p_team, auth.uid(), p_role, 'admin')
    on conflict (team_id, user_id) do update set role = excluded.role;
end $$;

revoke all on function public.admin_teams(), public.admin_join_team(uuid, text) from public, anon;
grant execute on function public.admin_teams(), public.admin_join_team(uuid, text) to authenticated;
