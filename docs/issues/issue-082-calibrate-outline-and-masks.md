# issue-082-calibrate-outline-and-masks.md

## Goal
Do a small calibration pass based on real usage, improving output usefulness without changing the app’s core workflow, UI structure, export structure, or architecture.

## Scope

### 1. Outline preset calibration
Current outline presets work, but some images, especially architecture and foliage, can still produce sketches that are too busy.

Refine the existing bounded presets:
- Low Detail
- Medium Detail
- High Detail

Possible calibration levers:
- Sobel threshold values
- blur passes / smoothing strength
- minor post-threshold cleanup if needed

Requirements:
- preserve the existing three-preset model
- keep outline as a rough sketch reference, not a detailed transfer drawing
- avoid adding sliders or free-form controls

### 2. Warm / Cool / Neutral calibration
Review and improve the warm/cool/neutral grouping so Sheet 3 is more believable and more useful in painting workflow.

Requirements:
- preserve the current warm/cool/neutral feature
- improve grouping logic only if needed
- avoid introducing complicated controls
- maintain artist-friendly output over technical precision

### 3. Optional small mask cleanup
If tonal masks still show small noisy fragments on some subjects, allow a very small cleanup pass.

Requirements:
- only if necessary
- keep masks readable and coherent
- do not over-process or remove important shapes

## Constraints
- Stability first
- No refactor
- No UI redesign
- No changes to export logic
- No changes to preview/sheet structure
- No changes to current-view export behavior
- No new user controls unless absolutely necessary
- Keep all changes localized and low-risk

## Acceptance criteria
- outline presets feel more distinct and more useful across common subjects
- architecture/foliage sketches are slightly less busy where appropriate
- warm/cool/neutral output feels more painter-friendly
- tonal masks remain coherent and readable
- no regressions in exports, previews, crop workflow, or existing view modes
