# Changelog

Not a version-numbered changelog in the strict sense — this documents the reasoning behind each
major iteration, since a lot of the "why" would otherwise be lost.

## Stage 1 — boot sequence

**v1 (initial build):** Smooth-shaded 3D spheres colliding, soft additive-blend particle
explosion, plain CSS opacity fades for the red/black screen transitions, live vector-font
wordmark.

**v2 (current):** Rebuilt after feedback that v1 read as one body "absorbing" the other rather
than a crash, and that the screen transitions and title looked flat. Changes:
- Bodies now stop at actual surface contact instead of converging to the same center point
- Added a squash-and-shake impact phase between approach and explosion
- Debris colors are sampled from the bodies' own textures instead of a generic spark palette
- Red/black transitions became pixel-dissolve wipes (per-cell random threshold reveal) instead
  of opacity fades
- Wordmark is now drawn to a small canvas in a pixel bitmap font and scaled up, instead of live
  vector text

## Visual style — mid-project pivot

Partway through, the target visual style shifted from smooth-shaded 3D toward a specific
pixel-art reference (chunky, hard-edged, limited palette). This triggered:
- Switching to a low-internal-resolution render pipeline (draw small, scale up with
  nearest-neighbor filtering) so lighting, shadows, and motion all pixelate together
- Replacing shader-based coloring with procedurally-generated canvas textures (per-pixel
  `ImageData` writes) for every surface
- Switching particle/debris rendering from soft glowing sprites to hard-edged colored squares

## Naming

The project was renamed from **Hogarth Unlimited** (branded **GUTTER**) to simply **Hogarth**
partway through this work.

## Camera — perspective to orthographic

The town map originally used a perspective camera; switched to orthographic early in Stage 2.
Perspective introduces a vanishing point, which breaks the flat "kindergarten play-mat" look the
isometric reference was going for. Orthographic keeps all parallel lines parallel regardless of
distance from camera, which is what actually produces that look.

## Stage progression

Built in five deliberately incremental stages, easiest to hardest, per an explicit request to
sequence the build that way rather than attempting the full system at once:

1. Boot sequence (self-contained, no data dependency)
2. Static town (fixed layout, proves the visual style)
3. Dynamic plot placement (town grows, camera reframes)
4. Real cover-image analysis (dominant color extraction replaces placeholder lighting)
5. Camera fly-in and reader panel (the "enter a building" interaction)

Each stage's file is close to a copy of the previous stage's file with one new system added —
useful for isolating what changed at each step, at the cost of duplicated code across files (see
`docs/ROADMAP.md` for the cleanup this implies before any of it becomes real app code).
