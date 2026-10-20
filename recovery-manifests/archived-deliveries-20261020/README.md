# Exact ZIP recovery for archived Aether deliveries

This folder preserves the exact packaging of 12 original Aether delivery ZIPs from October 7–8, 2026. The asset bytes are already stored in this repository at commit `17f5943841e9065984f5268710188cc6f2305da8`; this backup adds only the ZIP envelope and a small offline restore tool.

## Restore

Use a local checkout of this repository containing that source commit's files. Python 3 with its standard library is sufficient. No network request or installation is performed by the restore script.

```sh
python restore_archived_deliveries.py --repo-root /path/to/dots --output /path/to/restored --dry-run
python restore_archived_deliveries.py --repo-root /path/to/dots --output /path/to/restored
```

Add `--archive exact-filename.zip` to select one package. Existing output files are never overwritten.

Every source member is checked against its Git blob SHA-1 and SHA-256, every compressed segment is checked, and the final ZIP must match the recorded SHA-256 and byte count. If any check fails, the script stops and removes only its own partial output.

## Verification and compatibility

All 12 archives, totaling 128,313,062 bytes, passed exact-byte reconstruction using the original member streams, each matched to the immutable remote source-tree blob identifiers. A small archive was written and compared byte-for-byte. Corrupt-source, unsafe-path, and overwrite rejection tests passed.

The manifest records the zlib version used to reproduce the original deflate streams. A different zlib implementation may produce different compressed bytes even from identical source data. In that case the script refuses to label the result as the original ZIP; use the recorded zlib version for exact packaging. Source file bytes remain individually recoverable from the recorded repository paths and hashes.

No project source is removed or modified by this backup. The manifest contains package names, repository-relative source paths, integrity hashes, compression parameters, and original ZIP envelope bytes.
