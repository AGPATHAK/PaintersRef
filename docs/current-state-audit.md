# Current State Audit

## Version Checkpoint

- Stable working prototype: **V3.0 build 1** on `codex/v2`
- Product type: browser-based deterministic painting-reference tool
- Current posture: major-milestone checkpoint; active development paused (2026-07-21) while the owner tests across varied references and shares with a few people
- This checkpoint follows a large round of work (tracked in `docs/roadmaps/improvement-plan-2026-07.md`): Squint's algorithm was fully rewritten, Outline now traces boundaries from Squint instead of raw Sobel, Value Groups (adaptive 2-5 value bands, with click-to-isolate a band) was added, a click-to-read value scale was added, Mass Study was tried and removed (see that roadmap doc's post-Phase-2 notes for why), and the Painting stage's Values group was consolidated from 7 buttons to 4.

## Current Working Product

Painter's Reference Lab V3.0 is a local-first reference-preparation tool for painters. It supports the path from loading an image through composition selection, drawing aids, painting studies, and exportable reference sheets.

The app is currently treated as a stable prototype, not an active broad-refactor target. Workflow clarity, real-use testing, and small stability-first corrections matter more than architectural cleanup.

## Current UI Structure

- **Reference Image**
  - Image load/change
  - Grid toggle, rows, and columns
- **Composition**
  - Focal Study
  - Crop Size
  - Clear Selection
- **Drawing**
  - Outline Sketch
  - Value Contours
  - Mirror Check
  - Outline Source: Gray, Squint, Original, Notan
  - Outline detail: Simple, Balanced, Detailed
- **Painting**, grouped under two headings:
  - **Values**: Squint (Gray/Colour, Softness slider), Grayscale, 3-Value Notan (adaptive cutoffs, manual sliders, Reset to Auto), Value Groups (2/3/4/5 bands, click a scale segment to isolate a band, click again to show all)
  - **Colour**: Temperature Study, Color Study, Palette Notes
  - A click-to-read value scale is drawn alongside Grayscale/Squint/Notan; Value Groups draws its own segmented version of that scale for the isolate feature
- **Export**
  - Sheet preview/export controls
- First-level action:
  - Print This View
- **Info**
  - Status, original size, canvas size, scale, active view, outline detail

## Major Implemented Features

- JPG/PNG image loading
- Aspect-ratio-preserving image fit to canvas
- Composition workflow with focal-point crop studies
- Crop-size slider that updates all composition crop previews and preserves clicked-preview behavior
- Grid overlay with adjustable rows and columns
- Grayscale study
- Squint study (Gray or Colour mode), built on a deterministic downscale -> iterated bilateral filter -> soft value quantisation -> upscale pipeline
- 3-Value Notan with adaptive per-image cutoffs, manual Shadow/Light Cutoff sliders, and Reset to Auto
- Value Groups: adaptive 2-5 value band posterisation, with click-to-isolate a single band (replaces the old separate Light/Midtone/Shadow Mask views for interactive use - those processors still run internally for Sheet 2's export)
- Click-to-read value scale (Grayscale/Squint/Notan/Value Groups)
- Warm/cool/neutral Temperature Study
- Palette Notes
- Color Study palette variants with side-by-side source/study comparison
- Rough Outline Sketch with Outline Source selection; the Squint source traces boundaries from Squint's own quantised output rather than raw Sobel gradients
- Curated outline detail presets:
  - Simple
  - Balanced
  - Detailed
- Value Contours with Simple / Balanced / Detailed grouping
- Mirror Check for drawing review
- Current-view export
- First-level Print This View action for the active study
- 3-sheet preview/export workflow (Sheet 2 still uses Light/Midtone/Shadow Mask internally, unchanged)
- Light/dark theme toggle
- PWA-compatible static app structure

## 3-Sheet Workflow

The app includes a preview/export workflow with three prepared sheets under **Export**. These sheets support practical painting decisions and do not replace artist judgment.

### Sheet 1 - Value & Drawing

- Original
- Grayscale
- 3-Value Notan
- Outline with grid

Purpose:

- Establish value structure.
- Compare simplified value masses against the original.
- Use the gridded outline as a rough drawing/block-in aid.

### Sheet 2 - Tonal Masks

- Original
- Light Mask
- Midtone Mask
- Shadow Mask

Purpose:

- Separate light, midtone, and shadow masses.
- Help the painter see large tonal groups before detail.
- Keep mask output readable and stable.

### Sheet 3 - Temperature Map

- Original
- Warm Mask
- Cool Mask
- Neutral Mask

Purpose:

- Show a practical warm/cool/neutral read of the reference.
- Help plan color temperature relationships.
- Treat the map as painter-friendly guidance, not absolute color truth.

## Current Export Behavior

- **Print This View** exports the active study view from the first level of the control panel.
- The **Export** stage contains the prepared sheet preview/export workflow.
- Users can preview Sheet 1 / Sheet 2 / Sheet 3 before exporting a sheet.
- Sheet export is routed through the preview workflow.
- Current-view export remains separate from sheet export.
- The current sheet structure is stable and should not be changed casually.

## Recent Stable Changes

- Sidebar reorganized into Reference Image, Composition, Drawing, Painting, Export, and Info.
- Squint moved to Painting because it is primarily a value-mass and paint-planning aid.
- Drawing is focused on Outline Sketch, Mirror Check, Outline Source, and Simple / Balanced / Detailed detail.
- Outline source behavior stabilized with hidden source/detail recipes.
- Extra visible outline-local controls were removed.
- Vocabulary cleanup completed:
  - Squint Softness
  - Simple / Balanced / Detailed
  - Reset to Standard
  - Focus on Color
- Painting button layout and Drawing outline spacing were polished.
- Squint's algorithm was fully rewritten (deterministic downscale -> iterated bilateral filter -> soft value quantisation -> upscale), replacing an earlier Kuwahara-based approach that proved unstable on real photo texture. See `docs/roadmaps/improvement-plan-2026-07.md`.
- Outline's Squint source now traces boundaries from Squint's own quantised output instead of raw Sobel gradients, fixing speckled edges on texture-heavy references (foliage, etc.).
- Value Groups was added (adaptive 2-5 value bands) and later gained click-to-isolate; Light/Midtone/Shadow Mask were removed as separate Painting-stage views once isolate covered the same use case (their processors still run for Sheet 2's export).
- Mass Study (a big-shape colour-quantisation view) was added, found not useful in practice even after a real bug fix, and removed entirely - do not resurrect that implementation without treating it as a fresh design problem.
- Versioning was reset from "V2 build N" to "V3.0 build N" to mark this checkpoint as a major milestone.

## Current Stable Architecture

- Static app structure:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `modules/` on the V2 refactor branch
  - `manifest.webmanifest`
  - `service-worker.js`
- Stable prototype: single-file runtime architecture centered in `app.js`
- V2 refactor branch: deterministic processors extracted into focused classic-script modules, with app orchestration still centered in `app.js`
- Color Study logic lives in `modules/color-study-processors.js`
- Value Contours, Squint, and Outline logic live in `modules/observation-processors.js`
- Grayscale, Notan, and Value Groups logic live in `modules/value-processors.js`
- Deterministic client-side image processing
- Manual browser smoke testing remains the main regression check

## Known Limitations / Observations

- The app is usable, but output should continue to be judged against real painting references.
- Outline recipes may need future calibration, but the visible control surface should stay simple unless real use proves otherwise.
- `app.js` remains the runtime/controller layer and still contains composition, render, and export orchestration.
- The V2 processor extraction is a good-enough maintainability checkpoint; further refactor should be driven by concrete feature pressure.
- Future changes should stay incremental and stability-first.

## Intentionally Deferred

- Broad refactor of `app.js`
- Composition/runtime/export extraction beyond the current V2 module boundary
- Export/sheet structure changes
- Larger UX redesign
- New user-facing controls unless real usage proves the need
- AI integration

## Practical Resume Guidance

- V3.0 build 1 on `codex/v2` is the current stable prototype; active development is paused while the owner tests with real references and a few friends.
- Print This View is visible at the first level and separate from sheet export.
- Export contains the 3-sheet preview/export workflow (unchanged - still a no-go zone).
- Squint belongs under Painting, grouped under "Values" along with Grayscale, Notan, and Value Groups; "Colour" holds Temperature Study, Color Study, and Palette Notes.
- Drawing includes Outline Sketch, Value Contours, and Mirror Check.
- Keep crop, export, sheet, and service-worker behavior stable.
- Check `docs/roadmaps/improvement-plan-2026-07.md` for the full history before assuming what "recent" means - several features (Mass Study) were added and then removed within this same checkpoint.
- Continue with real-use testing and only make small, localized fixes; do not start Phase 3 (hold-to-compare, tablet pass) unless the owner asks.
