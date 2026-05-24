/**
 * Painter's Reference Lab
 * Painter-first reference workflow for composition, observation, drawing, and painting studies.
 *
 * Adds:
 * - Composition crop studies that can become the working reference
 * - Squint, outline, notan, temperature, and palette-note views
 * - Current-view export and prepared composite export sheets
 */

/* ==================================================
   Maintainer Map
   ==================================================
   M1 intentionally keeps this as a stable single-script app.
   Previous module-loading experiments caused browser image-load regressions,
   so preserve script order and extract only after smoke coverage improves.

   High-risk flow:
   image file -> reference canvas -> composition choice -> derived canvases
   -> renderScene/export sheets.
*/

/* ==================================================
   App Configuration / Constants
   ================================================== */

const SUPPORTED_TYPES = ["image/jpeg", "image/png"];

const COMPOSITION_CROP_OPTIONS = [
  {
    key: "upperLeftThird",
    label: "Upper Left Third",
    intersectionX: 1 / 3,
    intersectionY: 1 / 3
  },
  {
    key: "upperRightThird",
    label: "Upper Right Third",
    intersectionX: 2 / 3,
    intersectionY: 1 / 3
  },
  {
    key: "lowerLeftThird",
    label: "Lower Left Third",
    intersectionX: 1 / 3,
    intersectionY: 2 / 3
  },
  {
    key: "lowerRightThird",
    label: "Lower Right Third",
    intersectionX: 2 / 3,
    intersectionY: 2 / 3
  }
];

/* ==================================================
   Image Loading Helpers
   ================================================== */

function isSupportedImageFile(file) {
  return Boolean(file && SUPPORTED_TYPES.includes(file.type));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function createImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not create image element."));
    image.src = src;
  });
}

async function fileToImageElement(file) {
  const dataUrl = await readFileAsDataURL(file);
  return createImageElement(dataUrl);
}

/* ==================================================
   Core Canvas And Painting Transforms
   ================================================== */

/* ---------------------------------
   Canvas utilities
--------------------------------- */

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

/* ---------------------------------
   Grayscale processing
--------------------------------- */

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

/* ---------------------------------
   3-value Notan processing
--------------------------------- */

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

/* ---------------------------------
   Tonal mask processing
--------------------------------- */

function createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, maskType) {
  const outputCanvas = createOffscreenCanvas(grayscaleCanvas.width, grayscaleCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });

  const imageData = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  const sourceCtx = grayscaleCanvas.getContext("2d", { willReadFrequently: true });
  const sourceData = sourceCtx.getImageData(0, 0, grayscaleCanvas.width, grayscaleCanvas.height).data;

  const palette = {
    light: { active: [255, 255, 255], inactive: [234, 229, 216] },
    midtone: { active: [245, 225, 140], inactive: [255, 250, 232] },
    shadow: { active: [45, 40, 36], inactive: [236, 232, 226] }
  };

  const colors = palette[maskType];

  for (let i = 0; i < sourceData.length; i += 4) {
    const value = sourceData[i];
    let isActive = false;

    if (maskType === "light") {
      isActive = value >= 171;
    } else if (maskType === "midtone") {
      isActive = value >= 86 && value <= 170;
    } else if (maskType === "shadow") {
      isActive = value <= 85;
    }

    const fill = isActive ? colors.active : colors.inactive;

    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = 255;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs((2 * lightness) - 1));

    switch (max) {
      case red:
        hue = 60 * (((green - blue) / delta) % 6);
        break;
      case green:
        hue = 60 * (((blue - red) / delta) + 2);
        break;
      default:
        hue = 60 * (((red - green) / delta) + 4);
        break;
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    hue,
    saturation: saturation * 100,
    lightness: lightness * 100
  };
}

function isWarmHue(hue, pivot = 140) {
  const normalizedPivot = ((pivot % 360) + 360) % 360;
  const warmStart = (normalizedPivot + 180) % 360;

  if (warmStart < normalizedPivot) {
    return hue >= warmStart && hue < normalizedPivot;
  }

  return hue >= warmStart || hue < normalizedPivot;
}

function createTemperatureMaskCanvasFromCanvas(sourceCanvas, maskType, options = {}) {
  const {
    neutralThreshold = 20,
    pivot = 140
  } = options;
  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  const imageData = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;

  const activeTint = maskType === "warm"
    ? [188, 80, 70]
    : maskType === "cool"
      ? [70, 110, 185]
      : [154, 144, 132];
  const inactiveTint = [240, 236, 229];
  const safeNeutralThreshold = clamp(neutralThreshold, 0, 100);

  for (let i = 0; i < sourceData.length; i += 4) {
    const r = sourceData[i];
    const g = sourceData[i + 1];
    const b = sourceData[i + 2];
    const gray = Math.round((0.299 * r) + (0.587 * g) + (0.114 * b));
    const { hue, saturation } = rgbToHsl(r, g, b);
    const chroma = ((Math.max(r, g, b) - Math.min(r, g, b)) / 255) * 100;
    const hasTemperatureSignal = (
      saturation >= safeNeutralThreshold &&
      chroma >= (safeNeutralThreshold * 0.45)
    );

    let isActive = false;

    if (hasTemperatureSignal) {
      const warmHue = isWarmHue(hue, pivot);
      if (maskType === "warm") {
        isActive = warmHue;
      } else if (maskType === "cool") {
        isActive = !warmHue;
      }
    } else if (maskType === "neutral") {
      isActive = true;
    }

    if (isActive) {
      const saturationRange = Math.max(1, 100 - safeNeutralThreshold);
      const saturationStrength = clamp(
        (saturation - safeNeutralThreshold) / saturationRange,
        0,
        1
      );
      const tintMix = 0.38 + (0.42 * saturationStrength);

      data[i] = Math.round((gray * (1 - tintMix)) + (activeTint[0] * tintMix));
      data[i + 1] = Math.round((gray * (1 - tintMix)) + (activeTint[1] * tintMix));
      data[i + 2] = Math.round((gray * (1 - tintMix)) + (activeTint[2] * tintMix));
      data[i + 3] = 255;
      continue;
    }

    const inactiveMix = 0.84;
    data[i] = Math.round((gray * (1 - inactiveMix)) + (inactiveTint[0] * inactiveMix));
    data[i + 1] = Math.round((gray * (1 - inactiveMix)) + (inactiveTint[1] * inactiveMix));
    data[i + 2] = Math.round((gray * (1 - inactiveMix)) + (inactiveTint[2] * inactiveMix));
    data[i + 3] = 255;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas;
}

/* ---------------------------------
   Palette study processing
--------------------------------- */

function componentToHex(value) {
  return clamp(Math.round(value), 0, 255)
    .toString(16)
    .padStart(2, "0");
}

function rgbToHex(color) {
  return `#${componentToHex(color.r)}${componentToHex(color.g)}${componentToHex(color.b)}`;
}

function getColorDistanceSquared(firstColor, secondColor) {
  const redDelta = firstColor.r - secondColor.r;
  const greenDelta = firstColor.g - secondColor.g;
  const blueDelta = firstColor.b - secondColor.b;

  return (redDelta * redDelta) + (greenDelta * greenDelta) + (blueDelta * blueDelta);
}

function getReadableTextColor(color) {
  const brightness = (0.299 * color.r) + (0.587 * color.g) + (0.114 * color.b);
  return brightness > 145 ? "#2f2a24" : "#fffdf8";
}

function getPaletteColorFamily(color) {
  const { hue, saturation, lightness } = rgbToHsl(color.r, color.g, color.b);
  const isGreenLeaning =
    ((hue >= 70 && hue <= 175) && saturation > 8) ||
    (color.g > color.r * 1.08 && color.g >= color.b * 0.82);
  const isBlueLeaning =
    ((hue >= 180 && hue <= 255) && saturation > 8) ||
    (color.b > color.r * 1.08 && color.b >= color.g * 0.9);
  const isRoseLeaning =
    (hue >= 305 || hue <= 8) &&
    saturation > 20 &&
    lightness > 24 &&
    color.r > color.g * 1.12 &&
    color.b > color.g * 1.02;
  const isEarthLeaning =
    ((hue >= 14 && hue <= 70) || hue >= 350) &&
    saturation > 8 &&
    color.r >= color.b * 1.02;

  if (isRoseLeaning) {
    return "rose";
  }

  if (isGreenLeaning && lightness < 32) {
    return "darkGreen";
  }

  if (isGreenLeaning) {
    return "green";
  }

  if (isBlueLeaning) {
    return "blue";
  }

  if (isEarthLeaning) {
    return "earth";
  }

  if (lightness < 24) {
    return "darkNeutral";
  }

  return "mutedNeutral";
}

function getSuggestedMixForFamily(family, color) {
  const noteMap = {
    darkGreen: {
      title: "Dark green mass",
      mix: "Viridian + Alizarin Crimson",
      alternate: "or Ultramarine + Lemon Yellow + Burnt Sienna"
    },
    green: {
      title: "Green notes",
      mix: "Lemon Yellow + Viridian",
      alternate: "mute with Burnt Sienna if too bright"
    },
    blue: {
      title: "Cool blue note",
      mix: "Ultramarine or Phthalo Blue",
      alternate: "use as a diluted wash"
    },
    earth: {
      title: "Warm earth note",
      mix: "Yellow Ochre + Burnt Sienna",
      alternate: "cool shadows with Ultramarine"
    },
    rose: {
      title: "Rose / crimson accent",
      mix: "Quinacridone Rose + Alizarin Crimson",
      alternate: "dilute for lighter accents"
    },
    darkNeutral: {
      title: "Dark neutral",
      mix: "Ultramarine + Burnt Sienna",
      alternate: "shift green with Viridian if needed"
    },
    mutedNeutral: {
      title: "Muted neutral",
      mix: "Yellow Ochre + Ultramarine",
      alternate: "adjust warmth with Burnt Sienna"
    }
  };

  return {
    ...noteMap[family],
    color
  };
}

function getDominantMixNotes(paletteColors, maxNotes = 3) {
  const safePalette = paletteColors.length > 0
    ? paletteColors
    : [{ r: 47, g: 42, b: 36, hex: "#2f2a24", dominance: 1 }];
  const sortedColors = [...safePalette].sort(
    (firstColor, secondColor) => (secondColor.dominance || 0) - (firstColor.dominance || 0)
  );
  const seenFamilies = new Set();
  const notes = [];

  sortedColors.forEach((color) => {
    if (notes.length >= maxNotes) {
      return;
    }

    const family = getPaletteColorFamily(color);
    if (seenFamilies.has(family)) {
      return;
    }

    seenFamilies.add(family);
    notes.push(getSuggestedMixForFamily(family, color));
  });

  if (notes.length < maxNotes) {
    sortedColors.forEach((color) => {
      if (notes.length >= maxNotes) {
        return;
      }

      const family = getPaletteColorFamily(color);
      notes.push(getSuggestedMixForFamily(family, color));
    });
  }

  return notes.slice(0, maxNotes);
}

function analyzeDominantMixNotesFromCanvas(sourceCanvas, maxNotes = 3, options = {}) {
  const { sampleBudget = 24000 } = options;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  const sampleStep = Math.max(
    1,
    Math.floor(Math.sqrt((sourceCanvas.width * sourceCanvas.height) / sampleBudget))
  );
  const familyStats = new Map();
  let sampledPixels = 0;

  for (let y = 0; y < sourceCanvas.height; y += sampleStep) {
    for (let x = 0; x < sourceCanvas.width; x += sampleStep) {
      const index = ((y * sourceCanvas.width) + x) * 4;
      const alpha = sourceData[index + 3];
      if (alpha < 128) {
        continue;
      }

      const color = {
        r: sourceData[index],
        g: sourceData[index + 1],
        b: sourceData[index + 2]
      };
      const family = getPaletteColorFamily(color);
      const stat = familyStats.get(family) || {
        family,
        count: 0,
        r: 0,
        g: 0,
        b: 0
      };

      stat.count += 1;
      stat.r += color.r;
      stat.g += color.g;
      stat.b += color.b;
      familyStats.set(family, stat);
      sampledPixels += 1;
    }
  }

  if (sampledPixels === 0) {
    return getDominantMixNotes([], maxNotes);
  }

  const rankedFamilies = Array.from(familyStats.values())
    .map((stat) => {
      const color = {
        r: Math.round(stat.r / stat.count),
        g: Math.round(stat.g / stat.count),
        b: Math.round(stat.b / stat.count),
        dominance: stat.count / sampledPixels
      };

      color.hex = rgbToHex(color);

      return {
        ...stat,
        color,
        dominance: stat.count / sampledPixels
      };
    })
    .sort((firstFamily, secondFamily) => secondFamily.dominance - firstFamily.dominance);

  const notes = [];
  const preferredFamilies = rankedFamilies.filter((stat) => stat.family !== "mutedNeutral");
  const fallbackFamilies = rankedFamilies.filter((stat) => stat.family === "mutedNeutral");

  [...preferredFamilies, ...fallbackFamilies].forEach((stat) => {
    if (notes.length >= maxNotes) {
      return;
    }

    notes.push(getSuggestedMixForFamily(stat.family, stat.color));
  });

  return notes;
}

function extractDominantPaletteFromCanvas(sourceCanvas, options = {}) {
  const {
    colorCount = 5,
    bucketSize = 24,
    sampleBudget = 16000,
    minimumDistance = 34
  } = options;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  const sampleStep = Math.max(
    1,
    Math.floor(Math.sqrt((sourceCanvas.width * sourceCanvas.height) / sampleBudget))
  );
  const buckets = new Map();
  let sampledPixels = 0;

  for (let y = 0; y < sourceCanvas.height; y += sampleStep) {
    for (let x = 0; x < sourceCanvas.width; x += sampleStep) {
      const index = ((y * sourceCanvas.width) + x) * 4;
      const alpha = sourceData[index + 3];
      if (alpha < 128) {
        continue;
      }

      const r = sourceData[index];
      const g = sourceData[index + 1];
      const b = sourceData[index + 2];
      const key = [
        Math.floor(r / bucketSize),
        Math.floor(g / bucketSize),
        Math.floor(b / bucketSize)
      ].join("-");

      const bucket = buckets.get(key) || {
        count: 0,
        r: 0,
        g: 0,
        b: 0
      };

      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
      sampledPixels += 1;
    }
  }

  if (sampledPixels === 0) {
    return [];
  }

  const rankedColors = Array.from(buckets.values())
    .map((bucket) => {
      const color = {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count)
      };
      const { saturation, lightness } = rgbToHsl(color.r, color.g, color.b);
      const dominance = bucket.count / sampledPixels;

      return {
        ...color,
        hex: rgbToHex(color),
        dominance,
        saturation,
        lightness,
        score: bucket.count * (0.72 + (saturation / 100) * 0.28)
      };
    })
    .sort((firstColor, secondColor) => secondColor.score - firstColor.score);

  const selectedColors = [];
  const minimumDistanceSquared = minimumDistance * minimumDistance;

  rankedColors.forEach((color) => {
    if (selectedColors.length >= colorCount) {
      return;
    }

    const isDistinct = selectedColors.every(
      (selectedColor) => getColorDistanceSquared(color, selectedColor) >= minimumDistanceSquared
    );

    if (isDistinct) {
      selectedColors.push(color);
    }
  });

  if (selectedColors.length < colorCount) {
    rankedColors.forEach((color) => {
      if (selectedColors.length >= colorCount) {
        return;
      }

      if (!selectedColors.includes(color)) {
        selectedColors.push(color);
      }
    });
  }

  return selectedColors.sort((firstColor, secondColor) => firstColor.lightness - secondColor.lightness);
}

function createPaletteStudyCanvas(sourceCanvas, paletteColors, mixNotes = null) {
  const safePalette = paletteColors.length > 0
    ? paletteColors
    : [{ r: 47, g: 42, b: 36, hex: "#2f2a24" }];
  const dominantSwatchHeight = Math.round(clamp(sourceCanvas.height * 0.08, 48, 78));
  const noteHeaderHeight = 56;
  const noteCardHeight = Math.round(clamp(sourceCanvas.height * 0.16, 104, 142));
  const bottomPadding = 16;
  const safeMixNotes = mixNotes && mixNotes.length > 0
    ? mixNotes
    : getDominantMixNotes(safePalette, 3);
  const outputCanvas = createOffscreenCanvas(
    sourceCanvas.width,
    sourceCanvas.height + dominantSwatchHeight + noteHeaderHeight + noteCardHeight + bottomPadding
  );
  const outputCtx = outputCanvas.getContext("2d");

  outputCtx.fillStyle = "#ffffff";
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.drawImage(sourceCanvas, 0, 0);

  const swatchY = sourceCanvas.height;
  const swatchWidth = sourceCanvas.width / safePalette.length;

  safePalette.forEach((color, index) => {
    const x = Math.round(index * swatchWidth);
    const nextX = Math.round((index + 1) * swatchWidth);

    outputCtx.fillStyle = color.hex;
    outputCtx.fillRect(x, swatchY, nextX - x, dominantSwatchHeight);
  });

  const pigmentY = swatchY + dominantSwatchHeight;
  outputCtx.fillStyle = "#f4f1ea";
  outputCtx.fillRect(
    0,
    pigmentY,
    outputCanvas.width,
    noteHeaderHeight + noteCardHeight + bottomPadding
  );

  outputCtx.fillStyle = "#2f2a24";
  outputCtx.font = "700 18px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  outputCtx.textAlign = "left";
  outputCtx.textBaseline = "top";
  outputCtx.fillText("Suggested watercolor mixes", 18, pigmentY + 12);

  outputCtx.font = "500 13px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  outputCtx.fillStyle = "#6f665c";
  outputCtx.fillText("Three starting notes from the dominant color families. Adjust by eye.", 18, pigmentY + 35);

  const cardGap = 14;
  const cardY = pigmentY + noteHeaderHeight;
  const cardMargin = 18;
  const cardWidth = Math.floor((sourceCanvas.width - (cardMargin * 2) - (cardGap * 2)) / 3);

  safeMixNotes.forEach((note, index) => {
    const x = cardMargin + (index * (cardWidth + cardGap));
    const colorStripHeight = Math.max(18, Math.round(noteCardHeight * 0.22));
    const padding = 12;

    outputCtx.fillStyle = "#fffdf8";
    outputCtx.fillRect(x, cardY, cardWidth, noteCardHeight);

    outputCtx.fillStyle = note.color.hex;
    outputCtx.fillRect(x, cardY, cardWidth, colorStripHeight);

    outputCtx.strokeStyle = "rgba(217, 210, 196, 0.95)";
    outputCtx.lineWidth = 1;
    outputCtx.strokeRect(x, cardY, cardWidth, noteCardHeight);

    outputCtx.fillStyle = "#2f2a24";
    outputCtx.font = `700 ${Math.max(13, Math.min(16, Math.round(cardWidth / 16)))}px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
    outputCtx.textAlign = "left";
    outputCtx.textBaseline = "top";
    outputCtx.fillText(note.title, x + padding, cardY + colorStripHeight + 10, cardWidth - (padding * 2));

    outputCtx.font = `600 ${Math.max(12, Math.min(14, Math.round(cardWidth / 18)))}px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
    outputCtx.fillText(note.mix, x + padding, cardY + colorStripHeight + 38, cardWidth - (padding * 2));

    outputCtx.fillStyle = "#6f665c";
    outputCtx.font = `500 ${Math.max(11, Math.min(13, Math.round(cardWidth / 20)))}px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
    outputCtx.fillText(note.alternate, x + padding, cardY + colorStripHeight + 62, cardWidth - (padding * 2));
  });

  return outputCanvas;
}

/* ==================================================
   Drawing / Observation Transforms
   ================================================== */

/* ---------------------------------
   Outline sketch processing
--------------------------------- */

function getOutlinePresetSettings(detailLevel, sourceKey = "gray") {
  const presetsBySource = {
    original: {
      low: { label: "Low", sensitivity: 20, smoothing: 3, sourcePrep: {} },
      medium: { label: "Medium", sensitivity: 44, smoothing: 2, sourcePrep: {} },
      high: { label: "High", sensitivity: 70, smoothing: 1, sourcePrep: {} }
    },
    gray: {
      low: { label: "Low", sensitivity: 24, smoothing: 3, sourcePrep: { graySimplification: 12 } },
      medium: { label: "Medium", sensitivity: 52, smoothing: 2, sourcePrep: { graySimplification: 0 } },
      high: { label: "High", sensitivity: 82, smoothing: 1, sourcePrep: { graySimplification: 0 } }
    },
    squint: {
      low: { label: "Low", sensitivity: 24, smoothing: 3, sourcePrep: { squintSoftness: 70 } },
      medium: { label: "Medium", sensitivity: 48, smoothing: 2, sourcePrep: { squintSoftness: 50 } },
      high: { label: "High", sensitivity: 74, smoothing: 1, sourcePrep: { squintSoftness: 32 } }
    },
    notan: {
      low: {
        label: "Low",
        sensitivity: 18,
        smoothing: 3,
        sourcePrep: { notanShadowCutoff: 105, notanLightCutoff: 150 }
      },
      medium: {
        label: "Medium",
        sensitivity: 36,
        smoothing: 2,
        sourcePrep: { notanShadowCutoff: 90, notanLightCutoff: 165 }
      },
      high: {
        label: "High",
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

function createSquintCanvasFromGrayscaleCanvas(sourceCanvas, options = {}) {
  const { softness = 35 } = options;
  const clampedSoftness = clamp(softness, 0, 100);
  const totalPasses = (clampedSoftness / 100) * 5;
  const wholePasses = Math.floor(totalPasses);
  const blendAmount = totalPasses - wholePasses;
  const normalized = clampedSoftness / 100;
  const valueLevels = Math.round(12 - (normalized * 8));

  let baseCanvas = sourceCanvas;
  if (wholePasses > 0) {
    baseCanvas = createBlurredGrayscaleCanvas(sourceCanvas, wholePasses);
  }

  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.drawImage(baseCanvas, 0, 0);

  if (blendAmount > 0.001) {
    const nextCanvas = createBlurredGrayscaleCanvas(baseCanvas, 1);
    outputCtx.save();
    outputCtx.globalAlpha = blendAmount;
    outputCtx.drawImage(nextCanvas, 0, 0);
    outputCtx.restore();
  }

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;
  const safeLevels = clamp(valueLevels, 4, 12);
  const maxStepIndex = safeLevels - 1;

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

/* ==================================================
   View Composition And Export Helpers
   ================================================== */

/* ---------------------------------
   Grid overlay utilities
--------------------------------- */

function drawGridOverlay(ctx, canvas, options) {
  const { rows, columns, lineThickness, opacity } = options;

  const cellWidth = canvas.width / columns;
  const cellHeight = canvas.height / rows;

  const drawGridLines = (strokeStyle, strokeWidth, alpha) => {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = strokeWidth;

    for (let col = 1; col < columns; col += 1) {
      const x = col * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let row = 1; row < rows; row += 1) {
      const y = row * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  drawGridLines("#ffffff", lineThickness + 2, opacity * 0.78);
  drawGridLines("#111111", lineThickness, opacity * 0.82);
}

/* ---------------------------------
   Export utilities
--------------------------------- */

function downloadCanvas(canvas, filename, mimeType, quality = 0.92) {
  const link = document.createElement("a");

  if (typeof canvas.toBlob === "function") {
    canvas.toBlob((blob) => {
      if (!blob) {
        alert("The export could not be generated.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = filename;
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    }, mimeType, quality);
    return;
  }

  link.href = canvas.toDataURL(mimeType, quality);
  link.download = filename;
  link.click();
}

function drawPanel(ctx, panelCanvas, x, y, width, height, label, options = {}) {
  const {
    showGrid = false,
    gridOptions = null,
    labelHeight = 38,
    overlayDrawer = null,
    sublabel = "",
    isSelected = false
  } = options;

  ctx.save();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);

  const imageAreaHeight = height - labelHeight;
  const fitted = computeContainSize(panelCanvas.width, panelCanvas.height, width, imageAreaHeight);

  const drawX = x + Math.round((width - fitted.width) / 2);
  const drawY = y + Math.round((imageAreaHeight - fitted.height) / 2);

  ctx.drawImage(panelCanvas, drawX, drawY, fitted.width, fitted.height);

  if (showGrid && gridOptions) {
    const overlayCanvas = createOffscreenCanvas(fitted.width, fitted.height);
    const overlayCtx = overlayCanvas.getContext("2d");
    clearCanvas(overlayCtx, overlayCanvas);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawGridOverlay(overlayCtx, overlayCanvas, gridOptions);
    ctx.drawImage(overlayCanvas, drawX, drawY);
  }

  if (typeof overlayDrawer === "function") {
    overlayDrawer(ctx, {
      x: drawX,
      y: drawY,
      width: fitted.width,
      height: fitted.height
    });
  }

  ctx.strokeStyle = isSelected ? "#9b7a4a" : "#d9d2c4";
  ctx.lineWidth = isSelected ? 3 : 1;
  ctx.strokeRect(x, y, width, imageAreaHeight);

  ctx.fillStyle = "#2f2a24";
  ctx.font = "600 18px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = sublabel ? "alphabetic" : "middle";
  if (sublabel) {
    const labelBaseY = y + imageAreaHeight + 24;
    ctx.fillText(label, x + width / 2, labelBaseY);

    ctx.fillStyle = "#6f665c";
    ctx.font = "500 13px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.fillText(sublabel, x + width / 2, labelBaseY + 19);
  } else {
    ctx.fillText(label, x + width / 2, y + imageAreaHeight + (labelHeight / 2));
  }

  ctx.restore();

  return {
    x: drawX,
    y: drawY,
    width: fitted.width,
    height: fitted.height
  };
}

// TODO(M2): isolate export builders after test harness exists.
// Export sheets read directly from processed canvas state, so keep this stable in M1.
function createCompositeSheet(panels, filename, options = {}) {
  const {
    title = "Painter's Reference Lab",
    sheetWidth = 1800,
    margin = 60,
    gutter = 40,
    topTitleHeight = 60,
    bottomMargin = 40,
    labelHeight = 38,
    panelAspectRatio = 0.75,
    shouldDownload = true
  } = options;

  const columns = 2;
  const rows = 2;
  const panelWidth = Math.floor((sheetWidth - (margin * 2) - gutter) / columns);
  const panelImageHeight = Math.round(panelWidth * panelAspectRatio);
  const panelHeight = panelImageHeight + labelHeight;
  const sheetHeight =
    topTitleHeight + margin + (rows * panelHeight) + gutter + bottomMargin;

  const sheetCanvas = createOffscreenCanvas(sheetWidth, sheetHeight);
  const ctx = sheetCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

  ctx.fillStyle = "#2f2a24";
  ctx.font = "700 28px 'Avenir Next', Avenir, Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, margin, Math.round(topTitleHeight / 2));

  panels.forEach((panel, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = margin + col * (panelWidth + gutter);
    const y = topTitleHeight + margin + row * (panelHeight + gutter);

    drawPanel(ctx, panel.canvas, x, y, panelWidth, panelHeight, panel.label, {
      showGrid: panel.showGrid,
      gridOptions: panel.gridOptions,
      labelHeight
    });
  });

  if (shouldDownload && filename) {
    downloadCanvas(sheetCanvas, filename, "image/jpeg", 0.92);
  }

  return sheetCanvas;
}

function createExportFileStem(fileName) {
  if (!fileName) {
    return "painters-ref";
  }

  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const sanitized = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "painters-ref";
}

/* ---------------------------------
   Focal study utilities
--------------------------------- */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCompositionCropScale(sourceCanvas, focalPoint, options = {}) {
  const {
    cropPercent = 72,
    intersectionX = 1 / 3,
    intersectionY = 1 / 3
  } = options;
  const safeCropPercent = clamp(cropPercent, 55, 95);
  const safeIntersectionX = clamp(intersectionX, 0.05, 0.95);
  const safeIntersectionY = clamp(intersectionY, 0.05, 0.95);
  const safeFocalPoint = {
    x: clamp(focalPoint.x, 1, sourceCanvas.width - 1),
    y: clamp(focalPoint.y, 1, sourceCanvas.height - 1)
  };
  const requestedScale = safeCropPercent / 100;
  const horizontalScale = Math.min(
    requestedScale,
    safeFocalPoint.x / (sourceCanvas.width * safeIntersectionX),
    (sourceCanvas.width - safeFocalPoint.x) / (sourceCanvas.width * (1 - safeIntersectionX))
  );
  const verticalScale = Math.min(
    requestedScale,
    safeFocalPoint.y / (sourceCanvas.height * safeIntersectionY),
    (sourceCanvas.height - safeFocalPoint.y) / (sourceCanvas.height * (1 - safeIntersectionY))
  );

  return Math.max(0.02, Math.min(horizontalScale, verticalScale, requestedScale));
}

// Focal crop output can become the working reference for later stages.
// Keep this helper deterministic; controller state decides when it is used.
function createCompositionCropCanvas(sourceCanvas, focalPoint, options = {}) {
  const {
    cropPercent = 72,
    intersectionX = 1 / 3,
    intersectionY = 1 / 3,
    cropScale = null
  } = options;
  const safeIntersectionX = clamp(intersectionX, 0.05, 0.95);
  const safeIntersectionY = clamp(intersectionY, 0.05, 0.95);
  const safeFocalPoint = {
    x: clamp(focalPoint.x, 1, sourceCanvas.width - 1),
    y: clamp(focalPoint.y, 1, sourceCanvas.height - 1)
  };
  const safeScale = cropScale ?? getCompositionCropScale(sourceCanvas, safeFocalPoint, {
    cropPercent,
    intersectionX: safeIntersectionX,
    intersectionY: safeIntersectionY
  });
  const cropWidth = Math.max(1, Math.round(sourceCanvas.width * safeScale));
  const cropHeight = Math.max(1, Math.round(sourceCanvas.height * safeScale));
  const cropX = Math.round(clamp(
    safeFocalPoint.x - (cropWidth * safeIntersectionX),
    0,
    sourceCanvas.width - cropWidth
  ));
  const cropY = Math.round(clamp(
    safeFocalPoint.y - (cropHeight * safeIntersectionY),
    0,
    sourceCanvas.height - cropHeight
  ));

  const outputCanvas = createOffscreenCanvas(cropWidth, cropHeight);
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return {
    canvas: outputCanvas,
    cropRect: {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    },
    target: {
      x: safeIntersectionX,
      y: safeIntersectionY
    }
  };
}

function drawThirdsOverlay(ctx, imageRect) {
  ctx.save();
  ctx.strokeStyle = "rgba(47, 42, 36, 0.36)";
  ctx.lineWidth = 1.5;

  for (let index = 1; index <= 2; index += 1) {
    const x = imageRect.x + ((imageRect.width * index) / 3);
    const y = imageRect.y + ((imageRect.height * index) / 3);

    ctx.beginPath();
    ctx.moveTo(x, imageRect.y);
    ctx.lineTo(x, imageRect.y + imageRect.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(imageRect.x, y);
    ctx.lineTo(imageRect.x + imageRect.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCompositionPointMarker(ctx, imageRect, cropStudy, focalPoint) {
  if (!cropStudy || !focalPoint) {
    return;
  }

  const centerX = imageRect.x + (cropStudy.target.x * imageRect.width);
  const centerY = imageRect.y + (cropStudy.target.y * imageRect.height);

  ctx.save();
  ctx.strokeStyle = "rgba(203, 112, 55, 0.96)";
  ctx.fillStyle = "rgba(203, 112, 55, 0.96)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/* ==================================================
   App Controller / Runtime State
   ================================================== */

class PaintersReferenceApp {
  constructor() {
    this.dom = {
      imageInput: document.getElementById("imageInput"),
      referenceUploadBlock: document.getElementById("referenceUploadBlock"),
      referenceSummary: document.getElementById("referenceSummary"),
      referenceFileName: document.getElementById("referenceFileName"),
      headerFileChip: document.getElementById("headerFileChip"),
      themeToggleButton: document.getElementById("themeToggleButton"),
      changeImageButton: document.getElementById("changeImageButton"),
      mainCanvas: document.getElementById("mainCanvas"),
      canvasPlaceholder: document.getElementById("canvasPlaceholder"),
      statusText: document.getElementById("statusText"),
      originalSizeText: document.getElementById("originalSizeText"),
      canvasSizeText: document.getElementById("canvasSizeText"),
      scaleText: document.getElementById("scaleText"),
      viewModeText: document.getElementById("viewModeText"),
      outlineDetailText: document.getElementById("outlineDetailText"),
      outlineControlsSection: document.getElementById("outlineControlsSection"),
      outlinePresetLabel: document.getElementById("outlinePresetLabel"),
      outlineSourceInput: document.getElementById("outlineSourceInput"),
      outlineSourceHelpText: document.getElementById("outlineSourceHelpText"),
      outlinePresetButtons: Array.from(document.querySelectorAll("[data-outline-preset]")),
      squintControlsSection: document.getElementById("squintControlsSection"),
      squintBlurInput: document.getElementById("squintBlurInput"),
      squintBlurValue: document.getElementById("squintBlurValue"),
      notanShadowCutoffInput: document.getElementById("notanShadowCutoffInput"),
      notanShadowCutoffValue: document.getElementById("notanShadowCutoffValue"),
      notanLightCutoffInput: document.getElementById("notanLightCutoffInput"),
      notanLightCutoffValue: document.getElementById("notanLightCutoffValue"),
      notanControlsSection: document.getElementById("notanControlsSection"),
      temperatureControlsSection: document.getElementById("temperatureControlsSection"),
      temperatureNeutralThresholdInput: document.getElementById("temperatureNeutralThresholdInput"),
      temperatureNeutralThresholdValue: document.getElementById("temperatureNeutralThresholdValue"),
      temperaturePivotInput: document.getElementById("temperaturePivotInput"),
      temperaturePivotValue: document.getElementById("temperaturePivotValue"),
      resetNotanButton: document.getElementById("resetNotanButton"),
      focalRadiusInput: document.getElementById("focalRadiusInput"),
      focalRadiusValue: document.getElementById("focalRadiusValue"),
      compositionCropControls: document.getElementById("compositionCropControls"),
      focalStudyInstructionText: document.getElementById("focalStudyInstructionText"),
      clearFocalPointButton: document.getElementById("clearFocalPointButton"),
      useOriginalCompositionButton: document.getElementById("useOriginalCompositionButton"),
      viewModeButtons: Array.from(document.querySelectorAll("[data-view-mode]")),
      stageSections: Array.from(document.querySelectorAll("[data-stage-section]")),
      stageToggleButtons: Array.from(document.querySelectorAll("[data-stage-toggle]")),
      stageBodyElements: Array.from(document.querySelectorAll("[data-stage-body]")),
      baselineStageValue: document.getElementById("baselineStageValue"),
      compositionStageValue: document.getElementById("compositionStageValue"),
      drawingStageValue: document.getElementById("drawingStageValue"),
      paintingStageValue: document.getElementById("paintingStageValue"),
      generalStageValue: document.getElementById("generalStageValue"),

      showGridInput: document.getElementById("showGridInput"),
      rowsInput: document.getElementById("rowsInput"),
      columnsInput: document.getElementById("columnsInput"),

      exportCurrentViewButton: document.getElementById("exportCurrentViewButton"),
      closeSheetPreviewButton: document.getElementById("closeSheetPreviewButton"),
      exportPreviewSheetButton: document.getElementById("exportPreviewSheetButton"),
      sheetPreviewPanel: document.getElementById("sheetPreviewPanel"),
      sheetPreviewLabel: document.getElementById("sheetPreviewLabel"),
      sheetPreviewButtons: Array.from(document.querySelectorAll("[data-sheet-preview]")),
      generalPreviewHelpText: document.getElementById("generalPreviewHelpText")
    };

    this.ctx = this.dom.mainCanvas.getContext("2d", { alpha: false });
    this.rangeInputs = Array.from(document.querySelectorAll('input[type="range"]'));

    // TODO(M2): map state dependencies before file extraction.
    // Composition, processed canvases, view mode, and exports are coupled here.
    this.state = {
      originalImage: null,
      originalWidth: 0,
      originalHeight: 0,
      loadedFileName: "",
      workingCanvasWidth: 0,
      workingCanvasHeight: 0,
      workingScale: 1,
      viewMode: "original",
      activeStage: "baseline",
      outline: {
        source: "gray",
        detail: "medium",
        sensitivity: 52,
        smoothing: 2
      },
      outlineSource: {
        graySimplification: 0,
        squintSoftness: 35,
        notanShadowCutoff: 85,
        notanLightCutoff: 170,
        minimumGap: 10
      },
      squint: {
        softness: 35
      },
      stageSelections: {
        baseline: "original",
        composition: "focalStudy",
        drawing: "outlineSketch",
        painting: "grayscale"
      },
      notan: {
        shadowCutoff: 85,
        lightCutoff: 170,
        minimumGap: 10
      },
      temperature: {
        neutralThreshold: 20,
        pivot: 140
      },
      focalStudy: {
        point: null,
        cropPercent: 72
      },
      // Selecting a composition crop replaces the working source used by later stages.
      compositionChoice: {
        key: "original",
        label: "Original",
        cropRect: null
      },
      // Derived canvas cache. Rendering and export methods read directly from these fields.
      processed: {
        referenceCanvas: null,
        originalCanvas: null,
        grayscaleCanvas: null,
        notanCanvas: null,
        lightMaskCanvas: null,
        midtoneMaskCanvas: null,
        shadowMaskCanvas: null,
        warmMaskCanvas: null,
        coolMaskCanvas: null,
        neutralMaskCanvas: null,
        outlineSketchCanvas: null,
        squintCanvas: null,
        mirrorCanvas: null,
        paletteColors: [],
        paletteMixNotes: []
      },
      studySheetPreview: {
        isOpen: false,
        activeSheet: "sheet1"
      },
      grid: {
        show: true,
        rows: 3,
        columns: 3,
        color: "#444444",
        lineThickness: 2.5,
        opacity: 1
      }
    };

    this.maxCanvasDimension = 1600;
    this.focalStudyLayout = null;

    this.initializeTheme();
    this.bindEvents();
    this.initializeCanvas();
    this.syncControls();
  }

  initializeTheme() {
    let savedTheme = "light";
    try {
      savedTheme = localStorage.getItem("painters-ref-theme") || "light";
    } catch (error) {
      savedTheme = "light";
    }

    this.applyTheme(savedTheme === "dark" ? "dark" : "light");
  }

  applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", nextTheme === "dark" ? "#1e1b17" : "#f0ede4");
    }

    if (this.dom.themeToggleButton) {
      const isDark = nextTheme === "dark";
      this.dom.themeToggleButton.textContent = isDark ? "Light" : "Dark";
      this.dom.themeToggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");
    }

    try {
      localStorage.setItem("painters-ref-theme", nextTheme);
    } catch (error) {
      // Ignore storage failures; theme still applies for the current session.
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    this.applyTheme(currentTheme === "dark" ? "light" : "dark");
  }

  getStageForViewMode(viewMode) {
    const stageByViewMode = {
      original: "baseline",
      focalStudy: "composition",
      squint: "drawing",
      outlineSketch: "drawing",
      mirror: "drawing",
      grayscale: "painting",
      notan: "painting",
      lightMask: "painting",
      midtoneMask: "painting",
      shadowMask: "painting",
      temperatureStudy: "painting",
      paletteStudy: "painting"
    };

    return stageByViewMode[viewMode] || "baseline";
  }

  setViewMode(nextViewMode) {
    if (!nextViewMode) {
      return;
    }

    this.state.studySheetPreview.isOpen = false;
    this.state.viewMode = nextViewMode;
    this.state.activeStage = this.getStageForViewMode(nextViewMode);
    this.state.stageSelections[this.state.activeStage] = nextViewMode;
    this.updateViewModeLabel();
    this.updateViewModeButtons();
    this.updateStagePanels();
    this.renderScene();
  }

  bindEvents() {
    if (this.dom.themeToggleButton) {
      this.dom.themeToggleButton.addEventListener("click", () => {
        this.toggleTheme();
      });
    }

    this.rangeInputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.updateRangeFill(input);
      });
    });

    this.dom.imageInput.addEventListener("change", async (event) => {
      const [file] = event.target.files || [];
      if (!file) return;
      await this.handleImageSelection(file);
    });

    this.dom.showGridInput.addEventListener("change", () => {
      this.state.grid.show = this.dom.showGridInput.checked;
      this.renderScene();
    });

    this.dom.rowsInput.addEventListener("input", () => {
      this.state.grid.rows = this.getSafeInteger(this.dom.rowsInput.value, 3, 1, 50);
      this.dom.rowsInput.value = this.state.grid.rows;
      this.renderScene();
    });

    this.dom.columnsInput.addEventListener("input", () => {
      this.state.grid.columns = this.getSafeInteger(this.dom.columnsInput.value, 3, 1, 50);
      this.dom.columnsInput.value = this.state.grid.columns;
      this.renderScene();
    });

    if (this.dom.outlineSourceInput) {
      this.dom.outlineSourceInput.addEventListener("change", () => {
        this.state.outline.source = this.dom.outlineSourceInput.value || "gray";
        this.applyOutlineDetailPreset(this.state.outline.detail || "medium");
        this.refreshOutlineCanvas();
        this.updateOutlineControls();
        this.renderScene();
      });
    }

    this.dom.squintBlurInput.addEventListener("input", () => {
      this.state.squint.softness = this.getSafeInteger(
        this.dom.squintBlurInput.value,
        35,
        0,
        100
      );
      this.refreshSquintCanvas();
      this.updateSquintControls();
      this.renderScene();
    });

    this.dom.notanShadowCutoffInput.addEventListener("input", () => {
      const nextShadowCutoff = this.getSafeInteger(
        this.dom.notanShadowCutoffInput.value,
        85,
        0,
        245
      );
      this.state.notan.shadowCutoff = Math.min(
        nextShadowCutoff,
        this.state.notan.lightCutoff - this.state.notan.minimumGap
      );
      this.refreshNotanCanvas();
      this.updateNotanControls();
      this.renderScene();
    });

    this.dom.notanLightCutoffInput.addEventListener("input", () => {
      const nextLightCutoff = this.getSafeInteger(
        this.dom.notanLightCutoffInput.value,
        170,
        10,
        255
      );
      this.state.notan.lightCutoff = Math.max(
        nextLightCutoff,
        this.state.notan.shadowCutoff + this.state.notan.minimumGap
      );
      this.refreshNotanCanvas();
      this.updateNotanControls();
      this.renderScene();
    });

    this.dom.temperatureNeutralThresholdInput.addEventListener("input", () => {
      this.state.temperature.neutralThreshold = this.getSafeInteger(
        this.dom.temperatureNeutralThresholdInput.value,
        20,
        0,
        60
      );
      this.refreshTemperatureCanvases();
      this.updateTemperatureControls();
      this.renderScene();
    });

    this.dom.temperaturePivotInput.addEventListener("input", () => {
      this.state.temperature.pivot = this.getSafeInteger(
        this.dom.temperaturePivotInput.value,
        140,
        100,
        180
      );
      this.refreshTemperatureCanvases();
      this.updateTemperatureControls();
      this.renderScene();
    });

    this.dom.focalRadiusInput.addEventListener("input", () => {
      this.state.focalStudy.cropPercent = this.getSafeInteger(
        this.dom.focalRadiusInput.value,
        72,
        55,
        95
      );
      if (this.state.compositionChoice.key !== "original") {
        this.selectCompositionChoice(this.state.compositionChoice.key, {
          skipRender: true,
          silent: true
        });
      }
      this.updateFocalStudyControls();
      this.renderScene();
    });

    this.dom.viewModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextViewMode = button.dataset.viewMode;
        if (!nextViewMode || nextViewMode === this.state.viewMode) {
          return;
        }

        this.setViewMode(nextViewMode);
      });
    });

    this.dom.outlinePresetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const presetKey = button.dataset.outlinePreset;
        if (!presetKey) {
          return;
        }

        this.applyOutlineDetailPreset(presetKey);
        this.refreshOutlineCanvas();
        this.updateOutlineControls();
        this.renderScene();
      });
    });

    this.dom.stageToggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const stage = button.dataset.stageToggle;
        if (!stage) {
          return;
        }

        if (stage === "general") {
          if (this.state.processed.originalCanvas) {
            this.openStudySheetPreview();
          } else {
            this.state.activeStage = "general";
            this.updateStagePanels();
            this.renderScene();
          }
          return;
        }

        const nextViewMode = this.state.stageSelections[stage] || "original";
        this.setViewMode(nextViewMode);
      });
    });

    this.dom.exportCurrentViewButton.addEventListener("click", () => {
      this.exportCurrentView();
    });

    if (this.dom.closeSheetPreviewButton) {
      this.dom.closeSheetPreviewButton.addEventListener("click", () => {
        this.closeStudySheetPreview();
      });
    }

    if (this.dom.exportPreviewSheetButton) {
      this.dom.exportPreviewSheetButton.addEventListener("click", () => {
        this.exportActiveStudySheet();
      });
    }

    this.dom.sheetPreviewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const sheetKey = button.dataset.sheetPreview;
        if (!sheetKey) {
          return;
        }

        this.state.studySheetPreview.activeSheet = sheetKey;
        this.updateStudySheetPreviewControls();
        if (this.state.studySheetPreview.isOpen && this.state.activeStage === "general") {
          this.renderScene();
        }
      });
    });

    this.dom.clearFocalPointButton.addEventListener("click", () => {
      this.clearCompositionSelection();
    });

    if (this.dom.useOriginalCompositionButton) {
      this.dom.useOriginalCompositionButton.addEventListener("click", () => {
        this.selectCompositionChoice("original");
      });
    }

    this.dom.resetNotanButton.addEventListener("click", () => {
      this.state.notan.shadowCutoff = 85;
      this.state.notan.lightCutoff = 170;
      this.refreshNotanCanvas();
      this.updateNotanControls();
      this.renderScene();
    });

    this.dom.changeImageButton.addEventListener("click", () => {
      this.dom.imageInput.click();
    });

    this.dom.mainCanvas.addEventListener("click", (event) => {
      this.handleMainCanvasClick(event);
    });
  }

  initializeCanvas() {
    setCanvasSize(this.dom.mainCanvas, 960, 640);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.updateStatus("Waiting for image");
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  syncControls() {
    this.dom.showGridInput.checked = this.state.grid.show;
    this.dom.rowsInput.value = this.state.grid.rows;
    this.dom.columnsInput.value = this.state.grid.columns;
    this.updateViewModeLabel();
    this.updateViewModeButtons();
    this.updateStagePanels();
    this.updateOutlineDetailLabel();
    this.updateOutlineControls();
    this.updateSquintControls();
    this.updateNotanControls();
    this.updateTemperatureControls();
    this.updateFocalStudyControls();
    this.updateStudySheetPreviewControls();
    this.updateReferenceSection();
    this.updateRangeFills();
  }

  updateRangeFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || min);
    const progress = max > min
      ? ((value - min) / (max - min)) * 100
      : 0;

    input.style.setProperty("--range-progress", `${Math.min(Math.max(progress, 0), 100)}%`);
  }

  updateRangeFills() {
    this.rangeInputs.forEach((input) => {
      this.updateRangeFill(input);
    });
  }

  updateViewModeLabel() {
    const labels = {
      original: "Original",
      focalStudy: "Focal Study",
      grayscale: "Grayscale",
      notan: "3-Value Notan",
      lightMask: "Light Mask",
      midtoneMask: "Midtone Mask",
      shadowMask: "Shadow Mask",
      temperatureStudy: "Temperature Study",
      paletteStudy: "Palette Notes",
      outlineSketch: "Rough Outline Sketch",
      squint: "Squint",
      mirror: "Mirror Check"
    };

    this.dom.viewModeText.textContent = labels[this.state.viewMode] || "Original";
  }

  getDrawingViewLabel(viewMode = this.state.stageSelections.drawing) {
    if (viewMode === "outlineSketch") {
      return `Outline (${getOutlineDisplayLabel(this.state.outline)})`;
    }

    if (viewMode === "mirror") {
      return "Mirror Check";
    }

    if (viewMode === "squint") {
      return "Squint";
    }

    return "Outline";
  }

  getCompositionChoiceLabel() {
    return this.state.compositionChoice?.label || "Original";
  }

  updateOutlineDetailLabel() {
    this.dom.outlineDetailText.textContent = getOutlineDisplayLabel(this.state.outline);
  }

  updateViewModeButtons() {
    this.dom.viewModeButtons.forEach((button) => {
      const isActive = button.dataset.viewMode === this.state.viewMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  updateStagePanels() {
    this.dom.stageSections.forEach((section) => {
      const isActive = section.dataset.stageSection === this.state.activeStage;
      section.classList.toggle("is-active", isActive);
    });

    this.dom.stageBodyElements.forEach((body) => {
      const isActive = body.dataset.stageBody === this.state.activeStage;
      body.classList.toggle("is-hidden", !isActive);
    });

    this.dom.stageToggleButtons.forEach((button) => {
      const isActive = button.dataset.stageToggle === this.state.activeStage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const labels = {
      original: "Original",
      focalStudy: "Focal Study",
      outlineSketch: "Rough Outline",
      squint: "Squint",
      mirror: "Mirror Check",
      grayscale: "Grayscale",
      notan: "3-Value Notan",
      lightMask: "Light Mask",
      midtoneMask: "Midtone Mask",
      shadowMask: "Shadow Mask",
      temperatureStudy: "Temperature Study",
      paletteStudy: "Palette Notes"
    };

    this.dom.baselineStageValue.textContent =
      labels[this.state.stageSelections.baseline] || "Original";
    this.dom.compositionStageValue.textContent = this.getCompositionChoiceLabel();
    this.dom.drawingStageValue.textContent = this.getDrawingViewLabel();
    this.dom.paintingStageValue.textContent =
      labels[this.state.stageSelections.painting] || "Grayscale";
    this.dom.generalStageValue.textContent = this.state.studySheetPreview.isOpen
      ? `${this.getStudySheetLabel()} Preview`
      : "Sheets";

    const isNotanActive =
      this.state.activeStage === "painting" && this.state.viewMode === "notan";
    this.dom.notanControlsSection.classList.toggle("is-hidden", !isNotanActive);

    const isOutlineActive =
      this.state.activeStage === "drawing" && this.state.viewMode === "outlineSketch";
    this.dom.outlineControlsSection.classList.toggle("is-hidden", !isOutlineActive);

    const isSquintActive =
      this.state.activeStage === "drawing" && this.state.viewMode === "squint";
    this.dom.squintControlsSection.classList.toggle("is-hidden", !isSquintActive);

    const isTemperatureActive =
      this.state.activeStage === "painting" &&
      this.state.viewMode === "temperatureStudy";
    this.dom.temperatureControlsSection.classList.toggle("is-hidden", !isTemperatureActive);

    this.updateStudySheetPreviewControls();
  }

  applyOutlineDetailPreset(detailLevel) {
    const sourceKey = this.state.outline.source || "gray";
    const preset = getOutlinePresetSettings(detailLevel, sourceKey);
    this.state.outline.detail = detailLevel;
    this.state.outline.sensitivity = preset.sensitivity;
    this.state.outline.smoothing = preset.smoothing;

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "graySimplification")) {
      this.state.outlineSource.graySimplification = preset.sourcePrep.graySimplification;
    }

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "squintSoftness")) {
      this.state.outlineSource.squintSoftness = preset.sourcePrep.squintSoftness;
    }

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "notanShadowCutoff")) {
      this.state.outlineSource.notanShadowCutoff = preset.sourcePrep.notanShadowCutoff;
    }

    if (Object.prototype.hasOwnProperty.call(preset.sourcePrep, "notanLightCutoff")) {
      this.state.outlineSource.notanLightCutoff = preset.sourcePrep.notanLightCutoff;
    }
  }

  updateOutlineControls() {
    if (this.dom.outlineSourceInput) {
      this.dom.outlineSourceInput.value = this.state.outline.source || "gray";
    }

    const sourceKey = this.state.outline.source || "gray";
    const sourceHelpText = {
      gray: "Gray uses a curated grayscale outline recipe.",
      original: "Original uses a curated outline recipe from the color source.",
      squint: "Squint uses hidden shape simplification tuned by detail.",
      notan: "Notan uses hidden mass grouping tuned by detail."
    };
    this.dom.outlineSourceHelpText.textContent = sourceHelpText[sourceKey] || sourceHelpText.gray;

    const activePresetKey = getMatchingOutlinePresetKey(this.state.outline);
    this.dom.outlinePresetLabel.textContent =
      activePresetKey ? getOutlinePresetSettings(activePresetKey).label : "Custom";

    this.dom.outlinePresetButtons.forEach((button) => {
      const isActive = button.dataset.outlinePreset === activePresetKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    this.updateRangeFills();
  }

  updateNotanControls() {
    this.dom.notanShadowCutoffInput.value = this.state.notan.shadowCutoff;
    this.dom.notanLightCutoffInput.value = this.state.notan.lightCutoff;
    this.dom.notanShadowCutoffValue.textContent = `${this.state.notan.shadowCutoff}`;
    this.dom.notanLightCutoffValue.textContent = `${this.state.notan.lightCutoff}`;
    this.updateRangeFills();
  }

  updateSquintControls() {
    this.dom.squintBlurInput.value = this.state.squint.softness;
    this.dom.squintBlurValue.textContent = `${this.state.squint.softness}%`;
    this.updateRangeFills();
  }

  updateTemperatureControls() {
    this.dom.temperatureNeutralThresholdInput.value = this.state.temperature.neutralThreshold;
    this.dom.temperatureNeutralThresholdValue.textContent =
      `${this.state.temperature.neutralThreshold}%`;
    this.dom.temperaturePivotInput.value = this.state.temperature.pivot;
    this.dom.temperaturePivotValue.textContent = `${this.state.temperature.pivot}\u00b0`;
    this.updateRangeFills();
  }

  updateFocalStudyControls() {
    const hasFocalPoint = Boolean(this.state.focalStudy.point);
    this.dom.focalRadiusInput.value = this.state.focalStudy.cropPercent;
    this.dom.focalRadiusValue.textContent = `${this.state.focalStudy.cropPercent}%`;
    this.dom.clearFocalPointButton.disabled =
      !hasFocalPoint && this.state.compositionChoice.key === "original";
    if (this.dom.compositionCropControls) {
      this.dom.compositionCropControls.classList.toggle("is-hidden", !hasFocalPoint);
    }
    if (this.dom.focalStudyInstructionText) {
      this.dom.focalStudyInstructionText.textContent = hasFocalPoint
        ? "Click a crop to use it. Clear Selection returns to original."
        : "Click the image to place a point of interest.";
    }
    if (this.dom.useOriginalCompositionButton) {
      this.dom.useOriginalCompositionButton.disabled = !this.state.processed.referenceCanvas;
      this.dom.useOriginalCompositionButton.classList.toggle(
        "is-active",
        this.state.compositionChoice.key === "original"
      );
    }
    this.updateRangeFills();
  }

  getStudySheetLabel(sheetKey = this.state.studySheetPreview.activeSheet) {
    const labels = {
      sheet1: "Sheet 1",
      sheet2: "Sheet 2",
      sheet3: "Sheet 3"
    };

    return labels[sheetKey] || "Sheet 1";
  }

  updateStudySheetPreviewControls() {
    const hasLoadedImage = Boolean(this.state.processed.originalCanvas);
    const isPreviewOpen = this.state.studySheetPreview.isOpen && hasLoadedImage;
    const activeLabel = this.getStudySheetLabel();

    if (this.dom.sheetPreviewPanel) {
      this.dom.sheetPreviewPanel.classList.toggle("is-hidden", !isPreviewOpen);
    }

    if (this.dom.sheetPreviewLabel) {
      this.dom.sheetPreviewLabel.textContent = activeLabel;
    }

    if (this.dom.generalPreviewHelpText) {
      this.dom.generalPreviewHelpText.classList.toggle("is-hidden", isPreviewOpen);
    }

    if (this.dom.exportPreviewSheetButton) {
      this.dom.exportPreviewSheetButton.disabled = !hasLoadedImage;
    }

    this.dom.sheetPreviewButtons.forEach((button) => {
      const isActive = button.dataset.sheetPreview === this.state.studySheetPreview.activeSheet;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.disabled = !hasLoadedImage;
    });
  }

  updateReferenceSection() {
    const hasLoadedImage = Boolean(this.state.loadedFileName);
    this.dom.referenceUploadBlock.classList.toggle("is-hidden", hasLoadedImage);
    this.dom.referenceSummary.classList.toggle("is-hidden", !hasLoadedImage);
    this.dom.referenceFileName.textContent = this.state.loadedFileName || "None";
    if (this.dom.headerFileChip) {
      this.dom.headerFileChip.classList.toggle("is-hidden", !hasLoadedImage);
      this.dom.headerFileChip.textContent = hasLoadedImage
        ? `Loaded: ${this.state.loadedFileName}`
        : "No image loaded";
    }
    this.updateStudySheetPreviewControls();
  }

  refreshNotanCanvas() {
    if (!this.state.processed.grayscaleCanvas) {
      return;
    }

    this.state.processed.notanCanvas = createNotanCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      {
        shadowCutoff: this.state.notan.shadowCutoff,
        lightCutoff: this.state.notan.lightCutoff
      }
    );
  }

  refreshTemperatureCanvases() {
    if (!this.state.processed.originalCanvas) {
      return;
    }

    this.state.processed.warmMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      this.state.processed.originalCanvas,
      "warm",
      this.state.temperature
    );
    this.state.processed.coolMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      this.state.processed.originalCanvas,
      "cool",
      this.state.temperature
    );
    this.state.processed.neutralMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      this.state.processed.originalCanvas,
      "neutral",
      this.state.temperature
    );
  }

  refreshOutlineCanvas() {
    const outlineSourceCanvas = this.getOutlineSourceCanvas();
    if (!outlineSourceCanvas) {
      return;
    }

    this.state.processed.outlineSketchCanvas = createOutlineSketchCanvasFromGrayscaleCanvas(
      outlineSourceCanvas,
      this.state.outline
    );
    this.refreshMirrorCanvas();
  }

  refreshSquintCanvas() {
    if (!this.state.processed.grayscaleCanvas) {
      return;
    }

    this.state.processed.squintCanvas = createSquintCanvasFromGrayscaleCanvas(
      this.state.processed.grayscaleCanvas,
      this.state.squint
    );
  }

  refreshMirrorCanvas() {
    if (!this.state.processed.outlineSketchCanvas) {
      return;
    }

    this.state.processed.mirrorCanvas = createMirroredCanvasFromCanvas(
      this.state.processed.outlineSketchCanvas
    );
  }

  refreshDrawingDerivedCanvases() {
    this.refreshMirrorCanvas();
    this.refreshSquintCanvas();
  }

  getOutlineSourceCanvasFromCanvases(canvases) {
    const sourceKey = this.state.outline.source || "gray";

    if (sourceKey === "original") {
      return canvases.originalCanvas;
    }

    if (!canvases.grayscaleCanvas) {
      return null;
    }

    if (sourceKey === "squint") {
      return createSquintCanvasFromGrayscaleCanvas(canvases.grayscaleCanvas, {
        softness: this.state.outlineSource.squintSoftness
      });
    }

    if (sourceKey === "notan") {
      return createNotanCanvasFromGrayscaleCanvas(canvases.grayscaleCanvas, {
        shadowCutoff: this.state.outlineSource.notanShadowCutoff,
        lightCutoff: this.state.outlineSource.notanLightCutoff
      });
    }

    if (this.state.outlineSource.graySimplification > 0) {
      return createSquintCanvasFromGrayscaleCanvas(canvases.grayscaleCanvas, {
        softness: this.state.outlineSource.graySimplification
      });
    }

    return canvases.grayscaleCanvas;
  }

  getOutlineSourceCanvas() {
    return this.getOutlineSourceCanvasFromCanvases(this.state.processed);
  }

  // Central derived-canvas rebuild point. Original/crop selection flows through here.
  rebuildWorkingCanvasesFromSource(sourceCanvas) {
    if (!sourceCanvas) {
      return;
    }

    const originalCanvas = cloneCanvas(sourceCanvas);
    const grayscaleCanvas = createGrayscaleCanvasFromCanvas(originalCanvas);
    const notanCanvas = createNotanCanvasFromGrayscaleCanvas(grayscaleCanvas, {
      shadowCutoff: this.state.notan.shadowCutoff,
      lightCutoff: this.state.notan.lightCutoff
    });

    const lightMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, "light");
    const midtoneMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, "midtone");
    const shadowMaskCanvas = createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, "shadow");
    const warmMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      originalCanvas,
      "warm",
      this.state.temperature
    );
    const coolMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      originalCanvas,
      "cool",
      this.state.temperature
    );
    const neutralMaskCanvas = createTemperatureMaskCanvasFromCanvas(
      originalCanvas,
      "neutral",
      this.state.temperature
    );

    const squintCanvas = createSquintCanvasFromGrayscaleCanvas(grayscaleCanvas, this.state.squint);
    const outlineSourceCanvas = this.getOutlineSourceCanvasFromCanvases({
      originalCanvas,
      grayscaleCanvas,
      notanCanvas,
      squintCanvas
    });
    const outlineSketchCanvas =
      createOutlineSketchCanvasFromGrayscaleCanvas(outlineSourceCanvas, this.state.outline);
    const mirrorCanvas = createMirroredCanvasFromCanvas(outlineSketchCanvas);
    const paletteColors = extractDominantPaletteFromCanvas(originalCanvas, {
      colorCount: 5
    });
    const paletteMixNotes = analyzeDominantMixNotesFromCanvas(originalCanvas, 3);

    this.state.processed.originalCanvas = originalCanvas;
    this.state.processed.grayscaleCanvas = grayscaleCanvas;
    this.state.processed.notanCanvas = notanCanvas;
    this.state.processed.lightMaskCanvas = lightMaskCanvas;
    this.state.processed.midtoneMaskCanvas = midtoneMaskCanvas;
    this.state.processed.shadowMaskCanvas = shadowMaskCanvas;
    this.state.processed.warmMaskCanvas = warmMaskCanvas;
    this.state.processed.coolMaskCanvas = coolMaskCanvas;
    this.state.processed.neutralMaskCanvas = neutralMaskCanvas;
    this.state.processed.outlineSketchCanvas = outlineSketchCanvas;
    this.state.processed.squintCanvas = squintCanvas;
    this.state.processed.mirrorCanvas = mirrorCanvas;
    this.state.processed.paletteColors = paletteColors;
    this.state.processed.paletteMixNotes = paletteMixNotes;

    this.state.workingCanvasWidth = originalCanvas.width;
    this.state.workingCanvasHeight = originalCanvas.height;

    const referenceCanvas = this.state.processed.referenceCanvas;
    this.state.workingScale = referenceCanvas && this.state.originalWidth > 0
      ? referenceCanvas.width / this.state.originalWidth
      : 1;
  }

  // Composition selection feeds later stages by rebuilding every derived canvas.
  selectCompositionChoice(choiceKey, options = {}) {
    const {
      skipRender = false,
      silent = false
    } = options;
    const referenceCanvas = this.state.processed.referenceCanvas;
    if (!referenceCanvas) {
      return;
    }

    let nextChoice = {
      key: "original",
      label: "Original",
      cropRect: null
    };
    let workingSourceCanvas = referenceCanvas;

    if (choiceKey !== "original") {
      const cropOption = COMPOSITION_CROP_OPTIONS.find((option) => option.key === choiceKey);
      if (!cropOption || !this.state.focalStudy.point) {
        return;
      }

      const sharedCropScale = clamp(this.state.focalStudy.cropPercent, 55, 95) / 100;

      const cropStudy = createCompositionCropCanvas(referenceCanvas, this.state.focalStudy.point, {
        cropPercent: this.state.focalStudy.cropPercent,
        intersectionX: cropOption.intersectionX,
        intersectionY: cropOption.intersectionY,
        cropScale: sharedCropScale
      });

      nextChoice = {
        key: cropOption.key,
        label: cropOption.label,
        cropRect: cropStudy.cropRect
      };
      workingSourceCanvas = cropStudy.canvas;
    }

    this.state.compositionChoice = nextChoice;
    this.rebuildWorkingCanvasesFromSource(workingSourceCanvas);
    this.updateFocalStudyControls();
    this.updateStagePanels();

    if (!silent) {
      this.updateStatus(`${nextChoice.label} selected for later stages`);
    }

    if (!skipRender) {
      this.renderScene();
    }
  }

  clearCompositionSelection() {
    this.state.focalStudy.point = null;
    this.selectCompositionChoice("original", {
      skipRender: true,
      silent: true
    });
    this.updateFocalStudyControls();
    this.updateStatus("Composition selection cleared");
    this.renderScene();
  }

  getSafeInteger(value, fallback, min, max) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  async handleImageSelection(file) {
    if (!isSupportedImageFile(file)) {
      this.updateStatus("Unsupported file type");
      alert("Please choose a JPG or PNG image.");
      return;
    }

    this.updateStatus("Loading image...");

    try {
      const image = await fileToImageElement(file);

      this.state.originalImage = image;
      this.state.originalWidth = image.naturalWidth;
      this.state.originalHeight = image.naturalHeight;
      this.state.loadedFileName = file.name;
      this.state.focalStudy.point = null;

      this.prepareWorkingCanvases();
      this.renderScene();

      this.dom.canvasPlaceholder.classList.add("is-hidden");
      this.updateReferenceSection();
      this.updateStatus("Image loaded");
    } catch (error) {
      console.error("Image loading failed:", error);
      this.updateStatus("Failed to load image");
      alert("The image could not be loaded.");
    }
  }

  prepareWorkingCanvases() {
    const image = this.state.originalImage;
    if (!image) return;

    const contained = computeContainSize(
      image.naturalWidth,
      image.naturalHeight,
      this.maxCanvasDimension,
      this.maxCanvasDimension
    );

    const referenceCanvas = createOffscreenCanvas(contained.width, contained.height);
    const referenceCtx = referenceCanvas.getContext("2d");

    clearCanvas(referenceCtx, referenceCanvas);
    drawImageContained(referenceCtx, image, referenceCanvas);

    this.state.processed.referenceCanvas = referenceCanvas;
    this.state.compositionChoice = {
      key: "original",
      label: "Original",
      cropRect: null
    };
    this.rebuildWorkingCanvasesFromSource(referenceCanvas);
    this.state.workingScale = contained.scale;
  }

  getActiveOutlineCanvas() {
    return this.state.processed.outlineSketchCanvas;
  }

  getActiveBaseCanvas() {
    const map = {
      original: this.state.processed.originalCanvas,
      grayscale: this.state.processed.grayscaleCanvas,
      notan: this.state.processed.notanCanvas,
      lightMask: this.state.processed.lightMaskCanvas,
      midtoneMask: this.state.processed.midtoneMaskCanvas,
      shadowMask: this.state.processed.shadowMaskCanvas,
      outlineSketch: this.getActiveOutlineCanvas(),
      squint: this.state.processed.squintCanvas,
      mirror: this.state.processed.mirrorCanvas,
      paletteStudy: this.state.processed.originalCanvas
    };

    return map[this.state.viewMode] || this.state.processed.originalCanvas;
  }

  handleMainCanvasClick(event) {
    if (!this.state.processed.referenceCanvas || this.state.viewMode !== "focalStudy") {
      return;
    }

    const rect = this.dom.mainCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const scaleX = this.dom.mainCanvas.width / rect.width;
    const scaleY = this.dom.mainCanvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    let imageRect = null;

    const selectedStudyPanel = this.focalStudyLayout?.studyPanels?.find((panel) => (
      canvasX >= panel.panelRect.x &&
      canvasX <= panel.panelRect.x + panel.panelRect.width &&
      canvasY >= panel.panelRect.y &&
      canvasY <= panel.panelRect.y + panel.panelRect.height
    ));

    if (selectedStudyPanel) {
      this.selectCompositionChoice(selectedStudyPanel.key);
      return;
    }

    if (!this.focalStudyLayout || !this.focalStudyLayout.sourceImageRect) {
      return;
    }
    imageRect = this.focalStudyLayout.sourceImageRect;

    const isInsideImage =
      canvasX >= imageRect.x &&
      canvasX <= imageRect.x + imageRect.width &&
      canvasY >= imageRect.y &&
      canvasY <= imageRect.y + imageRect.height;

    if (!isInsideImage) {
      return;
    }

    const pointX =
      ((canvasX - imageRect.x) / imageRect.width) * this.state.processed.referenceCanvas.width;
    const pointY =
      ((canvasY - imageRect.y) / imageRect.height) * this.state.processed.referenceCanvas.height;

    this.state.focalStudy.point = {
      x: clamp(pointX, 0, this.state.processed.referenceCanvas.width),
      y: clamp(pointY, 0, this.state.processed.referenceCanvas.height)
    };

    this.updateFocalStudyControls();
    this.updateStatus("Focal point selected");
    this.renderScene();
  }

  renderFocalStudyScene() {
    const referenceCanvas = this.state.processed.referenceCanvas;
    if (!referenceCanvas) {
      return;
    }

    if (!this.state.focalStudy.point) {
      const labelHeight = 62;
      const margin = 24;
      const panelImageSize = computeContainSize(
        referenceCanvas.width,
        referenceCanvas.height,
        980,
        680
      );
      const panelWidth = panelImageSize.width;
      const panelHeight = panelImageSize.height + labelHeight;
      const canvasWidth = (margin * 2) + panelWidth;
      const canvasHeight = (margin * 2) + panelHeight;

      setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
      clearCanvas(this.ctx, this.dom.mainCanvas);

      const sourcePanelRect = drawPanel(
        this.ctx,
        referenceCanvas,
        margin,
        margin,
        panelWidth,
        panelHeight,
        "Original",
        {
          labelHeight,
          sublabel: "Click image to place a point of interest"
        }
      );

      this.focalStudyLayout = {
        sourceImageRect: sourcePanelRect,
        studyImageRect: null
      };

      this.updateStatus("Click the original image to set a point of interest");
      this.updateInfo();
      this.updateViewModeLabel();
      this.updateOutlineDetailLabel();
      this.updateFocalStudyControls();
      return;
    }

    const sharedCropScale = clamp(this.state.focalStudy.cropPercent, 55, 95) / 100;

    const cropStudies = COMPOSITION_CROP_OPTIONS.map((study) => ({
      ...study,
      crop: createCompositionCropCanvas(referenceCanvas, this.state.focalStudy.point, {
        cropPercent: this.state.focalStudy.cropPercent,
        intersectionX: study.intersectionX,
        intersectionY: study.intersectionY,
        cropScale: sharedCropScale
      })
    }));

    const labelHeight = 62;
    const margin = 24;
    const gutter = 24;
    const panelImageSize = computeContainSize(
      referenceCanvas.width,
      referenceCanvas.height,
      560,
      380
    );
    const panelWidth = panelImageSize.width;
    const panelHeight = panelImageSize.height + labelHeight;
    const canvasWidth = (margin * 2) + (panelWidth * 2) + gutter;
    const canvasHeight = (margin * 2) + (panelHeight * 2) + gutter;

    setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
    clearCanvas(this.ctx, this.dom.mainCanvas);

    const studyPanels = [];

    cropStudies.forEach((study, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + (col * (panelWidth + gutter));
      const y = margin + (row * (panelHeight + gutter));
      const isSelected = this.state.compositionChoice.key === study.key;
      const label = isSelected ? `${study.label} (Selected)` : study.label;

      drawPanel(
        this.ctx,
        study.crop.canvas,
        x,
        y,
        panelWidth,
        panelHeight,
        label,
        {
          labelHeight,
          isSelected,
          sublabel: isSelected ? "Currently in use" : "Click to use this crop",
          overlayDrawer: (ctx, imageRect) => {
            drawThirdsOverlay(ctx, imageRect);
            drawCompositionPointMarker(
              ctx,
              imageRect,
              study.crop,
              this.state.focalStudy.point
            );
          }
        }
      );

      studyPanels.push({
        key: study.key,
        label: study.label,
        panelRect: {
          x,
          y,
          width: panelWidth,
          height: panelHeight
        }
      });
    });

    this.focalStudyLayout = {
      sourceImageRect: null,
      studyImageRect: null,
      studyPanels
    };

    this.updateStatus(
      this.state.compositionChoice.key === "original"
        ? "Click a crop to use it for later stages. Clear Selection returns to the original."
        : `${this.state.compositionChoice.label} selected for later stages`
    );

    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
    this.updateFocalStudyControls();
  }

  renderTemperatureStudyScene() {
    const warmCanvas = this.state.processed.warmMaskCanvas;
    const coolCanvas = this.state.processed.coolMaskCanvas;
    if (!warmCanvas || !coolCanvas) {
      return;
    }

    const labelHeight = 38;
    const margin = 24;
    const gutter = 24;
    const panelImageSize = computeContainSize(
      warmCanvas.width,
      warmCanvas.height,
      620,
      620
    );
    const panelWidth = panelImageSize.width;
    const panelHeight = panelImageSize.height + labelHeight;
    const canvasWidth = (margin * 2) + (panelWidth * 2) + gutter;
    const canvasHeight = (margin * 2) + panelHeight;

    setCanvasSize(this.dom.mainCanvas, canvasWidth, canvasHeight);
    clearCanvas(this.ctx, this.dom.mainCanvas);

    drawPanel(
      this.ctx,
      warmCanvas,
      margin,
      margin,
      panelWidth,
      panelHeight,
      "Warm Mask",
      { labelHeight }
    );

    drawPanel(
      this.ctx,
      coolCanvas,
      margin + panelWidth + gutter,
      margin,
      panelWidth,
      panelHeight,
      "Cool Mask",
      { labelHeight }
    );

    this.focalStudyLayout = null;
    this.updateStatus("Temperature study ready");
    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  renderPaletteStudyScene() {
    const originalCanvas = this.state.processed.originalCanvas;
    if (!originalCanvas) {
      return;
    }

    const paletteCanvas = createPaletteStudyCanvas(
      originalCanvas,
      this.state.processed.paletteColors,
      this.state.processed.paletteMixNotes
    );

    this.focalStudyLayout = null;
    setCanvasSize(this.dom.mainCanvas, paletteCanvas.width, paletteCanvas.height);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.ctx.drawImage(paletteCanvas, 0, 0);

    this.updateStatus("Palette notes ready");
    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  // Render router. Keep multi-panel views explicit until screenshots catch layout drift.
  renderScene() {
    if (this.state.activeStage === "general" && this.state.studySheetPreview.isOpen) {
      this.renderStudySheetPreviewScene();
      return;
    }

    if (this.state.viewMode === "focalStudy") {
      this.renderFocalStudyScene();
      return;
    }

    if (this.state.viewMode === "temperatureStudy") {
      this.renderTemperatureStudyScene();
      return;
    }

    if (this.state.viewMode === "paletteStudy") {
      this.renderPaletteStudyScene();
      return;
    }

    this.focalStudyLayout = null;
    const baseCanvas = this.getActiveBaseCanvas();
    if (!baseCanvas) return;

    setCanvasSize(this.dom.mainCanvas, baseCanvas.width, baseCanvas.height);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.ctx.drawImage(baseCanvas, 0, 0);

    if (this.state.grid.show) {
      drawGridOverlay(this.ctx, this.dom.mainCanvas, this.state.grid);
    }

    this.updateInfo();
    this.updateViewModeLabel();
    this.updateOutlineDetailLabel();
  }

  updateInfo() {
    this.dom.originalSizeText.textContent =
      `${this.state.originalWidth} × ${this.state.originalHeight}px`;

    this.dom.canvasSizeText.textContent =
      `${this.state.workingCanvasWidth} × ${this.state.workingCanvasHeight}px`;

    this.dom.scaleText.textContent =
      getScalePercentage(this.state.workingScale);
  }

  updateStatus(message) {
    this.dom.statusText.textContent = message;
  }

  getStudySheetDefinition(sheetKey) {
    const sheetDefinitions = {
      sheet1: {
        label: "Sheet 1",
        filename: "painters-ref-sheet-1.jpg",
        title: "Painter's Reference Lab — Sheet 1",
        panels: [
          {
            label: "Original",
            canvas: this.state.processed.originalCanvas,
            showGrid: false
          },
          {
            label: "Grayscale",
            canvas: this.state.processed.grayscaleCanvas,
            showGrid: false
          },
          {
            label: "3-Value Notan",
            canvas: this.state.processed.notanCanvas,
            showGrid: false
          },
          {
            label: `Outline (${getOutlineDisplayLabel(this.state.outline)})`,
            canvas: this.getActiveOutlineCanvas(),
            showGrid: true,
            gridOptions: this.state.grid
          }
        ]
      },
      sheet2: {
        label: "Sheet 2",
        filename: "painters-ref-sheet-2.jpg",
        title: "Painter's Reference Lab — Sheet 2",
        panels: [
          {
            label: "Original",
            canvas: this.state.processed.originalCanvas,
            showGrid: false
          },
          {
            label: "Light Mask",
            canvas: this.state.processed.lightMaskCanvas,
            showGrid: false
          },
          {
            label: "Midtone Mask",
            canvas: this.state.processed.midtoneMaskCanvas,
            showGrid: false
          },
          {
            label: "Shadow Mask",
            canvas: this.state.processed.shadowMaskCanvas,
            showGrid: false
          }
        ]
      },
      sheet3: {
        label: "Sheet 3",
        filename: "painters-ref-sheet-3.jpg",
        title: "Painter's Reference Lab — Sheet 3",
        panels: [
          {
            label: "Original",
            canvas: this.state.processed.originalCanvas,
            showGrid: false
          },
          {
            label: "Warm Mask",
            canvas: this.state.processed.warmMaskCanvas,
            showGrid: false
          },
          {
            label: "Cool Mask",
            canvas: this.state.processed.coolMaskCanvas,
            showGrid: false
          },
          {
            label: "Neutral Mask",
            canvas: this.state.processed.neutralMaskCanvas,
            showGrid: false
          }
        ]
      }
    };

    return sheetDefinitions[sheetKey] || sheetDefinitions.sheet1;
  }

  buildStudySheetCanvas(sheetKey, options = {}) {
    const {
      shouldDownload = false
    } = options;
    const definition = this.getStudySheetDefinition(sheetKey);

    return createCompositeSheet(
      definition.panels,
      definition.filename,
      {
        title: definition.title,
        shouldDownload
      }
    );
  }

  openStudySheetPreview(sheetKey = this.state.studySheetPreview.activeSheet) {
    if (!this.state.processed.originalCanvas) {
      alert("Please load an image before previewing sheets.");
      return;
    }

    this.state.activeStage = "general";
    this.state.studySheetPreview.isOpen = true;
    this.state.studySheetPreview.activeSheet = sheetKey;
    this.updateStagePanels();
    this.renderScene();
  }

  closeStudySheetPreview() {
    if (!this.state.studySheetPreview.isOpen) {
      return;
    }

    this.state.studySheetPreview.isOpen = false;
    this.updateStagePanels();
    this.updateStatus("Study sheet preview closed");
    this.renderScene();
  }

  exportActiveStudySheet(sheetKey = this.state.studySheetPreview.activeSheet) {
    if (!this.state.processed.originalCanvas) {
      alert("Please load an image before exporting.");
      return;
    }

    const definition = this.getStudySheetDefinition(sheetKey);
    this.buildStudySheetCanvas(sheetKey, { shouldDownload: true });
    this.updateStatus(`${definition.label} exported`);
  }

  renderStudySheetPreviewScene() {
    const previewCanvas = this.buildStudySheetCanvas(this.state.studySheetPreview.activeSheet, {
      shouldDownload: false
    });
    const activeLabel = this.getStudySheetLabel();

    this.focalStudyLayout = null;
    setCanvasSize(this.dom.mainCanvas, previewCanvas.width, previewCanvas.height);
    clearCanvas(this.ctx, this.dom.mainCanvas);
    this.ctx.drawImage(previewCanvas, 0, 0);

    this.updateStatus(`${activeLabel} preview ready`);
    this.updateInfo();
    this.dom.viewModeText.textContent = `${activeLabel} Preview`;
    this.updateOutlineDetailLabel();
  }

  // Export actions depend on the current render canvas and processed cache.
  exportCurrentView() {
    if (!this.state.processed.originalCanvas) {
      alert("Please load an image before exporting.");
      return;
    }

    const viewLabel = this.dom.viewModeText.textContent || "current-view";
    const slug = viewLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileStem = createExportFileStem(this.state.loadedFileName);
    const filename = `${fileStem}-${slug || "current-view"}.jpg`;

    downloadCanvas(this.dom.mainCanvas, filename, "image/jpeg", 0.92);
    this.updateStatus("Current view exported");
  }

  exportSheet1() {
    this.exportActiveStudySheet("sheet1");
  }

  exportSheet2() {
    this.exportActiveStudySheet("sheet2");
  }

  exportSheet3() {
    this.exportActiveStudySheet("sheet3");
  }
}

/* ==================================================
   Startup
   ================================================== */

// Service worker caching can keep stale app assets in the browser.
// During M1, prefer hard refresh/cache clear before assuming a code regression.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  new PaintersReferenceApp();
  registerServiceWorker();
});
