# V2 Runtime Dependency Map

This map captures the current `app.js` runtime before V2 code extraction begins. It is a guardrail for behavior-preserving refactors: if a future extraction changes these flows, it should be treated as a regression unless the change is intentional and separately planned.

## High-Risk Runtime Flow

The main fragile path is:

1. user selects local JPG/PNG
2. `handleImageSelection(file)` reads the file and creates an image element
3. `prepareWorkingCanvases()` fits the image into `processed.referenceCanvas`
4. `rebuildWorkingCanvasesFromSource(referenceCanvas)` creates all deterministic derived canvases
5. `renderScene()` chooses the active render path
6. current-view export downloads the currently rendered canvas, while sheet export builds a fresh composite sheet from `state.processed`

This path should be smoke-tested after every extraction.

## Image Load Path

Image loading depends on these helpers and state fields:

- `isSupportedImageFile(file)`
- `fileToImageElement(file)`
- `computeContainSize(...)`
- `createOffscreenCanvas(...)`
- `clearCanvas(...)`
- `drawImageContained(...)`
- `state.originalImage`
- `state.originalWidth`
- `state.originalHeight`
- `state.loadedFileName`
- `state.processed.referenceCanvas`

Important behavior:

- Only JPG and PNG are accepted.
- The source image is fitted into a maximum 1600 x 1600 working area.
- Aspect ratio is preserved.
- The fitted canvas becomes `processed.referenceCanvas`.
- Loading a new image clears the focal point and resets the composition choice to Original.

## Derived Canvas Lifecycle

`rebuildWorkingCanvasesFromSource(sourceCanvas)` is the central rebuild point. It receives either the fitted reference canvas or a selected composition crop canvas.

It updates:

- `processed.originalCanvas`
- `processed.grayscaleCanvas`
- `processed.notanCanvas`
- `processed.lightMaskCanvas`
- `processed.midtoneMaskCanvas`
- `processed.shadowMaskCanvas`
- `processed.warmMaskCanvas`
- `processed.coolMaskCanvas`
- `processed.neutralMaskCanvas`
- `processed.outlineSketchCanvas`
- `processed.squintCanvas`
- `processed.mirrorCanvas`
- `processed.paletteColors`
- `processed.paletteMixNotes`
- `workingCanvasWidth`
- `workingCanvasHeight`
- `workingScale`

Derived canvases are consumed directly by:

- view rendering
- study-sheet previews
- study-sheet export
- current app info labels

## Composition Dependencies

Composition state is split across:

- `state.focalStudy.point`
- `state.focalStudy.cropPercent`
- `state.compositionChoice`
- `focalStudyLayout`
- `COMPOSITION_CROP_OPTIONS`

Important behavior:

- `renderFocalStudyScene()` draws either the original click target or the four crop study panels.
- `handleMainCanvasClick(event)` either places a focal point or selects a crop panel.
- `selectCompositionChoice(choiceKey)` rebuilds all derived canvases from the selected crop or original reference.
- Changing crop size reselects the active crop silently when a crop is already selected.
- `clearCompositionSelection()` clears the point and returns later stages to the original reference.

Do not extract or redesign this flow during the first helper extraction pass.

## Render Routing

`renderScene()` routes the active canvas view:

- sheet preview when `activeStage === "general"` and `studySheetPreview.isOpen`
- focal study when `viewMode === "focalStudy"`
- temperature study when `viewMode === "temperatureStudy"`
- palette notes when `viewMode === "paletteStudy"`
- otherwise a single active base canvas from `getActiveBaseCanvas()`

Single-canvas views draw the active base canvas and then apply the grid overlay if enabled.

Multi-panel views:

- `renderFocalStudyScene()`
- `renderTemperatureStudyScene()`
- `renderPaletteStudyScene()`
- `renderStudySheetPreviewScene()`

Do not extract `renderScene()` or stage/view routing until pure processors and export helpers have safer boundaries.

## View And Stage State

View selection depends on:

- `state.viewMode`
- `state.activeStage`
- `state.stageSelections`
- `getStageForViewMode(viewMode)`
- `setViewMode(nextViewMode)`
- `updateStagePanels()`
- `updateViewModeButtons()`

Important behavior:

- Stage toggles restore the last selected view for that stage.
- Opening Export with a loaded image opens sheet preview.
- Selecting any normal view closes sheet preview.
- Drawing, Painting, and Export controls show/hide based on active view/stage.

## Export Dependencies

Current-view export:

- uses the already-rendered `mainCanvas`
- creates a filename from `loadedFileName` and the current view label
- downloads JPEG at quality `0.92`

Study-sheet preview/export:

- `getStudySheetDefinition(sheetKey)` reads from `state.processed`
- `buildStudySheetCanvas(sheetKey, { shouldDownload })` delegates to `createCompositeSheet(...)`
- `renderStudySheetPreviewScene()` draws the generated composite sheet to `mainCanvas`
- `exportActiveStudySheet()` builds and downloads the selected sheet

Important behavior:

- Current-view export and sheet export remain separate.
- Sheet 1 contains Original, Grayscale, 3-Value Notan, and gridded Outline.
- Sheet 2 contains Original, Light Mask, Midtone Mask, and Shadow Mask.
- Sheet 3 contains Original, Warm Mask, Cool Mask, and Neutral Mask.

Extract export helpers only after pure processor extraction has passed smoke checks.

## Service Worker Cache Expectations

`service-worker.js` caches:

- `./`
- `./index.html`
- `./styles.css`
- `./app.js`
- `./manifest.webmanifest`
- `./icons/icon.svg`

Important behavior:

- Cache name is explicit.
- App shell changes should bump `CACHE_NAME`.
- The fetch handler serves cached assets first and falls back to `index.html` when offline.

When V2 introduces new module files, those files must be added to `APP_ASSETS` and the cache version must be bumped.

## First Extraction Boundary Candidates

Lowest-risk candidates:

- canvas sizing, clearing, cloning, and contained-image helpers
- grayscale processor
- Notan processor

Medium-risk candidates:

- tonal masks
- temperature masks
- squint and outline helpers
- palette extraction and palette note rendering

Higher-risk candidates:

- composition crop flow
- render routing
- event handlers
- state shape
- export and sheet builders

The first code extraction should start only with the lowest-risk candidates.
