issue-097-issue-button-text-polish.md

## Goal

Perform a narrow UI polish pass focused ONLY on button typography and spacing in the Drawing panel.

The current buttons feel visually cramped and inconsistent:
- text appears too large relative to button width
- labels nearly touch borders
- visual weight is uneven across buttons
- segmented mode buttons ("Simple / Balanced / Detailed") feel crowded

This is a refinement pass only.
No layout restructuring.
No functional changes.
No color redesign.

---

## Scope

Target:
- primary action buttons
- segmented control buttons
- mirror check button
- any similar buttons in the same panel

Likely files:
- styles.css
- button-related CSS classes only

---

## Desired Improvements

### Typography
- slightly reduce font size if needed
- improve letter spacing if appropriate
- normalize font weight hierarchy

### Spacing
- increase horizontal padding slightly
- ensure text does not visually touch borders
- improve balance between button height and label size

### Consistency
- maintain consistent corner radius
- maintain current color palette
- preserve existing layout and responsive behavior

---

## Constraints

DO NOT:
- redesign the interface
- change panel structure
- alter processing logic
- modify export behavior
- introduce new components

This is a surgical visual refinement pass only.

---

## Validation

Verify:
- labels remain readable on narrow mobile widths
- buttons no longer feel cramped
- segmented controls feel visually balanced
- no wrapping or overflow occurs
- desktop and iPad Safari remain stable