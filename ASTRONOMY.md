# Solar data and verification

The calendar now calculates date-specific **geometric daylight**, rather than a cosine approximation tied to the ring angle.

## What the number means

For each date and location, calculate the total time the **center of the Sun is above the geometric horizon**, using a WGS84 observer at zero elevation. The date is a 24-hour **local mean solar day**: UTC midnight minus longitude ÷ 15 hours, to the following such midnight. This avoids political time zones and daylight saving time. It is a physical solar-date convention, not a published local civil sunrise/sunset timetable.

No atmospheric refraction, solar upper-limb adjustment, twilight, terrain, elevation or weather is included. This treats sunlight as the direction toward the Sun's center; it is not a solar irradiance/energy calculation or the first/last ray from the extended solar disc. Solar parallax, orbital motion, precession/nutation, light time and aberration are handled by the ephemeris library. The orbital position changes during each day; we search actual geometric horizon crossings rather than freezing declination at noon. Polar dates with zero, one, or two crossings are integrated within the date window.

Cities and device location now retain longitude internally while the interface continues to show latitude. Direct latitude entry uses longitude 0°, the reference meridian; default 40° N also uses 0°. Older saved city selections are matched to the local index to recover longitude when possible; any saved latitude without available longitude uses the reference meridian.

## Sources stored locally

- **Astronomy Engine 2.1.19**, pinned in `package-lock.json`: a truncated VSOP87 numerical model. Coefficients are included in the application and the standalone HTML; no runtime ephemeris API is required. Upstream targets position accuracy within one arcminute, not exact measured truth.
- **NASA/JPL Horizons DE431mx reference tables**, retrieved unmodified from the Astronomy Engine project's versioned validation archive. The original Horizons headers identify generation dates, reference ephemeris, observing site and atmospheric setting. The two stored tables are `references/astronomy/jpl-sun-1900-2100.txt` and `jpl-airless-sun-2019.txt`.
- **`references/astronomy/sources.json`** records archive commit, permanent source URLs, SHA-256 hashes and conventions. These are archived JPL results, not new direct downloads from the current JPL API. A direct API request was blocked by this cloud's network policy, so it was not used or represented as successful.
- **`references/astronomy/solar-2026.json`** records locally calculated daily solar coordinates and the year's four seasonal event times, with explicit model provenance. This is model output, not a JPL response. Regenerate with `node scripts/cache-solar-ephemeris.mjs 2026`.

The downloadable HTML includes the astronomical coefficients and required source licenses. Bulky reference tables and the annual verification snapshot stay in the repository instead of being shipped to every visitor. The city database is compressed and decoded only on the first place search, then reused in memory. Year/location daylight arrays are cached locally when browser storage is available, with a model-version key and a six-location limit. Other years are computed locally from the same coefficients; they do not depend on the 2026 table. No repeated remote lookup is required for the core calendar or city search.

Primary references: [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), [Astronomy Engine methods and validation](https://github.com/cosinekitty/astronomy), and the immutable table URLs in the source manifest.

## Reproducible verification

The separate [independent DE440s verification suite](verification/README.md)
adds a Skyfield oracle, worldwide duration grids, polar transition checks,
seasonal timing comparisons and machine-readable accuracy reports. The official
JPL kernel was supplied by the user following a direct download, validated as an
SPK kernel, and pinned by SHA-256. See `verification/reports/` for completed
comparisons and limitations. Missing pins or fixtures fail verification. The production build
does not invoke this suite, and a module-graph check verifies its exclusion.

Run `npm test`.

- Compare calculated astrometric solar coordinates with **7,305 JPL samples spanning 1900–2100**, at the original observing location. Observed maximum angular difference: **7.872 arcseconds**. Test tolerance is the library's stated one-arcminute target.
- Compare airless solar altitude with **2,881 minute-spaced JPL samples** near the March 2019 equinox at latitude/longitude zero. Observed maximum altitude difference: **1.726 arcseconds**.
- Interpolate the reference table's horizon crossings for March 19 and 20, 2019, and compare daily geometric durations. Differences are below **0.02 seconds in these two cases**. This is agreement with a rounded, minute-resolution archived table, **not a universal subsecond accuracy claim**.
- Check source-file hashes, date and month coverage, leap years, astronomical anchor mapping, hemispheres, polar cases, longitude handling and real offline city search.

Angular errors do not translate into a single worldwide timing error. Near a grazing polar horizon, a small angular difference can substantially move a crossing. Earth-rotation predictions and future event times also have uncertainty. The display rounds to minutes; neither the rounded display nor these comparisons guarantees minute accuracy at every polar boundary. This is a validated numerical astronomical calculation, not direct observation at every location.

## Independent DE440s results — 2026-10-30

The completed five-year full grid contains 210,105 date/location cases. Maximum
duration disagreement is **0.914 seconds at ordinary sampled locations** and
**1,116.914 seconds in the worst polar grazing case (89°S, 2100-03-18)**. For the
2026 full-year grid, the respective maxima are **0.382 seconds** and **108.715
seconds**. Nineteen daylight cases and four seasonal timestamps fail the
configured gates. These are numerical comparisons, not a universal accuracy
guarantee or atmospheric sunrise/sunset predictions. See the
[full report and limitations](verification/reports/2026-10-30-accuracy.md).

## Geometry

The ring still gives a quarter-circle to each season. The four anchors now use the calculated year's **actual astronomical event instants in UTC**, including fractional dates. Daily segment widths vary to preserve those anchor positions. Geometry and daylight are independent: daylight is calculated from the actual date, latitude and longitude, never from the decorative angle. Real orbital asymmetry is retained in the colors rather than forcing exact mirror symmetry.
