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

// Per-image notan cutoffs from the 33rd/66th percentile of the value
// histogram, so a low-key or high-key reference does not collapse to a
// nearly all-black or all-white 3-value split.
function computeAdaptiveNotanCutoffs(grayscaleCanvas) {
  const ctx = grayscaleCanvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, grayscaleCanvas.width, grayscaleCanvas.height);

  const histogram = new Array(256).fill(0);
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]] += 1;
    totalPixels += 1;
  }

  const percentileValue = (percentile) => {
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

  const shadowCutoff = clamp(percentileValue(0.33), 40, 140);
  let lightCutoff = clamp(percentileValue(0.66), 130, 220);

  if (lightCutoff - shadowCutoff < 10) {
    lightCutoff = Math.min(220, shadowCutoff + 10);
  }

  return { shadowCutoff, lightCutoff };
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
