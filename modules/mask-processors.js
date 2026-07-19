/* ==================================================
   Mask Processors
   ================================================== */

function createTintedMaskCanvasFromGrayscaleCanvas(grayscaleCanvas, maskType, options = {}) {
  const {
    shadowCutoff = 85,
    lightCutoff = 170
  } = options;
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
      isActive = value >= lightCutoff;
    } else if (maskType === "midtone") {
      isActive = value > shadowCutoff && value < lightCutoff;
    } else if (maskType === "shadow") {
      isActive = value <= shadowCutoff;
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
