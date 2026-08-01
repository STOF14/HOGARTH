# Hogarth — Roadmap & Open Decisions

An honest accounting of what's real, what's a stand-in, and what hasn't been decided yet.

## Genuinely working, not stubbed

- Pixel-render pipeline (low-res + nearest-neighbor upscale)
- Boot sequence physics: real contact detection between the two colliding bodies, squash/shake
  on impact, debris colored from the bodies' own textures
- Pixel-dissolve wipe transitions
- Dynamic plot placement with automatic ground/street growth
- Camera reframing to fit the growing town
- Dominant-color extraction from real uploaded images
- Camera fly-in/fly-out between town view and a focused plot view

## Stubbed / placeholder — do not mistake these for finished features

- **The reader panel** (Stage 5) is a labeled mount point, not a reader. No page rendering, no
  CBZ/CBR handling, no connection to Hogarth's actual decode pipeline or LRU cache.
- **"Cover analysis"** is dominant-color extraction only. If genre/style-aware behavior is
  wanted eventually, that's new scope, not a refinement of existing code.
- **Mock "Add comic" buttons** exist purely for testing town growth without needing real files;
  they should not ship in any real build.

## Not yet done at all

1. **Stitching the five stages into one flow.** Right now these are five independent HTML
   files. Stage 1 (boot) doesn't hand off to Stage 5 (map) — clicking through Stage 1 currently
   leads nowhere. Wiring this together means:
   - Deciding whether Stage 1 mounts into the same DOM/canvas the map later uses, or whether
     boot and map are genuinely separate screens/routes
   - Passing state across the transition (nothing to pass yet, since there's no persisted
     library, but this matters once there is)

2. **Real reader integration.** Swapping the placeholder mount point in Stage 5 for the actual
   GUTTER/Hogarth reader component — the CBZ/CBR lazy-decode pipeline and LRU cache referenced
   elsewhere in the project.

3. **Persistence.** Nothing survives a page reload right now. For a real deployment (this is
   plain HTML/JS, not a Claude.ai artifact, so ordinary browser storage APIs are fair game here
   unlike in-conversation demos) the town needs to store, at minimum: which comics exist, their
   extracted colors, their plot positions, and their cover thumbnails. `localStorage` would work
   for a single-device prototype; anything cross-device needs a real backend.

4. **Code deduplication.** As noted in `ARCHITECTURE.md`, Stages 2–5 duplicate the same texture
   generators and plot logic across files. Needs to become shared modules before this is real
   app code.

5. **Touch/mobile support.** Hover-based interaction (tooltip on mouse move, raycasting against
   `mousemove`) doesn't translate to touch devices. Needs an explicit tap-to-select interaction
   model, not just "hope hover degrades gracefully."

## Open decisions — flagged during the build, never resolved

These came up as I built each stage and got acknowledged but not actually decided:

- **Plot placement meaning.** Currently pure insertion order (next slot, alternating street
  sides). Should placement ever be meaningful — e.g., comics of a similar extracted color or
  genre clustering into their own part of town — or is arbitrary/sequential fine permanently?
- **Camera controls.** Fully locked in every stage built so far (no user pan/zoom/rotate beyond
  the automatic fit and the focus fly-in). Intentional for a "guided" feel, or should the person
  be able to freely explore the town once it's larger than a couple screens' worth of plots?
- **Growth model at real scale.** The single-street, alternating-sides, ever-longer-row model
  works fine for a demo but will produce an absurdly long single street once a library reaches
  hundreds of comics. Needs a real decision: does the street eventually turn/branch into blocks,
  does the camera need free-roam at that point, or is there a completely different layout
  strategy for large libraries versus small ones?
- **Ground/street texture variation at scale.** Currently a single tileable 16×16 pattern
  repeated indefinitely — will look monotonous over a long street. Worth revisiting once real
  scale is known.

## Suggested next session

Given the above, the highest-leverage next piece of work is probably **stitching Stages 1 and 5
together into one continuous file/flow** — everything else (reader integration, persistence)
depends on there being one coherent experience to attach those systems to, rather than five
demos.
