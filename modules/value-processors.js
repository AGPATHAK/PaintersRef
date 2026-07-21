/* ==================================================
   Value Processors
   ================================================== */

function createGrayscaleCanvasFromCanvas(sourceCanvas) {
  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });

  outputCtx.drawImage(sourceCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round((0.299 * r) + (0.587 * g) + (0.114 * b));

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas;
}

// Returns a function mapping a percentile (0-1) to the grayscale value below
// which that fraction of pixels falls, from the image's own value histogram.
// Shared by adaptive Notan cutoffs and Value Groups banding so both derive
// their splits from the actual image rather than fixed thresholds.
function buildGrayscalePercentileLookup(grayscaleCanvas) {
  const ctx = grayscaleCanvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, grayscaleCanvas.width, grayscaleCanvas.height);

  const histogram = new Array(256).fill(0);
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]] += 1;
    totalPixels += 1;
  }

  return (percentile) => {
    const target = totalPixels * percentile;
    let cumulative = 0;

    for (let value = 0; value < 256; value += 1) {
      cumulative += histogram[value];
      if (cumulative >= target) {
        return value;
      }
    }

    return 255;
  };
}

// Per-image notan cutoffs from the 33rd/66th percentile of the value
// histogram, so a low-key or high-key reference does not collapse to a
// nearly all-black or all-white 3-value split.
function computeAdaptiveNotanCutoffs(grayscaleCanvas) {
  const percentileValue = buildGrayscalePercentileLookup(grayscaleCanvas);

  const shadowCutoff = clamp(percentileValue(0.33), 40, 140);
  let lightCutoff = clamp(percentileValue(0.66), 130, 220);

  if (lightCutoff - shadowCutoff < 10) {
    lightCutoff = Math.min(220, shadowCutoff + 10);
  }

  return { shadowCutoff, lightCutoff };
}

// Value Groups' own neutral fill for pixels outside the isolated band, when
// isolating - a flat pale tone rather than the source's own light band, so
// the isolated shape reads clearly against a blank field.
const VALUE_GROUPS_ISOLATE_NEUTRAL_GRAY = 232;

// Posterizes to `count` (2-5) equal-population value bands: cutoffs come from
// equal percentile splits of the image's own histogram (same idea as adaptive
// Notan), and output greys are evenly spaced across 0-255 regardless of where
// the source values actually cluster - so a 4-value split always reads as
// 4 distinct steps, not 4 steps bunched into one visual grey.
//
// `options.isolateBand`, if set (0-indexed), replaces the old dedicated
// Light/Midtone/Shadow Mask views: every pixel outside that one band gets a
// flat neutral fill instead of its own band's grey, so only that band's
// shape reads against a blank field. Same band-membership computation either
// way - isolating only changes which colour gets written per pixel.
function createValueGroupsCanvasFromGrayscaleCanvas(grayscaleCanvas, options = {}) {
  const levels = clamp(Math.round(options.count || 4), 2, 5);
  const percentileValue = buildGrayscalePercentileLookup(grayscaleCanvas);
  const isolateBand = Number.isInteger(options.isolateBand) ? options.isolateBand : null;

  const cutoffs = [];
  for (let band = 1; band < levels; band += 1) {
    cutoffs.push(percentileValue(band / levels));
  }

  const outputCanvas = createOffscreenCanvas(grayscaleCanvas.width, grayscaleCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  outputCtx.drawImage(grayscaleCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;
  const maxLevelIndex = levels - 1;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    let band = 0;

    while (band < cutoffs.length && value > cutoffs[band]) {
      band += 1;
    }

    const gray = isolateBand === null || band === isolateBand
      ? Math.round((band / maxLevelIndex) * 255)
      : VALUE_GROUPS_ISOLATE_NEUTRAL_GRAY;

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas;
}

function createNotanCanvasFromGrayscaleCanvas(grayscaleCanvas, options = {}) {
  const {
    shadowCutoff = 85,
    lightCutoff = 170
  } = options;
  const outputCanvas = createOffscreenCanvas(grayscaleCanvas.width, grayscaleCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });

  outputCtx.drawImage(grayscaleCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    let posterized = 255;

    if (value <= shadowCutoff) {
      posterized = 0;
    } else if (value < lightCutoff) {
      posterized = 127;
    }

    data[i] = posterized;
    data[i + 1] = posterized;
    data[i + 2] = posterized;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas;
}
