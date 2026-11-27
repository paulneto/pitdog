-- The race→team consistency check must see the race whoever is inserting. As SECURITY INVOKER it ran under the
-- caller's row-level security, so a non-member's insert failed in this trigger ("team does not match") instead of
-- being refused by the events_insert policy. Running it as definer makes the check exact and lets RLS do the refusing.
create or replace function public.events_team_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.team_id is distinct from (select team_id from public.races where id = new.race_id) then
    raise exception 'event team does not match race team';
  end if;
  return new;
end $$;
revoke all on function public.events_team_check() from public, anon, authenticated;
