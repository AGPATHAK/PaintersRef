/* ==================================================
   Drawing / Observation Processors
   ================================================== */

function getOutlinePresetSettings(detailLevel, sourceKey = "gray") {
  const presetsBySource = {
    original: {
      low: { label: "Simple", sensitivity: 20, smoothing: 3, sourcePrep: {} },
      medium: { label: "Balanced", sensitivity: 44, smoothing: 2, sourcePrep: {} },
      high: { label: "Detailed", sensitivity: 70, smoothing: 1, sourcePrep: {} }
    },
    gray: {
      low: { label: "Simple", sensitivity: 24, smoothing: 3, sourcePrep: { graySimplification: 12 } },
      medium: { label: "Balanced", sensitivity: 52, smoothing: 2, sourcePrep: { graySimplification: 0 } },
      high: { label: "Detailed", sensitivity: 82, smoothing: 1, sourcePrep: { graySimplification: 0 } }
    },
    squint: {
      low: { label: "Simple", sensitivity: 24, smoothing: 3, sourcePrep: { squintSoftness: 70 } },
      medium: { label: "Balanced", sensitivity: 48, smoothing: 2, sourcePrep: { squintSoftness: 50 } },
      high: { label: "Detailed", sensitivity: 74, smoothing: 1, sourcePrep: { squintSoftness: 32 } }
    },
    notan: {
      low: {
        label: "Simple",
        sensitivity: 18,
        smoothing: 3,
        sourcePrep: { notanShadowCutoff: 105, notanLightCutoff: 150 }
      },
      medium: {
        label: "Balanced",
        sensitivity: 36,
        smoothing: 2,
        sourcePrep: { notanShadowCutoff: 90, notanLightCutoff: 165 }
      },
      high: {
        label: "Detailed",
        sensitivity: 58,
        smoothing: 1,
        sourcePrep: { notanShadowCutoff: 75, notanLightCutoff: 180 }
      }
    }
  };

  const presets = presetsBySource[sourceKey] || presetsBySource.gray;
  return presets[detailLevel] || presets.medium;
}

function getMatchingOutlinePresetKey(outlineOptions) {
  return outlineOptions.detail || "medium";
}

function getOutlineDisplayLabel(outlineOptions) {
  return getOutlinePresetSettings(getMatchingOutlinePresetKey(outlineOptions)).label;
}

function getOutlineRenderSettings(outlineOptions) {
  const sensitivity = clamp(outlineOptions.sensitivity, 10, 120);
  const smoothing = clamp(outlineOptions.smoothing, 0, 3);

  return {
    sensitivity,
    smoothing,
    threshold: clamp(200 - sensitivity, 58, 184),
    blurPasses: smoothing
  };
}

function blurGrayscaleCanvasOnce(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const sourceImageData = sourceCtx.getImageData(0, 0, width, height);
  const src = sourceImageData.data;

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  const getGrayAt = (x, y) => {
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    const index = (clampedY * width + clampedX) * 4;
    return src[index];
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          sum += getGrayAt(x + kx, y + ky);
        }
      }

      const blurred = Math.round(sum / 9);
      const index = (y * width + x) * 4;

      out[index] = blurred;
      out[index + 1] = blurred;
      out[index + 2] = blurred;
      out[index + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

function createBlurredGrayscaleCanvas(sourceCanvas, blurPasses) {
  let currentCanvas = sourceCanvas;

  for (let i = 0; i < blurPasses; i += 1) {
    currentCanvas = blurGrayscaleCanvasOnce(currentCanvas);
  }

  return currentCanvas;
}

function createOutlineSketchCanvasFromGrayscaleCanvas(grayscaleCanvas, outlineOptions) {
  const settings = getOutlineRenderSettings(outlineOptions);
  const blurredCanvas = createBlurredGrayscaleCanvas(grayscaleCanvas, settings.blurPasses);

  const width = blurredCanvas.width;
  const height = blurredCanvas.height;

  const sourceCtx = blurredCanvas.getContext("2d", { willReadFrequently: true });
  const sourceImageData = sourceCtx.getImageData(0, 0, width, height);
  const src = sourceImageData.data;

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  const getGrayAt = (x, y) => {
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    const index = (clampedY * width + clampedX) * 4;
    return src[index];
  };

  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];

  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const gray = getGrayAt(x + kx, y + ky);
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt((gx * gx) + (gy * gy));
      const isEdge = magnitude >= settings.threshold;
      const outputValue = isEdge ? 0 : 255;
      const index = (y * width + x) * 4;

      out[index] = outputValue;
      out[index + 1] = outputValue;
      out[index + 2] = outputValue;
      out[index + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

function getValueContourDetailSettings(detailLevel) {
  const settings = {
    low: {
      label: "Simple",
      blurPasses: 3,
      valueLevels: 3,
      compareDistance: 3,
      lineValue: 42,
      thickness: 2
    },
    medium: {
      label: "Balanced",
      blurPasses: 2,
      valueLevels: 4,
      compareDistance: 2,
      lineValue: 32,
      thickness: 1
    },
    high: {
      label: "Detailed",
      blurPasses: 1,
      valueLevels: 5,
      compareDistance: 1,
      lineValue: 24,
      thickness: 1
    }
  };

  return settings[detailLevel] || settings.medium;
}

function getValueContourDisplayLabel(detailLevel) {
  return getValueContourDetailSettings(detailLevel).label;
}

function createValueContourCanvasFromGrayscaleCanvas(grayscaleCanvas, options = {}) {
  const settings = getValueContourDetailSettings(options.detail || "medium");
  const blurredCanvas = createBlurredGrayscaleCanvas(grayscaleCanvas, settings.blurPasses);
  const width = blurredCanvas.width;
  const height = blurredCanvas.height;

  const sourceCtx = blurredCanvas.getContext("2d", { willReadFrequently: true });
  const sourceImageData = sourceCtx.getImageData(0, 0, width, height);
  const src = sourceImageData.data;

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  const maxLevelIndex = settings.valueLevels - 1;
  const quantizeGray = (gray) => Math.round((gray / 255) * maxLevelIndex);
  const setLinePixel = (x, y, value) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const index = (y * width + x) * 4;
    out[index] = Math.min(out[index], value);
    out[index + 1] = Math.min(out[index + 1], value);
    out[index + 2] = Math.min(out[index + 2], value);
  };
  const getGrayAt = (x, y) => {
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    const index = (clampedY * width + clampedX) * 4;
    return src[index];
  };

  for (let i = 0; i < out.length; i += 4) {
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = 255;
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const gray = getGrayAt(x, y);
      const currentLevel = quantizeGray(gray);
      const rightGray = getGrayAt(x + settings.compareDistance, y);
      const lowerGray = getGrayAt(x, y + settings.compareDistance);
      const rightLevel = quantizeGray(rightGray);
      const lowerLevel = quantizeGray(lowerGray);
      const horizontalLevelGap = Math.abs(currentLevel - rightLevel);
      const verticalLevelGap = Math.abs(currentLevel - lowerLevel);
      const strongestLevelGap = Math.max(horizontalLevelGap, verticalLevelGap);

      if (strongestLevelGap < 1) {
        continue;
      }

      const outputValue = strongestLevelGap > 1
        ? settings.lineValue
        : clamp(settings.lineValue + 38, 0, 150);

      setLinePixel(x, y, outputValue);

      if (settings.thickness > 1) {
        setLinePixel(x + 1, y, outputValue);
        setLinePixel(x, y + 1, outputValue);
      }
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

function createMirroredCanvasFromCanvas(sourceCanvas) {
  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d");

  outputCtx.save();
  outputCtx.translate(sourceCanvas.width, 0);
  outputCtx.scale(-1, 1);
  outputCtx.drawImage(sourceCanvas, 0, 0);
  outputCtx.restore();

  return outputCanvas;
}

// Softness 0-100 maps to blur radius 0.5%-4.0% of the image diagonal, shared
// by grayscale and colour squint so both read as the same "half-closed eyes" strength.
function getSquintBlurSettings(softness) {
  const clampedSoftness = clamp(softness, 0, 100);
  const normalized = clampedSoftness / 100;

  return {
    radiusPercent: 0.5 + (normalized * 3.5),
    valueLevels: clamp(Math.round(12 - (normalized * 8)), 4, 12)
  };
}

function createSquintCanvasFromGrayscaleCanvas(sourceCanvas, options = {}) {
  const { softness = 35 } = options;
  const { radiusPercent, valueLevels } = getSquintBlurSettings(softness);

  const blurredCanvas = createStrongBlurCanvas(sourceCanvas, radiusPercent);

  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.drawImage(blurredCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;
  const maxStepIndex = valueLevels - 1;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] / 255;
    const steppedValue = Math.round(value * maxStepIndex) / maxStepIndex;
    const gray = Math.round(steppedValue * 255);

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }

  outputCtx.putImageData(imageData, 0, 0);

  return outputCanvas;
}
