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

// Squint pipeline (docs/squint-algorithm-recommendation.md): value grouping
// with edge integrity, not smoothing. Downscale to a small working
// resolution (this itself is the first, cheapest texture-destruction step),
// iterate a small edge-aware bilateral filter there (mass-forming: texture
// converges to flat regions while real edges get crisper each pass, since
// averaging never crosses them), apply a soft value quantization (this is
// what actually produces the flat-mass look, with boundaries that track
// real iso-value contours instead of a blur radius), then upscale back.
// Softness 0-100 drives every stage coherently.
function getSquintPipelineSettings(softness) {
  const t = clamp(softness, 0, 100) / 100;
  const lerp = (a, b, amount) => a + ((b - a) * amount);

  return {
    workingWidthRatio: lerp(0.40, 0.14, t),
    rangeSigma: lerp(10, 26, t),
    bilateralIterations: softness < 40 ? 2 : 3,
    valueLevels: Math.round(lerp(9, 4, t)),
    // NOTE: the research doc (docs/squint-algorithm-recommendation.md §4.1)
    // originally suggested lerp(0.9, 0.55, t) here. Verified against a real
    // photo that range keeps the linear (near-identity) term so dominant
    // that quantization barely deviates from the continuous input at any
    // softness - no visible value banding. bandSoftness must go near 0 for
    // the cubic ease term to actually flatten each band; lower still means
    // harder/more-quantized as softness increases, per the doc's intent.
    bandSoftness: lerp(0.3, 0.0, t)
  };
}

// Soft luminance quantization: eases into and out of each flat value step
// instead of a hard round, so a smooth gradient settles into a few
// gently-transitioning bands (stable, painterly) rather than a wandering
// hard contour. At a real silhouette (large value gap) the eased transition
// is far narrower than the gap, so that edge still reads crisp.
function applySquintValueQuantization(sourceCanvas, options) {
  const { levels, bandSoftness, mode } = options;
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const { data } = imageData;

  const maxLevelIndex = Math.max(1, levels - 1);
  const step = 1 / maxLevelIndex;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = ((0.299 * r) + (0.587 * g) + (0.114 * b)) / 255;

    const qNearest = Math.round(luma / step) * step;
    const delta = (luma - qNearest) / step;
    const softDelta = delta * (bandSoftness + ((1 - bandSoftness) * 4 * delta * delta));
    const quantizedLuma = clamp(qNearest + (softDelta * step), 0, 1);

    if (mode === "color") {
      const chromaScale = luma > 0.001 ? quantizedLuma / luma : 1;
      const scaledR = clamp(r * chromaScale, 0, 255);
      const scaledG = clamp(g * chromaScale, 0, 255);
      const scaledB = clamp(b * chromaScale, 0, 255);
      const gray = quantizedLuma * 255;
      const chromaMix = 0.8;

      data[i] = Math.round(gray + (chromaMix * (scaledR - gray)));
      data[i + 1] = Math.round(gray + (chromaMix * (scaledG - gray)));
      data[i + 2] = Math.round(gray + (chromaMix * (scaledB - gray)));
    } else {
      const gray = Math.round(quantizedLuma * 255);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    data[i + 3] = 255;
  }

  sourceCtx.putImageData(imageData, 0, 0);
  return sourceCanvas;
}

// Shared squint processor for both Painting-stage views (Gray/Colour) and
// the Drawing-stage "Outline Source: Squint" recipe. Always takes the
// colour original as input, even for gray mode: the bilateral pass is
// luma-guided regardless, and grayscale conversion happens only at the
// final quantization stage.
function createSquintCanvasFromCanvas(originalCanvas, options = {}) {
  const { softness = 35, mode = "gray" } = options;
  const settings = getSquintPipelineSettings(softness);

  const workingWidth = Math.max(2, Math.round(originalCanvas.width * settings.workingWidthRatio));
  const workingHeight = Math.max(2, Math.round(originalCanvas.height * settings.workingWidthRatio));

  let workingCanvas = areaAverageDownscale(originalCanvas, workingWidth, workingHeight);

  for (let pass = 0; pass < settings.bilateralIterations; pass += 1) {
    workingCanvas = bilateralPass5x5(workingCanvas, settings.rangeSigma);
  }

  const quantizedCanvas = applySquintValueQuantization(workingCanvas, {
    levels: settings.valueLevels,
    bandSoftness: settings.bandSoftness,
    mode
  });

  return bilinearUpscale(quantizedCanvas, originalCanvas.width, originalCanvas.height);
}

// Outline via Squint: instead of raw Sobel gradient magnitude (which spikes on
// every leaf/twig in foliage-heavy landscapes, forcing despeckle to patch over
// noise rather than fix its source), trace boundaries directly on Squint's own
// mass-forming output. Squint's bilateral+quantize pipeline already turns
// texture into a few flat, edge-respecting value regions - re-quantizing that
// output to the same level count and marking adjacent-level mismatches
// (the existing "Simple" preset technique, createPosterizedRegionEdgeCanvas)
// recovers real object silhouettes instead of gradient noise. No new
// low-level pixel code needed: this only recombines existing building blocks.
function createSquintRegionOutlineCanvas(originalCanvas, softness) {
  const settings = getSquintPipelineSettings(softness);
  const squintCanvas = createSquintCanvasFromCanvas(originalCanvas, { softness, mode: "gray" });
  const edgeCanvas = createPosterizedRegionEdgeCanvas(squintCanvas, settings.valueLevels);
  return despeckleEdgeCanvas(edgeCanvas);
}
