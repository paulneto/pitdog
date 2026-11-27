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
`rotate_join_code(team)` lets the owner replace a leaked code.

## Checks
`python3 supabase/tests/rls_check.py` runs 25 permission checks **inside the real database** (simulated users,
everything it creates is deleted in the same request). Run it after any migration.

## Applying a migration
Migrations are applied through the Supabase Management API (see the session log) or `supabase db push` once the
project is linked. Each applied version is recorded in `supabase_migrations.schema_migrations`.

## Free-tier note
The account allows **two active free projects**. PitDog took the slot of LotAgent's **Deal-agent-staging**, which was
**paused** on 27 Nov 2026 (data kept; restore from the Supabase dashboard when needed; that would need PitDog or
another project paused, or a paid plan).
