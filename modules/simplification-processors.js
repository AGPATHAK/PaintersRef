/* ==================================================
   Simplification Processors (Mass Study)
   ================================================== */

function getMassStudyDetailSettings(detailLevel) {
  const settings = {
    low: { label: "Simple", colorCount: 6 },
    medium: { label: "Balanced", colorCount: 10 },
    high: { label: "Detailed", colorCount: 16 }
  };

  return settings[detailLevel] || settings.medium;
}

function getMassStudyDisplayLabel(detailLevel) {
  return getMassStudyDetailSettings(detailLevel).label;
}

// Strong blur built from the same deterministic downscale/upscale primitives
// as Squint (areaAverageDownscale + bilinearUpscale, both hand-rolled, no
// drawImage) rather than createStrongBlurCanvas in canvas-utils.js - that
// helper's drawImage-based scaling is implementation-defined across browser
// engines, and Mass Study is the exact case the roadmap's determinism note
// flags as needing a strictly deterministic blur.
function createMassStudyBlurCanvas(sourceCanvas, radiusPercent) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const diagonal = Math.sqrt((width * width) + (height * height));
  const radiusPx = Math.max(1, (diagonal * Math.max(0, radiusPercent)) / 100);
  const downscaleFactor = Math.max(2, Math.round(radiusPx));

  const workingWidth = Math.max(2, Math.round(width / downscaleFactor));
  const workingHeight = Math.max(2, Math.round(height / downscaleFactor));

  const smallCanvas = areaAverageDownscale(sourceCanvas, workingWidth, workingHeight);
  return bilinearUpscale(smallCanvas, width, height);
}

// Median-cut colour quantisation over the image's histogram of distinct
// colours (weighted by pixel count), not every pixel individually - the
// standard approach, and the only one fast enough to hit the <1s budget.
// Deterministic: no randomness anywhere. Ties in bucket selection always
// resolve to the earliest bucket in array order, and Array.prototype.sort is
// required to be stable (ES2019+), so tied channel values during a split
// never reorder between runs on the same input.
function quantizeCanvasColorsMedianCut(sourceCanvas, colorCount) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  const colorCounts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  const colors = Array.from(colorCounts.entries(), ([key, count]) => ({
    key,
    r: (key >> 16) & 0xff,
    g: (key >> 8) & 0xff,
    b: key & 0xff,
    count
  }));

  const buildBucket = (members) => {
    let rMin = 255;
    let rMax = 0;
    let gMin = 255;
    let gMax = 0;
    let bMin = 255;
    let bMax = 0;
    let population = 0;

    for (let i = 0; i < members.length; i += 1) {
      const color = members[i];
      rMin = Math.min(rMin, color.r);
      rMax = Math.max(rMax, color.r);
      gMin = Math.min(gMin, color.g);
      gMax = Math.max(gMax, color.g);
      bMin = Math.min(bMin, color.b);
      bMax = Math.max(bMax, color.b);
      population += color.count;
    }

    return {
      members,
      population,
      ranges: { r: rMax - rMin, g: gMax - gMin, b: bMax - bMin }
    };
  };

  const buckets = [buildBucket(colors)];
  const targetBucketCount = Math.max(1, Math.min(colorCount, colors.length));

  while (buckets.length < targetBucketCount) {
    let splitIndex = -1;
    let splitRange = 0;

    for (let i = 0; i < buckets.length; i += 1) {
      const bucket = buckets[i];
      if (bucket.members.length < 2) {
        continue;
      }

      const widestRange = Math.max(bucket.ranges.r, bucket.ranges.g, bucket.ranges.b);
      if (widestRange > splitRange) {
        splitRange = widestRange;
        splitIndex = i;
      }
    }

    if (splitIndex === -1) {
      break;
    }

    const bucket = buckets[splitIndex];
    const channel = bucket.ranges.r >= bucket.ranges.g && bucket.ranges.r >= bucket.ranges.b
      ? "r"
      : (bucket.ranges.g >= bucket.ranges.b ? "g" : "b");

    const sortedMembers = bucket.members.slice().sort((a, b) => a[channel] - b[channel]);
    const halfPopulation = bucket.population / 2;

    let runningPopulation = 0;
    let splitPoint = 1;

    for (let i = 0; i < sortedMembers.length; i += 1) {
      runningPopulation += sortedMembers[i].count;
      if (runningPopulation >= halfPopulation) {
        splitPoint = Math.min(sortedMembers.length - 1, i + 1);
        break;
      }
    }

    buckets.splice(
      splitIndex,
      1,
      buildBucket(sortedMembers.slice(0, splitPoint)),
      buildBucket(sortedMembers.slice(splitPoint))
    );
  }

  const colorToBucketIndex = new Map();
  const palette = buckets.map((bucket, bucketIndex) => {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;

    for (let i = 0; i < bucket.members.length; i += 1) {
      const color = bucket.members[i];
      rSum += color.r * color.count;
      gSum += color.g * color.count;
      bSum += color.b * color.count;
      colorToBucketIndex.set(color.key, bucketIndex);
    }

    return {
      r: Math.round(rSum / bucket.population),
      g: Math.round(gSum / bucket.population),
      b: Math.round(bSum / bucket.population)
    };
  });

  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    const paletteColor = palette[colorToBucketIndex.get(key)];

    out[i] = paletteColor.r;
    out[i + 1] = paletteColor.g;
    out[i + 2] = paletteColor.b;
    out[i + 3] = 255;
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

// Scales HSL saturation by `amount` (0-1) so the flat quantised fills read as
// muted painterly colour rather than poster-bright. Cached by exact input
// colour: after quantisation the whole image only contains `colorCount`
// distinct values, so this is effectively O(colorCount), not O(pixels).
function applySaturationScale(sourceCanvas, amount) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const mutedByColor = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let muted = mutedByColor.get(key);

    if (!muted) {
      const hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      muted = hslToRgb(hsl.hue, hsl.saturation * amount, hsl.lightness);
      mutedByColor.set(key, muted);
    }

    data[i] = muted.r;
    data[i + 1] = muted.g;
    data[i + 2] = muted.b;
  }

  ctx.putImageData(imageData, 0, 0);
  return sourceCanvas;
}

function createMassStudyCanvasFromCanvas(originalCanvas, detailLevel) {
  const settings = getMassStudyDetailSettings(detailLevel);
  const blurredCanvas = createMassStudyBlurCanvas(originalCanvas, 2);
  const quantizedCanvas = quantizeCanvasColorsMedianCut(blurredCanvas, settings.colorCount);
  return applySaturationScale(quantizedCanvas, 0.85);
}
