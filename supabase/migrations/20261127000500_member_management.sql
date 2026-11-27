-- Member management in the app (until now only the admin console could change roles):
--  1. team_members(team): everyone in the team sees names, roles and devices; owners also see emails and the
--     people they removed (so they can let them back in with allow_rejoin).
--  2. set_member_role(team, user, role): owners change roles through this function only. The direct UPDATE policy
--     on memberships goes, because it let an owner rewrite any column (user_id, team_id), not just the role.
--     The memberships_owner_guard trigger still refuses demoting the last owner.

create or replace function public.team_members(p_team uuid)
returns table (user_id uuid, name text, email text, role text, device text, joined_at timestamptz, removed boolean, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare own boolean := public.pitdog_can(p_team, 'admin');
begin
  if not public.pitdog_can(p_team, 'read') then raise exception 'not a member of this team'; end if;
  return query
    select m.user_id,
      coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Member'),
      case when own or m.user_id = auth.uid() then u.email::text end,
      m.role, m.device_name, m.joined_at, false, m.user_id = auth.uid()
    from public.memberships m left join auth.users u on u.id = m.user_id
    where m.team_id = p_team
    union all
    select h.user_id,
      coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Member'),
      u.email::text, h.last_role, null, h.changed_at, true, false
    from public.membership_history h left join auth.users u on u.id = h.user_id
    where own and h.team_id = p_team and h.removed
      and not exists (select 1 from public.memberships m2 where m2.team_id = p_team and m2.user_id = h.user_id);
end $$;

create or replace function public.set_member_role(p_team uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pitdog_can(p_team, 'admin') then raise exception 'owner only'; end if;
  if p_role not in ('owner', 'pitwall', 'crew', 'viewer') then raise exception 'unknown role %', p_role; end if;
  update public.memberships set role = p_role where team_id = p_team and user_id = p_user;
  if not found then raise exception 'not a member of this team'; end if;
end $$;

drop policy if exists memberships_admin on public.memberships;

revoke all on function public.team_members(uuid), public.set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.team_members(uuid), public.set_member_role(uuid, uuid, text) to authenticated;
