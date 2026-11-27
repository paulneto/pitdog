# PitDog design review (27 Nov 2026)

## Who it's for and what it must do
A crew reading a screen at arm's length, under time pressure, in glare or at night, sometimes with gloves on. The job: **know when the car is coming in, who's going out, and how much fuel to pour, without reading a sentence.**

## What works
- The one-big-button model (GREEN → PIT IN → PIT OUT) is right. It's the strongest decision in the app.
- The command center layout (clock · car · crew / fuel · alerts / timeline) maps to how a pit wall actually thinks.
- The pit-stop ring timer turning green at the minimum is instantly readable.

## What doesn't (fixed ones marked ✅)
1. ✅ **Dark-only.** In direct sun a dark UI is close to unreadable. Added the Sunlight skin.
2. ✅ **Red meant four things:** brand, PIT IN, danger alerts and Driver A's colour. Brand is now its own token. New drivers get colours that don't collide with status colours (existing drivers keep theirs; change them in Team → person).
3. ✅ **Alarm fatigue:** the yellow flag bar, ON DECK tag and in-pit LED all pulsed continuously. Now only BOX and RED pulse, so pulsing means "act now".
4. ✅ **Generic look:** near-black with one neon accent, mono labels and identical rounded cards everywhere. The three new skins come from the subject itself: the timing pylon, the engineer's paper sheet, and daylight.
5. **Phone hierarchy is inverted.** The race clock is the biggest thing, but the crew's real question is "when is the car in, and who's next?" The next-stop countdown should be the hero; the race clock can shrink to the top bar. *(Recommended next.)*
6. **Too many words at speed.** Alerts are sentences ("Gear up, wristband on, out in 10:49"). At a glance, people read a shape, a colour and a number: "LUC · 10:49 · gear up". Banners need an icon, a name and a number, and no prose. *(Recommended.)*
7. **Equal-weight tiles.** Three identical stat boxes under the driver (next stop / fuel / laps) compete. One number matters per state: next stop on track, the timer in the pits, fuel when it's low. *(Recommended.)*
8. **Fuel jug chips are small for gloves:** 9 half-jug buttons in a row. Use a stepper (− 2 jugs +) with big targets, defaulting to the plan. *(Recommended.)*
9. **The command center alerts panel is often empty** ("All clear"). Fold alerts into the flag bar and give that space to a lap/pace trace once live timing exists. *(Later.)*
10. **Emoji icons** (tab bar, conditions, log) render differently per device and look toy-like next to the data. Replace them with a small consistent icon set. *(Later.)*
11. **The simulator bar** (purple stripes) is visually loud but carries little. Make it a slim pill with the speed control. *(Later.)*

## Skins (Log → Look; SKIN button on the command center)
| Skin | Source | Character |
|---|---|---|
| Night race | floodlit pit lane | blue-black, teal instruments (the default) |
| Sunlight | midday glare | cool white, black ink, saturated status colours, heavy digits |
| Rosso | Ferrari | racing red chrome, giallo headings, black |
| Papaya | McLaren | papaya on anthracite, blue bars |
| Silver Arrow | Mercedes | black and silver, teal accents |
| Midnight | Red Bull | navy, red corners, yellow headings |
| Racing Green | Aston Martin | British racing green, lime accents |
| Grove Blue | Williams | navy, Williams blue, white |

The F1 skins are colour-inspired only (no team logos or marks). Team colours go on chrome: the brand, panel corners, headings, progress bars and a livery stripe under the top bar. **Status colours (red/amber/green/yellow) are identical across the F1 skins**, so red still only means danger even in Rosso. Timing tower and Stint sheet were retired on 27 Nov 2026; a device that had one saved falls back to Night.

**Type:** Barlow (UI) and Barlow Condensed (numbers, headings) are bundled in `app/fonts/` (OFL) and precached by the service worker, so they render the same on every device with no signal.

Everything visual runs on tokens (`--bg`, `--cc-*`, `--font-*`, `--r-*`, `--livery`). A new skin is one `[data-skin="x"]{…}` block plus an entry in `SKINS` and `SKIN_BAR`.
