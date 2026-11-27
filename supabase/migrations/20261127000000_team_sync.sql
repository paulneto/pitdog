-- PitDog team sync, v1 (see docs/roadmap-live-sync-sim.md §2)
--
-- Model
--   * Each device signs in anonymously (Supabase anonymous auth) and joins a team with a join code.
--   * teams.doc        : the team roster + cars (one JSON document, last write wins, with who/when)
--   * races.settings   : one race's plan (series, rules, car, drivers, status, summary), last write wins
--   * events           : the race itself, APPEND-ONLY. Every device inserts events with its own uuid; everyone
--                        merges by id and sorts by t. UNDO is a 'void' event pointing at the event it cancels,
--                        never a delete, so two devices tapping at once can't overwrite each other.
--   * Roles: owner (team admin) · pitwall (iPad: full control) · crew (can log race events) · viewer (read-only)
--
-- Security: row-level security on every table. The app only ever holds the anon/publishable key.
-- Joining and creating teams go through SECURITY DEFINER functions so membership can't be self-granted.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.pitdog_join_code() returns text
language sql volatile as $$
  -- 8 chars from an alphabet without look-alikes (no 0/O, 1/I/L)
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;

-- ---------------------------------------------------------------- tables
create table public.teams (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 60),
  join_code      text not null unique default public.pitdog_join_code(),
  doc            jsonb not null default '{}'::jsonb,          -- {members:[...], cars:[...], series, ...}
  doc_updated_at timestamptz not null default now(),
  doc_updated_by uuid default auth.uid(),
  created_at     timestamptz not null default now()
);

create table public.memberships (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'crew' check (role in ('owner', 'pitwall', 'crew', 'viewer')),
  device_name text check (char_length(device_name) <= 40),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.races (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index races_team_idx on public.races (team_id);

create table public.events (
  id         uuid primary key,                                 -- generated on the device, so offline inserts merge
  race_id    uuid not null references public.races(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,   -- denormalised for RLS + realtime filters
  t          bigint not null,                                  -- ms since epoch, the device's race clock
  type       text not null check (type in ('green', 'in', 'out', 'yellow', 'red', 'void')),
  payload    jsonb not null default '{}'::jsonb,               -- out: {driver, kind, fuel, full, stopLen}; flags: {on}; void: {target}
  device     text check (char_length(device) <= 40),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index events_race_t_idx on public.events (race_id, t);

-- an event's team must be its race's team (so a crew can't write into another team's race)
create or replace function public.events_team_check() returns trigger
language plpgsql as $$
begin
  if new.team_id is distinct from (select team_id from public.races where id = new.race_id) then
    raise exception 'event team does not match race team';
  end if;
  return new;
end $$;
create trigger events_team_check before insert on public.events
  for each row execute function public.events_team_check();

-- ---------------------------------------------------------------- membership checks
create or replace function public.pitdog_role(p_team uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.memberships where team_id = p_team and user_id = auth.uid();
$$;

create or replace function public.pitdog_can(p_team uuid, p_action text) returns boolean
language sql stable security definer set search_path = public as $$
  select case p_action
    when 'read'  then public.pitdog_role(p_team) is not null
    when 'log'   then public.pitdog_role(p_team) in ('owner', 'pitwall', 'crew')
    when 'plan'  then public.pitdog_role(p_team) in ('owner', 'pitwall')
    when 'admin' then public.pitdog_role(p_team) = 'owner'
    else false end;
$$;

-- ---------------------------------------------------------------- RPCs (the only way to create or join a team)
create or replace function public.create_team(p_name text, p_device text default null)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare t public.teams;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.teams (name) values (p_name) returning * into t;
  insert into public.memberships (team_id, user_id, role, device_name) values (t.id, auth.uid(), 'owner', p_device);
  return t;
end $$;

create or replace function public.join_team(p_code text, p_device text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id into tid from public.teams where join_code = upper(trim(p_code));
  if tid is null then raise exception 'no team with that code'; end if;
  insert into public.memberships (team_id, user_id, role, device_name)
    values (tid, auth.uid(), 'crew', p_device)
    on conflict (team_id, user_id) do update set device_name = coalesce(excluded.device_name, public.memberships.device_name);
  return tid;
end $$;

-- owners can rotate the code if it leaks
create or replace function public.rotate_join_code(p_team uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.pitdog_can(p_team, 'admin') then raise exception 'owner only'; end if;
  update public.teams set join_code = public.pitdog_join_code() where id = p_team returning join_code into c;
  return c;
end $$;

revoke all on function public.create_team(text, text), public.join_team(text, text), public.rotate_join_code(uuid) from public, anon;
grant execute on function public.create_team(text, text), public.join_team(text, text), public.rotate_join_code(uuid) to authenticated;

-- ---------------------------------------------------------------- row-level security
alter table public.teams       enable row level security;
alter table public.memberships enable row level security;
alter table public.races       enable row level security;
alter table public.events      enable row level security;

create policy teams_read   on public.teams for select to authenticated using (public.pitdog_can(id, 'read'));
create policy teams_update on public.teams for update to authenticated using (public.pitdog_can(id, 'plan')) with check (public.pitdog_can(id, 'plan'));
create policy teams_delete on public.teams for delete to authenticated using (public.pitdog_can(id, 'admin'));
-- (no insert policy: teams are created only through create_team)

create policy memberships_read   on public.memberships for select to authenticated using (public.pitdog_can(team_id, 'read'));
create policy memberships_admin  on public.memberships for update to authenticated using (public.pitdog_can(team_id, 'admin')) with check (public.pitdog_can(team_id, 'admin'));
create policy memberships_remove on public.memberships for delete to authenticated using (public.pitdog_can(team_id, 'admin') or user_id = auth.uid());
-- (no insert policy: membership comes only from create_team / join_team)

create policy races_read   on public.races for select to authenticated using (public.pitdog_can(team_id, 'read'));
create policy races_insert on public.races for insert to authenticated with check (public.pitdog_can(team_id, 'plan'));
create policy races_update on public.races for update to authenticated using (public.pitdog_can(team_id, 'plan')) with check (public.pitdog_can(team_id, 'plan'));
create policy races_delete on public.races for delete to authenticated using (public.pitdog_can(team_id, 'admin'));

create policy events_read   on public.events for select to authenticated using (public.pitdog_can(team_id, 'read'));
create policy events_insert on public.events for insert to authenticated
  with check (public.pitdog_can(team_id, 'log') and created_by = auth.uid());
-- (no update/delete policies: events are append-only; UNDO is a 'void' event)

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.events, public.races, public.teams;
