# Automatic visual history baseline

Established the automatic archive workflow. No website design change; this baseline preserves all three toggle states on desktop and mobile for future comparisons.

Captured for 2026-10-29, at the default latitude **40° N** (longitude 0°). The calendar date is fixed so these views can be compared without changes in date, hover, selection or location. Each PNG shows the **whole page**.

| View | Desktop | Mobile |
| --- | --- | --- |
| Classic ring | [Screenshot](01-classic-ring-desktop.png) | [Screenshot](01-classic-ring-mobile.png) |
| Day lengths | [Screenshot](02-day-lengths-desktop.png) | [Screenshot](02-day-lengths-mobile.png) |
| Day lengths + 12-hour line | [Screenshot](03-day-lengths-reference-desktop.png) | [Screenshot](03-day-lengths-reference-mobile.png) |

- **Classic ring:** Equal-depth daily segments; no reference circle.
- **Day lengths:** Radial lengths proportional to daylight; reference circle off.
- **Day lengths + 12-hour line:** Proportional day lengths with the thin reference circle and northeast 12 h label.

Desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844. Images use native 1× pixels and include any page overflow. No location permissions or external data requests are needed.

The manifest records image dimensions, toggle states, browser version and the exported HTML's SHA-256 hash.

Captures happen automatically after changed visual exports. To explicitly record a version, run `npm run capture:iteration`. Each capture creates a new dated, numbered folder and keeps previous captures intact.
