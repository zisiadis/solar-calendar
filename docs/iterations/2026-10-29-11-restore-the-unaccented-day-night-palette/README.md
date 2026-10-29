# Restore the unaccented day-night palette

Rolled back the four turning-point color inflections, restoring the preceding blue-to-paper-to-yellow daylight palette. Removed event-specific color emphasis while preserving the experiment in the archive. Geometry, data, labels and controls are unchanged.

Captured for 2026-10-29, at reference latitude **40°** (longitude 0°). The calendar date is fixed so these views can be compared without changes in date, hover, selection or location. Each PNG shows the **whole page**.

| View | Desktop | Mobile |
| --- | --- | --- |
| Day lengths | [Screenshot](01-day-lengths-desktop.png) | [Screenshot](01-day-lengths-mobile.png) |
| Day lengths + 12-hour line | [Screenshot](02-day-lengths-reference-desktop.png) | [Screenshot](02-day-lengths-reference-mobile.png) |

- **Day lengths:** The default and only visualization: radial lengths proportional to daylight; reference line off.
- **Day lengths + 12-hour line:** Proportional day lengths with the optional reference circle and northeast 12 h label.

desktop: 1440 × 1000; mobile: 390 × 844. Images use native 1× pixels and include any page overflow. No location permissions or external data requests are needed.

The manifest records image dimensions, toggle states, browser version and the exported HTML's SHA-256 hash.

Captures happen automatically after changed visual exports. To explicitly record a version, run `npm run capture:iteration`. Each capture creates a new dated, numbered folder and keeps previous captures intact.
