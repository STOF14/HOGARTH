# Hogarth — Design Breakdown

## The core visual idea

Everything renders as **real 3D, forced into a pixel-art look by resolution, not by faking it
with flat sprites.** The renderer draws the whole scene at roughly 1/6–1/7 of the actual screen
resolution, then the browser scales that canvas up with `image-rendering: pixelated` instead of
smoothing it. This means lighting falloff, the explosion particles, shadows, and camera motion
all pixelate *together* — the alternative (smooth 3D with pixel-art textures glued on) never
reads as cohesively "pixel art" because the edges, lighting, and motion stay smooth even when
the textures aren't.

This was a deliberate pivot partway through the build — the first version of the boot sequence
used soft, smooth-shaded 3D spheres with glowing additive-blend particles. It looked fine, but
not like the pixel-art reference you gave (chunky, high-contrast, hard edges, limited palette).
Switching to the low-res-render trick, procedural canvas-drawn textures instead of smooth
shaders, and hard-edged square particles instead of soft glows is what actually closed that gap.

## Palette philosophy

There's no single fixed global palette. Instead, each *type* of surface generates its own small,
constrained palette procedurally:

- **Planets** (boot sequence): a 5-color palette per body — greys/purples for the rocky body,
  reds/oranges for the lava body — with a simple fake "lit from one corner" shading pass baked
  into the texture rather than computed by real-time lighting on the mesh.
- **Ground/street**: 3–4 tonal variants of green (ground) and grey (street), tiled at a small
  pixel size (16×16 source texture, repeated) so the terrain reads as textured, not flat.
- **Buildings**: two-tone (base + accent) per plot, generated from whatever color drives that
  plot — a hash of a mock title in early stages, a real extracted dominant color from an
  uploaded cover in the finished version.

This keeps the system palette-agnostic rather than locked to one fixed brand palette — every
comic added to the library visually differentiates its own plot without needing hand-picked
colors.

## Typography

- **Press Start 2P** (Google Fonts, open license) for the wordmark and reader title — but never
  used as live DOM text. It's drawn onto a small offscreen canvas and scaled up the same way the
  3D scene is, so the letterforms stay genuinely blocky instead of getting anti-aliased by the
  browser's text renderer.
- **IBM Plex Mono** for all UI chrome — HUD counters, tooltips, buttons, status messages. This
  stays as real DOM text (not canvas-rendered) since it needs to be legible at small sizes and
  UI text isn't part of the "world" that needs to feel pixelated.

## The narrative arc across the three acts

**Act 1 — Boot.** Two bodies approach, make actual surface contact (not just converge to the
same point — see `ARCHITECTURE.md` for why that distinction mattered), squash on impact with a
camera shake, then shatter into debris colored from their own textures. The screen washes red,
then black, via a pixel-dissolve wipe rather than a smooth fade. This sequence *is* the loading
screen — its job is to mask whatever's actually loading behind it, not to add fixed dead time on
top of real load time.

**Act 2 — The town.** A fixed-isometric (orthographic camera) pixel-art town, styled after a
kindergarten play-mat — each comic in the library gets a plot along a street, with its own
building and lamp. The orthographic camera is what makes this read as a flat "map" rather than a
normal 3D scene with converging perspective lines; it's a deliberate choice over the more common
perspective-camera setup.

**Act 3 — Enter.** Clicking a plot whose lamp is lit (meaning its cover has been analyzed)
dollies the camera in along the same fixed isometric direction it always uses — position and
zoom narrow together, so it reads as walking up to the building rather than a cut or a
cross-fade. A reader panel then opens.

## The signature interaction: cover analysis lights the lamp

This is the feature the whole town concept exists to showcase. Uploading a comic:

1. Extracts and center-crops the cover
2. Downsamples it to a small pixel thumbnail (mounted permanently on the plot as a sign —
   confirmed as the better-looking choice over a plain, cover-agnostic building)
3. Runs a real (if simple) dominant-color extraction on that thumbnail
4. Uses the result to tint the building and, after a short "analyzing" delay, fade the lamp on
   in that color

The delay and fade are intentional — instant lighting would read as a toggle, not an analysis.

## Honest scope note on "analysis"

What's built is color extraction, not content understanding — it has no idea what's *on* the
cover, only its dominant hue. If the long-term intent is genre- or style-aware placement
(horror comics clustering in one part of town, say), that's a materially different feature
requiring an actual vision model rather than pixel math, and hasn't been scoped or built.
