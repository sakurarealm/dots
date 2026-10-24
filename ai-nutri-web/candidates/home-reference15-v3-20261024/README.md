# AI-Nutri home reference 15 — v3 source delta

Candidate source backup, not a deployment or standalone application. Three UTF-8 source files are included: the home HTML, existing presentation controller, and new home stylesheet (its v1 filename is retained in v3). A fourth file supplies the unchanged original fictional portrait dependency, separately reviewed for public inclusion.

## Restore context

Start with a complete v36 runtime baseline (source commit `f7d3c827a4c6aed02ebfa093cf77730e12a5d32c`), apply `ai-nutri-web/candidates/reviewed26-20261023/payload/`, then overlay this directory's `payload/` at the runtime root, preserving the `dist/original-redo/pages/` paths. Verify each manifest hash and retain the earlier bytes for rollback. Restore the two replaced files and remove the added stylesheet to undo this layer. The public v36 archive is itself incremental, not a complete baseline.

The unchanged original portrait `dist/original-redo/pages/images/nutrition-companion-original.svg` is included as a newly archived dependency. A non-truncated AI-Nutri tree check at commit `3f2d85360a60ecec77c179a9cb0b19ddc5a5633f` found no file with that name. Its exact source hash and provenance are in the manifest. It consists of SVG geometry and gradients, with no external or embedded image assets; it is a fictional non-medical character, not a real person's photograph. Other unchanged scripts, styles, icons and recipe artwork also require the complete baseline. This archive must not be described as a complete runnable restore.

## Changes and evidence

Adds the home hierarchy and four action cards, retains the same composer through home/chat/dashboard transitions, corrects panel-close focus after account updates, and compacts the chat/dashboard header at widths up to 380 CSS px. The 19 reported offline tests use DOM doubles and source checks. Reported Edge checks cover selected home/cards, records-sheet, local-rule hello-send and narrow-header flows at 320/375/480 CSS px only; they are not all-module, real-device or real-service acceptance.

All account/person labels are fictional synthetic demo content, not exported user records. AI is unconnected; sends run local rules. No automatic input draft saving, image recognition or medical service is claimed. No personal photos, browser databases, secrets, transcripts, private review evidence, reference-image bytes or third-party assets are included. Asset references do not grant asset rights. This archive assigns no new license.
