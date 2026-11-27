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
5. ✅ **Phone hierarchy is inverted.** The race clock is the biggest thing, but the crew's real question is "when is the car in, and who's next?" The next-stop countdown should be the hero; the race clock can shrink to the top bar. *(Recommended next.)*
6. ✅ **Too many words at speed.** Alerts are sentences ("Gear up, wristband on, out in 10:49"). At a glance, people read a shape, a colour and a number: "LUC · 10:49 · gear up". Banners need an icon, a name and a number, and no prose. *(Recommended.)*
7. ✅ **Equal-weight tiles.** Three identical stat boxes under the driver (next stop / fuel / laps) compete. One number matters per state: next stop on track, the timer in the pits, fuel when it's low. *(Recommended.)*
8. ✅ **Fuel jug chips are small for gloves:** 9 half-jug buttons in a row. Use a stepper (− 2 jugs +) with big targets, defaulting to the plan. *(Recommended.)*
9. ✅ **The command center alerts panel is often empty** ("All clear"). Fold alerts into the flag bar and give that space to a lap/pace trace once live timing exists. *(Later.)*
10. ✅ **Emoji icons** (tab bar, conditions, log) render differently per device and look toy-like next to the data. Replace them with a small consistent icon set. *(Later.)*
11. ✅ **The simulator bar** (purple stripes) is visually loud but carries little. Make it a slim pill with the speed control. *(Later.)*

## Done 27 Nov 2026 (second pass)
- **Hero = next stop.** The phone race tab leads with the next-stop countdown (amber in the last 3 min, red with a real minus when overdue) and who goes out next. The race clock moved to the top bar; the series, wall time and progress are a slim card below.
- **One status strip.** The most urgent alert is one big strip (icon + a few words + a number); the rest are one-line chips. Rank: red flag › BOX › "pit now under yellow" › yellow › warnings › info. The command center uses the same short texts and ranking.
- **Fuel only shouts when it matters.** Fuel and stint laps are quiet chips; fuel turns amber when range is under 10 min or short of the planned stop, red on reserve.
- **Glove-sized fuel stepper** (− / 2 jugs / +, defaulting to the plan) on the phone and the command center.
- **Primary buttons are neutral** (ink on paper in every skin); red is for PIT IN and danger only.
- **Icons:** one inline-SVG set (stroke = currentColor) replaces every emoji: tab bar, stop types, log, alerts, conditions.
- **Type:** Inter (OFL), bundled and precached; tabular digits on every number.
- **Command center alerts live in the flag bar.** The most urgent non-flag alert sits beside the flag (action first, so a truncated line still says what to do), with "+N more". The freed panel is **Next stops**: stop number, time, countdown, fuel to add and who goes out, with any extra alerts above it. A lap/pace trace can take this space once live timing exists.
- **No hard-coded theme colours left.** Status tints derive from each skin's own status colours (`color-mix` on `--green/--amber/--red/--blue`), ink on coloured fills uses `--on-fill` / `--on-yellow`, and the sheet backdrop is `--scrim`. Only shadows, the print sheet and the (literally black-and-white) checkered flag use fixed colours.
- **Simulator HUD is a slim pill:** SIM · play/pause · one speed button (1×/10×/30×/60×) · auto-crew · truth readout · End. Its purple lives in `--sim*` tokens.

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

**Type:** Inter is bundled in `app/fonts/` (OFL) and precached by the service worker, so it renders the same on every device with no signal. F1 skins italicise driver names only.

Everything visual runs on tokens (`--bg`, `--cc-*`, `--font-*`, `--r-*`, `--livery`). A new skin is one `[data-skin="x"]{…}` block plus an entry in `SKINS` and `SKIN_BAR`.
