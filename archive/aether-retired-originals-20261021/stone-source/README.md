# Retired stone-facing trial: source-only archive

Archived 2026-10-21. This directory preserves 16 project-authored Python source files, technical notes and numeric geometry/export records from the r1 and r1b stone-facing experiments. The source files total 433,731 bytes. They are preserved byte-for-byte; manifest.json records both original and archived SHA-256 hashes. No archive-time source modifications were made. Paths in the source are project-relative; no machine-specific absolute source path is included.

## Included and excluded

The manifest is the authoritative allowlist. It contains five Blender Python scripts, two historical READMEs and nine JSON technical records. No Blend, GLB, PNG, runtime log or old whole-package hash manifest is included. Inherited scene, furniture and material assets are withheld. Their appearance in code or technical metadata does not grant redistribution rights or imply inclusion. No third-party asset license is asserted by this archive.

## Dependencies and limitations

This is not a complete recoverable model or a standalone rebuild. The scripts require Blender and excluded baseline scenes/materials, including the rooftop-cloud baseline, workshop-review scene/blueprint and tool-repair-rack model. Relative references in the historical sources retain their original project layout. Supply only separately authorized dependencies in an isolated copy before attempting to run them. Some scripts save or overwrite generated outputs; this archive has not executed them.

The historical READMEs describe their original full packages, including files deliberately absent here. References to renders, rollback scenes, SHA256.json and geometry test success apply to those historical packages, not to this source-only archive. Author tests remain historical evidence, not a fresh independent geometry or runtime validation. The original r1 export is documented as erroneous and superseded by r1b's selection correction.

## Verification and retention

For each manifest entry, hash the archived relative path with SHA-256 and compare archived_sha256 and archived_bytes. The identical original and archive hashes attest to unchanged bytes for these 16 files only. Preserve the manifest and README from the same trusted Git commit.

No local file was removed as part of archiving. This subset does not justify deleting the original directories or excluded dependencies.
