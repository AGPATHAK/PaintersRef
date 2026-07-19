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
