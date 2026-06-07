/* ==================================================
   Color Study Processors
   ================================================== */

const COLOR_STUDY_PRESETS = {
  complementary: {
    label: "Complementary Shift",
    type: "hueShift",
    hueShift: 180,
    saturationScale: 0.88,
    colorStrength: 0.82
  },
  earthLimited: {
    label: "Earth Limited",
    type: "limitedPalette",
    colorStrength: 0.82,
    saturationMix: 0.54,
    minSaturation: 10,
    maxSaturation: 58,
    contrast: 1.04,
    hueBias: 24,
    hueBiasStrength: 0.14,
    coolHue: 210,
    coolSaturationScale: 0.46,
    palette: [
      { r: 48, g: 43, b: 37 },
      { r: 92, g: 70, b: 47 },
      { r: 154, g: 111, b: 55 },
      { r: 211, g: 165, b: 82 },
      { r: 84, g: 105, b: 123 },
      { r: 230, g: 213, b: 166 }
    ]
  },
  tonalOldMaster: {
    label: "Tonal Old Master",
    type: "limitedPalette",
    colorStrength: 0.86,
    saturationMix: 0.5,
    minSaturation: 8,
    maxSaturation: 44,
    contrast: 1.16,
    valueGamma: 1.08,
    hueBias: 34,
    hueBiasStrength: 0.22,
    coolHue: 218,
    coolSaturationScale: 0.34,
    palette: [
      { r: 30, g: 25, b: 21 },
      { r: 77, g: 43, b: 31 },
      { r: 111, g: 54, b: 39 },
      { r: 148, g: 101, b: 55 },
      { r: 62, g: 76, b: 88 },
      { r: 188, g: 160, b: 104 }
    ]
  },
  watercolorEconomy: {
    label: "Watercolor Economy",
    type: "limitedPalette",
    colorStrength: 0.72,
    saturationMix: 0.62,
    minSaturation: 12,
    maxSaturation: 64,
    contrast: 0.92,
    valueGamma: 0.92,
    hueBias: 206,
    hueBiasStrength: 0.18,
    coolHue: 208,
    coolSaturationScale: 0.72,
    palette: [
      { r: 38, g: 56, b: 82 },
      { r: 64, g: 100, b: 124 },
      { r: 180, g: 103, b: 55 },
      { r: 219, g: 171, b: 64 },
      { r: 105, g: 132, b: 86 },
      { r: 236, g: 224, b: 190 }
    ]
  }
};

function getColorStudyPresetLabel(presetKey) {
  const preset = COLOR_STUDY_PRESETS[presetKey] || COLOR_STUDY_PRESETS.complementary;
  return preset.label;
}

function hueDistance(firstHue, secondHue) {
  const distance = Math.abs(firstHue - secondHue) % 360;
  return Math.min(distance, 360 - distance);
}

function hslToRgb(hue, saturation, lightness) {
  const normalizedHue = (((hue % 360) + 360) % 360) / 360;
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const normalizedLightness = clamp(lightness, 0, 100) / 100;

  if (normalizedSaturation === 0) {
    const gray = Math.round(normalizedLightness * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = normalizedLightness < 0.5
    ? normalizedLightness * (1 + normalizedSaturation)
    : normalizedLightness + normalizedSaturation - (normalizedLightness * normalizedSaturation);
  const p = (2 * normalizedLightness) - q;
  const hueToRgb = (offset) => {
    let t = normalizedHue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + ((q - p) * 6 * t);
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + ((q - p) * ((2 / 3) - t) * 6);
    return p;
  };

  return {
    r: Math.round(hueToRgb(1 / 3) * 255),
    g: Math.round(hueToRgb(0) * 255),
    b: Math.round(hueToRgb(-1 / 3) * 255)
  };
}

function getNearestPaletteColor(sourceHsl, palette) {
  let bestColor = palette[0];
  let bestScore = Number.POSITIVE_INFINITY;

  palette.forEach((color) => {
    const paletteHsl = rgbToHsl(color.r, color.g, color.b);
    const hueScore = hueDistance(sourceHsl.hue, paletteHsl.hue) / 180;
    const lightnessScore = Math.abs(sourceHsl.lightness - paletteHsl.lightness) / 100;
    const saturationScore = Math.abs(sourceHsl.saturation - paletteHsl.saturation) / 100;
    const score = (hueScore * 0.48) + (lightnessScore * 0.38) + (saturationScore * 0.14);

    if (score < bestScore) {
      bestScore = score;
      bestColor = color;
    }
  });

  return bestColor;
}

function isCoolSourceHue(sourceHsl) {
  return sourceHsl.hue >= 175 &&
    sourceHsl.hue <= 255 &&
    sourceHsl.saturation >= 8 &&
    sourceHsl.lightness >= 24;
}

function mixHue(firstHue, secondHue, amount) {
  const first = ((firstHue % 360) + 360) % 360;
  const second = ((secondHue % 360) + 360) % 360;
  let delta = second - first;

  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }

  return (first + (delta * amount) + 360) % 360;
}

function adjustValueLightness(lightness, preset) {
  const contrast = preset.contrast ?? 1;
  const valueGamma = preset.valueGamma ?? 1;
  const contrasted = 50 + ((lightness - 50) * contrast);
  const normalized = clamp(contrasted, 0, 100) / 100;
  return Math.pow(normalized, valueGamma) * 100;
}

function getColorStudyPixel(r, g, b, preset) {
  const gray = Math.round((0.299 * r) + (0.587 * g) + (0.114 * b));
  const sourceHsl = rgbToHsl(r, g, b);
  const valueLightness = adjustValueLightness((gray / 255) * 100, preset);
  const colorStrength = clamp(preset.colorStrength ?? 0.76, 0, 1);
  let targetRgb = { r: gray, g: gray, b: gray };

  if (preset.type === "hueShift") {
    targetRgb = hslToRgb(
      sourceHsl.hue + preset.hueShift,
      clamp(sourceHsl.saturation * (preset.saturationScale || 1), 0, 100),
      valueLightness
    );
  } else {
    const paletteColor = getNearestPaletteColor(sourceHsl, preset.palette);
    const paletteHsl = rgbToHsl(paletteColor.r, paletteColor.g, paletteColor.b);
    const shouldProtectCoolHue = preset.coolHue !== undefined && isCoolSourceHue(sourceHsl);
    const paletteHue = shouldProtectCoolHue
      ? mixHue(sourceHsl.hue, preset.coolHue, 0.72)
      : preset.hueBias === undefined
      ? paletteHsl.hue
      : mixHue(paletteHsl.hue, preset.hueBias, preset.hueBiasStrength ?? 0);
    const saturationMix = preset.saturationMix ?? 0.72;
    const saturation = clamp(
      shouldProtectCoolHue
        ? sourceHsl.saturation * (preset.coolSaturationScale ?? 0.48)
        : (paletteHsl.saturation * saturationMix) + (sourceHsl.saturation * 0.16),
      preset.minSaturation ?? 6,
      preset.maxSaturation ?? 72
    );

    targetRgb = hslToRgb(paletteHue, saturation, valueLightness);
  }

  return {
    r: Math.round((gray * (1 - colorStrength)) + (targetRgb.r * colorStrength)),
    g: Math.round((gray * (1 - colorStrength)) + (targetRgb.g * colorStrength)),
    b: Math.round((gray * (1 - colorStrength)) + (targetRgb.b * colorStrength))
  };
}

function createColorStudyCanvasFromCanvas(sourceCanvas, presetKey = "complementary") {
  const preset = COLOR_STUDY_PRESETS[presetKey] || COLOR_STUDY_PRESETS.complementary;
  const outputCanvas = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });

  outputCtx.drawImage(sourceCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const color = getColorStudyPixel(data[i], data[i + 1], data[i + 2], preset);
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = 255;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas;
}
