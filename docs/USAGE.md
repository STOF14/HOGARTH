# Hogarth — Usage Guide

## Running the real app

```bash
npm install
npm run dev
```

Open the local URL Vite prints. The boot sequence plays, then the town. Upload real `.cbz`,
`.cbr`, or `.pdf` files with the "Upload" button, or use "Mock Add" to grow the town without
real files. Add `?debug=1` to the URL to reveal legacy stage-navigation buttons in the HUD (dev
tooling, not part of the normal experience).

## Running the tests

```bash
npm run test:unit      # Vitest — pure logic (color math, plot placement)
npx playwright install chromium   # one-time setup
npm run test:ui        # Playwright — full boot/upload/reader flows in a real browser
npm test               # both, in sequence
```

See `docs/QA_CHECKLIST.md` for what still needs manual verification — most notably, real RAR
(`.cbr`) decoding, which can't be covered by an automated fixture (see
`docs/ARCHITECTURE.md`'s "Format support" section for why).

## The legacy standalone stage files

The sections below describe `public/stages/*.html` — the five standalone prototype files this
app was originally built from, kept for reference. They still work (open directly, or via the
`?debug=1` HUD buttons in the real app) but represent an earlier, disconnected version of the
experience, not the current app.

All five files are standalone HTML — double-click to open in a browser, or drag into a browser
window. No build step, no local server needed. Three.js and the Press Start 2P font load from
CDN (`cdnjs.cloudflare.com`, `fonts.googleapis.com`), so an internet connection is required on
first load.

---

## Stage 1 — `stages/stage1-boot.html`

**What it is:** The boot/loading sequence.

**Controls:**
- Nothing to do but watch, or click "Skip →" (bottom right) to jump straight to the end state
- Clicking anywhere also skips
- Respects `prefers-reduced-motion` — jumps straight to black with no animation if that OS
  setting is on

**Sequence:** two bodies approach (~2.1s) → impact squash + camera shake (~170ms) → explosion
with debris colored from the bodies' own textures (~950ms) → pixel-dissolve wipe to red → wipe
to black → pixel wordmark "HOGARTH" fades in.

**Known limitation:** this is not wired into Stage 5. Opening Stage 1 does not lead anywhere —
it ends on a black screen with a wordmark and a "click anywhere to continue" hint that currently
does nothing further. See `ROADMAP.md`.

---

## Stage 2 — `stages/stage2-town-static.html`

**What it is:** A static, pre-populated town (6 plots, fixed layout). Proof of the isometric
pixel-art look before any dynamic logic was added.

**Controls:**
- Mouse move to hover a plot — it bumps up slightly and a tooltip shows "Plot N — empty"
- Click a plot — logs an intent to the browser console (open DevTools to see it); nothing
  visually happens, since the reader doesn't exist yet at this stage

**Known limitation:** camera is completely fixed, no pan/zoom/rotate. Superseded by Stage 3+
for anything beyond looking at the initial layout.

---

## Stage 3 — `stages/stage3-town-dynamic.html`

**What it is:** Dynamic plot placement. The interesting thing to actually do here is click the
buttons repeatedly and watch the town grow.

**Controls:**
- **"+ Add comic (mock)"** — adds one plot with a hashed placeholder color and title
- **"+ Add 6 (fill a row)"** — adds six at once, useful for seeing a new street row/ground
  segment get built in one action instead of clicking six times
- Hover/click on plots works the same as Stage 2

**What to watch for:** once a row of 2 plots fills, the ground and street geometry rebuild to a
longer length automatically, and the camera reframes (both its zoom and its look-target) to keep
the whole town in view.

**Known limitation:** lamps light up *immediately* on placement — this is a stand-in to confirm
placement works, not real functionality. Stage 4 replaces this.

---

## Stage 4 — `stages/stage4-cover-analysis.html`

**What it is:** The real feature — cover image analysis driving lamp color.

**Controls:**
- **"Upload cover(s)"** — opens a file picker, accepts multiple images at once. Each upload:
  shows a status message while reading the file, places a plot with a facade tinted from the
  extracted dominant color and the actual downsampled cover mounted as a sign, then lights the
  lamp in that same color after a short delay
- **"+ Add mock (no cover)"** — still available for testing town growth without needing real
  image files; generates a placeholder sign pattern instead of using a real cover

**What to try:** upload a few different real images (comic covers, photos, anything) and compare
the extracted colors against what you'd expect. This is the best file to use for evaluating
whether the dominant-color extraction is actually good enough, since it's the only stage running
the real algorithm end to end.

**Known limitation:** analysis is dominant-color extraction only — no genre/content
understanding. See the "Honest scope note" in `DESIGN.md`.

---

## Stage 5 — `stages/stage5-enter-reader.html`

**What it is:** Everything from Stage 4, plus entering a plot. This is the most complete single
file and the best one to hand someone if you only want to show one thing.

**Controls:**
- Same upload/mock-add controls as Stage 4
- **Click a lit plot** — camera flies in toward that building, then a reader panel opens showing
  the analyzed cover and title
- **Esc, click outside the panel, or the "✕ Close" button** — closes the reader and flies the
  camera back out to the full town view
- Controls (upload button, mock-add button) are disabled and dimmed while inside a plot, to
  prevent adding comics mid-transition

**Known limitation:** the reader panel is a placeholder — it shows the cover and title with a
labeled note that this is where the real Hogarth reader (page decode pipeline, LRU cache) would
mount. No actual page-reading functionality exists here.

---

## Browser/performance notes across all stages

- Built and reasoned about assuming a desktop browser with WebGL support. Not tested on mobile;
  touch input (tap vs. hover, no mouse-move events) will need explicit handling before this works
  on a phone or tablet.
- Raycasting for hover detection runs every frame against every plot's building mesh — fine at
  the plot counts tested (dozens), but worth profiling before assuming it scales to a library of
  hundreds of comics.
- Nothing persists. Refreshing the page resets the town to empty (Stages 3–5 auto-seed two mock
  plots on load).
