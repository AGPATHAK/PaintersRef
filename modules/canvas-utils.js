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

// Edge-preserving smoothing (Kuwahara-style): for each pixel, computes the
// mean and variance of 4 overlapping neighbourhood quadrants and outputs the
// mean of whichever quadrant is most uniform. Flat or textured regions get
// smoothed fully, but a quadrant straddling a strong value boundary has high
// variance and gets rejected, so the boundary itself stays legible instead
// of melting like a plain blur. Uses summed-area tables so the cost per
// pixel is O(1) regardless of window size.
//
// Runs on a half-resolution copy for speed (a step later posterises the
// result anyway, so the extra half-pixel of upscale softening at region
// boundaries is not visible) and upscales the result back to full size.
function createKuwaharaCanvas(sourceCanvas, radiusPercent) {
  const downscaleFactor = sourceCanvas.width > 400 ? 2 : 1;

  if (downscaleFactor === 1) {
    return computeKuwaharaSmoothing(sourceCanvas, radiusPercent);
  }

  const scaledCanvas = createOffscreenCanvas(
    Math.max(2, Math.round(sourceCanvas.width / downscaleFactor)),
    Math.max(2, Math.round(sourceCanvas.height / downscaleFactor))
  );
  const scaledCtx = scaledCanvas.getContext("2d");
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = "high";
  scaledCtx.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  const smoothedCanvas = computeKuwaharaSmoothing(scaledCanvas, radiusPercent);

  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";
  outputCtx.drawImage(smoothedCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height);

  return outputCanvas;
}

function computeKuwaharaSmoothing(sourceCanvas, radiusPercent) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const diagonal = Math.sqrt((width * width) + (height * height));
  const windowRadius = Math.max(1, Math.round((diagonal * Math.max(0, radiusPercent)) / 100));

  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const src = sourceCtx.getImageData(0, 0, width, height).data;

  const sizeX = width + 1;
  const satLength = sizeX * (height + 1);
  const sumR = new Float64Array(satLength);
  const sumG = new Float64Array(satLength);
  const sumB = new Float64Array(satLength);
  const sumLuma = new Float64Array(satLength);
  const sumLumaSq = new Float64Array(satLength);

  for (let y = 0; y < height; y += 1) {
    let rowR = 0;
    let rowG = 0;
    let rowB = 0;
    let rowLuma = 0;
    let rowLumaSq = 0;
    const aboveRowBase = y * sizeX;
    const currentRowBase = aboveRowBase + sizeX;

    for (let x = 0; x < width; x += 1) {
      const pixelIndex = ((y * width) + x) * 4;
      const r = src[pixelIndex];
      const g = src[pixelIndex + 1];
      const b = src[pixelIndex + 2];
      const luma = (0.299 * r) + (0.587 * g) + (0.114 * b);

      rowR += r;
      rowG += g;
      rowB += b;
      rowLuma += luma;
      rowLumaSq += luma * luma;

      const aboveIndex = aboveRowBase + x + 1;
      const currentIndex = currentRowBase + x + 1;

      sumR[currentIndex] = sumR[aboveIndex] + rowR;
      sumG[currentIndex] = sumG[aboveIndex] + rowG;
      sumB[currentIndex] = sumB[aboveIndex] + rowB;
      sumLuma[currentIndex] = sumLuma[aboveIndex] + rowLuma;
      sumLumaSq[currentIndex] = sumLumaSq[aboveIndex] + rowLumaSq;
    }
  }

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  // Quadrant box-sum terms are inlined (no per-call helper functions) so V8
  // can keep this loop in optimized code; at 1600x1200 that difference is
  // the gap between an interactive slider and a multi-second stall.
  for (let y = 0; y < height; y += 1) {
    const yTop = y - windowRadius < 0 ? 0 : y - windowRadius;
    const yBottom = y + windowRadius >= height ? height - 1 : y + windowRadius;
    const rowTopBase = yTop * sizeX;
    const rowYBase = (y + 1) * sizeX;
    const rowBottomBase = (yBottom + 1) * sizeX;

    for (let x = 0; x < width; x += 1) {
      const xLeft = x - windowRadius < 0 ? 0 : x - windowRadius;
      const xRight = x + windowRadius >= width ? width - 1 : x + windowRadius;

      // Top-left: rows [yTop, y], cols [xLeft, x]
      const tlCount = (x - xLeft + 1) * (y - yTop + 1);
      const tlLumaSum = sumLuma[rowYBase + x + 1] - sumLuma[rowYBase + xLeft] - sumLuma[rowTopBase + x + 1] + sumLuma[rowTopBase + xLeft];
      const tlLumaSqSum = sumLumaSq[rowYBase + x + 1] - sumLumaSq[rowYBase + xLeft] - sumLumaSq[rowTopBase + x + 1] + sumLumaSq[rowTopBase + xLeft];
      const tlMean = tlLumaSum / tlCount;
      const tlVariance = (tlLumaSqSum / tlCount) - (tlMean * tlMean);

      // Top-right: rows [yTop, y], cols [x, xRight]
      const trCount = (xRight - x + 1) * (y - yTop + 1);
      const trLumaSum = sumLuma[rowYBase + xRight + 1] - sumLuma[rowYBase + x] - sumLuma[rowTopBase + xRight + 1] + sumLuma[rowTopBase + x];
      const trLumaSqSum = sumLumaSq[rowYBase + xRight + 1] - sumLumaSq[rowYBase + x] - sumLumaSq[rowTopBase + xRight + 1] + sumLumaSq[rowTopBase + x];
      const trMean = trLumaSum / trCount;
      const trVariance = (trLumaSqSum / trCount) - (trMean * trMean);

      // Bottom-left: rows [y, yBottom], cols [xLeft, x]
      const blCount = (x - xLeft + 1) * (yBottom - y + 1);
      const blLumaSum = sumLuma[rowBottomBase + x + 1] - sumLuma[rowBottomBase + xLeft] - sumLuma[rowYBase + x + 1] + sumLuma[rowYBase + xLeft];
      const blLumaSqSum = sumLumaSq[rowBottomBase + x + 1] - sumLumaSq[rowBottomBase + xLeft] - sumLumaSq[rowYBase + x + 1] + sumLumaSq[rowYBase + xLeft];
      const blMean = blLumaSum / blCount;
      const blVariance = (blLumaSqSum / blCount) - (blMean * blMean);

      // Bottom-right: rows [y, yBottom], cols [x, xRight]
      const brCount = (xRight - x + 1) * (yBottom - y + 1);
      const brLumaSum = sumLuma[rowBottomBase + xRight + 1] - sumLuma[rowBottomBase + x] - sumLuma[rowYBase + xRight + 1] + sumLuma[rowYBase + x];
      const brLumaSqSum = sumLumaSq[rowBottomBase + xRight + 1] - sumLumaSq[rowBottomBase + x] - sumLumaSq[rowYBase + xRight + 1] + sumLumaSq[rowYBase + x];
      const brMean = brLumaSum / brCount;
      const brVariance = (brLumaSqSum / brCount) - (brMean * brMean);

      let bestCount = tlCount;
      let bestVariance = tlVariance;
      let bestX0 = xLeft;
      let bestX1 = x;
      let bestY0 = yTop;
      let bestY1 = y;

      if (trVariance < bestVariance) {
        bestVariance = trVariance;
        bestCount = trCount;
        bestX0 = x;
        bestX1 = xRight;
        bestY0 = yTop;
        bestY1 = y;
      }

      if (blVariance < bestVariance) {
        bestVariance = blVariance;
        bestCount = blCount;
        bestX0 = xLeft;
        bestX1 = x;
        bestY0 = y;
        bestY1 = yBottom;
      }

      if (brVariance < bestVariance) {
        bestCount = brCount;
        bestX0 = x;
        bestX1 = xRight;
        bestY0 = y;
        bestY1 = yBottom;
      }

      const rowBestTop = bestY0 * sizeX;
      const rowBestBottom = (bestY1 + 1) * sizeX;
      const bestR = (sumR[rowBestBottom + bestX1 + 1] - sumR[rowBestBottom + bestX0] - sumR[rowBestTop + bestX1 + 1] + sumR[rowBestTop + bestX0]) / bestCount;
      const bestG = (sumG[rowBestBottom + bestX1 + 1] - sumG[rowBestBottom + bestX0] - sumG[rowBestTop + bestX1 + 1] + sumG[rowBestTop + bestX0]) / bestCount;
      const bestB = (sumB[rowBestBottom + bestX1 + 1] - sumB[rowBestBottom + bestX0] - sumB[rowBestTop + bestX1 + 1] + sumB[rowBestTop + bestX0]) / bestCount;

      const index = ((y * width) + x) * 4;
      out[index] = Math.round(bestR);
      out[index + 1] = Math.round(bestG);
      out[index + 2] = Math.round(bestB);
      out[index + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}
