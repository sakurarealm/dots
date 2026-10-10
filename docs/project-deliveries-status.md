# Project deliverables: public archive status

Checked: 2026-10-10 (UTC).

## Public project overview

This repository preserves selected Aether project deliverables: gallery snapshots, model candidates, UI references, editable source packs, and recovery/review records. Availability in this archive does not establish visual approval, production readiness, or complete project recovery.

## Verified public snapshot

The verification baseline is commit [3c841fc49fb4525cef7a06f2e1b7ff459f14b343](https://github.com/sakurarealm/dots/commit/3c841fc49fb4525cef7a06f2e1b7ff459f14b343).

- Its complete recursive Git tree contains 1,504 files, including 723 PNG files.
- Its [archive index](https://github.com/sakurarealm/dots/blob/3c841fc49fb4525cef7a06f2e1b7ff459f14b343/archive-index.json) records 30 archives and 963 entry mappings.
- Two mapped Python bytecode-cache files are excluded. One Blender library is represented by the documented gzip file in the [compression mapping](https://github.com/sakurarealm/dots/blob/3c841fc49fb4525cef7a06f2e1b7ff459f14b343/archive-compression.json).
- The baseline README names `backup-manifest.json` and `backup-verification.json`, but neither file is present in that baseline tree. Those names alone are not evidence of complete byte-level backup verification.

These counts describe the baseline before this status document was added. This check inspected repository metadata and index contents; it did not independently download and verify every asset byte.

## Separate release preservation

The following source release identifiers were verified in separate Git checkouts:

| Project | Source release |
| --- | --- |
| Gallery | `88d0482f207a9bd17f3568d3fdff5894fcb3d53b` |
| Nutri | `35ebd4684e35d1a1f2e5c6fdf4aeb1387156ceca` |
| Diving | `cce8071b962df65b6127bca972f220141f4751d9` |

Their latest release changes are not included in the public baseline above. Separate private Git backups and source checkouts are distinct from this public archive; they do not constitute a full Aether backup. This document adds status and public reference links only, not the source files from those releases.

## Preservation limits

Only materials actually stored in a verified backup are covered by that backup. A release identifier, index entry, or status report is not a substitute for the underlying files. Original ZIP container bytes are not preserved by expanding their entries, and no storage arrangement can guarantee that loss will never occur.
