# World Racing League (WRL): rules PitDog enforces
Source: [WRL Rules 2022.2.1](https://static1.squarespace.com/static/611fe48f61d6702c42301722/t/624778f387bf2c0dcdff5442/1648851187807/WRL-RULES-2022.2.1.docx.pdf), the latest public version found. **Check current WRL event info.**

| Rule | In PitDog |
|---|---|
| Driving stints **4 h max**, minimum **1 h break** between stints; officials watch for fatigue | `maxStint 240`, `rest 60` |
| Fuelling on pit road during hot track only; engine off first; driver change allowed during fuelling | pit-screen reminder |
| Max **5 team members over the wall**; **one jug over the wall at a time**; no pressurised systems; drip pan or mat | pit-screen reminder |
| Non-compliant jugs: 1 lap per fuel stop; fuelling/pit-road violations: 1 lap | info |
| Checkered when time expires | race clock to scheduled end |
| Minimum stop time | none stated → `minStop 0` (the planner uses real fill time) |
