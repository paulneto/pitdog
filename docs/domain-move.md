# Moving to pitdogracecontrol.com
*28 Nov 2026. The domain is bought (Porkbun, DNS on Porkbun). The setup is planned for the week of 30 Nov.
Nobody relies on the old github.io address yet, so this is a straight switch with no data migration.*

1. **DNS at Porkbun.** Delete the parking records. Add an ALIAS record `@` → `paulneto.github.io` (or GitHub's
   four A records `185.199.108.153`, `.109`, `.110`, `.111`, plus the AAAA records), and a CNAME record `www` → `paulneto.github.io`.
2. **GitHub.** Verify the domain under account Settings → Pages, so no one else can claim it. Then set the
   custom domain under this repo's Settings → Pages, wait for the certificate, and tick Enforce HTTPS.
   `paulneto.github.io/pitdog` then redirects to the new address.
3. **Sign-in.** Add the new address in two places:
   - Supabase → Auth → URL configuration: add `https://pitdogracecontrol.com/**` to the redirect URLs and make it the site URL.
   - Google Cloud → OAuth client: add `https://pitdogracecontrol.com` to the authorized JavaScript origins.
4. **Repo.** Update the address in `README.md` and `supabase/README.md`.
5. **Check.** The app loads, Google sign-in works, and the admin console works at `/admin.html`.
   Re-add the home-screen icon from the new address. Test devices start empty there; sign in to pull the team.
