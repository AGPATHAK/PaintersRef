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
//
// Returns per-pixel bucket labels plus the palette, rather than a finished
// canvas: median-cut only groups by colour, with no notion of spatial
// adjacency, so callers need the labels to run a spatial cleanup pass
// (mergeSmallLabelRegions below) before colourising.
function quantizeCanvasColorsToLabels(sourceCanvas, colorCount) {
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

  const labels = new Int32Array(width * height);
  let pixelIndex = 0;
  for (let i = 0; i < data.length; i += 4, pixelIndex += 1) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    labels[pixelIndex] = colorToBucketIndex.get(key);
  }

  return { labels, width, height, palette };
}

// Repeatedly finds the smallest same-label connected region; if it's below
// sizeThreshold, reassigns the whole region to whichever label borders it
// most. This is what actually fixes the blotchiness: median-cut correctly
// separates real photographic colour variety (dappled light/shadow gaps in
// foliage are genuinely different colours, blur or not), but that variety is
// spatially scattered rather than clustered, so quantising it produces many
// small disconnected islands instead of the big shapes this view wants.
// Blurring harder to erase that variance before quantising instead just
// destroys the actual composition (measured: enough blur to get islands
// under 1% of image pixels shrinks the working canvas to ~4px wide, past the
// point where sky/tree/water read as anything but an abstract gradient).
// Merging small regions after the fact fixes the symptom directly, cheaply
// (cost scales with region count, not image area - island counts collapse
// fast even at a moderate blur, so this stays well under the 1s budget).
function mergeSmallLabelRegions(labels, width, height, sizeThreshold, maxIterations) {
  const workingLabels = labels.slice();
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    visited.fill(0);
    let mergedAny = false;

    for (let start = 0; start < workingLabels.length; start += 1) {
      if (visited[start]) {
        continue;
      }

      const label = workingLabels[start];
      let stackSize = 0;
      stack[stackSize] = start;
      stackSize += 1;
      visited[start] = 1;

      const members = [];
      const borderCounts = new Map();

      while (stackSize > 0) {
        stackSize -= 1;
        const idx = stack[stackSize];
        members.push(idx);

        const x = idx % width;
        const y = (idx / width) | 0;
        const neighbors = [];
        if (x > 0) neighbors.push(idx - 1);
        if (x < width - 1) neighbors.push(idx + 1);
        if (y > 0) neighbors.push(idx - width);
        if (y < height - 1) neighbors.push(idx + width);

        for (let n = 0; n < neighbors.length; n += 1) {
          const neighborIdx = neighbors[n];
          if (workingLabels[neighborIdx] === label) {
            if (!visited[neighborIdx]) {
              visited[neighborIdx] = 1;
              stack[stackSize] = neighborIdx;
              stackSize += 1;
            }
          } else {
            const neighborLabel = workingLabels[neighborIdx];
            borderCounts.set(neighborLabel, (borderCounts.get(neighborLabel) || 0) + 1);
          }
        }
      }

      if (members.length < sizeThreshold && borderCounts.size > 0) {
        let bestLabel = label;
        let bestCount = -1;

        for (const [candidateLabel, count] of borderCounts) {
          if (count > bestCount) {
            bestCount = count;
            bestLabel = candidateLabel;
          }
        }

        for (let i = 0; i < members.length; i += 1) {
          workingLabels[members[i]] = bestLabel;
        }
        mergedAny = true;
      }
    }

    if (!mergedAny) {
      break;
    }
  }

  return workingLabels;
}

function colorizeLabels(labels, width, height, palette) {
  const outputCanvas = createOffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const outputImageData = outputCtx.createImageData(width, height);
  const out = outputImageData.data;

  for (let i = 0; i < labels.length; i += 1) {
    const color = palette[labels[i]];
    const outIndex = i * 4;
    out[outIndex] = color.r;
    out[outIndex + 1] = color.g;
    out[outIndex + 2] = color.b;
    out[outIndex + 3] = 255;
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

// Scales HSL saturation by `amount` (0-1) so the flat quantised fills read as
// muted painterly colour rather than poster-bright. Cached by exact input
// colour: after quantisation the whole image only contains a handful of
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

// Empirically tuned against a real texture-heavy photo (dense foliage, water
// reflections) via connected-component analysis, not derived from the
// formula - see mergeSmallLabelRegions above for why blur radius alone can't
// solve this. radiusPercent 8 plus the merge pass below took a landscape
// from ~2600 disconnected colour islands covering 17.8% of the image down to
// a few dozen real regions covering under 2%, while still reading as an
// actual sky/treeline/water composition rather than an abstract gradient.
const MASS_STUDY_BLUR_RADIUS_PERCENT = 8;
const MASS_STUDY_SMALL_REGION_SHARE = 0.003;
const MASS_STUDY_MERGE_MAX_ITERATIONS = 10;

function createMassStudyCanvasFromCanvas(originalCanvas, detailLevel) {
  const settings = getMassStudyDetailSettings(detailLevel);
  const blurredCanvas = createMassStudyBlurCanvas(originalCanvas, MASS_STUDY_BLUR_RADIUS_PERCENT);
  const { labels, width, height, palette } = quantizeCanvasColorsToLabels(
    blurredCanvas,
    settings.colorCount
  );

  const sizeThreshold = Math.round(width * height * MASS_STUDY_SMALL_REGION_SHARE);
  const mergedLabels = mergeSmallLabelRegions(
    labels,
    width,
    height,
    sizeThreshold,
    MASS_STUDY_MERGE_MAX_ITERATIONS
  );

  const quantizedCanvas = colorizeLabels(mergedLabels, width, height, palette);
  return applySaturationScale(quantizedCanvas, 0.85);
}
