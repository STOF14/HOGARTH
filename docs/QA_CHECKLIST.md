# Manual QA Checklist

Automated tests (`npm run test:unit` and `npm run test:ui`) cover what they can, but some things
need a human — either because they're genuinely subjective (does this look right?) or because
they can't be automated in this environment (see the RAR note below). Run through this before
trusting a release.

## Format support

- [ ] **CBZ**: upload a real multi-page CBZ from your own library. Confirm pages appear in the
      correct order (not alphabetically-wrong, e.g. page 10 before page 2).
- [ ] **CBR**: upload a real RAR-compressed CBR. **This cannot be verified by the automated
      suite** — no open-source RAR encoder exists to generate a test fixture, so
      `tests/cbr.spec.js` only checks the error-handling path (a corrupt/fake file shows the
      decode-error dialog). You must manually confirm a genuine RAR file actually decodes and
      its pages display in the right order. If this breaks, it will break silently in CI.
- [ ] **PDF**: upload a real multi-page PDF (not just the synthetic one the automated test
      generates). Check a text-heavy PDF and an image-heavy/scanned PDF separately — they stress
      the renderer differently.
- [ ] **RAR password-protected**: confirm a password-protected RAR shows a clear "password
      protected" message rather than hanging or showing a generic error.
- [ ] **Wrong-extension files**: rename a `.txt` file to `.cbz` and upload it — confirm a clear
      error, not a silent failure or a broken plot.

## Cover analysis

- [ ] Upload covers of clearly different dominant colors (a mostly-red cover, a mostly-blue
      cover, a mostly-black-and-white cover) and confirm the lamp colors are visibly different
      and roughly match what a person would say the cover's dominant color is.
- [ ] Confirm the lamp does NOT light instantly — there should be a brief delay and a visible
      fade-in, not an instant snap to full brightness.

## Boot sequence

- [ ] Full cinematic plays without skipping: collision, impact squash + camera shake, explosion,
      pixel-dissolve wipe to red then black, wordmark fade-in.
- [ ] Skip button works at any point during the sequence.
- [ ] Clicking anywhere (not just the skip button) also skips.
- [ ] With OS-level "reduce motion" enabled, the sequence should jump straight to the end state
      with no animation.
- [ ] **The canvas fills the screen** — this regressed once already (rendered tiny in a corner
      with a black background around it). The automated suite now has a regression test for
      this (`tests/ui.spec.js`, "canvas fills the viewport"), but a visual glance after any
      renderer/CSS change is still worth it.

## Town & camera

- [ ] Adding enough plots to fill multiple rows actually extends the ground/street and the
      camera reframes to keep everything in view.
- [ ] Clicking a lit plot flies the camera in smoothly and opens the reader; closing the reader
      flies back out to the same town view you left.
- [ ] Hover tooltips show the right title for the right plot, including after the town has grown
      to several rows (i.e., no stale hover state pointing at the wrong plot).

## Reader

- [ ] Next/Previous buttons and arrow keys both work.
- [ ] Escape closes the reader.
- [ ] Page counter shows the correct current/total.
- [ ] Opening a comic with a large number of pages doesn't visibly freeze the UI during decode
      (loading state should be visible instead).

## Cross-device

- [ ] Test on an actual mobile device, not just a resized desktop browser window — touch
      interaction and canvas performance both behave differently than desktop emulation suggests.
- [ ] Test on Safari specifically (not just Chrome) — WebGL and canvas behavior have historically
      had more Safari-specific quirks than other browsers.

## Fresh-state check

- [ ] Test in a completely fresh browser profile / private window with no prior storage, to
      catch anything that accidentally depends on leftover state from development.
