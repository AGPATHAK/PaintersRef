# V2 Color And Contour Study Plan

## Purpose

Add two local deterministic study features that help painters interpret a reference without turning the app into paint-by-numbers, a coloring-book generator, or an artist-imitation tool.

These features should support painter judgment. Outputs may be approximate, suggestive, and imperfect if they make value, color, or drawing decisions easier to think about.

## Feature 1: Palette Study Variants

Goal:

- show the loaded reference, or selected composition crop, through limited color-study palettes
- preserve the main value structure
- suggest palette direction rather than convert every pixel to exact paint colors

Good output:

- keeps lights, midtones, and darks readable
- nudges colors toward a limited palette family
- allows muted transitions and mixed-looking passages
- feels like a reference study, not a finished painting

Avoid:

- exact swatch replacement for every pixel
- hard posterized paint-by-number output
- claims of exact artist palette reconstruction
- direct artist imitation or finished-style transfer

Possible first presets:

- Complementary Shift - approximate hue inversion around the color wheel while preserving value
- Earth Limited - ochres, umbers, muted blues, and warm/cool neutrals
- Tonal Old Master - warm earths, subdued reds, muted green/blue-gray shadows
- Watercolor Economy - a small restrained watercolor-planning palette inspired by economical palette use

Palette calibration note:

- Even earth-limited palettes can include subdued greens; a painter can approximate green by mixing blue with raw sienna or related earth yellows.
- Avoid unwanted green casts in blue skies, but do not remove all green possibility from earth or watercolor economy studies.

Artist references:

- Use references such as Edward Wesson only for palette economy, restraint, and broad color tendency.
- Do not claim exact Wesson colors or imitate finished paintings.
- Prefer labels such as "Watercolor Economy" or "Wesson-like Economy" over exact attribution.

First implementation shape:

- add a Painting view called `Palette Variant` or `Color Study`
- add a small preset selector only when that view is active
- implement as a new deterministic processor module
- preserve current image/composition workflow and export behavior

## Feature 2: Value Contour Drawing

Goal:

- create a simplified drawing aid from grouped values
- emphasize major mass boundaries and useful structural lines
- reduce detail without producing a rigid coloring-book outline

The feature can be continuous-ish rather than mathematically continuous. Lifting the pen is allowed when shapes are separate or when forced continuity would add distracting nonsense.

Good output:

- longer connected strokes where practical
- broken contour lines where cleaner
- fewer small noisy edges
- major value-group boundaries
- useful drawing simplification for block-in and study work

Avoid:

- tracing every edge
- cartoon outlines
- overly dense technical edge maps
- promising a single unbroken line
- treating the result as objectively correct

Possible first labels:

- Value Contour Drawing
- Connected Contour Sketch
- Simplified Line Study
- Mass Boundary Drawing

First implementation shape:

- add a Drawing view called `Value Contours`
- reuse existing Simple / Balanced / Detailed detail language
- derive from Squint or Notan/value-grouped source
- keep controls minimal

## Implementation Order

1. Palette Study Variants
2. Value Contour Drawing

Rationale:

- palette variants are lower risk and fit the current Painting workflow
- value contours can build on existing observation processors but will need more visual tuning
- both features should remain local and deterministic

## App Architecture Fit

The current V2 refactor is sufficient for these features:

- color study processors can live in a new module before `app.js`
- value contour logic can either extend `modules/observation-processors.js` or use a focused new module if it grows
- `app.js` should keep orchestration, state, view switching, and UI wiring
- any new app-shell asset requires a build/cache/version bump

## Guardrails

- No AI dependency.
- No cloud/API calls.
- No new framework or build system.
- No export redesign for the first pass.
- No direct artist imitation.
- No exact paint formula claims.
- Keep outputs painter-facing and approximate.
- Keep controls compact and stage-specific.

## Success Criteria

- The painter can compare the original or selected crop against a palette variant without losing the current workflow.
- Palette variants preserve value readability.
- Value contour output simplifies drawing decisions without excessive edge noise.
- Existing image load, composition, Drawing, Painting, and Export behavior remains stable.
- The feature feels like Painter's Reference Lab, not a generic image editor.
