# Improvement Plan — Study Quality & Painter Aids

Date: 07-07-2026
Baseline: V2 build 30 (`codex/v2` line, single-page app, classic scripts)
Executor: Claude Sonnet (implementation agent). Owner reviews after each phase.

This plan supersedes the "stability-first, no new controls" posture in
`docs/current-state-audit.md` for the scope listed here. Everything not
listed remains frozen.

---

## 1. Product Intent (read first, this drives every decision)

The app replicates the *steps an amateur painter takes while looking at a
reference* — squinting, grouping values, checking big shapes, planning
temperature. It is **not** a photo-processing tool and has **no AI
component**. The aesthetic target is the British watercolour tradition
(Edward Seago, Edward Wesson): simplicity of form, strong value design,
muted painterly colour — never realistic or photographic effects.

Every processor must stay deterministic (same input → same output, on any
browser), client-side, dependency-free.

## 2. Architecture Facts the Executor Must Respect

- No build step, no npm, no ES modules. `modules/*.js` are classic scripts
  loaded before `app.js`; they define global functions. Keep this pattern.
- `app.js` holds the controller (`PaintersReferenceApp`), state, render
  router, and export orchestration. Processors live in `modules/`.
- Derived canvases are rebuilt eagerly in
  `rebuildWorkingCanvasesFromSource()` — composition crops flow through it.
- Release protocol for any app-shell change: bump `APP_VERSION_LABEL` in
  `app.js`, bump every `?v=NN` query string in `index.html`, and bump the
  cache name in `service-worker.js` — all together, in the same commit.
- Verification is manual browser smoke testing (see Phase 5). There is no
  test harness; do not add one in this plan.
- Determinism caveat: `drawImage`/`ctx.imageSmoothingEnabled` canvas scaling
  is implementation-defined per browser engine — more consistent than
  `ctx.filter`, but not guaranteed bit-identical across browsers. A processor
  that must be strictly deterministic should hand-roll its downscale
  (area-average) and upscale (bilinear) passes instead of relying on
  `drawImage` scaling, as `docs/squint-algorithm-recommendation.md` does.
  `createStrongBlurCanvas` in `modules/canvas-utils.js` still relies on
  `drawImage` scaling and carries this latent gap — acceptable today since no
  visible cross-browser mismatch has surfaced, but revisit before leaning on
  it somewhere strict determinism matters (e.g. Mass Study, Phase 2 task 2.3).

### No-Go Zones (do not touch)

- The 3-sheet export structure and `createCompositeSheet` layout
- Composition/focal-crop math (`createCompositionCropCanvas`, crop scale)
- Service worker logic beyond the cache-name bump
- Image load path (`fileToImageElement`, `prepareWorkingCanvases` fit logic)
- Any external dependency, CDN library, or AI/network call

---

## 3. Phase 1 — Processing Foundations (study quality core)

Goal: the three weakest studies today are Squint (blur far too weak to
merge shapes), Notan (fixed 85/170 cutoffs fail on dark or high-key
images), and Outline (speckly Sobel edges instead of simple form shapes).

### 1.1 Fast, strong, deterministic blur utility

File: `modules/canvas-utils.js`

Add `createStrongBlurCanvas(sourceCanvas, radiusPercent)`:

- Implement via downscale→upscale: draw source into an offscreen canvas
  scaled down by a factor derived from `radiusPercent` (radius expressed as
  % of image diagonal, so results are resolution-independent), with
  `imageSmoothingEnabled = true`, then scale back up. Two-step downscale
  (half, then target) avoids aliasing.
- Do NOT use `ctx.filter = "blur()"` — rendering differs across browsers,
  which breaks determinism.
- Keep the existing `blurGrayscaleCanvasOnce` untouched (outline and value
  contours still use small blurs); this is an addition, not a replacement.

Acceptance: at `radiusPercent = 3` on a 1600px image, adjacent foliage /
sky shapes visibly merge into masses; recompute takes well under 100 ms.

### 1.2 True squint strength

File: `modules/observation-processors.js` (`createSquintCanvasFromGrayscaleCanvas`)

- Map Softness 0–100 → blur radius 0.5%–4.0% of diagonal using
  `createStrongBlurCanvas`, replacing the 0–5 box-blur passes.
- Keep the existing value posterisation step after the blur (levels 12→4
  as softness rises) — that behaviour is right, only the blur is too weak.
- Debounce the softness slider recompute with `requestAnimationFrame` in
  `app.js` so dragging stays smooth.

Acceptance: at Softness 65, small branches/details disappear entirely and
only 4–6 value masses remain; slider drag does not stutter.

### 1.3 Colour squint option

Files: `modules/observation-processors.js`, `index.html`, `app.js`

- New processor `createColorSquintCanvasFromCanvas(originalCanvas, { softness })`:
  strong blur of the colour original (same radius mapping as 1.2), then
  reduce saturation to ~70% and posterise lightness to the same level count
  as grayscale squint, preserving hue. Muted, massed colour — the
  Seago/Wesson "half-closed eyes" read.
- UI: inside the existing Squint controls section add a two-button toggle
  `Gray | Colour` (default Gray). State: `state.squint.mode`.
- Wire into `rebuildWorkingCanvasesFromSource`, `refreshSquintCanvas`,
  and `getActiveBaseCanvas` (same `squint` view mode, mode picks canvas).

Acceptance: Colour squint shows soft muted colour masses with no detail;
Gray remains the default; toggle updates instantly.

### 1.4 Adaptive notan defaults (per image)

Files: `modules/value-processors.js`, `app.js`

- Add `computeAdaptiveNotanCutoffs(grayscaleCanvas)`: build a 256-bin
  histogram, return cutoffs at the 33rd and 66th percentile of pixel
  values, clamped to shadow ∈ [40, 140], light ∈ [130, 220], and enforcing
  the existing minimum gap of 10.
- Call it whenever the working source changes (image load and composition
  selection, inside `rebuildWorkingCanvasesFromSource`) and store results
  as the *current defaults*. Sliders keep working exactly as now.
- "Reset to Standard" button becomes "Reset to Auto" and restores the
  computed per-image cutoffs (update the helper text accordingly).
- Update the notan helper text to say defaults adapt to the image.

Acceptance: a low-key (dark) test image no longer produces a nearly
all-black notan on load; a high-key image no longer produces a nearly
all-white one; manual sliders and reset still work.

### 1.5 Unify mask cutoffs with notan cutoffs

File: `modules/mask-processors.js`, `app.js`

`createTintedMaskCanvasFromGrayscaleCanvas` currently hardcodes 85/170
boundaries, so Light/Midtone/Shadow masks can disagree with the notan the
painter just tuned. Pass `{ shadowCutoff, lightCutoff }` from
`state.notan` into the three tinted-mask calls (rebuild masks when notan
cutoffs change, in `refreshNotanCanvas` or a shared refresh). Sheet 2 then
always matches the notan on Sheet 1.

Acceptance: adjusting notan sliders visibly re-partitions the three masks;
default masks match the adaptive notan from 1.4.

### 1.6 Outline despeckle

File: `modules/observation-processors.js`

After the Sobel threshold pass in
`createOutlineSketchCanvasFromGrayscaleCanvas`, add a cleanup pass:

- Remove isolated edge pixels (edge pixels with fewer than 2 edge
  neighbours in their 8-neighbourhood), run twice.
- For the "Simple" preset only, additionally derive edges from the
  *posterised value regions* (quantise blurred grayscale to 3 levels, mark
  boundaries between levels — reuse the value-contour comparison approach)
  instead of raw Sobel. Simple should read as closed-ish form shapes fit
  for a block-in, not texture edges.

Acceptance: "Simple" outline of a landscape shows mass boundaries (sky/
trees/ground, major shapes) with no pepper noise; "Detailed" keeps roughly
its current character but cleaner.

**End of Phase 1: bump to V2 build 31 (full release protocol), owner smoke-tests before Phase 2.**

**Post-Phase-1 addendum (2026-07-19):** Squint (1.2/1.3) went through several
rounds of real-photo iteration after the initial build-31 close-out and ended
up on a different, better-verified algorithm than originally planned — see
`docs/squint-algorithm-recommendation.md` for the full technical writeup and
`app.js`/`docs/roadmaps/improvement-plan-2026-07.md` version history (builds
32-33) for what shipped. Net effect on this plan: `createSquintCanvasFromGrayscaleCanvas`
and `createColorSquintCanvasFromCanvas` no longer exist as separate functions;
both are now `createSquintCanvasFromCanvas(originalCanvas, { softness, mode })`
in `modules/observation-processors.js`, built on a deterministic
downscale → iterated bilateral filter → soft value quantization → upscale
pipeline (helpers `areaAverageDownscale`, `bilinearUpscale`, `bilateralPass5x5`
in `modules/canvas-utils.js`). `createStrongBlurCanvas` is unused by Squint now
but is untouched and still available for 2.3 Mass Study below.

**Implemented (2026-07-21): Outline via Squint.** Owner flagged (2026-07-19)
that Drawing (Outline Sketch) was the weakest area, especially on complex
landscapes — raw Sobel-gradient edge detection picks up every leaf/twig as a
gradient spike, and despeckle was a band-aid on that noise rather than a fix
for its source. Shipped as `createSquintRegionOutlineCanvas(originalCanvas,
softness)` in `modules/observation-processors.js`: runs the existing
`createSquintCanvasFromCanvas` gray pipeline, then re-quantizes the result to
the same `valueLevels` and marks adjacent-level mismatches (reusing
`createPosterizedRegionEdgeCanvas` and `despeckleEdgeCanvas` verbatim — no new
low-level pixel code was needed). Wired in at both `refreshOutlineCanvas()` and
`rebuildWorkingCanvasesFromSource()` in `app.js`: when
`state.outline.source === "squint"`, this function is called directly on the
original canvas, bypassing the generic blur+Sobel/posterize path entirely (the
now-dead "squint" branch was removed from `getOutlineSourceCanvasFromCanvases`).
Verified on a real texture-heavy foliage/architecture photo
(`IMG_8592.jpeg`, not committed): Squint source produces clean closed
leaf-shaped masses and crisp building lines at all three presets
(Simple/Balanced/Detailed), versus the old Gray/Sobel source's per-leaf
scribble noise on the same photo, crop, and detail level — confirmed via
side-by-side screenshots, not just code review. No fresh research pass was
needed for this — pure reuse of already-validated Squint + posterized-region
building blocks. Shipped as **V2 build 34**.

**Still outstanding:** the Drawing → Outline Source: **Squint** recipe's
preset softness values (70/50/32, in `getOutlinePresetSettings`'s `squint`
entry) are inherited from before this change and still unreviewed/untuned
specifically for the new boundary-tracing behavior — the sensitivity/smoothing
fields in that preset are now dead for this source (only `squintSoftness` is
read). Deferred by owner request.

---

## 4. Phase 2 — New Painter Aids

Goal: value-first aids in the Seago/Wesson spirit. All deterministic.

### 2.1 Value Groups view (2–5 values)

Files: `modules/value-processors.js`, `index.html`, `app.js`

- New view `valueGroups` under **Painting** (button placed next to
  3-Value Notan). Keep Notan itself completely untouched.
- Processor `createValueGroupsCanvasFromGrayscaleCanvas(grayscaleCanvas, { count })`:
  posterise to `count` equal grey steps (2–5). Cutoffs from equal
  percentile bands of the histogram (consistent with 1.4's adaptive idea),
  output greys evenly spaced 0–255.
- Controls: four small preset buttons `2 | 3 | 4 | 5` (default 4) in a
  mode-detail section, following the existing Simple/Balanced/Detailed
  button pattern. State: `state.valueGroups.count`.

Acceptance: 2-value gives a poster-like light/dark split; 5-value reads as
a full tonal plan; switching counts is instant.

### 2.2 Value scale strip + click-to-read value

Files: `app.js` (render layer), small addition to `styles.css` if needed

- When the active view is Grayscale, Squint, Notan, or Value Groups, draw
  a vertical 11-step value strip (0–10, white→black) along the right edge
  of the main canvas, inside the canvas render (so Print This View
  includes it). Label steps 0, 5, 10.
- Clicking the image in these views samples the pixel under the cursor,
  converts to a 0–10 value step, and highlights that step on the strip
  plus shows "Value 7/10" in the status line. Reuse the existing
  `handleMainCanvasClick` coordinate mapping; only activate outside the
  focal-study mode.

Acceptance: click on a sky reads a light value (8–10); click on deep
shadow reads 0–2; strip appears only on value views and exports with them.

### 2.3 Mass Study view (big-shape painterly simplification)

Files: new `modules/simplification-processors.js` (add script tag before
`app.js` with the same `?v=` pattern), `index.html`, `app.js`

- New view `massStudy` under **Painting**.
- Processor: strong blur (reuse 1.1, radius ~2% of diagonal), then
  median-cut colour quantisation to N colours (N = 6 / 10 / 16 for
  Simple / Balanced / Detailed), then slightly reduce saturation (~85%) so
  the result reads muted rather than poster-bright. Median-cut must be
  deterministic (stable sort order, fixed seed-free splitting).
- Controls: Simple / Balanced / Detailed preset buttons (existing pattern).

This is the closest view to "what Seago would keep": few big shapes,
muted colour, no detail.

Acceptance: a landscape reduces to recognisable big masses in ≤16 muted
colours; no dithering or noise; runs in under ~1 s on a 1600px image.

### 2.4 Painting stage grouping

File: `index.html` (+ minor `styles.css`)

The Painting stage now holds ~11 buttons. Group them under two small
in-panel headings without changing any behaviour:

- **Values**: Squint, Grayscale, 3-Value Notan, Value Groups, Light Mask,
  Midtone Mask, Shadow Mask
- **Colour**: Mass Study, Temperature Study, Colour Study, Palette Notes

Use existing typography/spacing patterns; no new components.

Acceptance: all buttons work as before; visual grouping is clear in both
themes.

**End of Phase 2: bump to V2 build 32, owner smoke-tests.**

**Phase 2 shipped 2026-07-21 as V2 build 38** (build numbers ran ahead of
this doc's original estimate due to the Post-Phase-1 Squint/Outline detour
above). All four tasks implemented, one commit per task, each verified live
against a real photo via Claude-in-Chrome before moving to the next:
- 2.1 Value Groups: `createValueGroupsCanvasFromGrayscaleCanvas` in
  `modules/value-processors.js`, sharing a new `buildGrayscalePercentileLookup`
  helper with adaptive Notan.
- 2.2 Value scale strip: drawn straight onto `mainCanvas` in `app.js` (so
  Print This View includes it for free); `handleMainCanvasClick` split into
  a dispatcher plus `handleFocalStudyCanvasClick`/`handleValueStripCanvasClick`.
- 2.3 Mass Study: new `modules/simplification-processors.js` (median-cut
  quantization + saturation scale). Deliberately did **not** reuse
  `createStrongBlurCanvas` per this doc's own determinism note above - built
  the blur from Squint's `areaAverageDownscale`/`bilinearUpscale` instead.
- 2.4 Painting stage grouping: pure CSS/markup, `.view-mode-group-label`
  headings spanning the existing 2-column grid, no JS changes.

**Post-Phase-2 fix (2026-07-21): Mass Study was not actually useful on a real
photo.** Owner feedback on a dense-jungle-canopy/water-reflection photo: the
result was blotchy, scattered small colour islands rather than big shapes.
Root cause found via connected-component analysis (visual screenshot
comparison was actively misleading here - the browser downscales the canvas
for on-screen display, which smooths away small islands before a screenshot
ever captures them, so the result looked deceptively clean on screen while
covering 17.8% of the image in scattered noise at native resolution).
Blurring harder alone doesn't fix this cleanly either: median-cut has no
spatial awareness, so enough blur to push noise under 1% of pixels shrinks
the working canvas to ~4px wide - past the point where sky/tree/water read
as anything but an abstract gradient. Fixed with two changes in
`modules/simplification-processors.js`: moderated the blur to
`radiusPercent 8` (was 2), and added `mergeSmallLabelRegions()` - after
quantizing to per-pixel labels (`quantizeCanvasColorsToLabels`, replacing
the old `quantizeCanvasColorsMedianCut` which returned a finished canvas
instead of labels), repeatedly reassign the smallest same-label connected
region to its most common bordering neighbor. Cost scales with region
count, not image area, so it stays cheap once blur has collapsed most of
the noise. Re-verified on the same real photo: all three presets now read
as an actual composition, 332-352ms end to end. Shipped as V2 build 39.

**Post-Phase-2 removal (2026-07-21): Mass Study removed entirely, V2 build
40.** Even after the blotchiness fix above, owner judged the view still
wasn't useful in practice and asked for it to be removed rather than
iterated on further. Deleted `modules/simplification-processors.js` and all
wiring (state, rendering, controls, presets, its Painting-stage button/
mode-detail section, service-worker cache entry, CSS active-state scope).
Phase 2 is now effectively 2.1/2.2/2.4 plus a shipped-then-reverted 2.3 -
if Mass Study is revisited later, treat it as a fresh design problem rather
than resurrecting this implementation; median-cut-on-blur was tried and,
even once technically clean, didn't earn its place in the workflow.

**Post-Phase-2 consolidation (2026-07-21): Values group reduced from 7
buttons to 4, V2 build 41.** Owner observed real redundancy in the Painting
stage's Values group: Notan and Value Groups(3) produce near-identical
output on typical photos, and Light/Midtone/Shadow Mask are literally the
same 3-way Notan split (`shadowCutoff`/`lightCutoff`) rendered one band at a
time via a fixed tint palette - no unique computation of their own. After
reviewing both sides (Notan's clamped cutoffs give it real robustness on
extreme low/high-key images that Value Groups lacks, and its manual
Shadow/Light Cutoff sliders are a real capability difference; the masks have
no such distinguishing capability), decided to: keep Notan as-is, and remove
the three Mask buttons/routing in favour of click-to-isolate on Value
Groups' own scale. `createValueGroupsCanvasFromGrayscaleCanvas` gained an
`isolateBand` option (same band-membership computation, just a different
output colour for non-isolated pixels); the value strip now renders exactly
`count` segments for this view instead of the generic 11-step ruler, and
clicking a segment toggles isolating that band. `refreshMaskCanvases()` /
`createTintedMaskCanvasFromGrayscaleCanvas` / `state.processed.*MaskCanvas`
were deliberately left untouched, since Sheet 2 of the export ("Tonal
Masks") reads those canvases directly and the 3-sheet export structure is
a no-go zone - verified Sheet 2 preview still renders all four panels
correctly after removing the buttons.

---

## 5. Phase 3 — Compare Workflow & Tablet Pass (small, contained)

### 3.1 Hold-to-compare with original

Files: `index.html`, `app.js`

A painter constantly glances between study and reference. Add a
"Hold to Compare" button near Print This View:

- While pressed (`pointerdown`→`pointerup`/`pointerleave`, works for
  touch), the main canvas temporarily draws the current *original*
  (composition-respecting) canvas; on release it redraws the active view.
  Also bind holding the spacebar on desktop (ignore when a form control
  has focus).
- No state persistence; purely a transient render swap. Do not disturb
  the focal-study view (disable there).

Acceptance: press-and-hold flips to original instantly on desktop and
iPad Safari; release restores the study; no residual state.

### 3.2 Tablet usability pass

File: `styles.css` (layout only; no JS behaviour changes)

- Below ~900px width, the sidebar becomes a top panel (stacked above the
  canvas) with stages still collapsible; canvas gets full width.
- Ensure all buttons/sliders have ≥44px touch targets on coarse pointers
  (`@media (pointer: coarse)`).
- Verify canvas click mapping already works with touch (it uses
  `getBoundingClientRect`, so it should); fix only if broken.

Acceptance: on an iPad in portrait and landscape, every stage is
reachable, sliders are draggable with a finger, and the study canvas is
the dominant element.

**End of Phase 3: bump to V2 build 33, owner smoke-tests.**

---

## 6. Phase 4 — Docs & Closeout

- Update `README.md` feature list (colour squint, adaptive notan, Value
  Groups, value strip, Mass Study, hold-to-compare, tablet layout).
- Update `docs/current-state-audit.md` to the new build and note that this
  plan's scope amended the earlier freeze.
- Add a short entry to `docs/next-session-brief.md` with anything deferred.

**Done early (2026-07-21), out of sequence, ahead of Phase 3.** The owner
paused active development to test V3.0 across real references and share it
before deciding on next steps, and asked whether the docs were in order to
resume later. They weren't: `README.md` and `docs/current-state-audit.md`
still said "V2 build 30" and listed the since-removed Light/Midtone/Shadow
Mask as separate views, and this very roadmap doc plus the two Squint
research docs had never actually been committed to git (only ever sitting
in the working directory). Fixed all of it: committed the three docs,
refreshed `README.md`/`current-state-audit.md`/`next-session-brief.md` to
describe what's actually shipped (this addendum's own history), and reset
the version label to "V3.0 build 1" (separate commit, before this docs
pass). Phase 3 (hold-to-compare, tablet pass) remains genuinely not
started - do not begin it unsolicited; wait for the owner's real-use
feedback.

---

## 7. Phase 5 — Verification Checklist (run after every phase)

Test with three references: a balanced landscape, a low-key (dark) image,
and a high-key (light) image. In both themes, desktop + iPad if available:

1. Load image → all stage views render without console errors.
2. Focal Study: place point, pick a crop, confirm every study reflects the
   crop; Clear Selection restores original.
3. Squint Gray and Colour at softness 20 / 50 / 80 — masses merge, no lag.
4. Notan on the dark and light images — adaptive defaults give readable
   3-value splits; sliders and Reset to Auto work; masks match notan.
5. Outline Simple / Balanced / Detailed on all four sources — no speckle
   on Simple.
6. Value Groups 2–5; value strip click-reads sensible values.
7. Mass Study three levels — muted big shapes, <1 s.
8. Hold-to-compare from every study view.
9. Print This View from a value view (strip included) and export all three
   sheets — sheet layout unchanged from build 30.
10. Hard-refresh after deploy: build chip shows the new build (service
    worker cache actually bumped).

## 8. Execution Notes for Sonnet

- Work phase by phase; stop after each phase for owner review. Do not
  start the next phase unsolicited.
- Prefer small commits per numbered task, message format:
  `feat(squint): true squint strength via downscale blur (1.2)`.
- When touching `rebuildWorkingCanvasesFromSource`, keep it eager and
  synchronous as today; if new processors make load noticeably slow
  (>1.5 s), raise it with the owner rather than restructuring to lazy
  rebuilds on your own.
- Match existing code style: plain functions, JSDoc-light comments,
  no classes in modules, no arrow-function class fields, two-space indent.
- If a task conflicts with observed behaviour in the code, flag it and
  ask; do not silently reinterpret.
