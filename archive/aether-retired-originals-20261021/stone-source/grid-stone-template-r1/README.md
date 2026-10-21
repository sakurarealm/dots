# Stone facing trial r1 (author package, not independent approval)

Scope: only front X [3,6], Z [-1,0]. All base 1³ solids, doors/windows and outside geometry remain untouched except exact clipping of four crossing bricks at X=3 or X=6. Those four outside remnants retain their legacy root keys and remain legacy non-grid components. No whole-house grid compliance is claimed.

Three integer installations at (3,0,-1), (4,0,-1), (5,0,-1) reference a single shared, fixed mesh recipe, with identity child transforms. Same moduleTypeId, no per-instance shape/offset. Actual local geometry bounds: X [0,1], Y [-.11,.02], Z [.0075,.9925]. Nominal mounting cell is 1×1 in X/Z; thickness .13. Local Y=0 mounts on the unchanged solid stone backing, with .02 overlap. This facing does not substitute for required 1-unit wall thickness.

Four .235-high courses, .015 horizontal gaps, .018 vertical gaps and .012 original bevel. Even courses use whole bricks. Odd courses use halves clipped at exact module edges without introducing bevel/gap at integer joins, preserving running-bond appearance across cells. Original stone material reused directly. A single recipe creates all instances; no old per-brick coordinates are disguised as a grid pivot.

Files: build.py (reproducible source), legacy-refine_facade_r2.py (read-only-origin source copy), baseline-inspection.json, migration-and-tests.json (stable key mappings, dependencies, actual bounds and author tests), unchanged-object-digests.json, stone-grid-trial.blend, stone-grid-trial.glb, render.py and view JSONs/images.

Rollback: discard this separate trial package and reopen the untouched workshop-levels-L5-rooftop-cloud-r9c/rooftop-cloud.blend. Original SHA256 is recorded in migration-and-tests.json. This package never overwrites baseline.

Pending: independent review, final user visual acceptance, and remaining full-building migration. Author tests are not independent audit.

Visual evidence: before-close.png and after-close.png use identical close camera. after-full-corrected.png matches r9c exterior script camera (target 8,6,8.5; ortho31); use this as whole-building regression. after-full.png is retained failed framing evidence with cropped turbine top and must not be represented as complete exterior.
