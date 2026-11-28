# Moving to pitdogracecontrol.com
*28 Nov 2026. The domain is bought (Porkbun, DNS on Porkbun). The setup is planned for the week of 30 Nov.*

## Why not just switch GitHub Pages to the domain?
A browser keeps PitDog's data per web address, so phones that used `paulneto.github.io/pitdog` would open
the new address empty. If the domain is set on this repo, GitHub immediately redirects the old address, and
the old copy of the app never runs again to hand its data over. So **both addresses must serve PitDog for a
while**, and the old one offers **Move this device**.

## What's already in the app
- **The banner** (Home, Team → Data, the ☰ menu) shows only on `*.github.io`, and only once
  `https://pitdogracecontrol.com/move.json` answers `{"pitdog":1}`. It stays hidden until the new address is
  really serving PitDog; Porkbun's parking page doesn't count.
- **Move this device** packs the whole local database, plus device id, sound, view and look, into the link's
  `#move=` fragment, gzipped. The fragment is never sent to a server. A team with a race underway is about 1 KB.
  The new address takes it in. If the device already has its own team, it asks first and keeps a backup.
- **Copy move link** covers iPhone home-screen icons, which keep their own data. Paste the link on the new
  address's first screen ("Used PitDog at the old address?") or under Team → Data → Bring data from the old address.
- Tested by `tests/e2e/scenarios/move.js`.

## Setup steps (next week)
1. **Hosting for the new address.** Create a second repo, `paulneto/pitdogracecontrol`, with Pages and the custom
   domain `pitdogracecontrol.com`. This repo's workflow deploys `app/` to both places after the tests pass.
   It needs one fine-grained token with write access to the new repo, stored as a secret.
   GitHub Pages sends `Access-Control-Allow-Origin: *`, which the banner's `move.json` check relies on.
   (Vercel or Cloudflare Pages would also work, but the `move.json` check then needs a CORS header.)
2. **DNS at Porkbun.** Delete the parking records. Add ALIAS `@` → `paulneto.github.io` (or GitHub's four A
   records `185.199.108.153`, `.109`, `.110`, `.111` and the AAAA records), plus CNAME `www` → `paulneto.github.io`.
3. **GitHub.** Verify the domain under account Settings → Pages, so no one else can claim it. Then, in the new
   repo, set the custom domain, wait for the certificate, and tick Enforce HTTPS.
4. **Sign-in.** Add the new address in two places:
   - Supabase → Auth → URL configuration: add `https://pitdogracecontrol.com/**` to the redirect URLs and make it the site URL.
   - Google Cloud → OAuth client: add `https://pitdogracecontrol.com` to the authorized JavaScript origins.
5. **Check:** the new address loads, Google sign-in works there, the banner appears on the old address, and a
   move with real data works on an iPhone and on the iPad.
6. **Later**, once every crew device has moved: point the old address at the new one (a small redirect page) and
   update the README and `supabase/README.md`.
