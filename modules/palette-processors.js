/* ==================================================
   Palette Processors
   ================================================== */

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
