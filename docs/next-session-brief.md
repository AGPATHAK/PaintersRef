# Next Session Brief

## Stable Version

- Current stable checkpoint: **V5.2**
- Latest completed direction: workflow/sidebar cleanup, Squint moved to Painting, curated outline presets, painter-facing vocabulary cleanup, and docs alignment.

## What Is Working

- Image loading
- Reference Image stage with grid controls
- Composition focal-point workflow with adjustable crop previews
- Selected crop becomes the working reference for later stages
- Drawing stage:
  - Outline Sketch
  - Mirror Check
  - Outline Source
  - Simple / Balanced / Detailed outline detail
- Painting stage:
  - Squint and Squint Softness
  - Grayscale
  - 3-Value Notan
  - Light / Midtone / Shadow masks
  - Warm / Cool / Neutral Temperature Study
  - Palette Notes
- Export Current View
- Export stage with 3 prepared sheet previews
- Sheet export from the preview workflow
- Info stage with compact status and image/view metadata

## Current 3-Sheet Workflow

- **Sheet 1 - Value & Drawing**
  - Original
  - Grayscale
  - 3-Value Notan
  - Outline with grid
- **Sheet 2 - Tonal Masks**
  - Original
  - Light Mask
  - Midtone Mask
  - Shadow Mask
- **Sheet 3 - Temperature Map**
  - Original
  - Warm Mask
  - Cool Mask
  - Neutral Mask

## What To Test During Continued Use

- Whether crop-size changes feel natural across different focal-point placements
- Whether selected composition crops match the preview the user clicked
- Whether Simple / Balanced / Detailed outline recipes are useful on architecture, foliage, portraits, and simpler still-life references
- Whether Squint belongs comfortably in Painting during real use
- Whether warm/cool/neutral masks feel painter-useful across different lighting situations
- Whether the 3-sheet preview/export workflow remains clear after repeated use
- Whether sidebar spacing and small-screen behavior need any further polish

## What Not To Casually Change

- Current export logic
- The 3-sheet workflow structure
- Preview/sheet wiring
- Crop workflow
- Service worker behavior
- The simplified visible Outline control surface
- Broad `app.js` refactor

## Likely Next Priorities

1. Keep using the app on real painting references.
2. Fix only concrete regressions or repeated workflow friction.
3. Calibrate outline recipes only when real examples justify it.
4. Make small UI polish changes only where the current layout gets in the way.
5. Keep docs aligned when behavior or wording changes.
6. Revisit refactor planning only after more stable usage feedback.
