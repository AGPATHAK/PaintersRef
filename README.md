# Painter's Reference Lab

Painter's Reference Lab is a small browser app for painters who want to turn one reference image into practical study material before and during a painting.

It supports a simple studio workflow: choose a reference image, test composition, prepare drawing aids, review painting studies, and export reference sheets.

## Live App

GitHub Pages deployment:

https://agpathak.github.io/PaintersRef/

## What It Does

- Loads a local JPG or PNG reference image
- Preserves aspect ratio while fitting the image to the working canvas
- Organizes tools by workflow stage:
  - Reference Image
  - Composition
  - Drawing
  - Painting
  - Export
  - Info
- Provides drawing aids:
  - Outline Sketch
  - Mirror Check
  - Outline Source: Gray, Squint, Original, Notan
  - Curated outline detail: Simple, Balanced, Detailed
- Provides painting studies:
  - Squint
  - Grayscale
  - 3-Value Notan
  - Light Mask
  - Midtone Mask
  - Shadow Mask
  - Temperature Study
  - Palette Notes
- Adds a configurable grid with adjustable rows and columns
- Includes a light/dark interface toggle for different studio lighting conditions
- Exports the current view directly as a JPEG
- Previews and exports three prepared study sheets
- Works as a Progressive Web App (PWA) for installable, offline-friendly use

## Quick Use

1. Open the live app.
2. Load a JPG or PNG reference image.
3. Move through the workflow stages on the left:
   - `Reference Image`: load/change the image and adjust the grid
   - `Composition`: place a point of interest, keep the original, or select one of four crop studies
   - `Drawing`: use `Outline Sketch`, `Mirror Check`, `Outline Source`, and `Simple / Balanced / Detailed`
   - `Painting`: use `Squint`, grayscale, Notan, masks, temperature, and palette views
   - `Export`: export the current view or preview/export prepared sheets
   - `Info`: check status, size, scale, active view, and outline detail
4. Adjust painter-facing controls when needed:
   - crop size
   - Squint Softness
   - Notan shadow/light cutoffs
   - Focus on Color
   - Warm/Cool Balance
5. Export the current view or one of the prepared sheets.

## Export Sheets

`Sheet 1`

- Original
- Grayscale
- Notan
- Outline
- Grid applied to the outline panel only

`Sheet 2`

- Original
- Light Mask
- Midtone Mask
- Shadow Mask

`Sheet 3`

- Original
- Warm Mask
- Cool Mask
- Neutral Mask

## Workflow

- `Reference Image`
  Load a local image, change the loaded image, and adjust the grid overlay.
- `Composition`
  `Focal Study` creates four rule-of-thirds crop options around a chosen point of interest. The selected crop, or the original image, becomes the working reference for later stages.
- `Drawing`
  `Outline Sketch` supports block-in, and `Mirror Check` helps with structural checking. Outline generation uses a selected source and curated Simple / Balanced / Detailed recipes.
- `Painting`
  `Squint`, grayscale, Notan, value masks, Temperature Study, and Palette Notes help simplify value and color relationships while painting.
- `Export`
  Export the current canvas view or preview/export prepared study sheets.
- `Info`
  Shows compact status and image/view metadata.

## Local Development

Serve the app from a local web server instead of opening `index.html` directly. This is especially helpful because the app registers a service worker.

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## PWA Notes

- `manifest.webmanifest` defines install metadata
- `service-worker.js` caches the app shell for offline reuse
- `icons/icon.svg` provides the app icon
- The hosted GitHub Pages build is installable as a PWA in supported browsers
- Theme preference is stored locally in the browser

## Project Files

- `index.html` - app structure and controls
- `styles.css` - layout and visual styling
- `app.js` - app state, workflow controls, view switching, render routing, and export orchestration
- `modules/` - deterministic canvas/image processors loaded as classic browser scripts before `app.js`
- `manifest.webmanifest` - PWA manifest
- `service-worker.js` - offline caching

## V2 Refactor Branch Notes

The `codex/v2` branch has a behavior-preserving module split for deterministic processors:

- canvas utilities
- grayscale / Notan processors
- tonal and temperature masks
- palette notes
- outline, mirror, and Squint helpers

The visible build chip in the header shows the loaded V2 build. When app-shell files change, bump the build label, script query strings, and service-worker cache together so stale loads are easy to spot.

## Planning Documents

Future AI-assisted features are documented as an optional extension, not as a replacement for the current deterministic workflow.

- [Current State Audit](docs/current-state-audit.md)
- [Next Session Brief](docs/next-session-brief.md)
- [Milestones](docs/milestones.md)
- [Issues Backlog](docs/issues-backlog.md)
- [Workflow Stage Restructure Roadmap](docs/roadmaps/workflow-stage-restructure-roadmap.md)
- [M1 Smoke Test](docs/m1-smoke-test.md)
- [M1 Reference Screenshots](docs/m1-reference-screenshots.md)

## Current Product Posture

The current app is stable and usable. The next work should come from real painting use: fix concrete regressions, make small terminology/layout polish changes when they reduce friction, and keep exports/crop/service-worker behavior stable.

Avoid tool sprawl, generic image editing, Photoshop-like workflows, and features that replace painter judgment instead of supporting it.
