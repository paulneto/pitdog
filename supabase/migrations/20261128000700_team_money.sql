-- Team money: who paid what (parts, fuel, repairs, entry fees, accommodation…), for which race or car, and how it's
-- shared across the team. Same model as the race log: APPEND-ONLY. Every device inserts entries with its own uuid and
-- everyone merges by id; an edit is a 'void' of the old entry plus a new one, so two people adding expenses at the same
-- time (or offline) can't overwrite each other.
--   kind 'exp'  : an expense   {date, amt (cents), by (roster member id), cat, race, car, note, split{m, who, sh}}
--   kind 'pay'  : a settle-up payment between two people {date, amt, from, to, note}
--   kind 'rule' : how costs are split by default, for the team or for one race {scope, m, sh, cur}
--   kind 'void' : cancels an entry {target}
-- Every member can read and add (drivers who only watch the race still pay for hotels). Split rules are for the owner
-- and pit wall. An entry can be voided by whoever added it, or by the owner / pit wall.

create table public.ledger (
  id         uuid primary key,                                  -- generated on the device
  team_id    uuid not null references public.teams(id) on delete cascade,
  t          bigint not null,                                   -- ms since epoch, when it was entered
  kind       text not null check (kind in ('exp', 'pay', 'rule', 'void')),
  payload    jsonb not null default '{}'::jsonb check (octet_length(payload::text) <= 4000),
  device     text check (char_length(device) <= 40),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index ledger_team_idx on public.ledger (team_id, t);

create or replace function public.ledger_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare tgt public.ledger;
begin
  if new.kind = 'rule' and not public.pitdog_can(new.team_id, 'plan') then
    raise exception 'only the owner or pit wall set how costs are split';
  end if;
  if new.kind = 'void' then
    select * into tgt from public.ledger where id = nullif(new.payload->>'target', '')::uuid;
    if tgt.id is null or tgt.team_id <> new.team_id or tgt.kind = 'void' then raise exception 'nothing to remove'; end if;
    if tgt.created_by <> auth.uid() and not public.pitdog_can(new.team_id, 'plan') then
      raise exception 'only the person who added it, or the owner / pit wall, can remove it';
    end if;
  end if;
  return new;
end $$;
create trigger ledger_guard before insert on public.ledger for each row execute function public.ledger_guard();

alter table public.ledger enable row level security;
create policy ledger_read   on public.ledger for select to authenticated using (public.pitdog_can(team_id, 'read'));
create policy ledger_insert on public.ledger for insert to authenticated
  with check (public.pitdog_can(team_id, 'read') and created_by = auth.uid());
-- (no update/delete policies: entries are append-only; removing one is a 'void')

alter publication supabase_realtime add table public.ledger;
