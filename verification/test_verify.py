import unittest
from unittest.mock import patch
from datetime import datetime, timezone
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import numpy as np
from skyfield.api import load
from verify import DAY, CONFIG, cases, compare, integrate, state, time_sources, reference_day, reference_year


class IntegrationTests(unittest.TestCase):
    def test_constant_polar_day_and_night(self):
        for altitude, expected in [(1, DAY), (-1, 0)]:
            seconds, roots = integrate(lambda t: np.full_like(t, altitude), [])
            self.assertEqual(seconds, expected)
            self.assertEqual(roots, [])

    def test_single_crossing_and_boundary_root(self):
        seconds, roots = integrate(lambda t: t - 300, [])
        self.assertAlmostEqual(seconds, DAY - 300, places=4)
        self.assertEqual(len(roots), 1)
        self.assertEqual(integrate(lambda t: t, [])[0], DAY)

    def test_grazing_pair_between_regular_samples(self):
        # Only two seconds of light, entirely between minute samples.
        seconds, roots = integrate(lambda t: 1 - (t - 12345) ** 2, [12345])
        self.assertAlmostEqual(seconds, 2, places=4)
        self.assertEqual(len(roots), 2)

    def test_short_dark_excursion(self):
        seconds, roots = integrate(lambda t: (t - 12345) ** 2 - 1, [12345])
        self.assertAlmostEqual(seconds, DAY - 2, places=4)
        self.assertEqual(len(roots), 2)

    def test_tangent_is_not_a_light_interval(self):
        self.assertEqual(integrate(lambda t: -(t - 12345) ** 2, [12345])[0], 0)

    def test_matrix_has_leap_days_date_line_and_poles(self):
        rows = list(cases('compact'))
        self.assertTrue(any(c['month'] == 2 and c['day'] == 29 for c in rows))
        self.assertEqual({c['longitude'] for c in rows}, {-180, 0, 180})
        self.assertTrue({-90, 90}.issubset({c['latitude'] for c in rows}))
        self.assertEqual(len(rows), len({tuple(c.values()) for c in rows}))
        self.assertEqual(state(0), 'dark')
        self.assertEqual(state(DAY), 'light')
        self.assertEqual(state(43200), 'crossing')

    def test_time_data_is_bundled_and_identified(self):
        self.assertIn('iers.npz', time_sources())
        self.assertTrue(all(len(value) == 64 for value in time_sources().values()))

    def test_skyfield_extrema_pipeline_finds_grazing_excursion(self):
        # Exercise real Skyfield extrema search and both oracle paths with an
        # analytic altitude, independently of the unavailable DE440s kernel.
        ts = load.timescale(builtin=True)
        epoch = ts.from_datetime(datetime(2026, 1, 1, tzinfo=timezone.utc)).tt
        class Site:
            def __add__(self, other):
                return self
            def at(self, t):
                seconds = (t.tt - epoch) * DAY
                class Observation:
                    def observe(self, sun):
                        return self
                    def apparent(self):
                        return self
                    def altaz(self, temperature_C):
                        angle = type('Angle', (), {'degrees': np.cos(2 * np.pi * (seconds - 12345) / DAY) - .999999})()
                        return angle, None, None
                return Observation()
        eph = {'earth': Site(), 'sun': object()}
        day = dict(year=2026, month=1, day=1, latitude=66.56, longitude=0)
        with patch('verify.wgs84') as wgs:
            wgs.latlon.return_value = object()
            daily = reference_day(day, ts, eph)
            yearly = reference_year([day, dict(day, day=2)], ts, eph)
        expected = np.arccos(.999999) / np.pi * DAY
        self.assertAlmostEqual(daily['seconds'], expected, places=3)
        self.assertEqual(len(daily['crossings']), 2)
        self.assertTrue(daily['grazing'])
        for row in yearly:
            self.assertAlmostEqual(row['seconds'], expected, places=3)
            self.assertEqual(len(row['crossings']), 2)

    def test_release_gates_and_rounded_disagreement_reporting(self):
        row = dict(year=2026, month=3, day=20, latitude=40, longitude=0)
        events = ['2026-03-20T00:00:00+00:00'] * 4
        fixture = dict(schemaVersion=1, profile='compact', provenance={}, days=[dict(**row, seconds=43229, crossings=[], grazing=False)], seasons={'2026': events})
        config = dict(CONFIG, compact={'years': [2026]})
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'source.json').write_text(json.dumps(dict(status='pinned', sha256='a' * 64)))
            with patch('verify.ROOT', root), patch('verify.CONFIG', config), patch('verify.cases', return_value=iter([row])), patch('verify.provenance', return_value={}), patch('verify.sha', return_value='test-only'), patch('verify.subprocess.run') as run:
                def model(seconds):
                    run.return_value = SimpleNamespace(stdout=json.dumps(dict(model='test-only', days=[seconds], seasons={'2026': events})))
                model(43231)
                report = compare(fixture)
                self.assertEqual(report['status'], 'passed')
                self.assertEqual(len(report['roundedMinuteDisagreements']), 1)
                model(43300)
                with patch('verify.cases', return_value=iter([row])):
                    self.assertEqual(compare(fixture)['failures'][0]['reason'], 'duration-limit')
                fixture['days'][0]['seconds'] = 0
                model(1)
                with patch('verify.cases', return_value=iter([row])):
                    self.assertEqual(compare(fixture)['failures'][0]['reason'], 'daylight-state-disagreement')
                model(float('nan'))
                with patch('verify.cases', return_value=iter([row])):
                    with self.assertRaisesRegex(ValueError, 'non-finite'):
                        compare(fixture)


if __name__ == '__main__':
    unittest.main()
