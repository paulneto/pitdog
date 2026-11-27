# PitDog: notes for Claude

Paul's **personal** project (endurance racing). It's **not Measure Protocol work**: keep it out of the Measure workspace, support pods and Drop, and don't use Measure accounts or credentials.

- **Stack:** one static file, `app/index.html` (vanilla HTML/CSS/JS, no framework, no build). Keep it that way unless there's a clear reason.
- **Users:** a race crew at the track, often **with no signal**. Offline-first matters. Big touch targets; it must be readable on an iPad on a pit-wall table and a phone in a gloved hand.
- **Rules are sourced, not guessed:** see `docs/rules-*.md`. If a rule changes, update the doc and the `SERIES` object together.
- **Verify every change:** `tests/e2e/run.sh` (headless Chrome, fake clock) must pass. For UI changes, screenshot both the phone (~500×900) and iPad landscape (1180×820) views. Headless Chrome needs to run outside the sandbox.
- **Deploy:** push to `main` and GitHub Actions publishes `app/`. That updates the live app the crew uses, so only push working, tested changes.
- **Data/terms:** live timing comes from Race Monitor (FloSports). **Don't scrape the public timing pages**; the terms forbid it. Use the API only with a key and permission (see roadmap).
- **Secrets:** a Supabase anon/publishable key may live in the app. **Never** commit a service-role key or a Race Monitor token. Those belong in Vercel environment variables.
