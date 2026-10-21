# Stone grid trial r1b: export-only correction

The original r1 GLB incorrectly exported unrelated prototype and hidden geometry. This separate correction uses exactly the r9c export selection: WORKSHOP_SAMPLE and ROOFTOP_CLOUD_MODULES objects with hide_render false. Original r1 files remain frozen.

stone-grid-trial.blend is byte-identical to r1. No geometry, material, camera or logical placement edits were made. The r1 author geometry tests and before-close/after-close/after-full-corrected images can therefore be inherited as Blend geometry evidence, not as validation of the erroneous r1 GLB.

export-scope-tests.json verifies exact exported scene-root name and logical-key changes relative to the baseline r9c GLB: 10 removed old roots, 3 added grid roots; four clipped legacy roots retained. Export still requires independent review. SHA256.json includes this corrected package only; r1 evidence remains in ../grid-stone-template-r1.
