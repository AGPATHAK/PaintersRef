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

M1 ended with a usable deterministic foundation and a clear decision to defer deeper refactoring until workflow value is better validated through real use.

## M2 Workflow UX Upgrade

**Status:** Stable checkpoint / real-use validation

### Completed in M2

- Tinted tonal-mask workflow stabilized
- Save Current View exposed as a first-level visible action (renamed for public v1.0)
- 3-sheet preview/export workflow implemented
- Export stage contains prepared sheet preview/export controls
- Composition guidance visibility improved
- Composition crop-size slider behavior fixed so all intended previews respond
- Selected composition crop remains aligned with the clicked preview
- Sidebar reorganized into Reference Image, Composition, Drawing, Painting, Export, and Info
- Squint moved to Painting
- Drawing focused on Outline Sketch, Mirror Check, Outline Source, and outline detail
- Value Contours added as a drawing aid
- Outline Source selection added: Gray, Squint, Original, Notan
- Extra visible outline-local controls removed
- Curated outline recipes added behind Simple / Balanced / Detailed detail
- Vocabulary cleanup completed:
  - Squint Softness
  - Simple / Balanced / Detailed
  - Reset to Standard
  - Focus on Color
- Painting button layout cleaned up for current sidebar width
- Drawing outline-control spacing polished
- Warm/cool/neutral temperature grouping calibrated to reduce near-neutral misclassification

### Current M2 Product State

- **Reference Image**
  - Image loading and change flow
  - Grid toggle, rows, and columns
- **Composition**
  - Focal-point crop studies
  - Adjustable crop size
  - Original or selected crop can become the working reference
- **Drawing**
  - Outline Sketch
  - Value Contours
  - Mirror Check
  - Outline Source
  - Simple / Balanced / Detailed outline detail
- **Painting**
  - Squint and Squint Softness
  - Grayscale
  - 3-Value Notan
  - Light / Midtone / Shadow masks
  - Temperature Study
  - Color Study
  - Palette Notes
- **First-level action**
  - Save Current View
- **Export**
  - Sheet preview/export workflow
- **Info**
  - Compact status and image/view metadata

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
