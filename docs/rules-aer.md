# American Endurance Racing (AER): rules PitDog enforces
Source: [AER Rulebook](https://race.americanenduranceracing.com/rulebook) §6–7. **Check the event information.**

| Rule | AER | In PitDog |
|---|---|---|
| Mandatory stops = **race minutes ÷ 80 − 1**, rounded up (840 → 10, 480 → 5, 400 → 4, 160 → 1) | §6.1 | `mandPer 80` (tested against all the rulebook's examples) |
| Each mandatory stop ≥ **3:00** pit-in → pit-out RFID; shorter stops don't count; time can't be combined | §6.2–6.4 | `minStop 3`, `minApplies all` |
| Stops beginning in the **last 10 min** don't count | §6.9 | `latest 10` |
| Missed stops: (10 min ÷ fastest lap) laps per stop | §6.6 | info |
| FCY: pit-out closed until the tail of the pack passes; 3:00+ stops under FCY count; races start under FCY | §5 | pits open; pit-out hold not modelled |
| Pit lane 35 mph | §7.1 | info |
| Driver stint limit | none in current rulebook | none (set your own) |
