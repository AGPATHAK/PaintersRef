# Painter's Reference Lab

Painter's Reference Lab is a small browser app for painters who want to turn one reference image into practical study material before and during a painting.

It supports a simple studio workflow: choose a reference image, test composition, prepare drawing aids, review painting studies, and export reference sheets.

## Live App

https://agpathak.github.io/PaintersRef/

No install or account needed - open the link and load an image. It also works as an installable, offline-friendly app (see PWA Notes below).

---

## For Painters

### What It Does

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
  - Value Contours
  - Mirror Check
  - Outline Source: Gray, Squint, Original, Notan
  - Curated outline detail: Simple, Balanced, Detailed
- Provides painting studies:
  - Squint (Gray or Colour mode)
  - Grayscale
  - 3-Value Notan (adaptive cutoffs, manual sliders, Reset to Auto)
  - Value Groups (2-5 adaptive value bands; click a band on the scale to isolate it, click again to show all bands)
  - Temperature Study
  - Color Study palette variants
  - Palette Notes
- Draws a click-to-read value scale alongside Grayscale, Squint, Notan, and Value Groups
- Adds a configurable grid with adjustable rows and columns
- Includes a light/dark interface toggle for different studio lighting conditions
- Prints the active study view directly as a JPEG
- Previews and exports three prepared study sheets
- Works as a Progressive Web App (PWA) for installable, offline-friendly use

### Quick Use

1. Open the live app.
2. Load a JPG or PNG reference image.
3. Move through the workflow stages on the left:
   - `Reference Image`: load/change the image and adjust the grid
   - `Composition`: place a point of interest, keep the original, or select one of four crop studies
   - `Drawing`: use `Outline Sketch`, `Value Contours`, `Mirror Check`, `Outline Source`, and `Simple / Balanced / Detailed`
   - `Painting`: use `Squint` (Gray/Colour), grayscale, Notan, Value Groups (click a band to isolate it), temperature, Color Study, and palette views
   - `Export`: preview/export prepared sheets
   - `Info`: check status, size, scale, active view, and outline detail
4. Adjust painter-facing controls when needed:
   - crop size
   - Squint Softness
   - Notan shadow/light cutoffs
   - Focus on Color
   - Warm/Cool Balance
5. Use `Print This View` for the active study, or export one of the prepared sheets.

### Export Sheets

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

### Workflow

- `Reference Image`
  Load a local image, change the loaded image, and adjust the grid overlay.
- `Composition`
  `Focal Study` creates four rule-of-thirds crop options around a chosen point of interest. The selected crop, or the original image, becomes the working reference for later stages.
- `Drawing`
  `Outline Sketch` supports block-in, `Value Contours` groups value boundaries for simplified drawing decisions, and `Mirror Check` helps with structural checking. Outline generation uses a selected source and curated Simple / Balanced / Detailed recipes.
- `Painting`
  `Squint` (Gray/Colour), grayscale, Notan, Value Groups (with click-to-isolate a value band), Temperature Study, Color Study, and Palette Notes help simplify value and color relationships while painting. Light/Midtone/Shadow masks still exist internally for Sheet 2's export, but are no longer separate Painting-stage views - Value Groups' isolate feature replaced them.
- `Export`
  Preview/export prepared study sheets. Use `Print This View` for the active canvas study.
- `Info`
  Shows compact status and image/view metadata.

### PWA Notes

- The hosted GitHub Pages build is installable as a PWA in supported browsers (look for an install/add-to-home-screen option in your browser)
- Once installed, the app shell works offline
- Theme preference (light/dark) is stored locally in your browser

### Feedback

This is a small, actively-tweaked tool. If something looks wrong or a control is confusing, that's useful to know - pass it along to whoever shared the link with you.

---

## For Developers

### Local Development

Serve the app from a local web server instead of opening `index.html` directly. This is especially helpful because the app registers a service worker.

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

### PWA Implementation Notes

- `manifest.webmanifest` defines install metadata
- `service-worker.js` caches the app shell for offline reuse
- `icons/icon.svg` provides the app icon

### Project Files

- `index.html` - app structure and controls
- `styles.css` - layout and visual styling
- `app.js` - app state, workflow controls, view switching, render routing, and export orchestration
- `modules/` - deterministic canvas/image processors loaded as classic browser scripts before `app.js`
- `manifest.webmanifest` - PWA manifest
- `service-worker.js` - offline caching

### Architecture & Versioning Notes

`modules/` has a behavior-preserving module split for deterministic processors:

- canvas utilities
- grayscale / Notan / Value Groups processors
- tonal and temperature masks
- palette notes and Color Study variants
- outline, Value Contours, mirror, and Squint helpers

As of 2026-07-21 the app is versioned **V3.0** to mark a major milestone: the Squint pipeline was fully rewritten (deterministic downscale -> iterated bilateral filter -> soft value quantisation -> upscale), Outline now traces boundaries from Squint's output instead of raw Sobel gradients, and the Painting stage's value tools were consolidated (Value Groups gained click-to-isolate, replacing the separate Light/Midtone/Shadow Mask views). See `docs/roadmaps/improvement-plan-2026-07.md` for the full history.

The visible build chip in the header shows the loaded build (e.g. "V3.0 build 1"). When app-shell files change, bump the build label, script query strings, and service-worker cache together so stale loads are easy to spot.

All work now happens directly on `main`; the `codex/v2` branch it was developed on has been merged and deleted.

### Planning Documents

Future AI-assisted features are documented as an optional extension, not as a replacement for the current deterministic workflow.

- [Current State Audit](docs/current-state-audit.md)
- [Next Session Brief](docs/next-session-brief.md)
- [2026-07 Improvement Plan](docs/roadmaps/improvement-plan-2026-07.md) - Squint rewrite, Outline-via-Squint, Value Groups, and the Values-group consolidation into V3.0
- [Milestones](docs/milestones.md)
- [Issues Backlog](docs/issues-backlog.md)
- [Workflow Stage Restructure Roadmap](docs/roadmaps/workflow-stage-restructure-roadmap.md)
- [M1 Smoke Test](docs/m1-smoke-test.md)
- [M1 Reference Screenshots](docs/m1-reference-screenshots.md)

### Current Product Posture

The current app (V3.0) is stable and usable; active development is paused as of 2026-07-21 while the owner tests it across varied references and shares it with a few people. The next work should come from that real-use feedback: fix concrete regressions, make small terminology/layout polish changes when they reduce friction, and keep exports/crop/service-worker behavior stable.

Avoid tool sprawl, generic image editing, Photoshop-like workflows, and features that replace painter judgment instead of supporting it.
