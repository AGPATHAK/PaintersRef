# Current State Audit

## Version Checkpoint

- Stable working prototype: **V5.2**
- Product type: browser-based deterministic painting-reference tool
- Current posture: stable working app first, refactor later
- Latest checkpoint includes issue-081 composition/painting UI cleanup and issue-082 outline/temperature calibration

## Current Working Product

Painter's Reference Lab V5.2 is a working local-first reference-preparation tool for painters. It supports the full path from loading an image through composition selection, simplified studies, and exportable reference sheets.

The app is currently being treated as a stable prototype rather than an active refactor target. Workflow clarity, real-use testing, and small stability-first corrections matter more than architectural cleanup.

## Major Implemented Features

- JPG/PNG image loading
- Aspect-ratio-preserving image fit to canvas
- Composition workflow with focal-point crop studies
- Crop-size slider that updates all composition crop previews and preserves clicked-preview selection behavior
- Grid overlay with adjustable rows and columns
- Grayscale study
- Squint study
- 3-value Notan
- Tonal masks:
  - Light Mask
  - Midtone Mask
  - Shadow Mask
- Warm/cool/neutral temperature study
- Rough outline sketch with calibrated Low / Medium / High detail presets
- Mirror Check for drawing review
- Current-view export
- Composite preview/export workflow with 3 prepared sheets
- Light/dark theme toggle
- PWA-compatible static app structure

## 3-Sheet Workflow

The app includes a preview workflow with three prepared sheets under **Previews**. These sheets are intended to support practical painting decisions, not to replace artist judgment.

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
- Keep mask output readable and coherent without over-processing.

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

- **Export Current View** is a visible top-level action in the main control panel.
- Current-view export exports the currently rendered view.
- The **Previews** stage opens directly into the sheet-preview workflow.
- Users can preview Sheet 1 / Sheet 2 / Sheet 3 before exporting a sheet.
- Sheet export is routed through the preview workflow.
- Current view export remains separate from sheet export.
- The current sheet structure is stable and should not be changed casually.

## Recent Usability Improvements

Issue-081 completed a small UI cleanup pass:

- Composition guidance is more visible.
- Crop-size slider responsiveness was restored for all composition crop previews.
- A clicked crop still matches the preview used for later stages.
- Painting-mode button layout was cleaned up for the current sidebar width.
- Drawing-mode buttons were corrected after the painting layout change.
- A thin separator now distinguishes Temperature Study and Palette Notes in the painting controls.
- Drawing output was kept lighter and rougher rather than pushed toward a transfer-drawing feel.

## Recent Calibration Improvements

Issue-082 completed a conservative calibration pass:

- Outline presets were recalibrated so Low / Medium / High are less busy and more distinct.
- Outline thresholding was nudged toward cleaner rough sketches, especially for dense subjects such as architecture and foliage.
- Warm/cool/neutral masks now require a small amount of actual chroma before a color is treated as warm or cool, which keeps weak near-neutrals from being overclassified.
- No additional tonal-mask cleanup pass was added; current tonal masks remain simple and stable.

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

- UI is functional and usable, but can still receive small aesthetics/spacing polish after more use.
- Outline and temperature calibration should continue to be judged against real painting references.
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

If a future session needs to resume quickly:

- V5.2 is the current stable prototype.
- Export Current View is visible and separate from sheet export.
- Previews contains the 3-sheet workflow.
- Issue-081 and issue-082 improvements are already part of the current expected behavior.
- Continue with real-use testing and only make small, localized fixes.
