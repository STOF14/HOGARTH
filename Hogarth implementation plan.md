# Hogarth — Full Implementation Plan

This is a complete, ordered build plan to take the prototype in this repo (five disconnected
demo HTML files) to one working app: boot → town → upload/analyze → enter → read, with real
persistence, real UX polish, and something that scales past a handful of plots.

**How to use this doc with Copilot:** work top to bottom. Each task has a "Copilot prompt" you
can paste directly into Copilot Chat (in Agent/Edit mode, with the relevant files open or
referenced with `@workspace` / `#file`). Don't skip ahead — later phases assume earlier ones are
done, and Copilot will do a better job with focused, sequential asks than one giant "build
everything" prompt.

---

## Phase 0 — Confirm current state

Before anything else, Copilot needs to know what's actually in the repo right now versus what
this plan assumes.

~~**Task 0.1 — Audit the repo**~~
> **Copilot prompt:** "List every file in this repository and give a one-line summary of what
> each one does. Flag anything that looks incomplete, duplicated across files, or inconsistent
> with `docs/ARCHITECTURE.md`."

---

## Phase 1 — Tooling & project setup

The prototype has no build step — Three.js loads from a CDN `<script>` tag, everything is one
inline `<script>` per file. That's fine for standalone demos, dead weight for a real app.

~~**Task 1.1 — Initialize a Vite project**~~
Vite is the right choice here: minimal config, fast dev server with hot reload, handles ES
module imports and npm packages cleanly, and has no opinion about frameworks (this project
doesn't need React/Vue — plain JS + Three.js is fine).

> **Copilot prompt:** "Initialize a Vite project (vanilla JS template) at the repo root. Move
> the existing `stages/*.html` files into a `legacy-prototype/` folder for reference — don't
> delete them yet. Set up `package.json` with `dev`, `build`, and `preview` scripts."

~~**Task 1.2 — Install real dependencies**~~
> **Copilot prompt:** "Add `three` as an npm dependency (latest stable, not r128 — check the
> migration notes for any breaking API changes from r128 that this project's code relies on,
> particularly around `THREE.Sprite`, `THREE.CanvasTexture`, and `OrthographicCamera`). Add it
> as a proper ES module import, not a CDN script tag."

**Task 1.3 — Linting and formatting**
> **Copilot prompt:** "Set up ESLint and Prettier for this project with a sensible default JS
> config. Add a `lint` script to `package.json`."

~~**Task 1.4 — Folder structure**~~
> **Copilot prompt:** "Create this folder structure under `src/`: `core/` (camera system, pixel
> render pipeline, app state machine), `world/` (town, plots, textures), `boot/` (boot sequence),
> `reader/` (reader panel and future page-reading logic), `ui/` (HUD, tooltips, DOM overlays),
> `utils/` (color extraction, hex/HSL math). Don't move code into it yet — just create the empty
> structure so later tasks have somewhere to put things."

---

## Phase 2 — Consolidate duplicated code

Every stage file in the prototype independently defines the same texture generators, camera
math, and plot logic. This has to become shared modules before anything else, or every future
change means editing five files.

~~**Task 2.1 — Extract the pixel render pipeline**~~
> **Copilot prompt:** "Look at how `PIXEL_SCALE`, the renderer setup, and the resize function
> work in `legacy-prototype/stage5-enter-reader.html`. Extract this into
> `src/core/pixelRenderer.js` as a reusable function that takes a Three.js scene and camera and
> returns a configured renderer plus a resize handler. This is the single most important shared
> system in the app — every screen needs it to look consistent."

~~**Task 2.2 — Extract procedural textures**~~
> **Copilot prompt:** "Extract every `makeXTexture` function (ground, street, building, star,
> flash, particle, placeholder cover) from `legacy-prototype/stage5-enter-reader.html` into
> `src/world/textures.js`. Keep the palette arrays as function parameters, not hardcoded, so
> they're reusable. Also extract `makeNearestTexture` into a shared helper since every texture
> generator needs it."

~~**Task 2.3 — Extract the camera system**~~
> **Copilot prompt:** "Extract `setCameraFrame`, `animateCameraTo`, and the `ISO_DIR` constant
> from `legacy-prototype/stage5-enter-reader.html` into `src/core/cameraRig.js` as a small class
> or module with methods like `frameTo(viewSize, dist, lookAt)` and `animateTo(viewSize, dist,
> lookAt, duration, onDone)`. This needs to be framework-agnostic — it shouldn't know about
> plots or the town, just camera math."

~~**Task 2.4 — Extract color extraction**~~
> **Copilot prompt:** "Extract `extractDominantColor`, `rgbToHsl`, `hslToHex`, `rgbToHex`,
> `hexToInts`, and `shade` from `legacy-prototype/stage5-enter-reader.html` into
> `src/utils/color.js`. Add JSDoc comments explaining what each function does, since this is the
> core 'cover analysis' logic and needs to be easy to extend later."

~~**Task 2.5 — Extract the plot/town model**~~
> **Copilot prompt:** "Extract plot creation (`createPlot`), placement (`computeSlotPosition`),
> and town growth (`rebuildGroundAndStreet`) from `legacy-prototype/stage5-enter-reader.html`
> into `src/world/town.js`. Design this as a class (`Town`) that owns its own list of plots and
> exposes methods like `addPlot(title, coverCanvas)` and `getPlotAt(index)`, rather than the
> loose global-variable style in the prototype."

---

## Phase 3 — Rebuild the app as one connected flow

This is the actual "make it work end to end" phase — replacing five separate HTML files with
one app that moves between states.

**Task 3.1 — Build a simple state machine**
> **Copilot prompt:** "Create `src/core/appState.js` implementing a simple state machine with
> states `BOOT`, `TOWN`, and `READING`. Each state should have `enter()` and `exit()` hooks.
> Don't use a heavy state management library — this only needs a handful of states, a plain
> class or even a switch statement is fine."

**Task 3.2 — Boot state**
> **Copilot prompt:** "Port the boot sequence logic from `legacy-prototype/stage1-boot.html`
> (approach → impact → explode → pixel-dissolve wipe → wordmark) into `src/boot/BootScene.js`,
> using the shared `pixelRenderer.js` and `textures.js` modules instead of its own copies. When
> the sequence finishes (or the person clicks/taps skip), it should transition `appState` to
> `TOWN` instead of just sitting on a black screen."

**Task 3.3 — Town state**
> **Copilot prompt:** "Port the town map from `legacy-prototype/stage5-enter-reader.html` into
> `src/world/TownScene.js`, using the shared `Town` class from Phase 2 instead of inline plot
> logic. Keep the upload/mock-add controls and the hover/click interaction, but make sure this
> module owns only the town — camera control and reader-opening should call into
> `cameraRig.js` and the reader module rather than duplicating that logic inline."

**Task 3.4 — Wire the transitions**
> **Copilot prompt:** "Wire `BootScene`, `TownScene`, and a (currently placeholder) reader panel
> together through `appState.js` so that: boot finishes → town appears; clicking a lit plot in
> the town → camera flies in → reader opens; closing the reader → camera flies back out to the
> town. This should all run in one HTML page (`index.html`) with one canvas, not separate pages."

**Task 3.5 — Verify the connected flow works**
> **Copilot prompt:** "Run the dev server and walk through the full flow: boot sequence plays,
> town appears, uploading a cover image lights a lamp, clicking that plot flies the camera in and
> opens the reader, closing the reader returns to the town. Report anything that's broken or
> feels disconnected between states."

---

## Phase 4 — Real reader integration

The prototype's reader is a labeled placeholder. This phase connects it to Hogarth's actual
comic-reading functionality.

**Task 4.1 — Define the reader interface**
> **Copilot prompt:** "Before touching any decode logic, write `src/reader/README.md` defining
> what the reader module needs as input (a CBZ/CBR file or handle) and what UI it owns (page
> canvas, page navigation, zoom/pan, keyboard shortcuts). This is a planning document, not code —
> I want to review the interface before you build against it."

*(Once you've reviewed and confirmed the interface, hand Copilot your existing CBZ/CBR
lazy-decode pipeline and LRU cache code from the main Hogarth reader work, and have it wire that
into `src/reader/` following the interface it just wrote.)*

**Task 4.2 — Reader UI**
> **Copilot prompt:** "Build the actual reader UI in `src/reader/ReaderPanel.js`: current page
> display, next/previous controls (click zones + arrow keys), a page counter, and a close
> button that returns to the town. Match the pixel-art visual language already established —
> reuse `IBM Plex Mono` for UI chrome and the same dark background/border treatment as the
> existing reader panel shell in `legacy-prototype/stage5-enter-reader.html`."

**Task 4.3 — Loading and error states**
> **Copilot prompt:** "Add loading and error states to the reader: a loading indicator while a
> CBZ/CBR is being decoded, and a clear error message (not a silent failure) if a file is
> corrupt or unsupported. These states need to visually fit the rest of the app, not look like a
> generic browser error."

---

## Phase 5 — Persistence

Right now, refreshing the page wipes the whole town. This phase makes the library survive.

**Task 5.1 — Choose storage**
> **Copilot prompt:** "This app needs to store: uploaded comic files (potentially large
> binaries), extracted cover thumbnails, dominant colors, and plot positions, all client-side for
> now. Use IndexedDB rather than localStorage — localStorage can't efficiently hold binary comic
> files and has a much smaller size cap. Set up a small wrapper module `src/core/storage.js`
> around IndexedDB (a lightweight library like `idb` is fine, or hand-rolled if you'd rather
> avoid the dependency) with functions to save/load a comic record and list all stored comics."

**Task 5.2 — Load the town from storage on boot**
> **Copilot prompt:** "On app startup, before the boot sequence finishes, load all previously
> stored comics from IndexedDB and have `TownScene` rebuild the town from that saved state
> instead of starting empty. New uploads should still go through the same analyze → place → save
> flow, just now writing to storage as well as building the plot."

**Task 5.3 — Handle storage failure gracefully**
> **Copilot prompt:** "Add error handling for IndexedDB failures (quota exceeded, private
> browsing mode blocking storage, etc.) — the app should still function for the current session
> even if persistence isn't available, with a visible but non-blocking warning rather than a
> silent failure or a crash."

---

## Phase 6 — UI/UX polish

This is the phase that actually makes it feel "amazing" rather than just functional — the
prototype has zero error handling, no empty states, no feedback beyond the happy path.

**Task 6.1 — Empty and loading states**
> **Copilot prompt:** "Design and build an empty-state screen for when the town has zero comics
> (first-ever launch) — currently the app just auto-seeds mock plots, which is wrong for a real
> user. Replace that with an inviting empty state that prompts uploading a first comic, styled
> to match the pixel-art aesthetic."

**Task 6.2 — Toast/notification system**
> **Copilot prompt:** "Build a small toast notification system in `src/ui/toast.js` for
> transient feedback — 'Analyzing cover...', 'Added to your library', upload errors, storage
> warnings. Reuse the pixel-art dialog styling already established rather than a generic toast
> library's default look."

**Task 6.3 — Free-roam camera once the town is large**
> **Copilot prompt:** "The camera is currently fully locked except for auto-fit and the focus
> fly-in. Once a library has more than roughly 12 plots, add optional user camera control —
> click-and-drag to pan, scroll/pinch to zoom, staying within reasonable bounds so the person
> can't lose the town. Keep the existing fixed isometric *angle* — only position and zoom should
> be user-controllable, not rotation, to preserve the flat play-mat look."

**Task 6.4 — Search/filter**
> **Copilot prompt:** "Add a search input to the HUD that filters visible plots by title as the
> person types, dimming or hiding non-matching plots rather than rebuilding the town. This needs
> to work smoothly at real library scale (dozens to hundreds of comics), not just the handful
> used in testing."

**Task 6.5 — Sound (optional, discuss before building)**
> **Copilot prompt:** "Don't build this yet — first tell me what sound design would fit the
> existing visual language (impact thud on boot collision, ambient town sounds, a lamp 'click'
> on ignition, page-turn sound in the reader) and what the tradeoffs are for load time and
> user-annoyance (needs a mute control, needs to respect browser autoplay restrictions)."

---

## Phase 7 — Accessibility

The prototype handles `prefers-reduced-motion` in the boot sequence only. Everything else is
mouse-dependent with no keyboard path.

**Task 7.1 — Keyboard navigation for the town**
> **Copilot prompt:** "Add keyboard navigation to the town: Tab/Shift+Tab to move focus between
> plots in a sensible spatial order, Enter to open a focused plot, Escape to close the reader.
> This needs actual visible focus indication on the currently-focused plot, not just a
> functional-but-invisible tab order."

**Task 7.2 — Screen reader support**
> **Copilot prompt:** "Add ARIA live region announcements for state changes that currently only
> have visual feedback: 'Analyzing cover', 'Comic added to library', 'Entering [title]',
> 'Returned to town'. The canvas itself can't be made meaningfully accessible (it's a 3D scene),
> but every action a person can take should have a non-visual equivalent."

**Task 7.3 — Extend reduced-motion support**
> **Copilot prompt:** "Currently only the boot sequence checks `prefers-reduced-motion`. Extend
> this to the camera fly-in/fly-out (Phase 3) — when reduced motion is requested, cut instantly
> between camera states instead of animating the transition."

**Task 7.4 — Color contrast audit**
> **Copilot prompt:** "Audit all UI text (HUD, tooltips, reader panel, toasts) against WCAG AA
> contrast requirements against their actual backgrounds. Flag anything that fails and propose
> fixes that stay within the existing palette rather than introducing new colors."

---

## Phase 8 — Mobile & touch support

Currently desktop-only in practice — hover-based interaction doesn't exist on touch devices.

**Task 8.1 — Touch interaction model**
> **Copilot prompt:** "Replace hover-based plot selection with a tap-based model on touch
> devices: first tap on a plot shows its tooltip/highlight (equivalent to hover), a second tap
> or a distinct 'enter' tap target confirms opening it. Detect touch vs. mouse input rather than
> just screen size, since some laptops have touchscreens too."

**Task 8.2 — Responsive layout**
> **Copilot prompt:** "Review the HUD, upload controls, and reader panel at mobile viewport
> widths (start at 375px). The reader panel already has a mobile breakpoint in the prototype —
> extend that same care to the HUD controls, which currently assume desktop-width space."

**Task 8.3 — Performance on mobile GPUs**
> **Copilot prompt:** "Test the pixel-render pipeline's `PIXEL_SCALE` value on a mid-range mobile
> device or emulated mobile GPU throttling in Chrome DevTools. If frame rate suffers, add a
> lower-fidelity fallback tier rather than assuming desktop-class GPU performance everywhere."

---

## Phase 9 — Performance at real scale

The prototype was tested with a handful of plots. A real library might have hundreds.

**Task 9.1 — Instance repeated geometry**
> **Copilot prompt:** "Every plot currently creates its own unique `BoxGeometry` and
> `ConeGeometry` for the base platform and roof, even though these shapes are identical across
> all plots. Convert repeated geometry (base platform, roof, lamp post, lamp bulb) to
> `THREE.InstancedMesh` so the GPU only needs to track one geometry buffer instead of one per
> plot. Only the facade texture and sign genuinely need to be unique per plot."

**Task 9.2 — Limit raycasting**
> **Copilot prompt:** "Hover detection currently raycasts against every plot's building mesh on
> every single frame, regardless of how many plots exist. Add a spatial check (e.g., only raycast
> against plots within some distance of camera, or use a spatial index) so this doesn't degrade
> as the library grows into the hundreds."

**Task 9.3 — Batch analysis for bulk uploads**
> **Copilot prompt:** "If someone uploads dozens of covers at once, the current code analyzes
> and places them one at a time with visible delays for each. Move the color-extraction work to
> a Web Worker so bulk uploads don't block the main thread, and consider batching plot placement
> so the camera doesn't reframe on every single addition during a bulk import."

---

## Phase 10 — Testing

**Task 10.1 — Unit tests for pure logic**
> **Copilot prompt:** "Set up Vitest and write unit tests for the pure functions in
> `src/utils/color.js` (`rgbToHsl`, `hslToHex`, `extractDominantColor` given known pixel data)
> and `src/world/town.js`'s `computeSlotPosition`. These are the functions most likely to break
> silently if refactored later, and they're the easiest to test since they don't touch the DOM
> or WebGL."

**Task 10.2 — Manual test checklist**
> **Copilot prompt:** "Generate a manual QA checklist covering: full boot-to-reader flow, upload
> with a real image, upload with a non-image file (error handling), bulk upload of 10+ images,
> keyboard-only navigation, reduced-motion mode, mobile viewport, and a fresh browser profile
> with no prior storage. Save this as `docs/QA_CHECKLIST.md`."

---

## Phase 11 — CI/CD and deployment

**Task 11.1 — GitHub Actions**
> **Copilot prompt:** "Set up a GitHub Actions workflow that runs lint and any tests on every
> push and pull request, and fails the check if either fails."

**Task 11.2 — Deploy a preview**
> **Copilot prompt:** "Set up GitHub Pages (or suggest Vercel/Netlify if better suited) to deploy
> the built app automatically from the main branch, so there's always a live link to the current
> state without needing to run it locally."

---

## Phase 12 — Keep the docs honest

**Task 12.1 — Update docs as you go**
> **Copilot prompt:** "After completing each phase above, update `docs/ARCHITECTURE.md` and
> `docs/ROADMAP.md` to reflect what's now real versus what's still planned — don't let these
> drift out of sync with the actual code the way the original prototype's docs would have if
> development had continued without updating them."

---

## A note on pacing

This is a lot. Realistically:

- **Phases 1–3** (tooling, consolidation, connected flow) are the actual "make it one working
  app" work and should happen first, in order — everything after depends on this existing.
- **Phase 4** (real reader) is probably your single highest-value phase once Phase 3 is done,
  since it's the difference between a tech demo and something you'd actually use.
- **Phases 5–9** (persistence, polish, accessibility, mobile, performance) can happen in
  whatever order matches what you actually care about most — there's no hard dependency order
  between them, only that they all depend on Phase 3 being done first.
- **Phases 10–12** (testing, CI, docs) are easiest to bolt on incrementally alongside whichever
  of 5–9 you're doing at the time, rather than saving them for the very end.