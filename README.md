# dots · Aether deliverables archive

Public backup of the locally recovered Aether project deliverables. These are project assets and review artifacts; publication does not imply visual acceptance or production readiness.

## Browse

- [Art gallery](https://aether-art-gallery.sakurarealmwuhen.chatgpt.site) (the existing Site retains its original private access setting)
- `aether-gallery/dist/`: complete static gallery snapshot, including its 78 GLBs, 36 UI-reference records, previews, thumbnails and vendor code
- `gallery-assets/`: original gallery models, metadata and actual-geometry thumbnail renderer
- `gallery-ui-assets/`: 22 supplemental/recovered reference image files; the canonical 36-image gallery set is in `aether-gallery/dist/ui/`
- `sixstyle-recovery/visual-review/`: actual rain-tower GLB multi-view images, silhouettes and technical review
- `recovery-audit/`: recovery inventory and known gaps; these reports describe evidence available at their recorded time
- `source-packs/`: expanded original deliverable archives, including editable modeling scripts, Blender files, source textures, exports and review notes
- `archive-index.json`: source archive SHA-256 and entry-to-repository mapping
- `archive-compression.json`: the one compressed Blender file, its original SHA-256, and exact-restoration metadata
- `reports/recovered-review-ledger.md`: recovered historical review findings with source evidence and explicit recovery limits
- `backup-manifest.json`: exact file sizes, SHA-256 and Git blob identities for this backup snapshot
- `backup-verification.json`: independently downloaded remote-byte checks and verification coverage

## Run the gallery locally

From this repository, run `python -m http.server 8000 --directory aether-gallery/dist`, then open `http://localhost:8000/`.

## Archive preservation and limits

Archive contents are stored as individual files to allow Git's content-addressed deduplication. Original ZIP container bytes are not included. The archive index preserves original ZIP hashes and every entry's path and SHA-256. Re-zipping the preserved entries produces a usable archive, but does not reproduce the original ZIP byte stream. Generated Python bytecode caches are excluded and individually marked in the index; editable source files remain available.

One 13,308,280-byte Blender library exceeds the GitHub connector request limit after base64 encoding. It is stored as `source-packs/Aether_Barrel_Six_Style_Material_Comparison_20261008/styles/source/barrel_six_styles_library.blend.gz` (11,489,328 bytes). Decompress it with `gzip -dk <file.blend.gz>` to recover the original `.blend` bytes. The original SHA-256 is `23cb4ba69c00fc82d90d8abbec7ec045138c6d1ad66117d6d7cb0cbd3286f3e4`; decompression was verified against it.

The repository excludes credentials, private assistant notes, download-session helpers, Git internals and build/runtime caches. No missing historical source code or unrecovered Site archive is implied to be restored merely because an audit mentions it.

The 78 six-style gallery GLBs remain candidates with recorded style acceptance failures. The 36 UI records are design references/candidates, not evidence of implementation in a game.

## Snapshot and history notes

The gallery snapshot was copied after the Site update at source commit `f8b8ae62fa945c064a569c4471d8b41bb7b2f79e`; source files were not modified for this backup. Later authorized gallery updates were added from v2 (`e8e425fef697120244eaab4b359bc823f97eb558`) and v3 (`1698e4951aa54a1c4babe31404bad8e4f0daf718`) source snapshots. Some gallery progress text predates the decision to use this repository, and is retained as historical source content.

Rewritten-history commit `a7317c4` was titled with the planned 36-reference count, but actually added 78 model files and the 22 files under `gallery-ui-assets/`. The following gallery snapshot commit supplies the canonical complete 36-image UI set. History is preserved rather than rewritten.

Only files actually present in this repository are backed up. Refer to the manifest and verification report for exact coverage and any unresolved failures.

## Public-report sanitization

Temporary screenshot authorization URLs were removed from the public recovery report, and the affected `main` history was rewritten before this snapshot. The clean history starts from cleanup commit `ada89d776edac4025ee2f8377b379ea720ebf264`. Older caches, unreachable Git objects and copies already held in clones or forks cannot be guaranteed erased. No signed download URL is included in this snapshot.
