# A mobile-first wheel experience

Enlarged the mobile wheel and labels, moved live date and daylight into its center, added finger dragging and precise day controls, consolidated location into a keyboard-aware bottom sheet, and introduced a phone landscape layout. Desktop styling and solar calculations are preserved.

Captured for 2026-10-29, at reference latitude **40°** (longitude 0°). The calendar date is fixed so these views can be compared without changes in date, hover, selection or location. Each PNG shows the **whole page**.

| View | Desktop | Mobile |
| --- | --- | --- |
| Day lengths | [Screenshot](01-day-lengths-desktop.png) | [Screenshot](01-day-lengths-mobile.png) |
| Day lengths + 12-hour line | [Screenshot](02-day-lengths-reference-desktop.png) | [Screenshot](02-day-lengths-reference-mobile.png) |
| Selected day | [Screenshot](03-selected-day-desktop.png) | [Screenshot](03-selected-day-mobile.png) |
| Place search | [Screenshot](04-place-search-desktop.png) | [Screenshot](04-place-search-mobile.png) |

- **Day lengths:** The default and only visualization: radial lengths proportional to daylight; reference line off.
- **Day lengths + 12-hour line:** Proportional day lengths with the optional reference circle and northeast 12 h label.
- **Selected day:** An explicitly selected date with the mobile center readout and day navigation, or desktop details.
- **Place search:** Location search open: mobile bottom sheet or desktop popup.

desktop: 1440 × 1000; mobile: 390 × 844; small-mobile: 360 × 740; mobile-landscape: 844 × 390. Images use native 1× pixels and include any page overflow. No location permissions or external data requests are needed.

The manifest records image dimensions, toggle states, browser version and the exported HTML's SHA-256 hash.

Captures happen automatically after changed visual exports. To explicitly record a version, run `npm run capture:iteration`. Each capture creates a new dated, numbered folder and keeps previous captures intact.
