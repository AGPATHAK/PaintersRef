# Milestones

Practical milestone record for the current Painter's Reference Lab state.

## M1 Current App Stabilization

**Status:** Completed

### Completed in M1

- Stable deterministic app retained
- Manual smoke-test discipline documented
- Reference screenshot baseline process documented
- M1 structure/documentation cleanup completed
- Failed refactor attempts documented and rolled back
- Stable single-script architecture preserved intentionally

### Outcome

M1 ended with a usable, stable deterministic foundation and a clear decision to defer deeper refactoring until workflow value is better validated through real use.

## M2 Workflow UX Upgrade

**Status:** Stable checkpoint / real-use validation

### Completed in M2

- Tinted tonal-mask workflow stabilized
- Outline detail presets clarified into bounded Low / Medium / High detail
- Export Current View exposed as a visible top-level action
- 3-sheet preview/export workflow implemented
- Previews stage simplified so it opens directly into the prepared sheet workflow
- Composition guidance visibility improved
- Composition crop-size slider behavior fixed so all intended previews respond
- Selected composition crop remains aligned with the clicked preview
- Painting-mode button layout cleaned up
- Drawing-mode button layout corrected after painting layout cleanup
- Temperature Study and Palette Notes visually separated in the painting controls
- Outline presets recalibrated for cleaner rough sketches
- Warm/cool/neutral temperature grouping calibrated to reduce near-neutral misclassification

### Current M2 Product State

- **Composition**
  - Focal-point crop studies
  - Adjustable crop size
  - Original or selected crop can become the working reference
- **Drawing**
  - Rough outline sketch with calibrated Low / Medium / High presets
  - Mirror Check
- **Painting**
  - Grayscale
  - 3-Value Notan
  - Light / Midtone / Shadow masks
  - Warm / Cool / Neutral temperature study
  - Palette Notes
- **Exports**
  - Export Current View
  - Sheet preview/export workflow

### Current 3-Sheet Workflow

- **Sheet 1 - Value & Drawing**
  - Original
  - Grayscale
  - 3-Value Notan
  - Outline with grid
- **Sheet 2 - Tonal Masks**
  - Original
  - Light Mask
  - Midtone Mask
  - Shadow Mask
- **Sheet 3 - Temperature Map**
  - Original
  - Warm Mask
  - Cool Mask
  - Neutral Mask

### Remaining M2 Focus

- Real-world usage testing
- Small UI aesthetics and spacing polish only where real use shows friction
- Documentation alignment when behavior or wording changes
- Bug fixes only when regressions are observed

## M3 Compare & Session Features

**Status:** Not started

### Deferred

- Compare mode beyond the current sheet-preview workflow
- Session persistence or saved presets
- More advanced export composition choices

## M4 AI Studio Beta

**Status:** Deferred

### Deferred

- AI-assisted simplify or variant workflows
- AI service boundary work
- Any cloud/API-dependent layer

## M5 Public Release Candidate

**Status:** Deferred

### Deferred

- Landing/onboarding polish
- Accessibility pass
- Release packaging and wider public readiness
