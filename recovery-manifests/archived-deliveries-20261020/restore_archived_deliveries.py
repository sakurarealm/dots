#!/usr/bin/env python3
"""Restore exact original ZIP archives from a local dots checkout and a manifest.

Usage: python restore_archived_deliveries.py --repo-root /path/to/dots --output /path/to/restored
No network requests, external commands, installation, or overwrite of existing files.
"""
import argparse, base64, hashlib, json, os, pathlib, tempfile, zlib

def digest(data):
    return hashlib.sha256(data).hexdigest()

def safe_relative(root, name):
    rel = pathlib.PurePosixPath(name)
    if rel.is_absolute() or '..' in rel.parts:
        raise ValueError('Unsafe relative path: ' + name)
    result = (root / pathlib.Path(*rel.parts)).resolve()
    if result != root and root not in result.parents:
        raise ValueError('Path escapes checkout: ' + name)
    return result

def restore_archive(archive, repo_root, output, dry_run=False):
    target = safe_relative(output, archive['archive_name'])
    if not dry_run and target.exists():
        raise FileExistsError(str(target))
    hasher = hashlib.sha256()
    size = 0
    temporary = None
    stream = None
    try:
        if not dry_run:
            fd, temporary = tempfile.mkstemp(prefix='.' + target.name + '.', suffix='.restoring', dir=output)
            stream = os.fdopen(fd, 'wb')
        for segment in archive['segments']:
            if segment['kind'] == 'literal':
                payload = base64.b64decode(segment['base64'], validate=True)
            elif segment['kind'] == 'remote-file':
                path = safe_relative(repo_root, segment['repository_path'])
                data = path.read_bytes()
                if len(data) != segment['uncompressed_bytes'] or digest(data) != segment['sha256']:
                    raise ValueError('Source SHA-256 or size mismatch: ' + segment['repository_path'])
                git_sha = hashlib.sha1(('blob ' + str(len(data)) + '\0').encode() + data).hexdigest()
                if git_sha != segment['git_blob_sha1']:
                    raise ValueError('Source Git blob mismatch: ' + segment['repository_path'])
                if segment['compression'] == 'stored':
                    payload = data
                elif segment['compression'] == 'raw-deflate':
                    compressor = zlib.compressobj(segment['compression_level'], zlib.DEFLATED, -15)
                    payload = compressor.compress(data) + compressor.flush()
                else:
                    raise ValueError('Unsupported compression')
                if len(payload) != segment['compressed_bytes'] or digest(payload) != segment['compressed_sha256']:
                    raise ValueError('Deflate result differs; use the zlib version recorded in the manifest')
            else:
                raise ValueError('Unsupported segment type')
            hasher.update(payload)
            size += len(payload)
            if stream is not None:
                stream.write(payload)
        if size != archive['archive_bytes'] or hasher.hexdigest() != archive['archive_sha256']:
            raise ValueError('Final ZIP digest mismatch: ' + archive['archive_name'])
        if stream is not None:
            stream.flush()
            os.fsync(stream.fileno())
            stream.close()
            stream = None
            os.link(temporary, target)  # Atomic refusal to overwrite an existing destination.
            os.unlink(temporary)
            temporary = None
        return {'archive': archive['archive_name'], 'bytes': size, 'sha256': hasher.hexdigest(), 'verified': True, 'written': not dry_run}
    finally:
        if stream is not None:
            stream.close()
        if temporary is not None and os.path.exists(temporary):
            os.unlink(temporary)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--manifest', type=pathlib.Path, default=pathlib.Path(__file__).with_name('exact-zip-recovery-manifest.json'))
    parser.add_argument('--archive', action='append', help='Restore only this exact filename; can be repeated')
    parser.add_argument('--dry-run', action='store_true', help='Verify exact ZIP hashes without writing ZIP output')
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    output = args.output.resolve()
    manifest = json.loads(args.manifest.read_text())
    if manifest['format'] != 'exact-zip-recovery-v1':
        raise ValueError('Unknown manifest format')
    archives = [a for a in manifest['archives'] if not args.archive or a['archive_name'] in args.archive]
    if args.archive and len(archives) != len(set(args.archive)):
        raise ValueError('Unknown requested archive')
    if not args.dry_run:
        output.mkdir(parents=True, exist_ok=True)
    for archive in archives:
        print(json.dumps(restore_archive(archive, repo_root, output, args.dry_run)), flush=True)

if __name__ == '__main__':
    main()
