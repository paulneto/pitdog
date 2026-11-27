# PitDog on Supabase (team sync backend)

**Project:** `pitdog` · ref `xbyxqcudlugyqwgdnktj` · East US (N. Virginia) · free plan · organisation **PitDog**
(its own org, kept apart from the LotAgent and Measure orgs in the same account).

**Not in git:** the database password and the publishable key live in `~/.pitdog/supabase.env` (chmod 600).
The publishable key is safe to ship inside the app; the secret/service-role key is never stored anywhere.
The Supabase CLI login token is in the macOS keychain ("Supabase CLI").

## Sign-in: OAuth only
Anonymous, email and phone sign-in are **off**. Crew sign in with an OAuth provider (Google first), then join their
team with its 8-character join code. Allowed redirect URLs: `https://paulneto.github.io/pitdog/**` and
`http://localhost:8765/**` (local dev). Sign-in needs signal once; the session then persists offline.

## Schema (`migrations/`)
| Table | What | Who can write |
|---|---|---|
| `teams` | name, join code, roster + cars (`doc` JSON, last write wins) | created only via `create_team()`; owner/pit wall edit |
| `memberships` | user ↔ team with role `owner` · `pitwall` · `crew` · `viewer` | only via `create_team()` / `join_team()`; owner changes roles |
| `races` | one race's plan (`settings` JSON, last write wins) | owner / pit wall |
| `events` | the race log, **append-only** (device-generated ids; UNDO = a `void` event) | owner / pit wall / crew, as themselves only |

Row-level security is on for every table; realtime is enabled on `events`, `races` and `teams`.

**Membership rules** (hardened after an independent review): join codes live in `team_codes`, readable only by owners
and pit wall. Leaving and re-joining gives back your previous role; someone removed by an owner can't re-join until
the owner calls `allow_rejoin(team, user)`; the last owner can't leave or be demoted. `server_now()` lets devices
correct their clock.
`rotate_join_code(team)` lets the owner replace a leaked code.

## Admin access
- **In the app (platform admin):** `public.platform_admins` lists admin emails (seeded: `paul@neto.me`). An admin signs
  in with OAuth like anyone else; if that account's **verified** email is on the list, every permission check passes:
  all teams, races and logs are readable and fixable. `admin_teams()` gives an overview of every team;
  `admin_join_team(team, role)` adds the admin to a team (e.g. to help on race day). Clients can't read or change the
  list (RLS with no policies); add or remove admins in the Supabase SQL editor:
  `insert into public.platform_admins(email, note) values ('someone@example.com', 'why');`
- **Break-glass:** the Supabase dashboard (owner of the PitDog org) always has full access (Table Editor, SQL editor),
  whatever the app's rules or login providers are doing. The Supabase CLI login on Paul's Mac is a second way in.

## System admin console: `app/admin.html`
Live at `https://paulneto.github.io/pitdog/admin.html` (not linked from the app; `noindex`). Sign in with Google; the
page opens only for platform admins, and every action is an `admin_*` RPC that re-checks admin rights in the database
and writes to `admin_audit`. Tabs: **Teams** (rename, new join code, roles, remove people, join as pit wall, delete,
race settings override, race log with void), **Accounts** (status, teams, suspend 1/7/30 days or indefinitely, restore,
delete), **App settings** (`app_settings`: banner, maintenance, series_overrides, features, readable by every client),
**Admins** (add/remove; the last admin can't be removed) and **Audit log**. Destructive actions need the name typed.

## Checks
`python3 supabase/tests/rls_check.py` runs 64 permission checks (team roles, join codes, membership history, last owner, platform admins, admin console RPCs) **inside the real database** (simulated users,
everything it creates is deleted in the same request). Run it after any migration.

## Applying a migration
Migrations are applied through the Supabase Management API (see the session log) or `supabase db push` once the
project is linked. Each applied version is recorded in `supabase_migrations.schema_migrations`.

## Free-tier note
The account allows **two active free projects**. PitDog took the slot of LotAgent's **Deal-agent-staging**, which was
**paused** on 27 Nov 2026 (data kept; restore from the Supabase dashboard when needed; that would need PitDog or
another project paused, or a paid plan).

## Members in the app (migration 0500)

Owners manage members from the app's Team tab: `team_members(team)` lists everyone (names and roles for all members; emails and removed people for owners only), `set_member_role(team, user, role)` changes a role (the last owner can't be demoted), removal is a plain delete under the `memberships_remove` policy, and `allow_rejoin` lets a removed person join again with the code. The direct UPDATE policy on `memberships` is gone, so roles change only through `set_member_role`.
