# PitDog 🏁

**Pit-wall app for endurance race teams.** Built for Lucky Dog Racing League, with a PCA Club Racing preset too. Stint and fuel planning, a one-button race-day pit wall on phones, and an iPad **command center** in landscape. Works offline.

**Live:** https://paulneto.github.io/pitdog/

## What it does
- **Team:** create a team once (people with roles and colours, cars), then for each race pick **who's driving** and in what order. Finished races go into team history with seat time per driver and the car's **measured fuel burn per track**. "Same team, new day" sets up Sunday from Saturday
- **Simulator:** run a whole race at up to 60× with your team, car and rules. Race control throws yellows and reds, a "truth" car burns real fuel, and an optional auto-crew runs the stops. The end-of-race report checks for running dry, short stops, stint limits and how close the measured burn was. Nothing is saved
- **Plan:** stints, fuel and driver rotation within series rules (Lucky Dog: 2-h max stint, 60-min driver rest, 5-min fuel stops, mandatory 5-min stop every 2 h; PCA: stop window, pits closed under FCY)
- **Race (phone):** one big button (GREEN → PIT IN → PIT OUT), stop-type and jug logging, next-driver picker with rest timers, BOX / on-deck / stint-limit / yellow-window alerts, YELLOW / RED / UNDO
- **Command center (iPad landscape):** flag bar, race clock, car/pit panel with ring timer, crew rotation, fuel gauge, track weather, alerts and the full race timeline on one screen
- **Team / Log:** seat time, rest status, measured fuel burn, event log, multi-day archive, share-a-plan link
- **Offline-first:** installs to the home screen and runs with no signal (service worker); race state survives reloads

## Platform notes
- **Vibration** on button presses works on **Android only**. iPhone Safari doesn't support it, so the buttons just work without the buzz.
- **Race state is saved per device** in the browser. It survives reloads and closing the app (tested), but **clearing website data or using a private tab loses it**.
- **Offline:** open the app once with signal (on iPhone, from the home-screen icon) so it's saved for offline use. Updates arrive the next time it's opened with signal.
- **Weather** needs signal; without it the command center shows the last reading.

## Screenshots
See `docs/screenshots/`: onboarding, Team tab, new race driver picker, simulator on the command center, simulation report, and the command center under yellow and during a pit stop.

## Project layout
```
app/                 the app: deployed as-is, no build step
  index.html         the whole app (HTML + CSS + JS in one file)
  sw.js              offline cache (version stamped on deploy)
  manifest.webmanifest, icon*.png/svg
tests/e2e/           headless-Chrome scenarios with a fake race clock
  run.sh             run all scenarios (or: run.sh <name-filter>)
  harness.js         fake clock + helpers injected into the app
  scenarios/*.js     luckydog-full-day, pca-enduro, command-center, team-flow,
                     migration, simulator, sim-sweep (25 seeded simulated races)
docs/
  roadmap-live-sync-sim.md   live timing research, team sync and simulator plan
  rules-lucky-dog-2026.md    the rules the app enforces, with source
  rules-pca-2026.md
scripts/serve.sh     local dev server (http://localhost:8765)
.github/workflows/pages.yml  auto-deploy app/ to GitHub Pages on push to main
```

## Develop
```bash
scripts/serve.sh            # http://localhost:8765 (use http, not file://, for offline/PWA bits)
tests/e2e/run.sh            # must pass before pushing
```
Check both layouts: phone (~430×900) and iPad landscape (1180×820).

## Deploy
Push to `main`. GitHub Actions publishes `app/` to Pages and stamps the offline-cache version, so phones get the update the next time they open the app with signal.

## Architecture notes
- **Local team database** (`localStorage` key `pitdog_db`, the same shape as the future Supabase tables): `team {members[], cars[]}`, `races[] {series, rules, carId, drivers[{mid,max}], events[], status, summary}`, `activeRaceId`. The active race is **hydrated** into the working object `S` (`hydrate()`) and written back by `dbSave()`. Always `dbSave()` *before* changing `DB.activeRaceId`, or the old race's state gets copied into the new one.
- Data from the pre-team version (`pitdog` key) migrates automatically (`migration` test).
- **Clock:** all race time goes through `nowMs()` (the real clock, or the simulator's virtual clock).
- **Event-sourced race state:** `S.events` (green, in, out, yellow, red) plus settings. Everything else (stints, fuel, alerts) is derived by `live()` and `plan()` on every tick. That's what makes team sync (append-only merge) straightforward.
- **Series rules** live in `SERIES` (`luckydog`, `pca`, `custom`); the planner reads `S.race`.
- `computeAlerts()` feeds both the phone banners and the command-center alert list.
- Other storage keys: `pitdog_view` (layout choice) and `pitdog_wx` (last weather reading).

## Roadmap
See `docs/roadmap-live-sync-sim.md`: race simulator mode, Supabase team sync, an in-car GPS "beacon" for laps and auto pit in/out, and Race Monitor positions (API key and permission pending).
