# Squint Algorithm — Recommendation

Date: 19-07-2026
Responds to: `docs/squint-algorithm-research-prompt.md`
Status: recommendation for implementation; supersedes task 1.2's plain
downscale-blur approach in `docs/roadmaps/improvement-plan-2026-07.md`.

Sourcing note: the technique survey below is drawn from general knowledge
of the non-photorealistic rendering (NPR) literature, with the key papers
named so they can be checked. No sources were fetched for this document.

---

## 1. Reframing the problem (this changes the answer)

Both failed attempts treated squint as a *smoothing* problem: find a
filter that blurs texture but not edges. That framing leads straight to
Kuwahara-family filters and their known artifacts.

Squint is better framed as **value grouping with edge integrity**:

- A painter squinting does not see a "less noisy photo." They see a small
  number of flat value masses whose *boundaries follow iso-value
  contours* — which, wherever there is real value contrast (tree vs.
  sky), coincide with object silhouettes.
- The flat-mass look therefore comes primarily from **quantization**, not
  from the smoothing step. The smoothing step only needs to do two
  modest jobs: kill texture noise so quantization boundaries are stable,
  and avoid *spreading* strong edges so quantization boundaries stay
  where the silhouette is.

This explains both failures precisely. Downscale-blur failed because
Gaussian-type blur spreads a hard edge into a wide ramp; after
quantization the silhouette becomes a mushy multi-band transition —
"blurry photo." Kuwahara failed because winner-take-all sector selection
is unstable exactly where there is no winner (noise, smooth gradients).

The fix is a pipeline in which each stage does the one thing it is good
at. This is essentially the Winnemöller–Olsen–Gooch "Real-Time Video
Abstraction" recipe (SIGGRAPH 2006), which was designed for exactly this
look, adapted to your constraints.

---

## 2. Survey verdicts (against your two failure modes + edge integrity)

**A. Anisotropic / soft multi-sector Kuwahara** (Kyprianidis, Kang,
Döllner 2009). The soft variant fixes both of your Kuwahara failures *by
design*: instead of picking one winning sector, the output is a blend of
all sector means weighted by inverse variance (weight ∝ (σ² + ε)⁻q). On
noise and smooth gradients all weights converge, so the output degrades
gracefully to a plain local mean — no coin flips, no terracing.
Verdict: technically the "correct" filter, but it is a GPU algorithm.
Per-pixel it needs a structure tensor plus 8 Gaussian-weighted sector
means, none of which integral images can accelerate. In main-thread JS at
1600×1200 it will land in the seconds, not tens of ms. **Reject on
performance**, but its lesson — *soft weighting, never winner-take-all* —
is baked into the recommendation below.

**B. Bilateral filter** (Tomasi & Manduchi 1998), small kernel, iterated.
A weighted average with no discrete decisions: no noise instability, no
terracing (on a smooth gradient it degrades to a plain blur, which is
correct behaviour there). Preserves strong edges by down-weighting
across-edge neighbours; iterating 2–3 small passes progressively flattens
texture into masses while edges *sharpen* rather than spread. Naive cost
is kernel-area × pixels, which is too slow at full resolution — but see
the resolution argument in §3. **Accept, at reduced resolution.**

**C. Guided filter** (He, Sun, Tang 2010). O(N) via box filters
regardless of radius, deterministic, no artifacts of either failure mode.
Weaker edge stopping than bilateral (halo/leak near thin high-contrast
edges) and needs ~12–15 full-image box-filter passes; in JS that is
roughly 150–400 ms at full resolution. Viable fallback if bilateral ever
feels insufficient, but it solves a problem (large radius at full res)
that the pipeline below avoids having. **Runner-up.**

**D. SLIC superpixels** (Achanta et al. 2012) + per-region averaging.
Fully deterministic (grid-seeded local k-means, fixed iteration count, no
randomness). This is your fixed-grid fallback upgraded so cell boundaries
*snap to edges* — genuinely attractive framing. Avoids noise instability
(cluster averaging) and follows silhouettes well. Two costs: it tiles
smooth gradients into visible facets (your terracing failure mode, in
polygonal form — arguably "painterly patches," but not controllable), and
it is the most code by far (~150–200 lines: 5D clustering, connectivity
enforcement). **Reject as first choice; best structural alternative if
the recommended pipeline disappoints.**

**E. Mean shift.** Iterative, convergence-dependent, slow, complex.
**Reject.**

**F. Quadtree adaptive block merging.** Deterministic and fast (variance
via summed-area tables), and slider-friendly. But blocks are axis-aligned
squares: silhouettes become staircases. It is the fixed grid with better
economics, not better edges. **Reject.**

**G. Fixed-grid block averaging (your fallback).** Immune to both failure
modes, trivially fast — and visually wrong for this app. Grid-aligned
seams read as pixelation/mosaic, i.e. a *photo-processing* artifact, the
exact aesthetic the app is defined against. A painter's masses are never
axis-aligned. **Hold in reserve only.**

---

## 3. The key enabling observation: work at squint resolution

The output of a squint is *intentionally low-information*. There is no
reason to run any filter at 1600×1200. Downscale first — not as the
effect (that was attempt #1's mistake: downscale + naive upscale was the
*whole* effect), but as the working resolution for the real pipeline.

At a working width of ~200–500 px (slider-driven), the image is
0.05–0.35 MP. Everything cheap becomes instant and everything expensive
becomes affordable: a 5×5 bilateral pass is ~1–8 ms; three passes plus
quantization plus manual upscale lands well inside the 50 ms target with
room to spare. Downscaling also *is* the first stage of texture
destruction (area averaging is exactly "merge fine detail"), so the
bilateral only has to handle mid-scale texture.

Determinism warning that motivates two implementation details:

- `drawImage` scaling interpolation is implementation-defined, so both
  the downscale and the upscale must be **hand-written** (area-average
  down, bilinear up). Both are simple, O(N), and use only IEEE-defined
  float arithmetic, which is identical across JS engines.
- Avoid engine math functions with implementation-defined precision
  (`Math.tanh`, `Math.pow`) inside the per-pixel path. The soft
  quantization below uses a rational smoothstep instead of tanh for this
  reason. `Math.exp` in the bilateral range table is computed once into a
  256-entry LUT, then rounded to a fixed precision (e.g. multiply by
  4096, floor) so any cross-engine ULP difference is quantized away.

---

## 4. Recommended algorithm

**Pipeline: deterministic area-average downscale → 3× iterated small
bilateral → soft luminance quantization → deterministic bilinear
upscale.** One slider drives all four stages coherently.

### 4.1 Slider mapping (softness s = 0–100, t = s/100)

| Stage | Parameter | Mapping |
|---|---|---|
| Downscale | working width `wW` | `round(lerp(0.40, 0.14, t) × sourceW)` |
| Bilateral | range sigma `σr` | `lerp(10, 26, t)` (8-bit luma units) |
| Bilateral | iterations | 2 if s < 40, else 3 |
| Quantize | value levels `n` | `round(lerp(9, 4, t))` |
| Quantize | band softness `φ` | `lerp(0.9, 0.55, t)` (lower = softer) |

(Spatial sigma stays fixed at ~1.4 px with a 5×5 kernel; spatial reach in
*source* terms grows automatically as `wW` shrinks. Tune all constants by
eye on real references; treat the table as starting values.)

### 4.2 Stages

**1. Area-average downscale** (own code, not `drawImage`):
for each destination pixel, average the exact rectangle of source pixels
it covers (accumulate with a row-sum pass or summed-area table). O(N).

**2. Iterated 5×5 bilateral at working resolution.** Luma-guided:
compute weights from the luminance channel, apply them to R, G, B
together (one weight computation, three applications — cheaper and keeps
channels coherent).

```
// precompute once per slider value:
rangeLUT[d] = floor(4096 * exp(-(d*d) / (2*σr*σr)))   // d = 0..255

for each pixel p:
  centerL = luma(p)
  wSum = 0; rSum = gSum = bSum = 0
  for each q in 5x5 window (edge-clamped):
    w = spatialLUT[dx][dy] * rangeLUT[ |luma(q) - centerL| ]
    wSum += w; rSum += w*q.r; gSum += w*q.g; bSum += w*q.b
  out(p) = (rSum/wSum, gSum/wSum, bSum/wSum)
```

Repeat 2–3 times (output of one pass is input to the next). This is the
mass-forming step: texture converges to flat regions, real edges get
*crisper* each pass because averaging never crosses them.

**3. Soft luminance quantization** (Winnemöller-style, tanh replaced by
a rational smoothstep for determinism):

```
L = luma(p) / 255                       // 0..1
step = 1 / (n - 1)
qNearest = round(L / step) * step
delta = (L - qNearest) / step           // -0.5 .. 0.5
// soft step: odd, monotone, deterministic
softDelta = delta * (φ + (1-φ) * 4 * delta * delta)  // cubic ease
Lq = clamp(qNearest + softDelta * step, 0, 1)
```

- **Gray mode:** output `Lq × 255` in all channels.
- **Colour mode:** scale the pixel's RGB by `Lq / L` (guard L≈0), then
  pull saturation toward gray by ~20% (`c' = gray + 0.8×(c − gray)`).
  Muted colour masses, value structure identical to gray mode.

Soft quantization is what prevents banding artifacts on smooth
gradients: instead of a hard contour wandering through the sky, bands
have gently eased transitions whose position is stable. Meanwhile at a
real silhouette (large value gap) the transition is far narrower than
the gap, so the edge reads crisp. This is where the "keeps object edges
legible" requirement is actually satisfied.

**4. Bilinear upscale** to canvas size (own code: for each destination
pixel, sample the four surrounding working-res pixels with bilinear
weights). The slight softness this adds is desirable — it reads as
out-of-focus vision, not pixelation, because the quantized masses
underneath are flat and their boundaries follow the image, not a grid.

### 4.3 Why this cannot reproduce the two failure modes

- **No discrete per-pixel decision exists anywhere** — every stage is a
  smooth weighted average or a monotone tone curve. The Kuwahara
  blotchiness (unstable winner selection) is structurally impossible.
- **Smooth gradients:** bilateral degrades to plain smoothing there
  (correct), and soft quantization turns the gradient into a few broad,
  soft-edged value bands — which is what a *painter* does with a sky
  (graded washes in discrete value steps), not an artifact.
- **"Just blurry" failure:** prevented by quantization doing the
  simplification work and bilateral keeping edges from spreading before
  quantization locks them in.

### 4.4 Performance budget (1600×1200 source, main thread, rough)

| Stage | At s=50 (wW ≈ 430 px, ~0.14 MP) |
|---|---|
| Downscale | 8–15 ms |
| Bilateral ×3 (5×5, LUT weights) | 10–25 ms |
| Quantize | 1–2 ms |
| Bilinear upscale to 1.92 MP | 20–35 ms |
| **Total** | **~40–75 ms** |

Within budget. If the upscale proves to be the bottleneck, upscale to
half canvas resolution and let CSS display scaling do the last 2× —
acceptable only if the canvas is never read back for export at full
resolution; since Print This View exports the canvas, prefer the full
manual upscale. Keep the existing rAF debounce on the slider.

### 4.5 Integration notes (for the implementing agent)

- Put the pipeline in `modules/observation-processors.js`; put the
  reusable pieces (`areaAverageDownscale`, `bilinearUpscale`,
  `bilateralPass5x5`) in `modules/canvas-utils.js` — Mass Study (plan
  task 2.3) should reuse all three instead of the plain
  `createStrongBlurCanvas`.
- Colour squint (plan task 1.3) becomes a mode flag on this same
  pipeline (stage 3 branch), not a separate processor.
- The pipeline takes the **colour original** as input in both modes (the
  bilateral is luma-guided anyway); grayscale conversion happens at the
  quantization stage. Update `refreshSquintCanvas` accordingly.
- Delete/retire `createStrongBlurCanvas`-based squint from task 1.2 if it
  was implemented; keep `blurGrayscaleCanvasOnce` untouched (outline and
  value contours still depend on it).

---

## 5. Verdict on the fixed-grid fallback

Do not ship it. It avoids both failure modes but replaces them with a
worse one for *this* product: axis-aligned mosaic seams that read as a
digital photo effect, in an app whose stated identity is "not photo
processing." The refinements that would soften it (staggered grids,
boundary blending, linear-light averaging) each move it toward being a
bad approximation of the pipeline above at similar total complexity.
Keep it only as an emergency fallback if the bilateral pipeline somehow
misses the performance budget on the owner's hardware — and if that
happens, drop the working resolution before dropping the algorithm.

## 6. If the recommendation disappoints visually

The structured next step is SLIC superpixels (survey item D) computed at
the same working resolution, with per-region mean colour and the same
soft value quantization applied per region. It is deterministic
(grid seeds, fixed 5 iterations), and its failure mode (faceted
gradients) is bounded and predictable. Only reach for it after tuning
§4.1's constants on real references — most "not simplified enough"
complaints will be fixable with a lower `n`, stronger `σr`, or smaller
`wW`.

## 7. References (from general knowledge — verify if citing elsewhere)

- Winnemöller, Olsen, Gooch. *Real-Time Video Abstraction.* SIGGRAPH 2006.
- Kyprianidis, Kang, Döllner. *Image and Video Abstraction by Anisotropic
  Kuwahara Filtering.* Pacific Graphics 2009.
- Tomasi, Manduchi. *Bilateral Filtering for Gray and Color Images.* ICCV 1998.
- He, Sun, Tang. *Guided Image Filtering.* ECCV 2010.
- Achanta et al. *SLIC Superpixels Compared to State-of-the-Art
  Superpixel Methods.* TPAMI 2012.
