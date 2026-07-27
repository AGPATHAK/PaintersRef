# Squint Algorithm — Problem & Research Prompt

Date: 2026-07-19

## The problem

Painter's Reference Lab's "Squint" feature needs to simulate what a painter
sees when squinting at a reference photo: merge fine texture/detail into large
recognizable value masses, while keeping real object edges (like a tree
silhouette against the sky) legible — all controlled by one 0–100 slider. The
app is a deterministic, dependency-free, client-side canvas tool (classic
scripts, no build step, no libraries, no AI/network calls), and the effect
must recompute fast enough for live slider dragging (well under ~150ms on a
~1600×1200px canvas).

Two approaches were tried and both failed, for different reasons:

1. **Downscale→upscale blur** (radius scaled by the slider) — blurs strong
   edges exactly as much as fine texture, so past a small radius it just reads
   as "blurry," not simplified shapes.
2. **Kuwahara edge-preserving filter** (pick the mean of whichever of 4
   neighborhood quadrants has lowest variance; done efficiently via
   summed-area tables) — theoretically right, but failed two ways on real
   photos: (a) on fine texture like dappled foliage, neighboring pixels pick
   different "winning" quadrants almost randomly, producing blotchy noise;
   (b) even after adding a pre-blur to fix that, on smooth continuous
   gradients (sky, softly lit road) it still produces visible blob/terrace
   artifacts, because there's no clear lowest-variance winner there either —
   more blur doesn't fix it since a true gradient never reaches zero variance.

Current fallback idea (not yet implemented or verified): fixed-grid block
averaging — divide the canvas into cells sized as a percentage of
width/height (the slider controls that percentage) and flatten each cell to
its average color. Trivially fast and immune to both failure modes above, but
trades away edge-following: boundaries are grid-aligned, not object-aligned.

## Research prompt

```
I'm building a "Squint" feature for a deterministic, client-side, dependency-free
painting-reference web app (vanilla JS, Canvas 2D API only — no libraries, no
build step, no ctx.filter, no network/AI calls). The feature simulates what a
painter sees when squinting at a reference photo: fine texture and detail should
merge into large, recognizable value/tone masses, while real object edges (e.g.
a tree silhouette against the sky) should stay reasonably legible. A single
0-100 slider controls how strong the effect is.

Hard constraints:
- Deterministic: identical input must always produce identical output, on any
  browser/engine. (This rules out ctx.filter blur, whose rendering differs
  across browsers.)
- Dependency-free: must be implementable from scratch in vanilla JS operating
  on Canvas ImageData. No external libraries or CDN scripts.
- Fast enough for live interactive use: recompute on a ~1600x1200px canvas
  should ideally take well under 150ms (target ~50ms), since it reruns on
  slider drag, on the main thread (no Web Worker currently in use).
- No AI/network calls, no randomness that isn't fully seeded/reproducible.

Two approaches have already been tried and rejected, for specific reasons:

1. Downscale-then-upscale box/bilinear blur, with blur radius driven by the
   slider (expressed as a percentage of the image diagonal for resolution
   independence). Rejected because it blurs strong value edges exactly as much
   as fine texture — past a small radius the output just reads as "a blurry
   photo," not simplified shapes. There's no edge-awareness at all.

2. A classic 4-quadrant Kuwahara filter (for each pixel, compute mean+variance
   of 4 overlapping neighborhood quadrants, output the mean of whichever
   quadrant has lowest variance; implemented efficiently via summed-area
   tables so cost per pixel is O(1) regardless of window radius). This is
   edge-aware in theory (a quadrant straddling a strong boundary has high
   variance and gets rejected), but failed on real photographs in two
   distinct ways:
   a. On fine, noisy texture (dappled foliage, grass, JPEG/sensor noise),
      neighboring pixels pick different "most uniform" quadrants almost at
      random, producing blotchy salt-and-pepper artifacts instead of smooth
      masses. A fixed-amount pre-blur pass before the Kuwahara step fixed
      this specific symptom.
   b. Even with that pre-blur, on genuinely smooth continuous gradients (a
      soft sky, gently lit road surface) the filter still produces visible
      round blob/"terracing" artifacts, because no quadrant has a clearly
      lowest variance there either — it's close to a coin flip, and more
      blur doesn't resolve it, since a true gradient never reaches zero
      variance no matter how smoothed.

The fallback idea under consideration now, not yet implemented or verified:
simple fixed-grid block averaging. Divide the canvas into a grid where cell
size is some percentage of width/height (the slider drives that percentage
directly), and replace every pixel in each cell with the flat average color
of that cell. This sidesteps both Kuwahara failure modes entirely, since there
is no per-pixel "which neighborhood is this most like" decision to destabilize
— but it trades away edge-following: cell boundaries are grid-aligned straight
lines, not object silhouettes, so a tree/sky edge only looks right if it
happens to fall on a grid line.

Please research and report back on:

1. A survey of known deterministic techniques for this class of problem —
   edge-aware region merging / value-mass simplification for non-photorealistic
   rendering. Specifically evaluate: generalized/anisotropic Kuwahara filtering
   (e.g. Kyprianidis et al.'s soft/weighted multi-sector variant, which is
   specifically designed to fix the blob/terracing problem in classic
   Kuwahara), superpixel segmentation (e.g. SLIC) followed by per-region
   averaging, mean-shift segmentation, bilateral/guided filtering (including
   fast approximate formulations), quadtree or other adaptive block-merging
   schemes, and any other relevant technique. For each, note whether it is
   known to avoid BOTH failure modes above (noise-induced instability AND
   smooth-gradient terracing) while still respecting real object edges better
   than a plain fixed grid.

2. For each promising candidate, assess: implementation complexity from
   scratch in vanilla JS/Canvas 2D (no libraries); realistic performance on a
   ~1600x1200px canvas for interactive slider-drag use without a Web Worker
   (note any known fast/approximate/integral-image-accelerated formulation);
   and determinism — if a technique is normally randomized or iterative (e.g.
   SLIC's seed points, mean-shift's convergence), explain concretely how to
   make it fully deterministic given identical input.

3. Give a clear, opinionated final recommendation: either confirm that fixed
   grid block-averaging is actually the pragmatic right answer for this
   specific use case (a painter-facing "value mass" simplification tool, not a
   general-purpose segmentation problem), including any refinements worth
   adding (e.g. a smarter averaging color space, staggered/jittered but still
   deterministic grid alignment to reduce seam artifacts, a soft blend at cell
   boundaries so it reads less like literal pixelation) — or propose a
   specific better alternative, with enough algorithmic/pseudocode-level
   detail that an implementation agent could build it without further
   research, and a realistic account of why it's worth the added complexity
   over the grid approach.

Deliverable: a written recommendation (prose + pseudocode where useful, not a
full implementation), not a working code artifact.
```
