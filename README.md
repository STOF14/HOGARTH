# Hogarth — Boot & Town Map Prototype

**Hogarth** (formerly Hogarth Unlimited / GUTTER) is a CBZ/CBR comic reader. This repo holds a
working prototype of its onboarding experience: a pixel-art boot sequence, followed by an
isometric town map where every plot in the town represents one comic in your library.

## The idea in one line

Upload a comic → its cover gets analyzed for a dominant color → a street lamp lights up in that
color next to a newly-built plot for that comic → click the lit plot to walk up to it and open
the reader.

## Quick start

No build step, no dependencies to install. Open any file in `stages/` directly in a browser.
Three.js and the pixel font (Press Start 2P) load from CDN, so you'll need an internet
connection on first load.

```
stages/stage5-enter-reader.html   ← open this one first, it's the most complete
```

## Repo structure

```
hogarth-prototype/
├── README.md              you are here
├── LICENSE
├── CHANGELOG.md           what changed between iterations, and why
├── docs/
│   ├── DESIGN.md          visual language, narrative arc, design rationale
│   ├── USAGE.md           per-stage controls and known limitations
│   ├── ARCHITECTURE.md    the technical systems: pixel pipeline, camera, color extraction
│   └── ROADMAP.md         what's real, what's stubbed, what's undecided
└── stages/
    ├── stage1-boot.html              boot sequence: collision → explosion → wipe to black
    ├── stage2-town-static.html       fixed isometric town, proof of the visual style
    ├── stage3-town-dynamic.html      town grows as comics are added
    ├── stage4-cover-analysis.html    real cover-image color analysis lights the lamp
    └── stage5-enter-reader.html      + camera fly-in and reader panel on click
```

## Where to actually start reading

If you're picking this back up later and don't remember the details: read `docs/DESIGN.md`
first for the *why*, then `docs/ARCHITECTURE.md` for the *how*, then `docs/ROADMAP.md` for
*what's left*. `docs/USAGE.md` is reference material for running each stage file, not something
you need to read start to end.

## Status

This is a staged prototype, not production code. The five stage files are still separate demos
(Stage 1's boot sequence doesn't hand off into Stage 5's map yet), the reader panel is a labeled
placeholder rather than a real reader, and nothing persists between page loads. See
`docs/ROADMAP.md` for the full honest breakdown of what's real versus stubbed.
