# Aether V3 original procedural audio: offline rebuild

Run with existing Node: node build-and-verify.cjs

No installation, package registry, network, credentials, external AI, Python invocation, or game project access is required. The command writes generated files only beneath this folder, preserving supplied source files. It creates dist/assets/aether-game-events-v3.zip and dist/assets/aether-holographic-rpg-v3-40-stereo.zip, plus 186 WAV files in exports-game-events/ and exports-v3/.

Verified on Node v24.19.0: both rebuilt ZIPs and all 186 WAVs matched the recovered original bytes exactly. expected-sha256.json retains their authoritative hashes. JavaScript engines may differ in last-bit trigonometric behavior; the command fails if bytes differ. Do not silently update expected hashes to hide a mismatch.

Contents: original DSP, material and event parameters, original bake/test scripts, event trigger contracts and requirements, V2 synthesis baseline for original spatial regression, and checksums. The Python recipe file is included as an original ZIP member and is not executed. Files needed to reproduce the original ZIPs are retained unchanged. Historical project-relative document/catalog references remain in contract metadata, solely because those bytes are part of the original archive; they do not imply current runtime code verification. No absolute personal paths, credentials, third-party samples, third-party dependencies, remote URLs, or full external source documents were found in this source bundle.

The source workbench README states the material parameters and 36 event recipes were original procedural synthesis, without copied third-party samples. DSP and generators also identify themselves as original and dependency-free. All audio was independently regenerated from these sources and matched the original. No LICENSE file or explicit public redistribution/open-source grant was supplied, and this delivery adds none. Use within the owner's authorized Aether integration scope; decide a public license separately if needed.

Use event dry mono files for engine spatialization. Stereo files contain baked reflections/tails, not runtime distance/occlusion. All 36 event identifiers are proposals; actual_code_hook_verified is false. Preserve trigger_contract and never_trigger_on. Fishing-tension loops require continuous source control and 20 ms entry/exit gain ramps. No actual game integration, subjective listening, real-device/browser, or engine play-mode acceptance is claimed.
