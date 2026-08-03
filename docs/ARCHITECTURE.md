# Hogarth — Technical Architecture

This covers how the code is actually built, for whoever (probably you, later) needs to extract
pieces of this into the real Hogarth codebase instead of five standalone demo files.

## Stack

- **Three.js r128**, loaded as a classic global script from `cdnjs.cloudflare.com` (not an ES
  module import). This was chosen because it's the version confirmed available in the build
  environment — worth swapping to the npm package if/when this moves into the actual app's
  build system, since r128 is old and later versions have API differences worth checking.
- **Press Start 2P** font (Google Fonts) for canvas-rendered pixel text only.
- **IBM Plex Mono** for live DOM UI text.
- No framework, no bundler — everything is a single inline `<script>` per file. Intentional for
  the demo stage; not how this should ship in the real app (see `ROADMAP.md`).

## The pixel-render pipeline

The single most load-bearing piece of code, repeated near-identically in every stage:

```js
const PIXEL_SCALE = 1/6; // or 1/7 in the boot sequence

function resize(){
  const w = Math.max(64, Math.floor(window.innerWidth * PIXEL_SCALE));
  const h = Math.max(48, Math.floor(window.innerHeight * PIXEL_SCALE));
  renderer.setSize(w, h, false); // false = don't touch the canvas's CSS size
  // ...update camera aspect/frustum...
}
```

Paired with CSS on the canvas element:

```css
canvas{
  width:100%; height:100%;
  image-rendering:pixelated;
}
```

The renderer draws at a tiny internal resolution; the browser stretches that canvas up with
nearest-neighbor sampling instead of smoothing. `renderer.setPixelRatio(1)` is also required —
otherwise high-DPI screens render at a higher internal resolution than intended and the effect
weakens.

**All textures must also use nearest filtering** or they'll blur when the low-res render samples
them:

```js
tex.magFilter = THREE.NearestFilter;
tex.minFilter = THREE.NearestFilter;
```

## Procedural pixel textures

No raster image assets are used anywhere except uploaded comic covers. Everything else — planet
surfaces, ground, streets, building facades, stars, particle sprites, the wordmark — is drawn
programmatically onto a small `<canvas>` (typically 6×6 to 40×40 pixels) using per-pixel
`ImageData` manipulation, then wrapped as a `THREE.CanvasTexture`.

Pattern used throughout:

```js
function makeXTexture(...params){
  const size = 16; // deliberately tiny
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y=0; y<size; y++){
    for (let x=0; x<size; x++){
      // decide a color per-pixel using distance-from-center checks,
      // sine-wave noise, or fixed masks (door/window positions, etc.)
      // write into img.data[i..i+3]
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas; // wrap with makeNearestTexture() at the call site
}
```

This keeps the whole app dependency-free (no image assets to manage, version, or optimize) and
means every texture is trivially re-themeable by changing the palette arrays at the top of each
generator function.

## Camera system (Stage 5)

Two camera states — the full-town view and a per-plot focused view — are unified as **the same
camera moving along a fixed isometric offset direction**, not two different modes:

```js
const ISO_DIR = { x:1, y:0.875, z:0.6 };

function setCameraFrame(viewSize, dist, lookAtTarget){
  // sets orthographic frustum bounds from viewSize + aspect
  // positions camera at lookAtTarget + dist * ISO_DIR
  // calls camera.lookAt(lookAtTarget)
}
```

"Zooming to fit the whole town" and "flying in to one plot" are both just calls to this same
function with different `(viewSize, dist, lookAtTarget)` triples. Transitions between the two are
a generic tween (`animateCameraTo`) that lerps all three values with an ease-in-out curve over a
set duration, called every frame from the main render loop. This is the piece most worth lifting
directly into the real app — it's genuinely reusable for any future "focus on X" camera behavior.

## Dominant color extraction

Real, if simple:

1. Downsample the uploaded cover to a small square canvas (20×20).
2. Convert every non-transparent, non-near-black/white, non-desaturated pixel to HSL.
3. Bucket by hue in 15° increments (24 buckets total).
4. The bucket with the most pixels wins; its average saturation/lightness (clamped to a
   reasonable range so extremely dark or extremely pale results still glow visibly as a lamp)
   becomes the output color.
5. Fallback: if every pixel got filtered out (e.g., a fully grayscale cover), average all pixels'
   raw RGB instead.

This is pure client-side canvas math — no network calls, no ML model, works offline. It has no
concept of subject matter, only color distribution.

## Format support (CBZ / CBR / PDF)

Three formats, one unified return shape (`{ files, cache }`, where `cache.get(i)` returns an
object URL for page `i`) so `ReaderPanel` and the cover-thumbnail logic in `TownScene` stay
format-agnostic:

- **CBZ/ZIP** — `jszip`, bundled as a real dependency. No network dependency at runtime.
- **CBR/RAR** — `node-unrar-js`, which wraps the official `unrar` library compiled to
  WebAssembly. This is a genuine, working RAR decoder, not a fallback chain or a "convert to
  ZIP" workaround — earlier versions of this codebase pretended to support RAR via a fragile
  three-layer CDN fallback that never actually worked (see `CHANGELOG.md`); this replaces that
  entirely. The WASM binary (`src/reader/unrarWasm.js`) is fetched once and cached for the
  session rather than re-fetched per file. Password-protected RAR archives are explicitly
  detected and rejected with a clear message rather than hanging or failing silently.
- **PDF** — `pdfjs-dist` (Mozilla's PDF renderer). Each page is rasterized to a canvas at 2x
  scale and exported as a PNG blob URL. This means PDF pages are images by the time they reach
  the reader, same as CBZ/CBR pages — no separate PDF-specific rendering path exists downstream
  of `decodeComicArchive()`.

**Known limitation, stated honestly:** all three formats currently decode every page upfront on
upload, not lazily on page-turn. This is simpler and was the fastest path to genuinely-working
format support, but it doesn't match the lazy-decode-pipeline architecture referenced elsewhere
in this project's design goals. For a large PDF or a many-page CBZ/CBR, this means a real wait
on upload rather than an instant add with pages streaming in as you read. Converting to true
lazy per-page decode (only extract/render the page the person is currently viewing, plus a
small look-ahead window) is a legitimate follow-up, not something folded into this pass.

**Testing limitation, also stated honestly:** there's no legally-distributable way to generate a
RAR archive from an automated test — RAR compression is proprietary, and no open-source encoder
exists to depend on for test fixtures. `node-unrar-js` only decodes RAR, it doesn't create RAR.
`tests/cbr.spec.js` can only verify the error-handling path (a corrupt/fake `.cbr` file shows the
decode-error dialog); it cannot verify that a genuine RAR archive actually decodes correctly.
That has to be checked manually — see `docs/QA_CHECKLIST.md`.



Each plot is a plain object (not a class) with:

```
{
  group,        // THREE.Group — the whole plot's transform root
  building,     // THREE.Mesh — raycast target for hover/click
  roof,
  sign,         // THREE.Mesh showing the cover thumbnail
  bulbMat,      // material whose emissive color/intensity IS the lamp's lit state
  glowLight,    // THREE.PointLight, intensity 0 until ignited
  lit,          // boolean, true only after igniteLamp() completes its fade
  index,        // build order, also determines grid slot via computeSlotPosition(index)
  label,        // display title
  coverCanvas   // the actual downsampled cover (or generated placeholder), reused by the reader panel
}
```

Plot position is purely a function of build order (`computeSlotPosition`) — alternating sides of
a single street, new rows created every 2 plots. There is currently no independent concept of
"where should this plot go" beyond insertion order.

## File-by-file code reuse

Stages 2 through 5 share the vast majority of their code (texture generators, plot creation,
lighting) with each stage adding one new system on top of a near-copy of the previous stage's
file. **This was deliberate for the staged-demo approach** but means the four files are not
actually DRY — the same `makeGroundTexture`, `makeBuildingTexture`, etc. are duplicated
byte-for-byte across files. Before this becomes real app code, these need to move into shared
modules rather than staying copy-pasted per file.
