#!/usr/bin/env python3
"""Restore exact original GLBs offline. Python standard library only."""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import sys


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(root, name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name:
        raise ValueError('Invalid relative path')
    rel = PurePosixPath(name)
    if rel.is_absolute() or any(part in ('', '.', '..') for part in name.split('/')):
        raise ValueError('Unsafe relative path: ' + name)
    p = root.joinpath(*rel.parts)
    current = root
    for part in rel.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('Symlink is not permitted: ' + name)
    if not p.resolve().is_relative_to(root.resolve()):
        raise ValueError('Path escapes directory: ' + name)
    return p


def checked_bytes(root, rec):
    p = safe_path(root, rec['path'])
    if not p.is_file() or p.stat().st_size != rec['size']:
        raise ValueError('Missing file or size mismatch: ' + rec['path'])
    b = p.read_bytes()
    if digest(b) != rec['sha256']:
        raise ValueError('SHA-256 mismatch: ' + rec['path'])
    return b


def write_checked(root, rec, data):
    if len(data) != rec['size'] or digest(data) != rec['sha256']:
        raise ValueError('Reconstructed content mismatch: ' + rec['path'])
    p = safe_path(root, rec['path'])
    if p.exists():
        if not p.is_file() or p.stat().st_size != len(data) or digest(p.read_bytes()) != rec['sha256']:
            raise ValueError('Refusing to overwrite different file: ' + rec['path'])
        return False
    p.parent.mkdir(parents=True, exist_ok=True)
    p = safe_path(root, rec['path'])
    # Exclusive creation: never replace a file created by another process.
    with p.open('xb') as f:
        f.write(data)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='New destination directory, outside this delivery directory')
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    output_arg = Path(args.output).expanduser().absolute()
    if any(p.is_symlink() for p in [output_arg, *output_arg.parents]):
        raise ValueError('Output path may not contain symlinks')
    output = output_arg.resolve()
    if output == source or output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError('Use a separate output directory, not this delivery directory or its parent')
    manifest = json.loads((source / 'TRANSPORT-MANIFEST.json').read_text(encoding='utf-8'))
    models = manifest['models']
    resources = manifest['resources']
    if manifest['format'] != 'building-models-lossless-gzip-v1' or len(models) != manifest['model_count'] or len(models) != 90:
        raise ValueError('Unsupported manifest or model count')
    names = set()
    for rec in models + resources:
        safe_path(output, rec['path'])
        if rec['path'] in names:
            raise ValueError('Duplicate output path: ' + rec['path'])
        names.add(rec['path'])
        # Check all existing destination files before producing any new output.
        p = safe_path(output, rec['path'])
        if p.exists() and (not p.is_file() or p.stat().st_size != rec['size'] or digest(p.read_bytes()) != rec['sha256']):
            raise ValueError('Refusing to overwrite different file: ' + rec['path'])
    output.mkdir(parents=True, exist_ok=True)
    restored = 0
    for rec in models:
        parts = [checked_bytes(source, part) for part in rec['parts']]
        stream = b''.join(parts)
        if len(stream) != rec['gzip_size'] or digest(stream) != rec['gzip_sha256']:
            raise ValueError('Combined gzip mismatch: ' + rec['path'])
        if not isinstance(rec['size'], int) or not 0 < rec['size'] < 100000000:
            raise ValueError('Unexpected output size')
        with gzip.GzipFile(fileobj=io.BytesIO(stream), mode='rb') as f:
            data = f.read(rec['size'] + 1)
        restored += write_checked(output, rec, data)
    for rec in resources:
        write_checked(output, rec, checked_bytes(source, rec))
    print('Verified 90 models and %d resource/index files; %d models newly restored.' % (len(resources), restored))
    print('Import GLBs from: ' + str(output / 'assets' / 'buildings'))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, EOFError) as exc:
        print('Restore stopped: ' + str(exc), file=sys.stderr)
        sys.exit(1)
