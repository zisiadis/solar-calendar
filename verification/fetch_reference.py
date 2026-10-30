"""Fetch only the official JPL file; existing pins are never silently replaced."""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--initialize', action='store_true', help='Record first official download hash; review and commit source.json')
    args = parser.parse_args()
    manifest_path = ROOT / 'source.json'
    source = json.loads(manifest_path.read_text())
    target = ROOT / 'data' / source['file']
    if not source['sha256'] and not args.initialize:
        raise SystemExit('Reference is unpinned. First run with --initialize and commit source.json before CI verification.')
    if target.exists() and source['sha256']:
        if digest(target) != source['sha256']:
            raise SystemExit('Existing ephemeris hash mismatch; refusing to overwrite.')
        return
    target.parent.mkdir(exist_ok=True)
    partial = target.with_suffix('.part')
    try:
        with urlopen(source['url'], timeout=120) as response, partial.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if partial.stat().st_size < 30_000_000 or partial.read_bytes()[:7] != b'DAF/SPK':
            raise ValueError('Response is not the expected DE440s SPK file')
        actual = digest(partial)
        if source['sha256'] and actual != source['sha256']:
            raise ValueError('Official download differs from committed SHA-256')
        os.replace(partial, target)
        if not source['sha256']:
            source.update(status='pinned', sha256=actual, retrievedAt=datetime.now(timezone.utc).isoformat(), reason=None)
            manifest_path.write_text(json.dumps(source, indent=2) + '\n')
        print(f'Verified {target.name}: {actual}')
    finally:
        partial.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
