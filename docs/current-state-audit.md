# Current State Audit

## Public release checkpoint

- Current public release: **v1.0** on `main`
- Product type: deterministic, browser-based painting-reference tool
- Tested environment: **macOS with Chrome and Safari**
- Support posture: other operating systems and browsers are not systematically tested
- Privacy posture: a chosen image is decoded and processed locally with browser APIs; the app has no image-processing backend or upload path

Earlier V2/V3/build labels and references to `codex/v2` in historical planning documents describe development checkpoints. The branch was merged into `main` and deleted. See [Documentation Map](README.md) before treating an older plan or issue record as current guidance.

## Current product

Painter's Reference Lab supports the path from loading a reference through composition selection, drawing aids, painting studies, and JPEG exports. It is intended to support painter judgment rather than automate it.

### Workflow

- **Reference Image:** local JPG/PNG loading, image change, and adjustable grid
- **Composition:** focal-point selection, adjustable crop size, four rule-of-thirds previews, original/crop choice
- **Drawing:** Outline Sketch, Value Contours, Mirror Check, source selection, and Simple/Balanced/Detailed outline recipes
- **Painting — Values:** Squint in Gray or Colour, Grayscale, adaptive 3-Value Notan, and two-to-five Value Groups with click-to-isolate bands
- **Painting — Colour:** Temperature Study, Color Study palette variants, and Palette Notes
- **Export:** previews and exports the three prepared sheets
- **Save Current View:** downloads the active canvas study as a JPEG, separately from prepared-sheet export
- **Info:** status, original/canvas sizes, scale, active view, and outline detail

Grayscale, Squint, Notan, and Value Groups include a value scale. The underlying Light/Midtone/Shadow processors remain in use for Sheet 2 even though those masks are no longer separate Painting-stage views.

## Prepared sheets

- **Sheet 1 — Value & Drawing:** Original, Grayscale, 3-Value Notan, Outline with grid
- **Sheet 2 — Tonal Masks:** Original, Light, Midtone, Shadow
- **Sheet 3 — Temperature Map:** Original, Warm, Cool, Neutral

The current sheet structure is stable. Current-view export and prepared-sheet export are intentionally separate.

## Runtime architecture

- Static app shell: `index.html`, `styles.css`, `app.js`, `modules/`, `manifest.webmanifest`, and `service-worker.js`
- `app.js` owns state, composition, render routing, and export orchestration
- Focused classic-script modules contain deterministic canvas, value, mask, palette, colour-study, outline, contour, mirror, and Squint helpers
- All reference-image reading and transformation happens client-side; no application code sends the image over the network
- The hosted page loads the DM Sans font from Google Fonts, while the service worker caches local app-shell assets for offline reuse
- Manual browser smoke testing remains the primary regression check

When a shipped local asset changes, update its query-string revision in `index.html` and `service-worker.js`, and update `CACHE_NAME`. Public version text belongs in release documentation or Git tags, not in a prominent app-header build chip.

## Stability guardrails

- Preserve crop selection and prepared-sheet behavior.
- Keep current-view and prepared-sheet export paths separate.
- Keep processors deterministic; avoid implementation-dependent scaling/filter behavior where output consistency matters.
- Retain the simple painter-facing control surface unless real use demonstrates a need.
- Do not remove tonal-mask processing while Sheet 2 depends on it.
- Prefer localized, testable changes over broad refactors of `app.js`.

## Known limitations and deferred work

- Output still requires a painter's judgment and should be evaluated against varied real references.
- Browser coverage is deliberately limited to macOS Chrome and Safari for this release.
- Automated cross-browser regression testing is not present.
- Broader controller/export extraction, a larger UX redesign, and AI integration are deferred.
- PNG PWA icons are included for common install sizes; platform-specific install behavior may still vary outside the tested environment.

## Verification priorities

For changes, test image load/change, focal crops, all study views, value-band isolation, grid behavior, Save Current View, all three sheet previews/exports, theme switching, and service-worker refresh behavior. Use references with varied texture and value ranges when possible.
