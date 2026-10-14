#!/usr/bin/env python3
"""Offline, Python-standard-library-only verified restoration. Never executes archive content.
Use a private destination with no concurrent writers. Manifest hashes detect corruption,
not malicious replacement of the manifest itself; obtain it from a trusted commit.
"""
import argparse, hashlib, json, os, re, shutil, stat, tempfile, zipfile
from pathlib import Path, PurePosixPath

BLOCK = 1024 * 1024

def safe_name(name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or '\x00' in name:
        raise ValueError('Unsafe path')
    p = PurePosixPath(name)
    if p.is_absolute() or any(x in ('', '.', '..') for x in name.split('/')) or str(p) != name:
        raise ValueError('Unsafe path: ' + name)
    for part in p.parts:
        if part.endswith((' ', '.')) or any(ord(c) < 32 for c in part):
            raise ValueError('Nonportable path')
        if part.split('.')[0].upper() in {'CON','PRN','AUX','NUL',*[f'COM{i}' for i in range(1,10)],*[f'LPT{i}' for i in range(1,10)]}:
            raise ValueError('Reserved path')
    return name

def digest(stream, sink=None):
    h, n = hashlib.sha256(), 0
    while True:
        b = stream.read(BLOCK)
        if not b: break
        h.update(b); n += len(b)
        if sink is not None: sink.write(b)
    return n, h.hexdigest()

def check_record(r):
    safe_name(r['path'])
    if type(r['size']) is not int or r['size'] < 0 or not re.fullmatch('[0-9a-f]{64}',r['sha256']):
        raise ValueError('Invalid manifest record')

def check_target(root, name):
    target = root / name
    for p in [root, *root.parents]:
        if p.is_symlink(): raise ValueError('Symlink destination')
    current = root
    for part in PurePosixPath(name).parts:
        current = current / part
        if current.is_symlink(): raise ValueError('Symlink destination')
        if current.exists() and current != target and not current.is_dir():
            raise ValueError('Non-directory parent')
    if target.exists() and not target.is_file(): raise ValueError('Non-file target')
    return target

def restore(package, destination, verify_only=False):
    package = Path(package).absolute()
    root = Path(destination).absolute()
    manifest = json.loads((package / 'manifest.json').read_text('utf-8'))
    records, folded = {}, set()
    for r in manifest['files']:
        check_record(r)
        name = r['path']
        if name in records or name.casefold() in folded: raise ValueError('Duplicate manifest path')
        records[name] = r; folded.add(name.casefold())
    for name in records:
        for ancestor in PurePosixPath(name).parents:
            if str(ancestor).casefold() in folded: raise ValueError('File/parent collision')
    chunks = manifest['chunks']; seen = set()
    for r in chunks:
        check_record(r)
        if '/' in r['path'] or r['path'] in seen or r['size'] > 8000000:
            raise ValueError('Invalid or duplicate chunk')
        seen.add(r['path'])
    # Bounded RAM; temporary archive is removed on success or error.
    with tempfile.TemporaryFile() as joined:
        for r in chunks:
            p = package / r['path']
            if p.is_symlink() or not p.is_file(): raise ValueError('Invalid chunk file')
            with p.open('rb') as source: actual = digest(source, joined)
            if actual != (r['size'], r['sha256']): raise ValueError('Chunk hash mismatch')
        joined.seek(0)
        if digest(joined) != (manifest['archive']['size'], manifest['archive']['sha256']):
            raise ValueError('Archive hash mismatch')
        joined.seek(0)
        with zipfile.ZipFile(joined) as archive:
            infos = archive.infolist(); names = set()
            if len(infos) != len(records): raise ValueError('Archive count mismatch')
            for info in infos:
                name = safe_name(info.filename)
                mode = info.external_attr >> 16
                if name in names or name not in records or info.is_dir() or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0,stat.S_IFREG):
                    raise ValueError('Invalid archive member')
                names.add(name)
                r = records[name]
                if info.file_size != r['size']: raise ValueError('Member size mismatch')
                with archive.open(info) as source:
                    if digest(source) != (r['size'],r['sha256']): raise ValueError('Member hash mismatch')
            # Check every destination before creating any directory or file.
            for name, r in records.items():
                target = check_target(root,name)
                if target.exists():
                    with target.open('rb') as source:
                        if digest(source) != (r['size'],r['sha256']): raise ValueError('Different existing file: '+name)
            if not verify_only:
                for info in infos:
                    target = check_target(root,info.filename)
                    if target.exists(): continue
                    target.parent.mkdir(parents=True,exist_ok=True)
                    check_target(root,info.filename)
                    # Exclusive creation refuses any file appearing since prevalidation.
                    with target.open('xb') as output, archive.open(info) as source:
                        actual = digest(source,output)
                    r = records[info.filename]
                    if actual != (r['size'],r['sha256']): raise ValueError('Write hash mismatch')
                for name,r in records.items():
                    with check_target(root,name).open('rb') as source:
                        if digest(source) != (r['size'],r['sha256']): raise ValueError('Restored hash mismatch')
    return len(records)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('destination',help='Directory receiving exact manifest-relative paths')
    p.add_argument('--package',default=str(Path(__file__).resolve().parent))
    p.add_argument('--verify-only',action='store_true',help='Validate all transport, archive and destination conflicts without writing')
    a=p.parse_args()
    try: count=restore(a.package,a.destination,a.verify_only)
    except (OSError,ValueError,KeyError,TypeError,zipfile.BadZipFile) as e: p.exit(1,'ERROR: '+str(e)+'\n')
    print(('Verified ' if a.verify_only else 'Restored and verified ')+str(count)+' files.')
if __name__ == '__main__': main()
