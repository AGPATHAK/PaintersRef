# Painter's Reference Lab

Painter's Reference Lab is a browser app that turns one reference image into practical composition, drawing, value, and colour studies. It is designed to supplement a painter's judgment, not replace it.

## Open the app

**[Launch Painter's Reference Lab](https://agpathak.github.io/PaintersRef/)**

No account or installation is required. Choose a local JPG or PNG and begin. Image processing happens locally in your browser: the app does not upload your reference image to a server.

## For painters

The app follows a studio-oriented workflow:

1. **Reference Image** — load or change the image and add an adjustable grid.
2. **Composition** — place a point of interest and compare four rule-of-thirds crop studies.
3. **Drawing** — use Outline Sketch, Value Contours, Mirror Check, and three outline-detail levels.
4. **Painting** — compare Squint, Grayscale, 3-Value Notan, Value Groups, Temperature Study, Color Study, and Palette Notes.
5. **Export** — preview and export three prepared study sheets.

Use **Save Current View** to download the study currently shown on the canvas as a JPEG. This is separate from the prepared sheet exports.

### Prepared sheets

- **Sheet 1 — Value & Drawing:** Original, Grayscale, Notan, and a gridded Outline.
- **Sheet 2 — Tonal Masks:** Original, Light, Midtone, and Shadow masks.
- **Sheet 3 — Temperature Map:** Original, Warm, Cool, and Neutral masks.

### Privacy, browser support, and installation

- Reference images are read and processed locally in the browser. They are not sent to this project or a remote processing service.
- The public v1.0 release has been tested on **macOS with Chrome and Safari**.
- Other operating systems and browsers are not systematically tested. They may work, but are not currently part of the project's testing commitment.
- The hosted app can be installed as a Progressive Web App in supported browsers and its app shell is available offline after it has been cached. Your selected image remains local to your device.
- Light/dark preference is stored locally in the browser.

If something looks wrong or a control is confusing, please [open a GitHub issue](https://github.com/AGPATHAK/PaintersRef/issues).

## For developers and contributors

Public release: **v1.0**. Earlier V2/V3/build labels in planning documents describe internal development checkpoints; they are retained as project history and are not the current public version.

The app is a dependency-free static site. Serve it through a local web server rather than opening `index.html` directly, because it registers a service worker:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

### Project structure

- `index.html` — app structure, controls, metadata, and script order
- `styles.css` — layout and visual styling
- `app.js` — state, workflow controls, rendering, and export orchestration
- `modules/` — deterministic canvas/image processors loaded before `app.js`
- `manifest.webmanifest` — install metadata and PWA icons
- `service-worker.js` — offline app-shell cache
- `docs/current-state-audit.md` — current behavior and maintenance guardrails
- `docs/README.md` — current-documentation and development-history map

All image transforms are deterministic and run client-side using browser canvas APIs. There is no backend, image upload, build step, package manager, or analytics integration in this repository.

Before proposing a change, read [CONTRIBUTING.md](CONTRIBUTING.md). Keep the painter-first workflow, local processing, exports, crop behavior, and simple visible controls intact unless a change is supported by real use.

## License

Released under the [MIT License](LICENSE).
