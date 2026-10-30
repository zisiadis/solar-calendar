# Independent solar verification

This directory is development tooling only. Nothing here is imported by the
website, copied into public assets, or invoked by `npm run build` or the HTML
export. The browser continues to use Astronomy Engine 2.1.19.

## Current status

The user supplied `de440s.bsp` after reporting a direct official JPL download on
2026-10-30. Its internal DE440 header, SPK structure and coverage were checked;
the SHA-256 is recorded in `source.json`. The managed environment did not
independently download it.

Both comparisons have completed: **729 compact cases and 210,105 full-grid cases**.
The model **fails** the configured accuracy gates. The full ordinary-location
maximum difference is 0.914 seconds; the polar maximum is 1,116.914 seconds in a
year-2100 grazing case. In the full-year 2026 grid, the corresponding maxima are
0.382 seconds and 108.715 seconds. See the
[readable accuracy report](reports/2026-10-30-accuracy.md) and complete JSON reports
for the 19 daylight-case failures and four seasonal-timestamp failures. Passing
the verifier's algorithm tests does not imply that the model passed its accuracy
comparison.

## Setup and first official reference download

Use Python 3.12 and Node 22 from the repository root:

```sh
python3 -m venv verification/.venv
verification/.venv/bin/pip install -r verification/requirements.txt
verification/.venv/bin/python verification/fetch_reference.py --initialize
verification/.venv/bin/python verification/verify.py --generate
```

The source download must come from the official JPL URL in `source.json`. The
fetcher checks the SPK signature and size, records retrieval time and SHA-256,
and refuses later changes. Review and commit the populated `source.json`,
`data/compact.json`, and `data/compact.sha256`. Keep the ~32MB BSP out of Git.
Subsequent `fetch_reference.py` calls require that committed checksum. It never
silently repins a changed file. Downloads and generation are explicit operations;
ordinary comparison is offline and does not need the BSP.

If the official file was downloaded separately, copy it to
`verification/data/de440s.bsp`, then run `fetch_reference.py` to check it against
the recorded checksum without a network request. Do not change the pin to accept
a different file without investigating its source.

```sh
npm run verify:solar                  # offline compact reference comparison
npm run verify:solar:tools            # verifier algorithm and runtime separation checks
verification/.venv/bin/python verification/fetch_reference.py
OPENBLAS_NUM_THREADS=1 verification/.venv/bin/python verification/verify.py --profile full --generate
```

`reports/local-compact.json` and `reports/local-full.json` contain maximum,
median and 95th-percentile duration differences, separate ordinary/polar
statistics, **every rounded-minute disagreement**, daylight-state disagreements,
seasonal timing differences and the worst cases. Local reports are ignored;
review and copy completed reports to dated tracked filenames when releasing.
CI uploads reports even when comparison fails. Missing reference data is a failed
verification job, never a skipped successful check.

## Scientific conventions and coverage

Skyfield's independent implementation uses JPL DE440s, apparent topocentric Sun
coordinates, WGS84 observers at 0m and `altaz(temperature_C=None)` (no refraction).
The Sun's center must be above 0°. No terrain, solar radius, twilight or weather
correction is used. Date windows start at UTC midnight minus longitude/360 days
and contain exactly 86,400 elapsed seconds. These are local mean solar dates,
not civil sunrise/sunset dates.

The compact grid includes five years (1900, 2000, 2024, 2026, 2100), both poles,
both polar circles, both hemispheres, equator, date line, seasonal dates and leap
days. The full grid covers every day in those years at 23 latitudes and five
longitudes, with denser latitude spacing around the polar circles. Thus it
includes all transition days on that grid. It is a sampled validation, not proof
for every coordinate or year. DE440s coverage does not expand the tested range.

The oracle finds daily altitude extrema, partitions into monotonic intervals,
bisects horizon roots to well below one millisecond, and integrates illuminated
intervals. This handles zero, one and two crossings, including very short grazing
excursions that regular boolean sampling could miss. Numerical root precision is
not a claim of physical timing accuracy. Exact tangent contacts have zero duration.

Pinned Skyfield includes IERS/leap-second and ΔT data. `time-data.json` records
their hashes and the Python package versions; fixture provenance records those
same inputs, generator/config hashes, the DE440s checksum and generation date.
No live Earth-rotation refresh occurs. Historical ΔT estimates and future
Earth-rotation/leap-second predictions remain uncertain. Polar motion is not
loaded; the two engines' Earth-rotation models can differ, especially far from
the present. These differences belong in the observed errors, not hidden corrections.

Ordinary cases fail above 30 seconds. Polar cases (|latitude| ≥66° or an altitude
extremum within 0.05° of the horizon) are reported separately and fail above a
provisional 180 seconds. **Any daylight-state disagreement fails**, including at
the poles; seasonal events fail above 120 seconds. These are investigation gates,
not achieved accuracy claims. Rounded-minute differences are all recorded even
when below a gate. No exceptions are automatically accepted. Review failures
before release; revise criteria only with documented evidence.

## Automation and release gate

GitHub Actions runs algorithm checks, existing tests, the compact comparison and
a production module-graph check on pull requests and pushes. Monthly/manual runs
also regenerate the full comparison. Configure the compact job as a required
branch check in GitHub; repository files cannot change branch protection. Until
the official reference pin and compact fixtures are committed, that job blocks.
The full sweep is deliberately a separate long-running job, never a build step.
It uses two independent site/year worker processes by default; set
`SOLAR_VERIFY_WORKERS` to control concurrency without changing the calculation.

References: [JPL DE440s distribution](https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp),
[Skyfield planetary ephemerides](https://rhodesmill.org/skyfield/planets.html),
[Skyfield time standards](https://rhodesmill.org/skyfield/time.html).
