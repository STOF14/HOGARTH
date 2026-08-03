# Hogarth — Roadmap & Open Decisions

An honest accounting of what's real, what's a stand-in, and what hasn't been decided yet.

## Genuinely working, not stubbed

- Pixel-render pipeline (low-res + nearest-neighbor upscale), including the full-screen CSS
  stretch fix — this regressed once (canvas rendered tiny in a corner) and now has an automated
  regression test guarding it
- Boot sequence physics: real contact detection between the two colliding bodies, squash/shake
  on impact, debris colored from the bodies' own textures, wired all the way through to a real
  hand-off into the town (this also regressed to a non-functional stub at one point and has
  since been restored)
- Pixel-dissolve wipe transitions
- Dynamic plot placement with automatic ground/street growth
- Camera reframing to fit the growing town, and camera fly-in/fly-out to a focused plot
- Dominant-color extraction from real uploaded images, genuinely wired into plot/lamp coloring
  (this also regressed once — plots were being colored by hashing the filename instead of
  analyzing the actual image — and has since been fixed)
- **Real CBZ, CBR, and PDF reading.** CBZ via `jszip`, CBR via `node-unrar-js` (genuine RAR
  decoding, not a "convert to ZIP" workaround), PDF via `pdfjs-dist`. See
  `docs/ARCHITECTURE.md`'s "Format support" section for the honest limitations (all three decode
  eagerly rather than lazily, and RAR success can't be verified by the automated test suite).
- A real automated test suite: Vitest unit tests for the pure color/placement math, Playwright
  e2e tests covering boot → town → upload (CBZ and PDF, both success and corrupt-file error
  paths) → reader.

## Stubbed / placeholder — do not mistake these for finished features

- **Page decode is eager, not lazy.** Every format decodes all pages upfront on upload rather
  than on-demand as the person reads. Doesn't match the lazy-decode-pipeline goal referenced
  elsewhere in this project. Fine for short comics, a real wait for long ones.
- **"Cover analysis" is dominant-color extraction only**, not content/genre understanding. If
  genre- or style-aware placement is wanted eventually, that's new scope.
- **Mock "Add comic" button** exists purely for testing town growth without needing real files;
  should not ship in a real build.
- **RAR support is untested by CI.** It's genuinely implemented, but no open-source RAR encoder
  exists to generate a test fixture, so the automated suite only checks RAR's error-handling
  path. A real RAR file needs manual verification before trusting a release — see
  `docs/QA_CHECKLIST.md`.

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
