# PitDog: notes for Claude

Paul's **personal** project (endurance racing). It's **not Measure Protocol work**: keep it out of the Measure workspace, support pods and Drop, and don't use Measure accounts or credentials.

- **Stack:** one static file, `app/index.html` (vanilla HTML/CSS/JS, no framework, no build). Keep it that way unless there's a clear reason.
- **Users:** a race crew at the track, often **with no signal**. Offline-first matters. Big touch targets; it must be readable on an iPad on a pit-wall table and a phone in a gloved hand.
- **Rules are sourced, not guessed:** see `docs/rules-comparison.md` and `docs/rules-*.md`. Each `SERIES` preset must set every key in `RULEKEYS`, so switching series resets cleanly. If a rule changes, update the doc, the `SERIES` entry (rules, glance, pit, src) and run `series-sweep`. Mark unverified assumptions with * in the glance and rules text.
- **Verify every change:** `tests/e2e/run.sh` (headless Chrome, fake clock) must pass. For UI changes, screenshot both the phone (~500×900) and iPad landscape (1180×820) views. Headless Chrome needs to run outside the sandbox.
- **Deploy:** push to `main` and GitHub Actions publishes `app/`. That updates the live app the crew uses, so only push working, tested changes.
- **Data/terms:** live timing comes from Race Monitor (FloSports). **Don't scrape the public timing pages**; the terms forbid it. Use the API only with a key and permission (see roadmap).
- **Secrets:** a Supabase anon/publishable key may live in the app. **Never** commit a service-role key or a Race Monitor token. Those belong in Vercel environment variables.
- **Data model:** a local team database `DB` (team, races) is hydrated into the working object `S` for the active race. Call `dbSave()` *before* changing `DB.activeRaceId` (see README). Use `nowMs()` for race time, never `Date.now()`, so the simulator works.
- **Simulator:** `tests/e2e/scenarios/sim-sweep.js` runs 25 seeded race days. If you change planning or fuel logic, this sweep is the real test. The only allowed flags are the auto-crew's deliberate early departures.
- **Driver profiles** (`pace`, `cons`, `ff`, `fade` on team members; `prof(i)`) feed the planner (`lapOf`/`burnOf`/`rangeOf`) and the simulator truth model. The Strategy Lab runs headless sims via `labRun()`, which must restore `S`/`DB`/`SIM` and never write storage.
