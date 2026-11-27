# PitDog: live timing, team sync and simulator plan
*27 Nov 2026*

## 1. Live timing: what's available, and the terms

Lucky Dog timing runs on **MyLaps transponders**. The data is relayed to **Race Monitor** (owned by FloSports), and MyLaps **Speedhive** also shows races (2026 rulebook §17).

### Race Monitor (the realistic route)
| | |
|---|---|
| API | `https://api.race-monitor.com/v2/…`, token-based. The official docs (`race-monitor.com/APIDocs`) need a login. A community library ([race-monitor-py](https://github.com/WOT-Lemons/race-monitor-py)) maps all 32 endpoints. |
| Live data | `Live/GetSession` (positions, laps, last/best lap per car), `Live/GetRacer` (all lap times for one car), `Race/IsLive`, plus `Live/GetStreamingConnection` for a WebSocket push stream. The stream protocol isn't publicly documented. |
| How to get a key | No self-serve sign-up. The pricing page says **"Contact us now to sign up."** The token then appears in your race-monitor.com account. |
| Price | **Low tier $100/month**: 200k requests and 1,000 streaming hours. Polling one race every 10 s for 7 h is ~2,500 requests, so the **minimum fee is the whole cost**. It could be switched on only in months with races. |
| Terms | The Race Monitor Terms of Use (FloSports) grant a *"personal, revocable, limited, non-exclusive… license"* and forbid using, copying, storing, reproducing, transmitting or redistributing data *"in any manner not expressly permitted"*. **So: no scraping the public live-timing page.** Use an API key under whatever terms Race Monitor grants, and ask explicitly whether a single team showing its own car's data on its own devices is allowed. |

### MyLaps Speedhive
Live timing is meant for timers and organisers. Third-party reports say the live SDK needs screening and an NDA, and the **event's timer owns the data**. Not realistic for a team app.

### Team-owned data (no third-party terms)
- **RaceCapture / Podium** (Autosport Labs, a Lucky Dog sponsor). If the car has it, it gives real lap times, real **fuel level**, GPS and engine data. Worth checking whether your car runs it or could.
- **PitDog "car beacon" (buildable now):** a phone mounted in the car runs PitDog in *car mode*. It uses GPS to count laps across the start/finish line and to detect pit-lane entry and exit (geofences), and sends lap times to the team over Supabase. That gives **exact lap count, lap times and automatic PIT IN/OUT** for our own car, with no licence needed. It can't give positions against other cars; only Race Monitor can.

**Recommendation:** build the car beacon (we own the data), and in parallel email Race Monitor (draft below) for a hobby/team key and written permission. Add positions and gaps only if they say yes.

## 2. Team sync (Supabase + Vercel)

PitDog is already **event-sourced**: the race is a list of events (green, pit in/out, yellow…) plus settings. That makes syncing safe:
- **Events = append-only set.** Every device adds events with a unique id, and everyone merges by id, sorted by time. Two people tapping at once can't overwrite each other. *Change needed:* UNDO becomes a "void" event instead of deleting.
- **Settings (plan, drivers, car)** = one document, last write wins, with an "edited by" note.
- **Offline:** devices queue events locally and flush when signal returns. The iPad stays fully usable with no signal.

Supabase pieces:
- `teams` (id, name, join_code), `members` (team_id, user_id, role)
- `races` (id, team_id, settings jsonb, updated_at), `events` (id uuid, race_id, t, type, payload jsonb, device)
- **OAuth sign-in (Google first) plus a team join code** (anonymous sign-in was dropped: accounts and logins use OAuth only). Row-level security limits each device to its own team's rows. Realtime subscriptions on `events` and `races`.
- Roles: **pit wall** (iPad: full control), **crew** (can tap PIT IN/OUT), **viewer** (drivers and family: read-only).

Vercel: host the app (it can move off GitHub Pages), plus **one serverless function as the Race Monitor relay** if we get a key. That keeps the token secret and avoids browser cross-site (CORS) restrictions. GitHub Pages is fine until then.

**Status 27 Nov 2026:** Supabase project `pitdog` is live with the schema, row-level security (25 checks passing) and OAuth-only auth; see `supabase/README.md`. Still needed: a Google OAuth client, then the app-side sync.

## 3. Simulator (end-to-end testing)

Three layers:
1. **Race simulator inside PitDog ("SIM" mode):** a virtual race at ×1–×60 speed. A simulated car does laps with realistic variation, burns fuel and changes drivers. It throws random yellows and reds and occasional mistakes (late box, short stop, driver over the max stint). An optional "auto-crew" follows the plan so you can watch a whole 7 hours in 10 minutes on the command center. Also good for training the crew before a race.
2. **Fake data feeds:** a mock Race Monitor `GetSession` (a 60-car field across classes A/B/C/SD) and a mock car beacon, so the live-timing and sync code are built and tested **before** a real key exists or a real race happens.
3. **Automated end-to-end tests:** scripted scenarios in headless Chrome with pass/fail checks:
   - a full Lucky Dog 7-hour day and a PCA enduro
   - a driver-only stop, a red flag, a refresh mid-race, and offline use
   - **two devices on one team code**: the iPad and a phone both tap, and they must agree

## Phases
| Phase | What | Needs |
|---|---|---|
| A | ✅ **Done (27 Nov):** simulator (in-app SIM mode, auto-crew, race control, truth car) + automated sweeps; local team/races model | — |
| A2 | ✅ **Done (27 Nov):** Strategy Lab: driver profiles, conditions, strategy comparison, practice mode | — |
| B | Team sync (Supabase), with UNDO switched to void events | Supabase URL and anon key |
| C | Car beacon (GPS laps, auto pit in/out) | a test drive or a recorded GPS track |
| D | Race Monitor positions and gaps through a Vercel relay | API key and written OK from Race Monitor |

## Draft email to Race Monitor (not sent)
> **To:** Race Monitor support (via race-monitor.com → Contact Us)
> **Subject:** API access for a single endurance team's pit-wall app
>
> Hi,
>
> I race with an endurance team in the Lucky Dog Racing League, which uses Race Monitor for live timing. We've built a small, non-commercial pit-wall app for our own crew, and we'd like it to show our car's live position, laps and lap times alongside our stint and fuel planning.
>
> Could you tell me:
> 1. Whether there's an API option for a single team or hobby use (we'd poll `Live/GetSession` for one race about every 10 seconds, only during our race weekends, a few thousand requests per event), and what it would cost;
> 2. Whether your terms allow us to show that data privately to our own team (around 4–8 devices, not public, no redistribution);
> 3. Whether the streaming connection is available on that plan, or whether polling is preferred.
>
> Thanks,
> Paul

---

## 4. Platform vision (future): proper backend, accounts, teams, management
*Added 27 Nov 2026. Paul: "this could be the one."* PitDog grows from a single-device app into a multi-team platform.

**Backend:** Supabase (Postgres + Auth + Realtime + Edge Functions) for data and sync. Vercel for the app and any server API (Race Monitor relay, webhooks). The race stays **event-sourced** (an append-only events table), and the app stays **offline-first**: queue locally and sync when signal returns.

**Accounts (OAuth):** Google and **Sign in with Apple** (expected on iOS), plus email magic links as a fallback. One person can belong to several teams.

**Teams and roles:** team owner/admin, pit wall, crew, driver and viewer. Invite by link or code. Role-based permissions enforced with Supabase row-level security.

**Management system:**
- **Team:** roster (drivers, crew), licences/wristbands, contact details
- **Cars:** fuel capacity, measured burn per track, lap times, maintenance log
- **Events calendar:** series, track, schedule (multi-day), entry status
- **Race history:** every race kept (events, stints, stops, fuel), with stats per driver and per track
- **Arrive-and-drive seats:** seat time sold per driver against seat time driven, plus cost splits (entry, fuel, tyres)
- **Series presets:** Lucky Dog, PCA, ChampCar, WRL, 24 Hours of Lemons, and more (rules docs per series)

**Product angle:** grassroots endurance (Lucky Dog, ChampCar, WRL, Lemons) has many small teams running stints on paper and whiteboards. A free team tier plus paid features (history, analytics, live timing) is a plausible path, to be validated with teams at events.

**Order:** finish the single-team sync (section 2) on the new schema so it grows straight into accounts and teams rather than being rebuilt.
