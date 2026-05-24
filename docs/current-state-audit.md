# Current State Audit

## Version Checkpoint

- Stable working prototype: **V5.2**
- Product type: browser-based deterministic painting-reference tool
- Current posture: stable working app first, refactor later
- Latest checkpoint includes workflow-stage sidebar reorganization, Squint moved to Painting, curated outline presets, painter-facing vocabulary cleanup, and small spacing/layout refinements.

## Current Working Product

Painter's Reference Lab V5.2 is a local-first reference-preparation tool for painters. It supports the path from loading an image through composition selection, drawing aids, painting studies, and exportable reference sheets.

The app is currently treated as a stable prototype, not an active refactor target. Workflow clarity, real-use testing, and small stability-first corrections matter more than architectural cleanup.

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
  - Mirror Check
  - Outline Source: Gray, Squint, Original, Notan
  - Outline detail: Simple, Balanced, Detailed
- **Painting**
  - Squint and Squint Softness
  - Grayscale
  - 3-Value Notan
  - Light / Midtone / Shadow masks
  - Temperature Study
  - Palette Notes
- **Export**
  - Export Current View
  - Sheet preview/export controls
- **Info**
  - Status, original size, canvas size, scale, active view, outline detail

## Major Implemented Features

- JPG/PNG image loading
- Aspect-ratio-preserving image fit to canvas
- Composition workflow with focal-point crop studies
- Crop-size slider that updates all composition crop previews and preserves clicked-preview behavior
- Grid overlay with adjustable rows and columns
- Grayscale study
- Squint study
- 3-Value Notan, with a short beginner-friendly UI explanation
- Tonal masks:
  - Light Mask
  - Midtone Mask
  - Shadow Mask
- Warm/cool/neutral Temperature Study
- Palette Notes
- Rough Outline Sketch with Outline Source selection
- Curated outline detail presets:
  - Simple
  - Balanced
  - Detailed
- Mirror Check for drawing review
- Current-view export
- 3-sheet preview/export workflow
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

- **Export Current View** exports the currently rendered canvas view.
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

## Current Stable Architecture

- Static app structure:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `manifest.webmanifest`
  - `service-worker.js`
- Single-file runtime architecture centered in `app.js`
- Deterministic client-side image processing
- Manual browser smoke testing remains the main regression check

## Known Limitations / Observations

- The app is usable, but output should continue to be judged against real painting references.
- Outline recipes may need future calibration, but the visible control surface should stay simple unless real use proves otherwise.
- `app.js` remains large and monolithic.
- Code refactor is intentionally deferred until workflow stabilizes after more real use.
- Future changes should stay incremental and stability-first.

## Intentionally Deferred

- Broad refactor of `app.js`
- Module extraction
- Export/sheet structure changes
- Larger UX redesign
- New user-facing controls unless real usage proves the need
- AI integration

## Practical Resume Guidance

- V5.2 is the current stable prototype.
- Export Current View is visible and separate from sheet export.
- Export contains the 3-sheet preview/export workflow.
- Squint belongs under Painting.
- Drawing should remain outline-focused.
- Keep crop, export, sheet, and service-worker behavior stable.
- Continue with real-use testing and only make small, localized fixes.
