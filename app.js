/**
 * Painter's Reference Lab
 * Painter-first reference workflow for composition, observation, drawing, and painting studies.
 *
 * Adds:
 * - Composition crop studies that can become the working reference
 * - Squint, outline, notan, temperature, and palette-note views
 * - Current-view export and prepared composite export sheets
 */

/* ==================================================
   Maintainer Map
   ==================================================
   M1 intentionally keeps this as a stable single-script app.
   Previous module-loading experiments caused browser image-load regressions,
   so preserve script order and extract only after smoke coverage improves.

   High-risk flow:
   image file -> reference canvas -> composition choice -> derived canvases
   -> renderScene/export sheets.
*/

/* ==================================================
   App Configuration / Constants
   ================================================== */

const APP_VERSION_LABEL = "V3.0 build 2";
const SUPPORTED_TYPES = ["image/jpeg", "image/png"];

const COMPOSITION_CROP_OPTIONS = [
  {
    key: "upperLeftThird",
    label: "Upper Left Third",
    intersectionX: 1 / 3,
    intersectionY: 1 / 3
  },
  {
    key: "upperRightThird",
    label: "Upper Right Third",
    intersectionX: 2 / 3,
    intersectionY: 1 / 3
  },
  {
    key: "lowerLeftThird",
    label: "Lower Left Third",
    intersectionX: 1 / 3,
    intersectionY: 2 / 3
  },
  {
    key: "lowerRightThird",
    label: "Lower Right Third",
    intersectionX: 2 / 3,
    intersectionY: 2 / 3
  }
];

/* ==================================================
   Image Loading Helpers
   ================================================== */

function isSupportedImageFile(file) {
  return Boolean(file && SUPPORTED_TYPES.includes(file.type));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function createImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not create image element."));
    image.src = src;
  });
}

async function fileToImageElement(file) {
  const dataUrl = await readFileAsDataURL(file);
  return createImageElement(dataUrl);
}

/* ==================================================
   Core Canvas And Painting Transforms
   ================================================== */

/* ==================================================
   View Composition And Export Helpers
   ================================================== */

/* ---------------------------------
   Grid overlay utilities
--------------------------------- */

function drawGridOverlay(ctx, canvas, options) {
  const { rows, columns, lineThickness, opacity } = options;

  const cellWidth = canvas.width / columns;
  const cellHeight = canvas.height / rows;

  const drawGridLines = (strokeStyle, strokeWidth, alpha) => {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = strokeWidth;

    for (let col = 1; col < columns; col += 1) {
      const x = col * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let row = 1; row < rows; row += 1) {
      const y = row * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  drawGridLines("#ffffff", lineThickness + 2, opacity * 0.78);
  drawGridLines("#111111", lineThickness, opacity * 0.82);
}

/* ---------------------------------
   Value scale strip (2.2)
--------------------------------- */

// Views where reading an absolute value (not hue or a curated mask) is the
// point, so a click-to-read scale earns its place along the canvas edge.
const VALUE_STRIP_VIEW_MODES = ["grayscale", "squint", "notan", "valueGroups"];

function getValueStripWidth(imageWidth) {
  return clamp(Math.round(imageWidth * 0.05), 40, 70);
}

// Drawn directly onto the main canvas (not a separate overlay element) so
// Print This View captures it like any other pixel. Step 10 (white) sits at
// the top and step 0 (black) at the bottom, matching how painters read a
// value scale - light at the top, dark at the bottom.
function drawValueStripOverlay(ctx, options) {
  const { x, width, height, highlightStep } = options;
  const steps = 11;
  const stepHeight = height / steps;

  for (let step = 0; step < steps; step += 1) {
    const gray = Math.round((step / (steps - 1)) * 255);
    const y = (steps - 1 - step) * stepHeight;

    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(x, y, width, stepHeight);
  }

  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1;

  for (let step = 1; step < steps; step += 1) {
    const y = step * stepHeight;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  ctx.strokeRect(x + 0.5, 0.5, width - 1, height - 1);
  ctx.restore();

  ctx.save();
  ctx.font = "600 11px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  [0, 5, 10].forEach((labelStep) => {
    const centerY = ((steps - 1 - labelStep) * stepHeight) + (stepHeight / 2);
    ctx.fillStyle = labelStep <= 4 ? "#ffffff" : "#111111";
    ctx.fillText(String(labelStep), x + (width / 2), centerY);
  });

  ctx.restore();

  if (highlightStep !== null && highlightStep !== undefined) {
    const y = (steps - 1 - highlightStep) * stepHeight;

    ctx.save();
    ctx.strokeStyle = "#c4682e";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, width - 3, stepHeight - 3);
    ctx.restore();
  }
}

// Value Groups' own strip variant: exactly `count` segments (not the generic
// 11), each filled with that band's real output grey, so the strip matches
// the image's actual palette 1:1. Clicking a segment isolates that band -
// this replaces the old Light/Midtone/Shadow Mask views, generalised to
// however many bands are currently selected instead of a fixed three.
function drawValueGroupsBandStripOverlay(ctx, options) {
  const { x, width, height, count, isolatedBand } = options;
  const maxBandIndex = count - 1;
  const stepHeight = height / count;

  for (let band = 0; band < count; band += 1) {
    const gray = Math.round((band / maxBandIndex) * 255);
    const y = (maxBandIndex - band) * stepHeight;

    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(x, y, width, stepHeight);
  }

  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1;

  for (let band = 1; band < count; band += 1) {
    const y = band * stepHeight;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  ctx.strokeRect(x + 0.5, 0.5, width - 1, height - 1);
  ctx.restore();

  if (isolatedBand !== null && isolatedBand !== undefined) {
    const y = (maxBandIndex - isolatedBand) * stepHeight;

    ctx.save();
    ctx.strokeStyle = "#c4682e";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, width - 3, stepHeight - 3);
    ctx.restore();
  }
}

/* ---------------------------------
   Export utilities
--------------------------------- */

function downloadCanvas(canvas, filename, mimeType, quality = 0.92) {
  const link = document.createElement("a");

  if (typeof canvas.toBlob === "function") {
    canvas.toBlob((blob) => {
      if (!blob) {
        alert("The export could not be generated.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = filename;
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    }, mimeType, quality);
    return;
  }

  link.href = canvas.toDataURL(mimeType, quality);
  link.download = filename;
  link.click();
}

function drawPanel(ctx, panelCanvas, x, y, width, height, label, options = {}) {
  const {
    showGrid = false,
    gridOptions = null,
    labelHeight = 38,
    overlayDrawer = null,
    sublabel = "",
    isSelected = false
  } = options;

  ctx.save();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);

  const imageAreaHeight = height - labelHeight;
  const fitted = computeContainSize(panelCanvas.width, panelCanvas.height, width, imageAreaHeight);

  const drawX = x + Math.round((width - fitted.width) / 2);
  const drawY = y + Math.round((imageAreaHeight - fitted.height) / 2);

  ctx.drawImage(panelCanvas, drawX, drawY, fitted.width, fitted.height);

  if (showGrid && gridOptions) {
    const overlayCanvas = createOffscreenCanvas(fitted.width, fitted.height);
    const overlayCtx = overlayCanvas.getContext("2d");
    clearCanvas(overlayCtx, overlayCanvas);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawGridOverlay(overlayCtx, overlayCanvas, gridOptions);
    ctx.drawImage(overlayCanvas, drawX, drawY);
  }

  if (typeof overlayDrawer === "function") {
    overlayDrawer(ctx, {
      x: drawX,
      y: drawY,
      width: fitted.width,
      height: fitted.height
    });
  }

  ctx.strokeStyle = isSelected ? "#9b7a4a" : "#d9d2c4";
  ctx.lineWidth = isSelected ? 3 : 1;
  ctx.strokeRect(x, y, width, imageAreaHeight);

  ctx.fillStyle = "#2f2a24";
  ctx.font = "600 18px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = sublabel ? "alphabetic" : "middle";
  if (sublabel) {
    const labelBaseY = y + imageAreaHeight + 24;
    ctx.fillText(label, x + width / 2, labelBaseY);

    ctx.fillStyle = "#6f665c";
    ctx.font = "500 13px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.fillText(sublabel, x + width / 2, labelBaseY + 19);
  } else {
    ctx.fillText(label, x + width / 2, y + imageAreaHeight + (labelHeight / 2));
  }

  ctx.restore();

  return {
    x: drawX,
    y: drawY,
    width: fitted.width,
    height: fitted.height
  };
}

// TODO(M2): isolate export builders after test harness exists.
// Export sheets read directly from processed canvas state, so keep this stable in M1.
function createCompositeSheet(panels, filename, options = {}) {
  const {
    title = "Painter's Reference Lab",
    sheetWidth = 1800,
    margin = 60,
    gutter = 40,
    topTitleHeight = 60,
    bottomMargin = 40,
    labelHeight = 38,
    panelAspectRatio = 0.75,
    shouldDownload = true
  } = options;

  const columns = 2;
  const rows = 2;
  const panelWidth = Math.floor((sheetWidth - (margin * 2) - gutter) / columns);
  const panelImageHeight = Math.round(panelWidth * panelAspectRatio);
  const panelHeight = panelImageHeight + labelHeight;
  const sheetHeight =
    topTitleHeight + margin + (rows * panelHeight) + gutter + bottomMargin;

  const sheetCanvas = createOffscreenCanvas(sheetWidth, sheetHeight);
  const ctx = sheetCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

  ctx.fillStyle = "#2f2a24";
  ctx.font = "700 28px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, margin, Math.round(topTitleHeight / 2));

  panels.forEach((panel, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = margin + col * (panelWidth + gutter);
    const y = topTitleHeight + margin + row * (panelHeight + gutter);

    drawPanel(ctx, panel.canvas, x, y, panelWidth, panelHeight, panel.label, {
      showGrid: panel.showGrid,
      gridOptions: panel.gridOptions,
      labelHeight
    });
  });

  if (shouldDownload && filename) {
    downloadCanvas(sheetCanvas, filename, "image/jpeg", 0.92);
  }

  return sheetCanvas;
}

function createExportFileStem(fileName) {
  if (!fileName) {
    return "painters-ref";
  }

  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const sanitized = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "painters-ref";
}

/* ---------------------------------
   Focal study utilities
--------------------------------- */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCompositionCropScale(sourceCanvas, focalPoint, options = {}) {
  const {
    cropPercent = 72,
    intersectionX = 1 / 3,
    intersectionY = 1 / 3
  } = options;
  const safeCropPercent = clamp(cropPercent, 55, 95);
  const safeIntersectionX = clamp(intersectionX, 0.05, 0.95);
  const safeIntersectionY = clamp(intersectionY, 0.05, 0.95);
  const safeFocalPoint = {
    x: clamp(focalPoint.x, 1, sourceCanvas.width - 1),
    y: clamp(focalPoint.y, 1, sourceCanvas.height - 1)
  };
  const requestedScale = safeCropPercent / 100;
  const horizontalScale = Math.min(
    requestedScale,
    safeFocalPoint.x / (sourceCanvas.width * safeIntersectionX),
    (sourceCanvas.width - safeFocalPoint.x) / (sourceCanvas.width * (1 - safeIntersectionX))
  );
  const verticalScale = Math.min(
    requestedScale,
    safeFocalPoint.y / (sourceCanvas.height * safeIntersectionY),
    (sourceCanvas.height - safeFocalPoint.y) / (sourceCanvas.height * (1 - safeIntersectionY))
  );

  return Math.max(0.02, Math.min(horizontalScale, verticalScale, requestedScale));
}

// Focal crop output can become the working reference for later stages.
// Keep this helper deterministic; controller state decides when it is used.
function createCompositionCropCanvas(sourceCanvas, focalPoint, options = {}) {
  const {
    cropPercent = 72,
    intersectionX = 1 / 3,
    intersectionY = 1 / 3,
    cropScale = null
  } = options;
  const safeIntersectionX = clamp(intersectionX, 0.05, 0.95);
  const safeIntersectionY = clamp(intersectionY, 0.05, 0.95);
  const safeFocalPoint = {
    x: clamp(focalPoint.x, 1, sourceCanvas.width - 1),
    y: clamp(focalPoint.y, 1, sourceCanvas.height - 1)
  };
  const safeScale = cropScale ?? getCompositionCropScale(sourceCanvas, safeFocalPoint, {
    cropPercent,
    intersectionX: safeIntersectionX,
    intersectionY: safeIntersectionY
  });
  const cropWidth = Math.max(1, Math.round(sourceCanvas.width * safeScale));
  const cropHeight = Math.max(1, Math.round(sourceCanvas.height * safeScale));
  const cropX = Math.round(clamp(
    safeFocalPoint.x - (cropWidth * safeIntersectionX),
    0,
    sourceCanvas.width - cropWidth
  ));
  const cropY = Math.round(clamp(
    safeFocalPoint.y - (cropHeight * safeIntersectionY),
    0,
    sourceCanvas.height - cropHeight
  ));

  const outputCanvas = createOffscreenCanvas(cropWidth, cropHeight);
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return {
    canvas: outputCanvas,
    cropRect: {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    },
    target: {
      x: safeIntersectionX,
      y: safeIntersectionY
    }
  };
}

function drawThirdsOverlay(ctx, imageRect) {
  ctx.save();
  ctx.strokeStyle = "rgba(47, 42, 36, 0.36)";
  ctx.lineWidth = 1.5;

  for (let index = 1; index <= 2; index += 1) {
    const x = imageRect.x + ((imageRect.width * index) / 3);
    const y = imageRect.y + ((imageRect.height * index) / 3);

    ctx.beginPath();
    ctx.moveTo(x, imageRect.y);
    ctx.lineTo(x, imageRect.y + imageRect.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(imageRect.x, y);
    ctx.lineTo(imageRect.x + imageRect.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCompositionPointMarker(ctx, imageRect, cropStudy, focalPoint) {
  if (!cropStudy || !focalPoint) {
    return;
  }

  const centerX = imageRect.x + (cropStudy.target.x * imageRect.width);
  const centerY = imageRect.y + (cropStudy.target.y * imageRect.height);

  ctx.save();
  ctx.strokeStyle = "rgba(203, 112, 55, 0.96)";
  ctx.fillStyle = "rgba(203, 112, 55, 0.96)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/* ==================================================
   App Controller / Runtime State
   ================================================== */

class PaintersReferenceApp {
  constructor() {
    this.dom = {
      imageInput: document.getElementById("imageInput"),
      referenceUploadBlock: document.getElementById("referenceUploadBlock"),
      referenceSummary: document.getElementById("referenceSummary"),
      referenceFileName: document.getElementById("referenceFileName"),
      headerFileChip: document.getElementById("headerFileChip"),
      appVersionChip: document.getElementById("appVersionChip"),
      themeToggleButton: document.getElementById("themeToggleButton"),
      changeImageButton: document.getElementById("changeImageButton"),
      mainCanvas: document.getElementById("mainCanvas"),
      canvasPlaceholder: document.getElementById("canvasPlaceholder"),
      statusText: document.getElementById("statusText"),
      originalSizeText: document.getElementById("originalSizeText"),
      canvasSizeText: document.getElementById("canvasSizeText"),
      scaleText: document.getElementById("scaleText"),
      viewModeText: document.getElementById("viewModeText"),
      outlineDetailText: document.getElementById("outlineDetailText"),
      outlineControlsSection: document.getElementById("outlineControlsSection"),
      outlinePresetLabel: document.getElementById("outlinePresetLabel"),
      outlineSourceInput: document.getElementById("outlineSourceInput"),
      outlineSourceHelpText: document.getElementById("outlineSourceHelpText"),
      outlinePresetButtons: Array.from(document.querySelectorAll("[data-outline-preset]")),
      valueContourControlsSection: document.getElementById("valueContourControlsSection"),
      valueContourDetailLabel: document.getElementById("valueContourDetailLabel"),
      valueContourDetailButtons: Array.from(document.querySelectorAll("[data-value-contour-detail]")),
      squintControlsSection: document.getElementById("squintControlsSection"),
      squintBlurInput: document.getElementById("squintBlurInput"),
      squintBlurValue: document.getElementById("squintBlurValue"),
      squintModeButtons: Array.from(document.querySelectorAll("[data-squint-mode]")),
      notanShadowCutoffInput: document.getElementById("notanShadowCutoffInput"),
      notanShadowCutoffValue: document.getElementById("notanShadowCutoffValue"),
      notanLightCutoffInput: document.getElementById("notanLightCutoffInput"),
      notanLightCutoffValue: document.getElementById("notanLightCutoffValue"),
      notanControlsSection: document.getElementById("notanControlsSection"),
      valueGroupsControlsSection: document.getElementById("valueGroupsControlsSection"),
      valueGroupsButtons: Array.from(document.querySelectorAll("[data-value-groups-count]")),
      temperatureControlsSection: document.getElementById("temperatureControlsSection"),
      temperatureNeutralThresholdInput: document.getElementById("temperatureNeutralThresholdInput"),
      temperatureNeutralThresholdValue: document.getElementById("temperatureNeutralThresholdValue"),
      temperaturePivotInput: document.getElementById("temperaturePivotInput"),
      temperaturePivotValue: document.getElementById("temperaturePivotValue"),
      colorStudyControlsSection: document.getElementById("colorStudyControlsSection"),
      colorStudyPresetInput: document.getElementById("colorStudyPresetInput"),
      colorStudyPresetLabel: document.getElementById("colorStudyPresetLabel"),
      resetNotanButton: document.getElementById("resetNotanButton"),
      focalRadiusInput: document.getElementById("focalRadiusInput"),
      focalRadiusValue: document.getElementById("focalRadiusValue"),
      compositionCropControls: document.getElementById("compositionCropControls"),
      focalStudyInstructionText: document.getElementById("focalStudyInstructionText"),
      clearFocalPointButton: document.getElementById("clearFocalPointButton"),
      useOriginalCompositionButton: document.getElementById("useOriginalCompositionButton"),
      viewModeButtons: Array.from(document.querySelectorAll("[data-view-mode]")),
      stageSections: Array.from(document.querySelectorAll("[data-stage-section]")),
      stageToggleButtons: Array.from(document.querySelectorAll("[data-stage-toggle]")),
      stageBodyElements: Array.from(document.querySelectorAll("[data-stage-body]")),
      baselineStageValue: document.getElementById("baselineStageValue"),
      compositionStageValue: document.getElementById("compositionStageValue"),
      drawingStageValue: document.getElementById("drawingStageValue"),
      paintingStageValue: document.getElementById("paintingStageValue"),
      generalStageValue: document.getElementById("generalStageValue"),

      showGridInput: document.getElementById("showGridInput"),
      rowsInput: document.getElementById("rowsInput"),
      columnsInput: document.getElementById("columnsInput"),

      exportCurrentViewButton: document.getElementById("exportCurrentViewButton"),
      closeSheetPreviewButton: document.getElementById("closeSheetPreviewButton"),
      exportPreviewSheetButton: document.getElementById("exportPreviewSheetButton"),
      sheetPreviewPanel: document.getElementById("sheetPreviewPanel"),
      sheetPreviewLabel: document.getElementById("sheetPreviewLabel"),
      sheetPreviewButtons: Array.from(document.querySelectorAll("[data-sheet-preview]")),
      generalPreviewHelpText: document.getElementById("generalPreviewHelpText")
    };

    this.ctx = this.dom.mainCanvas.getContext("2d", { alpha: false });
    this.rangeInputs = Array.from(document.querySelectorAll('input[type="range"]'));

    // TODO(M2): map state dependencies before file extraction.
    // Composition, processed canvases, view mode, and exports are coupled here.
    this.state = {
      originalImage: null,
      originalWidth: 0,
      originalHeight: 0,
      loadedFileName: "",
      workingCanvasWidth: 0,
      workingCanvasHeight: 0,
      workingScale: 1,
      viewMode: "original",
      activeStage: "baseline",
      outline: {
        source: "gray",
        detail: "medium",
        sensitivity: 52,
        smoothing: 2
      },
      outlineSource: {
        graySimplification: 0,
        squintSoftness: 35,
        notanShadowCutoff: 85,
        notanLightCutoff: 170,
        minimumGap: 10
      },
      squint: {
        softness: 35,
        mode: "gray"
      },
      valueContour: {
        detail: "medium"
      },
      valueGroups: {
        count: 4,
        isolatedBand: null
      },
      stageSelections: {
        baseline: "original",
        composition: "focalStudy",
        drawing: "outlineSketch",
        painting: "grayscale"
      },
      notan: {
        shadowCutoff: 85,
        lightCutoff: 170,
        autoShadowCutoff: 85,
        autoLightCutoff: 170,
        minimumGap: 10
      },
      temperature: {
        neutralThreshold: 20,
        pivot: 140
      },
      colorStudy: {
        preset: "complementary"
      },
      focalStudy: {
        point: null,
        cropPercent: 72
      },
      valueRead: {
        viewMode: null,
        step: null
      },
      // Selecting a composition crop replaces the working source used by later stages.
      compositionChoice: {
        key: "original",
        label: "Original",
        cropRect: null
      },
      // Derived canvas cache. Rendering and export methods read directly from these fields.
      processed: {
        referenceCanvas: null,
        originalCanvas: null,
        grayscaleCanvas: null,
        notanCanvas: null,
        valueGroupsCanvas: null,
        lightMaskCanvas: null,
        midtoneMaskCanvas: null,
        shadowMaskCanvas: null,
        warmMaskCanvas: null,
        coolMaskCanvas: null,
        neutralMaskCanvas: null,
        colorStudyCanvas: null,
        valueContourCanvas: null,
        outlineSketchCanvas: null,
        squintCanvas: null,
        colorSquintCanvas: null,
        mirrorCanvas: null,
        paletteColors: [],
        paletteMixNotes: []
      },
      studySheetPreview: {
        isOpen: false,
        activeSheet: "sheet1"
      },
      grid: {
        show: true,
        rows: 3,
        columns: 3,
        color: "#444444",
        lineThickness: 2.5,
        opacity: 1
      }
    };

    this.maxCanvasDimension = 1600;
    this.focalStudyLayout = null;
    this.valueStripLayout = null;
    this.squintRecomputeHandle = null;

    this.initializeTheme();
    this.updateAppVersion();
    this.bindEvents();
    this.initializeCanvas();
    this.syncControls();
  }

  updateAppVersion() {
    if (this.dom.appVersionChip) {
      this.dom.appVersionChip.textContent = APP_VERSION_LABEL;
      this.dom.appVersionChip.setAttribute("title", `Loaded ${APP_VERSION_LABEL}`);
    }
  }

  initializeTheme() {
    let savedTheme = "light";
    try {
      savedTheme = localStorage.getItem("painters-ref-theme") || "light";
    } catch (error) {
      savedTheme = "light";
    }

    this.applyTheme(savedTheme === "dark" ? "dark" : "light");
  }

  applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", nextTheme === "dark" ? "#1e1b17" : "#f0ede4");
    }

    if (this.dom.themeToggleButton) {
      const isDark = nextTheme === "dark";
      this.dom.themeToggleButton.textContent = isDark ? "Light" : "Dark";
      this.dom.themeToggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");
    }

    try {
      localStorage.setItem("painters-ref-theme", nextTheme);
    } catch (error) {
      // Ignore storage failures; theme still applies for the current session.
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    this.applyTheme(currentTheme === "dark" ? "light" : "dark");
  }

  getStageForViewMode(viewMode) {
    const stageByViewMode = {
      original: "baseline",
      focalStudy: "composition",
      squint: "painting",
      outlineSketch: "drawing",
      valueContours: "drawing",
      mirror: "drawing",
      grayscale: "painting",
      notan: "painting",
      valueGroups: "painting",
      temperatureStudy: "painting",
      colorStudy: "painting",
      paletteStudy: "painting"
    };

    return stageByViewMode[viewMode] || "baseline";
  }

  setViewMode(nextViewMode) {
    if (!nextViewMode) {
      return;
    }

    this.state.studySheetPreview.isOpen = false;
    this.state.viewMode = nextViewMode;
    this.state.valueRead = { viewMode: null, step: null };
    this.state.activeStage = this.getStageForViewMode(nextViewMode);
    this.state.stageSelections[this.state.activeStage] = nextViewMode;
    this.updateViewModeLabel();
    this.updateViewModeButtons();
    this.updateStagePanels();
    this.renderScene();
  }

  bindEvents() {
    if (this.dom.themeToggleButton) {
      this.dom.themeToggleButton.addEventListener("click", () => {
        this.toggleTheme();
      });
    }

    this.rangeInputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.updateRangeFill(input);
      });
    });

    this.dom.imageInput.addEventListener("change", async (event) => {
      const [file] = event.target.files || [];
      if (!file) return;
      await this.handleImageSelection(file);
    });

    this.dom.showGridInput.addEventListener("change", () => {
      this.state.grid.show = this.dom.showGridInput.checked;
      this.renderScene();
    });

    this.dom.rowsInput.addEventListener("input", () => {
      this.state.grid.rows = this.getSafeInteger(this.dom.rowsInput.value, 3, 1, 50);
      this.dom.rowsInput.value = this.state.grid.rows;
      this.renderScene();
    });

    this.dom.columnsInput.addEventListener("input", () => {
      this.state.grid.columns = this.getSafeInteger(this.dom.columnsInput.value, 3, 1, 50);
      this.dom.columnsInput.value = this.state.grid.columns;
      this.renderScene();
    });

    if (this.dom.outlineSourceInput) {
      this.dom.outlineSourceInput.addEventListener("change", () => {
        this.state.outline.source = this.dom.outlineSourceInput.value || "gray";
        this.applyOutlineDetailPreset(this.state.outline.detail || "medium");
        this.refreshOutlineCanvas();
        this.updateOutlineControls();
        this.renderScene();
      });
    }

    this.dom.squintBlurInput.addEventListener("input", () => {
      this.state.squint.softness = this.getSafeInteger(
        this.dom.squintBlurInput.value,
        35,
        0,
        100
      );
      this.updateSquintControls();
      this.scheduleSquintRecompute();
    });

    this.dom.squintModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.squintMode;
        if (!mode || mode === this.state.squint.mode) {
          return;
        }

        this.state.squint.mode = mode;
        this.updateSquintControls();
        this.renderScene();
      });
    });

    this.dom.valueGroupsButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const count = parseInt(button.dataset.valueGroupsCount, 10);
        if (!count || count === this.state.valueGroups.count) {
          return;
        }

        this.state.valueGroups.count = count;
        this.state.valueGroups.isolatedBand = null;
        this.refreshValueGroupsCanvas();
        this.updateValueGroupsControls();
        this.renderScene();
      });
    });

    this.dom.notanShadowCutoffInput.addEventListener("input", () => {
      const nextShadowCutoff = this.getSafeInteger(
        this.dom.notanShadowCutoffInput.value,
        85,
        0,
        245
      );
      this.state.notan.shadowCutoff = Math.min(
        nextShadowCutoff,
        this.state.notan.lightCutoff - this.state.notan.minimumGap
      );
      this.refreshNotanCanvas();
      this.updateNotanControls();
      this.renderScene();
    });

    this.dom.notanLightCutoffInput.addEventListener("input", () => {
      const nextLightCutoff = this.getSafeInteger(
        this.dom.notanLightCutoffInput.value,
        170,
        10,
        255
      );
      this.state.notan.lightCutoff = Math.max(
        nextLightCutoff,
        this.state.notan.shadowCutoff + this.state.notan.minimumGap
      );
      this.refreshNotanCanvas();
      this.updateNotanControls();
      this.renderScene();
    });

    this.dom.temperatureNeutralThresholdInput.addEventListener("input", () => {
      this.state.temperature.neutralThreshold = this.getSafeInteger(
        this.dom.temperatureNeutralThresholdInput.value,
        20,
        0,
        60
      );
      this.refreshTemperatureCanvases();
      this.updateTemperatureControls();
      this.renderScene();
    });

    this.dom.temperaturePivotInput.addEventListener("input", () => {
      this.state.temperature.pivot = this.getSafeInteger(
        this.dom.temperaturePivotInput.value,
        140,
        100,
        180
      );
      this.refreshTemperatureCanvases();
      this.updateTemperatureControls();
      this.renderScene();
    });

    if (this.dom.colorStudyPresetInput) {
      this.dom.colorStudyPresetInput.addEventListener("change", () => {
        this.state.colorStudy.preset = this.dom.colorStudyPresetInput.value || "complementary";
        this.refreshColorStudyCanvas();
        this.updateColorStudyControls();
        this.renderScene();
      });
    }

    this.dom.valueContourDetailButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const detail = button.dataset.valueContourDetail;
        if (!detail) {
          return;
        }

        this.state.valueContour.detail = detail;
        this.refreshValueContourCanvas();
        this.updateValueContourControls();
        this.updateStagePanels();
        this.renderScene();
      });
    });

    this.dom.focalRadiusInput.addEventListener("input", () => {
      this.state.focalStudy.cropPercent = this.getSafeInteger(
        this.dom.focalRadiusInput.value,
        72,
        55,
        95
      );
      if (this.state.compositionChoice.key !== "original") {
        this.selectCompositionChoice(this.state.compositionChoice.key, {
          skipRender: true,
          silent: true
        });
      }
      this.updateFocalStudyControls();
      this.renderScene();
    });

    this.dom.viewModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextViewMode = button.dataset.viewMode;
        if (!nextViewMode || nextViewMode === this.state.viewMode) {
          return;
        }

        this.setViewMode(nextViewMode);
      });
    });

    this.dom.outlinePresetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const presetKey = button.dataset.outlinePreset;
        if (!presetKey) {
          return;
        }

        this.applyOutlineDetailPreset(presetKey);
        this.refreshOutlineCanvas();
        this.updateOutlineControls();
        this.renderScene();
      });
    });

    this.dom.stageToggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const stage = button.dataset.stageToggle;
        if (!stage) {
          return;
        }

        if (stage === "general") {
          this.state.activeStage = "general";
          this.state.studySheetPreview.isOpen = false;
          this.updateStagePanels();
          if (!this.state.processed.originalCanvas) {
            this.renderScene();
          } else {
            this.updateStatus("Export options ready");
          }
          return;
        }

        const nextViewMode = this.state.stageSelections[stage] || "original";
        this.setViewMode(nextViewMode);
      });
    });

    this.dom.exportCurrentViewButton.addEventListener("click", () => {
      this.exportCurrentView();
    });

    if (this.dom.closeSheetPreviewButton) {
      this.dom.closeSheetPreviewButton.addEventListener("click", () => {
        this.closeStudySheetPreview();
      });
    }

    if (this.dom.exportPreviewSheetButton) {
      this.dom.exportPreviewSheetButton.addEventListener("click", () => {
        this.exportActiveStudySheet();
      });
    }

    this.dom.sheetPreviewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const sheetKey = button.dataset.sheetPreview;
        if (!sheetKey) {
          return;
        }

        if (this.state.activeStage === "general" && this.state.processed.originalCanvas) {
          this.openStudySheetPreview(sheetKey);
          return;
        }

        this.state.studySheetPreview.activeSheet = sheetKey;
        this.updateStudySheetPreviewControls();
        if (this.state.studySheetPreview.isOpen && this.state.activeStage === "general") {
          this.renderScene();
        }
      });
    });

    this.dom.clearFocalPointButton.addEventListener("click", () => {
      this.clearCompositionSelection();
    });

    if (this.dom.useOriginalCompositionButton) {
      this.dom.useOriginalCompositionButton.addEventListener("click", () => {
        this.selectCompositionChoice("original");
      });
    }

    this.dom.resetNotanButton.addEventListener("click", () => {
      this.state.notan.shadowCutoff = this.state.notan.autoShadowCutoff;
      this.state.notan.lightCutoff = this.state.notan.autoLightCutoff;
      this.refreshNotanCanvas();
      this.updateNotanControls();
      this.renderScene();
    });

    this.dom.changeImageButton.addEventListener("click", () => {
      this.dom.imageInput.click();
    });

    this.dom.mainCanvas.addEventListener("click", (event) => {
      this.handleMainCanvasClick(event);
    });
  }

  initializeCanvas() {
    setCanvasSize(this.dom.mainCanvas, 960, 640);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.updateStatus("Waiting for image");
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  syncControls() {
    this.dom.showGridInput.checked = this.state.grid.show;
    this.dom.rowsInput.value = this.state.grid.rows;
    this.dom.columnsInput.value = this.state.grid.columns;
    this.updateViewModeLabel();
    this.updateViewModeButtons();
    this.updateStagePanels();
    this.updateOutlineDetailLabel();
    this.updateOutlineControls();
    this.updateValueContourControls();
    this.updateSquintControls();
    this.updateNotanControls();
    this.updateValueGroupsControls();
    this.updateTemperatureControls();
    this.updateColorStudyControls();
    this.updateFocalStudyControls();
    this.updateStudySheetPreviewControls();
    this.updateReferenceSection();
    this.updateRangeFills();
  }

  updateRangeFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || min);
    const progress = max > min
      ? ((value - min) / (max - min)) * 100
      : 0;

    input.style.setProperty("--range-progress", `${Math.min(Math.max(progress, 0), 100)}%`);
  }

  updateRangeFills() {
    this.rangeInputs.forEach((input) => {
      this.updateRangeFill(input);
    });
  }

  updateViewModeLabel() {
    const labels = {
      original: "Original",
      focalStudy: "Focal Study",
      grayscale: "Grayscale",
      notan: "3-Value Notan",
      valueGroups: "Value Groups",
      temperatureStudy: "Temperature Study",
      colorStudy: "Color Study",
      paletteStudy: "Palette Notes",
      outlineSketch: "Rough Outline Sketch",
      valueContours: "Value Contours",
      squint: "Squint",
      mirror: "Mirror Check"
    };

    this.dom.viewModeText.textContent = labels[this.state.viewMode] || "Original";
  }

  getDrawingViewLabel(viewMode = this.state.stageSelections.drawing) {
    if (viewMode === "outlineSketch") {
      return `Outline (${getOutlineDisplayLabel(this.state.outline)})`;
    }

    if (viewMode === "valueContours") {
      return `Value Contours (${getValueContourDisplayLabel(this.state.valueContour.detail)})`;
    }

    if (viewMode === "mirror") {
      return "Mirror Check";
    }

    return "Outline";
  }

  getCompositionChoiceLabel() {
    return this.state.compositionChoice?.label || "Original";
  }

  updateOutlineDetailLabel() {
    this.dom.outlineDetailText.textContent = getOutlineDisplayLabel(this.state.outline);
  }

  updateViewModeButtons() {
    this.dom.viewModeButtons.forEach((button) => {
      const isActive = button.dataset.viewMode === this.state.viewMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  updateStagePanels() {
    this.dom.stageSections.forEach((section) => {
      const isActive = section.dataset.stageSection === this.state.activeStage;
      section.classList.toggle("is-active", isActive);
    });

    this.dom.stageBodyElements.forEach((body) => {
      const isActive = body.dataset.stageBody === this.state.activeStage;
      body.classList.toggle("is-hidden", !isActive);
    });

    this.dom.stageToggleButtons.forEach((button) => {
      const isActive = button.dataset.stageToggle === this.state.activeStage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const labels = {
      original: "Original",
      focalStudy: "Focal Study",
      outlineSketch: "Rough Outline",
      valueContours: "Value Contours",
      squint: "Squint",
      mirror: "Mirror Check",
      grayscale: "Grayscale",
      notan: "3-Value Notan",
      valueGroups: "Value Groups",
      temperatureStudy: "Temperature Study",
      colorStudy: "Color Study",
      paletteStudy: "Palette Notes"
    };

    this.dom.baselineStageValue.textContent =
      labels[this.state.stageSelections.baseline] || "Original";
    this.dom.compositionStageValue.textContent = this.getCompositionChoiceLabel();
    this.dom.drawingStageValue.textContent = this.getDrawingViewLabel();
    this.dom.paintingStageValue.textContent =
      labels[this.state.stageSelections.painting] || "Grayscale";
    this.dom.generalStageValue.textContent = this.state.studySheetPreview.isOpen
      ? `${this.getStudySheetLabel()} Preview`
      : "Sheets";

    const isNotanActive =
      this.state.activeStage === "painting" && this.state.viewMode === "notan";
    this.dom.notanControlsSection.classList.toggle("is-hidden", !isNotanActive);

    const isValueGroupsActive =
      this.state.activeStage === "painting" && this.state.viewMode === "valueGroups";
    this.dom.valueGroupsControlsSection.classList.toggle("is-hidden", !isValueGroupsActive);

    const isOutlineActive =
      this.state.activeStage === "drawing" && this.state.viewMode === "outlineSketch";
    this.dom.outlineControlsSection.classList.toggle("is-hidden", !isOutlineActive);

    const isValueContourActive =
      this.state.activeStage === "drawing" && this.state.viewMode === "valueContours";
    this.dom.valueContourControlsSection.classList.toggle("is-hidden", !isValueContourActive);

    const isSquintActive =
      this.state.activeStage === "painting" && this.state.viewMode === "squint";
    this.dom.squintControlsSection.classList.toggle("is-hidden", !isSquintActive);

    const isTemperatureActive =
      this.state.activeStage === "painting" &&
      this.state.viewMode === "temperatureStudy";
    this.dom.temperatureControlsSection.classList.toggle("is-hidden", !isTemperatureActive);

    const isColorStudyActive =
      this.state.activeStage === "painting" && this.state.viewMode === "colorStudy";
    this.dom.colorStudyControlsSection.classList.toggle("is-hidden", !isColorStudyActive);

    this.updateStudySheetPreviewControls();
  }

  applyOutlineDetailPreset(detailLevel) {
    const sourceKey = this.state.outline.source || "gray";
    const preset = getOutlinePresetSettings(detailLevel, sourceKey);
    this.state.outline.detail = detailLevel;
    this.state.outline.sensitivity = preset.sensitivity;
    this.state.outline.smoothing = preset.smoothing;

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "graySimplification")) {
      this.state.outlineSource.graySimplification = preset.sourcePrep.graySimplification;
    }

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "squintSoftness")) {
      this.state.outlineSource.squintSoftness = preset.sourcePrep.squintSoftness;
    }

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "notanShadowCutoff")) {
      this.state.outlineSource.notanShadowCutoff = preset.sourcePrep.notanShadowCutoff;
    }

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "notanLightCutoff")) {
      this.state.outlineSource.notanLightCutoff = preset.sourcePrep.notanLightCutoff;
    }
  }

  updateOutlineControls() {
    if (this.dom.outlineSourceInput) {
      this.dom.outlineSourceInput.value = this.state.outline.source || "gray";
    }

    const sourceKey = this.state.outline.source || "gray";
    const sourceHelpText = {
      gray: "Gray uses a curated grayscale outline recipe.",
      original: "Original uses a curated outline recipe from the color source.",
      squint: "Squint uses hidden shape simplification tuned by detail.",
      notan: "Notan uses hidden mass grouping tuned by detail."
    };
    this.dom.outlineSourceHelpText.textContent = sourceHelpText[sourceKey] || sourceHelpText.gray;

    const activePresetKey = getMatchingOutlinePresetKey(this.state.outline);
    this.dom.outlinePresetLabel.textContent =
      activePresetKey ? getOutlinePresetSettings(activePresetKey).label : "Custom";

    this.dom.outlinePresetButtons.forEach((button) => {
      const isActive = button.dataset.outlinePreset === activePresetKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    this.updateRangeFills();
  }

  updateValueContourControls() {
    const detail = this.state.valueContour.detail || "medium";
    this.dom.valueContourDetailLabel.textContent = getValueContourDisplayLabel(detail);

    this.dom.valueContourDetailButtons.forEach((button) => {
      const isActive = button.dataset.valueContourDetail === detail;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  updateNotanControls() {
    this.dom.notanShadowCutoffInput.value = this.state.notan.shadowCutoff;
    this.dom.notanLightCutoffInput.value = this.state.notan.lightCutoff;
    this.dom.notanShadowCutoffValue.textContent = `${this.state.notan.shadowCutoff}`;
    this.dom.notanLightCutoffValue.textContent = `${this.state.notan.lightCutoff}`;
    this.updateRangeFills();
  }

  updateSquintControls() {
    this.dom.squintBlurInput.value = this.state.squint.softness;
    this.dom.squintBlurValue.textContent = `${this.state.squint.softness}%`;
    this.dom.squintModeButtons.forEach((button) => {
      const isActive = button.dataset.squintMode === this.state.squint.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    this.updateRangeFills();
  }

  updateValueGroupsControls() {
    this.dom.valueGroupsButtons.forEach((button) => {
      const isActive = parseInt(button.dataset.valueGroupsCount, 10) === this.state.valueGroups.count;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  updateTemperatureControls() {
    this.dom.temperatureNeutralThresholdInput.value = this.state.temperature.neutralThreshold;
    this.dom.temperatureNeutralThresholdValue.textContent =
      `${this.state.temperature.neutralThreshold}%`;
    this.dom.temperaturePivotInput.value = this.state.temperature.pivot;
    this.dom.temperaturePivotValue.textContent = `${this.state.temperature.pivot}\u00b0`;
    this.updateRangeFills();
  }

  updateColorStudyControls() {
    if (this.dom.colorStudyPresetInput) {
      this.dom.colorStudyPresetInput.value = this.state.colorStudy.preset;
    }

    if (this.dom.colorStudyPresetLabel) {
      this.dom.colorStudyPresetLabel.textContent =
        getColorStudyPresetLabel(this.state.colorStudy.preset);
    }
  }

  updateFocalStudyControls() {
    const hasFocalPoint = Boolean(this.state.focalStudy.point);
    this.dom.focalRadiusInput.value = this.state.focalStudy.cropPercent;
    this.dom.focalRadiusValue.textContent = `${this.state.focalStudy.cropPercent}%`;
    this.dom.clearFocalPointButton.disabled =
      !hasFocalPoint && this.state.compositionChoice.key === "original";
    if (this.dom.compositionCropControls) {
      this.dom.compositionCropControls.classList.toggle("is-hidden", !hasFocalPoint);
    }
    if (this.dom.focalStudyInstructionText) {
      this.dom.focalStudyInstructionText.textContent = hasFocalPoint
        ? "Click a crop to use it. Clear Selection returns to original."
        : "Click the image to place a point of interest.";
    }
    if (this.dom.useOriginalCompositionButton) {
      this.dom.useOriginalCompositionButton.disabled = !this.state.processed.referenceCanvas;
      this.dom.useOriginalCompositionButton.classList.toggle(
        "is-active",
        this.state.compositionChoice.key === "original"
      );
    }
    this.updateRangeFills();
  }

  getStudySheetLabel(sheetKey = this.state.studySheetPreview.activeSheet) {
    const labels = {
      sheet1: "Sheet 1",
      sheet2: "Sheet 2",
      sheet3: "Sheet 3"
    };

    return labels[sheetKey] || "Sheet 1";
  }

  updateStudySheetPreviewControls() {
    const hasLoadedImage = Boolean(this.state.processed.originalCanvas);
    const isExportStage = this.state.activeStage === "general";
    const isPreviewOpen = this.state.studySheetPreview.isOpen && hasLoadedImage;
    const showSheetControls = isExportStage && hasLoadedImage;
    const activeLabel = this.getStudySheetLabel();

    if (this.dom.sheetPreviewPanel) {
      this.dom.sheetPreviewPanel.classList.toggle("is-hidden", !showSheetControls);
    }

    if (this.dom.sheetPreviewLabel) {
      this.dom.sheetPreviewLabel.textContent = isPreviewOpen ? activeLabel : "Choose";
    }

    if (this.dom.generalPreviewHelpText) {
      this.dom.generalPreviewHelpText.classList.toggle("is-hidden", showSheetControls);
    }

    if (this.dom.exportPreviewSheetButton) {
      this.dom.exportPreviewSheetButton.disabled = !isPreviewOpen;
    }

    if (this.dom.closeSheetPreviewButton) {
      this.dom.closeSheetPreviewButton.disabled = !isPreviewOpen;
    }

    this.dom.sheetPreviewButtons.forEach((button) => {
      const isActive =
        isPreviewOpen && button.dataset.sheetPreview === this.state.studySheetPreview.activeSheet;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.disabled = !hasLoadedImage;
    });
  }

  updateReferenceSection() {
    const hasLoadedImage = Boolean(this.state.loadedFileName);
    this.dom.referenceUploadBlock.classList.toggle("is-hidden", hasLoadedImage);
    this.dom.referenceSummary.classList.toggle("is-hidden", !hasLoadedImage);
    this.dom.referenceFileName.textContent = this.state.loadedFileName || "None";
    if (this.dom.headerFileChip) {
      this.dom.headerFileChip.classList.toggle("is-hidden", !hasLoadedImage);
      this.dom.headerFileChip.textContent = hasLoadedImage
        ? `Loaded: ${this.state.loadedFileName}`
        : "No image loaded";
    }
    if (this.dom.exportCurrentViewButton) {
      this.dom.exportCurrentViewButton.disabled = !this.state.processed.originalCanvas;
    }
    this.updateStudySheetPreviewControls();
  }

  refreshNotanCanvas() {
    if (!this.state.processed.grayscaleCanvas) {
      return;
    }

    const notanCutoffs = {
      shadowCutoff: this.state.notan.shadowCutoff,
      lightCutoff: this.state.notan.lightCutoff
    };

    this.state.processed.notanCanvas = createNotanCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      notanCutoffs
    );

    this.refreshMaskCanvases(notanCutoffs);
  }

  refreshValueGroupsCanvas() {
    if (!this.state.processed.grayscaleCanvas) {
      return;
    }

    this.state.processed.valueGroupsCanvas = createValueGroupsCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      { count: this.state.valueGroups.count, isolateBand: this.state.valueGroups.isolatedBand }
    );
  }

  // Sheet 2's tonal masks always partition the same shadow/light cutoffs as
  // the notan on Sheet 1.
  refreshMaskCanvases(notanCutoffs) {
    if (!this.state.processed.grayscaleCanvas) {
      return;
    }

    this.state.processed.lightMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      "light",
      notanCutoffs
    );
    this.state.processed.midtoneMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      "midtone",
      notanCutoffs
    );
    this.state.processed.shadowMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      "shadow",
      notanCutoffs
    );
  }

  refreshTemperatureCanvases() {
    if (!this.state.processed.originalCanvas) {
      return;
    }

    this.state.processed.warmMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      this.state.processed.originalCanvas,
      "warm",
      this.state.temperature
    );
    this.state.processed.coolMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      this.state.processed.originalCanvas,
      "cool",
      this.state.temperature
    );
    this.state.processed.neutralMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      this.state.processed.originalCanvas,
      "neutral",
      this.state.temperature
    );
  }

  refreshColorStudyCanvas() {
    if (!this.state.processed.originalCanvas) {
      return;
    }

    this.state.processed.colorStudyCanvas = createColorStudyCanvasFromCanvas(
      this.state.processed.originalCanvas,
      this.state.colorStudy.preset
    );
  }

  refreshOutlineCanvas() {
    const sourceKey = this.state.outline.source || "gray";

    if (sourceKey === "squint") {
      if (!this.state.processed.originalCanvas) {
        return;
      }

      this.state.processed.outlineSketchCanvas = createSquintRegionOutlineCanvas(
        this.state.processed.originalCanvas,
        this.state.outlineSource.squintSoftness
      );
      this.refreshMirrorCanvas();
      return;
    }

    const outlineSourceCanvas = this.getOutlineSourceCanvas();
    if (!outlineSourceCanvas) {
      return;
    }

    this.state.processed.outlineSketchCanvas = createOutlineSketchCanvasFromGrayscaleCanvas(
      outlineSourceCanvas,
      this.state.outline
    );
    this.refreshMirrorCanvas();
  }

  refreshValueContourCanvas() {
    if (!this.state.processed.grayscaleCanvas) {
      return;
    }

    this.state.processed.valueContourCanvas = createValueContourCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      this.state.valueContour
    );
  }

  refreshSquintCanvas() {
    if (!this.state.processed.originalCanvas) {
      return;
    }

    this.state.processed.squintCanvas = createSquintCanvasFromCanvas(
      this.state.processed.originalCanvas,
      { softness: this.state.squint.softness, mode: "gray" }
    );
    this.state.processed.colorSquintCanvas = createSquintCanvasFromCanvas(
      this.state.processed.originalCanvas,
      { softness: this.state.squint.softness, mode: "color" }
    );
  }

  // Recomputing the strong blur on every slider "input" event stutters while
  // dragging, so coalesce recomputes to one per animation frame.
  scheduleSquintRecompute() {
    if (this.squintRecomputeHandle) {
      cancelAnimationFrame(this.squintRecomputeHandle);
    }

    this.squintRecomputeHandle = requestAnimationFrame(() => {
      this.squintRecomputeHandle = null;
      this.refreshSquintCanvas();
      this.renderScene();
    });
  }

  refreshMirrorCanvas() {
    if (!this.state.processed.outlineSketchCanvas) {
      return;
    }

    this.state.processed.mirrorCanvas = createMirroredCanvasFromCanvas(
      this.state.processed.outlineSketchCanvas
    );
  }

  refreshDrawingDerivedCanvases() {
    this.refreshMirrorCanvas();
    this.refreshValueContourCanvas();
    this.refreshSquintCanvas();
  }

  // Note: "squint" source bypasses this - both call sites route it straight
  // to createSquintRegionOutlineCanvas instead of the generic blur+edge path.
  getOutlineSourceCanvasFromCanvases(canvases) {
    const sourceKey = this.state.outline.source || "gray";

    if (sourceKey === "original") {
      return canvases.originalCanvas;
    }

    if (!canvases.grayscaleCanvas) {
      return null;
    }

    if (sourceKey === "notan") {
      return createNotanCanvasFromGrayscaleCanvas(canvases.grayscaleCanvas, {
        shadowCutoff: this.state.outlineSource.notanShadowCutoff,
        lightCutoff: this.state.outlineSource.notanLightCutoff
      });
    }

    if (this.state.outlineSource.graySimplification > 0) {
      return createSquintCanvasFromCanvas(canvases.originalCanvas, {
        softness: this.state.outlineSource.graySimplification,
        mode: "gray"
      });
    }

    return canvases.grayscaleCanvas;
  }

  getOutlineSourceCanvas() {
    return this.getOutlineSourceCanvasFromCanvases(this.state.processed);
  }

  // Central derived-canvas rebuild point. Original/crop selection flows through here.
  rebuildWorkingCanvasesFromSource(sourceCanvas) {
    if (!sourceCanvas) {
      return;
    }

    const originalCanvas = cloneCanvas(sourceCanvas);
    const grayscaleCanvas = createGrayscaleCanvasFromCanvas(originalCanvas);

    const adaptiveCutoffs = computeAdaptiveNotanCutoffs(grayscaleCanvas);
    this.state.notan.autoShadowCutoff = adaptiveCutoffs.shadowCutoff;
    this.state.notan.autoLightCutoff = adaptiveCutoffs.lightCutoff;
    this.state.notan.shadowCutoff = adaptiveCutoffs.shadowCutoff;
    this.state.notan.lightCutoff = adaptiveCutoffs.lightCutoff;

    const notanCutoffs = {
      shadowCutoff: this.state.notan.shadowCutoff,
      lightCutoff: this.state.notan.lightCutoff
    };
    const notanCanvas = createNotanCanvasFromGrayscaleCanvas(grayscaleCanvas, notanCutoffs);
    const valueGroupsCanvas = createValueGroupsCanvasFromGrayscaleCanvas(grayscaleCanvas, {
      count: this.state.valueGroups.count,
      isolateBand: this.state.valueGroups.isolatedBand
    });

    const lightMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, "light", notanCutoffs);
    const midtoneMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, "midtone", notanCutoffs);
    const shadowMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, "shadow", notanCutoffs);
    const warmMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      originalCanvas,
      "warm",
      this.state.temperature
    );
    const coolMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      originalCanvas,
      "cool",
      this.state.temperature
    );
    const neutralMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      originalCanvas,
      "neutral",
      this.state.temperature
    );
    const colorStudyCanvas = createColorStudyCanvasFromCanvas(
      originalCanvas,
      this.state.colorStudy.preset
    );
    const valueContourCanvas = createValueContourCanvasFromGrayscaleCanvas(
      grayscaleCanvas,
      this.state.valueContour
    );

    const squintCanvas = createSquintCanvasFromCanvas(originalCanvas, {
      softness: this.state.squint.softness,
      mode: "gray"
    });
    const colorSquintCanvas = createSquintCanvasFromCanvas(originalCanvas, {
      softness: this.state.squint.softness,
      mode: "color"
    });
    const outlineSourceKey = this.state.outline.source || "gray";
    const outlineSketchCanvas = outlineSourceKey === "squint"
      ? createSquintRegionOutlineCanvas(originalCanvas, this.state.outlineSource.squintSoftness)
      : createOutlineSketchCanvasFromGrayscaleCanvas(
        this.getOutlineSourceCanvasFromCanvases({
          originalCanvas,
          grayscaleCanvas,
          notanCanvas,
          squintCanvas
        }),
        this.state.outline
      );
    const mirrorCanvas = createMirroredCanvasFromCanvas(outlineSketchCanvas);
    const paletteColors = extractDominantPaletteFromCanvas(originalCanvas, {
      colorCount: 5
    });
    const paletteMixNotes = analyzeDominantMixNotesFromCanvas(originalCanvas, 3);

    this.state.processed.originalCanvas = originalCanvas;
    this.state.processed.grayscaleCanvas = grayscaleCanvas;
    this.state.processed.notanCanvas = notanCanvas;
    this.state.processed.valueGroupsCanvas = valueGroupsCanvas;
    this.state.processed.lightMaskCanvas = lightMaskCanvas;
    this.state.processed.midtoneMaskCanvas = midtoneMaskCanvas;
    this.state.processed.shadowMaskCanvas = shadowMaskCanvas;
    this.state.processed.warmMaskCanvas = warmMaskCanvas;
    this.state.processed.coolMaskCanvas = coolMaskCanvas;
    this.state.processed.neutralMaskCanvas = neutralMaskCanvas;
    this.state.processed.colorStudyCanvas = colorStudyCanvas;
    this.state.processed.valueContourCanvas = valueContourCanvas;
    this.state.processed.outlineSketchCanvas = outlineSketchCanvas;
    this.state.processed.squintCanvas = squintCanvas;
    this.state.processed.colorSquintCanvas = colorSquintCanvas;
    this.state.processed.mirrorCanvas = mirrorCanvas;
    this.state.processed.paletteColors = paletteColors;
    this.state.processed.paletteMixNotes = paletteMixNotes;

    this.state.workingCanvasWidth = originalCanvas.width;
    this.state.workingCanvasHeight = originalCanvas.height;

    const referenceCanvas = this.state.processed.referenceCanvas;
    this.state.workingScale = referenceCanvas && this.state.originalWidth > 0
      ? referenceCanvas.width / this.state.originalWidth
      : 1;

    this.updateNotanControls();
  }

  // Composition selection feeds later stages by rebuilding every derived canvas.
  selectCompositionChoice(choiceKey, options = {}) {
    const {
      skipRender = false,
      silent = false
    } = options;
    const referenceCanvas = this.state.processed.referenceCanvas;
    if (!referenceCanvas) {
      return;
    }

    let nextChoice = {
      key: "original",
      label: "Original",
      cropRect: null
    };
    let workingSourceCanvas = referenceCanvas;

    if (choiceKey !== "original") {
      const cropOption = COMPOSITION_CROP_OPTIONS.find((option) => option.key === choiceKey);
      if (!cropOption || !this.state.focalStudy.point) {
        return;
      }

      const sharedCropScale = clamp(this.state.focalStudy.cropPercent, 55, 95) / 100;

      const cropStudy = createCompositionCropCanvas(referenceCanvas, this.state.focalStudy.point, {
        cropPercent: this.state.focalStudy.cropPercent,
        intersectionX: cropOption.intersectionX,
        intersectionY: cropOption.intersectionY,
        cropScale: sharedCropScale
      });

      nextChoice = {
        key: cropOption.key,
        label: cropOption.label,
        cropRect: cropStudy.cropRect
      };
      workingSourceCanvas = cropStudy.canvas;
    }

    this.state.compositionChoice = nextChoice;
    this.rebuildWorkingCanvasesFromSource(workingSourceCanvas);
    this.updateFocalStudyControls();
    this.updateStagePanels();

    if (!silent) {
      this.updateStatus(`${nextChoice.label} selected for later stages`);
    }

    if (!skipRender) {
      this.renderScene();
    }
  }

  clearCompositionSelection() {
    this.state.focalStudy.point = null;
    this.selectCompositionChoice("original", {
      skipRender: true,
      silent: true
    });
    this.updateFocalStudyControls();
    this.updateStatus("Composition selection cleared");
    this.renderScene();
  }

  getSafeInteger(value, fallback, min, max) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  async handleImageSelection(file) {
    if (!isSupportedImageFile(file)) {
      this.updateStatus("Unsupported file type");
      alert("Please choose a JPG or PNG image.");
      return;
    }

    this.updateStatus("Loading image...");

    try {
      const image = await fileToImageElement(file);

      this.state.originalImage = image;
      this.state.originalWidth = image.naturalWidth;
      this.state.originalHeight = image.naturalHeight;
      this.state.loadedFileName = file.name;
      this.state.focalStudy.point = null;

      this.prepareWorkingCanvases();
      this.renderScene();

      this.dom.canvasPlaceholder.classList.add("is-hidden");
      this.updateReferenceSection();
      this.updateStatus("Image loaded");
    } catch (error) {
      console.error("Image loading failed:", error);
      this.updateStatus("Failed to load image");
      alert("The image could not be loaded.");
    }
  }

  prepareWorkingCanvases() {
    const image = this.state.originalImage;
    if (!image) return;

    const contained = computeContainSize(
      image.naturalWidth,
      image.naturalHeight,
      this.maxCanvasDimension,
      this.maxCanvasDimension
    );

    const referenceCanvas = createOffscreenCanvas(contained.width, contained.height);
    const referenceCtx = referenceCanvas.getContext("2d");

    clearCanvas(referenceCtx, referenceCanvas);
    drawImageContained(referenceCtx, image, referenceCanvas);

    this.state.processed.referenceCanvas = referenceCanvas;
    this.state.compositionChoice = {
      key: "original",
      label: "Original",
      cropRect: null
    };
    this.rebuildWorkingCanvasesFromSource(referenceCanvas);
    this.state.workingScale = contained.scale;
  }

  getActiveOutlineCanvas() {
    return this.state.processed.outlineSketchCanvas;
  }

  getActiveBaseCanvas() {
    const map = {
      original: this.state.processed.originalCanvas,
      grayscale: this.state.processed.grayscaleCanvas,
      notan: this.state.processed.notanCanvas,
      valueGroups: this.state.processed.valueGroupsCanvas,
      colorStudy: this.state.processed.colorStudyCanvas,
      valueContours: this.state.processed.valueContourCanvas,
      outlineSketch: this.getActiveOutlineCanvas(),
      squint: this.state.squint.mode === "color"
        ? this.state.processed.colorSquintCanvas
        : this.state.processed.squintCanvas,
      mirror: this.state.processed.mirrorCanvas,
      paletteStudy: this.state.processed.originalCanvas
    };

    return map[this.state.viewMode] || this.state.processed.originalCanvas;
  }

  handleMainCanvasClick(event) {
    if (this.state.viewMode === "focalStudy") {
      this.handleFocalStudyCanvasClick(event);
      return;
    }

    if (VALUE_STRIP_VIEW_MODES.includes(this.state.viewMode)) {
      this.handleValueStripCanvasClick(event);
    }
  }

  handleFocalStudyCanvasClick(event) {
    if (!this.state.processed.referenceCanvas) {
      return;
    }

    const rect = this.dom.mainCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const scaleX = this.dom.mainCanvas.width / rect.width;
    const scaleY = this.dom.mainCanvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    let imageRect = null;

    const selectedStudyPanel = this.focalStudyLayout?.studyPanels?.find((panel) => (
      canvasX >= panel.panelRect.x &&
      canvasX <= panel.panelRect.x + panel.panelRect.width &&
      canvasY >= panel.panelRect.y &&
      canvasY <= panel.panelRect.y + panel.panelRect.height
    ));

    if (selectedStudyPanel) {
      this.selectCompositionChoice(selectedStudyPanel.key);
      return;
    }

    if (!this.focalStudyLayout || !this.focalStudyLayout.sourceImageRect) {
      return;
    }
    imageRect = this.focalStudyLayout.sourceImageRect;

    const isInsideImage =
      canvasX >= imageRect.x &&
      canvasX <= imageRect.x + imageRect.width &&
      canvasY >= imageRect.y &&
      canvasY <= imageRect.y + imageRect.height;

    if (!isInsideImage) {
      return;
    }

    const pointX =
      ((canvasX - imageRect.x) / imageRect.width) * this.state.processed.referenceCanvas.width;
    const pointY =
      ((canvasY - imageRect.y) / imageRect.height) * this.state.processed.referenceCanvas.height;

    this.state.focalStudy.point = {
      x: clamp(pointX, 0, this.state.processed.referenceCanvas.width),
      y: clamp(pointY, 0, this.state.processed.referenceCanvas.height)
    };

    this.updateFocalStudyControls();
    this.updateStatus("Focal point selected");
    this.renderScene();
  }

  handleValueStripCanvasClick(event) {
    const baseCanvas = this.getActiveBaseCanvas();
    if (!baseCanvas) {
      return;
    }

    const rect = this.dom.mainCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const scaleX = this.dom.mainCanvas.width / rect.width;
    const scaleY = this.dom.mainCanvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    if (
      this.state.viewMode === "valueGroups" &&
      this.valueStripLayout &&
      canvasX >= this.valueStripLayout.x &&
      canvasX < this.valueStripLayout.x + this.valueStripLayout.width &&
      canvasY >= 0 &&
      canvasY < this.valueStripLayout.height
    ) {
      this.handleValueGroupsBandStripClick(canvasY);
      return;
    }

    if (canvasX < 0 || canvasX >= baseCanvas.width || canvasY < 0 || canvasY >= baseCanvas.height) {
      return;
    }

    const sampleCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
    const pixel = sampleCtx.getImageData(Math.floor(canvasX), Math.floor(canvasY), 1, 1).data;
    const luma = (0.299 * pixel[0]) + (0.587 * pixel[1]) + (0.114 * pixel[2]);
    const step = clamp(Math.round((luma / 255) * 10), 0, 10);

    this.state.valueRead = { viewMode: this.state.viewMode, step };
    this.updateStatus(`Value ${step}/10`);
    this.renderScene();
  }

  // Clicking a band on Value Groups' scale isolates it (toggle: clicking the
  // already-isolated band returns to showing all bands) - this is what
  // replaced the old Light/Midtone/Shadow Mask views.
  handleValueGroupsBandStripClick(canvasY) {
    const count = this.state.valueGroups.count;
    const maxBandIndex = count - 1;
    const stepHeight = this.valueStripLayout.height / count;
    const rowFromTop = clamp(Math.floor(canvasY / stepHeight), 0, maxBandIndex);
    const clickedBand = maxBandIndex - rowFromTop;

    this.state.valueGroups.isolatedBand = this.state.valueGroups.isolatedBand === clickedBand
      ? null
      : clickedBand;

    this.refreshValueGroupsCanvas();
    this.updateStatus(
      this.state.valueGroups.isolatedBand === null
        ? "Showing all value bands"
        : `Value band ${this.state.valueGroups.isolatedBand + 1}/${count} isolated`
    );
    this.renderScene();
  }

  renderFocalStudyScene() {
    const referenceCanvas = this.state.processed.referenceCanvas;
    if (!referenceCanvas) {
      return;
    }

    if (!this.state.focalStudy.point) {
      const labelHeight = 62;
      const margin = 24;
      const panelImageSize = computeContainSize(
        referenceCanvas.width,
        referenceCanvas.height,
        980,
        680
      );
      const panelWidth = panelImageSize.width;
      const panelHeight = panelImageSize.height + labelHeight;
      const canvasWidth = (margin * 2) + panelWidth;
      const canvasHeight = (margin * 2) + panelHeight;

      setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
      clearCanvas(this.ctx, this.dom.mainCanvas);

      const sourcePanelRect = drawPanel(
        this.ctx,
        referenceCanvas,
        margin,
        margin,
        panelWidth,
        panelHeight,
        "Original",
        {
          labelHeight,
          sublabel: "Click image to place a point of interest"
        }
      );

      this.focalStudyLayout = {
        sourceImageRect: sourcePanelRect,
        studyImageRect: null
      };

      this.updateStatus("Click the original image to set a point of interest");
      this.updateInfo();
      this.updateViewModeLabel();
      this.updateOutlineDetailLabel();
      this.updateFocalStudyControls();
      return;
    }

    const sharedCropScale = clamp(this.state.focalStudy.cropPercent, 55, 95) / 100;

    const cropStudies = COMPOSITION_CROP_OPTIONS.map((study) => ({
      ...study,
      crop: createCompositionCropCanvas(referenceCanvas, this.state.focalStudy.point, {
        cropPercent: this.state.focalStudy.cropPercent,
        intersectionX: study.intersectionX,
        intersectionY: study.intersectionY,
        cropScale: sharedCropScale
      })
    }));

    const labelHeight = 62;
    const margin = 24;
    const gutter = 24;
    const panelImageSize = computeContainSize(
      referenceCanvas.width,
      referenceCanvas.height,
      560,
      380
    );
    const panelWidth = panelImageSize.width;
    const panelHeight = panelImageSize.height + labelHeight;
    const canvasWidth = (margin * 2) + (panelWidth * 2) + gutter;
    const canvasHeight = (margin * 2) + (panelHeight * 2) + gutter;

    setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
    clearCanvas(this.ctx, this.dom.mainCanvas);

    const studyPanels = [];

    cropStudies.forEach((study, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + (col * (panelWidth + gutter));
      const y = margin + (row * (panelHeight + gutter));
      const isSelected = this.state.compositionChoice.key === study.key;
      const label = isSelected ? `${study.label} (Selected)` : study.label;

      drawPanel(
        this.ctx,
        study.crop.canvas,
        x,
        y,
        panelWidth,
        panelHeight,
        label,
        {
          labelHeight,
          isSelected,
          sublabel: isSelected ? "Currently in use" : "Click to use this crop",
          overlayDrawer: (ctx, imageRect) => {
            drawThirdsOverlay(ctx, imageRect);
            drawCompositionPointMarker(
              ctx,
              imageRect,
              study.crop,
              this.state.focalStudy.point
            );
          }
        }
      );

      studyPanels.push({
        key: study.key,
        label: study.label,
        panelRect: {
          x,
          y,
          width: panelWidth,
          height: panelHeight
        }
      });
    });

    this.focalStudyLayout = {
      sourceImageRect: null,
      studyImageRect: null,
      studyPanels
    };

    this.updateStatus(
      this.state.compositionChoice.key === "original"
        ? "Click a crop to use it for later stages. Clear Selection returns to the original."
        : `${this.state.compositionChoice.label} selected for later stages`
    );

    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
    this.updateFocalStudyControls();
  }

  renderTemperatureStudyScene() {
    const warmCanvas = this.state.processed.warmMaskCanvas;
    const coolCanvas = this.state.processed.coolMaskCanvas;
    if (!warmCanvas || !coolCanvas) {
      return;
    }

    const labelHeight = 38;
    const margin = 24;
    const gutter = 24;
    const panelImageSize = computeContainSize(
      warmCanvas.width,
      warmCanvas.height,
      620,
      620
    );
    const panelWidth = panelImageSize.width;
    const panelHeight = panelImageSize.height + labelHeight;
    const canvasWidth = (margin * 2) + (panelWidth * 2) + gutter;
    const canvasHeight = (margin * 2) + panelHeight;

    setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
    clearCanvas(this.ctx, this.dom.mainCanvas);

    drawPanel(
      this.ctx,
      warmCanvas,
      margin,
      margin,
      panelWidth,
      panelHeight,
      "Warm Mask",
      { labelHeight }
    );

    drawPanel(
      this.ctx,
      coolCanvas,
      margin + panelWidth + gutter,
      margin,
      panelWidth,
      panelHeight,
      "Cool Mask",
      { labelHeight }
    );

    this.focalStudyLayout = null;
    this.valueStripLayout = null;
    this.updateStatus("Temperature study ready");
    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  renderColorStudyScene() {
    const originalCanvas = this.state.processed.originalCanvas;
    const colorStudyCanvas = this.state.processed.colorStudyCanvas;
    if (!originalCanvas || !colorStudyCanvas) {
      return;
    }

    const labelHeight = 46;
    const margin = 24;
    const gutter = 24;
    const panelImageSize = computeContainSize(
      originalCanvas.width,
      originalCanvas.height,
      620,
      620
    );
    const panelWidth = panelImageSize.width;
    const panelHeight = panelImageSize.height + labelHeight;
    const canvasWidth = (margin * 2) + (panelWidth * 2) + gutter;
    const canvasHeight = (margin * 2) + panelHeight;
    const studyLabel = getColorStudyPresetLabel(this.state.colorStudy.preset);

    setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
    clearCanvas(this.ctx, this.dom.mainCanvas);

    drawPanel(
      this.ctx,
      originalCanvas,
      margin,
      margin,
      panelWidth,
      panelHeight,
      this.getCompositionChoiceLabel(),
      {
        labelHeight,
        sublabel: "Current reference"
      }
    );

    drawPanel(
      this.ctx,
      colorStudyCanvas,
      margin + panelWidth + gutter,
      margin,
      panelWidth,
      panelHeight,
      studyLabel,
      {
        labelHeight,
        sublabel: "Approximate palette study"
      }
    );

    this.focalStudyLayout = null;
    this.valueStripLayout = null;
    this.updateStatus(`${studyLabel} ready`);
    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  renderPaletteStudyScene() {
    const originalCanvas = this.state.processed.originalCanvas;
    if (!originalCanvas) {
      return;
    }

    const paletteCanvas = createPaletteStudyCanvas(
      originalCanvas,
      this.state.processed.paletteColors,
      this.state.processed.paletteMixNotes
    );

    this.focalStudyLayout = null;
    this.valueStripLayout = null;
    setCanvasSize(this.dom.mainCanvas, paletteCanvas.width, paletteCanvas.height);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.ctx.drawImage(paletteCanvas, 0, 0);

    this.updateStatus("Palette notes ready");
    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  // Render router. Keep multi-panel views explicit until screenshots catch layout drift.
  renderScene() {
    if (this.state.activeStage === "general" && this.state.studySheetPreview.isOpen) {
      this.renderStudySheetPreviewScene();
      return;
    }

    if (this.state.viewMode === "focalStudy") {
      this.renderFocalStudyScene();
      return;
    }

    if (this.state.viewMode === "temperatureStudy") {
      this.renderTemperatureStudyScene();
      return;
    }

    if (this.state.viewMode === "colorStudy") {
      this.renderColorStudyScene();
      return;
    }

    if (this.state.viewMode === "paletteStudy") {
      this.renderPaletteStudyScene();
      return;
    }

    this.focalStudyLayout = null;
    const baseCanvas = this.getActiveBaseCanvas();
    if (!baseCanvas) return;

    const showValueStrip = VALUE_STRIP_VIEW_MODES.includes(this.state.viewMode);
    const stripWidth = showValueStrip ? getValueStripWidth(baseCanvas.width) : 0;

    this.valueStripLayout = showValueStrip
      ? { x: baseCanvas.width, width: stripWidth, height: baseCanvas.height }
      : null;

    setCanvasSize(this.dom.mainCanvas, baseCanvas.width + stripWidth, baseCanvas.height);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.ctx.drawImage(baseCanvas, 0, 0);

    if (this.state.grid.show) {
      drawGridOverlay(this.ctx, { width: baseCanvas.width, height: baseCanvas.height }, this.state.grid);
    }

    if (this.valueStripLayout && this.state.viewMode === "valueGroups") {
      drawValueGroupsBandStripOverlay(this.ctx, {
        x: this.valueStripLayout.x,
        width: this.valueStripLayout.width,
        height: this.valueStripLayout.height,
        count: this.state.valueGroups.count,
        isolatedBand: this.state.valueGroups.isolatedBand
      });
    } else if (this.valueStripLayout) {
      const highlightStep = this.state.valueRead.viewMode === this.state.viewMode
        ? this.state.valueRead.step
        : null;

      drawValueStripOverlay(this.ctx, {
        x: this.valueStripLayout.x,
        width: this.valueStripLayout.width,
        height: this.valueStripLayout.height,
        highlightStep
      });
    }

    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  updateInfo() {
    this.dom.originalSizeText.textContent =
      `${this.state.originalWidth} × ${this.state.originalHeight}px`;

    this.dom.canvasSizeText.textContent =
      `${this.state.workingCanvasWidth} × ${this.state.workingCanvasHeight}px`;

    this.dom.scaleText.textContent =
      getScalePercentage(this.state.workingScale);
  }

  updateStatus(message) {
    this.dom.statusText.textContent = message;
  }

  getStudySheetDefinition(sheetKey) {
    const sheetDefinitions = {
      sheet1: {
        label: "Sheet 1",
        filename: "painters-ref-sheet-1.jpg",
        title: "Painter's Reference Lab — Sheet 1",
        panels: [
          {
            label: "Original",
            canvas: this.state.processed.originalCanvas,
            showGrid: false
          },
          {
            label: "Grayscale",
            canvas: this.state.processed.grayscaleCanvas,
            showGrid: false
          },
          {
            label: "3-Value Notan",
            canvas: this.state.processed.notanCanvas,
            showGrid: false
          },
          {
            label: `Outline (${getOutlineDisplayLabel(this.state.outline)})`,
            canvas: this.getActiveOutlineCanvas(),
            showGrid: true,
            gridOptions: this.state.grid
          }
        ]
      },
      sheet2: {
        label: "Sheet 2",
        filename: "painters-ref-sheet-2.jpg",
        title: "Painter's Reference Lab — Sheet 2",
        panels: [
          {
            label: "Original",
            canvas: this.state.processed.originalCanvas,
            showGrid: false
          },
          {
            label: "Light Mask",
            canvas: this.state.processed.lightMaskCanvas,
            showGrid: false
          },
          {
            label: "Midtone Mask",
            canvas: this.state.processed.midtoneMaskCanvas,
            showGrid: false
          },
          {
            label: "Shadow Mask",
            canvas: this.state.processed.shadowMaskCanvas,
            showGrid: false
          }
        ]
      },
      sheet3: {
        label: "Sheet 3",
        filename: "painters-ref-sheet-3.jpg",
        title: "Painter's Reference Lab — Sheet 3",
        panels: [
          {
            label: "Original",
            canvas: this.state.processed.originalCanvas,
            showGrid: false
          },
          {
            label: "Warm Mask",
            canvas: this.state.processed.warmMaskCanvas,
            showGrid: false
          },
          {
            label: "Cool Mask",
            canvas: this.state.processed.coolMaskCanvas,
            showGrid: false
          },
          {
            label: "Neutral Mask",
            canvas: this.state.processed.neutralMaskCanvas,
            showGrid: false
          }
        ]
      }
    };

    return sheetDefinitions[sheetKey] || sheetDefinitions.sheet1;
  }

  buildStudySheetCanvas(sheetKey, options = {}) {
    const {
      shouldDownload = false
    } = options;
    const definition = this.getStudySheetDefinition(sheetKey);

    return createCompositeSheet(
      definition.panels,
      definition.filename,
      {
        title: definition.title,
        shouldDownload
      }
    );
  }

  openStudySheetPreview(sheetKey = this.state.studySheetPreview.activeSheet) {
    if (!this.state.processed.originalCanvas) {
      alert("Please load an image before previewing sheets.");
      return;
    }

    this.state.activeStage = "general";
    this.state.studySheetPreview.isOpen = true;
    this.state.studySheetPreview.activeSheet = sheetKey;
    this.updateStagePanels();
    this.renderScene();
  }

  closeStudySheetPreview() {
    if (!this.state.studySheetPreview.isOpen) {
      return;
    }

    this.state.studySheetPreview.isOpen = false;
    this.updateStagePanels();
    this.updateStatus("Study sheet preview closed");
    this.renderScene();
  }

  exportActiveStudySheet(sheetKey = this.state.studySheetPreview.activeSheet) {
    if (!this.state.processed.originalCanvas) {
      alert("Please load an image before exporting.");
      return;
    }

    const definition = this.getStudySheetDefinition(sheetKey);
    this.buildStudySheetCanvas(sheetKey, { shouldDownload: true });
    this.updateStatus(`${definition.label} exported`);
  }

  renderStudySheetPreviewScene() {
    const previewCanvas = this.buildStudySheetCanvas(this.state.studySheetPreview.activeSheet, {
      shouldDownload: false
    });
    const activeLabel = this.getStudySheetLabel();

    this.focalStudyLayout = null;
    this.valueStripLayout = null;
    setCanvasSize(this.dom.mainCanvas, previewCanvas.width, previewCanvas.height);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.ctx.drawImage(previewCanvas, 0, 0);

    this.updateStatus(`${activeLabel} preview ready`);
    this.updateInfo();
    this.dom.viewModeText.textContent = `${activeLabel} Preview`;
    this.updateOutlineDetailLabel();
  }

  // Export actions depend on the current render canvas and processed cache.
  exportCurrentView() {
    if (!this.state.processed.originalCanvas) {
      alert("Please load an image before exporting.");
      return;
    }

    if (this.state.studySheetPreview.isOpen) {
      this.state.studySheetPreview.isOpen = false;
      this.updateStagePanels();
      this.renderScene();
    }

    const viewLabel = this.dom.viewModeText.textContent || "current-view";
    const slug = viewLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileStem = createExportFileStem(this.state.loadedFileName);
    const filename = `${fileStem}-${slug || "current-view"}.jpg`;

    downloadCanvas(this.dom.mainCanvas, filename, "image/jpeg", 0.92);
    this.updateStatus("Current view exported");
  }

  exportSheet1() {
    this.exportActiveStudySheet("sheet1");
  }

  exportSheet2() {
    this.exportActiveStudySheet("sheet2");
  }

  exportSheet3() {
    this.exportActiveStudySheet("sheet3");
  }
}

/* ==================================================
   Startup
   ================================================== */

// Service worker caching can keep stale app assets in the browser.
// During M1, prefer hard refresh/cache clear before assuming a code regression.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  new PaintersReferenceApp();
  registerServiceWorker();
});
