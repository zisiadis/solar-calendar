# The Solar Year

A responsive React/TypeScript solar calendar rendered as native, interactive SVG.

```sh
npm ci
npm run dev
```

Requires Node.js 22+. `npm test` runs the calendar, location and archived NASA/JPL reference tests. `npm run export:html` builds and refreshes the standalone `solar-year.html`, including compressed city search, astronomical coefficients and source licenses. City data is decoded and indexed only on first search, then reused; bulky validation tables stay outside the delivered page.

Browser location is requested on arrival; permission and secure-context requirements are controlled by the browser. If automatic detection fails, the last saved/default location remains without an intrusive notice. **Use my location** retries explicitly. **Change place** searches 135,233 bundled cities offline or accepts a signed latitude/N/S coordinate. Place selection wins over any late automatic location callback. Browser storage is optional.

Tab enters the day ring; arrows navigate, Enter/Space select, Escape clears. The outer dot marks today's date. Four hairline ticks mark astronomical seasonal anchors. Southern seasonal labels reverse; the equator uses neutral event names. Print styles isolate the vector artwork.

**[Astronomical definition, source provenance, verification and accuracy limits](ASTRONOMY.md)**

Independent Skyfield/JPL DE440s verification tooling, worldwide/polar coverage,
and CI instructions are in [verification/README.md](verification/README.md).
The DE440s kernel supplied after a direct user download is pinned by checksum.
Completed comparisons and their accuracy limits are recorded in the
[accuracy report](verification/reports/2026-10-30-accuracy.md). This tooling never runs in the website.

Core modules: `calendar.ts` maps actual dates to SVG angles; `astronomy.ts` calculates geometric daylight; `daylight.ts` maps duration to color; `location.ts` searches the local city index; `geometry.ts` constructs smooth annular segments.

Rebuild the committed city index only when deliberately refreshing its pinned source: `node scripts/build-city-index.mjs`. Source credits are in `CITY-DATA-LICENSE.txt` and `ASTRONOMY-LICENSE.txt`.

## Radial daylight visualization

Radial day lengths are the only visualization. The inner radius stays at 281 SVG units; each hour adds exactly 6 units to the outer radius. Zero hours adds no visible length, 12 hours reaches radius 353, and 24 hours reaches radius 425. The left-aligned **12-hour line** switch below the daylight readout starts off and controls the reference circle with its northeast **12 h** label. Markers follow the contour. Seasonal labels use balanced optical spacing and clear the optional reference circle. Zero-light dates retain keyboard focus and an invisible pointer target without inventing nonzero bar length.

## Automatic visual history

Every completed visual change is captured automatically as part of `npm run export:html`. Project instructions in [AGENTS.md](AGENTS.md) require this workflow before finishing a visual change, with a meaningful title and summary. No user reminder or manual screenshot step is needed.

The archive lives in `docs/iterations/`, with a dated, numbered subfolder for each change. Every subfolder contains both full-page reference-line states at desktop and mobile sizes, change notes, and a manifest. An offline gallery at `docs/iterations/index.html` presents the whole history. Old captures are preserved. Re-exporting unchanged visual inputs skips duplicate screenshots.

`visual-history.zip` is refreshed automatically and includes the complete archive and gallery. In this workspace it is also made available at `/workspace/Solar-Year-Visual-History.zip`. Unzip and open the archive's `index.html` to browse it.

Capture settings are fixed in `scripts/visual-history-settings.json` for comparable images. To explicitly capture an unchanged version, use `npm run capture:iteration`. To rebuild the gallery/ZIP alone, use `npm run history:package`.

The production `npm run build` and standalone website contain no screenshot archive, gallery, capture code or history interface. These are project-only files. Playwright and the ZIP utility are development dependencies. Install a Playwright Chromium browser (`npx playwright install chromium`) if system Chromium is unavailable; `SOLAR_BROWSER_PATH` selects an existing browser executable.

## Mobile wheel

On phones, the wheel fills a tighter frame with legible month/season labels and
the live date/daylight readout below the wheel and above location. Drag the broad ring area to explore dates, even
where daylight bars have zero length. Release to retain the date; keyboard arrow
keys remain available for precise navigation. Mobile day-navigation buttons,
equinox text and the exploration hint are omitted. Pinch zoom remains available.
Location is a compact city/latitude control opening a bottom sheet with Close,
local city search, device location, focus management and visual-viewport keyboard
positioning. Buttons have at least 44 px height. Narrow screens and touch phone
landscape receive separate layouts; ordinary desktop styling is preserved.

`npm run check:mobile` checks native touch events, zero-light and polar cases,
day navigation, place selection, sheet focus/keyboard bounds, and layout at
320, 360, 390, 430 px portrait widths, phone landscape, and desktop. It uses
Playwright Chromium; `SOLAR_BROWSER_PATH` can select an installed browser. It
writes diagnostic images to a temporary directory outside the website.

Visual captures now include default, 12-hour-line, selected-day and place-search
states on desktop, reference mobile, small mobile and phone landscape. Existing
reference date/location and original desktop/mobile viewports are preserved.
