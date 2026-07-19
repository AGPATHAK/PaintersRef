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

function createSobelEdgeCanvas(blurredCanvas, threshold) {
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
      const isEdge = magnitude >= threshold;
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

// "Simple" outline reads as closed mass-boundary shapes rather than texture
// edges: quantise the blurred grayscale to a few value regions and mark the
// boundaries between them, instead of raw Sobel gradient edges.
function createPosterizedRegionEdgeCanvas(blurredCanvas, levels) {
  const width = blurredCanvas.width;
  const height = blurredCanvas.height;

  const sourceCtx = blurredCanvas.getContext("2d", { willReadFrequently: true });
  const src = sourceCtx.getImageData(0, 0, width, height).data;

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  const maxLevelIndex = levels - 1;
  const getLevelAt = (x, y) => {
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    const index = (clampedY * width + clampedX) * 4;
    return Math.round((src[index] / 255) * maxLevelIndex);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const currentLevel = getLevelAt(x, y);
      const rightLevel = getLevelAt(x + 1, y);
      const lowerLevel = getLevelAt(x, y + 1);
      const isEdge = currentLevel !== rightLevel || currentLevel !== lowerLevel;
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

// Drops isolated edge pixels (fewer than 2 edge neighbours in the
// 8-neighbourhood) so outlines read as continuous shapes instead of pepper
// noise. Run twice: the second pass cleans up pairs exposed by the first.
function despeckleEdgeCanvas(edgeCanvas, passes = 2) {
  let currentCanvas = edgeCanvas;

  for (let pass = 0; pass < passes; pass += 1) {
    const width = currentCanvas.width;
    const height = currentCanvas.height;

    const sourceCtx = currentCanvas.getContext("2d", { willReadFrequently: true });
    const src = sourceCtx.getImageData(0, 0, width, height).data;

    const outputCanvas = createOffscreenCanvas(width, height);
    const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
    const outputImageData = outputCtx.createImageData(width, height);
    const out = outputImageData.data;

    const isEdgeAt = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return false;
      }

      return src[(y * width + x) * 4] === 0;
    };

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        let outputValue = 255;

        if (src[index] === 0) {
          let neighborCount = 0;

          for (let ky = -1; ky <= 1; ky += 1) {
            for (let kx = -1; kx <= 1; kx += 1) {
              if (kx === 0 && ky === 0) {
                continue;
              }

              if (isEdgeAt(x + kx, y + ky)) {
                neighborCount += 1;
              }
            }
          }

          outputValue = neighborCount >= 2 ? 0 : 255;
        }

        out[index] = outputValue;
        out[index + 1] = outputValue;
        out[index + 2] = outputValue;
        out[index + 3] = 255;
      }
    }

    outputCtx.putImageData(outputImageData, 0, 0);
    currentCanvas = outputCanvas;
  }

  return currentCanvas;
}

function createOutlineSketchCanvasFromGrayscaleCanvas(grayscaleCanvas, outlineOptions) {
  const settings = getOutlineRenderSettings(outlineOptions);
  const blurredCanvas = createBlurredGrayscaleCanvas(grayscaleCanvas, settings.blurPasses);

  const edgeCanvas = outlineOptions.detail === "low"
    ? createPosterizedRegionEdgeCanvas(blurredCanvas, 3)
    : createSobelEdgeCanvas(blurredCanvas, settings.threshold);

  return despeckleEdgeCanvas(edgeCanvas);
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

// Softness 0-100 maps to a Kuwahara window radius 0.5%-3.0% of the image
// diagonal, shared by grayscale and colour squint so both read as the same
// "half-closed eyes" strength. The window can go bigger than a plain blur
// would tolerate, since Kuwahara refuses to smooth across strong edges.
function getSquintBlurSettings(softness) {
  const clampedSoftness = clamp(softness, 0, 100);
  const normalized = clampedSoftness / 100;

  return {
    radiusPercent: 0.5 + (normalized * 2.5),
    valueLevels: clamp(Math.round(12 - (normalized * 8)), 4, 12)
  };
}

// A plain Kuwahara filter is unstable on real photographic texture (dappled
// foliage, grass): neighbouring pixels can pick different "most uniform"
// quadrants from noise alone, producing a blotchy, speckled look instead of
// smooth masses. A light pre-blur removes that fine noise so the quadrant
// choice is stable, while strong value edges (sky/tree boundary) survive
// the pre-blur and still get preserved by the Kuwahara pass on top.
//
// The pre-blur amount is fixed, not scaled with the requested squint
// radius: real photo noise/texture sits at roughly the same fine spatial
// scale regardless of how strong a squint the painter asked for, so even a
// gentle (low-softness) Kuwahara radius needs this same cleanup pass to
// avoid the blotchy look.
const SQUINT_PRE_BLUR_PERCENT = 1.75;

function createSquintSmoothedCanvas(sourceCanvas, radiusPercent) {
  const preBlurredCanvas = createStrongBlurCanvas(sourceCanvas, SQUINT_PRE_BLUR_PERCENT);
  return createKuwaharaCanvas(preBlurredCanvas, radiusPercent);
}

function createSquintCanvasFromGrayscaleCanvas(sourceCanvas, options = {}) {
  const { softness = 35 } = options;
  const { radiusPercent, valueLevels } = getSquintBlurSettings(softness);

  const blurredCanvas = createSquintSmoothedCanvas(sourceCanvas, radiusPercent);

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

// Colour counterpart to the grayscale squint: same edge-preserving smoothing
// strength, muted saturation, and posterised lightness, but hue is preserved
// so masses read as soft muted colour rather than gray.
function createColorSquintCanvasFromCanvas(originalCanvas, options = {}) {
  const { softness = 35 } = options;
  const { radiusPercent, valueLevels } = getSquintBlurSettings(softness);
  const maxStepIndex = valueLevels - 1;

  const blurredCanvas = createSquintSmoothedCanvas(originalCanvas, radiusPercent);

  const outputCanvas = createOffscreenCanvas(originalCanvas.width, originalCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  outputCtx.drawImage(blurredCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const mutedSaturation = hsl.saturation * 0.7;
    const steppedLightnessStep = Math.round((hsl.lightness / 100) * maxStepIndex);
    const steppedLightness = (steppedLightnessStep / maxStepIndex) * 100;
    const rgb = hslToRgb(hsl.hue, mutedSaturation, steppedLightness);

    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
    data[i + 3] = 255;
  }

  outputCtx.putImageData(imageData, 0, 0);

  return outputCanvas;
}
