# Contributing to Painter's Reference Lab

Thank you for considering an improvement. This project is a small painter-first tool, so a useful contribution is one that makes observation and preparation clearer without turning the app into a general photo editor.

## Project philosophy

- Supplement painter judgment; do not replace it.
- Keep reference images local to the user's browser.
- Prefer deterministic, understandable image processing over remote or opaque services.
- Keep the visible workflow simple: Reference Image, Composition, Drawing, Painting, Export, and Info.
- Preserve stable crop and export behavior unless a change explicitly targets those areas.
- Add controls only when a real painting use case justifies their ongoing complexity.

## Before starting

1. Read the [current state audit](docs/current-state-audit.md) and [documentation map](docs/README.md).
2. Check existing issues and development-history documents for earlier experiments and decisions.
3. For a substantial change, open an issue describing the painter's need, the proposed behavior, and how it will be verified.

## Local development

The app has no build step or package dependencies. Run a local server from the repository root:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). A local server is required for realistic service-worker behavior.

## Extension guidance

- Put deterministic, reusable processing logic in the appropriate file under `modules/`; keep application state and orchestration in `app.js`.
- Load any new runtime module before `app.js` in `index.html` and add it to `APP_ASSETS` in `service-worker.js`.
- When a shipped local asset changes, update its matching query-string revision in both `index.html` and `service-worker.js`, then change `CACHE_NAME`.
- Keep selected images in memory or local browser storage only. Do not add uploads, telemetry, or third-party processing without explicit project-owner agreement and clear user disclosure.
- Preserve accessible labels, keyboard focus, responsive layout, and light/dark themes.
- Avoid adding a visible build number to the main app header. Use Git tags/releases for public versioning.

## Validation

The public v1.0 release is tested on macOS with Chrome and Safari. Other platforms and browsers are welcome targets for community testing, but they are not systematically covered by the maintainer.

At minimum, manually verify:

- JPG and PNG load/change flow
- original and selected focal crops
- every Drawing and Painting view
- grid and value-band interactions
- Save Current View JPEG download
- preview and export of all three prepared sheets
- light and dark themes
- reload/update behavior with the service worker active

For image-processing changes, compare varied references, including textured, low-key, and high-key images. Explain any intentional visual-output change in the pull request.

## Pull requests

Keep changes focused. Describe the painter-facing reason, list affected files, include the environments tested, and attach before/after screenshots when appearance or output changes.
