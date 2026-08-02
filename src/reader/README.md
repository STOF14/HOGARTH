# Reader module interface

This document defines the interface and responsibilities for the Reader UI module used by Hogarth.

Responsibilities
- Present pages from a comic archive (CBZ/CBR) or a single cover canvas/url.
- Provide navigation controls: next/previous, page counter, keyboard (← →, Esc to close).
- Expose a simple `enter(payload)` and `exit()` contract for the app state manager.
- Show loading and error states during decoding.

Payload shape (passed to `enter(payload)`) — support one of:
- `{ archiveFile: File, title?: string }` — decode the archive using `decodeComicArchive()` and display pages.
- `{ pages: string[], title?: string }` — pre-decoded page URLs (object URLs) to display.
- `{ coverCanvas: HTMLCanvasElement, title?: string }` — single-cover display.
- `{ coverUrl: string, title?: string }` — single-cover display from URL.

Behavioral notes
- When receiving `archiveFile`, the module should show a loading indicator while decoding. If decoding fails, show an error message and a Close button.
- The module should not retain large blobs after exit — revoke object URLs created by the archive decoder if the module created them.
- Keyboard shortcuts: `ArrowLeft` = previous page, `ArrowRight` = next page, `Escape` = close reader.

Visual contract
- The Reader is an overlay panel that owns its DOM, appears on top of the canvas, and is responsible for its own close button and styling.
