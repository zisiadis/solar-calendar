"""Independent offline DE440s daylight oracle and browser-model comparison."""
import argparse
import calendar
import hashlib
import importlib.metadata
import json
import subprocess
import os
from concurrent.futures import ProcessPoolExecutor
from itertools import groupby
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
from skyfield import almanac
from skyfield.api import load, load_file, wgs84
from skyfield.searchlib import find_maxima
import skyfield

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / 'config.json').read_text())
DAY = 86400


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cases(profile):
    grid = CONFIG[profile]
    for year in grid['years']:
        if profile == 'full':
            dates = [datetime(year, 1, 1) + timedelta(days=i) for i in range(366 if calendar.isleap(year) else 365)]
        else:
            dates = [datetime.fromisoformat(f'{year}-{date}') for date in grid['dates']]
            if calendar.isleap(year):
                dates.append(datetime(year, 2, 29))
        for date in dates:
            for latitude in grid['latitudes']:
                for longitude in grid['longitudes']:
                    yield dict(year=year, month=date.month, day=date.day, latitude=latitude, longitude=longitude)


def integrate(altitude, knots, duration=DAY):
    """Monotonic partitions bounded by extrema catch even two very close roots.

    altitude accepts vector seconds from day start. No sunrise/refraction helper.
    """
    knots = np.array(sorted(set([0., float(duration), *knots])))
    heights = altitude(knots)
    brackets = [(a, b) for a, b, ha, hb in zip(knots[:-1], knots[1:], heights[:-1], heights[1:]) if ha * hb < 0]
    roots = list(knots[heights == 0])
    if brackets:
        lo, hi = np.array(brackets).T
        positive = altitude(lo) > 0
        for _ in range(35):
            mid = (lo + hi) / 2
            same = (altitude(mid) > 0) == positive
            lo = np.where(same, mid, lo)
            hi = np.where(same, hi, mid)
        roots.extend(((lo + hi) / 2).tolist())
    edges = sorted(set([0., float(duration), *roots]))
    midpoints = np.array([(a + b) / 2 for a, b in zip(edges[:-1], edges[1:])])
    lit = sum(b - a for a, b, up in zip(edges[:-1], edges[1:], altitude(midpoints) > 0) if up)
    return float(lit), [float(t) for t in roots if 0 < t < duration]


def time_sources():
    # Pinned Skyfield release bundles leap seconds, IERS observations and ΔT
    # extrapolation tables. Builtin=True prevents implicit network refreshes.
    data = Path(skyfield.__file__).parent / 'data'
    return {p.name: sha(p) for p in sorted(data.glob('*.npz')) + sorted(data.glob('*.npy'))}


def provenance():
    result = {
        'source': json.loads((ROOT / 'source.json').read_text()),
        'packages': {p: importlib.metadata.version(p) for p in ['skyfield', 'numpy', 'jplephem', 'sgp4', 'certifi']},
        'timeData': time_sources(),
        'configSha256': sha(ROOT / 'config.json'),
        'generatorSha256': sha(ROOT / 'verify.py'),
    }
    pinned = json.loads((ROOT / 'time-data.json').read_text())
    if any(result[key] != pinned[key] for key in ['packages', 'timeData']):
        raise ValueError('Time-data/package pins differ; explicitly review a verification dependency update')
    return result


def reference_day(case, ts, eph):
    start = datetime(case['year'], case['month'], case['day'], tzinfo=timezone.utc) - timedelta(seconds=case['longitude'] * 240)
    t0 = ts.from_datetime(start)
    site = eph['earth'] + wgs84.latlon(case['latitude'], case['longitude'], elevation_m=0)

    def altitude_tt(t):
        return site.at(t).observe(eph['sun']).apparent().altaz(temperature_C=None)[0].degrees

    def altitude(seconds):
        return altitude_tt(ts.tt_jd(t0.tt + np.asarray(seconds) / DAY))

    # Search extrema with padding, then partition the actual day. This finds
    # grazing excursions that a boolean sunrise search can miss between samples.
    extrema = []
    for sign in [1, -1]:
        def f(t):
            return sign * altitude_tt(t)
        f.step_days = 0.1
        times, _ = find_maxima(ts.tt_jd(t0.tt - .15), ts.tt_jd(t0.tt + 1.15), f, epsilon=0.01 / DAY)
        extrema.extend(float((tt - t0.tt) * DAY) for tt in times.tt if t0.tt < tt < t0.tt + 1)
    duration, crossings = integrate(altitude, extrema)
    grazing = bool(extrema) and float(np.min(np.abs(altitude(np.array(extrema))))) < CONFIG['grazingExtremumDegrees']
    return dict(**case, seconds=duration, crossings=crossings, grazing=grazing)


def reference_year(group, ts, eph):
    """Vectorize a full site/year so the broad sweep avoids per-day ephemeris calls."""
    first = group[0]
    start = datetime(first['year'], 1, 1, tzinfo=timezone.utc) - timedelta(seconds=first['longitude'] * 240)
    t0 = ts.from_datetime(start)
    count = len(group)
    duration = count * DAY
    site = eph['earth'] + wgs84.latlon(first['latitude'], first['longitude'], elevation_m=0)

    def altitude_tt(t):
        return site.at(t).observe(eph['sun']).apparent().altaz(temperature_C=None)[0].degrees

    def altitude(seconds):
        return altitude_tt(ts.tt_jd(t0.tt + np.asarray(seconds) / DAY))

    extrema = []
    for sign in [1, -1]:
        def f(t):
            return sign * altitude_tt(t)
        f.step_days = .1
        times, _ = find_maxima(ts.tt_jd(t0.tt - .15), ts.tt_jd(t0.tt + count + .15), f, epsilon=.01 / DAY)
        extrema.extend(float((tt - t0.tt) * DAY) for tt in times.tt if t0.tt < tt < t0.tt + count)
    _, roots = integrate(altitude, extrema, duration)
    edges = np.array(sorted(set([*(i * DAY for i in range(count + 1)), *roots])))
    mids = (edges[1:] + edges[:-1]) / 2
    day_ids = (mids / DAY).astype(int)
    light = np.bincount(day_ids, weights=np.diff(edges) * (altitude(mids) > 0), minlength=count)
    sensitive = set()
    if extrema:
        values = altitude(np.array(extrema))
        sensitive = {int(t / DAY) for t, value in zip(extrema, values) if abs(value) < CONFIG['grazingExtremumDegrees']}
    return [dict(**case, seconds=float(light[i]), crossings=[t - i * DAY for t in roots if i * DAY < t < (i + 1) * DAY], grazing=i in sensitive) for i, case in enumerate(group)]


def reference_year_worker(group):
    # Independent site/year batches can run concurrently without changing the
    # numerical method or fixture ordering. Each worker opens its own SPK map.
    source = json.loads((ROOT / 'source.json').read_text())
    eph = load_file(str(ROOT / 'data' / source['file']))
    try:
        return reference_year(group, load.timescale(builtin=True), eph)
    finally:
        eph.close()


def generate(profile, path):
    source = json.loads((ROOT / 'source.json').read_text())
    ephemeris = ROOT / 'data' / source['file']
    if source['status'] != 'pinned' or not source['sha256']:
        raise ValueError('Official DE440s is unpinned. See verification/README.md; generation cannot pass.')
    if sha(ephemeris) != source['sha256']:
        raise ValueError('DE440s SHA-256 mismatch')
    ts = load.timescale(builtin=True)
    eph = load_file(str(ephemeris))
    try:
        rows = []
        planned = list(cases(profile))
        if profile == 'full':
            key = lambda c: (c['year'], c['latitude'], c['longitude'])
            calculated = {}
            groups = [list(group) for _, group in groupby(sorted(planned, key=key), key=key)]
            with ProcessPoolExecutor(max_workers=int(os.environ.get('SOLAR_VERIFY_WORKERS', '2'))) as pool:
                for batch in pool.map(reference_year_worker, groups):
                    for row in batch:
                        calculated[tuple(row[k] for k in ['year', 'month', 'day', 'latitude', 'longitude'])] = row
                    print(f'Reference days: {len(calculated)}', flush=True)
            rows = [calculated[tuple(c.values())] for c in planned]
        else:
            for index, case in enumerate(planned):
                rows.append(reference_day(case, ts, eph))
                if index % 100 == 0:
                    print(f'Reference days: {index + 1}', flush=True)
        seasons = {}
        for year in CONFIG[profile]['years']:
            times, ids = almanac.find_discrete(ts.utc(year, 1, 1), ts.utc(year + 1, 1, 1), almanac.seasons(eph))
            if list(ids) != [0, 1, 2, 3]:
                raise ValueError('Incomplete seasonal event coverage')
            seasons[year] = [t.utc_datetime().isoformat() for t in times]
        fixture = dict(schemaVersion=1, profile=profile, generatedAt=datetime.now(timezone.utc).isoformat(), provenance=provenance(), days=rows, seasons=seasons)
        path.write_text(json.dumps(fixture, separators=(',', ':')) + '\n')
        path.with_suffix('.sha256').write_text(sha(path) + '\n')
    finally:
        eph.close()


def state(seconds):
    return 'dark' if seconds <= .001 else 'light' if seconds >= DAY - .001 else 'crossing'


def compare(fixture):
    if fixture.get('schemaVersion') != 1:
        raise ValueError('Unsupported fixture schema')
    source = json.loads((ROOT / 'source.json').read_text())
    if source['status'] != 'pinned' or not source['sha256']:
        raise ValueError('Official DE440s reference is not pinned')
    expected = list(cases(fixture['profile']))
    actual_cases = [{k: row[k] for k in ['year', 'month', 'day', 'latitude', 'longitude']} for row in fixture['days']]
    if expected != actual_cases:
        raise ValueError('Missing, reordered, or unexpected reference cases')
    if fixture['provenance'] != provenance():
        raise ValueError('Reference provenance differs: regenerate and review fixtures')
    if set(fixture['seasons']) != {str(y) for y in CONFIG[fixture['profile']]['years']} or any(len(events) != 4 for events in fixture['seasons'].values()):
        raise ValueError('Incomplete seasonal reference coverage')
    if any(not np.isfinite(row['seconds']) or not 0 <= row['seconds'] <= DAY for row in fixture['days']):
        raise ValueError('Invalid reference duration')
    adapter = subprocess.run(['node', '--import', 'tsx', 'verification/model.ts'], cwd=ROOT.parent, input=json.dumps(dict(cases=actual_cases, years=CONFIG[fixture['profile']]['years'])), text=True, capture_output=True, check=True)
    model = json.loads(adapter.stdout)
    if len(model['days']) != len(expected) or not np.all(np.isfinite(model['days'])) or any(not 0 <= s <= DAY for s in model['days']):
        raise ValueError('Incomplete/non-finite browser model results')
    errors, rounded, failures, polar, ordinary = [], [], [], [], []
    for row, seconds in zip(fixture['days'], model['days']):
        error = abs(seconds - row['seconds'])
        detail = dict(**row, modelSeconds=seconds, errorSeconds=error)
        errors.append(error)
        sensitive = abs(row['latitude']) >= 66 or row['grazing']
        (polar if sensitive else ordinary).append(error)
        if int(seconds / 60 + .5) != int(row['seconds'] / 60 + .5):
            rounded.append(detail)
        if state(seconds) != state(row['seconds']):
            failures.append(dict(**detail, reason='daylight-state-disagreement'))
        elif error > CONFIG['polarLimitSeconds' if sensitive else 'ordinaryLimitSeconds']:
            failures.append(dict(**detail, reason='duration-limit'))
    seasonal = []
    for year, events in fixture['seasons'].items():
        for i, (reference, actual) in enumerate(zip(events, model['seasons'][year])):
            error = abs((datetime.fromisoformat(reference) - datetime.fromisoformat(actual.replace('Z', '+00:00'))).total_seconds())
            detail = dict(year=int(year), event=['march-equinox', 'june-solstice', 'september-equinox', 'december-solstice'][i], reference=reference, model=actual, errorSeconds=error)
            seasonal.append(detail)
            if error > CONFIG['seasonLimitSeconds']:
                failures.append(dict(**detail, reason='season-limit'))
    def stats(values):
        return dict(count=len(values), maxSeconds=max(values, default=0), medianSeconds=float(np.median(values)) if values else 0, p95Seconds=float(np.percentile(values, 95)) if values else 0)
    return dict(status='failed' if failures else 'passed', profile=fixture['profile'], model=model['model'], modelSourceSha256=sha(ROOT.parent / 'src' / 'astronomy.ts'), provenance=fixture['provenance'], summary=stats(errors), ordinary=stats(ordinary), polar=stats(polar), roundedMinuteDisagreements=rounded, failures=failures, seasons=seasonal, worst=sorted([dict(**row, modelSeconds=s, errorSeconds=abs(s-row['seconds'])) for row, s in zip(fixture['days'], model['days'])], key=lambda row: row['errorSeconds'], reverse=True)[:20])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['compact', 'full'], default='compact')
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    fixture_path = ROOT / 'data' / f'{args.profile}.json'
    report_path = ROOT / 'reports' / f'local-{args.profile}.json'
    try:
        source = json.loads((ROOT / 'source.json').read_text())
        if source['status'] != 'pinned' or not source['sha256']:
            raise ValueError('Official DE440s reference is unpinned: JPL access and initial download are required; see verification/README.md')
        if args.generate:
            generate(args.profile, fixture_path)
        if sha(fixture_path) != fixture_path.with_suffix('.sha256').read_text().strip():
            raise ValueError('Fixture checksum mismatch')
        fixture = json.loads(fixture_path.read_text())
        if fixture['profile'] != args.profile:
            raise ValueError('Wrong fixture profile')
        report = compare(fixture)
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        report = dict(status='blocked', profile=args.profile, reason=str(error))
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k in ['status', 'profile', 'reason', 'summary', 'ordinary', 'polar']}, indent=2))
    print(f'Full report: {report_path}')
    raise SystemExit(0 if report['status'] == 'passed' else 1)


if __name__ == '__main__':
    main()
