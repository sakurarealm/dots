# Aether original extras: offline candidate handoff

This lossless transport preserves the exact bytes and relative paths listed in `manifest.json`. The ZIP archive is split into ordered parts of at most 8,000,000 bytes. Download this entire directory from one trusted repository commit; keep all numbered parts together. No software installation or network access is needed to restore it.

## Restore or verify

Requires Python 3.9 or newer, standard library only. From this directory:

```
python restore_extras.py /path/to/new-empty-output --verify-only
python restore_extras.py /path/to/new-empty-output
```

On Windows, use a normal Windows destination path. `--verify-only` validates all chunk hashes, the joined archive hash, the complete archive allowlist, every uncompressed member hash, and any existing destination files, without writing output. It also works before a destination exists. Restoration rechecks output hashes. A repeated restore accepts identical files but refuses to replace different files. Use a private destination without concurrent writers.

The program refuses traversal, absolute paths, duplicate archive entries, unexpected members, symlinks and conflicting existing files. It validates the entire package and all destinations before starting output writes. It does not execute any archived source, script or asset. Validation detects corruption, not coordinated replacement of both the manifest and archive: obtain the package from a trusted commit. Restoration is not a transactional backup system; interruption may leave verified complete files and an incomplete current file. Restore into a new empty directory after interruption.

RAM usage is bounded by streamed 1 MiB buffers plus ZIP/manifest metadata. Temporary disk holds one compressed archive; the destination additionally needs the manifest's total uncompressed size. Temporary archive storage is removed automatically.

## Scope and limitations

Included groups are original clean block candidates, building authoring sources/reference contracts and independently supported procedural quarry images, and approved code/audio prototypes. Paths and SHA-256 hashes in the manifest are authoritative for the exact included files. Documents may reference withheld dependencies; those references do not imply that the dependency is included or ready to use.

This is a candidate handoff, not a BK 1:1 reproduction, not a complete 645-asset delivery, and not evidence of Unity import or runtime testing. Withheld inherited textured building models, native materials and unsupported-provenance content are not included. No demo/Ark bundle or duplicated UI library is included. The inclusion of source files is not a claim that all generators can run standalone or reproduce withheld outputs. Review group-specific notices and missing-reference reports before use.

`manifest.json` contains only public restored paths, sizes, file hashes and transport hashes. Build inventories and machine-specific source paths are not part of this handoff.
