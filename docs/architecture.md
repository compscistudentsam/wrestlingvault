# Phase 1 decisions

## Process boundary

Electron loads only the bundled frontend or, during local development, `http://127.0.0.1:5173/`. The renderer has no Node access. Context isolation, sandboxing and web security are enabled. It cannot open new windows, attach webviews, request device permissions or navigate to unrelated pages. All production HTTP, HTTPS and WebSocket requests from the default renderer session are blocked. Local fonts/images/JSON need no network.

The context bridge exposes exactly `getVersion(): Promise<string>` and `openExternal(url): Promise<void>`. Main-process handlers validate the sender's web contents, main frame, exact trusted document URL and argument count. External references accept only HTTPS on the exact sample-reference hosts, with no credentials or nonstandard ports. Invalid IPC requests reject. The external action opens the system browser, never a remote Electron window.

On Linux, development and desktop smoke launches select Chromium's user-namespace sandbox using `--disable-setuid-sandbox`, avoiding a root-owned SUID helper inside `node_modules`. This does not disable the renderer sandbox. The host must allow user namespaces; this cloud executor's outer shell filesystem sandbox requires an approved escalation for native desktop launches. Playwright's implicit sandbox-disabling default is explicitly overridden with `chromiumSandbox: true` and tested by checking the real application switches.

The CSP restricts scripts, fonts and images to bundled assets, denies plugins and forms, and allows only the local Vite WebSocket during development. Inline styles are allowed for Motion transforms and dynamic styles; inline scripts are not. A hash router keeps navigation local and supports `file:` builds without a server. Browser history works, and unknown routes provide a recovery action.

## UI/data separation

The renderer reads twelve bundled samples and has two views: the full-width cover browser and an expanded cover with its title, event/date and source reference. Selection stays in React when navigating back. A top-centre Random button picks a target before animating a full pass through the sleeves, using a turning-page overlay and slowing timed steps. Navigation is locked during the animation; route changes and unmounting clear the timer. System reduced motion bypasses the animation. Hash routes support bundled `file:` loads, browser history and direct match links.

Artwork is shared between both views. Original SVG arena illustrations combine with live match typography; missing images retain the CSS backdrop and text. Nearby covers load eagerly and others lazily. The operating system’s reduced-motion preference controls transitions.

## Current scope

The latest user request explicitly reduces the product to clickable match covers. Sidebar navigation, search, filtering, sorting, collection shortcuts, grid/table views, settings and future-feature screens are removed along with their unused components and query code. The earlier development brief’s broader UI requirements are superseded by this request.

No database, ingestion, personal persistence, analytics, backend or release workflow has been added. This remains a Phase 1 visual revision; do not begin later phases or merge into main without explicit approval.

## Local video playback

The user additionally authorized a folder picker on startup and in-app video playback. The main process owns the selected directory for the session. A narrow IPC method accepts only bundled match IDs and enumerates video files in matching immediate subdirectories. Canonical paths must remain within the selected root; symbolic-link entries are excluded. The renderer receives display names and opaque `vault-video://local/` tokens, never arbitrary filesystem access. The protocol resolves only issued tokens, rechecks path containment and delegates file delivery to Electron's file fetch, including byte-range requests for seeking. The CSP permits the media scheme without granting remote media access.

The renderer uses native video controls and stops playback by unmounting the player when returning to covers. Multiple files appear in a selector. Missing folders, cancellation, unreadable directories and unsupported media have recoverable messages. Selection is session-only; there is no database, persistence, transcoding or ingestion pipeline.
