# PitDog 🏁

**Pit-wall app for endurance race teams.** Rule sets for **Lucky Dog, ChampCar, WRL, AER, 24 Hours of Lemons and PCA Club Racing**, chosen per race (see `docs/rules-comparison.md`). Stint and fuel planning, a one-button race-day pit wall on phones, and an iPad **command center** in landscape. Works offline.

**Live:** https://paulneto.github.io/pitdog/

## What it does
- **Race now:** one sheet from nothing to the grid: who's driving (tap in order), how many hours, which car. It asks for the team name and car numbers only when they're missing, remembers the last race, and offers your **presets** as one-tap chips. On scheduled series the clock starts at the green flag. "Change" before the green edits the race in place
- **Four tabs:** Home · Race · Plan · Team. The race log opens from the race screen, Strategy Lab from Plan, records and debriefs from Home, each with a ‹ Back button
- **Menu (☰, or MENU on the iPad):** the way out of any state: end the race now (early checkered, synced), abandon it, end the simulator, leave help mode, race now, home, phone view, sound on/off, start over. Esc closes sheets and help
- **Sound alerts:** short tones (and vibration on Android) for gear up, box in 3 minutes, box now, minimum stop served and the cheap stop under yellow; once each, never replayed on reopen, quiet in the simulator; mute per device from the menu
- **Team records:** season totals (races, hours, laps, stops, fuel, time in the pits), seat time and longest stint per driver, best and average fuel stop and time over the minimums, yellow chances taken, measured burn per track, and every finished race (opens its debrief). Filter by season
- **Race presets:** save a setup you race often (series, hours, track, car, driver order, rules) from Race now or Plan; start it with one tap; shared with the team; manage on the Team tab
- **Pit board:** PIT BOARD on the race screen (or the menu) shows a giant, high-contrast message to hold over the wall: BOX +laps and who's next (worked out from the plan), stay out, fuel OK, push, or your own words
- **Copy schedule:** Plan → Share & try puts the plan in the team chat: stints in order with each stop's fuel (in jugs) and hold, who drives when, and the fuel for the day
- **Backups:** the last five copies of the device's data, taken before anything risky (join, abandon, reset, import, restore); restore any of them from Team → Data. If storage fills up, old backups and the forecast cache go first so the race still saves
- **iPad either way up:** the command center works in landscape and, stacked, in portrait
- **Phones either way up:** portrait as designed; on its side the race screen goes side by side (cards left, the big button and flags right) and the command center never takes over a phone
- **Home:** on race day the app opens on the race screen; any other day it opens on Home: the next race (day, series, track, driver order, rules at a glance, race-day forecast), a **prep checklist** worked out from the plan (fuel for the day, jugs, first driver, stops), the last race, season seat time and measured fuel burn per track
- **Debrief:** finishing a race opens it. Built from the race log only: laps, stops, time in the pits and **time given away over the minimums**, cheap yellow stops taken or missed, over-long stints, missing stops, measured fuel burn, plan at the green vs what happened, drivers, rule checks and notes. "Copy summary" for the team chat
- **Team:** create a team once (people with roles and colours, cars), then for each race pick **who's driving** and in what order. Finished races go into team history with seat time per driver and the car's **measured fuel burn per track**. Owners manage signed-in members (roles, remove, let back in) on the Team tab
- **Strategy Lab:** driver profiles (typical lap, consistency, fuel use, fade per hour) feed the planner and the simulator. Compare strategies (your plan, even stints, fast drivers longer, pit on yellows, ignore yellows, combos) over 20–200 simulated races each, with the same random yellows and reds for every strategy. Results show average and worst-10% laps, stops, ran-dry and rule-break rates, and seat time per driver. Conditions: normal, wet, chaos, fuel leak, driver out. "Use this plan" applies a strategy; "Watch one" plays it on the command center; "Practise" lets the crew run a race manually. About 6 ms per simulated race in the browser
- **Simulator:** run a whole race at 30×, 60×, 120× or 200× with your team, car and rules. Race control throws yellows and reds, a "truth" car burns real fuel, and an optional auto-crew runs the stops. The end-of-race report checks for running dry, short stops, stint limits and how close the measured burn was. Nothing is saved
- **Plan:** timeline, stints, drivers, then race basics; the series rules and the car's fuel/pit numbers fold into one-line summaries. Stints, fuel and driver rotation within series rules (Lucky Dog: 2-h max stint, 60-min driver rest, 5-min fuel stops, mandatory 5-min stop every 2 h; PCA: stop window, pits closed under FCY)
- **Race (phone):** the next-stop countdown is the hero, one status strip for alerts, one big button (GREEN → PIT IN → PIT OUT), stop-type logging and a glove-sized fuel stepper, next-driver picker with rest timers, BOX / on-deck / stint-limit / yellow-window alerts, YELLOW / RED / UNDO
- **Command center (iPad landscape):** flag bar, race clock with track map, car/pit panel with ring timer and a **stop brief** (stop type, fuel in jugs, minimum hold, next driver and when to gear up), crew rotation, fuel gauge, track weather, next stops and the full race timeline on one screen. HOME and MENU in its top bar. Scales to shorter screens
- **Team / Race log:** people, cars, races, presets, sync, look and device data on Team; the race log (fix, finish or clear) from the race screen; send or print the plan from Plan
- **Skins:** Night race, Sunlight (for midday glare) and six F1-team-inspired liveries (Rosso, Papaya, Silver Arrow, Midnight, Racing Green, Grove Blue), chosen per device (Team → Look, or SKIN on the command center). See `docs/design-review.md`
- **Team sync (optional):** Team tab → sign in with Google (in-page button) → put your team online (you're the owner) or join with an 8-character code / invite link. Every device keeps the whole team and works offline; race-log entries get ids and go up from an outbox when there's signal (append-only: UNDO and Fix send a *void*, nothing is overwritten), other devices' entries arrive live. Roles: owner and pit wall change the plan, crew log stops and flags, viewers watch. The top bar shows SYNC ✓ / OFFLINE · n / SIGNED OUT
- **Track maps:** a small outline of the circuit (pit lane dashed) on the race screen, the iPad clock panel and Home, for the built-in tracks. Drawn from [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors) by `tools/trackmaps.py` and baked into the app, so they work offline. No live car position yet.
- **Weather radar:** the Radar button (race screen, iPad weather panel, Home on race day) animates the last ~2 h of rain around the track ([RainViewer](https://www.rainviewer.com), free for personal use, over OpenStreetMap tiles), with a 50 km ring. Needs signal. Admins can switch it off (`features.radar`)
- **Offline-first:** installs to the home screen and runs with no signal (service worker); race state survives reloads

## Platform notes
- **Vibration** on button presses works on **Android only**. iPhone Safari doesn't support it, so the buttons just work without the buzz.
- **Race state is saved per device** in the browser. It survives reloads and closing the app (tested), but **clearing website data or using a private tab loses it**.
- **Offline:** open the app once with signal (on iPhone, from the home-screen icon) so it's saved for offline use. Updates arrive the next time it's opened with signal.
- **Weather** needs signal; without it the command center shows the last reading.

## Screenshots
`docs/screenshots/` (Night skin): race screen with the next-stop hero, a pit stop (fuel stepper, filled-to-full), the iPad command center on track (with the stop brief and track map) and in the pits, help mode, the skin list, the radar, Home, a debrief, team sync, Race now with presets, team records, a phone on its side (on track and in the pits), the command center on an iPad in portrait, and the menu.

## Project layout
```
app/                 the app: deployed as-is, no build step
  index.html         the whole app (HTML + CSS + JS in one file)
  sw.js              offline cache (version stamped on deploy)
  manifest.webmanifest, icon*.png/svg
  fonts/             bundled Inter (OFL), precached for offline
tests/e2e/           headless-Chrome scenarios with a fake race clock
  run.sh             run all scenarios (or: run.sh <name-filter>)
  harness.js         fake clock + helpers injected into the app
  scenarios/*.js     34 scenarios: race day, sync (fake Supabase), race now, menu, records, presets,
                     sound, landscape, command center, simulator, sim-sweep (25 races), series-sweep, …
                     (no network: every scenario uses fakes; the suite runs in ~30 s)
docs/
  roadmap-live-sync-sim.md   live timing research, team sync and simulator plan
  rules-comparison.md        all series side by side, with sources
  rules-*.md                 one page per series (lucky-dog, champcar, wrl, aer, lemons, pca)
scripts/serve.sh     local dev server (http://localhost:8765)
experiments/         parked prototypes (DriftScore), not deployed
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
- **Fuel model (read this before touching fuel code):** fuel stops **fill to full** by default (Car → Fuel stops). The car is assumed to start full*, and a stop logged **"filled to full"** resets the tank estimate to full. **Measured burn** comes only from full-to-full stretches, on green-flag time (red = no burn, yellow counted at 30%*, deliberately low so errors over-read the burn). The plan's burn is cautious: your estimate + safety margin (default 15%) until measured, then max(estimate, measured) + 5% after one stretch, then measured + 3%. The **`fuel-truth`** scenario is the gate: a sim crew that *follows the app* (never sees the true tank) must never run dry across series, tank sizes and fill modes.
- **Simulator auto-crew follows the app**: it pours the planned fuel, logs to the nearest half jug, pits on BOX or a cheap yellow. It never looks at the true fuel level, so "ran dry" in the sim or the Strategy Lab is a real finding about the plan.
- **Race-day safety nets:** 1.5 s double-tap guard on the big button; "Logged: …" confirmation with a **Fix** sheet after PIT OUT; a red **NOT SAVING** banner if storage fails; `navigator.storage.persist()`; **Export / Import** (Log tab) and an automatic **backup** before clearing the log, resetting or importing; races imported from a share link are **plan copies** (GREEN asks before a second device starts logging); a warning when PitDog is open in two tabs.
- **Deploy is gated by tests:** the Pages workflow runs `tests/e2e/run.sh` (Chrome on Ubuntu) and deploys only if every scenario passes. The service worker waits at most 2.5 s for the network, then serves the cached app.
- **Local team database** (`localStorage` key `pitdog_db`, the same shape as the future Supabase tables): `team {members[], cars[]}`, `races[] {series, rules, carId, drivers[{mid,max}], events[], status, summary}`, `activeRaceId`. The active race is **hydrated** into the working object `S` (`hydrate()`) and written back by `dbSave()`. Always `dbSave()` *before* changing `DB.activeRaceId`, or the old race's state gets copied into the new one.
- Data from the pre-team version (`pitdog` key) migrates automatically (`migration` test).
- **Clock:** all race time goes through `nowMs()` (the real clock, or the simulator's virtual clock).
- **Event-sourced race state:** `S.events` (green, in, out, yellow, red) plus settings. Everything else (stints, fuel, alerts) is derived by `live()` and `plan()` on every tick. That's what makes team sync (append-only merge) straightforward.
- **Series rules** live in `SERIES` (`luckydog`, `pca`, `custom`); the planner reads `S.race`.
- `computeAlerts()` feeds both the phone banners and the command-center alert list.
- Other storage keys: `pitdog_view` (layout choice) and `pitdog_wx` (last weather reading).

## Roadmap
See `docs/roadmap-live-sync-sim.md`: race simulator mode, Supabase team sync, an in-car GPS "beacon" for laps and auto pit in/out, and Race Monitor positions (API key and permission pending).
