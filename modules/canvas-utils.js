/* ==================================================
   Canvas Utilities
   ================================================== */

function setCanvasSize(canvas, width, height) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  canvas.width = safeWidth;
  canvas.height = safeHeight;
}

function clearCanvas(ctx, canvas) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function computeContainSize(sourceWidth, sourceHeight, maxWidth, maxHeight) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 1, height: 1, scale: 1 };
  }

  const widthRatio = maxWidth / sourceWidth;
  const heightRatio = maxHeight / sourceHeight;
  const scale = Math.min(widthRatio, heightRatio, 1);

  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
    scale
  };
}

function drawImageContained(ctx, image, canvas) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const fitted = computeContainSize(
    sourceWidth,
    sourceHeight,
    canvas.width,
    canvas.height
  );

  const offsetX = Math.round((canvas.width - fitted.width) / 2);
  const offsetY = Math.round((canvas.height - fitted.height) / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, offsetX, offsetY, fitted.width, fitted.height);
  ctx.restore();
}

function getScalePercentage(scale) {
  return `${Math.round(scale * 100)}%`;
}

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function cloneCanvas(sourceCanvas) {
  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d");

  outputCtx.drawImage(sourceCanvas, 0, 0);
  return outputCanvas;
}

// Downscale->upscale blur. Deterministic across browsers, unlike ctx.filter blur.
// radiusPercent is expressed as a percentage of the image diagonal so the
// merge strength stays consistent across different reference image sizes.
function createStrongBlurCanvas(sourceCanvas, radiusPercent) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const diagonal = Math.sqrt((width * width) + (height * height));
  const radiusPx = Math.max(1, (diagonal * Math.max(0, radiusPercent)) / 100);
  const downscaleFactor = Math.max(2, Math.round(radiusPx));

  const targetWidth = Math.max(2, Math.round(width / downscaleFactor));
  const targetHeight = Math.max(2, Math.round(height / downscaleFactor));
  const halfWidth = Math.max(targetWidth, Math.round(width / 2));
  const halfHeight = Math.max(targetHeight, Math.round(height / 2));

  const halfCanvas = createOffscreenCanvas(halfWidth, halfHeight);
  const halfCtx = halfCanvas.getContext("2d");
  halfCtx.imageSmoothingEnabled = true;
  halfCtx.imageSmoothingQuality = "high";
  halfCtx.drawImage(sourceCanvas, 0, 0, halfWidth, halfHeight);

  const smallCanvas = createOffscreenCanvas(targetWidth, targetHeight);
  const smallCtx = smallCanvas.getContext("2d");
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.imageSmoothingQuality = "high";
  smallCtx.drawImage(halfCanvas, 0, 0, targetWidth, targetHeight);

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";
  outputCtx.drawImage(smallCanvas, 0, 0, width, height);

  return outputCanvas;
}

// Deterministic area-average downscale: every destination pixel is the mean
// of the exact (non-overlapping) rectangle of source pixels it covers, via a
// summed-area table. Used instead of `drawImage` scaling, whose bilinear
// interpolation is implementation-defined and not guaranteed bit-identical
// across browser engines (see docs/squint-algorithm-recommendation.md §3).
function areaAverageDownscale(sourceCanvas, targetWidth, targetHeight) {
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const src = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight).data;

  const sizeX = sourceWidth + 1;
  const satLength = sizeX * (sourceHeight + 1);
  const sumR = new Float64Array(satLength);
  const sumG = new Float64Array(satLength);
  const sumB = new Float64Array(satLength);

  for (let y = 0; y < sourceHeight; y += 1) {
    let rowR = 0;
    let rowG = 0;
    let rowB = 0;
    const aboveRowBase = y * sizeX;
    const currentRowBase = aboveRowBase + sizeX;

    for (let x = 0; x < sourceWidth; x += 1) {
      const pixelIndex = ((y * sourceWidth) + x) * 4;
      rowR += src[pixelIndex];
      rowG += src[pixelIndex + 1];
      rowB += src[pixelIndex + 2];

      const aboveIndex = aboveRowBase + x + 1;
      const currentIndex = currentRowBase + x + 1;

      sumR[currentIndex] = sumR[aboveIndex] + rowR;
      sumG[currentIndex] = sumG[aboveIndex] + rowG;
      sumB[currentIndex] = sumB[aboveIndex] + rowB;
    }
  }

  const safeTargetWidth = Math.max(1, Math.round(targetWidth));
  const safeTargetHeight = Math.max(1, Math.round(targetHeight));
  const outputCanvas = createOffscreenCanvas(safeTargetWidth, safeTargetHeight);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(safeTargetWidth, safeTargetHeight);
  const out = outputImageData.data;

  for (let ty = 0; ty < safeTargetHeight; ty += 1) {
    const y0 = Math.floor((ty * sourceHeight) / safeTargetHeight);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * sourceHeight) / safeTargetHeight));
    const rowTopBase = y0 * sizeX;
    const rowBottomBase = y1 * sizeX;

    for (let tx = 0; tx < safeTargetWidth; tx += 1) {
      const x0 = Math.floor((tx * sourceWidth) / safeTargetWidth);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * sourceWidth) / safeTargetWidth));
      const count = (x1 - x0) * (y1 - y0);

      const r = (sumR[rowBottomBase + x1] - sumR[rowBottomBase + x0] - sumR[rowTopBase + x1] + sumR[rowTopBase + x0]) / count;
      const g = (sumG[rowBottomBase + x1] - sumG[rowBottomBase + x0] - sumG[rowTopBase + x1] + sumG[rowTopBase + x0]) / count;
      const b = (sumB[rowBottomBase + x1] - sumB[rowBottomBase + x0] - sumB[rowTopBase + x1] + sumB[rowTopBase + x0]) / count;

      const index = ((ty * safeTargetWidth) + tx) * 4;
      out[index] = Math.round(r);
      out[index + 1] = Math.round(g);
      out[index + 2] = Math.round(b);
      out[index + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

// Deterministic bilinear upscale: hand-rolled instead of `drawImage` scaling
// for the same cross-browser-determinism reason as areaAverageDownscale.
function bilinearUpscale(sourceCanvas, targetWidth, targetHeight) {
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const src = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight).data;

  const safeTargetWidth = Math.max(1, Math.round(targetWidth));
  const safeTargetHeight = Math.max(1, Math.round(targetHeight));
  const outputCanvas = createOffscreenCanvas(safeTargetWidth, safeTargetHeight);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(safeTargetWidth, safeTargetHeight);
  const out = outputImageData.data;

  const scaleX = sourceWidth / safeTargetWidth;
  const scaleY = sourceHeight / safeTargetHeight;

  for (let ty = 0; ty < safeTargetHeight; ty += 1) {
    const sy = ((ty + 0.5) * scaleY) - 0.5;
    const y0 = Math.max(0, Math.min(sourceHeight - 1, Math.floor(sy)));
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const fy = Math.max(0, Math.min(1, sy - y0));

    for (let tx = 0; tx < safeTargetWidth; tx += 1) {
      const sx = ((tx + 0.5) * scaleX) - 0.5;
      const x0 = Math.max(0, Math.min(sourceWidth - 1, Math.floor(sx)));
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const fx = Math.max(0, Math.min(1, sx - x0));

      const i00 = ((y0 * sourceWidth) + x0) * 4;
      const i10 = ((y0 * sourceWidth) + x1) * 4;
      const i01 = ((y1 * sourceWidth) + x0) * 4;
      const i11 = ((y1 * sourceWidth) + x1) * 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const outIndex = ((ty * safeTargetWidth) + tx) * 4;

      out[outIndex] = Math.round(
        (src[i00] * w00) + (src[i10] * w10) + (src[i01] * w01) + (src[i11] * w11)
      );
      out[outIndex + 1] = Math.round(
        (src[i00 + 1] * w00) + (src[i10 + 1] * w10) + (src[i01 + 1] * w01) + (src[i11 + 1] * w11)
      );
      out[outIndex + 2] = Math.round(
        (src[i00 + 2] * w00) + (src[i10 + 2] * w10) + (src[i01 + 2] * w01) + (src[i11 + 2] * w11)
      );
      out[outIndex + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

const BILATERAL_RADIUS = 2;
const BILATERAL_SPATIAL_SIGMA = 1.4;

// Fixed 5x5 spatial weights, precomputed once at load. Math.exp's last-bit
// result can differ across JS engines, but rounding into a fixed-precision
// integer table (multiply by 4096, floor) quantizes away any such
// difference, keeping the filter bit-identical across browsers.
const BILATERAL_SPATIAL_WEIGHTS = (() => {
  const size = (BILATERAL_RADIUS * 2) + 1;
  const weights = new Array(size * size);
  const twoSigmaSq = 2 * BILATERAL_SPATIAL_SIGMA * BILATERAL_SPATIAL_SIGMA;

  for (let dy = -BILATERAL_RADIUS; dy <= BILATERAL_RADIUS; dy += 1) {
    for (let dx = -BILATERAL_RADIUS; dx <= BILATERAL_RADIUS; dx += 1) {
      const distanceSq = (dx * dx) + (dy * dy);
      weights[((dy + BILATERAL_RADIUS) * size) + (dx + BILATERAL_RADIUS)] =
        Math.floor(4096 * Math.exp(-distanceSq / twoSigmaSq));
    }
  }

  return weights;
})();

function buildBilateralRangeLut(rangeSigma) {
  const lut = new Int32Array(256);
  const twoSigmaSq = 2 * rangeSigma * rangeSigma;

  for (let d = 0; d < 256; d += 1) {
    lut[d] = Math.floor(4096 * Math.exp(-(d * d) / twoSigmaSq));
  }

  return lut;
}

// Luma-guided 5x5 bilateral filter: a weighted average of neighbouring
// pixels, weighted by both spatial distance and luma similarity. Unlike
// Kuwahara's hard "pick one quadrant" decision, every output is a smooth
// blend, so there is no discrete choice to destabilize on noise, and on a
// smooth gradient it degrades gracefully to a plain local mean instead of
// terracing. Iterate this 2-3 times to progressively flatten texture while
// real edges stay crisp (averaging never crosses them).
function bilateralPass5x5(sourceCanvas, rangeSigma) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const src = sourceCtx.getImageData(0, 0, width, height).data;

  const radius = BILATERAL_RADIUS;
  const size = (radius * 2) + 1;
  const rangeLut = buildBilateralRangeLut(rangeSigma);

  const luma = new Uint8ClampedArray(width * height);
  for (let pixelIndex = 0, lumaIndex = 0; lumaIndex < luma.length; pixelIndex += 4, lumaIndex += 1) {
    luma[lumaIndex] = Math.round(
      (0.299 * src[pixelIndex]) + (0.587 * src[pixelIndex + 1]) + (0.114 * src[pixelIndex + 2])
    );
  }

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const centerLuma = luma[(y * width) + x];
      let weightSum = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      for (let dy = -radius; dy <= radius; dy += 1) {
        const ny = y + dy < 0 ? 0 : (y + dy >= height ? height - 1 : y + dy);
        const rowWeightBase = (dy + radius) * size;

        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx < 0 ? 0 : (x + dx >= width ? width - 1 : x + dx);
          const neighborIndex = (ny * width) + nx;
          const neighborLuma = luma[neighborIndex];
          const lumaDiff = neighborLuma > centerLuma
            ? neighborLuma - centerLuma
            : centerLuma - neighborLuma;

          const weight = BILATERAL_SPATIAL_WEIGHTS[rowWeightBase + dx + radius] * rangeLut[lumaDiff];
          const pixelIndex = neighborIndex * 4;

          weightSum += weight;
          rSum += weight * src[pixelIndex];
          gSum += weight * src[pixelIndex + 1];
          bSum += weight * src[pixelIndex + 2];
        }
      }

      const outIndex = ((y * width) + x) * 4;
      out[outIndex] = Math.round(rSum / weightSum);
      out[outIndex + 1] = Math.round(gSum / weightSum);
      out[outIndex + 2] = Math.round(bSum / weightSum);
      out[outIndex + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}
